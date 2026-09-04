/* Script Studio · generated asset result sync
 * When a script asset image has finished on the canvas but the Prepare Assets
 * card is still missing its reference, reuse the existing "bind canvas image"
 * handler so the asset mediaUrl is persisted by app.js and immediately rerendered.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const nodeLayer=document.querySelector('#nodeLayer');
if(!featureModal||!nodeLayer)return;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const norm=v=>String(v||'').trim().toLowerCase().replace(/\.[a-z0-9]{2,5}$/,'').replace(/[\s_\-·•:：()（）【】\[\]{}]/g,'');
let timer=0;
let syncing=false;
let queued=false;
let replaying=false;

function assetsView(){return Boolean(featureModal.querySelector('.script-assets-layout'))}
function cards(){return [...featureModal.querySelectorAll('.script-assets-layout [data-open-script-asset]')]}
function cardName(card){return String(card?.querySelector('.asset-card-copy>b')?.textContent||'').trim()}
function cardHasMedia(card){const p=card?.querySelector('.asset-preview');return Boolean(p&&(p.style.backgroundImage&&!/^none$/i.test(p.style.backgroundImage)||!p.querySelector('.asset-missing')))}
function nodeTitle(node){return String(node?.querySelector('.node-title-stack b,.node-title b,.node-title')?.textContent||'').trim()}
function nodeResultUrl(node){
  const img=node?.querySelector('.node-result img[src],.image-result img[src],.result-shell img[src],img[src]');
  if(img?.src)return img.src;
  const list=node?.querySelectorAll?.('[style*="background-image"]')||[];
  const styled=[...list].find(el=>/url\(/.test(el.style.backgroundImage||''));
  const bg=styled?.style?.backgroundImage||'';const m=bg.match(/url\(["']?(.*?)["']?\)/);return m?.[1]||'';
}
function candidateFor(name){
  const target=norm(name);if(!target)return null;
  const matches=[...nodeLayer.querySelectorAll('.node')].map(node=>({node,title:nodeTitle(node),url:nodeResultUrl(node)})).filter(x=>x.url&&norm(x.title)===target);
  return matches.at(-1)||null;
}
function paintImmediate(card,candidate){
  if(!card||!candidate?.url)return;
  const preview=card.querySelector('.asset-preview');if(!preview)return;
  preview.style.backgroundImage=`url("${candidate.url.replace(/"/g,'%22')}")`;
  preview.style.backgroundSize='cover';preview.style.backgroundPosition='center';preview.querySelector('.asset-missing')?.remove();
  card.dataset.generatedResultRecovered='1';
  const active=card.classList.contains('active');if(active){const hero=featureModal.querySelector('.script-asset-hero');if(hero){hero.style.backgroundImage=`url("${candidate.url.replace(/"/g,'%22')}")`;hero.style.backgroundSize='cover';hero.style.backgroundPosition='center';hero.classList.add('has-media')}}
}
function matchingOption(select,name){
  const target=norm(name);if(!select||!target)return null;
  const options=[...select.options].filter(o=>o.value);
  return options.filter(o=>norm(o.textContent)===target).at(-1)||options.filter(o=>norm(o.textContent).startsWith(target)&&/参考|结果|生成/.test(String(o.textContent))).at(-1)||null;
}
async function waitFor(fn,timeout=3500,step=70){const start=Date.now();while(Date.now()-start<timeout){const v=fn();if(v)return v;await sleep(step)}return null}
async function bindCard(card){
  if(!card)return false;
  if(cardHasMedia(card)&&card.dataset.generatedResultRecovered!=='1')return true;
  const name=cardName(card),candidate=candidateFor(name);if(!candidate)return false;
  paintImmediate(card,candidate);
  const id=String(card.dataset.openScriptAsset||'');if(!id)return false;
  const fresh=()=>featureModal.querySelector(`[data-open-script-asset="${CSS.escape(id)}"]`);
  let current=fresh();if(!current)return false;
  if(!current.classList.contains('active'))current.click();
  const drawer=await waitFor(()=>featureModal.querySelector('.script-asset-drawer'));if(!drawer)return false;
  const select=drawer.querySelector('#drawerAssetCanvas');const bind=drawer.querySelector('#drawerAssetBindCanvas');
  const option=matchingOption(select,name);if(!option||!bind)return false;
  select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));bind.click();
  await waitFor(()=>{const c=fresh();return c&&cardHasMedia(c)&&c.dataset.generatedResultRecovered!=='1'?c:null},4500,90);
  return Boolean(fresh()&&cardHasMedia(fresh()));
}
async function reconcile(){
  queued=false;if(syncing||!assetsView())return;
  const activeEl=document.activeElement;if(activeEl&&featureModal.contains(activeEl)&&/^(INPUT|TEXTAREA|SELECT)$/.test(activeEl.tagName))return schedule(500);
  syncing=true;
  try{
    const originalActive=featureModal.querySelector('[data-open-script-asset].active')?.dataset.openScriptAsset||'';
    const missing=cards().filter(card=>!cardHasMedia(card)||card.dataset.generatedResultRecovered==='1');
    for(const card of missing){
      if(!candidateFor(cardName(card)))continue;
      await bindCard(card);
      await sleep(40);
    }
    if(originalActive){const restore=featureModal.querySelector(`[data-open-script-asset="${CSS.escape(originalActive)}"]`);if(restore&&!restore.classList.contains('active'))restore.click()}
  }finally{syncing=false}
}
function schedule(delay=180){
  clearTimeout(timer);timer=setTimeout(()=>{if(queued)return;queued=true;reconcile()},delay);
}

/* A completed result changes the canvas node subtree; a reopened Assets page
   changes the feature modal subtree. Both should heal stale asset cards. */
new MutationObserver(()=>schedule(180)).observe(nodeLayer,{childList:true,subtree:true,attributes:true,attributeFilter:['src','style','class']});
new MutationObserver(()=>{if(assetsView())schedule(120)}).observe(featureModal,{childList:true,subtree:true});

/* Before the user confirms assets or enters Prompt synthesis, give recovered
   canvas results one final chance to persist through the native bind handler. */
document.addEventListener('click',e=>{
  if(replaying||!assetsView())return;
  const target=e.target.closest?.('#confirmScriptAssets,[data-script-tab="prompts"]');if(!target||syncing)return;
  const recoverable=cards().filter(c=>(!cardHasMedia(c)||c.dataset.generatedResultRecovered==='1')&&candidateFor(cardName(c)));
  if(!recoverable.length)return;
  e.preventDefault();e.stopImmediatePropagation();
  (async()=>{await reconcile();replaying=true;try{if(target.isConnected)target.click()}finally{replaying=false}})();
},true);

schedule(120);
})();