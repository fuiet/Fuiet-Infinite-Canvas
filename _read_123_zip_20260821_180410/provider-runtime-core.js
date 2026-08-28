/* Shared provider runtime core.
 * Pure protocol/state helpers used by both the Node and Cloudflare runtimes.
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
    'data.id','data.task_id','data.taskId','data.request_id','data.job_id',
    'task.id','job.id','result.id','video.id','data.video.id','data.task.id','result.task_id','result.taskId'
  ]);
  return common!==undefined&&common!==null&&common!==''?String(common):findStringByPrefix(response,'video_task_');
}
function extractStatus(response,config={}){
  return firstPath(response,[config.statusPath,'status','data.status','state','data.state','task.status','data.task.status','job.status','result.status','video.status','data.video.status']);
}
function extractProgress(response,config={}){
  return firstPath(response,[config.progressPath,'progress','data.progress','percent','data.percent','task.progress','job.progress','result.progress']);
}
function outputPaths(modality='video'){
  if(modality==='image')return ['data.0.url','images.0.url','output.url','result.url','data.url','url'];
  if(modality==='audio')return ['audio.0.url','output.url','result.url','data.audio_url','audio_url','data.url','url'];
  if(modality==='text'||modality==='script')return ['choices.0.message.content','output_text','output.0.content.0.text','result.text','data.text','text','content'];
  return [
    'output.url','output.video_url','output.videoUrl','data.output.url','data.output.video_url','data.output.videoUrl',
    'data.video_url','data.videoUrl','video_url','videoUrl','video.url','data.video.url','result.url','result.video.url','result.video_url','result.videoUrl','content_url','download_url','data.content_url','data.download_url',
    'data.result.url','data.result.video_url','url','data.url','output.0.url','data.output.0.url','videos.0.url'
  ];
}
function extractOutput(response,config={},modality='video'){
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
  DEFAULT_SUCCESS,DEFAULT_FAILURE,getPath,firstPath,extractTaskId,extractStatus,extractProgress,extractOutput,
  classifyAsyncPoll,nextPollDelay,formatFailure
});
})();
