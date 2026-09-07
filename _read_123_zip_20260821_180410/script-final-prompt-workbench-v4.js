/* Fuiet Script · Final Prompt Workbench V4
 * Replaces the dense V3 prompt table with per-shot production cards.
 * Legacy prompt inputs remain the canonical persistence bridge.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const base=globalThis.FuietFinalPromptWorkflowV2;
const production=globalThis.FuietFinalPromptProduction;
if(!featureModal||!base||!production)return;

const text=v=>String(v??'');
const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const attr=esc;
const cssEscape=v=>globalThis.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&');
let renderTimer=0;
let rendering=false;
let bulkBusy=false;
const oneBusy=new Set();
const manualEdited=new Set();

function active(){return Boolean(featureModal.querySelector('[data-script-tab="prompts"].active')&&featureModal.querySelector('.final-prompt-list'))}
function ids(){return [...featureModal.querySelectorAll('.final-prompt-list [data-final-shot]')].map(x=>x.dataset.finalShot).filter(Boolean)}
function ctx(id){try{return base.shotContext(id)}catch{return null}}
function status(shot){
  if(!shot)return{key:'pending',label:'待合成'};
  if(oneBusy.has(String(shot.id))||shot.promptStatus==='generating')return{key:'generating',label:'AI 合成中'};
  if(shot.promptStatus==='error')return{key:'error',label:'合成失败'};
  if(shot.promptDirty||shot.promptStatus==='dirty')return{key:'dirty',label:'需要重新合成'};
  if(text(shot.imagePrompt).trim()&&text(shot.videoPrompt).trim())return{key:'ready',label:manualEdited.has(String(shot.id))?'已人工修改':'已完成'};
  return{key:'pending',label:'待合成'};
}
function assetType(a){const t=text(a?.assetType||a?.type).toLowerCase();return t.includes('char')?'角色':t.includes('scene')?'场景':'道具'}
function mentionHtml(value,assets=[]){
  let html=esc(value||'');
  [...assets].filter(a=>a?.name).sort((a,b)=>text(b.name).length-text(a.name).length).forEach(a=>{
    const token=esc('@'+a.name);html=html.split(token).join(`<span class="fpv4-mention">${token}</span>`);
  });
  return html;
}
function sourceRow(label,value,assets=[],empty='—'){return `<div class="fpv4-source-row"><span>${esc(label)}</span><div>${value?mentionHtml(value,assets):`<em>${esc(empty)}</em>`}</div></div>`}
function chips(c){
  const s=c.shot;
  const list=[`${Number(s.duration||0)}s`,s.shotSize||'未设景别',s.cameraMovement?`运镜 · ${s.cameraMovement}`:'运镜 · 未填写',s.lighting?`光影 · ${s.lighting}`:'光影 · 未填写'];
  return list.map(x=>`<span>${esc(x)}</span>`).join('');
}
function assetChips(c){return (c.assets||[]).map(a=>`<span class="fpv4-asset"><i>${esc(assetType(a))}</i><b>@${esc(a.name||'未命名')}</b></span>`).join('')||'<em class="fpv4-muted">无关联资产</em>'}
function promptEditor(id,type,value){
  const isImage=type==='image';
  return `<section class="fpv4-prompt-box ${type}">
    <header><div><strong>${isImage?'分镜图提示词':'视频提示词'}</strong><span>${isImage?'这一帧长什么样：主体、构图、景别、光影、资产一致性':'这几秒怎么动：动作时序、运镜、对白/音效节奏、连续性'}</span></div><small data-fpv4-count="${type}">${text(value).length} 字</small></header>
    <textarea data-fpv4-prompt="${type}" data-shot-id="${attr(id)}" spellcheck="false" placeholder="${isImage?'AI 合成后可在这里继续手动修改分镜图提示词':'AI 合成后可在这里继续手动修改视频提示词'}">${esc(value)}</textarea>
    <footer><span>可直接修改 · 自动保存</span><span class="fpv4-save-state" data-fpv4-save-state="${type}"></span></footer>
  </section>`;
}
function card(c,index){
  const s=c.shot,st=status(s),busy=st.key==='generating';
  const scriptAvailable=Boolean(text(c.node?.sourceText).trim());
  return `<article class="fpv4-card ${st.key}" data-fpv4-card="${attr(s.id)}">
    <header class="fpv4-card-head">
      <div class="fpv4-shot-id"><b>Shot ${String(s.no||index+1).padStart(2,'0')}</b><span>${Number(s.duration||0)}s</span></div>
      <div class="fpv4-status ${st.key}"><i></i>${esc(st.label)}</div>
      <div class="fpv4-ai-basis"><span>AI 合成依据</span><b>${scriptAvailable?'完整剧本':'镜头信息'}</b><b>剧情/视觉风格</b><b>镜头参数</b><b>关联资产</b></div>
      <button type="button" class="fpv4-compose-one" data-fpv4-compose="${attr(s.id)}" ${busy?'disabled':''}>${busy?'正在合成…':st.key==='ready'?'AI 重新合成':'AI 合成此镜'}</button>
    </header>
    <div class="fpv4-card-body">
      <section class="fpv4-source">
        <div class="fpv4-source-title"><strong>镜头输入</strong><span>这些内容会共同参与 AI 合成</span></div>
        <div class="fpv4-param-chips">${chips(c)}</div>
        ${sourceRow('画面描述',s.action,c.assets,'未填写画面描述')}
        ${sourceRow('对白 / 旁白',s.dialogue,c.assets,'无对白 / 旁白')}
        ${sourceRow('音效',s.sound,c.assets,'无额外音效')}
        <div class="fpv4-source-row assets"><span>关联资产</span><div class="fpv4-assets">${assetChips(c)}</div></div>
      </section>
      <section class="fpv4-editors">
        ${promptEditor(s.id,'image',s.imagePrompt)}
        ${promptEditor(s.id,'video',s.videoPrompt)}
      </section>
    </div>
  </article>`;
}
function stats(items){const out={total:items.length,ready:0,todo:0};for(const c of items){status(c.shot).key==='ready'?out.ready++:out.todo++}return out}
function page(items){
  const s=stats(items),first=items[0],data=first?.data||{},style=text(data.globalStyle?.text||data.style),script=text(first?.node?.sourceText),percent=s.total?Math.round(s.ready/s.total*100):0;
  return `<div class="fpv4-page">
    <header class="fpv4-topbar">
      <div class="fpv4-title"><strong>合成最终提示词</strong><span>AI 综合完整剧本、剧情/视觉风格、镜头参数与资产，生成可直接生产的图片 / 视频提示词</span></div>
      <div class="fpv4-progress"><span>${s.ready}/${s.total} 已完成</span><i><b style="width:${percent}%"></b></i></div>
      <button type="button" id="fpv4Bulk" ${bulkBusy||!s.total?'disabled':''}>${bulkBusy?'AI 合成中…':'AI 合成全部'}</button>
    </header>
    <section class="fpv4-contextbar">
      <label><span>剧情 / 视觉风格</span><input id="fpv4Style" value="${attr(style)}" placeholder="例如：现代都市写实短剧，轻喜剧节奏，暖色生活感，真实电影摄影"></label>
      <div class="fpv4-script-context ${script?'ok':'warn'}"><span>剧本上下文</span><b>${script?'已纳入完整剧本':'当前脚本原文为空'}</b><small>${script?`${script.length} 字 · AI 合成每个镜头时都会参考整份剧本`:'请先确认脚本原文，避免单镜头脱离剧情上下文'}</small></div>
    </section>
    <main class="fpv4-list">${items.map(card).join('')||'<div class="fpv4-empty">当前没有镜头</div>'}</main>
    <footer class="fpv4-footer"><div><strong>${s.ready===s.total&&s.total?'所有镜头提示词已就绪':`还有 ${s.todo} 个镜头需要合成或确认`}</strong><span>AI 合成后仍可直接修改；最终进入生成器的是你最后确认的版本。</span></div><button type="button" id="fpv4ToBatch" ${s.todo?'disabled':''}>进入批量生产 →</button></footer>
  </div>`;
}
function getHidden(id,type){return featureModal.querySelector(`[data-final-shot="${cssEscape(id)}"] [data-final-${type}]`)}
function savePrompt(ta){
  const id=ta.dataset.shotId,type=ta.dataset.fpv4Prompt,hidden=getHidden(id,type);if(!hidden)return;
  if(hidden.value===ta.value)return;
  hidden.readOnly=false;hidden.value=ta.value;hidden.dispatchEvent(new Event('change',{bubbles:true}));manualEdited.add(String(id));
  const card=ta.closest('.fpv4-card'),state=card?.querySelector(`[data-fpv4-save-state="${type}"]`);if(state){state.textContent='已保存';setTimeout(()=>{if(state.isConnected)state.textContent=''},900)}
}
function bind(root){
  const style=root.querySelector('#fpv4Style');if(style){let t=0;const sync=()=>{const src=featureModal.querySelector('#scriptStyle');if(src&&src.value!==style.value){src.value=style.value;src.dispatchEvent(new Event('change',{bubbles:true}))}};style.oninput=()=>{clearTimeout(t);t=setTimeout(sync,350)};style.onchange=sync}
  root.querySelectorAll('[data-fpv4-prompt]').forEach(ta=>{let t=0;ta.oninput=()=>{manualEdited.add(String(ta.dataset.shotId));const count=ta.closest('.fpv4-prompt-box')?.querySelector(`[data-fpv4-count="${ta.dataset.fpv4Prompt}"]`);if(count)count.textContent=`${ta.value.length} 字`;clearTimeout(t);t=setTimeout(()=>savePrompt(ta),450)};ta.onchange=()=>savePrompt(ta);ta.onblur=()=>savePrompt(ta)});
  root.querySelectorAll('[data-fpv4-compose]').forEach(btn=>btn.onclick=async()=>{
    const id=String(btn.dataset.fpv4Compose||'');if(!id||oneBusy.has(id))return;
    oneBusy.add(id);manualEdited.delete(id);btn.disabled=true;btn.textContent='正在合成…';
    try{if(typeof production.composeOne==='function')await production.composeOne(id,task=>{const p=Math.round(Number(task?.progress||0));btn.textContent=p?`AI 合成 ${p}%`:'AI 合成中…'});else production.openRich(id)}
    catch(e){console.error(e);btn.textContent='合成失败 · 重试'}
    finally{oneBusy.delete(id);setTimeout(()=>render(true),120)}
  });
  const bulk=root.querySelector('#fpv4Bulk');if(bulk)bulk.onclick=async()=>{if(bulkBusy)return;bulkBusy=true;bulk.disabled=true;bulk.textContent='AI 合成中…';try{await production.bulk()}catch(e){console.error(e)}finally{bulkBusy=false;setTimeout(()=>render(true),150)}};
  const next=root.querySelector('#fpv4ToBatch');if(next)next.onclick=()=>featureModal.querySelector('#scriptPromptsToBatch')?.click();
}
function capture(){const page=featureModal.querySelector('.fpv4-page'),list=page?.querySelector('.fpv4-list'),activeEl=document.activeElement;if(activeEl?.matches?.('[data-fpv4-prompt]'))return{scroll:list?.scrollTop||0,editing:true,id:activeEl.dataset.shotId,type:activeEl.dataset.fpv4Prompt,start:activeEl.selectionStart,end:activeEl.selectionEnd};return{scroll:list?.scrollTop||0}}
function restore(root,s){const list=root.querySelector('.fpv4-list');if(list)list.scrollTop=s?.scroll||0;if(!s?.editing)return;const ta=root.querySelector(`[data-fpv4-prompt="${s.type}"][data-shot-id="${cssEscape(s.id)}"]`);if(ta){ta.focus({preventScroll:true});try{ta.setSelectionRange(s.start??ta.value.length,s.end??ta.value.length)}catch{}}}
function render(force=false){
  if(rendering)return;
  const content=featureModal.querySelector('#scriptEditorContent');if(!content||!active()){featureModal.classList.remove('fpv4-prompts-active');content?.querySelector(':scope > .fpv4-page')?.remove();return}
  if(!force&&document.activeElement?.matches?.('.fpv4-page textarea,.fpv4-page input'))return;
  const items=ids().map(ctx).filter(Boolean),old=content.querySelector(':scope > .fpv4-page'),state=capture();
  rendering=true;try{featureModal.classList.add('fpv4-prompts-active');old?.remove();const wrap=document.createElement('div');wrap.innerHTML=page(items);const root=wrap.firstElementChild;content.prepend(root);bind(root);restore(root,state)}finally{rendering=false}
}
function schedule(force=false){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(force),60)}
const observer=new MutationObserver(muts=>{if(muts.some(m=>{const t=m.target instanceof Element?m.target:m.target?.parentElement;return !t?.closest?.('.fpv4-page')}))schedule()});
observer.observe(featureModal,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
featureModal.addEventListener('click',e=>{if(e.target.closest('[data-script-tab]'))setTimeout(()=>render(true),50)},true);
setInterval(()=>{if(active()&&!document.activeElement?.matches?.('.fpv4-page textarea,.fpv4-page input'))render()},1800);
schedule(true);

globalThis.FuietFinalPromptWorkbenchV4=Object.freeze({version:4,render,status});
})();
