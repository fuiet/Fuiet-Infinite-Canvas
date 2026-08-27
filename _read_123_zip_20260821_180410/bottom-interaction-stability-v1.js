/* Canvas Studio · Bottom interaction stability v4
 * Gives the persistent bottom dock one deterministic activation path and
 * hardens connection pointer cleanup, including single-node blank drops.
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
  queueMicrotask(()=>btn.click());
  return true;
}

function activate(action){
  if(APP_ACTIONS.has(action))return invokeAppAction(action);
  if(V3_ACTIONS.has(action))return invokeV3Action(action);
  return false;
}

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

/* Connection hardening. */
let connectionMoveFrameOpen=true;
let sourcePort=null;
let sourcePointerId=null;
let singleNodeConnection=false;
let cancelQueued=false;

function connectionActive(){
  return viewport.classList.contains('connecting-mode');
}
function forceConnectionDomCleanup(){
  viewport.classList.remove('connecting-mode');
  document.querySelector('#tempEdge')?.remove();
  document.querySelectorAll('.node-port.connecting').forEach(el=>el.classList.remove('connecting'));
  document.querySelectorAll('.connection-target,.connection-invalid').forEach(el=>el.classList.remove('connection-target','connection-invalid'));
  document.querySelectorAll('.connection-target-port,.connection-invalid-port').forEach(el=>el.classList.remove('connection-target-port','connection-invalid-port'));
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

/*
 * With one node there is no existing connection target. The normal app path on
 * pointerup cleans the connection state and opens the compatible-node menu.
 * Do not capture the pointer in that case: keeping capture on the only node while
 * the menu is being mounted can leave browsers in a stale connection gesture.
 */
document.addEventListener('pointerdown',e=>{
  const port=e.target.closest?.('.node-port.out');
  if(!port||e.button!==0)return;
  sourcePort=port;
  sourcePointerId=e.pointerId;
  singleNodeConnection=document.querySelectorAll('#nodeLayer .node').length<=1;
  queueMicrotask(()=>{
    if(!connectionActive()||sourcePort!==port||singleNodeConnection)return;
    try{port.setPointerCapture(e.pointerId)}catch{}
  });
},true);

window.addEventListener('pointermove',e=>{
  if(!connectionActive())return;
  if(typeof e.buttons==='number'&&(e.buttons&1)===0){
    dispatchConnectionCancel(e.pointerId);
    return;
  }
  if(!connectionMoveFrameOpen){
    e.stopImmediatePropagation();
    return;
  }
  connectionMoveFrameOpen=false;
  requestAnimationFrame(()=>{connectionMoveFrameOpen=true});
},true);

window.addEventListener('pointerup',e=>{
  const pointerId=e.pointerId;
  const wasSingle=singleNodeConnection&&(sourcePointerId==null||sourcePointerId===pointerId);

  if(wasSingle&&sourcePort){
    try{if(sourcePort.hasPointerCapture?.(pointerId))sourcePort.releasePointerCapture(pointerId)}catch{}
  }

  /* Let app.js process the same pointerup first. Then verify that its blank-drop
   * branch actually left connecting-mode. If not, cancel through app.js's own
   * pointercancel handler so closure state is cleared as well as DOM state. */
  queueMicrotask(()=>{
    if(wasSingle&&connectionActive())dispatchConnectionCancel(pointerId);
    sourcePort=null;
    sourcePointerId=null;
    singleNodeConnection=false;
  });

  if(wasSingle){
    setTimeout(()=>{
      if(connectionActive())dispatchConnectionCancel(pointerId);
      setTimeout(()=>{if(connectionActive())forceConnectionDomCleanup()},0);
    },80);
  }
},true);

window.addEventListener('pointercancel',()=>{
  sourcePort=null;
  sourcePointerId=null;
  singleNodeConnection=false;
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
  if(connectionActive()&&!singleNodeConnection)dispatchConnectionCancel();
},true);

})();
