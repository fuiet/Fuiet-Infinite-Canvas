from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'{label}: target not found')
    return text.replace(old,new,1)

# 1) standard video auto routes may finish with an output but no explicit terminal status.
adapter=read('provider-adapter-contract.js')
old="if(key==='standard-video-async-v1')return{createPath:'/v1/videos',method:'POST',responseMode:'async',taskIdPath:'',pollPath:'/v1/videos/{{taskId}}',pollMethod:'GET',contentPath:'/v1/videos/{{taskId}}/content',statusPath:'',progressPath:'',outputPath:'',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};"
new="if(key==='standard-video-async-v1')return{createPath:'/v1/videos',method:'POST',responseMode:'async',taskIdPath:'',pollPath:'/v1/videos/{{taskId}}',pollMethod:'GET',contentPath:'/v1/videos/{{taskId}}/content',statusPath:'',progressPath:'',outputPath:'',successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:true,pollIntervalMs:1500,timeoutMs:1200000};"
adapter=replace_once(adapter,old,new,'standard video output-without-status')
write('provider-adapter-contract.js',adapter)

# 2) broaden async video schemas.
core=read('provider-runtime-core.js')
old="""    'data.id','data.task_id','data.taskId','data.request_id','data.job_id',
    'task.id','job.id','result.id','video.id','data.video.id','data.task.id','result.task_id','result.taskId'
  ]);"""
new="""    'data.id','data.task_id','data.taskId','data.request_id','data.job_id','data.jobId',
    'task.id','job.id','result.id','result.task.id','result.job.id','video.id','data.video.id','data.task.id','data.job.id','result.task_id','result.taskId'
  ]);
  if(common===undefined||common===null||common===''){
    const scalar=typeof response?.data==='string'||typeof response?.data==='number'?response.data:(typeof response?.result==='string'||typeof response?.result==='number'?response.result:undefined);
    if(scalar!==undefined&&scalar!==null&&String(scalar).trim())return String(scalar);
  }"""
core=replace_once(core,old,new,'task id schemas')
old="return firstPath(response,[config.statusPath,'status','data.status','state','data.state','task.status','data.task.status','job.status','result.status','video.status','data.video.status']);"
new="return firstPath(response,[config.statusPath,'status','data.status','state','data.state','task.status','task.state','data.task.status','data.task.state','job.status','job.state','data.job.status','data.job.state','result.status','result.state','video.status','video.state','data.video.status','data.video.state']);"
core=replace_once(core,old,new,'status schemas')
old="""    'data.video_url','data.videoUrl','video_url','videoUrl','video.url','data.video.url','result.url','result.video.url','result.video_url','result.videoUrl','content_url','download_url','data.content_url','data.download_url',
    'data.result.url','data.result.video_url','url','data.url','output.0.url','data.output.0.url','videos.0.url'
  ];"""
new="""    'data.video_url','data.videoUrl','video_url','videoUrl','video.url','data.video.url','result.url','result.video.url','result.video_url','result.videoUrl','content_url','download_url','data.content_url','data.download_url',
    'data.result.url','data.result.video_url','data.result.videos.0.url','result.videos.0.url','task.output.url','task.result.url','data.task.output.url','data.task.result.url','data.task_result.url','data.task_result.video_url','data.task_result.videos.0.url','output.video.url','data.outputs.0.url','artifacts.0.url','url','data.url','output.0.url','data.output.0.url','videos.0.url'
  ];"""
core=replace_once(core,old,new,'video output schemas')
write('provider-runtime-core.js',core)

