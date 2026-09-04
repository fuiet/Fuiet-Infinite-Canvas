/* Script Studio · Prepare Assets image picker modal
 * Empty asset previews and the drawer hero trigger open a four-source picker.
 * AI tab mirrors the image-generator workflow: system prompt + editable draft,
 * model, quality, resolution and aspect ratio. Existing app.js handlers remain
 * the source of truth for persistence and generation.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const nodeLayer=document.querySelector('#nodeLayer');
if(!featureModal)return;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>Date.now();
const SETTINGS_KEY='canvas-script-asset-picker-settings-v2';
const PROVIDERS_KEY='canvas-studio-providers-v1';
const FALLBACK_RATIOS=['1:1','1:2','2:1','9:16','16:9','3:4','4:3','3:2','2:3','5:4','4:5','21:9'];
const picker={root:null,assetId:'',assetName:'',kind:'资产',tab:'canvas',busy:false,watchToken:0,settings:null,systemPrompt:'',promptDraft:'',promptEdited:false};

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
function storage(){return globalThis.CanvasBrowserStorageManager||globalThis.localStorage||null}
function readJson(key,fallback){try{const raw=storage()?.getItem?.(key);const value=raw?JSON.parse(raw):fallback;return value??fallback}catch{return fallback}}
function writeJson(key,value){try{storage()?.setItem?.(key,JSON.stringify(value))}catch{}}
function settingsMap(){const value=readJson(SETTINGS_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function persistAssetSettings(){
  if(!picker.assetId||!picker.settings)return;
  const map=settingsMap();
  map[picker.assetId]={...picker.settings,prompt:picker.promptDraft,promptMode:picker.promptEdited?'custom':'system',updatedAt:new Date().toISOString()};
  writeJson(SETTINGS_KEY,map);
}

async function waitFor(fn,timeout=5000,interval=70){const start=now();while(now()-start<timeout){const value=fn();if(value)return value;await sleep(interval)}return null}
async function ensureAssetDrawer(id){
  let card=assetCard(id);if(!card)return null;
  if(!card.classList.contains('active'))card.click();
  return waitFor(()=>{const active=assetCard(id),panel=drawer();return active?.classList.contains('active')&&panel?panel:null},5000,80);
}

function closePicker(){
  picker.watchToken++;
  picker.root?.remove();
  picker.root=null;picker.assetId='';picker.assetName='';picker.kind='资产';picker.busy=false;picker.settings=null;picker.systemPrompt='';picker.promptDraft='';picker.promptEdited=false;
  document.body.classList.remove('script-asset-picker-open');
}

function emptyState(text,sub=''){
  return `<div class="script-asset-picker-empty"><div class="script-asset-picker-folder" aria-hidden="true"><i></i></div><b>${esc(text)}</b>${sub?`<span>${esc(sub)}</span>`:''}</div>`;
}

function currentAssetFields(){
  return{
    name:String(featureModal.querySelector('#drawerAssetName')?.value||picker.assetName||'').trim(),
    description:String(featureModal.querySelector('#drawerAssetDescription')?.value||'').trim(),
    prompt:String(featureModal.querySelector('#drawerAssetPrompt')?.value||'').trim(),
    style:String(featureModal.querySelector('#scriptAssetGlobalStyle')?.value||'').trim()
  };
}

function kindPromptRule(kind){
  if(kind==='角色')return '构图规范：高质量专业角色设定图。若核心设定已经指定四视图、九宫格或其他布局，严格按核心设定执行；若未指定，默认使用正面、侧面、背面三视图。保持同一身份、脸型、五官、发型、服装、身材比例完全一致；完整全身、构图清楚、背景干净，不出现无关道具、文字、水印或 UI。';
  if(kind==='场景')return '构图规范：高质量专业场景设定图。完整展示空间布局、关键区域、材质、色彩与光照关系，透视自然，环境信息清晰；除非核心设定明确要求，否则不出现人物，不出现无关文字、水印或 UI。';
  if(kind==='道具')return '构图规范：高质量专业道具设定图。主体清晰居中，按核心设定展示必要角度、结构、材质、比例与关键细节；背景干净，不出现人物、无关文字、水印或 UI。';
  return '构图规范：高质量专业资产设定图，严格保持核心设定一致，画面干净、信息清晰，不出现无关文字、水印或 UI。';
}

function buildSystemPrompt(){
  const f=currentAssetFields(),parts=[];
  if(f.name)parts.push(`名称：${f.name}`);
  if(f.description)parts.push(`描述：${f.description}`);
  if(f.prompt)parts.push(`核心设定：${f.prompt}`);
  if(f.style)parts.push(`统一视觉风格：${f.style}`);
  parts.push(kindPromptRule(picker.kind));
  parts.push('生成要求：主体身份与脚本设定必须稳定一致，细节清晰可复用，避免随机改造、额外角色、错误肢体、乱码文字和品牌水印。');
  return parts.filter(Boolean).join('。').replace(/。{2,}/g,'。');
}

function modelOptions(){
  const native=featureModal.querySelector('#assetGenModel');
  return [...(native?.options||[])].filter(o=>o.value).map(o=>({value:String(o.value),label:String(o.textContent||o.value).trim()}));
}
function currentProviderId(){return String(featureModal.querySelector('#assetGenProvider')?.value||'')}
function currentNativeModelId(){return String(featureModal.querySelector('#assetGenModel')?.value||'')}
function providerModelData(modelId){
  const providers=readJson(PROVIDERS_KEY,[]),pid=currentProviderId(),provider=Array.isArray(providers)?providers.find(p=>String(p?.id||'')===pid):null;
  const model=provider?.models?.find(m=>String(m?.id||'')===String(modelId||''));
  return{provider,model};
}
function capabilityFor(modelId){
  const {provider,model}=providerModelData(modelId);
  try{
    if(provider&&model&&globalThis.CanvasModelImageCapabilities?.resolve)return globalThis.CanvasModelImageCapabilities.resolve(provider,model);
  }catch{}
  return{aspectRatios:FALLBACK_RATIOS,resolutions:['1K','2K','4K'],qualityLabels:['标准画质','高画质'],qualities:[{label:'标准画质',value:'medium'},{label:'高画质',value:'high'}]};
}
function qualityLabels(cap){
  const labels=(cap?.qualityLabels?.length?cap.qualityLabels:(cap?.qualities||[]).map(q=>typeof q==='string'?q:q?.label)).map(String).filter(Boolean);
  return labels.length?[...new Set(labels)]:['模型默认'];
}
function preferred(list,candidates=[]){for(const value of candidates)if(list.includes(value))return value;return list[0]||''}
function refreshSettingChoices({reset=false}={}){
  if(!picker.settings)return;
  const cap=capabilityFor(picker.settings.modelId),ratios=(cap.aspectRatios||FALLBACK_RATIOS).map(String).filter(Boolean),resolutions=(cap.resolutions||['1K']).map(String).filter(Boolean),qualities=qualityLabels(cap);
  const ratioDefault=picker.kind==='角色'?'2:1':picker.kind==='场景'?'16:9':'1:1';
  if(reset||!ratios.includes(String(picker.settings.aspectRatio||'')))picker.settings.aspectRatio=preferred(ratios,[ratioDefault,'1:1']);
  if(reset||!resolutions.includes(String(picker.settings.resolution||'')))picker.settings.resolution=preferred(resolutions,['2K','1K','原生']);
  if(reset||!qualities.includes(String(picker.settings.imageQuality||'')))picker.settings.imageQuality=preferred(qualities,['标准画质','模型默认','自动画质','高画质']);
  picker.settings.ratios=ratios;picker.settings.resolutions=resolutions;picker.settings.qualities=qualities;
}
function ensureAIState(){
  if(picker.settings)return;
  const saved=settingsMap()[picker.assetId]||{},models=modelOptions(),nativeModel=currentNativeModelId();
  const modelId=models.some(x=>x.value===String(saved.modelId||''))?String(saved.modelId):nativeModel||models[0]?.value||'';
  picker.settings={modelId,aspectRatio:String(saved.aspectRatio||''),resolution:String(saved.resolution||''),imageQuality:String(saved.imageQuality||'')};
  refreshSettingChoices();
  picker.systemPrompt=buildSystemPrompt();
  picker.promptEdited=saved.promptMode==='custom'&&Boolean(String(saved.prompt||'').trim());
  picker.promptDraft=picker.promptEdited?String(saved.prompt):picker.systemPrompt;
}
function optionHtml(values,current){return values.map(v=>`<option value="${esc(v)}" ${String(v)===String(current)?'selected':''}>${esc(v)}</option>`).join('')}
function modelOptionHtml(values,current){return values.map(v=>`<option value="${esc(v.value)}" ${String(v.value)===String(current)?'selected':''}>${esc(v.label)}</option>`).join('')}
function modelSummary(){
  const provider=featureModal.querySelector('#assetGenProvider')?.selectedOptions?.[0]?.textContent?.trim()||'';
  const models=modelOptions(),chosen=models.find(x=>x.value===picker.settings?.modelId)?.label||featureModal.querySelector('#assetGenModel')?.selectedOptions?.[0]?.textContent?.trim()||'';
  return [provider,chosen].filter(Boolean).join(' · ');
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
  body.querySelectorAll('button,textarea,select').forEach(el=>{if(!el.hasAttribute('data-picker-close'))el.disabled=Boolean(busy)});
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

function applyOneShotNodeSettings(settings,action){
  const originalPush=Array.prototype.push;
  let armed=true;
  Array.prototype.push=function(...items){
    if(armed){
      for(const item of items){
        if(!item||item.type!=='image'||item?.toolParams?.operation!=='script_asset')continue;
        if(picker.assetId&&String(item?.toolParams?.assetId||'')!==String(picker.assetId))continue;
        item.aspectRatio=settings.aspectRatio||item.aspectRatio||'1:1';
        item.resolution=settings.resolution||item.resolution||'1K';
        item.imageQuality=settings.imageQuality||item.imageQuality||'标准画质';
        item.count=1;
        if(picker.promptDraft)item.prompt=picker.promptDraft;
      }
    }
    return originalPush.apply(this,items);
  };
  try{return action()}finally{armed=false;Array.prototype.push=originalPush}
}

function syncAIFieldsToNative(){
  const prompt=featureModal.querySelector('#drawerAssetPrompt');if(prompt){prompt.value=picker.promptDraft;prompt.dispatchEvent(new Event('input',{bubbles:true}))}
  const model=featureModal.querySelector('#assetGenModel');
  if(model&&picker.settings?.modelId&&[...model.options].some(o=>String(o.value)===String(picker.settings.modelId))){model.value=picker.settings.modelId;model.dispatchEvent(new Event('change',{bubbles:true}))}
  persistAssetSettings();
}

function renderAI(){
  const body=picker.root?.querySelector('.script-asset-picker-body');if(!body)return;
  ensureAIState();refreshSettingChoices();
  const models=modelOptions(),summary=modelSummary(),generate=featureModal.querySelector('#drawerAssetGenerate');
  body.innerHTML=`<div class="script-asset-picker-ai">
    <div class="script-asset-picker-ai-head">
      <div><b>系统生成提示词</b><span>${esc(summary||'使用准备资产页面当前图片模型')} · 默认根据${esc(picker.kind)}名称、描述、脚本设定和全局风格生成，可直接修改</span></div>
      <button type="button" class="script-asset-prompt-refresh" data-picker-regenerate>重新生成提示词</button>
    </div>
    <textarea id="scriptAssetPickerPrompt" data-picker-prompt spellcheck="false" placeholder="系统会先生成一版${esc(picker.kind)}图片提示词，你也可以直接修改">${esc(picker.promptDraft)}</textarea>
    <div class="script-asset-picker-ai-footer">
      <div class="script-asset-picker-ai-settings">
        <label title="模型"><span>模型</span><select id="scriptAssetPickerModel" data-picker-model>${models.length?modelOptionHtml(models,picker.settings.modelId):'<option value="">暂无可用图片模型</option>'}</select></label>
        <label title="画质"><span>画质</span><select id="scriptAssetPickerQuality" data-picker-quality>${optionHtml(picker.settings.qualities,picker.settings.imageQuality)}</select></label>
        <label title="清晰度"><span>清晰度</span><select id="scriptAssetPickerResolution" data-picker-resolution>${optionHtml(picker.settings.resolutions,picker.settings.resolution)}</select></label>
        <label title="比例"><span>比例</span><select id="scriptAssetPickerRatio" data-picker-ratio>${optionHtml(picker.settings.ratios,picker.settings.aspectRatio)}</select></label>
      </div>
      <div class="script-asset-picker-ai-generate"><span data-picker-busy hidden>正在生成，请稍候…</span><button type="button" class="primary" data-picker-generate ${!models.length||generate?.disabled?'disabled':''}>确认生成</button></div>
    </div>
  </div>`;
  const textarea=body.querySelector('[data-picker-prompt]');
  textarea?.addEventListener('input',()=>{picker.promptDraft=textarea.value;picker.promptEdited=true;persistAssetSettings()});
  body.querySelector('[data-picker-regenerate]')?.addEventListener('click',()=>{picker.systemPrompt=buildSystemPrompt();picker.promptDraft=picker.systemPrompt;picker.promptEdited=false;persistAssetSettings();renderAI()});
  body.querySelector('[data-picker-model]')?.addEventListener('change',e=>{picker.settings.modelId=e.target.value;refreshSettingChoices({reset:true});persistAssetSettings();renderAI()});
  body.querySelector('[data-picker-quality]')?.addEventListener('change',e=>{picker.settings.imageQuality=e.target.value;persistAssetSettings()});
  body.querySelector('[data-picker-resolution]')?.addEventListener('change',e=>{picker.settings.resolution=e.target.value;persistAssetSettings()});
  body.querySelector('[data-picker-ratio]')?.addEventListener('change',e=>{picker.settings.aspectRatio=e.target.value;persistAssetSettings()});
  body.querySelector('[data-picker-generate]')?.addEventListener('click',()=>{
    const currentGenerate=featureModal.querySelector('#drawerAssetGenerate');if(!currentGenerate||currentGenerate.disabled)return;
    picker.promptDraft=String(body.querySelector('[data-picker-prompt]')?.value||picker.promptDraft||'').trim();
    syncAIFieldsToNative();
    runAndCloseWhenReady(()=>applyOneShotNodeSettings({...picker.settings},()=>currentGenerate.click()));
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
  picker.assetId=id;picker.assetName=cardName(card);picker.kind=cardKind(card);picker.tab='canvas';picker.busy=false;picker.settings=null;picker.systemPrompt='';picker.promptDraft='';picker.promptEdited=false;
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
