/* Fuiet Infinite Canvas · single-purpose edge interaction
 * Existing edges keep their data semantics. Their visible interaction is reduced
 * to one action: hover for a source->target blue light pulse, click to disconnect.
 */
(()=>{
'use strict';

const edgeLayer=document.getElementById('edgeLayer');
const contextMenu=document.getElementById('contextMenu');
if(!edgeLayer||!contextMenu)return;

const SVG_NS='http://www.w3.org/2000/svg';
const legacyHits=new Map();
let activeKey='';

const scissor=document.createElement('div');
scissor.id='edgeCutScissor';
scissor.className='edge-cut-scissor';
scissor.setAttribute('aria-hidden','true');
scissor.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.2" cy="6.7" r="3"/><circle cx="6.2" cy="17.3" r="3"/><path d="M8.7 8.2 20 15.3"/><path d="M8.7 15.8 20 8.7"/></svg>';
document.body.appendChild(scissor);

const flow=document.createElementNS(SVG_NS,'path');
flow.id='edgeCutFlow';
flow.setAttribute('class','edge-cut-flow');
flow.setAttribute('aria-hidden','true');
edgeLayer.appendChild(flow);

function visualPath(key){
  return [...edgeLayer.querySelectorAll('path.edge[data-edge-key]')].find(path=>String(path.dataset.edgeKey)===String(key))||null;
}

function ensureFlow(){
  if(!flow.isConnected)edgeLayer.appendChild(flow);
  return flow;
}

function moveScissor(event){
  scissor.style.left=`${event.clientX}px`;
  scissor.style.top=`${event.clientY}px`;
}

function activate(key,event){
  if(!key)return;
  if(activeKey&&activeKey!==String(key))deactivate();
  activeKey=String(key);
  const path=visualPath(activeKey);
  if(path){
    path.classList.add('edge-cut-hover');
    const pulse=ensureFlow();
    pulse.setAttribute('d',path.getAttribute('d')||'');
    pulse.classList.add('visible');
  }
  moveScissor(event);
  scissor.classList.add('visible');
}

function deactivate(){
  if(activeKey)visualPath(activeKey)?.classList.remove('edge-cut-hover');
  activeKey='';
  flow.classList.remove('visible');
  scissor.classList.remove('visible');
}

function finishLegacyDisconnect(key){
  const button=contextMenu.querySelector('[data-edge-delete]');
  if(button)button.click();
  else console.warn('[edge-cut] disconnect bridge unavailable for edge',key);
  document.documentElement.classList.remove('edge-cut-delete-pending');
  legacyHits.delete(String(key));
  deactivate();
}

function cutEdge(key,event){
  if(event.button!==0)return;
  event.preventDefault();
  event.stopPropagation();
  const legacy=legacyHits.get(String(key));
  if(!legacy){
    console.warn('[edge-cut] legacy edge delete handler unavailable',key);
    return;
  }

  /* The core app owns edge transactions and persistence. Invoke its detached
   * original hit target privately, keep the old inspector hidden, then trigger
   * only its Disconnect action. No legacy edge UI remains reachable by users. */
  document.documentElement.classList.add('edge-cut-delete-pending');
  legacy.dispatchEvent(new MouseEvent('click',{
    bubbles:false,
    cancelable:true,
    clientX:event.clientX,
    clientY:event.clientY,
    button:0
  }));
  queueMicrotask(()=>finishLegacyDisconnect(key));
}

function wireOwnedHit(hit,key){
  hit.dataset.edgeCutOwned='1';
  hit.setAttribute('aria-label','单击剪断连接线');
  hit.addEventListener('pointerdown',event=>{
    event.stopPropagation();
  });
  hit.addEventListener('pointerenter',event=>activate(key,event));
  hit.addEventListener('pointermove',event=>{
    if(activeKey!==String(key))activate(key,event);
    else{
      const path=visualPath(key);
      if(path)ensureFlow().setAttribute('d',path.getAttribute('d')||'');
      moveScissor(event);
    }
  });
  hit.addEventListener('pointerleave',()=>{
    if(activeKey===String(key))deactivate();
  });
  hit.addEventListener('click',event=>cutEdge(key,event));
  hit.addEventListener('contextmenu',event=>{
    event.preventDefault();
    event.stopPropagation();
  });
}

function sanitizeHit(hit){
  if(!(hit instanceof SVGPathElement)||!hit.matches('path.edge-hit[data-edge-key]'))return;
  if(hit.dataset.edgeCutOwned==='1')return;
  const key=String(hit.dataset.edgeKey||hit.dataset.edgeId||'');
  if(!key)return;

  /* cloneNode intentionally drops the legacy click/contextmenu listeners while
   * preserving the path geometry and data attributes renderEdges updates. */
  const clean=hit.cloneNode(true);
  legacyHits.set(key,hit);
  wireOwnedHit(clean,key);
  hit.replaceWith(clean);
}

function sanitizeAll(){
  edgeLayer.querySelectorAll('path.edge-hit[data-edge-key]').forEach(sanitizeHit);
}

const observer=new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.matches?.('path.edge-hit[data-edge-key]'))sanitizeHit(node);
      node.querySelectorAll?.('path.edge-hit[data-edge-key]').forEach(sanitizeHit);
    }
  }
  if(activeKey){
    const path=visualPath(activeKey);
    if(!path)deactivate();
    else ensureFlow().setAttribute('d',path.getAttribute('d')||'');
  }
});
observer.observe(edgeLayer,{childList:true,subtree:true});

window.addEventListener('blur',deactivate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)deactivate()});

sanitizeAll();
})();
