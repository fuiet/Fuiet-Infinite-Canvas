/* Canvas Studio · Unified node send icon v1
 * UI-only: replaces the visual glyph inside node generator submit buttons.
 * Does not replace buttons, handlers, generation state, or the global `next` icon.
 */
(()=>{
'use strict';

const generator=document.querySelector('#generatorPanel');
if(!generator)return;

const SEND_SVG=`<svg class="ui-icon node-send-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/></svg>`;
const SELECTOR='#generateBtn,#scriptGenerateBtn,.generate-btn,.image-generate-btn,.video-generate-btn,.audio-generate-btn';

function applySendIcon(root=generator){
  root.querySelectorAll(SELECTOR).forEach(btn=>{
    if(btn.dataset.sendIcon==='up-v1')return;
    btn.innerHTML=SEND_SVG;
    btn.dataset.sendIcon='up-v1';
    if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label','发送生成');
    if(!btn.getAttribute('title'))btn.setAttribute('title','发送生成');
  });
}

applySendIcon();
new MutationObserver(()=>applySendIcon()).observe(generator,{childList:true,subtree:true});

})();
