/* Canvas Studio · Bottom interaction stability v2
 * Gives the persistent bottom dock one deterministic owner per action and
 * hardens connection pointer cleanup.
 */
(()=>{
'use strict';

const dock=document.querySelector('#bottomDock');
const viewport=document.querySelector('#canvasViewport');
if(!dock||!viewport)return;

/*
 * Why this exists:
 * - app.js installs direct button.onclick handlers.
 * - bottom-dock-v3 installs a delegated dock click handler.
 * - bottom-dock-v4 only redraws icons/styles.
 * When both app.js and v3 handle the same trusted click, panels can open and
 * immediately be replaced/closed. Clone every dock button once to remove old
 * button-local listeners, then explicitly choose exactly one owner.
 */
const APP_ONLY_ACTIONS=new Set(['add','mode','layout','workflow','asset','help']);
const V3_ONLY_ACTIONS=new Set(['shortcuts']);
const HISTORY_ACTION='history';

function replaceDockButton(action){
  const old=dock.querySelector(`[data-dock-action="${action}"]`);
  if(!old)return null;
  const appHandler=typeof old.onclick==='function'?old.onclick:null;
  const next=old.cloneNode(true);
  old.replaceWith(next);

  if(APP_ONLY_ACTIONS.has(action)){
    next.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if(appHandler)appHandler.call(next,e);
    };
    return next;
  }

  if(action===HISTORY_ACTION){
    /*
     * Trusted user click belongs to bottom-dock-v3 so it can open the upgraded
     * history modal. v3 then performs one synthetic btn.click() while
     * bypassHistoryClick=true; that synthetic click must reach app.js exactly
     * once so the underlying history drawer is rendered before decoration.
     */
    next.onclick=e=>{
      if(e.isTrusted)return;
      if(appHandler)appHandler.call(next,e);
    };
    return next;
  }

  if(V3_ONLY_ACTIONS.has(action)){
    /* No button-local handler: the trusted click bubbles to v3 exactly once. */
    next.onclick=null;
    return next;
  }

  return next;
}

['add','mode','layout','workflow','asset','history','shortcuts','help'].forEach(replaceDockButton);

/*
 * Keep all dock pointer gestures out of canvas selection / pan handling.
 * This also prevents a pointerdown on an icon from changing canvas state before
 * the corresponding click handler runs.
 */
dock.addEventListener('pointerdown',e=>{
  if(e.target.closest('[data-dock-action]'))e.stopPropagation();
},true);
dock.addEventListener('pointerup',e=>{
  if(e.target.closest('[data-dock-action]'))e.stopPropagation();
},true);

/*
 * Connection hardening.
 * app.js tracks connection drag at window level but historically did not capture
 * the pointer on the source port. A lost pointerup therefore leaves
 * .connecting-mode active indefinitely. Capture the pointer after app.js starts
 * the gesture, throttle event storms to one move per animation frame, and cancel
 * stale connection state as soon as the primary button is no longer down.
 */
let connectionMoveFrameOpen=true;
let sourcePort=null;
let sourcePointerId=null;
let cancelQueued=false;

function connectionActive(){
  return viewport.classList.contains('connecting-mode');
}
function dispatchConnectionCancel(pointerId=sourcePointerId){
  if(!connectionActive()||cancelQueued)return;
  cancelQueued=true;
  queueMicrotask(()=>{
    cancelQueued=false;
    if(!connectionActive())return;
    try{
      window.dispatchEvent(new PointerEvent('pointercancel',{
        pointerId:Number.isFinite(pointerId)?pointerId:0,
        pointerType:'mouse',
        bubbles:false,
        cancelable:false
      }));
    }catch{
      window.dispatchEvent(new Event('pointercancel'));
    }
  });
}

/* Capture phase sees every current/future node port without rebinding after render. */
document.addEventListener('pointerdown',e=>{
  const port=e.target.closest?.('.node-port.out');
  if(!port||e.button!==0)return;
  sourcePort=port;
  sourcePointerId=e.pointerId;
  queueMicrotask(()=>{
    if(!connectionActive()||sourcePort!==port)return;
    try{port.setPointerCapture(e.pointerId)}catch{}
  });
},true);

window.addEventListener('pointermove',e=>{
  if(!connectionActive())return;

  /* Missed pointerup: terminate immediately instead of leaving the canvas stuck. */
  if(typeof e.buttons==='number'&&(e.buttons&1)===0){
    dispatchConnectionCancel(e.pointerId);
    return;
  }

  /* Avoid layout-heavy connection hit-testing hundreds of times in one frame. */
  if(!connectionMoveFrameOpen){
    e.stopImmediatePropagation();
    return;
  }
  connectionMoveFrameOpen=false;
  requestAnimationFrame(()=>{connectionMoveFrameOpen=true});
},true);

window.addEventListener('pointerup',()=>{
  sourcePort=null;
  sourcePointerId=null;
},true);
window.addEventListener('pointercancel',()=>{
  sourcePort=null;
  sourcePointerId=null;
  connectionMoveFrameOpen=true;
},true);
window.addEventListener('blur',()=>{
  if(connectionActive())dispatchConnectionCancel();
},{capture:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&connectionActive())dispatchConnectionCancel();
});
document.addEventListener('lostpointercapture',()=>{
  if(connectionActive())dispatchConnectionCancel();
},true);

})();