# 3) adaptive create/poll/content routing in browser runtime.
runtime=read('browser-runtime.js')
old="if(mod==='video'){const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');const last=refs.find(r=>r.role==='last_frame');return{model:modelId,prompt,...p,seconds:String(p.seconds||p.duration||''),...(p.size?{size:p.size}:{}),...(first?.url?{image:first.url,first_frame:first.url,input_reference:first.url}:{}),...(last?.url?{last_frame:last.url}:{}),...(refs.length?{references:refs}:{})};}"
new="if(mod==='video'){const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');const last=refs.find(r=>r.role==='last_frame');const duration=Number(p.duration??p.seconds??4);const ratio=String(p.aspectRatio||p.aspect_ratio||'16:9');return{model:modelId,prompt,...p,duration,seconds:String(p.seconds||duration),aspect_ratio:ratio,ratio,...(p.size?{size:p.size}:{}),...(first?.url?{image:first.url,image_url:first.url,input_image:first.url,first_frame:first.url,input_reference:first.url}:{}),...(last?.url?{last_frame:last.url,last_frame_url:last.url}:{}),...(refs.length?{references:refs}:{})};}"
runtime=replace_once(runtime,old,new,'video json aliases')
old="""function alternateVideoCreatePaths(route,model){const first=String(route.createPath||'/v1/videos');if(!autoVideoRoute(model,route))return[first];return[...new Set([first,'/v1/videos','/v1/video/generations','/v1/videos/generations'])]}
function matchingPollPath(createPath,taskId,route){if(createPath==='/v1/video/generations')return `/v1/video/generations/${taskId}`;if(createPath==='/v1/videos/generations')return `/v1/videos/generations/${taskId}`;return fillTemplate(route.pollPath||'/v1/videos/{{taskId}}',{taskId})}
async function providerJson(provider,url,init){"""
new="""const VIDEO_AUTO_RETRY_STATUSES=new Set([400,404,405,415,422]);
function alternateVideoCreatePaths(route,model){
  const first=String(route.createPath||'/v1/videos');if(!autoVideoRoute(model,route))return[first];
  return[...new Set([first,'/v1/videos','/v1/video/generations','/v1/videos/generations','/v1/video/generation','/video/generations','/videos/generations','/api/v1/videos','/api/v1/video/generations'])];
}
function matchingPollPath(createPath,taskId,route){if(createPath==='/v1/video/generations'||createPath==='/api/v1/video/generations')return `${createPath}/${taskId}`;if(createPath==='/v1/videos/generations'||createPath==='/video/generations'||createPath==='/videos/generations')return `${createPath}/${taskId}`;return fillTemplate(route.pollPath||'/v1/videos/{{taskId}}',{taskId})}
function videoUrlCandidate(provider,value){const text=String(value||'').trim();if(!text)return'';if(/^https?:\\/\\//i.test(text))return text;if(text.startsWith('/'))return joinUrl(provider.baseUrl,text);return''}
function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){
  const out=[],add=value=>{const url=videoUrlCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};
  const responseUrl=Core?.firstPath?Core.firstPath(createdRaw,['poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl','data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl','links.status','links.poll','links.self','task.status_url','task.poll_url']):'';add(responseUrl);
  add(joinUrl(provider.baseUrl,matchingPollPath(createPath,taskId,route)));
  for(const path of [`/v1/tasks/${taskId}`,`/v1/video/tasks/${taskId}`,`/v1/videos/${taskId}`,`/v1/video/generations/${taskId}`,`/v1/videos/generations/${taskId}`,`/api/v1/tasks/${taskId}`,`/api/v1/video/generations/${taskId}`])add(joinUrl(provider.baseUrl,path));
  return out;
}
async function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){try{return{parsed:await providerJson(provider,url,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url}}catch(error){last=error;if(![404,405].includes(Number(error?.status)))throw error}}throw last||new Error('没有可用的视频任务轮询接口')}
async function fetchVideoContent(provider,createdRaw,taskId,route,activePollUrl=''){
  const candidates=[],add=value=>{const url=videoUrlCandidate(provider,value);if(url&&!candidates.includes(url))candidates.push(url)};
  const explicit=Core?.firstPath?Core.firstPath(createdRaw,['content_url','contentUrl','download_url','downloadUrl','links.content','links.download']):'';add(explicit);
  if(route.contentPath)add(joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId})));
  if(activePollUrl)add(activePollUrl.replace(/\\/$/,'')+'/content');
  for(const path of [`/v1/videos/${taskId}/content`,`/v1/video/generations/${taskId}/content`,`/v1/videos/generations/${taskId}/content`])add(joinUrl(provider.baseUrl,path));
  let last=null;for(const url of candidates){const res=await fetchWithAuth(provider,url,{method:'GET'});if(!res.ok){last=new Error(`结果下载失败 ${res.status}`);if([404,405].includes(res.status))continue;throw last}const parsed=await readResponse(res);return parsed.value}throw last||new Error('任务成功但没有找到视频结果下载接口');
}
function videoRequestDiagnostics(model,task,refs,createPath,transport){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{};return{createPath,transport,modelId:String(model?.id||''),duration:Number(p.duration||p.seconds||0),resolution:String(p.resolution||''),aspectRatio:String(p.aspectRatio||p.aspect_ratio||''),size:String(p.size||''),referenceCount:refs.length,hasFirstFrame:refs.some(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image')}}
async function providerJson(provider,url,init){"""
runtime=replace_once(runtime,old,new,'adaptive video helpers')

