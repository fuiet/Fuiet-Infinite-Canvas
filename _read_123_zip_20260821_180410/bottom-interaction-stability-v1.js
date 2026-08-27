/* Canvas Studio · Bottom interaction stability v3
 * Gives the persistent bottom dock one deterministic activation path and
 * hardens connection pointer cleanup.
 */
(()=>{
'use strict';

const dock=document.querySelector('#bottomDock');
const viewport=document.querySelector('#canvasViewport');
if(!dock||!viewport)return;

/*
 * app.js installs button.onclick handlers while bottom-dock-v3 installs a
 * capture-phase delegated click handler. Clone every button once to remove any
 * late button-local listeners, preserve the app handler, then route every real
 * user activation through one document-level dispatcher.
 */
const APP_ACTIONS=new Set(['add','mode','layout','workflow','asset','help']);
const V3_ACTIONS=new Set(['history','shortcuts']);

function replaceDockButton(action){
  const old=dock.querySelector(`[data-dock-action="${action}"]`);
  if(!old)return null;
  const appHandler=typeof old.onclick==='function'?old.onclick:null;
  const next=old.cloneNode(true);
  old.replaceWith(next);

  if(APP_ACTIONS.has(action)){
    next.onclick=e=>{
      e?.preventDefault?.();
      e?.stopPropagation?.();
      e?.stopImmediatePropagation?.();
      if(appHandler)appHandler.call(next,e);
    };
  }else if(action==='history'){
    /*
     * bottom-dock-v3 opens the upgraded history UI, then performs one internal
     * untrusted click with bypassHistoryClick=true so app.js renders the base
     * history drawer. Only that internal click is allowed to call app.js.
     */
    next.onclick=e=>{
      if(e?.isTrusted)return;
      if(appHandler)appHandler.call(next,e);
    };
  }else{
    next.onclick=null;
  }
  return next;
}

['add','mode','layout','workflow','asset','history','shortcuts','help'].forEach(replaceDockButton);

function quietEvent(){
  return {
    preventDefault(){},
    stopPropagation(){},
    stopImmediatePropagation(){},
    isTrusted:false,
    target:null,
    currentTarget:null
  };
}

function invokeAppAction(action){
  const btn=dock.querySelector(`[data-dock-action="${action}"]`);
  if(!btn||typeof btn.onclick!=='function')return false;
  try{btn.onclick.call(btn,quietEvent());return true}catch(err){console.error('[bottom-dock] action failed',action,err);return false}
}

function invokeV3Action(action){
  const btn=dock.querySelector(`[data-dock-action="${action}"]`);
  if(!btn)return false;
  /* Untrusted programmatic clicks bypass this central user dispatcher and are
   * intentionally consumed by bottom-dock-v3's existing capture handler. */
  queueMicrotask(()=>btn.click());
  return true;
}

function activate(action){
  if(APP_ACTIONS.has(action))return invokeAppAction(action);
  if(V3_ACTIONS.has(action))return invokeV3Action(action);
  return false;
}

/*
 * Pointer-up is the primary mouse/touch activation. It is more deterministic
 * than relying on a later synthetic click, which can be dropped when overlays,
 * focus changes or DOM replacement happen between pointerdown and click.
 * The subsequent trusted click is swallowed so every physical press executes
 * exactly once. Keyboard-generated trusted clicks still work as a fallback.
 */
let press=null;
let suppressClick={action:'',until:0};
let lastActivation={action:'',at:0};

function dockButtonFromEvent(e){
  const btn=e.target?.closest?.('#bottomDock [data-dock-action]');
  return btn&&dock.contains(btn)?btn:null;
}
function runUserActivation(btn,e){
  const action=btn?.dataset?.dockAction;if(!action)return;
  const now=performance.now();
  if(lastActivation.action===action&&now-lastActivation.at<70)return;
  lastActivation={action,at:now};
  e?.preventDefault?.();
  e?.stopPropagation?.();
  e?.stopImmediatePropagation?.();
  activate(action);
}

document.addEventListener('pointerdown',e=>{
  if(!e.isTrusted||e.button!==0)return;
  const btn=dockButtonFromEvent(e);if(!btn)return;
  press={pointerId:e.pointerId,action:btn.dataset.dockAction,btn,x:e.clientX,y:e.clientY};
  e.stopPropagation();
  e.stopImmediatePropagation();
},true);

document.addEventListener('pointerup',e=>{
  if(!e.isTrusted||!press||e.pointerId!==press.pointerId)return;
  const p=press;press=null;
  const btn=dockButtonFromEvent(e);
  const moved=Math.hypot(e.clientX-p.x,e.clientY-p.y);
  if(!btn||btn!==p.btn||moved>12)return;
  suppressClick={action:p.action,until:performance.now()+420};
  runUserActivation(btn,e);
},true);

document.addEventListener('pointercancel',e=>{
  if(press&&(press.pointerId==null||press.pointerId===e.pointerId))press=null;
},true);

/* Central click fallback for keyboard activation and browsers that do not expose
 * pointer events in the expected sequence. Synthetic internal clicks are left
 * alone so bottom-dock-v3 can run its controlled history/shortcut flow. */
document.addEventListener('click',e=>{
  if(!e.isTrusted)return;
  const btn=dockButtonFromEvent(e);if(!btn)return;
  const action=btn.dataset.dockAction;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  if(suppressClick.action===action&&performance.now()<suppressClick.until)return;
  runUserActivation(btn,e);
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
  press=null;
  if(connectionActive())dispatchConnectionCancel();
},{capture:true});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){press=null;if(connectionActive())dispatchConnectionCancel()}
});
document.addEventListener('lostpointercapture',()=>{
  if(connectionActive())dispatchConnectionCancel();
},true);

})();
