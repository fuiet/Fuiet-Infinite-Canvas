/* Fuiet Infinite Canvas · image ratio picker visual parity */
(()=>{
'use strict';

const RATIOS=['1:1','1:2','2:1','9:16','16:9','3:4','4:3','3:2','2:3','5:4','4:5','21:9','9:21'];
const generator=document.querySelector('#generatorPanel');
if(!generator)return;

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function shapeSize(value){
  const match=String(value||'1:1').match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  const rw=Number(match?.[1]||1),rh=Number(match?.[2]||1);
  const scale=Math.min(20/rw,16/rh);
  return{width:Math.max(5,Math.round(rw*scale)),height:Math.max(5,Math.round(rh*scale))};
}
function ensureRatioOptions(){
  const select=generator.querySelector('#ratioSelect');
  if(!select)return;
  const current=String(select.value||'1:1');
  const existing=new Map([...select.options].map(option=>[String(option.value),option]));
  RATIOS.forEach(ratio=>{
    if(existing.has(ratio))return;
    const option=document.createElement('option');
    option.value=ratio;
    option.textContent=ratio;
    select.appendChild(option);
  });
  if(RATIOS.includes(current))select.value=current;
}
function decorateRatioGrid(root=document){
  root.querySelectorAll?.('.image-ratio-grid button[data-ratio-value]').forEach(button=>{
    const ratio=String(button.dataset.ratioValue||'1:1');
    if(button.dataset.ratioVisualReady==='1')return;
    const {width,height}=shapeSize(ratio);
    button.innerHTML=`<span class="image-ratio-shape" style="--ratio-w:${width}px;--ratio-h:${height}px" aria-hidden="true"></span><span class="image-ratio-label">${esc(ratio)}</span>`;
    button.dataset.ratioVisualReady='1';
    button.setAttribute('aria-label',`图片比例 ${ratio}`);
  });
}
function installStyles(){
  if(document.querySelector('#imageRatioPickerV1Styles'))return;
  const style=document.createElement('style');
  style.id='imageRatioPickerV1Styles';
  style.textContent=`
    .image-settings-popover{width:342px!important}
    .image-ratio-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:7px!important}
    .image-ratio-grid button{
      min-height:64px!important;
      padding:7px 3px 6px!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:6px!important;
      line-height:1!important;
    }
    .image-ratio-grid button::before{display:none!important;content:none!important}
    .image-ratio-shape{
      display:block;
      width:var(--ratio-w);
      height:var(--ratio-h);
      box-sizing:border-box;
      flex:none;
      border:1px solid currentColor;
      border-radius:2px;
      opacity:.88;
    }
    .image-ratio-label{display:block;min-height:12px;font:500 11px/12px var(--ui-font-sans);white-space:nowrap}
    .image-ratio-grid button.active .image-ratio-shape{opacity:1}
    @media(max-width:420px){
      .image-ratio-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    }
  `;
  document.head.appendChild(style);
}

installStyles();
ensureRatioOptions();
decorateRatioGrid();
new MutationObserver(records=>{
  ensureRatioOptions();
  for(const record of records){
    for(const node of record.addedNodes){
      if(node?.nodeType===1){
        if(node.matches?.('.image-generator-popover,.image-ratio-grid'))decorateRatioGrid(node.parentElement||node);
        else if(node.querySelector?.('.image-ratio-grid'))decorateRatioGrid(node);
      }
    }
  }
}).observe(document.body,{childList:true,subtree:true});
new MutationObserver(()=>ensureRatioOptions()).observe(generator,{childList:true,subtree:true});

})();
