/* Fuiet Infinite Canvas · Unified generation send icon v2
 * Keeps real next/previous navigation icons intact. Only generation-submit
 * buttons that still render the legacy `next` glyph are normalized.
 */
(()=>{
'use strict';

const SEND_SVG=`<svg class="ui-icon node-send-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/></svg>`;
const CORE_SELECTOR=[
  '#generateBtn',
  '#scriptGenerateBtn',
  '.generate-btn',
  '.image-generate-btn',
  '.video-generate-btn',
  '.audio-generate-btn',
  '[data-generate-submit]'
].join(',');

function compactPath(value){return String(value||'').replace(/\s+/g,'').toLowerCase()}
function hasLegacyNextGlyph(btn){
  const paths=[...btn.querySelectorAll('svg path')].map(p=>compactPath(p.getAttribute('d')));
  return paths.includes('m146v12')&&paths.includes('m56l106-106');
}
function generationSemantic(btn){
  const hint=[btn.id,btn.className,btn.getAttribute('title'),btn.getAttribute('aria-label'),btn.dataset?.action,btn.dataset?.act]
    .filter(Boolean).join(' ').toLowerCase();
  return /generate|生成|发送/.test(hint);
}
function shouldNormalize(btn){
  if(!(btn instanceof HTMLButtonElement))return false;
  if(btn.matches(CORE_SELECTOR))return true;
  return generationSemantic(btn)&&hasLegacyNextGlyph(btn);
}
function normalizeButton(btn){
  if(!shouldNormalize(btn))return;
  if(btn.dataset.sendIcon==='up-v2'&&btn.querySelector('.node-send-arrow'))return;
  btn.innerHTML=SEND_SVG;
  btn.dataset.sendIcon='up-v2';
  if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label','发送生成');
  if(!btn.getAttribute('title'))btn.setAttribute('title','发送生成');
}
function applySendIcon(root=document){
  if(root instanceof HTMLButtonElement)normalizeButton(root);
  root.querySelectorAll?.('button').forEach(normalizeButton);
}

applySendIcon(document);
const observer=new MutationObserver(records=>{
  for(const record of records){
    if(record.target instanceof HTMLElement)applySendIcon(record.target);
    record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)applySendIcon(node)});
  }
});
if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['id','class','title','aria-label']});

})();
