/* Shared video protocol registry.
 * Pure model-family/protocol metadata used by browser preview and local desktop runtime.
 * Provider/model explicit overrides always win over these defaults.
 */
(()=>{
'use strict';
const SUCCESS=['completed','succeeded','success','done','finished','ready'];
const FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];
const uniq=list=>[...new Set((list||[]).map(x=>String(x||'').trim()).filter(Boolean))];
const hostOf=provider=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}};
const hintOf=model=>`${model?.id||''} ${model?.name||''}`.trim().toLowerCase();
function detectFamily(provider={},model={}){
  const explicit=String(model.videoProtocolFamily||model.protocolFamily||model.videoFamily||'').trim().toLowerCase();
  if(explicit)return explicit;
  const hint=hintOf(model);
  if(/agnes[-_. ]?video/.test(hint))return'agnes-video';
  if(/kling|kwaivgi|可灵/.test(hint))return'kling';
  if(/seedance|seed[-_. ]?ance|art[-_. ]?sdance|artsdance|dance\s*2(?:\.0)?|doubao[-_. ]?video|豆包.*视频/.test(hint))return'seedance';
  if(/hailuo|minimax|海螺|\bh3\b/.test(hint))return'minimax-hailuo';
  if(/vidu/.test(hint))return'vidu';
  if(/\bveo(?:[-_. ]|$)|google.*video/.test(hint))return'veo';
  if(/\bsora(?:[-_. ]|$)|openai.*video/.test(hint))return'sora-openai';
  if(/\bwan(?:\d|[-_. ]|$)|wanx|qwen.*video|通义.*视频/.test(hint))return'wan';
  if(/grok.*video/.test(hint))return'grok';
  return'generic-video';
}
function detectOperation({references=[],parameters={}}={}){
  const raw=String(parameters.operation||parameters.videoOperation||'').trim().toLowerCase();
  const aliases={'text2video':'text-to-video','t2v':'text-to-video','text_to_video':'text-to-video','image2video':'image-to-video','i2v':'image-to-video','image_to_video':'image-to-video','reference2video':'reference-to-video','reference_to_video':'reference-to-video','ref2video':'reference-to-video','first-last-frame':'first-last-frame','first_last_frame':'first-last-frame'};
  const explicit=aliases[raw]||raw;
  if(explicit&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  const refs=Array.isArray(references)?references:[];
  const images=refs.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|reference/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(images.length>1)return'reference-to-video';
  if(images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase())))return'first-last-frame';
  if(images.length)return'image-to-video';
  return'text-to-video';
}
const COMMON_TASK_IDS=['id','task_id','taskId','request_id','requestId','job_id','jobId','data.id','data.task_id','data.taskId','data.request_id','data.job_id','task.id','data.task.id','job.id','data.job.id','result.id','result.task_id','result.taskId','result.task.id','video.id','data.video.id'];
const COMMON_STATUS=['status','state','data.status','data.state','task.status','task.state','data.task.status','data.task.state','job.status','job.state','data.job.status','data.job.state','result.status','result.state','video.status','video.state','data.video.status','data.video.state'];
const COMMON_PROGRESS=['progress','percent','data.progress','data.percent','task.progress','task.percent','data.task.progress','data.task.percent','job.progress','result.progress'];
const COMMON_OUTPUTS=[
  'task.content.url','task.content.video_url','task.content.videoUrl','task.content.download_url','data.task.content.url','data.task.content.video_url',
  'output.url','output.video_url','output.videoUrl','output.video.url','output.0.url','output.0.video_url','data.output.url','data.output.video_url','data.output.0.url',
  'result.url','result.video_url','result.videoUrl','result.video.url','result.output.url','data.result.url','data.result.video_url','data.result.video.url','data.result.output.url',
  'data.video_url','data.videoUrl','video_url','videoUrl','video.url','data.video.url','videos.0.url','data.videos.0.url','result.videos.0.url','data.result.videos.0.url',
  'content.url','content.video_url','content.videoUrl','content.download_url','content_url','download_url','file_url','fileUrl','data.content_url','data.download_url','data.file_url','file.url','data.file.url','files.0.url','data.files.0.url',
  'task.output.url','task.output.video_url','task.result.url','task.result.video_url','data.task.output.url','data.task.result.url','task_result.url','task_result.video_url','data.task_result.url','data.task_result.video_url',
  'artifacts.0.url','data.artifacts.0.url','data.outputs.0.url','url','data.url'
];
function genericProfile(family){
  return{family,profile:`${family}:gateway`,adapterKey:'standard-video-async-v1',responseMode:'async',method:'POST',pollMethod:'GET',requestTransport:'json',successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:true,pollIntervalMs:1800,timeoutMs:3600000,taskIdPaths:COMMON_TASK_IDS,statusPaths:COMMON_STATUS,progressPaths:COMMON_PROGRESS,outputPaths:COMMON_OUTPUTS,contentPathCandidates:[]};
}
function gatewayCandidates(family,operation){
  const standard=['/v1/video/generations','/v1/videos','/v1/videos/generations'];
  if(family==='seedance')return{createCandidates:standard,pollPathCandidates:['/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}','/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}']};
  if(family==='kling')return{createCandidates:standard,pollPathCandidates:['/v1/video/generations/{{taskId}}','/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}','/v1/video/tasks/{{taskId}}']};
  if(family==='minimax-hailuo')return{createCandidates:standard,pollPathCandidates:['/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}','/v1/videos/{{taskId}}']};
  if(family==='vidu')return{createCandidates:standard,pollPathCandidates:['/v1/tasks/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/videos/{{taskId}}']};
  if(family==='veo')return{createCandidates:standard,pollPathCandidates:['/v1/tasks/{{taskId}}','/v1/videos/{{taskId}}','/v1/video/generations/{{taskId}}']};
  if(family==='wan')return{createCandidates:standard,pollPathCandidates:['/v1/tasks/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/videos/{{taskId}}']};
  if(family==='sora-openai')return{requestTransport:'multipart-fallback-json',createCandidates:['/v1/videos','/v1/video/generations','/v1/videos/generations'],pollPathCandidates:['/v1/videos/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}'],contentPathCandidates:['/v1/videos/{{taskId}}/content']};
  if(family==='grok')return{createCandidates:['/v1/videos/generations','/v1/video/generations','/v1/videos'],pollPathCandidates:['/v1/videos/generations/{{taskId}}','/v1/tasks/{{taskId}}','/v1/videos/{{taskId}}']};
  return{createCandidates:standard,pollPathCandidates:['/v1/video/generations/{{taskId}}','/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']};
}
function agnesVideoProfile(provider,model,operation){
  const host=hostOf(provider),hint=hintOf(model);if(!((host==='apihub.agnes-ai.com'||host.endsWith('.agnes-ai.com'))&&/agnes[-_. ]?video/.test(hint)))return null;
  const modelId=String(model.id||'agnes-video-2.5-flash'),origin=(()=>{try{return new URL(String(provider.baseUrl||'https://apihub.agnes-ai.com/v1')).origin}catch{return'https://apihub.agnes-ai.com'}})();
  const poll=origin+'/agnesapi?video_id={{taskId}}&model_name='+encodeURIComponent(modelId),base=genericProfile('agnes-video');
  return{...base,profile:'agnes:'+modelId,createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:poll,pollPathCandidates:[poll],strictPollPath:true,taskIdPath:'video_id',taskIdPaths:['video_id','videoId','data.video_id','data.videoId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'metadata.url',outputPaths:['metadata.url','data.metadata.url',...COMMON_OUTPUTS],contentPath:'',contentPathCandidates:[],requestTransport:'json',referenceTransport:'url',pollIntervalMs:1500,timeoutMs:3600000,videoOperation:operation};
}
function agnesPublicMediaUrl(value,label){const text=String(value||'').trim();if(!/^https?:\/\//i.test(text))throw new Error('Agnes Video 2.5 Flash 的'+label+'必须是 Agnes 可公开访问的 HTTP/HTTPS URL；浏览器本地地址、blob URL 和 Base64 Data URI 不能直接作为视频参考素材');return text}
function mapAgnesVideoRequest(model={},task={},refs=[]){
  const p={...(task.parameters||{})},prompt=String(task.prompt||''),flash=/agnes-video-2\.5-flash/i.test(String(model.id||''));
  const seconds=String(Math.max(4,Math.min(12,Math.round(Number(p.seconds??p.duration??5)||5)))),allowedRatios=['21:9','16:9','4:3','1:1','3:4','9:16'],ratio=allowedRatios.includes(String(p.aspectRatio||p.aspect_ratio||''))?String(p.aspectRatio||p.aspect_ratio):'16:9';
  const body={model:model.id,prompt,seconds,mode:'text',size:flash?'720P':String(p.size||p.resolution||'720P').toUpperCase(),aspect_ratio:ratio,n:1};
  const list=Array.isArray(refs)?refs:[],images=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase())),audios=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='audio'),videos=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='video');
  if(!images.length&&!audios.length&&!videos.length)return body;
  if(flash&&videos.length)throw new Error('Agnes Video 2.5 Flash 不支持 reference 视频输入');
  const first=images.find(r=>/first/.test(String(r?.role||r?.semanticRole||'').toLowerCase())),last=images.find(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(images.length===1||first||last){body.mode='keyframe';if(first||images[0])body.first_frame=agnesPublicMediaUrl((first||images[0])?.url||(first||images[0])?.value,'首帧图片');if(last)body.last_frame=agnesPublicMediaUrl(last.url||last.value,'尾帧图片');return body}
  body.mode='reference';if(flash&&images.length>5)throw new Error('Agnes Video 2.5 Flash 最多支持 5 张参考图片');if(images.length)body.images=images.slice(0,flash?5:images.length).map(r=>agnesPublicMediaUrl(r.url||r.value,'参考图片'));if(audios.length)body.audios=audios.map(r=>agnesPublicMediaUrl(r.url||r.value,'参考音频'));return body;
}
function dataEyesProfile(provider,model,operation){
  const host=hostOf(provider);if(!(host==='platform.dataeyes.ai'||host.endsWith('.dataeyes.ai')))return null;
  const family=detectFamily(provider,model),base=genericProfile(family);
  if(family==='minimax-hailuo')return{...base,profile:'dataeyes:minimax-hailuo',createPath:'/hailuo/v2/video_generation',createCandidates:['/hailuo/v2/video_generation'],pollPath:'/hailuo/v2/query/video_generation/{{taskId}}',pollPathCandidates:['/hailuo/v2/query/video_generation/{{taskId}}'],taskIdPaths:['task_id',...COMMON_TASK_IDS],statusPaths:['task.status',...COMMON_STATUS],outputPaths:['task.content.url',...COMMON_OUTPUTS],contentPath:'',contentPathCandidates:[],pollIntervalMs:2000};
  if(family==='kling'){
    const image=operation!=='text-to-video';const create=image?'/kling/v1/videos/image2video':'/kling/v1/videos/text2video';
    return{...base,profile:`dataeyes:kling:${image?'image2video':'text2video'}`,createPath:create,createCandidates:[create],pollPath:`${create}/{{taskId}}`,pollPathCandidates:[`${create}/{{taskId}}`],contentPath:'',contentPathCandidates:[]};
  }
  if(family==='wan')return{...base,profile:'dataeyes:wan',createPath:'/ali/api/v1/services/aigc/video-generation/video-synthesis',createCandidates:['/ali/api/v1/services/aigc/video-generation/video-synthesis'],pollPath:'/ali/api/v1/tasks/{{taskId}}',pollPathCandidates:['/ali/api/v1/tasks/{{taskId}}'],contentPath:'',contentPathCandidates:[]};
  if(family==='vidu'){
    const create=operation==='reference-to-video'?'/vidu/ent/v2/reference2video':operation==='image-to-video'?'/vidu/ent/v2/img2video':'/vidu/ent/v2/text2video';
    return{...base,profile:`dataeyes:vidu:${operation}`,createPath:create,createCandidates:[create],contentPath:'',contentPathCandidates:[]};
  }
  if(family==='grok')return{...base,profile:'dataeyes:grok',createPath:'/grok/v1/videos/generations',createCandidates:['/grok/v1/videos/generations'],contentPath:'',contentPathCandidates:[]};
  return null;
}
function resolve(provider={},model={},operation='generate'){
  const family=detectFamily(provider,model),op=operation==='generate'?detectOperation({references:model.__references||[],parameters:model.__parameters||{}}):operation;
  const specialized=agnesVideoProfile(provider,model,op)||dataEyesProfile(provider,model,op);if(specialized)return specialized;
  const base=genericProfile(family),candidates=gatewayCandidates(family,op);
  return{...base,...candidates,profile:`${family}:${op}`,videoOperation:op,createPath:candidates.createCandidates?.[0]||'/v1/video/generations',pollPath:candidates.pollPathCandidates?.[0]||'/v1/video/generations/{{taskId}}',contentPath:(candidates.contentPathCandidates||[])[0]||''};
}
function mapRequest(provider={},model={},task={},route={},refs=[]){
  const family=String(route.protocolFamily||route.family||detectFamily(provider,model));
  const operation=String(route.videoOperation||detectOperation({references:refs,parameters:task.parameters||{}}));
  const p={...(task.parameters||{})},prompt=String(task.prompt||''),first=(refs||[]).find(r=>r?.url&&(/first|image|reference/.test(String(r.role||r.semanticRole||'').toLowerCase())||r.type==='image')),last=(refs||[]).find(r=>r?.url&&/last/.test(String(r.role||r.semanticRole||'').toLowerCase()));
  if(family==='agnes-video')return{family,operation,body:mapAgnesVideoRequest(model,task,refs)};
  const body={model:model.id,prompt,...p};
  const duration=Number(p.duration??p.seconds??0);if(duration){body.duration=duration;body.seconds=String(p.seconds||duration)}
  const ratio=String(p.aspectRatio||p.aspect_ratio||'');if(ratio){body.aspect_ratio=ratio;body.ratio=ratio}
  if(p.size)body.size=p.size;
  if(first?.url){body.image=first.url;body.image_url=first.url;body.input_image=first.url;body.first_frame=first.url;body.input_reference=first.url}
  if(last?.url){body.last_frame=last.url;body.last_frame_url=last.url}
  if((refs||[]).length)body.references=refs;
  if(family==='kling'){body.mode=body.mode||p.mode||'std';if(p.negativePrompt&&!body.negative_prompt)body.negative_prompt=p.negativePrompt}
  if(family==='seedance'&&first?.url&&!body.image_url)body.image_url=first.url;
  return{family,operation,body};
}
function publicProfiles(){return['agnes-video','kling','seedance','minimax-hailuo','vidu','veo','sora-openai','wan','grok','generic-video'];}
globalThis.CanvasVideoProtocolRegistry=Object.freeze({SUCCESS,FAILURE,detectFamily,detectOperation,resolve,mapRequest,publicProfiles,COMMON_TASK_IDS,COMMON_STATUS,COMMON_PROGRESS,COMMON_OUTPUTS});
})();
