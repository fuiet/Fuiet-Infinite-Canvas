/* Fuiet Infinite Canvas · standalone image result display normalizer
 *
 * Goal: two standalone image results with the same intrinsic pixel size / aspect
 * ratio must render at the same canvas display scale. Historical nodes may carry
 * different persisted `w` values (for example 320 / 340 / 350), while result CSS
 * uses width:100%, causing equal 1024x1024 images to look different on the canvas.
 *
 * Storyboard frame nodes intentionally use compact custom widths and are excluded.
 */
(()=>{
'use strict';
if(globalThis.FuietImageNodeDisplayNormalizer?.installed)return;

const VERSION='20260904-image-display-normalizer-1';
const DISPLAY_WIDTH=350;
const STATE_KEY='libtv-clone-state';
const manager=globalThis.CanvasBrowserStorageManager;
const baseFetch=globalThis.fetch?.bind(globalThis);

function clone(v){try{return structuredClone(v)}catch{try{return JSON.parse(JSON.stringify(v))}catch{return v}}}
function storyboardNodeIds(data){
  const ids=new Set();
  for(const g of Array.isArray(data?.groups)?data.groups:[]){
    if(g?.kind!=='storyboard')continue;
    for(const id of Array.isArray(g.nodeIds)?g.nodeIds:[])ids.add(String(id));
  }
  return ids;
}
function isStoryboardImage(n,storyboardIds){
  if(!n||n.type!=='image')return false;
  if(storyboardIds?.has(String(n.id)))return true;
  const t=n.toolParams||{};
  return Boolean(t.storyboardFrame||t.storyboardGroupId||t.sourceFrameId||String(t.operation||'').startsWith('storyboard_'));
}
function normalizeData(input){
  if(!input||typeof input!=='object')return{data:input,changed:false};
  const data=clone(input),ids=storyboardNodeIds(data);let changed=false;
  for(const n of Array.isArray(data.nodes)?data.nodes:[]){
    if(!n||n.type!=='image'||!n.outputUrl||isStoryboardImage(n,ids))continue;
    if(Number(n.w)!==DISPLAY_WIDTH||n.h!=null||Number(n.mediaDisplayScaleVersion||0)<3){
      n.w=DISPLAY_WIDTH;
      n.h=null;
      n.mediaDisplayScaleVersion=3;
      changed=true;
    }
  }
  return{data,changed};
}
function readLocalState(){
  try{return JSON.parse(manager?.getItem?.(STATE_KEY)||'null')}catch{return null}
}
function normalizeLocalState(){
  if(!manager?.getItem||!manager?.setItem)return false;
  try{
    const current=readLocalState();if(!current)return false;
    const {data,changed}=normalizeData(current);
    if(changed)manager.setItem(STATE_KEY,JSON.stringify(data));
    return changed;
  }catch{return false}
}
function visibleState(){return readLocalState()||null}
function normalizeVisibleResults(){
  const data=visibleState(),ids=storyboardNodeIds(data),byId=new Map((Array.isArray(data?.nodes)?data.nodes:[]).map(n=>[String(n.id),n]));
  document.querySelectorAll('.node.node-image[data-content-state="result"]').forEach(el=>{
    const id=String(el.dataset.id||''),n=byId.get(id);
    if(n&&isStoryboardImage(n,ids))return;
    // If local state is temporarily behind the DOM, only normalize nodes that are
    // clearly regular standalone image results; storyboard nodes are left alone.
    if(!n&&el.closest('.storyboard-studio-dialog'))return;
    if(el.style.width!==`${DISPLAY_WIDTH}px`)el.style.width=`${DISPLAY_WIDTH}px`;
    if(el.style.height)el.style.removeProperty('height');
  });
}
function patchSoon(){requestAnimationFrame(()=>requestAnimationFrame(normalizeVisibleResults))}

normalizeLocalState();

if(typeof baseFetch==='function'){
  globalThis.fetch=async function(input,init={}){
    let nextInit=init;
    let url='';
    try{url=new URL(typeof input==='string'?input:input?.url,location.href).pathname}catch{}
    const method=String(init.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase();

    // Keep persisted project payloads canonical too, so subsequent app renders,
    // minimap bounds and edge fallbacks all converge on the same 350px width.
    if((method==='POST'||method==='PUT')&&(/^\/api\/projects(?:\/[^/]+)?\/?$/.test(url))&&typeof init.body==='string'){
      try{
        const body=JSON.parse(init.body),normalized=normalizeData(body?.data);
        if(body?.data&&normalized.changed){body.data=normalized.data;nextInit={...init,body:JSON.stringify(body)}}
      }catch{}
    }

    const res=await baseFetch(input,nextInit);
    if(method==='GET'&&/^\/api\/projects\/[^/]+\/?$/.test(url)){
      try{
        const body=await res.clone().json(),normalized=normalizeData(body?.project?.data);
        if(body?.project?.data&&normalized.changed){
          body.project.data=normalized.data;
          const headers=new Headers(res.headers);headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
          return new Response(JSON.stringify(body),{status:res.status,statusText:res.statusText,headers});
        }
      }catch{}
    }
    return res;
  };
}

const observer=new MutationObserver(()=>patchSoon());
function startObserver(){
  const root=document.querySelector('#nodeLayer');
  if(root)observer.observe(root,{childList:true,subtree:true});
  patchSoon();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
window.addEventListener('resize',patchSoon,{passive:true});

globalThis.FuietImageNodeDisplayNormalizer=Object.freeze({installed:true,version:VERSION,displayWidth:DISPLAY_WIDTH,normalizeData,normalizeLocalState,normalizeVisibleResults});
})();
