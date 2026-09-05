/* Fuiet Script · Final Prompt Page V3
 * Compact production UI for the prompt-composition stage.
 * The legacy prompt DOM remains the canonical bridge; this layer only presents
 * one clean table, one batch action and one production footer.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const base=globalThis.FuietFinalPromptWorkflowV2;
const production=globalThis.FuietFinalPromptProduction;
if(!featureModal||!base||!production)return;

const text=v=>String(v??'');
const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let filter='all';
let bulkBusy=false;
let rendering=false;
let refreshTimer=0;

function activePromptTab(){return Boolean(featureModal.querySelector('[data-script-tab="prompts"].active')&&featureModal.querySelector('.final-prompt-list'))}
function sourceShotIds(){return [...featureModal.querySelectorAll('.final-prompt-list [data-final-shot]')].map(x=>x.dataset.finalShot).filter(Boolean)}
function ctxFor(id){try{return base.shotContext(id)}catch{return null}}
function statusOf(shot){
  if(!shot)return{key:'pending',label:'待合成'};
  if(shot.promptStatus==='error')return{key:'error',label:'合成失败'};
  if(shot.promptDirty||shot.promptStatus==='dirty')return{key:'dirty',label:'需要重新合成'};
  if(text(shot.imagePrompt).trim()&&text(shot.videoPrompt).trim())return{key:'ready',label:'已完成'};
  return{key:'pending',label:'待合成'};
}
function assetTypeLabel(a){const t=text(a?.assetType||a?.type).toLowerCase();if(t.includes('char'))return'角色';if(t.includes('scene'))return'场景';return'道具'}
function assetChips(ctx){
  const list=ctx?.assets||[];
  if(!list.length)return'<span class="fpv3-no-assets">无关联资产</span>';
  const shown=list.slice(0,5).map(a=>`<span class="fpv3-asset-chip"><i>${esc(assetTypeLabel(a))}</i><b>@${esc(a.name||'未命名')}</b></span>`).join('');
  return shown+(list.length>5?`<span class="fpv3-more-assets">+${list.length-5}</span>`:'');
}
function shotSummary(shot){
  const action=text(shot?.action).trim()||'尚未填写画面描述';
  const meta=[shot?.shotSize&&`景别：${shot.shotSize}`,shot?.cameraMovement&&`运镜：${shot.cameraMovement}`,shot?.lighting&&`光影：${shot.lighting}`].filter(Boolean).join(' · ');
  return `<div class="fpv3-shot-main">${esc(action)}</div><div class="fpv3-shot-meta">${esc(meta||'镜头规格待补充')}</div>`;
}
function matchesFilter(st){if(filter==='ready')return st.key==='ready';if(filter==='todo')return st.key!=='ready';return true}
function stats(items){
  const out={total:items.length,ready:0,dirty:0,pending:0,error:0};
  for(const item of items){const k=statusOf(item.ctx?.shot).key;if(k in out)out[k]++;else out.pending++}
  out.todo=out.total-out.ready;return out;
}
function rowHtml(item){
  const {ctx}=item,shot=ctx.shot,st=statusOf(shot);if(!matchesFilter(st))return'';
  const action=st.key==='ready'?'查看编辑':st.key==='dirty'?'重新合成':st.key==='error'?'重新合成':'合成提示词';
  return `<tr class="fpv3-row ${st.key}" data-fpv3-row="${esc(shot.id)}">
    <td class="fpv3-no"><strong>${Number(shot.no||ctx.index+1)}</strong></td>
    <td class="fpv3-duration"><strong>${Number(shot.duration||0)}</strong><span>秒</span></td>
    <td class="fpv3-summary">${shotSummary(shot)}</td>
    <td class="fpv3-assets"><div class="fpv3-assets-wrap">${assetChips(ctx)}</div></td>
    <td class="fpv3-status-cell"><span class="fpv3-status ${st.key}"><i></i>${esc(st.label)}</span></td>
    <td class="fpv3-action-cell"><button type="button" data-fpv3-open="${esc(shot.id)}" class="fpv3-row-action ${st.key==='ready'?'secondary':'primary'}">${esc(action)}</button></td>
  </tr>`;
}
function pageHtml(items){
  const s=stats(items),data=items[0]?.ctx?.data||{},style=text(data.globalStyle?.text||data.style),percent=s.total?Math.round(s.ready/s.total*100):0;
  return `<div class="fpv3-page">
    <header class="fpv3-commandbar">
      <div class="fpv3-command-title"><strong>最终提示词</strong><span>${s.ready}/${s.total} 已完成</span></div>
      <div class="fpv3-progress-track" aria-label="提示词完成进度"><i style="width:${percent}%"></i></div>
      <button type="button" id="fpv3BulkCompose" class="fpv3-primary" ${bulkBusy?'disabled':''}>${bulkBusy?'正在合成…':'一键合成全部提示词'}</button>
    </header>

    <section class="fpv3-stylebar">
      <label for="fpv3StyleInput"><strong>整体视觉风格</strong><span>修改后会标记相关镜头为需要重新合成</span></label>
      <input id="fpv3StyleInput" value="${esc(style)}" placeholder="例如：2026 现代都市、真人写实电影感、35mm 胶片、暖红与冷灰色基调…">
    </section>

    <section class="fpv3-toolbar">
      <div class="fpv3-filters" role="tablist" aria-label="提示词状态筛选">
        <button type="button" data-fpv3-filter="all" class="${filter==='all'?'active':''}">全部 <b>${s.total}</b></button>
        <button type="button" data-fpv3-filter="todo" class="${filter==='todo'?'active':''}">待处理 <b>${s.todo}</b></button>
        <button type="button" data-fpv3-filter="ready" class="${filter==='ready'?'active':''}">已完成 <b>${s.ready}</b></button>
      </div>
      <span class="fpv3-toolbar-note">镜头内容只显示摘要；完整分镜图 / 视频运动提示词在“查看编辑”中处理。</span>
    </section>

    <section class="fpv3-table-shell">
      <table class="fpv3-table">
        <thead><tr><th>镜号</th><th>时长</th><th>镜头内容</th><th>关联资产</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${items.map(rowHtml).join('')||'<tr><td colspan="6"><div class="fpv3-empty">当前筛选下没有镜头</div></td></tr>'}</tbody>
      </table>
    </section>

    <footer class="fpv3-footer">
      <div class="fpv3-footer-summary"><span class="fpv3-status-dot ${s.todo?'warning':'ready'}"></span><div><strong>${s.ready}/${s.total} 个镜头生产提示词已就绪</strong><small>${s.todo?`还有 ${s.todo} 个镜头需要处理`:'全部提示词已完成'}</small></div></div>
      <button type="button" id="fpv3ToBatch" class="fpv3-next" ${s.todo?'disabled':''}>进入批量生产 <span>→</span></button>
    </footer>
  </div>`;
}
function collectItems(){return sourceShotIds().map(id=>({id,ctx:ctxFor(id)})).filter(x=>x.ctx?.shot)}
function syncStyle(value){
  const source=featureModal.querySelector('#scriptStyle');if(!source||source.value===value)return;
  source.value=value;source.dispatchEvent(new Event('change',{bubbles:true}));
}
function bind(page){
  page.querySelectorAll('[data-fpv3-open]').forEach(btn=>btn.onclick=e=>{e.preventDefault();production.openRich(btn.dataset.fpv3Open)});
  page.querySelectorAll('[data-fpv3-filter]').forEach(btn=>btn.onclick=()=>{filter=btn.dataset.fpv3Filter||'all';render()});
  const style=page.querySelector('#fpv3StyleInput');if(style){let timer=0;style.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>syncStyle(style.value),350)};style.onchange=()=>syncStyle(style.value)}
  const bulk=page.querySelector('#fpv3BulkCompose');if(bulk)bulk.onclick=async()=>{if(bulkBusy)return;bulkBusy=true;render();try{await production.bulk()}finally{bulkBusy=false;setTimeout(render,120)}};
  const next=page.querySelector('#fpv3ToBatch');if(next)next.onclick=()=>featureModal.querySelector('#scriptPromptsToBatch')?.click();
}
function render(){
  if(rendering)return;rendering=true;
  try{
    const content=featureModal.querySelector('#scriptEditorContent');
    if(!content||!activePromptTab()){
      featureModal.classList.remove('fpv3-prompts-active');content?.classList.remove('fpv3-content-active');return;
    }
    featureModal.classList.add('fpv3-prompts-active');content.classList.add('fpv3-content-active');
    const items=collectItems();content.querySelector(':scope > .fpv3-page')?.remove();
    const wrap=document.createElement('div');wrap.innerHTML=pageHtml(items);const page=wrap.firstElementChild;content.prepend(page);bind(page);
  }finally{rendering=false}
}
function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(render,40)}

const observer=new MutationObserver(schedule);observer.observe(featureModal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
featureModal.addEventListener('change',schedule,true);
featureModal.addEventListener('input',e=>{if(e.target?.matches('[data-final-image],[data-final-video]'))schedule()},true);
featureModal.addEventListener('click',e=>{if(e.target.closest('[data-script-tab]'))setTimeout(render,40)},true);
setInterval(()=>{if(activePromptTab()&&!document.querySelector('.fpv2-overlay'))schedule()},1500);
schedule();

globalThis.FuietFinalPromptPageV3=Object.freeze({version:3,render,statusOf});
})();
