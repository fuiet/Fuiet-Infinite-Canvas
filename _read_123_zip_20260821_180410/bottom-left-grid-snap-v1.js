/* Canvas Studio · Persistent Grid Snap Tool */
(()=>{
'use strict';
const bar=document.querySelector('.bottom-left');
const edgeBtn=document.querySelector('#edgeVisibilityBtn');
const zoomBtn=document.querySelector('#zoomBtn');
const contextMenu=document.querySelector('#contextMenu');
if(!bar||!zoomBtn||!contextMenu)return;

const btn=document.createElement('button');
btn.id='gridSnapBtn';
btn.type='button';
btn.className='pill-btn grid-snap-btn';
zoomBtn.insertAdjacentElement('beforebegin',btn);

const style=document.createElement('style');
style.id='gridSnapToolV1Styles';
style.textContent=`
#gridSnapBtn{position:relative;width:30px!important;height:30px!important;display:grid!important;place-items:center!important;padding:0!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#d7d7d7!important;font-size:0!important}
#gridSnapBtn:hover,#gridSnapBtn.active,#gridSnapBtn:focus-visible{background:#343534!important;color:#fff!important;outline:none!important}
#gridSnapBtn svg{width:18px!important;height:18px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#gridSnapBtn::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,4px);padding:5px 8px;border:1px solid #303030;border-radius:6px;background:#090909;color:#eee;font-size:12px;line-height:16px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease;box-shadow:0 6px 18px #0008;z-index:500}
#gridSnapBtn:hover::after,#gridSnapBtn:focus-visible::after{opacity:1;transform:translate(-50%,0)}
`;
document.querySelector('#gridSnapToolV1Styles')?.remove();
document.head.appendChild(style);

const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.4 5.2a4 4 0 0 1 7.2 0l1.1 2.2a4 4 0 0 1-.8 4.7l-5 5a3 3 0 0 1-4.2-4.2l4.4-4.4"/><path d="M13 7.5l3.5 3.5"/></svg>';
btn.innerHTML=icon;

function readSnap(){
  try{
    const s=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem('libtv-clone-state')||'{}')||{};
    return s.canvasSettings?.snap!==false;
  }catch{return true}
}
function sync(){
  const on=readSnap();
  btn.classList.toggle('active',on);
  btn.setAttribute('aria-pressed',String(on));
  btn.setAttribute('aria-label',on?'关闭网格吸附':'开启网格吸附');
  btn.setAttribute('title',on?'关闭网格吸附':'开启网格吸附');
  btn.dataset.tip=on?'网格吸附':'开启网格吸附';
}
function invokeSnapToggle(){
  const before=readSnap();
  if(typeof window.__canvasOpenLegacyZoomMenu==='function')window.__canvasOpenLegacyZoomMenu();
  else zoomBtn.click();
  const item=contextMenu.querySelector('[data-view="snap"]');
  if(!item){contextMenu.classList.add('hidden');return false}
  item.click();
  requestAnimationFrame(()=>{
    const after=readSnap();
    if(after===before)setTimeout(sync,30);else sync();
  });
  return true;
}
btn.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  invokeSnapToggle();
  btn.blur();
});

window.addEventListener('storage',e=>{if(e.key==='libtv-clone-state')sync()});
sync();
if(!document.querySelector('script[data-canvas-zoom-tool]')){
  const s=document.createElement('script');
  s.src='./bottom-left-zoom-v1.js';
  s.dataset.canvasZoomTool='1';
  document.head.appendChild(s);
}
})();
