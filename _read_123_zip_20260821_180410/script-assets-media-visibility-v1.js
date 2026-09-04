/* Script Studio · Prepare Assets media visibility bridge
 * app.js already persists generated asset URLs in asset.mediaUrl. The reference
 * stylesheet uses an !important `background` shorthand for empty-state styling,
 * which also forces background-image:none and hides those persisted inline URLs.
 * Promote existing inline background-image values to !important after each
 * Assets render so generated/uploaded/canvas-bound media is actually visible.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
if(!featureModal)return;

let observer=null;
let queued=false;

function assetsView(){return Boolean(featureModal.querySelector('.script-assets-layout'))}
function promoteBackground(el){
  if(!el)return false;
  const image=String(el.style.getPropertyValue('background-image')||'').trim();
  if(!image||image==='none'||!/^url\(/i.test(image))return false;
  if(el.style.getPropertyPriority('background-image')!=='important'){
    el.style.setProperty('background-image',image,'important');
  }
  el.style.setProperty('background-size','cover','important');
  el.style.setProperty('background-position','center','important');
  el.style.setProperty('background-repeat','no-repeat','important');
  return true;
}
function patch(){
  queued=false;
  if(!assetsView())return;
  observer?.disconnect();
  try{
    featureModal.querySelectorAll('.script-assets-layout .script-asset-card .asset-preview').forEach(preview=>{
      if(promoteBackground(preview))preview.querySelector('.asset-missing')?.remove();
    });
    const hero=featureModal.querySelector('.script-assets-layout .script-asset-hero');
    if(promoteBackground(hero)){
      hero.classList.add('has-media');
      hero.querySelector(':scope > span')?.remove();
    }
  }finally{
    observer?.observe(featureModal,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  }
}
function schedule(){if(queued)return;queued=true;queueMicrotask(patch)}

observer=new MutationObserver(schedule);
observer.observe(featureModal,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-script-tab="assets"],[data-open-script-asset]'))setTimeout(schedule,0);
},true);
window.addEventListener('focus',schedule);
schedule();
})();