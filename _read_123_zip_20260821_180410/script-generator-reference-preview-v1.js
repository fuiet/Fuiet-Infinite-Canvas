/* Fuiet Script · Generator Reference Preview V1
 * Shows script assets/global-style media that are injected at task-submit time
 * but do not have a physical incoming canvas edge. This keeps the preflight UI
 * aligned with the real references sent to image/video providers.
 */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FuietScriptGeneratorReferencePreviewV1=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const MEDIA_TYPES=new Set(['image','video','audio']);
const esc=value=>clean(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const attr=value=>esc(value).replace(/`/g,'&#96;');

function nodeMediaUrl(node={}){
  const content=node?.content&&typeof node.content==='object'?node.content:{};
  return clean(node.outputSourceUrl||node.outputUrl||node.mediaUrl||node.url||node.src||content.url||content.outputUrl);
}
function assetRole(asset={}){
  const type=clean(asset.assetType||asset.type).toLowerCase();
  if(type.includes('char'))return'character_reference';
  if(type.includes('scene'))return'scene_reference';
  return'image_reference';
}
function assetLabel(role){
  if(role==='character_reference')return'角色参考';
  if(role==='scene_reference')return'场景参考';
  if(role==='style_reference')return'风格参考';
  return'道具/画面参考';
}
function mediaType(node={}){const type=clean(node.type).toLowerCase();return MEDIA_TYPES.has(type)?type:'image'}
function virtualReferences(state={},nodeId=''){
  const nodes=list(state.nodes),edges=list(state.edges),target=nodes.find(node=>String(node?.id)===String(nodeId));
  if(!target||!['image','video'].includes(clean(target.type).toLowerCase()))return[];
  const scriptNodeId=clean(target.toolParams?.scriptNodeId),shotId=clean(target.toolParams?.shotId);
  if(!scriptNodeId||!shotId)return[];
  const scriptNode=nodes.find(node=>String(node?.id)===scriptNodeId&&node?.type==='script'),data=scriptNode?.scriptData;
  const shot=list(data?.shots).find(item=>String(item?.id)===shotId);if(!data||!shot)return[];
  const incomingSources=edges.filter(edge=>String(edge?.target)===String(target.id)).map(edge=>nodes.find(node=>String(node?.id)===String(edge.source))).filter(Boolean);
  const incomingUrls=new Set(incomingSources.map(nodeMediaUrl).filter(Boolean));
  const catalog=[
    ...list(data.assets?.characters).map(asset=>({...asset,assetType:'character'})),
    ...list(data.assets?.scenes).map(asset=>({...asset,assetType:'scene'})),
    ...list(data.assets?.props).map(asset=>({...asset,assetType:'prop'}))
  ];
  const byId=new Map(catalog.filter(asset=>asset?.id).map(asset=>[String(asset.id),asset])),ids=new Set();
  for(const id of list(shot.assetRefs))if(byId.has(String(id)))ids.add(String(id));
  const blob=[shot.characters,shot.scene,shot.props,shot.action,shot.dialogue].filter(Boolean).join(' ');
  for(const asset of catalog){const name=clean(asset?.name);if(asset?.id&&name&&blob.includes(name))ids.add(String(asset.id))}
  const refs=[];
  for(const id of ids){
    const asset=byId.get(id),url=clean(asset?.mediaUrl);if(!asset||!url||incomingUrls.has(url))continue;
    const role=assetRole(asset);refs.push({id:`scriptasset:${scriptNodeId}:${asset.id}`,kind:'script_asset',type:'image',role,url,title:asset.name||assetLabel(role),text:asset.prompt||asset.description||'',assetId:asset.id});
  }
  const style=data.globalStyle||{};
  for(const [index,rawUrl] of list(style.referenceMediaUrls).entries()){
    const url=clean(rawUrl);if(!url||incomingUrls.has(url))continue;
    refs.push({id:`scriptstyle:${scriptNodeId}:url:${index}`,kind:'script_style',type:'image',role:'style_reference',url,title:'全局风格参考',text:clean(style.text)});
  }
  const nodeMap=new Map(nodes.filter(node=>node?.id).map(node=>[String(node.id),node]));
  for(const refNodeId of list(style.referenceNodeIds)){
    const source=nodeMap.get(String(refNodeId)),url=nodeMediaUrl(source);if(!source||!url||incomingUrls.has(url))continue;
    refs.push({id:`scriptstyle:${scriptNodeId}:node:${refNodeId}`,kind:'script_style',type:mediaType(source),role:'style_reference',url,title:source.title||'全局风格参考',text:clean(style.text),sourceNodeId:String(refNodeId)});
  }
  const seen=new Set();return refs.filter(ref=>{const key=`${ref.type}|${ref.url}`;if(seen.has(key))return false;seen.add(key);return true});
}
function readState(){
  try{const raw=root.CanvasBrowserStorageManager?.getItem?.('libtv-clone-state');return raw?JSON.parse(raw):null}catch{return null}
}
function activeNodeId(){
  if(typeof document==='undefined')return'';
  return clean(document.querySelector('.node.selected[data-id]')?.dataset?.id||document.querySelector('.node[data-interaction-state="selected"][data-id]')?.dataset?.id);
}
function mediaPreview(ref){
  const url=attr(ref.url),type=clean(ref.type).toLowerCase();
  if(type==='video')return`<video src="${url}" muted playsinline preload="metadata"></video>`;
  if(type==='audio')return`<span class="script-virtual-ref-audio">♪</span>`;
  return`<img src="${url}" alt="" loading="lazy">`;
}
function stripHtml(refs=[]){
  return`<div class="generator-reference-strip script-virtual-reference-strip" data-script-virtual-reference-strip aria-label="脚本隐式参考"><span class="script-virtual-ref-caption">脚本参考 ${refs.length}</span>${refs.map((ref,index)=>{
    const label=assetLabel(ref.role),detail=clean(ref.text)?`<p>${esc(clean(ref.text).slice(0,900))}</p>`:'';
    return`<div class="generator-reference-chip script-virtual-reference-chip" data-script-reference-id="${attr(ref.id)}" data-script-reference-role="${attr(ref.role)}" data-reference-order="${index+1}" tabindex="0" aria-label="${attr(label)} ${index+1}：${attr(ref.title)}"><span class="generator-reference-index">${index+1}</span><div class="generator-reference-thumb">${mediaPreview(ref)}</div><div class="generator-reference-popover" role="tooltip"><div class="generator-reference-preview">${mediaPreview(ref)}</div><div class="generator-reference-detail"><b>${esc(ref.title)}</b><small>${esc(label)} · 执行时自动带入</small>${detail}</div></div></div>`;
  }).join('')}</div>`;
}
function renderPreview(){
  if(typeof document==='undefined')return[];
  const panel=document.querySelector('#generatorPanel');if(!panel||panel.classList.contains('hidden'))return[];
  const main=panel.querySelector('.image-generator-main,.video-generator-main');if(!main)return[];
  const state=readState(),nodeId=activeNodeId(),refs=virtualReferences(state||{},nodeId),old=main.querySelector('[data-script-virtual-reference-strip]');
  if(!refs.length){old?.remove();return[]}
  const html=stripHtml(refs);
  if(old)old.outerHTML=html;
  else{
    const prompt=main.querySelector('.prompt-box');
    if(prompt)prompt.insertAdjacentHTML('beforebegin',html);else main.insertAdjacentHTML('beforeend',html);
  }
  return refs;
}
function install(){
  if(typeof document==='undefined'||typeof MutationObserver==='undefined')return;
  const panel=document.querySelector('#generatorPanel');if(!panel)return;
  let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;renderPreview()})};
  new MutationObserver(schedule).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  const nodeLayer=document.querySelector('#nodeLayer');if(nodeLayer)new MutationObserver(schedule).observe(nodeLayer,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-interaction-state']});
  schedule();
}

const api=Object.freeze({nodeMediaUrl,assetRole,assetLabel,virtualReferences,stripHtml,renderPreview,install});
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()}
return api;
});
