/* Agnes-only video protocol registry.
 * Video generation is intentionally locked to Agnes Video 2.5 Flash.
 * Text and image provider adapters remain independent from this file.
 */
(()=>{
'use strict';
const SUCCESS=['completed','succeeded','success','done','finished','ready'];
const FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];
const AGNES_VIDEO_MODEL='agnes-video-2.5-flash';
const AGNES_HOST='apihub.agnes-ai.com';
const COMMON_TASK_IDS=['video_id','videoId','id','task_id','taskId','data.video_id','data.videoId','data.id','data.task_id','data.taskId'];
const COMMON_STATUS=['status','data.status'];
const COMMON_PROGRESS=['progress','data.progress'];
const COMMON_OUTPUTS=['metadata.url','data.metadata.url','url','data.url'];
const UNSUPPORTED_REASON='视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash；通用视频接口和其他供应商视频协议已停用';
const hostOf=provider=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}};
const modelIdOf=model=>String(model?.id||'').trim().toLowerCase();
function isAgnesVideo(provider={},model={}){
  const host=hostOf(provider),modelId=modelIdOf(model);
  return (host===AGNES_HOST||host.endsWith('.agnes-ai.com'))&&modelId===AGNES_VIDEO_MODEL;
}
function assertAgnesVideo(provider={},model={}){
  if(!isAgnesVideo(provider,model))throw new Error(UNSUPPORTED_REASON);
}
function detectFamily(provider={},model={}){return isAgnesVideo(provider,model)?'agnes-video':'unsupported-video'}
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
function unsupportedProfile(){
  return{
    family:'unsupported-video',protocolFamily:'unsupported-video',profile:'disabled:agnes-only',protocolProfile:'disabled:agnes-only',
    adapterKey:'standard-video-async-v1',responseMode:'async',method:'POST',pollMethod:'GET',requestTransport:'json',referenceTransport:'url',
    createPath:'',createCandidates:[],pollPath:'',pollPathCandidates:[],strictPollPath:true,
    taskIdPath:'',taskIdPaths:[],statusPath:'',statusPaths:[],progressPath:'',progressPaths:[],outputPath:'',outputPaths:[],contentPath:'',contentPathCandidates:[],
    successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:false,pollIntervalMs:1500,timeoutMs:3600000,
    unsupported:true,unsupportedReason:UNSUPPORTED_REASON
  };
}
function resolve(provider={},model={},operation='generate'){
  if(!isAgnesVideo(provider,model))return unsupportedProfile();
  const op=operation==='generate'?detectOperation({references:model.__references||[],parameters:model.__parameters||{}}):operation;
  const origin=(()=>{try{return new URL(String(provider.baseUrl||'https://apihub.agnes-ai.com/v1')).origin}catch{return'https://apihub.agnes-ai.com'}})();
  const poll=origin+'/agnesapi?video_id={{taskId}}&model_name='+AGNES_VIDEO_MODEL;
  return{
    family:'agnes-video',protocolFamily:'agnes-video',profile:'agnes:'+AGNES_VIDEO_MODEL,protocolProfile:'agnes:'+AGNES_VIDEO_MODEL,
    adapterKey:'standard-video-async-v1',responseMode:'async',method:'POST',pollMethod:'GET',requestTransport:'json',referenceTransport:'url',
    createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:poll,pollPathCandidates:[poll],strictPollPath:true,
    taskIdPath:'video_id',taskIdPaths:COMMON_TASK_IDS,statusPath:'status',statusPaths:COMMON_STATUS,progressPath:'progress',progressPaths:COMMON_PROGRESS,
    outputPath:'metadata.url',outputPaths:COMMON_OUTPUTS,contentPath:'',contentPathCandidates:[],
    successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:false,pollIntervalMs:1500,timeoutMs:3600000,videoOperation:op
  };
}
function agnesPublicMediaUrl(value,label){
  const text=String(value||'').trim();
  if(!/^https?:\/\//i.test(text))throw new Error('Agnes Video 2.5 Flash 的'+label+'必须是 Agnes 可公开访问的 HTTP/HTTPS URL；浏览器本地地址、blob URL 和 Base64 Data URI 不能直接作为视频参考素材');
  return text;
}
function mapAgnesVideoRequest(model={},task={},refs=[]){
  const p={...(task.parameters||{})},prompt=String(task.prompt||'');
  const seconds=String(Math.max(4,Math.min(12,Math.round(Number(p.seconds??p.duration??5)||5))));
  const allowedRatios=['21:9','16:9','4:3','1:1','3:4','9:16'];
  const requestedRatio=String(p.aspectRatio||p.aspect_ratio||'');
  const ratio=allowedRatios.includes(requestedRatio)?requestedRatio:'16:9';
  const body={model:AGNES_VIDEO_MODEL,prompt,seconds,mode:'text',size:'720P',aspect_ratio:ratio,n:1};
  const list=Array.isArray(refs)?refs:[];
  const images=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='image'||/frame|image|picture/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const audios=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='audio');
  const videos=list.filter(r=>String(r?.type||r?.kind||'').toLowerCase()==='video');
  if(!images.length&&!audios.length&&!videos.length)return body;
  if(videos.length)throw new Error('Agnes Video 2.5 Flash 不支持 reference 视频输入');
  const first=images.find(r=>/first/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  const last=images.find(r=>/last/.test(String(r?.role||r?.semanticRole||'').toLowerCase()));
  if(images.length===1||first||last){
    body.mode='keyframe';
    if(first||images[0])body.first_frame=agnesPublicMediaUrl((first||images[0])?.url||(first||images[0])?.value,'首帧图片');
    if(last)body.last_frame=agnesPublicMediaUrl(last.url||last.value,'尾帧图片');
    return body;
  }
  body.mode='reference';
  if(images.length>5)throw new Error('Agnes Video 2.5 Flash 最多支持 5 张参考图片');
  if(images.length)body.images=images.map(r=>agnesPublicMediaUrl(r.url||r.value,'参考图片'));
  if(audios.length)body.audios=audios.map(r=>agnesPublicMediaUrl(r.url||r.value,'参考音频'));
  return body;
}
function mapRequest(provider={},model={},task={},route={},refs=[]){
  assertAgnesVideo(provider,model);
  const operation=String(route.videoOperation||detectOperation({references:refs,parameters:task.parameters||{}}));
  return{family:'agnes-video',operation,body:mapAgnesVideoRequest(model,task,refs)};
}
function publicProfiles(){return['agnes-video']}
globalThis.CanvasVideoProtocolRegistry=Object.freeze({SUCCESS,FAILURE,AGNES_VIDEO_MODEL,UNSUPPORTED_REASON,isAgnesVideo,detectFamily,detectOperation,resolve,mapRequest,publicProfiles,COMMON_TASK_IDS,COMMON_STATUS,COMMON_PROGRESS,COMMON_OUTPUTS});
})();
