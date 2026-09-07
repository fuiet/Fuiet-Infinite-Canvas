/* Fuiet Infinite Canvas · inline @asset highlight inside shot description editor.
 * Keeps the native textarea as the source of truth and mirrors its text beneath
 * it so @mentions can be cyan without converting the editor to rich text.
 */
(()=>{
'use strict';
const ROOT_SELECTOR='.shot-description-editor';
const FIELD_SELECTOR='.shot-description-field';
const TEXTAREA_SELECTOR='textarea[data-shot-description-text],textarea[data-shot-dialogue-text]';
const MARK='data-shot-editor-highlight-ready';

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}
function escapeRegExp(value){return String(value??'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}

function collectAssetTokens(field){
  const tokens=new Set();
  document.querySelectorAll('.shot-mention-token').forEach(el=>{
    const text=String(el.textContent||'').trim();
    if(text.startsWith('@')&&text.length>1)tokens.add(text);
  });
  field?.querySelectorAll?.('.shot-mention-menu [data-mention-id] span').forEach(el=>{
    const name=String(el.textContent||'').trim();
    if(name)tokens.add('@'+name.replace(/^@/,''));
  });
  return [...tokens].sort((a,b)=>b.length-a.length);
}

function highlightedHtml(value,tokens=[]){
  const text=String(value??'');
  const exact=[...new Set((tokens||[]).filter(Boolean))].sort((a,b)=>b.length-a.length);
  if(!exact.length)return escapeHtml(text)||'&nbsp;';
  const matcher=new RegExp(exact.map(escapeRegExp).join('|'),'g');
  let out='',last=0;
  for(const match of text.matchAll(matcher)){
    const index=match.index??0;
    out+=escapeHtml(text.slice(last,index));
    out+=`<span class="shot-description-editor-mention">${escapeHtml(match[0])}</span>`;
    last=index+match[0].length;
  }
  out+=escapeHtml(text.slice(last));
  return out||'&nbsp;';
}

function enhance(root){
  const field=root?.querySelector?.(FIELD_SELECTOR);
  const textarea=field?.querySelector?.(TEXTAREA_SELECTOR);
  if(!field||!textarea||textarea.hasAttribute(MARK))return;
  textarea.setAttribute(MARK,'1');

  const layer=document.createElement('div');
  layer.className='shot-description-highlight-layer';
  layer.setAttribute('aria-hidden','true');
  field.insertBefore(layer,textarea);

  const syncGeometry=()=>{
    layer.style.height=`${textarea.clientHeight}px`;
    layer.style.width=`${textarea.clientWidth}px`;
  };
  const render=()=>{
    layer.innerHTML=highlightedHtml(textarea.value,collectAssetTokens(field));
    layer.scrollTop=textarea.scrollTop;
    layer.scrollLeft=textarea.scrollLeft;
    syncGeometry();
  };

  textarea.addEventListener('input',render);
  textarea.addEventListener('change',render);
  textarea.addEventListener('keyup',render);
  textarea.addEventListener('scroll',()=>{
    layer.scrollTop=textarea.scrollTop;
    layer.scrollLeft=textarea.scrollLeft;
  });
  field.addEventListener('click',()=>queueMicrotask(render));
  const menu=field.querySelector('.shot-mention-menu');
  if(menu)new MutationObserver(render).observe(menu,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

  if(typeof ResizeObserver==='function'){
    const observer=new ResizeObserver(syncGeometry);
    observer.observe(textarea);
  }
  render();
}

function scan(root=document){
  if(root?.matches?.(ROOT_SELECTOR))enhance(root);
  root?.querySelectorAll?.(ROOT_SELECTOR).forEach(enhance);
}

scan();
const observer=new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(node.nodeType===1)scan(node);
    }
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});

globalThis.FuietShotDescriptionEditorHighlight=Object.freeze({highlightedHtml,collectAssetTokens,scan});
})();
