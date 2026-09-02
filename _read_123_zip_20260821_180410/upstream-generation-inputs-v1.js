/* Fuiet Infinite Canvas · upstream generation input contract
 * Connected upstream nodes are generation inputs, not decorative graph metadata.
 * - text/script upstream nodes become the effective prompt
 * - media upstream nodes remain real provider references
 * - a local generator prompt is optional and only supplements upstream text
 * - connected media promotes a default text-to-video task to reference generation
 *
 * app.js already includes every incoming connection in parameters.creativeContext.
 * Older mode-specific validation may filter task.references (notably text2video).
 * Normalize the task at the /api/tasks boundary so browser preview and desktop
 * server receive identical, complete generation semantics.
 */
(()=>{
'use strict';

const TEXT_TYPES=new Set(['text','script','markdown']);
const MEDIA_TYPES=new Set(['image','video','audio']);
const clean=value=>String(value??'').trim();

function refKey(ref={}){
  const id=clean(ref.sourceNodeId||ref.id);
  const type=clean(ref.type||ref.kind).toLowerCase();
  const role=clean(ref.role||ref.semanticRole||ref.usage||'reference').toLowerCase();
  if(id)return `${id}|${type}|${role}`;
  return `${type}|${role}|${clean(ref.url||ref.outputUrl||ref.value)}|${clean(ref.text)}`;
}
function normalizeReference(ref={}){
  return{
    ...ref,
    id:ref.id||ref.sourceNodeId||'',
    sourceNodeId:ref.sourceNodeId||ref.id||'',
    type:clean(ref.type||ref.kind).toLowerCase(),
    kind:clean(ref.kind||ref.type).toLowerCase(),
    role:ref.role||ref.semanticRole||ref.usage||'reference',
    semanticRole:ref.semanticRole||ref.role||ref.usage||'reference',
    url:ref.url||ref.outputUrl||ref.value||'',
    text:ref.text||'',
    title:ref.title||''
  };
}
function linkedReferences(task={}){
  const direct=Array.isArray(task.references)?task.references:[];
  const context=task.parameters?.creativeContext;
  const linked=Array.isArray(context?.linkedReferences)?context.linkedReferences:[];
  const out=[],seen=new Map();
  for(const raw of [...direct,...linked]){
    if(!raw)continue;
    const ref=normalizeReference(raw),key=refKey(ref);
    if(!seen.has(key)){seen.set(key,out.length);out.push(ref);continue}
    const index=seen.get(key),old=out[index];
    out[index]={...old,...ref,url:ref.url||old.url||'',text:ref.text||old.text||'',title:ref.title||old.title||''};
  }
  return out.filter(ref=>clean(ref.url)||clean(ref.text));
}
function upstreamTextParts(refs=[]){
  const out=[],seen=new Set();
  for(const ref of refs){
    const type=clean(ref.type||ref.kind).toLowerCase(),role=clean(ref.role||ref.semanticRole).toLowerCase();
    if(!TEXT_TYPES.has(type)&&role!=='prompt_context'&&role!=='prompt')continue;
    const text=clean(ref.text);if(!text||seen.has(text))continue;seen.add(text);out.push(text);
  }
  return out;
}
function mediaReferences(refs=[]){return refs.filter(ref=>MEDIA_TYPES.has(clean(ref.type||ref.kind).toLowerCase())&&clean(ref.url))}
function fallbackPrompt(nodeType,refs=[]){
  if(!mediaReferences(refs).length)return'';
  if(nodeType==='video')return'严格依据已连接的上游参考素材生成视频，保持主体身份、外观、场景、构图、风格和关键视觉特征一致。';
  if(nodeType==='image')return'严格依据已连接的上游参考素材生成图片，保持主体身份、外观、构图、风格和关键视觉特征一致。';
  return'严格依据已连接的上游参考素材生成。';
}
function effectivePrompt(task={},refs=[]){
  const parts=upstreamTextParts(refs),local=clean(task.prompt),seen=new Set(parts);
  if(local&&!seen.has(local))parts.push(local);
  return parts.join('\n\n')||fallbackPrompt(clean(task.nodeType).toLowerCase(),refs);
}
function referenceVideoParameters(task={},refs=[]){
  const current={...(task.parameters||{})},media=mediaReferences(refs);
  if(!media.length)return current;
  const explicit=clean(current.operation||current.videoOperation).toLowerCase();
  const images=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='image');
  const videos=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='video');
  const audios=media.filter(ref=>clean(ref.type||ref.kind).toLowerCase()==='audio');
  const roles=media.map(ref=>clean(ref.role||ref.semanticRole).toLowerCase());
  const hasFirst=roles.some(role=>/first/.test(role)),hasLast=roles.some(role=>/last/.test(role));
  const singleImage=images.length===1&&!videos.length&&!audios.length;
  let operation=explicit;
  if(!operation){
    if(hasFirst&&hasLast)operation='first-last-frame';
    else if(singleImage)operation='image2video';
    else operation='reference2video';
  }
  const currentMode=clean(current.videoMode||current.generationMode).toLowerCase();
  const keepSpecial=['image2video','frame2video','omni_reference'].includes(currentMode);
  const mode=keepSpecial?currentMode:(hasFirst&&hasLast?'frame2video':singleImage?'image2video':'omni_reference');
  return{...current,operation,videoMode:mode,generationMode:mode};
}
function normalizeTask(task={}){
  const type=clean(task.nodeType).toLowerCase();
  if(!['image','video'].includes(type))return task;
  const refs=linkedReferences(task),prompt=effectivePrompt(task,refs);
  const textCount=upstreamTextParts(refs).length,mediaCount=mediaReferences(refs).length;
  const parameters=type==='video'?referenceVideoParameters(task,refs):{...(task.parameters||{})};
  return{
    ...task,
    prompt,
    references:refs,
    parameters:{
      ...parameters,
      upstreamInputContract:{version:1,connected:refs.length>0,textCount,mediaCount,localPromptOptional:refs.length>0}
    }
  };
}
function isTaskCreate(input,init={}){
  const method=clean(init?.method||(typeof Request!=='undefined'&&input instanceof Request?input.method:'GET')).toUpperCase()||'GET';
  if(method!=='POST')return false;
  try{
    const raw=typeof input==='string'?input:(input?.url||'');
    const url=new URL(raw,typeof location!=='undefined'?location.href:'http://localhost/');
    return /\/api\/tasks\/?$/.test(url.pathname);
  }catch{return false}
}
function patchInit(init={}){
  if(typeof init.body!=='string')return init;
  const contentType=new Headers(init.headers||{}).get('content-type')||'';
  if(contentType&&!/json/i.test(contentType))return init;
  try{
    const task=JSON.parse(init.body);return{...init,body:JSON.stringify(normalizeTask(task))};
  }catch{return init}
}
function installFetchBridge(){
  if(typeof window==='undefined'||typeof window.fetch!=='function'||window.fetch.__canvasUpstreamInputsV1)return;
  const previous=window.fetch.bind(window);
  const wrapped=async function(input,init={}){
    if(!isTaskCreate(input,init))return previous(input,init);
    if(typeof init.body==='string')return previous(input,patchInit(init));
    if(typeof Request!=='undefined'&&input instanceof Request){
      try{
        const copy=input.clone(),text=await copy.text(),task=normalizeTask(JSON.parse(text));
        const headers=new Headers(input.headers);if(!headers.has('content-type'))headers.set('content-type','application/json');
        return previous(new Request(input,{body:JSON.stringify(task),headers}));
      }catch{return previous(input,init)}
    }
    return previous(input,init);
  };
  Object.defineProperty(wrapped,'__canvasUpstreamInputsV1',{value:true});
  Object.defineProperty(wrapped,'__previousFetch',{value:previous});
  window.fetch=wrapped;
}
function syncGeneratorHint(){
  if(typeof document==='undefined')return;
  const panel=document.querySelector('#generatorPanel');if(!panel||panel.classList.contains('hidden'))return;
  if(!panel.classList.contains('image-generator')&&!panel.classList.contains('video-generator'))return;
  const input=panel.querySelector('#promptInput'),strip=panel.querySelector('[data-generator-reference-strip]');if(!input)return;
  if(!strip){delete input.dataset.upstreamPromptOptional;return}
  const hasText=Boolean(strip.querySelector('.generator-reference-text-icon'));
  input.placeholder=hasText?'已连接上游文本：上游文本直接作为提示词；这里可留空，填写内容只作为补充要求。':'已连接上游参考：无需再填写提示词；这里可留空，填写内容只作为补充要求。';
  input.dataset.upstreamPromptOptional='1';
}
function installUiHint(){
  if(typeof MutationObserver==='undefined'||typeof document==='undefined')return;
  const root=document.querySelector('#generatorPanel');if(!root)return;
  new MutationObserver(()=>queueMicrotask(syncGeneratorHint)).observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  syncGeneratorHint();
}

const api=Object.freeze({linkedReferences,upstreamTextParts,mediaReferences,effectivePrompt,referenceVideoParameters,normalizeTask});
globalThis.CanvasUpstreamGenerationInputs=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
installFetchBridge();
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUiHint,{once:true});else installUiHint()}
})();
