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
  const hint=hintOf(model),host=hostOf(provider);
  if((host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\bh3\b/.test(hint))return'xogpu-minimax-h3';
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
  const raw=String(parameters.generationMode||parameters.videoMode||parameters.operation||parameters.videoOperation||'').trim().toLowerCase();
  const aliases={
    'text2video':'text-to-video','t2v':'text-to-video','text_to_video':'text-to-video','text-video':'text-to-video','文生视频':'text-to-video',
    'image2video':'image-to-video','i2v':'image-to-video','image_to_video':'image-to-video','image-video':'image-to-video','图生视频':'image-to-video',
    'frame2video':'first-last-frame','first-last-frame':'first-last-frame','first_last_frame':'first-last-frame','首尾帧':'first-last-frame',
    'omni_reference':'reference-to-video','omni-reference':'reference-to-video','omni':'reference-to-video','multimodal':'reference-to-video','multi-modal':'reference-to-video','reference2video':'reference-to-video','reference_to_video':'reference-to-video','ref2video':'reference-to-video','audio2video':'reference-to-video','全能参考':'reference-to-video','多模态':'reference-to-video'
  };
  const explicit=aliases[raw]||raw,refs=Array.isArray(references)?references:[];
  const media=refs.filter(r=>['image','video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase())||/frame|image|picture|video|motion|audio|voice|sound/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const images=media.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const hasVideoAudio=media.some(r=>['video','audio'].includes(String(r?.type||r?.kind||'').toLowerCase()));
  const hasLast=images.some(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(explicit&&explicit!=='text-to-video'&&!['generate','generation','video','video-generation','video_generation'].includes(explicit))return explicit;
  if(hasLast)return'first-last-frame';
  if(hasVideoAudio||images.length>1)return'reference-to-video';
  if(images.length)return'image-to-video';
  if(explicit==='text-to-video')return'text-to-video';
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
function xogpuVideoProfile(provider,model,operation){
  const host=hostOf(provider),hint=hintOf(model);if(!((host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\bh3\b/.test(hint)))return null;
  const base=genericProfile('xogpu-minimax-h3'),media=operation!=='text-to-video';
  const rootPath=value=>{try{return new URL(String(provider?.baseUrl||'')).origin+String(value||'')}catch{return String(value||'')}};
  const studioJobs=rootPath('/api/user/discount-video-studio/jobs'),studioJobPoll=rootPath('/api/user/discount-video-studio/jobs/{{taskId}}');
  return{...base,profile:'xogpu:minimax-h3',createPath:media?studioJobs:'/v1/videos',createCandidates:[media?studioJobs:'/v1/videos'],pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}',studioJobPoll],strictPollPath:true,strictCreatePath:true,taskIdPath:'id',taskIdPaths:['id','task_id','taskId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'',outputPaths:[],contentPath:'/v1/videos/{{taskId}}/content',contentPathCandidates:['/v1/videos/{{taskId}}/content'],requestTransport:media?'multipart':'json',strictMediaTransport:media,noJsonFallback:media,referenceTransport:'auto',allowOutputWithoutTerminalStatus:false,pollIntervalMs:15000,timeoutMs:3600000,videoOperation:operation};
}
function xogpuMediaReference(value,type){const text=String(value||'').trim(),label=type==='image'?'图片':type==='video'?'参考视频':'参考音频';if(/^https:\/\//i.test(text))return text;if(type==='image'&&/^data:image\/(?:png|jpeg|jpg|webp|heic|heif);base64,/i.test(text))return text;throw new Error('XOGPU MiniMax-H3 的'+label+'必须使用公网 HTTPS URL'+(type==='image'?' 或 Base64 Data URL':'')+'；不支持浏览器本地地址、HTTP 或 blob URL')}
function xogpuStudioSize(ratio,p={}){
  const valid=new Set(['1280x720','720x1280','1024x1024','1024x768','768x1024','1792x768']),explicit=String(p.size||'').trim();if(valid.has(explicit))return explicit;
  return({'16:9':'1280x720','9:16':'720x1280','1:1':'1024x1024','4:3':'1024x768','3:4':'768x1024','21:9':'1792x768'})[ratio]||'1280x720';
}
function mapXogpuVideoRequest(model={},task={},refs=[],operation='generate'){
  const p={...(task.parameters||{})},prompt=String(task.prompt||'').trim();
  if(!prompt)throw new Error('XOGPU MiniMax-H3 必须填写 prompt');
  if(prompt.length>7000)throw new Error('XOGPU MiniMax-H3 prompt 最长 7000 字符');
  const list=Array.isArray(refs)?refs:[],inferred=detectOperation({references:list,parameters:p});
  const aliases={'text2video':'text-to-video','image2video':'image-to-video','frame2video':'first-last-frame','omni_reference':'reference-to-video','reference2video':'reference-to-video','audio2video':'reference-to-video'};
  const raw=String(operation||'').trim().toLowerCase(),normalized=aliases[raw]||raw;
  let mode=['text-to-video','image-to-video','first-last-frame','reference-to-video'].includes(normalized)?normalized:inferred;
  const entries=list.map((r,index)=>{const type=String(r?.type||r?.kind||'').toLowerCase(),role=String(r?.role||r?.semanticRole||'').toLowerCase(),url=String(r?.url||r?.value||r?.outputUrl||'').trim();let kind='';if(type==='image'||/image|frame|picture/.test(role))kind='image';else if(type==='video'||/video|motion/.test(role))kind='video';else if(type==='audio'||/audio|voice|sound/.test(role))kind='audio';return{r,index,type:kind,role,url}}).filter(x=>x.type&&x.url);
  if(mode==='text-to-video'&&entries.length)mode=inferred;
  const images=entries.filter(x=>x.type==='image'),videos=entries.filter(x=>x.type==='video'),audios=entries.filter(x=>x.type==='audio');
  if(images.length>9)throw new Error('XOGPU MiniMax-H3 最多支持 9 张图片');
  if(videos.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考视频');
  if(audios.length>3)throw new Error('XOGPU MiniMax-H3 最多支持 3 段参考音频');
  if(entries.length>12)throw new Error('XOGPU MiniMax-H3 全部参考媒体合计最多 12 个');
  for(const item of [...videos,...audios]){const seconds=Number(item.r?.duration??item.r?.seconds??item.r?.metadata?.duration);if(Number.isFinite(seconds)&&(seconds<2||seconds>15))throw new Error(`XOGPU MiniMax-H3 的${item.type==='video'?'参考视频':'参考音频'}必须为 2-15 秒`)}
  const duration=Math.max(1,Math.min(15,Math.round(Number(p.duration??p.seconds??5)||5))),allowed=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  const hasVisual=images.length>0||videos.length>0;let ratio=String(p.ratio||p.aspectRatio||p.aspect_ratio||(mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9')).trim().toLowerCase();if(!allowed.includes(ratio))ratio=mode==='text-to-video'?'16:9':hasVisual?'adaptive':'16:9';if(ratio==='adaptive'&&!hasVisual)ratio='16:9';
  if(mode==='text-to-video')return{model:'MiniMax-H3',prompt,duration,ratio,group:'discount_video_generation'};
  if(mode==='image-to-video'&&(images.length!==1||videos.length||audios.length))throw new Error('XOGPU MiniMax-H3 图生视频必须且只能上传 1 张首帧图片');
  if(mode==='first-last-frame'&&(images.length!==2||videos.length||audios.length))throw new Error('XOGPU MiniMax-H3 首尾帧模式必须上传 2 张图片');
  if(mode==='reference-to-video'&&!entries.length)throw new Error('XOGPU MiniMax-H3 多模态参考至少需要 1 个媒体素材');
  const studioMode=mode==='image-to-video'?'image':mode==='first-last-frame'?'frames':'multi';
  return{model:'MiniMax-H3',prompt,seconds:duration,size:xogpuStudioSize(ratio,p),metadata:JSON.stringify({mode:studioMode,ratio})};
}
function agnesVideoProfile(provider,model,operation){
  const host=hostOf(provider),hint=hintOf(model);if(!((host==='apihub.agnes-ai.com'||host.endsWith('.agnes-ai.com'))&&/agnes[-_. ]?video/.test(hint)))return null;
  const modelId=String(model.id||'agnes-video-2.5-flash'),origin=(()=>{try{return new URL(String(provider.baseUrl||'https://apihub.agnes-ai.com/v1')).origin}catch{return'https://apihub.agnes-ai.com'}})();
  const poll=origin+'/agnesapi?video_id={{taskId}}&model_name='+encodeURIComponent(modelId),base=genericProfile('agnes-video');
  return{...base,profile:'agnes:'+modelId,createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:poll,pollPathCandidates:[poll],strictPollPath:true,taskIdPath:'video_id',taskIdPaths:['video_id','videoId','data.video_id','data.videoId',...COMMON_TASK_IDS],statusPath:'status',statusPaths:['status',...COMMON_STATUS],progressPath:'progress',progressPaths:['progress',...COMMON_PROGRESS],outputPath:'metadata.url',outputPaths:['metadata.url','metadata.video_url','metadata.videoUrl','data.metadata.url','data.metadata.video_url','data.metadata.videoUrl','remixed_from_video_id','data.remixed_from_video_id',...COMMON_OUTPUTS],contentPath:'',contentPathCandidates:[],requestTransport:'json',referenceTransport:'url',pollIntervalMs:1500,timeoutMs:3600000,videoOperation:operation};
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
  const specialized=xogpuVideoProfile(provider,model,op)||agnesVideoProfile(provider,model,op)||dataEyesProfile(provider,model,op);if(specialized)return specialized;
  const base=genericProfile(family),candidates=gatewayCandidates(family,op);
  return{...base,...candidates,profile:`${family}:${op}`,videoOperation:op,createPath:candidates.createCandidates?.[0]||'/v1/video/generations',pollPath:candidates.pollPathCandidates?.[0]||'/v1/video/generations/{{taskId}}',contentPath:(candidates.contentPathCandidates||[])[0]||''};
}
function mapRequest(provider={},model={},task={},route={},refs=[]){
  const family=String(route.protocolFamily||route.family||detectFamily(provider,model));
  const operation=String(route.videoOperation||detectOperation({references:refs,parameters:task.parameters||{}}));
  const p={...(task.parameters||{})},prompt=String(task.prompt||''),first=(refs||[]).find(r=>r?.url&&(/first|image|reference/.test(String(r.role||r.semanticRole||'').toLowerCase())||r.type==='image')),last=(refs||[]).find(r=>r?.url&&/last/.test(String(r.role||r.semanticRole||'').toLowerCase()));
  if(family==='xogpu-minimax-h3')return{family,operation,body:mapXogpuVideoRequest(model,task,refs,operation)};
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
function publicProfiles(){return['xogpu-minimax-h3','agnes-video','kling','seedance','minimax-hailuo','vidu','veo','sora-openai','wan','grok','generic-video'];}
globalThis.CanvasVideoProtocolRegistry=Object.freeze({SUCCESS,FAILURE,detectFamily,detectOperation,resolve,mapRequest,publicProfiles,COMMON_TASK_IDS,COMMON_STATUS,COMMON_PROGRESS,COMMON_OUTPUTS});
})();
