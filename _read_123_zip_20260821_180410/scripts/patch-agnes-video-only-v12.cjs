const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const write=(name,s)=>fs.writeFileSync(path.join(root,name),s);
const OLD_VERSION='20260829-agnes-video-only-1';
const VERSION='20260829-agnes-video-only-2';
const AGNES_MODEL='agnes-video-2.5-flash';
const AGNES_ERROR='视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash；通用视频接口和其他供应商视频协议已停用';

function mustReplace(s,needle,replacement,label){
  if(!s.includes(needle))throw new Error('Missing expected source block: '+label);
  return s.replace(needle,replacement);
}
function mustRegex(s,re,replacement,label){
  if(!re.test(s))throw new Error('Missing expected source pattern: '+label);
  return s.replace(re,replacement);
}
function assertGone(s,patterns,label){for(const p of patterns)if(s.includes(p))throw new Error(label+' still contains '+p)}

// Provider adapter contract: discovery/finalization may observe non-Agnes video models,
// but they are marked unsupported. Only actual video execution is rejected.
{
  const file='provider-adapter-contract.js';
  let s=read(file);
  if(!s.includes("const AGNES_VIDEO_MODEL='agnes-video-2.5-flash';")){
    s=mustReplace(s,"const FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];\n",`const FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];\nconst AGNES_VIDEO_MODEL='${AGNES_MODEL}';\nconst AGNES_VIDEO_ONLY_ERROR='${AGNES_ERROR}';\n`,'provider constants');
  }
  s=mustRegex(s,/function isAgnesProvider\(provider=\{\}\)\{[\s\S]*?\n\}/,`function isAgnesProvider(provider={}){
  const h=providerHost(provider);return h==='apihub.agnes-ai.com'||h.endsWith('.agnes-ai.com');
}
function isAgnesVideoModel(provider={},model={}){
  return isAgnesProvider(provider)&&String(model?.id||'').trim().toLowerCase()===AGNES_VIDEO_MODEL;
}`,'isAgnesProvider');

  s=mustRegex(s,/function inferAdapterKey\(provider=\{\},model=\{\}\)\{[\s\S]*?\n\}\nfunction adapterDefaults/,`function inferAdapterKey(provider={},model={}){
  const mod=normalizeModelModality(model.modality,model);
  if(mod==='video'&&!isAgnesVideoModel(provider,model))return 'unsupported-video';
  const explicit=String(model.adapterKey||'auto').trim();
  if(explicit&&explicit!=='auto')return explicit;
  if(provider.protocol==='comfyui')return 'comfyui-workflow';
  if(provider.protocol==='openai-compatible'){
    if(mod==='text'||mod==='script')return 'openai-chat';
    if(mod==='image')return 'openai-image';
    if(mod==='audio')return 'openai-audio-speech';
    if(mod==='video')return 'standard-video-async-v1';
  }
  const route=String(model.createPath||model.operationRoutes?.generate?.createPath||'').toLowerCase();
  if(/\\/responses(?:$|\\?)/.test(route))return 'openai-responses';
  if(/\\/chat\\/completions(?:$|\\?)/.test(route))return 'openai-chat';
  if(/\\/images\\/generations(?:$|\\?)/.test(route))return 'openai-image';
  if(/\\/audio\\/speech(?:$|\\?)/.test(route))return 'openai-audio-speech';
  if(mod==='video')return 'standard-video-async-v1';
  if(route)return (model.responseMode==='async'||model.operationRoutes?.generate?.responseMode==='async')?'generic-async':'generic-sync';
  const hint=modelHint(model),openAIStyle=providerLooksOpenAIStyle(provider);
  if(mod==='image'&&(/gpt[-_. ]?image|dall[-_. ]?e|flux|imagen|ideogram|stable[-_. ]?diffusion|sdxl/.test(hint)||openAIStyle))return 'openai-image';
  if((mod==='text'||mod==='script')&&(/^(gpt|o1|o3|o4)|claude|gemini|qwen|deepseek|llama|mistral|glm|doubao|moonshot|kimi/.test(hint)||openAIStyle))return 'openai-chat';
  if(mod==='audio'&&(/tts|speech|voice|audio/.test(hint)||openAIStyle))return 'openai-audio-speech';
  if(mod==='image')return 'openai-image';
  if(mod==='audio')return 'openai-audio-speech';
  if(mod==='text'||mod==='script')return 'openai-chat';
  return 'generic-sync';
}
function adapterDefaults`,'inferAdapterKey');

  s=mustRegex(s,/function adapterDefaults\(key,nodeType\)\{[\s\S]*?\n\}\nfunction knownVideoResultProfile/,`function adapterDefaults(key,nodeType){
  if(key==='openai-chat')return{createPath:'/v1/chat/completions',method:'POST',responseMode:'sync',outputPath:'choices.0.message.content'};
  if(key==='openai-responses')return{createPath:'/v1/responses',method:'POST',responseMode:'sync',outputPath:'output.0.content.0.text'};
  if(key==='openai-image')return{createPath:'/v1/images/generations',method:'POST',responseMode:'sync',outputPath:'data.0.url'};
  if(key==='openai-audio-speech')return{createPath:'/v1/audio/speech',method:'POST',responseMode:'sync',outputPath:''};
  if(key==='comfyui-workflow')return{createPath:'/prompt',method:'POST',responseMode:'async',taskIdPath:'prompt_id',pollPath:'/history/{{taskId}}',pollMethod:'GET'};
  if(key==='standard-video-async-v1')return{createPath:'',method:'POST',responseMode:'async',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:3600000};
  if(key==='unsupported-video')return{createPath:'',method:'POST',responseMode:'async',pollPath:'',contentPath:'',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:3600000};
  if(key==='generic-async')return{createPath:'',method:'POST',responseMode:'async',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
  if(key==='generic-sync')return{createPath:'',method:'POST',responseMode:'sync'};
  return{createPath:'',method:'POST',responseMode:nodeType==='video'?'async':'sync',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:1200000};
}
function knownVideoResultProfile`,'adapterDefaults');

  s=mustRegex(s,/function knownVideoResultProfile\(provider=\{\},model=\{\},operation='generate'\)\{[\s\S]*?\n\}\nfunction looksLikeLegacyAutoVideoRoute\(value=\{\}\)\{[\s\S]*?\n\}\nfunction migrateLegacyAutoVideoRoute\(value=\{\}\)\{[\s\S]*?\n\}\nfunction routeIsExplicit\(model=\{\}\)\{[\s\S]*?\n\}/,`function knownVideoResultProfile(provider={},model={},operation='generate'){
  if(!isAgnesVideoModel(provider,model))return{family:'unsupported-video',protocolFamily:'unsupported-video',profile:'unsupported-video',protocolProfile:'unsupported-video',createPath:'',pollPath:'',contentPath:'',createCandidates:[],pollPathCandidates:[],contentPathCandidates:[],taskIdPaths:[],statusPaths:[],progressPaths:[],outputPaths:[]};
  if(!VideoProtocols?.resolve)return{family:'agnes-video',protocolFamily:'agnes-video',profile:'agnes-video-unavailable',protocolProfile:'agnes-video-unavailable',createPath:'',pollPath:'',contentPath:''};
  const profile=VideoProtocols.resolve(provider,model,operation)||{};
  return{...profile,protocolFamily:'agnes-video',protocolProfile:profile.protocolProfile||profile.profile||('agnes:'+AGNES_VIDEO_MODEL)};
}
function routeIsExplicit(model={}){
  const nested=model.videoProtocolConfig&&typeof model.videoProtocolConfig==='object'?model.videoProtocolConfig:{};
  const nestedExplicit=Object.keys(nested).some(k=>nested[k]!==undefined&&nested[k]!==null&&nested[k]!=='');
  const explicitAdapter=Boolean(String(model.adapterKey||'').trim()&&String(model.adapterKey||'auto').trim()!=='auto');
  const hasExplicitRoute=Boolean(String(model.createPath||model.operationRoutes?.generate?.createPath||'').trim());
  return {explicitAdapter,hasExplicitRoute,nestedExplicit,autoDefaults:!explicitAdapter&&!hasExplicitRoute&&!nestedExplicit};
}`,'legacy video route helpers');

  s=mustRegex(s,/function resolveRoute\(provider=\{\},model=\{\},nodeType='',operation='generate'\)\{[\s\S]*?\n\}\nfunction resolveVideoRoute/,`function resolveRoute(provider={},model={},nodeType='',operation='generate'){
  const adapterKey=inferAdapterKey(provider,model);
  if(nodeType==='video'){
    if(!isAgnesVideoModel(provider,model))return{...adapterDefaults('unsupported-video','video'),adapterKey:'unsupported-video',protocolFamily:'unsupported-video',protocolProfile:'unsupported-video',createCandidates:[],pollPathCandidates:[],contentPathCandidates:[],taskIdPaths:[],statusPaths:[],progressPaths:[],outputPaths:[]};
    const known=knownVideoResultProfile(provider,model,operation);
    const route={...adapterDefaults('standard-video-async-v1','video'),...known,adapterKey:'standard-video-async-v1'};
    route.method='POST';route.pollMethod='GET';route.successValues=Array.isArray(route.successValues)&&route.successValues.length?route.successValues:SUCCESS;route.failureValues=Array.isArray(route.failureValues)&&route.failureValues.length?route.failureValues:FAILURE;
    route.pollIntervalMs=clamp(route.pollIntervalMs,500,30000,1500);route.timeoutMs=clamp(route.timeoutMs,5000,3600000,3600000);
    return route;
  }
  const defaults=adapterDefaults(adapterKey,nodeType);
  const direct=compact({createPath:model.createPath,method:model.method,responseMode:model.responseMode,outputPath:model.outputPath,taskIdPath:model.taskIdPath,pollPath:model.pollPath,pollMethod:model.pollMethod,pollBodyTemplate:model.pollBodyTemplate,contentPath:model.contentPath,statusPath:model.statusPath,progressPath:model.progressPath,successValues:model.successValues,failureValues:model.failureValues,pollIntervalMs:model.pollIntervalMs,timeoutMs:model.timeoutMs,requestTemplate:model.requestTemplate,allowOutputWithoutTerminalStatus:model.allowOutputWithoutTerminalStatus});
  const op=compact(model.operationRoutes?.[operation]||model.operationRoutes?.generate||{});
  const route={...defaults,...direct,...op,adapterKey};
  route.method=String(route.method||'POST').toUpperCase();route.pollMethod=String(route.pollMethod||'GET').toUpperCase();
  route.successValues=Array.isArray(route.successValues)&&route.successValues.length?route.successValues:SUCCESS;route.failureValues=Array.isArray(route.failureValues)&&route.failureValues.length?route.failureValues:FAILURE;
  route.pollIntervalMs=clamp(route.pollIntervalMs,500,30000,1500);route.timeoutMs=clamp(route.timeoutMs,5000,3600000,1200000);
  return route;
}
function resolveVideoRoute`,'resolveRoute');

  s=mustRegex(s,/function resolveVideoRoute\(provider=\{\},model=\{\},task=\{\},references=\[\]\)\{[\s\S]*?\n\}/,`function resolveVideoRoute(provider={},model={},task={},references=[]){
  if(!isAgnesVideoModel(provider,model))throw new Error(AGNES_VIDEO_ONLY_ERROR);
  const operation=VideoProtocols?.detectOperation?VideoProtocols.detectOperation({references,parameters:task?.parameters||{}}):String(task?.parameters?.operation||'generate');
  return resolveRoute(provider,model,'video',operation);
}`,'resolveVideoRoute');

  s=mustReplace(s,"  if(type==='video'){next.videoProtocolFamily=next.videoProtocolFamily||route.protocolFamily||route.family||'';next.videoProtocolProfile=route.protocolProfile||route.profile||'';}\n",`  if(type==='video'){
    next.videoProtocolFamily=route.protocolFamily||route.family||'';next.videoProtocolProfile=route.protocolProfile||route.profile||'';
    if(!isAgnesVideoModel(provider,next)){next.enabled=false;next.unsupportedReason=AGNES_VIDEO_ONLY_ERROR;}
  }
`,'finalizeModel video marker');
  s=s.replace('normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,agnesKnownModels','normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,isAgnesVideoModel,agnesKnownModels,AGNES_VIDEO_MODEL,AGNES_VIDEO_ONLY_ERROR');
  assertGone(s,['looksLikeLegacyAutoVideoRoute','migrateLegacyAutoVideoRoute'],file);
  write(file,s);
}