# Preserve useful route metadata if a supplier exposes it in /models.
old="const base={id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:'auto',...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};"
new="const base={id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:String(raw.adapterKey||raw.adapter_key||'auto'),...(raw.createPath||raw.create_path?{createPath:String(raw.createPath||raw.create_path)}:{}),...(raw.pollPath||raw.poll_path?{pollPath:String(raw.pollPath||raw.poll_path)}:{}),...(raw.contentPath||raw.content_path?{contentPath:String(raw.contentPath||raw.content_path)}:{}),...(raw.taskIdPath||raw.task_id_path?{taskIdPath:String(raw.taskIdPath||raw.task_id_path)}:{}),...(raw.statusPath||raw.status_path?{statusPath:String(raw.statusPath||raw.status_path)}:{}),...(raw.outputPath||raw.output_path?{outputPath:String(raw.outputPath||raw.output_path)}:{}),...(raw.responseMode||raw.response_mode?{responseMode:String(raw.responseMode||raw.response_mode)}:{}),...(raw.operationRoutes?{operationRoutes:clone(raw.operationRoutes)}:{}),...(raw.requestTemplate?{requestTemplate:clone(raw.requestTemplate)}:{}),...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};"
runtime=replace_once(runtime,old,new,'discovery route metadata')

# Add diagnostics and make automatic route fallback continue on request-format errors.
old="if(route.adapterKey==='standard-video-async-v1'){try{const form=await buildStandardVideoForm(model,task,refs);created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{},body:form})}catch(error){if(![400,404,405,415,422].includes(Number(error?.status)))throw error;lastCreateError=error;created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})}}"
new="if(route.adapterKey==='standard-video-async-v1'){try{updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'multipart')});const form=await buildStandardVideoForm(model,task,refs);created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{},body:form})}catch(error){if(!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;lastCreateError=error;updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json')});created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})}}"
runtime=replace_once(runtime,old,new,'video request diagnostics')
old="if(!autoVideoRoute(model,route)||![404,405].includes(Number(error?.status)))throw error"
new="if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error"
runtime=replace_once(runtime,old,new,'create path retry statuses')

# Accept immediate successful video outputs and derive poll URLs from the create response.
old="""  if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
  const taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
  if(!taskId)throw new Error('异步接口没有返回任务 ID');
  updateTask(task.id,{status:'polling',upstreamTaskId:String(taskId),progress:5});
  const started=Date.now();let attempt=0;"""
new="""  if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
  const createdModality=normalizeMod(task.nodeType),immediateOutput=createdModality==='video'&&Core?.extractOutput?Core.extractOutput(created.value,route,'video'):undefined;
  const taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
  if(createdModality==='video'&&immediateOutput&&!taskId){const value=await normalizeGeneratedOutput(immediateOutput,'video',provider);return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,'video'),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}})}
  if(!taskId)throw new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果');
  const pollCandidates=createdModality==='video'?videoPollUrlCandidates(provider,created.value,usedCreatePath,taskId,route):[];let activePollUrl='';
  updateTask(task.id,{status:'polling',upstreamTaskId:String(taskId),progress:5,videoProtocolDiagnostics:createdModality==='video'?{createPath:usedCreatePath,pollCandidates}:undefined});
  const started=Date.now();let attempt=0;"""
runtime=replace_once(runtime,old,new,'video create response adaptation')

old="""    const pollPath=matchingPollPath(usedCreatePath,taskId,route),pollUrl=joinUrl(provider.baseUrl,pollPath);
    await sleep(attempt?Math.min(30000,Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,attempt):route.pollIntervalMs||1500):Math.max(500,Number(route.pollIntervalMs||1500)));
    const polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');"""
