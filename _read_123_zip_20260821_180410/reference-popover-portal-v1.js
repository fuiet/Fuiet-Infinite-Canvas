/* Fuiet Infinite Canvas · upstream reference preview portal
 * Renders generator reference hover previews at document.body level so canvas/node
 * overflow and transforms cannot clip the preview.
 */
(()=>{
'use strict';

const CHIP_SELECTOR='.generator-reference-chip';
const POPOVER_SELECTOR='.generator-reference-popover';
const PORTAL_CLASS='generator-reference-popover-portal';
const GAP=10;
const VIEWPORT_MARGIN=12;

let activeChip=null;
let portal=null;
let frame=0;
let lastPlacement='';

function removePortal(){
  if(frame){cancelAnimationFrame(frame);frame=0;}
  if(portal){portal.remove();portal=null;}
  activeChip=null;
  lastPlacement='';
}

function clamp(value,min,max){
  return Math.min(Math.max(value,min),Math.max(min,max));
}

function positionPortal(){
  if(!portal||!activeChip||!activeChip.isConnected){
    removePortal();
    return;
  }

  const anchor=activeChip.getBoundingClientRect();
  if(anchor.width===0&&anchor.height===0){
    removePortal();
    return;
  }

  const viewportWidth=document.documentElement.clientWidth||window.innerWidth;
  const viewportHeight=document.documentElement.clientHeight||window.innerHeight;
  const maxWidth=Math.max(180,viewportWidth-(VIEWPORT_MARGIN*2));
  const maxHeight=Math.max(120,viewportHeight-(VIEWPORT_MARGIN*2));

  portal.style.maxWidth=`${Math.min(340,maxWidth)}px`;
  portal.style.maxHeight=`${Math.min(420,maxHeight)}px`;
  portal.style.left='0px';
  portal.style.top='0px';

  const box=portal.getBoundingClientRect();
  const width=Math.min(box.width,maxWidth);
  const height=Math.min(box.height,maxHeight);

  // Match the reference screenshot: align the popup with the hovered chip and
  // prefer the space above it; automatically flip below when needed.
  let left=anchor.left;
  let top=anchor.top-height-GAP;
  let placement='top';

  if(top<VIEWPORT_MARGIN){
    top=anchor.bottom+GAP;
    placement='bottom';
  }

  left=clamp(left,VIEWPORT_MARGIN,viewportWidth-width-VIEWPORT_MARGIN);
  top=clamp(top,VIEWPORT_MARGIN,viewportHeight-height-VIEWPORT_MARGIN);

  const signature=`${Math.round(left)}:${Math.round(top)}:${placement}`;
  if(signature!==lastPlacement){
    portal.style.left=`${Math.round(left)}px`;
    portal.style.top=`${Math.round(top)}px`;
    portal.dataset.placement=placement;
    lastPlacement=signature;
  }

  // Canvas pan/zoom is transform-driven and does not necessarily emit scroll.
  // Track the anchor while the preview is visible so it stays attached.
  frame=requestAnimationFrame(positionPortal);
}

function showPortal(chip){
  if(!(chip instanceof Element))return;
  const source=chip.querySelector(`:scope > ${POPOVER_SELECTOR}`);
  if(!source)return;

  if(activeChip===chip&&portal)return;
  removePortal();

  activeChip=chip;
  portal=source.cloneNode(true);
  portal.classList.add(PORTAL_CLASS);
  portal.removeAttribute('id');
  portal.setAttribute('role','tooltip');
  portal.setAttribute('aria-hidden','false');
  portal.style.position='fixed';
  portal.style.zIndex='2147483000';
  portal.style.pointerEvents='none';
  document.body.appendChild(portal);

  // Force layout once before the RAF loop so the first frame appears in place.
  positionPortal();
}

function chipFromEvent(event){
  const target=event.target;
  return target instanceof Element?target.closest(CHIP_SELECTOR):null;
}

document.addEventListener('pointerover',event=>{
  const chip=chipFromEvent(event);
  if(chip)showPortal(chip);
},true);

document.addEventListener('pointerout',event=>{
  const chip=chipFromEvent(event);
  if(!chip||chip!==activeChip)return;
  const next=event.relatedTarget;
  if(next instanceof Node&&chip.contains(next))return;
  if(!chip.matches(':focus-within'))removePortal();
},true);

document.addEventListener('focusin',event=>{
  const chip=chipFromEvent(event);
  if(chip)showPortal(chip);
},true);

document.addEventListener('focusout',event=>{
  const chip=chipFromEvent(event);
  if(!chip||chip!==activeChip)return;
  const next=event.relatedTarget;
  if(next instanceof Node&&chip.contains(next))return;
  if(!chip.matches(':hover'))removePortal();
},true);

window.addEventListener('blur',removePortal);
document.addEventListener('visibilitychange',()=>{if(document.hidden)removePortal();});
})();