// Browser runtime: one create path + one documented Agnes polling URL. No video endpoint guessing.
{
  const file='browser-runtime.js';
  let s=read(file);
  s=mustRegex(s,/  if\(mod==='video'\)\{const mapped=Adapters\?\.mapVideoRequest\?\.\(provider,model,\{\.\.\.task,parameters:p\},route,refs\);if\(mapped\?\.body\)return mapped\.body;[\s\S]*?\n\n  return\{model:modelId,prompt/,`  if(mod==='video'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return mapped.body;throw new Error('Agnes 视频请求映射失败');}

  return{model:modelId,prompt`,'browser default video body');
  s=mustRegex(s,/async function buildStandardVideoForm\(model,task,refs\)\{[\s\S]*?function videoRequestDiagnostics\(model,task,refs,createPath,transport,route=\{\}\)\{/,`const AGNES_VIDEO_MODEL='${AGNES_MODEL}';
const AGNES_VIDEO_ONLY_ERROR='${AGNES_ERROR}';
function isAgnesVideoRoute(provider,model,route){
  return Boolean(Adapters?.isAgnesVideoModel?.(provider,model))&&String(route?.createPath||'')==='/v1/videos'&&String(route?.pollPath||'').includes('/agnesapi?video_id={{taskId}}')&&String(route?.protocolFamily||'')==='agnes-video';
}
function agnesVideoPollUrl(provider,model,route,taskId){
  if(!isAgnesVideoRoute(provider,model,route))throw new Error(AGNES_VIDEO_ONLY_ERROR);
  const rendered=fillTemplate(String(route.pollPath||''),{taskId});
  const url=providerRouteUrl(provider,rendered);if(!url)throw new Error('Agnes 视频轮询地址无效或不在供应商 Base URL 同源范围内');return url;
}
function videoRequestDiagnostics(model,task,refs,createPath,transport,route={}){`,'browser video helper block');

  const routeLine="  const route=modality==='video'&&Adapters?.resolveVideoRoute?Adapters.resolveVideoRoute(provider,model,task,task.references||[]):Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};\n";
  s=mustReplace(s,routeLine,routeLine+"  if(modality==='video'&&!isAgnesVideoRoute(provider,model,route))throw new Error(AGNES_VIDEO_ONLY_ERROR);\n",'browser route validation');
  s=mustReplace(s,"    const paths=modality==='video'?alternateVideoCreatePaths(route,model):[route.createPath];","    const paths=[route.createPath];",'browser create paths');
  s=mustRegex(s,/        if\(route\.adapterKey==='standard-video-async-v1'\)\{[\s\S]*?        \}else if\(modality==='image'&&route\.adapterKey==='openai-image'\)\{/,`        if(route.adapterKey==='standard-video-async-v1'){
          updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json',route)});
          created=await providerJson(provider,createUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(await videoJsonBody())});
        }else if(modality==='image'&&route.adapterKey==='openai-image'){`,'browser standard video create');
  s=mustReplace(s,"      }catch(error){\n        lastCreateError=error;\n        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;\n      }","      }catch(error){\n        lastCreateError=error;\n        throw error;\n      }",'browser create fallback catch');

  s=mustRegex(s,/  let taskId=existingUpstreamTaskId,pollCandidates=[\s\S]*?  const started=Date\.now\(\);let attempt=0;/,`  let taskId=existingUpstreamTaskId,activePollUrl='';
  if(!resumingUpstream){
    if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
    const immediateOutput=modality==='video'&&Core?.extractOutput?Core.extractOutput(created.value,route,'video'):undefined;
    taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
    if(modality==='video'&&immediateOutput&&!taskId){const value=await normalizeGeneratedOutput(immediateOutput,'video',provider);return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});}
    if(!taskId){const error=new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果；为避免重复扣费不会自动重新提交');error.noRetry=true;throw error}
    if(modality==='video')activePollUrl=agnesVideoPollUrl(provider,model,route,taskId);
    updateTask(task.id,{status:'polling',providerStatus:'processing',resultStatus:'pending',upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,providerCreateResponse:created.kind==='json'?clone(created.value):null,progress:5,videoProtocolDiagnostics:modality==='video'?{createPath:usedCreatePath,pollUrl:activePollUrl}:undefined});
  }else{
    if(modality==='video')activePollUrl=agnesVideoPollUrl(provider,model,route,taskId);
    updateTask(task.id,{status:task.providerStatus==='succeeded'?'result_pending':'polling',providerStatus:task.providerStatus||'processing',resultStatus:task.providerStatus==='succeeded'?'pending':(task.resultStatus||'pending'),upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,videoProtocolDiagnostics:modality==='video'?{...(task.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollUrl:activePollUrl}:task.videoProtocolDiagnostics});
  }

  const started=Date.now();let attempt=0;`,'browser poll setup');
  s=mustRegex(s,/    const pollPath=matchingPollPath\(usedCreatePath,taskId,route\),pollUrl=joinUrl\(provider\.baseUrl,pollPath\);[\s\S]*?      \}else polled=await providerJson\(provider,pollUrl,\{method:route\.pollMethod\|\|'GET',headers:\{'content-type':'application\/json'\}\}\);/,`    const pollUrl=modality==='video'?activePollUrl:joinUrl(provider.baseUrl,fillTemplate(route.pollPath||'',{taskId}));
    await sleep(attempt?Math.min(30000,Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,attempt):route.pollIntervalMs||1500):Math.max(500,Number(route.pollIntervalMs||1500)));
    let polled;
    try{
      polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
      if(modality==='video')updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl}});`,'browser poll request');
  s=s.replace("        if((output==null||output==='')&&modality==='video')output=await fetchVideoContent(provider,polled.value,taskId,route,activePollUrl);\n        else if((output==null||output==='')&&route.contentPath)","        if((output==null||output==='')&&modality!=='video'&&route.contentPath)");
  assertGone(s,['videoPollUrlCandidates','matchingPollPath','pollVideoJson','alternateVideoCreatePaths','VIDEO_AUTO_RETRY_STATUSES','autoVideoRoute','buildStandardVideoForm','fetchVideoContent','/v1/video/generations','/v1/videos/generations','/v1/tasks/${taskId}'],file);
  write(file,s);
}

// Desktop runtime: Agnes video is an exact contract. Generic async remains available for non-video only.
{
  const file='server.js';
  let s=read(file);
  s=s.replace("createPath:String(raw.createPath ?? old.createPath ?? '/v1/videos').trim() || '/v1/videos'","createPath:String(raw.createPath ?? old.createPath ?? '').trim()");
  s=s.replace("pollPath:String(raw.pollPath ?? old.pollPath ?? '/v1/videos/{{taskId}}').trim() || '/v1/videos/{{taskId}}'","pollPath:String(raw.pollPath ?? old.pollPath ?? '').trim()");
  s=s.replace("contentPath:String(raw.contentPath ?? old.contentPath ?? '/v1/videos/{{taskId}}/content').trim()","contentPath:String(raw.contentPath ?? old.contentPath ?? '').trim()");
  s=mustReplace(s,"async function executeGeneric(task, provider, model, payload) {\n","async function executeGeneric(task, provider, model, payload) {\n  if(task.nodeType==='video')throw new Error(ProviderAdapterContract.AGNES_VIDEO_ONLY_ERROR||'"+AGNES_ERROR+"');\n",'desktop generic video guard');
  s=mustRegex(s,/function standardVideoBody\(model,payload,config=\{\}\)\{[\s\S]*?\n\}\nfunction standardVideoTaskId/,`function standardVideoTaskId`,'desktop generic video body mapper');
  s=mustRegex(s,/async function downloadStandardVideoContent\(task,provider,config,taskId\)\{[\s\S]*?\n\}\nasync function executeStandardVideoAsync/,`async function executeStandardVideoAsync`,'desktop content guessing');
  s=mustReplace(s,"async function executeStandardVideoAsync(task,provider,model,payload){\n  if(task.nodeType!=='video')throw new Error('标准异步视频协议只能用于视频模型');\n",`async function executeStandardVideoAsync(task,provider,model,payload){
  if(task.nodeType!=='video')throw new Error('标准异步视频协议只能用于视频模型');
  if(!ProviderAdapterContract.isAgnesVideoModel?.(provider,model))throw new Error(ProviderAdapterContract.AGNES_VIDEO_ONLY_ERROR||'${AGNES_ERROR}');
`,'desktop Agnes guard');
  s=mustReplace(s,"  const createPaths=[...new Set([String(config.createPath||'/v1/videos'),...(Array.isArray(config.createCandidates)?config.createCandidates:[])].filter(Boolean))];\n  let createPath=createPaths[0];","  const createPath=String(config.createPath||'').trim();\n  if(createPath!=='/v1/videos')throw new Error('Agnes 视频创建接口必须为 /v1/videos');",'desktop create path');
  s=mustReplace(s,"  const rawBody=config.requestTemplate&&Object.keys(config.requestTemplate).length?renderTemplate(config.requestTemplate,ctx):(mapped?.body||standardVideoBody(model,payload,config));","  if(!mapped?.body)throw new Error('Agnes 视频请求映射失败');\n  const rawBody=mapped.body;",'desktop Agnes body');
  s=mustRegex(s,/    const createMethod=String\(config\.createMethod\|\|config\.method\|\|'POST'\)\.toUpperCase\(\);[\s\S]*?    if\(!created\)throw lastCreateError\|\|new Error\('没有可用的视频创建接口'\);/,`    const createMethod='POST';
    taskLog(task,\`Agnes 视频：POST ${'${createPath}'}\`);
    const created=await fetchJson(joinUrl(provider.baseUrl,createPath),{method:createMethod,headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:Math.min(config.timeoutMs,120000),provider});`,'desktop create fallback loop');
  s=mustRegex(s,/    const pollTemplates=\[\.\.\.new Set\(\[String\(config\.pollPath\|\|'\/v1\/videos\/\{\{taskId\}\}'\),\.\.\.\(Array\.isArray\(config\.pollPathCandidates\)\?config\.pollPathCandidates:\[\]\)\]\.filter\(Boolean\)\)\];[\s\S]*?    if\(!polled\)\{[\s\S]*?      throw lastPollError\|\|new Error\('没有可用的视频轮询接口'\);\n    \}/,`    const pollTemplate=String(config.pollPath||'').trim();
    if(!pollTemplate||!pollTemplate.includes('/agnesapi?video_id={{taskId}}'))throw new Error('Agnes 视频轮询接口配置无效');
    const pollMethod='GET';
    const pollPath=renderPathTemplate(pollTemplate,pollCtx);
    let polled;
    try{polled=await fetchJson(joinUrl(provider.baseUrl,pollPath),{method:pollMethod,headers:providerHeaders(provider),timeoutMs:60000,provider})}
    catch(error){if(ProviderRuntimeCore.isRetryableProviderFailure?.(error)){const detail=error?.message||String(error);updateTask(task,{status:'retrying',lastPollAt:new Date().toISOString(),lastError:detail,progress:Math.min(94,20+checks*4)});taskLog(task,\`上游轮询暂时不可用，保留任务 ${'${taskId}'} 后继续重试：${'${detail}'}\`,'warn');continue}throw error}`,'desktop poll fallback loop');
  s=mustRegex(s,/      try\{[\s\S]*?        updateTask\(task,\{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastError:contentError\?\.message\|\|String\(contentError\)\}\);\n      \}\n      \/\/ Some providers publish `succeeded` before the CDN\/result URL becomes visible\./,`      updateTask(task,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastError:'Agnes 上游已完成，正在等待 metadata.url'});
      // Agnes may publish completed before metadata.url becomes visible.`,'desktop success content fallback');
  const runMarker="  const model=(provider.models||[]).find(m=>m.id===task.modelId&&m.modality===task.nodeType);\n  if(!model)throw new Error('所选模型不存在，或模型类型与节点类型不匹配');\n";
  s=mustReplace(s,runMarker,runMarker+"  if(task.nodeType==='video'&&!ProviderAdapterContract.isAgnesVideoModel?.(provider,model))throw new Error(ProviderAdapterContract.AGNES_VIDEO_ONLY_ERROR||'"+AGNES_ERROR+"');\n",'desktop task video validation');
  assertGone(s,['genericPollPath','defaultPoll','downloadStandardVideoContent','standardVideoBody',"config.pollPath||'/v1/videos/{{taskId}}'","config.createPath||'/v1/videos'"],file);
  write(file,s);
}

// Browser asset cache bust for the strict Agnes-only runtime.
for(const file of ['index.html','models.html','browser-bootstrap.js']){
  let s=read(file);
  s=s.split(OLD_VERSION).join(VERSION);
  write(file,s);
}

console.log('Agnes-only runtime patch applied:',VERSION);
