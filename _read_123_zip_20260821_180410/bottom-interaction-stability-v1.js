/* Canvas Studio · Bottom interaction stability v6
 * Stabilizes bottom dock activation only.
 * Connection dragging is intentionally owned 100% by app.js.
 */
(()=>{
'use strict';

const dock=document.querySelector('#bottomDock');
const viewport=document.querySelector('#canvasViewport');
if(!dock||!viewport)return;

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
    /* bottom-dock-v3 opens the upgraded history surface, then performs one
     * internal untrusted click so app.js renders the base drawer. */
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
  try{
    btn.onclick.call(btn,quietEvent());
    return true;
  }catch(err){
    console.error('[bottom-dock] action failed',action,err);
    return false;
  }
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
  const action=btn?.dataset?.dockAction;
  if(!action)return;
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
  const btn=dockButtonFromEvent(e);
  if(!btn)return;
  press={pointerId:e.pointerId,action:btn.dataset.dockAction,btn,x:e.clientX,y:e.clientY};
  e.stopPropagation();
  e.stopImmediatePropagation();
},true);

document.addEventListener('pointerup',e=>{
  if(!e.isTrusted||!press||e.pointerId!==press.pointerId)return;
  const p=press;
  press=null;
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
  const btn=dockButtonFromEvent(e);
  if(!btn)return;
  const action=btn.dataset.dockAction;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  if(suppressClick.action===action&&performance.now()<suppressClick.until)return;
  runUserActivation(btn,e);
},true);

window.addEventListener('blur',()=>{press=null},{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)press=null});

/* IMPORTANT:
 * Do not add pointerdown / pointermove / pointerup / pointercancel handlers for
 * .node-port here. app.js owns the entire connection state machine:
 * - target release -> completeConnection(target.id)
 * - blank release  -> cleanupConnectionDrag(false) + showQuickAdd(..., fromNodeId)
 * Any second owner can cancel the gesture before those branches execute.
 */

})();
