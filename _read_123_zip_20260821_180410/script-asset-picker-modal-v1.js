/* Script Studio · Prepare Assets image picker modal
 * Empty asset previews and the drawer hero trigger open a four-source picker
 * without replacing app.js asset logic. Existing drawer handlers remain the
 * source of truth for AI generation, upload, and canvas binding.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const nodeLayer=document.querySelector('#nodeLayer');
if(!featureModal)return;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>Date.now();
const picker={root:null,assetId:'',assetName:'',kind:'资产',tab:'canvas',busy:false,watchToken:0};

function assetsLayout(){return featureModal.querySelector('.script-assets-layout')}
function assetsView(){return Boolean(assetsLayout())}
function assetCard(id){return featureModal.querySelector(`[data-open-script-asset="${CSS.escape(String(id||''))}"]`)}
function activeAssetCard(){return featureModal.querySelector('[data-open-script-asset].active')}
function assetId(card){return String(card?.dataset.openScriptAsset||'')}
function cardName(card){return String(card?.querySelector('.asset-card-copy>b')?.textContent||'未命名资产').trim()||'未命名资产'}
function cardKind(card){const label=String(card?.closest('.asset-block')?.querySelector('.asset-block-head>b')?.textContent||'资产').trim();return label||'资产'}
function cardHasMedia(card){const preview=card?.querySelector('.asset-preview');return Boolean(preview&&(preview.style.backgroundImage||preview.querySelector('.asset-global-lock')&&!preview.querySelector('.asset-missing')))}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function drawer(){return featureModal.querySelector('.script-asset-drawer')}
function activeNativeSelect(){return featureModal.querySelector('#drawerAssetCanvas')}

async function waitFor(fn,timeout=5000,interval=70){const start=now();while(now()-start<timeout){const value=fn();if(value)return value;await sleep(interval)}return null}
async function ensureAssetDrawer(id){
  let card=assetCard(id);if(!card)return null;
  if(!card.classList.contains('active'))card.click();
  return waitFor(()=>{const active=assetCard(id),panel=drawer();return active?.classList.contains('active')&&panel?panel:null},5000,80);
}

function closePicker(){
  picker.watchToken++;
  picker.root?.remove();
  picker.root=null;picker.assetId='';picker.assetName='';picker.kind='资产';picker.busy=false;
  document.body.classList.remove('script-asset-picker-open');
}

function emptyState(text,sub=''){
  return `<div class="script-asset-picker-empty"><div class="script-asset-picker-folder" aria-hidden="true"><i></i></div><b>${esc(text)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div>`;
}

function modelSummary(){
  const provider=featureModal.querySelector('#assetGenProvider')?.selectedOptions?.[0]?.textContent?.trim()||'';
  const model=featureModal.querySelector('#assetGenModel')?.selectedOptions?.[0]?.textContent?.trim()||'';
  return [provider,model].filter(Boolean).join(' · ');
}

function nodeThumb(id){
  const node=nodeLayer?.querySelector(`.node[data-id="${CSS.escape(String(id))}"]`);if(!node)return'';
  const img=node.querySelector('img[src]');if(img?.src)return img.src;
  const candidates=[node.querySelector('.node-image-result'),node.querySelector('.image-result'),node.querySelector('[style*="background-image"]')].filter(Boolean);
  for(const el of candidates){const value=el.style?.backgroundImage||getComputedStyle(el).backgroundImage||'';const hit=value.match(/url\(["']?(.*?)["']?\)/);if(hit?.[1])return hit[1]}
  return'';
}

async function runAndCloseWhenReady(action){
  if(picker.busy)return;
  picker.busy=true;updateBusy(true);
  const token=++picker.watchToken;
  try{
    action();
    const result=await waitFor(()=>{
      if(token!==picker.watchToken||!picker.root)return'cancelled';
      const card=assetCard(picker.assetId);
      if(card&&cardHasMedia(card))return'done';
      const toast=String(document.querySelector('#toast')?.textContent||'');
      if(/生成失败|上传失败|请选择一张已有画布图片/.test(toast))return'failed';
      return null;
    },180000,220);
    if(result==='done')closePicker();
  }finally{
    if(token===picker.watchToken&&picker.root){picker.busy=false;updateBusy(false)}
  }
}

function updateBusy(busy){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  body.classList.toggle('is-busy',Boolean(busy));
  body.querySelectorAll('button,textarea').forEach(el=>{if(!el.hasAttribute('data-picker-close'))el.disabled=Boolean(busy)});
  const status=body.querySelector('[data-picker-busy]');if(status)status.hidden=!busy;
}

function renderCanvas(){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  const select=activeNativeSelect();
  const options=[...(select?.options||[])].filter(o=>o.value);
  body.innerHTML=options.length?`<div class="script-asset-picker-grid" data-picker-canvas-grid></div><div class="script-asset-picker-busy" data-picker-busy hidden>正在绑定图片…</div>`:emptyState('当前画布暂无节点');
  const grid=body.querySelector('[data-picker-canvas-grid]');
  if(!grid)return;
  options.forEach(option=>{
    const id=option.value,title=option.textContent.trim()||'图片节点',thumb=nodeThumb(id);
    const button=document.createElement('button');button.type='button';button.className='script-asset-picker-card';button.dataset.canvasImageId=id;
    button.innerHTML=`<span class="script-asset-picker-thumb"${thumb?` style="background-image:url('${String(thumb).replace(/'/g,'%27')}')"`:''}>${thumb?'':'图片'}</span><b>${esc(title)}</b>`;
    button.addEventListener('click',()=>{
      const native=activeNativeSelect(),bind=featureModal.querySelector('#drawerAssetBindCanvas');if(!native||!bind)return;
      native.value=id;native.dispatchEvent(new Event('change',{bubbles:true}));
      runAndCloseWhenReady(()=>bind.click());
    });
    grid.appendChild(button);
  });
}

function renderAI(){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  const prompt=featureModal.querySelector('#drawerAssetPrompt');
  const summary=modelSummary();
  body.innerHTML=`<div class="script-asset-picker-ai"><div class="script-asset-picker-ai-head"><div><b>AI 生成${esc(picker.kind)}图</b><span>${esc(summary||'使用准备资产页面当前选择的图片模型')}</span></div></div><label>生成提示词<textarea rows="8" data-picker-prompt placeholder="输入${esc(picker.kind)}图生成提示词">${esc(prompt?.value||'')}</textarea></label><div class="script-asset-picker-ai-actions"><span data-picker-busy hidden>正在生成，请稍候…</span><button type="button" class="primary" data-picker-generate>生成${esc(picker.kind)}图</button></div></div>`;
  const textarea=body.querySelector('[data-picker-prompt]');
  textarea?.addEventListener('input',()=>{const native=featureModal.querySelector('#drawerAssetPrompt');if(native){native.value=textarea.value;native.dispatchEvent(new Event('input',{bubbles:true}))}});
  body.querySelector('[data-picker-generate]')?.addEventListener('click',()=>{
    const native=featureModal.querySelector('#drawerAssetPrompt');if(native&&textarea)native.value=textarea.value;
    const generate=featureModal.querySelector('#drawerAssetGenerate');if(!generate)return;
    runAndCloseWhenReady(()=>generate.click());
  });
}

function renderUpload(){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  body.innerHTML=`<div class="script-asset-picker-upload" data-picker-dropzone><div class="script-asset-picker-upload-icon">＋</div><b>上传${esc(picker.kind)}图片</b><span>支持 PNG、JPG、JPEG、WEBP 等常见图片格式</span><button type="button" data-picker-upload>选择本地图片</button><small data-picker-busy hidden>正在上传并绑定…</small></div>`;
  const openFile=()=>featureModal.querySelector('#drawerAssetUpload')?.click();
  body.querySelector('[data-picker-upload]')?.addEventListener('click',openFile);
  const drop=body.querySelector('[data-picker-dropzone]');
  drop?.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('is-dragover')});
  drop?.addEventListener('dragleave',()=>drop.classList.remove('is-dragover'));
  drop?.addEventListener('drop',e=>{
    e.preventDefault();drop.classList.remove('is-dragover');
    const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('image/'));const input=featureModal.querySelector('#drawerAssetFile');
    if(!file||!input)return;
    try{const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));picker.busy=true;updateBusy(true)}catch{openFile()}
  });
  const input=featureModal.querySelector('#drawerAssetFile');
  if(input&&!input.dataset.pickerWatch){
    input.dataset.pickerWatch='1';
    input.addEventListener('change',()=>{if(input.files?.length&&picker.root){picker.busy=true;updateBusy(true);const token=++picker.watchToken;waitFor(()=>{if(token!==picker.watchToken||!picker.root)return'cancelled';const card=assetCard(picker.assetId);return card&&cardHasMedia(card)?'done':null},180000,220).then(result=>{if(result==='done')closePicker()})}});
  }
}

function renderLibrary(){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  body.innerHTML=emptyState('个人资产库暂无可用图片','保存到个人资产库的图片会显示在这里');
}

function setTab(tab){
  picker.tab=tab;
  picker.root?.querySelectorAll('[data-picker-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.pickerTab===tab));
  if(tab==='ai')renderAI();else if(tab==='canvas')renderCanvas();else if(tab==='upload')renderUpload();else renderLibrary();
}

async function openPicker(card){
  const id=assetId(card);if(!id)return;
  closePicker();
  picker.assetId=id;picker.assetName=cardName(card);picker.kind=cardKind(card);picker.tab='canvas';picker.busy=false;
  featureModal.querySelector('.script-asset-hero-menu')?.classList.add('hidden');
  document.body.classList.add('script-asset-picker-open');
  const root=document.createElement('div');root.className='script-asset-picker-overlay';root.innerHTML=`<section class="script-asset-picker-modal" role="dialog" aria-modal="true" aria-label="选择图片"><header><b>选择图片（${esc(picker.assetName)}）</b><button type="button" data-picker-close aria-label="关闭">×</button></header><nav><button type="button" data-picker-tab="ai">AI生成</button><button type="button" data-picker-tab="canvas" class="active">从当前画布选择</button><button type="button" data-picker-tab="upload">本地上传</button><button type="button" data-picker-tab="library">个人资产库</button></nav><div class="script-asset-picker-body">${emptyState('正在读取当前画布…')}</div></section>`;
  picker.root=root;document.body.appendChild(root);
  root.querySelector('[data-picker-close]')?.addEventListener('click',closePicker);
  root.addEventListener('pointerdown',e=>{if(e.target===root)closePicker()});
  root.querySelectorAll('[data-picker-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.pickerTab)));
  const panel=await ensureAssetDrawer(id);
  if(!picker.root||picker.assetId!==id)return;
  if(!panel){picker.root.querySelector('.script-asset-picker-body').innerHTML=emptyState('图片选择器初始化失败','请关闭后重试');return}
  setTab('canvas');
}

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&picker.root)closePicker()});

/* Both requested entry points open the same picker:
 * 1) the empty preview on the Prepare Assets card;
 * 2) the large “生成或上传角色/场景/道具图” hero inside the editor drawer.
 */
document.addEventListener('click',e=>{
  if(!assetsView()||picker.root)return;

  const hero=e.target.closest?.('.script-asset-hero-trigger');
  if(hero){
    const card=activeAssetCard();if(!card)return;
    e.preventDefault();
    featureModal.querySelector('.script-asset-hero-menu')?.classList.add('hidden');
    e.stopImmediatePropagation();
    openPicker(card);
    return;
  }

  const preview=e.target.closest?.('.script-asset-card .asset-preview');if(!preview)return;
  const card=preview.closest('[data-open-script-asset]');if(!card||cardHasMedia(card))return;
  e.preventDefault();e.stopImmediatePropagation();openPicker(card);
},true);

/* Close automatically after an existing handler binds/generated media and rerenders the asset card. */
const observer=new MutationObserver(()=>{
  if(!picker.root||!picker.assetId)return;
  const card=assetCard(picker.assetId);
  if(card&&cardHasMedia(card))closePicker();
});
observer.observe(featureModal,{childList:true,subtree:true});
})();