new="""    const pollPath=matchingPollPath(usedCreatePath,taskId,route),pollUrl=joinUrl(provider.baseUrl,pollPath);
    await sleep(attempt?Math.min(30000,Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,attempt):route.pollIntervalMs||1500):Math.max(500,Number(route.pollIntervalMs||1500)));
    let polled;if(createdModality==='video'){const ordered=activePollUrl?[activePollUrl,...pollCandidates.filter(x=>x!==activePollUrl)]:pollCandidates;const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;updateTask(task.id,{videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}})}else polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');"""
runtime=replace_once(runtime,old,new,'adaptive video polling')

old="if((output==null||output==='')&&route.contentPath){const contentUrl=joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId}));const content=await fetchWithAuth(provider,contentUrl,{method:'GET'});if(!content.ok)throw new Error(`结果下载失败 ${content.status}`);const parsed=await readResponse(content);output=parsed.value}"
new="if((output==null||output==='')&&createdModality==='video')output=await fetchVideoContent(provider,polled.value,taskId,route,activePollUrl);else if((output==null||output==='')&&route.contentPath){const contentUrl=joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId}));const content=await fetchWithAuth(provider,contentUrl,{method:'GET'});if(!content.ok)throw new Error(`结果下载失败 ${content.status}`);const parsed=await readResponse(content);output=parsed.value}"
runtime=replace_once(runtime,old,new,'adaptive video content')
write('browser-runtime.js',runtime)

# 4) Cache-bust every protocol component.
index=read('index.html')
for filename in ['provider-adapter-contract.js','provider-runtime-core.js','video-request-parameters.js','browser-runtime.js','browser-bootstrap.js']:
    index=re.sub(rf'(src="\\./{re.escape(filename)}\\?v=)[^"]+',rf'\\g<1>20260828-video-protocol-autodetect-1',index,count=1)
write('index.html',index)
boot=read('browser-bootstrap.js')
boot=re.sub(r"const v='[^']+';","const v='20260828-video-protocol-autodetect-1';",boot,count=1)
write('browser-bootstrap.js',boot)

# 5) Regression tests.
test=read('tests/video-generation-runtime.test.mjs')
test += """

test('auto video protocol retries request-format failures across common create paths',()=>{
  const src=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
  assert.match(src,/VIDEO_AUTO_RETRY_STATUSES=new Set\\(\\[400,404,405,415,422\\]\\)/);
  assert.match(src,/\\/v1\\/video\\/generations/);
  assert.match(src,/\\/v1\\/videos\\/generations/);
  assert.match(src,/\\/api\\/v1\\/video\\/generations/);
  assert.match(src,/VIDEO_AUTO_RETRY_STATUSES\\.has\\(Number\\(error\\?\\.status\\)\\)/);
});

test('video polling follows response urls and falls back to task endpoints',()=>{
  const src=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
  assert.match(src,/videoPollUrlCandidates/);
  assert.match(src,/status_url/);
  assert.match(src,/poll_url/);
  assert.match(src,/`\\/v1\\/tasks\\/\\$\\{taskId\\}`/);
  assert.match(src,/pollVideoJson/);
  assert.match(src,/fetchVideoContent/);
});

test('video core accepts task-state and nested result schemas',()=>{
  assert.equal(C.extractTaskId({result:{task:{id:'job-9'}}}),'job-9');
  const a=C.classifyAsyncPoll({data:{task:{state:'completed',result:{url:'https://cdn.test/v.mp4'}}}},{allowOutputWithoutTerminalStatus:true},'video');
  assert.equal(a.state,'success');
  assert.equal(a.output,'https://cdn.test/v.mp4');
  const b=C.classifyAsyncPoll({data:{task_result:{videos:[{url:'https://cdn.test/v2.mp4'}]}}},{allowOutputWithoutTerminalStatus:true},'video');
  assert.equal(b.state,'success');
  assert.equal(b.output,'https://cdn.test/v2.mp4');
});

test('standard video adapter accepts output without terminal status',()=>{
  const src=fs.readFileSync(path.join(ROOT,'provider-adapter-contract.js'),'utf8');
  assert.match(src,/standard-video-async-v1'[\\s\\S]*allowOutputWithoutTerminalStatus:true/);
});
"""
write('tests/video-generation-runtime.test.mjs',test)
print('adaptive video protocol repair applied')
