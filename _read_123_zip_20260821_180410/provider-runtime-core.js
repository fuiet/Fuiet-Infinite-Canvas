/* Shared provider runtime core.
 * Pure protocol/state helpers used by both the local Node runtime and preview runtime.
 * No filesystem, socket, fetch, database, or platform-specific APIs belong here.
 */
(()=>{
'use strict';
const DEFAULT_SUCCESS=['completed','succeeded','success','done','finished','ready'];
const DEFAULT_FAILURE=['failed','failure','error','canceled','cancelled','rejected','expired'];

function getPath(obj,path){
  if(!path)return obj;
  let current=obj;
  for(const part of String(path).replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean)){
    if(current==null)return undefined;
    current=Array.isArray(current)&&/^\d+$/.test(part)?current[Number(part)]:current[part];
  }
  return current;
}
function firstPath(obj,paths=[]){
  for(const path of paths){
    if(!path)continue;
    const value=getPath(obj,path);
    if(value!==undefined&&value!==null&&value!=='')return value;
  }
  return undefined;
}
function findStringByPrefix(value,prefix,depth=0){
  if(depth>6||value==null)return '';
  if(typeof value==='string')return value.startsWith(prefix)?value:'';
  if(Array.isArray(value)){
    for(const item of value){const hit=findStringByPrefix(item,prefix,depth+1);if(hit)return hit;}
    return '';
  }
  if(typeof value==='object'){
    for(const item of Object.values(value)){const hit=findStringByPrefix(item,prefix,depth+1);if(hit)return hit;}
  }
  return '';
}
function lowerValues(values,fallback){
  const source=Array.isArray(values)&&values.length?values:fallback;
  return new Set(source.map(value=>String(value).trim().toLowerCase()).filter(Boolean));
}
function extractTaskId(response,config={}){
  if(config.taskIdPath){
    const explicit=getPath(response,config.taskIdPath);
    if(explicit!==undefined&&explicit!==null&&explicit!=='')return String(explicit);
  }
  const common=firstPath(response,[
    'id','task_id','taskId','request_id','requestId','job_id','jobId',
    'data.id','data.task_id','data.taskId','data.request_id','data.job_id','data.jobId',
    'task.id','job.id','result.id','result.task.id','result.job.id','video.id','data.video.id','data.task.id','data.job.id','result.task_id','result.taskId'
  ]);
  if(common===undefined||common===null||common===''){
    const scalar=typeof response?.data==='string'||typeof response?.data==='number'?response.data:(typeof response?.result==='string'||typeof response?.result==='number'?response.result:undefined);
    if(scalar!==undefined&&scalar!==null&&String(scalar).trim())return String(scalar);
  }
  return common!==undefined&&common!==null&&common!==''?String(common):findStringByPrefix(response,'video_task_');
}
function extractStatus(response,config={}){
  return firstPath(response,[config.statusPath,'status','data.status','state','data.state','task.status','task.state','data.task.status','data.task.state','job.status','job.state','data.job.status','data.job.state','result.status','result.state','video.status','video.state','data.video.status','data.video.state']);
}
function extractProgress(response,config={}){
  return firstPath(response,[config.progressPath,'progress','data.progress','percent','data.percent','task.progress','task.percent','data.task.progress','data.task.percent','job.progress','result.progress']);
}
function outputPaths(modality='video'){
  if(modality==='image')return ['data.0.url','data.0.image_url','data.0.imageUrl','images.0.url','images.0.image_url','images.0.imageUrl','output.0.url','output.url','result.images.0.url','result.image.url','result.url','data.url','url'];
  if(modality==='audio')return ['audio.0.url','output.url','result.url','data.audio_url','audio_url','data.url','url'];
  if(modality==='text'||modality==='script')return ['choices.0.message.content','output_text','output.0.content.0.text','result.text','data.text','text','content'];
  return [
    // Provider task objects. DataEyes/Hailuo and several gateways expose the final
    // file below task.content rather than output/result.
    'task.content.url','task.content.video_url','task.content.videoUrl','task.content.download_url','task.content.content_url','task.content.0.url','task.content.0.video_url',
    'data.task.content.url','data.task.content.video_url','data.task.content.videoUrl','data.task.content.download_url','data.task.content.0.url','data.task.content.0.video_url',
    'content.url','content.video_url','content.videoUrl','content.download_url','content.0.url','content.0.video_url',
    // Conventional output/result shapes.
    'output.url','output.video_url','output.videoUrl','output.video.url','output.0.url','output.0.video_url',
    'data.output.url','data.output.video_url','data.output.videoUrl','data.output.video.url','data.output.0.url','data.output.0.video_url',
    'data.video_url','data.videoUrl','video_url','videoUrl','video.url','data.video.url',
    'result.url','result.video.url','result.video_url','result.videoUrl','result.content.url','result.output.url',
    'data.result.url','data.result.video_url','data.result.videoUrl','data.result.content.url','data.result.output.url',
    'data.result.videos.0.url','result.videos.0.url','videos.0.url','data.videos.0.url',
    'content_url','download_url','file_url','fileUrl','data.content_url','data.download_url','data.file_url','data.fileUrl',
    'file.url','data.file.url','files.0.url','data.files.0.url',
    'task.output.url','task.output.video_url','task.output.videoUrl','task.result.url','task.result.video_url','task.result.videoUrl',
    'data.task.output.url','data.task.output.video_url','data.task.result.url','data.task.result.video_url',
    'task_result.url','task_result.video_url','data.task_result.url','data.task_result.video_url','data.task_result.videos.0.url',
    'data.outputs.0.url','artifacts.0.url','data.artifacts.0.url','url','data.url'
  ];
}
function normalizeImageCandidate(value){
  if(value===undefined||value===null||value==='')return undefined;
  if(typeof value==='object'){
    const nested=firstPath(value,['url','image_url','imageUrl','b64_json','base64','image_base64','image']);
    return nested===value?undefined:normalizeImageCandidate(nested);
  }
  const text=String(value).trim();
  if(!text)return undefined;
  if(/^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(text))return text;
  if(text.startsWith('/'))return text;
  if(text.length>=16)return `data:image/png;base64,${text.replace(/\s+/g,'')}`;
  return undefined;
}
function extractImageOutput(response,config={}){
  if(config.outputPath){
    const explicit=normalizeImageCandidate(getPath(response,config.outputPath));
    if(explicit)return explicit;
  }
  const urlLike=firstPath(response,[
    'data.0.url','data.0.image_url','data.0.imageUrl','images.0.url','images.0.image_url','images.0.imageUrl',
    'output.0.url','output.url','result.images.0.url','result.image.url','result.url','data.url','url',
    'images.0','output.0'
  ]);
  const normalizedUrl=normalizeImageCandidate(urlLike);
  if(normalizedUrl)return normalizedUrl;
  const encoded=firstPath(response,[
    'data.0.b64_json','data.0.base64','data.0.image_base64','images.0.b64_json','images.0.base64','images.0.image_base64',
    'output.0.b64_json','output.0.base64','result.images.0.b64_json','result.images.0.base64','result.image_base64',
    'data.image_base64','image_base64','b64_json','base64'
  ]);
  const normalizedEncoded=normalizeImageCandidate(encoded);
  if(normalizedEncoded)return normalizedEncoded;
  const genericImage=firstPath(response,['data.0.image','images.0.image','output.image','result.image','data.image','image']);
  return normalizeImageCandidate(genericImage);
}
function extractOutput(response,config={},modality='video'){
  if(modality==='image'){
    const image=extractImageOutput(response,config);
    if(image!==undefined&&image!==null&&image!=='')return image;
  }
  if(config.outputPath){
    const explicit=getPath(response,config.outputPath);
    if(explicit!==undefined&&explicit!==null&&explicit!=='')return explicit;
  }
  return firstPath(response,outputPaths(modality));
}
function failureDetail(response){
  return firstPath(response,['error.message','data.error.message','task.error.message','job.error.message','message','error','data.error','task.error','job.error','result.error']);
}
function classifyAsyncPoll(response,config={},modality='video'){
  const rawStatus=extractStatus(response,config);
  const status=String(rawStatus??'').trim().toLowerCase();
  const rawProgress=extractProgress(response,config);
  const progress=Number(rawProgress);
  const output=extractOutput(response,config,modality);
  const success=lowerValues(config.successValues,DEFAULT_SUCCESS);
  const failure=lowerValues(config.failureValues,DEFAULT_FAILURE);
  let state='pending';
  if(status&&failure.has(status))state='failure';
  else if(status&&success.has(status))state='success';
  else if(!status&&config.allowOutputWithoutTerminalStatus===true&&output!==undefined&&output!==null&&output!=='')state='success';
  return {
    state,
    status,
    rawStatus,
    progress:Number.isFinite(progress)?progress:null,
    output,
    providerSucceeded:Boolean(status&&success.has(status)),
    resultPending:Boolean(status&&success.has(status)&&(output===undefined||output===null||output==='')),
    detail:state==='failure'?failureDetail(response):undefined
  };
}
function nextPollDelay(baseDelayMs,attempt,{factor=1.7,maxMs=30000,maxExponent=8,minMs=500}={}){
  const base=Math.max(minMs,Number(baseDelayMs)||1500);
  const n=Math.max(0,Math.min(maxExponent,Number(attempt)||0));
  return Math.min(maxMs,Math.max(minMs,Math.round(base*Math.pow(factor,n))));
}
function formatFailure(assessment,prefix='上游任务失败'){
  const status=assessment?.status||'unknown';
  const detail=assessment?.detail;
  if(detail===undefined||detail===null||detail==='')return `${prefix}：${status}`;
  const text=typeof detail==='object'?JSON.stringify(detail):String(detail);
  return `${prefix}（${status}）：${text.slice(0,500)}`;
}

globalThis.CanvasProviderRuntimeCore=Object.freeze({
  DEFAULT_SUCCESS,DEFAULT_FAILURE,getPath,firstPath,extractTaskId,extractStatus,extractProgress,extractImageOutput,extractOutput,
  classifyAsyncPoll,nextPollDelay,formatFailure
});
})();
