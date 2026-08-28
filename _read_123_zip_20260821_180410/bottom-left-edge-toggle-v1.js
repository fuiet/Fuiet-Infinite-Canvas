/* Canvas Studio · Persistent Edge Visibility Tool */
(()=>{
'use strict';
const bar=document.querySelector('.bottom-left');
const minimapBtn=document.querySelector('#minimapBtn');
const edgeLayer=document.querySelector('#edgeLayer');
if(!bar||!minimapBtn||!edgeLayer)return;

const KEY='canvas-studio-edge-visibility-v1';
const btn=document.createElement('button');
btn.id='edgeVisibilityBtn';
btn.type='button';
btn.className='pill-btn edge-visibility-btn';
minimapBtn.insertAdjacentElement('afterend',btn);

const style=document.createElement('style');
style.id='edgeVisibilityToolV1Styles';
style.textContent=`
.bottom-left,.bottom-left.asset-ready{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;padding:0!important;backdrop-filter:none!important;outline:none!important}
.bottom-left::before,.bottom-left::after{display:none!important;content:none!important}
#edgeVisibilityBtn{position:relative;width:30px!important;height:30px!important;display:grid!important;place-items:center!important;padding:0!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#d7d7d7!important;font-size:0!important}
#edgeVisibilityBtn:hover,#edgeVisibilityBtn.active,#edgeVisibilityBtn:focus-visible{background:#343534!important;color:#fff!important;outline:none!important}
#edgeVisibilityBtn svg{width:18px!important;height:18px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#edgeVisibilityBtn::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,4px);padding:5px 8px;border:1px solid #303030;border-radius:6px;background:#090909;color:#eee;font-size:12px;line-height:16px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s ease,transform .12s ease;box-shadow:0 6px 18px #0008;z-index:500}
#edgeVisibilityBtn:hover::after,#edgeVisibilityBtn:focus-visible::after{opacity:1;transform:translate(-50%,0)}
#edgeLayer.edge-links-hidden{display:none!important}
`;
document.querySelector('#edgeVisibilityToolV1Styles')?.remove();
document.head.appendChild(style);

const visibleIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5c2.2 0 3.2 1.6 4.8 3.5 1.5 1.8 2.7 3.5 4.9 3.5 1.9 0 3.1-1.1 4.3-3"/><circle cx="5" cy="8.5" r="1.4"/><circle cx="19" cy="12.5" r="1.4"/></svg>';
const hiddenIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5c2.2 0 3.2 1.6 4.8 3.5 1.5 1.8 2.7 3.5 4.9 3.5 1.9 0 3.1-1.1 4.3-3"/><circle cx="5" cy="8.5" r="1.4"/><circle cx="19" cy="12.5" r="1.4"/><path d="M4 4l16 16"/></svg>';

function readHidden(){try{return globalThis.CanvasBrowserStorageManager.getItem(KEY)==='hidden'}catch{return false}}
function saveHidden(hidden){try{globalThis.CanvasBrowserStorageManager.setItem(KEY,hidden?'hidden':'visible')}catch{}}
function apply(hidden,save=true){
  edgeLayer.classList.toggle('edge-links-hidden',hidden);
  btn.classList.toggle('active',hidden);
  btn.setAttribute('aria-pressed',String(hidden));
  btn.setAttribute('aria-label',hidden?'显示节点连线':'隐藏节点连线');
  btn.setAttribute('title',hidden?'显示节点连线':'隐藏节点连线');
  btn.dataset.tip=hidden?'显示节点连线':'隐藏节点连线';
  btn.innerHTML=hidden?hiddenIcon:visibleIcon;
  if(save)saveHidden(hidden);
}

btn.addEventListener('click',e=>{
  e.preventDefault();
  e.stopPropagation();
  apply(!edgeLayer.classList.contains('edge-links-hidden'));
  btn.blur();
});

apply(readHidden(),false);

/* Load the final event-ownership layer after app.js + dock v3/v4 are ready. */
if(!document.querySelector('script[data-bottom-interaction-stability]')){
  const s=document.createElement('script');
  s.src='./bottom-interaction-stability-v1.js?v=6';
  s.dataset.bottomInteractionStability='6';
  document.head.appendChild(s);
}
if(!document.querySelector('script[data-grid-snap-tool]')){
  const s=document.createElement('script');
  s.src='./bottom-left-grid-snap-v1.js';
  s.dataset.gridSnapTool='1';
  document.head.appendChild(s);
}
})();
