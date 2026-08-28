/* Canvas Studio · Image generator v2
 * UI-only enhancement layer for the existing image generator.
 * Reuses app.js model / ratio / resolution / count controls and their handlers.
 * Does not replace node, connection, text editing, or generation state logic.
 */
(()=>{
'use strict';

const generator=document.querySelector('#generatorPanel');
const nodeLayer=document.querySelector('#nodeLayer');
if(!generator||!nodeLayer)return;

const QUALITY_KEY='canvas-studio-image-quality-v2';
const PRESET_KEY='canvas-studio-image-presets-v2';
let lastRoot=null;
let floating=null;
let placeRaf=0;

const PRESETS={
  story:{label:'分镜叙事',items:[
    ['建立镜头','建立镜头，交代环境、人物位置与空间关系，画面信息清楚'],
    ['人物特写','人物特写镜头，突出表情、眼神与情绪变化，背景适度虚化'],
    ['双人对话','双人对话分镜，保持视线关系、轴线和人物位置连续'],
    ['动作镜头','动作分镜，动作方向明确，姿态有张力，前后镜头可连续衔接'],
    ['情绪镜头','情绪叙事镜头，通过表情、光线和构图强化情绪']
  ]},
  texture:{label:'质感调节',items:[
    ['电影写实','电影级写实质感，自然皮肤与材质，真实光影层次，降低AI感'],
    ['胶片质感','胶片摄影质感，柔和高光、细腻颗粒、自然色彩过渡'],
    ['商业摄影','高端商业摄影质感，主体清晰，材质细节干净，布光精致'],
    ['柔和自然','自然柔光，低锐化，肤色自然，细节柔和但保持真实'],
    ['动漫插画','高质量动画电影插画质感，造型稳定，色彩与材质统一']
  ]},
  camera:{label:'空间与机位',items:[
    ['正面平视','正面平视机位，透视自然，主体比例稳定，构图端正'],
    ['低机位','低机位仰拍，增强主体力量感与空间纵深'],
    ['高机位','高机位俯拍，清楚展示人物与环境的空间关系'],
    ['广角全景','广角全景机位，强调环境尺度、前中后景和空间层次'],
    ['近景特写','近景特写机位，浅景深，主体细节与情绪优先']
  ]},
  setting:{label:'设定图',items:[
    ['角色三视图','角色设定三视图：正面、侧面、背面，身份、服装、发型与比例保持一致'],
    ['表情九宫格','角色表情九宫格，保持同一身份与造型，仅变化自然表情'],
    ['服装设定','服装设定图，完整展示服装结构、材质、配饰和细节'],
    ['场景设定','场景设定图，空间结构明确，材质、光照与功能区域清晰'],
    ['道具设定','道具设定图，多角度展示结构、材质、比例与关键细节']
  ]}
};

function readMap(key){
  try{const v=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(key)||'{}');return v&&typeof v==='object'?v:{}}catch{return{}}
}
function writeMap(key,value){try{globalThis.CanvasBrowserStorageManager.setItem(key,JSON.stringify(value))}catch{}}
function activeImageNode(){
  return nodeLayer.querySelector('.node.node-image.selected[data-id],.node.node-image[data-interaction-state="selected"][data-id]')
    ||nodeLayer.querySelector('.node.node-image.multi-selected[data-id]');
}
function activeNodeId(){return String(activeImageNode()?.dataset?.id||'')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function closeFloating(){if(floating){floating.remove();floating=null}}
function nativeSelect(id){return generator.querySelector('#'+id)}
function selectValues(select){return [...(select?.options||[])].map(o=>({value:o.value,label:o.textContent.trim()}))}
function setNativeSelect(id,value){
  const el=nativeSelect(id);if(!el)return false;
  const match=[...el.options].find(o=>String(o.value)===String(value));
  if(!match)return false;
  el.value=match.value;
  el.dispatchEvent(new Event('change',{bubbles:true}));
  syncSummary();
  return true;
}
function qualityForNode(){
  const id=activeNodeId();const map=readMap(QUALITY_KEY);return map[id]||'标准画质';
}
function setQuality(value){
  const id=activeNodeId();if(!id)return;
  const map=readMap(QUALITY_KEY);map[id]=value;writeMap(QUALITY_KEY,map);syncSummary();
}
function presetState(){const id=activeNodeId();const map=readMap(PRESET_KEY);return{id,map,state:map[id]||{}}}
function setPreset(cat,item){
  const {id,map,state}=presetState();if(!id)return;
  const previous=state[cat]?.prompt||'';
  state[cat]={label:item[0],prompt:item[1]};map[id]=state;writeMap(PRESET_KEY,map);
  const input=generator.querySelector('#promptInput');
  if(input){
    let text=String(input.value||'').trim();
    if(previous&&text.includes(previous))text=text.replace(previous,'').replace(/^[，,、\s]+|[，,、\s]+$/g,'').trim();
    if(!text.includes(item[1]))text=text?`${text}，${item[1]}`:item[1];
    input.value=text;
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  syncPresetButtons();
}
function syncPresetButtons(){
  const {state}=presetState();
  generator.querySelectorAll('[data-image-preset-cat]').forEach(btn=>{
    const cat=btn.dataset.imagePresetCat,meta=PRESETS[cat],chosen=state[cat]?.label;
    const label=btn.querySelector('.image-preset-label');if(label)label.textContent=chosen?`${meta.label} · ${chosen}`:meta.label;
    btn.classList.toggle('active',Boolean(chosen));
  });
}
function summaryText(){
  const ratio=nativeSelect('ratioSelect')?.selectedOptions?.[0]?.textContent?.trim()||'比例';
  const resolution=nativeSelect('resolutionSelect')?.selectedOptions?.[0]?.textContent?.trim()||'清晰度';
  const count=nativeSelect('countSelect')?.selectedOptions?.[0]?.textContent?.trim()||'1张';
  return `${ratio} · ${qualityForNode()} · ${resolution} · ${count}`;
}
function syncSummary(){
  const label=generator.querySelector('#imageSettingsSummaryText');if(label)label.textContent=summaryText();
}
function placePopup(pop,anchor){
  const ar=anchor.getBoundingClientRect();
  pop.style.visibility='hidden';document.body.appendChild(pop);
  const pr=pop.getBoundingClientRect(),edge=12,gap=7;
  const left=Math.min(window.innerWidth-pr.width-edge,Math.max(edge,ar.left));
  let top=ar.bottom+gap;
  if(top+pr.height>window.innerHeight-edge)top=Math.max(edge,ar.top-gap-pr.height);
  pop.style.left=Math.round(left)+'px';pop.style.top=Math.round(top)+'px';pop.style.visibility='visible';
  floating=pop;
}
function openPresetMenu(cat,anchor){
  closeFloating();const meta=PRESETS[cat];if(!meta)return;
  const pop=document.createElement('div');pop.className='image-generator-popover image-preset-popover';pop.dataset.presetCat=cat;
  pop.innerHTML=`<div class="image-pop-title">${esc(meta.label)}</div><div class="image-preset-options">${meta.items.map((it,i)=>`<button type="button" data-preset-index="${i}"><b>${esc(it[0])}</b><span>${esc(it[1])}</span></button>`).join('')}</div>`;
  pop.addEventListener('pointerdown',e=>e.stopPropagation());
  pop.querySelectorAll('[data-preset-index]').forEach(b=>b.onclick=()=>{setPreset(cat,meta.items[Number(b.dataset.presetIndex)]);closeFloating()});
  placePopup(pop,anchor);
}
function togglePresetMenu(cat,anchor){
  if(floating?.classList.contains('image-preset-popover')&&floating.dataset.presetCat===cat){closeFloating();return}
  openPresetMenu(cat,anchor);
}
function settingButtons(values,current,attr){
  return values.map(x=>`<button type="button" data-${attr}="${esc(x.value)}" class="${String(x.value)===String(current)?'active':''}">${esc(x.label)}</button>`).join('');
}
function openSettings(anchor){
  closeFloating();
  const ratio=nativeSelect('ratioSelect'),resolution=nativeSelect('resolutionSelect'),count=nativeSelect('countSelect');
  const ratioVals=selectValues(ratio),resVals=selectValues(resolution),countVals=selectValues(count);
  const pop=document.createElement('div');pop.className='image-generator-popover image-settings-popover';
  pop.innerHTML=`
    <section><div class="image-pop-title">画质</div><div class="image-setting-grid quality-grid">${['低画质','标准画质','高画质'].map(x=>`<button type="button" data-quality="${x}" class="${qualityForNode()===x?'active':''}">${x}</button>`).join('')}</div></section>
    <section><div class="image-pop-title">清晰度</div><div class="image-setting-grid resolution-grid">${settingButtons(resVals,resolution?.value,'resolution-value')}</div></section>
    <section><div class="image-pop-title">比例</div><div class="image-ratio-grid">${settingButtons(ratioVals,ratio?.value,'ratio-value')}</div></section>
    <section><div class="image-pop-title">生成数量</div><div class="image-setting-grid count-grid">${settingButtons(countVals,count?.value,'count-value')}</div></section>`;
  pop.addEventListener('pointerdown',e=>e.stopPropagation());
  pop.querySelectorAll('[data-quality]').forEach(b=>b.onclick=()=>{setQuality(b.dataset.quality);openSettings(anchor)});
  pop.querySelectorAll('[data-resolution-value]').forEach(b=>b.onclick=()=>{setNativeSelect('resolutionSelect',b.dataset.resolutionValue);openSettings(anchor)});
  pop.querySelectorAll('[data-ratio-value]').forEach(b=>b.onclick=()=>{setNativeSelect('ratioSelect',b.dataset.ratioValue);openSettings(anchor)});
  pop.querySelectorAll('[data-count-value]').forEach(b=>b.onclick=()=>{setNativeSelect('countSelect',b.dataset.countValue);openSettings(anchor)});
  placePopup(pop,anchor);
}
function toggleSettings(anchor){
  if(floating?.classList.contains('image-settings-popover')){closeFloating();return}
  openSettings(anchor);
}
function normalizeReferenceRow(root){
  const top=root.querySelector('.image-gen-top');if(!top)return;
  const image=top.querySelector('[data-image-ref-slot="image_reference"]');
  const mark=top.querySelector('[data-image-ref-slot="character_reference"]');
  const style=top.querySelector('[data-image-ref-slot="style_reference"]');
  const expand=top.querySelector('#imageGenExpand');
  [image,mark,style,expand].filter(Boolean).forEach(el=>top.appendChild(el));
  if(image&&!image.classList.contains('has-ref')){
    const icon=image.querySelector('.slot-icon');if(icon)icon.textContent='＋';
    const spans=image.querySelectorAll('span');if(spans.length>1)spans[spans.length-1].textContent='参考';
  }
}
function buildPresetRow(root){
  if(root.querySelector('.image-preset-row'))return;
  const row=document.createElement('div');row.className='image-preset-row';
  row.innerHTML=Object.entries(PRESETS).map(([key,v])=>`<button type="button" data-image-preset-cat="${key}"><span class="image-preset-dot"></span><span class="image-preset-label">${esc(v.label)}</span><i>⌄</i></button>`).join('');
  root.querySelector('.image-gen-top')?.after(row);
  row.querySelectorAll('[data-image-preset-cat]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();togglePresetMenu(b.dataset.imagePresetCat,b)});
  syncPresetButtons();
}
function buildSettingsControl(root){
  const controls=root.querySelector('.image-gen-controls');if(!controls||controls.querySelector('#imageSettingsSummary'))return;
  const model=controls.querySelector('#modelPickerBtn');
  const summary=document.createElement('button');summary.type='button';summary.id='imageSettingsSummary';summary.className='image-settings-summary';summary.innerHTML='<span class="image-settings-icon">▭</span><b id="imageSettingsSummaryText"></b><i>⌄</i>';
  if(model)model.after(summary);else controls.prepend(summary);
  summary.onclick=e=>{e.preventDefault();e.stopPropagation();toggleSettings(summary)};
  ['ratioSelect','resolutionSelect','countSelect'].forEach(id=>nativeSelect(id)?.classList.add('image-native-setting'));
  syncSummary();
}
function placeGenerator(){
  cancelAnimationFrame(placeRaf);placeRaf=requestAnimationFrame(()=>{
    if(generator.classList.contains('hidden')||!generator.classList.contains('image-generator'))return;
    const node=activeImageNode();if(!node)return;
    const nr=node.getBoundingClientRect(),pr=generator.getBoundingClientRect();
    if(!pr.width||!pr.height)return;
    const edge=16,gap=12,dockReserve=72,maxBottom=window.innerHeight-dockReserve;
    let top=nr.bottom+gap;
    if(top+pr.height>maxBottom&&nr.top-gap-pr.height>=edge)top=nr.top-gap-pr.height;
    else top=Math.max(edge,Math.min(maxBottom-pr.height,top));
    const left=Math.max(edge,Math.min(window.innerWidth-pr.width-edge,nr.left+nr.width/2-pr.width/2));
    generator.style.left=Math.round(left)+'px';generator.style.top=Math.round(top)+'px';
  });
}
function enhance(root){
  lastRoot=root;generator.classList.add('image-generator-v2');
  normalizeReferenceRow(root);buildPresetRow(root);buildSettingsControl(root);
  root.querySelectorAll('#ratioSelect,#resolutionSelect,#countSelect').forEach(el=>el.addEventListener('change',()=>requestAnimationFrame(syncSummary)));
  requestAnimationFrame(()=>{syncSummary();syncPresetButtons();placeGenerator()});
}
function scan(){
  const root=generator.querySelector('.image-generator-main');
  if(!generator.classList.contains('image-generator')||generator.classList.contains('hidden')||!root){closeFloating();return}
  if(root!==lastRoot)enhance(root);else{syncSummary();syncPresetButtons()}
}

/* app.js replaces generatorPanel's direct children when switching nodes and toggles classes
 * on the panel itself. Observe only those root-level changes; observing descendants lets our
 * own summary/preset DOM updates recursively retrigger this observer. */
new MutationObserver(scan).observe(generator,{childList:true,attributes:true,attributeFilter:['class']});
window.addEventListener('resize',()=>{closeFloating();placeGenerator()},{passive:true});
window.addEventListener('scroll',()=>{closeFloating();placeGenerator()},{passive:true,capture:true});
document.addEventListener('pointerdown',e=>{if(floating&&!floating.contains(e.target)&&!e.target.closest('#imageSettingsSummary,[data-image-preset-cat]'))closeFloating()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFloating()},true);
scan();

})();
