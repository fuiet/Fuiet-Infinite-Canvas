/* Fuiet Script · Final Prompt Page V3
 * Clean production UI for the prompt-composition stage.
 * Keeps the original prompt DOM hidden as the canonical state bridge, while
 * presenting a single uncluttered, scroll-safe table and compact controls.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
const base=globalThis.FuietFinalPromptWorkflowV2;
const production=globalThis.FuietFinalPromptProduction;
if(!featureModal||!base||!production)return;

const text=v=>String(v??'');
const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x).trim()).filter(Boolean))];
let filter='all';
let bulkBusy=false;
let rendering=false;
let refreshTimer=0;

function activePromptTab(){return Boolean(featureModal.querySelector('[data-script-tab="prompts"].active')&&featureModal.querySelector('.final-prompt-list'))}
function sourceCards(){return [...featureModal.querySelectorAll('.final-prompt-list [data-final-shot]')]}
function sourceShotIds(){return sourceCards().map(x=>x.dataset.finalShot).filter(Boolean)}
function ctxFor(id){try{return base.shotContext(id)}catch{return null}}
function currentData(){const id=sourceShotIds()[0];return id?ctxFor(id)?.data:null}
function statusOf(shot){
  if(!shot)return{key:'pending',label:'待合成'};
  if(shot.promptDirty||shot.promptStatus==='dirty')return{key:'dirty',label:'需要重新合成'};
  if(shot.promptStatus==='error')return{key:'error',label:'合成失败'};
  if(text(shot.imagePrompt).trim()&&text(shot.videoPrompt).trim())return{key:'ready',label:'已完成'};
  return{key:'pending',label:'待合成'};
}
function assetTypeLabel(a){const t=text(a?.assetType||a?.type).toLowerCase();if(t.includes('char'))return'角色';if(t.includes('scene'))return'场景';return'道具'}
function assetChips(ctx){
  const list=ctx?.assets||[];
  if(!list.length)return'<span class="fpv3-no-assets">无显式资产</span>';
  const shown=list.slice(0,4).map(a=>`<span class="fpv3-asset-chip ${esc(assetTypeLabel(a))}"><i>${esc(assetTypeLabel(a))}</i>@${esc(a.name||'未命名')}</span>`).join('');
  return shown+(list.length>4?`<span class="fpv3-more-assets">+${list.length-4}</span>`:'');
}
function shotSummary(shot){
  const action=text(shot?.action).trim()||'尚未填写画面描述';
  const camera=text(shot?.cameraMovement).trim();
  const lighting=text(shot?.lighting).trim();
  return `<div class="fpv3-shot-main">${esc(action)}</div><div class="fpv3-shot-meta">${[camera&&`运镜：${camera}`,lighting&&`光影：${lighting}`].filter(Boolean).map(esc).join(' · ')||'未补充运镜 / 光影信息'}</div>`;
}
function matchesFilter(st){if(filter==='all')return true;if(filter==='ready')return st.key==='ready';if(filter==='todo')return st.key!=='ready';return true}
function stats(items){const out={total:items.length,ready:0,dirty:0,pending:0,error:0};for(const x of items){const k=statusOf(x.ctx?.shot).key;if(k in out)out[k]++;else out.pending++}out.todo=out.total-out.ready;return out}
function rowHtml(item){
  const ctx=item.ctx,shot=ctx.shot,st=statusOf(shot);if(!matchesFilter(st))return'';
  const action=st.key==='ready'?'查看 / 编辑':st.key==='dirty'?'重新合成':'合成提示词';
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
    <section class="fpv3-hero">
      <div class="fpv3-title-block">
        <div class="fpv3-eyebrow">第 3 步</div>
        <h2>合成最终提示词</h2>
        <p>把当前 Shot、关联角色 / 场景 / 道具与整体风格编译成生产级分镜提示词和视频运动提示词。</p>
      </div>
      <div class="fpv3-hero-actions">
        <div class="fpv3-progress-card" aria-label="提示词完成进度">
          <div><strong>${s.ready}</strong><span>/ ${s.total} 已完成</span></div>
          <div class="fpv3-progress-track"><i style="width:${percent}%"></i></div>
        </div>
        <button type="button" id="fpv3BulkCompose" class="fpv3-primary" ${bulkBusy?'disabled':''}>${bulkBusy?'正在合成…':'一键合成全部提示词'}</button>
      </div>
    </section>

    <section class="fpv3-stylebar">
      <div class="fpv3-style-label"><span>整体视觉风格</span><small>修改后相关 Shot 会自动标记为需要重新合成</small></div>
      <input id="fpv3StyleInput" value="${esc(style)}" placeholder="例如：2026 现代都市、真人写实电影感、35mm 胶片、暖红与冷灰色基调…">
    </section>

    <section class="fpv3-toolbar">
      <div class="fpv3-filters" role="tablist" aria-label="提示词状态筛选">
        <button type="button" data-fpv3-filter="all" class="${filter==='all'?'active':''}">全部 <b>${s.total}</b></button>
        <button type="button" data-fpv3-filter="todo" class="${filter==='todo'?'active':''}">待处理 <b>${s.todo}</b></button>
        <button type="button" data-fpv3-filter="ready" class="${filter==='ready'?'active':''}">已完成 <b>${s.ready}</b></button>
      </div>
      <div class="fpv3-toolbar-note">点击任意镜头右侧按钮，可查看、编辑或单独重新合成。</div>
    </section>

    <section class="fpv3-table-shell">
      <table class="fpv3-table">
        <thead><tr><th>镜号</th><th>时长</th><th>镜头内容</th><th>关联资产</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${items.map(rowHtml).join('')||'<tr><td colspan="6"><div class="fpv3-empty">当前筛选下没有镜头</div></td></tr>'}</tbody>
      </table>
    </section>

    <footer class="fpv3-footer">
      <div class="fpv3-footer-summary">
        <span class="fpv3-status-dot ${s.todo?'warning':'ready'}"></span>
        <div><strong>${s.ready}/${s.total} 个镜头生产提示词已就绪</strong><small>${s.todo?`还有 ${s.todo} 个镜头需要处理后才能进入批量生产。`:'全部提示词已完成，可以进入下一步。'}</small></div>
      </div>
      <button type="button" id="fpv3ToBatch" class="fpv3-next" ${s.todo?'disabled':''}>进入批量生产 <span>→</span></button>
    </footer>
  </div>`;
}
function collectItems(){return sourceShotIds().map(id=>({id,ctx:ctxFor(id)})).filter(x=>x.ctx?.shot)}
function syncStyle(value){
  const source=featureModal.querySelector('#scriptStyle');if(!source)return;
  if(source.value===value)return;source.value=value;source.dispatchEvent(new Event('change',{bubbles:true}));
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
      featureModal.classList.remove('fpv3-prompts-active');
      content?.classList.remove('fpv3-content-active');
      return;
    }
    featureModal.classList.add('fpv3-prompts-active');content.classList.add('fpv3-content-active');
    const items=collectItems();let page=content.querySelector(':scope > .fpv3-page');if(page)page.remove();
    const wrap=document.createElement('div');wrap.innerHTML=pageHtml(items);page=wrap.firstElementChild;content.prepend(page);bind(page);
  }finally{rendering=false}
}
function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(render,40)}

const observer=new MutationObserver(schedule);observer.observe(featureModal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
featureModal.addEventListener('change',schedule,true);featureModal.addEventListener('input',e=>{if(e.target?.matches('[data-final-image],[data-final-video]'))schedule()},true);
featureModal.addEventListener('click',e=>{if(e.target.closest('[data-script-tab]'))setTimeout(render,40)},true);
setInterval(()=>{if(activePromptTab()&&!document.querySelector('.fpv2-overlay'))schedule()},1500);
schedule();

globalThis.FuietFinalPromptPageV3=Object.freeze({version:3,render});
})();
