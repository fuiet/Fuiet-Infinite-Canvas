/* Canvas Studio · Video node default size v1
 * Keeps default video cards aligned with image cards: 620 × 280.
 * Loaded before app.js so newly-created and restored graph nodes are normalized
 * before the canvas renders them. Explicit user-resized nodes are preserved.
 */
(()=>{
'use strict';

const VIDEO_WIDTH=620;
const LEGACY_DEFAULT_WIDTHS=new Set([310,320,340]);

function isCanvasVideoNode(node){
  return Boolean(
    node&&typeof node==='object'&&node.type==='video'&&
    node.id!=null&&Number.isFinite(Number(node.x))&&Number.isFinite(Number(node.y))
  );
}

function hasExplicitCustomSize(node){
  const h=Number(node?.h);
  return Number.isFinite(h)&&h>0;
}

function normalizeVideoNode(node){
  if(!isCanvasVideoNode(node)||hasExplicitCustomSize(node))return node;
  const w=Number(node.w);
  if(!Number.isFinite(w)||w<=0||LEGACY_DEFAULT_WIDTHS.has(Math.round(w)))node.w=VIDEO_WIDTH;
  return node;
}

function normalizeGraph(value){
  if(!value||typeof value!=='object')return value;
  if(Array.isArray(value.nodes))value.nodes.forEach(normalizeVideoNode);
  return value;
}

/* Existing local/project state is commonly restored with JSON.parse. */
const nativeParse=JSON.parse;
JSON.parse=function(){
  return normalizeGraph(nativeParse.apply(this,arguments));
};

/* saveState()/project saves stringify the live state object. Normalize in-place
 * before serialization so reset/default paths also converge on 620px. */
const nativeStringify=JSON.stringify;
JSON.stringify=function(value){
  normalizeGraph(value);
  return nativeStringify.apply(this,arguments);
};

/* New canvas nodes are pushed into state.nodes before selectNode() renders them.
 * Normalize only objects that look like actual positioned video nodes. */
const nativePush=Array.prototype.push;
Object.defineProperty(Array.prototype,'push',{
  configurable:true,
  writable:true,
  value:function(){
    for(let i=0;i<arguments.length;i++)normalizeVideoNode(arguments[i]);
    return nativePush.apply(this,arguments);
  }
});

/* Defensive visual fallback for any legacy path that mutates width and renders
 * before the next save. Custom-resized cards carry an explicit height and are
 * deliberately left alone. */
function normalizeRenderedVideoCards(root=document){
  root.querySelectorAll?.('.node[data-node-type="video"]')?.forEach(el=>{
    if(el.classList.contains('resized-node'))return;
    const w=Math.round(parseFloat(el.style.width)||0);
    if(LEGACY_DEFAULT_WIDTHS.has(w))el.style.width=VIDEO_WIDTH+'px';
  });
}

function startDomGuard(){
  const layer=document.querySelector('#nodeLayer');
  if(!layer)return;
  normalizeRenderedVideoCards(layer);
  new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList'){
        record.addedNodes.forEach(node=>{
          if(node?.nodeType!==1)return;
          if(node.matches?.('.node[data-node-type="video"]'))normalizeRenderedVideoCards(node.parentElement||layer);
          else normalizeRenderedVideoCards(node);
        });
      }else if(record.target?.matches?.('.node[data-node-type="video"]')){
        normalizeRenderedVideoCards(record.target.parentElement||layer);
      }
    }
  }).observe(layer,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startDomGuard,{once:true});
else startDomGuard();

})();
