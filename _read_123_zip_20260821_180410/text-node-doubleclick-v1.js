/* Canvas Studio · Text node double-click editing v2
 * Preserve the first click for normal node selection, but keep the second
 * click of a double-click away from node dragging so the existing app.js
 * dblclick editor can run reliably. Node identity uses data-id because the
 * first selection click can re-render and replace the node DOM element.
 */
(()=>{
'use strict';

const nodeLayer=document.querySelector('#nodeLayer');
if(!nodeLayer)return;

let last={id:'',at:0,x:0,y:0};
const DOUBLE_MS=430;
const MAX_MOVE=10;

function clearLast(){last={id:'',at:0,x:0,y:0}}
function textReadSurface(target){
  if(!(target instanceof Element))return null;
  const surface=target.closest('[data-text-manual-view],[data-text-result],.text-node-preview');
  if(!surface||surface.closest('[data-text-manual]'))return null;
  const node=surface.closest('.node');
  const id=String(node?.dataset?.id||'');
  if(!node||!id||!nodeLayer.contains(node))return null;
  return {surface,node,id};
}

nodeLayer.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isTrusted)return;
  const hit=textReadSurface(e.target);
  if(!hit){clearLast();return;}

  const now=performance.now();
  const same=last.id===hit.id;
  const near=Math.hypot(e.clientX-last.x,e.clientY-last.y)<=MAX_MOVE;
  const second=same&&near&&now-last.at>0&&now-last.at<=DOUBLE_MS;

  if(!second){
    last={id:hit.id,at:now,x:e.clientX,y:e.clientY};
    return; // first click remains owned by app.js for normal selection
  }

  clearLast();
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const target=e.target;
  const init={
    bubbles:true,
    cancelable:true,
    view:window,
    detail:2,
    clientX:e.clientX,
    clientY:e.clientY,
    screenX:e.screenX,
    screenY:e.screenY,
    button:0,
    buttons:0,
    ctrlKey:e.ctrlKey,
    shiftKey:e.shiftKey,
    altKey:e.altKey,
    metaKey:e.metaKey
  };
  queueMicrotask(()=>{
    if(!target?.isConnected)return;
    target.dispatchEvent(new MouseEvent('dblclick',init));
  });
},true);

nodeLayer.addEventListener('pointercancel',clearLast,true);
window.addEventListener('blur',clearLast,{capture:true});

})();
