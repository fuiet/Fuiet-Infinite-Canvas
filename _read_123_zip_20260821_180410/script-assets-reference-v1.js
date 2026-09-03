/* Script Studio · Prepare Assets reference interaction layer
 * Keeps app.js as the source of truth. This adapter reshapes the rendered
 * assets stage and composes existing asset handlers into the requested flow:
 * card -> right drawer -> generate/upload/canvas, plus one-click bulk generation.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
if(!featureModal)return;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>Date.now();
let patchQueued=false;
let observer=null;
const bulk={running:false,done:0,total:0,failed:0};

function assetsLayout(){return featureModal.querySelector('.script-assets-layout')}
function assetsView(){return Boolean(assetsLayout())}
function allAssetCards(){return [...featureModal.querySelectorAll('.script-assets-layout [data-open-script-asset]')]}
function cardHasMedia(card){const preview=card?.querySelector('.asset-preview');return Boolean(preview&&(preview.style.backgroundImage||preview.querySelector('.asset-global-lock')&&!preview.querySelector('.asset-missing')))}
function missingCards(){return allAssetCards().filter(card=>!cardHasMedia(card))}
function assetId(card){return String(card?.dataset.openScriptAsset||'')}
function normalizeText(v){return String(v||'').trim().toLowerCase().replace(/\.[a-z0-9]{2,5}$/,'').replace(/[\s_\-·•:：()（）【】\[\]{}]/g,'')}
function sectionInfo(section){const label=String(section?.querySelector('.asset-block-head>b')?.textContent||'资产').trim();return{label,key:label==='角色'?'characters':label==='场景'?'scenes':'props'}}
function cardName(card){return String(card?.querySelector('.asset-card-copy>b')?.textContent||'').trim()}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function observeFeatureModal(){
  if(!observer)return;
  observer.observe(featureModal,{childList:true,subtree:true});
}

function showInlineToast(text,timeout=2200){
  featureModal.querySelector('.script-asset-inline-toast')?.remove();
  const el=document.createElement('div');el.className='script-asset-inline-toast';el.textContent=text;featureModal.appendChild(el);
  setTimeout(()=>el.remove(),timeout);
}

function ensureImageModel(){
  const provider=featureModal.querySelector('#assetGenProvider');
  const model=featureModal.querySelector('#assetGenModel');
  if(provider&&!provider.value){const option=[...provider.options].find(o=>o.value);if(option){provider.value=option.value;provider.dispatchEvent(new Event('change',{bubbles:true}));return false}}
  if(model&&!model.value){const option=[...model.options].find(o=>o.value);if(option){model.value=option.value;model.dispatchEvent(new Event('change',{bubbles:true}))}}
  return Boolean(featureModal.querySelector('#assetGenProvider')?.value&&featureModal.querySelector('#assetGenModel')?.value)
}

function enhanceGlobalStyle(layout){
  const label=layout.querySelector('.script-global-style>span');
  setText(label,'全局风格');
  const input=layout.querySelector('#scriptAssetGlobalStyle');
  if(input&&!input.placeholder)input.placeholder='输入统一的视觉风格…';
}

function enhanceSections(layout){
  layout.querySelectorAll('.asset-block').forEach(section=>{
    const {label}=sectionInfo(section),grid=section.querySelector('.script-asset-grid.cards'),nativeAdd=section.querySelector('[data-add-script-asset]');
    if(!grid||!nativeAdd)return;
    section.querySelectorAll('.script-asset-card').forEach(card=>{
      const missing=card.querySelector('.asset-missing');
      setText(missing,`生成或上传${label}图`);
      const aria=`编辑${label}：${cardName(card)||'未命名'}`;
      if(card.getAttribute('aria-label')!==aria)card.setAttribute('aria-label',aria);
    });
    if(!grid.querySelector('.script-asset-add-card')){
      const add=document.createElement('button');add.type='button';add.className='script-asset-add-card';add.dataset.assetAddCard=label;add.innerHTML='<i>＋</i><span>新增</span>';
      add.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();nativeAdd.click()});
      grid.appendChild(add);
    }
  });
}

function relabelDrawerField(label,newText){
  if(!label)return;
  const textNode=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.nodeValue.trim());
  if(textNode){if(textNode.nodeValue!==newText)textNode.nodeValue=newText}
  else label.insertBefore(document.createTextNode(newText),label.firstChild);
}

function drawerKind(drawer){
  const title=String(drawer.querySelector('header b')?.textContent||'编辑资产').trim();
  if(title.includes('角色'))return'角色';if(title.includes('场景'))return'场景';if(title.includes('道具'))return'道具';return'资产';
}

function enhanceDrawer(layout){
  const drawer=layout.querySelector('.script-asset-drawer');if(!drawer)return;
  const kind=drawerKind(drawer),hero=drawer.querySelector('.script-asset-hero');
  const labels=[...drawer.querySelectorAll('.script-asset-drawer-scroll>label')];
  relabelDrawerField(labels[0],`${kind}名称`);
  relabelDrawerField(labels[1],`${kind}描述`);
  relabelDrawerField(labels[2],'生成提示词');
  if(labels[2])labels[2].querySelector('textarea')?.setAttribute('placeholder',`脚本已自动准备${kind}生成提示词，可在此修改`);

  if(hero&&!hero.dataset.referenceEnhanced){
    hero.dataset.referenceEnhanced='1';
    hero.innerHTML=`<button type="button" class="script-asset-hero-trigger" aria-label="生成或上传${kind}图"><i>＋</i><span>生成或上传${kind}图</span></button><button type="button" class="script-asset-hero-more" aria-label="${kind}图片操作">•••</button><div class="script-asset-hero-menu hidden"><button type="button" data-asset-hero-action="generate">AI 生成${kind}图</button><button type="button" data-asset-hero-action="upload">上传已有图片</button><button type="button" data-asset-hero-action="canvas">从画布选择</button></div>`;
  }

  const canvasPick=drawer.querySelector('.script-canvas-pick');
  if(canvasPick&&!drawer.querySelector('.script-asset-canvas-picker')){
    const picker=document.createElement('div');picker.className='script-asset-canvas-picker hidden';
    while(canvasPick.firstChild)picker.appendChild(canvasPick.firstChild);
    hero?.insertAdjacentElement('afterend',picker);
  }
}

function updateStatus(layout){
  const bottom=layout.querySelector('.script-bottom-actions'),warning=bottom?.querySelector('.script-asset-warning');if(!bottom||!warning)return;
  const sections=[...layout.querySelectorAll('.asset-block')];
  const counts={角色:0,场景:0,道具:0};
  sections.forEach(section=>{const {label}=sectionInfo(section);counts[label]=[...section.querySelectorAll('.script-asset-card')].filter(card=>!cardHasMedia(card)).length});
  const total=counts.角色+counts.场景+counts.道具;
  warning.classList.toggle('assets-complete',total===0);
  let text='';
  if(bulk.running)text=`正在批量生成资产，已完成 ${bulk.done}/${bulk.total}${bulk.failed?`，失败 ${bulk.failed}`:''}`;
  else if(total)text=`检测到有 ${counts.角色} 个角色和 ${counts.场景} 个场景和 ${counts.道具} 个道具没有设定图，您可以手动上传或 AI 批量生成`;
  else text='资产已生成，如再次生成将会覆盖之前的角色 / 场景 / 道具资产';
  setText(warning,text);
}

function enhanceBottom(layout){
  const toolbar=layout.querySelector('.script-asset-toolbar.v2'),bottom=layout.querySelector('.script-bottom-actions'),bulkButton=layout.querySelector('#generateAllAssets');
  if(!bottom||!bulkButton)return;
  if(bulkButton.parentElement!==bottom)bottom.appendChild(bulkButton);
  setText(bulkButton,bulk.running?`正在生成 ${bulk.done}/${bulk.total}`:'一键生成所有资产');
  const busy=bulk.running?'true':'false';
  if(bulkButton.getAttribute('aria-busy')!==busy)bulkButton.setAttribute('aria-busy',busy);
  bulkButton.disabled=bulk.running;
  if(toolbar&&toolbar.dataset.referenceLayout!=='1')toolbar.dataset.referenceLayout='1';
  updateStatus(layout);
}

function patch(){
  patchQueued=false;
  const layout=assetsLayout();if(!layout)return;
  // Critical: the adapter mutates the same subtree it observes. Disconnect while
  // applying presentation changes, otherwise textContent/appendChild create a
  // self-triggering MutationObserver microtask loop that freezes the Assets tab.
  observer?.disconnect();
  try{
    enhanceGlobalStyle(layout);
    enhanceSections(layout);
    enhanceDrawer(layout);
    enhanceBottom(layout);
    ensureImageModel();
  }finally{
    observeFeatureModal();
  }
}
function queuePatch(){if(patchQueued)return;patchQueued=true;queueMicrotask(patch)}

async function waitFor(fn,timeout=180000,interval=250){const start=now();while(now()-start<timeout){const value=fn();if(value)return value;await sleep(interval)}return null}
async function openDrawerFor(id){
  let card=featureModal.querySelector(`[data-open-script-asset="${CSS.escape(id)}"]`);if(!card)return null;
  if(!card.classList.contains('active'))card.click();
  return waitFor(()=>{const active=featureModal.querySelector(`[data-open-script-asset="${CSS.escape(id)}"].active`),drawer=featureModal.querySelector('.script-asset-drawer');return active&&drawer?drawer:null},4000,80)
}
function toastText(){return String(document.querySelector('#toast')?.textContent||'')}
async function generateAsset(id,index,total){
  const drawer=await openDrawerFor(id);if(!drawer)return{ok:false,reason:'drawer'};
  ensureImageModel();await sleep(40);const generate=featureModal.querySelector('#drawerAssetGenerate');
  if(!generate||generate.disabled)return{ok:false,reason:'disabled'};
  const beforeCard=featureModal.querySelector(`[data-open-script-asset="${CSS.escape(id)}"]`),beforeUrl=beforeCard?.querySelector('.asset-preview')?.style.backgroundImage||'',beforeToast=toastText();
  generate.click();
  const result=await waitFor(()=>{
    const card=featureModal.querySelector(`[data-open-script-asset="${CSS.escape(id)}"]`),url=card?.querySelector('.asset-preview')?.style.backgroundImage||'',toast=toastText();
    if(url&&url!==beforeUrl)return'ok';
    if(toast!==beforeToast&&/资产参考图生成完成/.test(toast))return'ok';
    if(toast!==beforeToast&&/资产图生成失败|生成失败/.test(toast))return'failed';
    return null;
  },180000,300);
  return{ok:result==='ok',reason:result||'timeout'};
}

async function runBulkGeneration(){
  if(bulk.running||!assetsView())return;
  ensureImageModel();await sleep(100);ensureImageModel();
  const provider=featureModal.querySelector('#assetGenProvider')?.value,model=featureModal.querySelector('#assetGenModel')?.value;
  if(!provider||!model){showInlineToast('请先在模型设置中配置可用的图片生成模型',3200);return}
  const cards=allAssetCards(),missing=cards.filter(card=>!cardHasMedia(card)),targets=(missing.length?missing:cards).map(assetId).filter(Boolean);
  if(!targets.length){showInlineToast('当前没有可生成的资产');return}
  bulk.running=true;bulk.done=0;bulk.failed=0;bulk.total=targets.length;queuePatch();
  for(let i=0;i<targets.length;i++){
    const id=targets[i];queuePatch();await sleep(60);
    const result=await generateAsset(id,i,targets.length);if(!result.ok)bulk.failed++;
    bulk.done=i+1;queuePatch();await sleep(80);
  }
  bulk.running=false;queuePatch();
  showInlineToast(bulk.failed?`批量生成结束：成功 ${bulk.total-bulk.failed}，失败 ${bulk.failed}`:`${bulk.total} 个资产已生成完成`,3200);
}

function assetMenuAction(action){
  const drawer=featureModal.querySelector('.script-asset-drawer');if(!drawer)return;
  const menu=drawer.querySelector('.script-asset-hero-menu'),picker=drawer.querySelector('.script-asset-canvas-picker');menu?.classList.add('hidden');
  if(action==='generate')drawer.querySelector('#drawerAssetGenerate')?.click();
  if(action==='upload')drawer.querySelector('#drawerAssetUpload')?.click();
  if(action==='canvas'){picker?.classList.toggle('hidden');if(picker&&!picker.classList.contains('hidden'))picker.querySelector('select')?.focus()}
}

/* Capture bulk click before app.js's legacy "create generators" onclick. */
document.addEventListener('click',e=>{
  if(!assetsView())return;
  const bulkButton=e.target.closest?.('#generateAllAssets');
  if(bulkButton){e.preventDefault();e.stopImmediatePropagation();runBulkGeneration();return}

  const add=e.target.closest?.('.script-asset-add-card');if(add)return;
  const heroTrigger=e.target.closest?.('.script-asset-hero-trigger,.script-asset-hero-more');
  if(heroTrigger){e.preventDefault();e.stopPropagation();const menu=featureModal.querySelector('.script-asset-hero-menu');menu?.classList.toggle('hidden');return}
  const menuAction=e.target.closest?.('[data-asset-hero-action]');
  if(menuAction){e.preventDefault();e.stopPropagation();assetMenuAction(menuAction.dataset.assetHeroAction);return}

  const step3=e.target.closest?.('[data-script-tab="prompts"]');
  if(step3){
    const missing=missingCards();
    if(missing.length){e.preventDefault();e.stopImmediatePropagation();showInlineToast(`还有 ${missing.length} 个资产未准备完成，请先上传或生成`,2800);return}
    const confirm=featureModal.querySelector('#confirmScriptAssets');
    if(confirm){e.preventDefault();e.stopImmediatePropagation();confirm.click();return}
  }

  if(!e.target.closest?.('.script-asset-hero-menu'))featureModal.querySelector('.script-asset-hero-menu')?.classList.add('hidden');
},true);

/* Keep the UI patched across app.js rerenders without observing our own patch writes. */
observer=new MutationObserver(queuePatch);
observeFeatureModal();
queuePatch();
})();