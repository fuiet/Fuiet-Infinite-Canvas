/* Fuiet Agent · top-right entry / right workspace surface
 * Keeps the existing Agent engine in app.js, but makes its panel independent
 * from unrelated canvas-render failures. If app.js cannot reach renderAgentPanel(),
 * a recovery shell is shown instead of an empty right-side surface.
 */
(()=>{
'use strict';
const app=document.querySelector('#app');
const panel=document.querySelector('#agentPanel');
const agentButton=document.querySelector('#agentBtn');
const settingsButton=document.querySelector('#settingsBtn');
const nodeLayer=document.querySelector('#nodeLayer');
if(!app||!panel||!agentButton)return;

const AGENT_STATE_KEY='canvas-studio-agent-state-v1';
let panelObserver=null;
let appObserver=null;
let patchQueued=false;
let clickStartedOpen=null;
let recoveryQueued=false;

const typeIcon={text:'▤',script:'▥',image:'▧',video:'▶',audio:'♪',director:'◇'};
const recoverySkills=[
  {id:'story-script',title:'故事脚本生成',sub:'剧本 / 分镜 / 资产'},
  {id:'character-three-view',title:'角色三视图',sub:'角色设定与一致性'},
  {id:'reference-video',title:'全能参考生视频',sub:'首帧 / 参考图驱动'},
  {id:'smart-edit',title:'智能剪辑',sub:'排序 / 拼接 / 混剪'}
];

function escapeHtml(value){return String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch))}
function readStoredState(){
  try{
    const raw=globalThis.CanvasBrowserStorageManager?.getItem?.(AGENT_STATE_KEY);
    const parsed=raw?JSON.parse(raw):{};
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch{return{}}
}
function writeStoredState(patch){
  try{
    const next={...readStoredState(),...patch};
    globalThis.CanvasBrowserStorageManager?.setItem?.(AGENT_STATE_KEY,JSON.stringify(next));
    return next;
  }catch{return patch||{}}
}

function placeAgentButton(){
  document.querySelector('#agentLeftRail')?.remove();
  agentButton.removeAttribute('aria-hidden');
  agentButton.setAttribute('aria-label','Agent');
  agentButton.title='Agent';
  if(settingsButton?.parentElement&&agentButton.previousElementSibling!==settingsButton){
    settingsButton.insertAdjacentElement('afterend',agentButton);
  }
}

function selectedNodeContexts(){
  if(!nodeLayer)return[];
  const seen=new Set();
  return [...nodeLayer.querySelectorAll('.node.selected,.node.multi-selected')].map(el=>{
    const id=String(el.dataset.id||'');
    if(!id||seen.has(id))return null;
    seen.add(id);
    const title=String(el.querySelector('.node-title-stack b')?.textContent||el.dataset.nodeType||'节点').trim();
    const type=String(el.dataset.nodeType||'node');
    return{id,title,type};
  }).filter(Boolean).slice(0,6);
}
function skillContext(){
  const active=panel.querySelector('.agent-skill-card.active .agent-skill-copy b');
  return active?String(active.textContent||'').trim():'';
}
function contextStripHtml(){
  const nodes=selectedNodeContexts();
  const skill=skillContext();
  const nodeHtml=nodes.map(n=>`<span class="agent-context-chip-v2" title="当前画布上下文"><i>${typeIcon[n.type]||'◇'}</i><b>${escapeHtml(n.title)}</b></span>`).join('');
  const skillHtml=skill?`<span class="agent-context-chip-v2 skill" title="当前 Skill"><i>◇</i><b>${escapeHtml(skill)}</b></span>`:'';
  return nodeHtml+skillHtml||'<span class="agent-context-empty-v2">选中画布节点后，会自动带入 Agent 上下文</span>';
}

function relabelPanel(){
  const title=panel.querySelector('.agent-title b');
  if(title&&!String(title.textContent||'').trim())title.textContent='新对话';
  const skillTitle=panel.querySelector('.agent-skills-head b');
  if(skillTitle&&skillTitle.textContent!=='一个 Skill，一部作品')skillTitle.textContent='一个 Skill，一部作品';
  const shuffle=panel.querySelector('.agent-skills-head [data-agent-skill="shuffle"] span');
  if(shuffle&&shuffle.textContent!=='换一批')shuffle.textContent='换一批';
  const footer=panel.querySelector('.agent-footer span');
  if(footer&&footer.textContent!=='Fuiet Agent · 画布全局执行器')footer.textContent='Fuiet Agent · 画布全局执行器';
}
function enhanceComposer(){
  const composer=panel.querySelector('.agent-composer');
  if(!composer)return;
  let strip=composer.querySelector('.agent-context-strip-v2');
  if(!strip){
    strip=document.createElement('div');
    strip.className='agent-context-strip-v2';
    composer.insertBefore(strip,composer.firstChild);
  }
  const html=contextStripHtml();
  if(strip.innerHTML!==html)strip.innerHTML=html;
  const textarea=panel.querySelector('#agentDraft');
  if(textarea&&textarea.placeholder!=='给 Agent 一个任务，或用 @ 引用节点 / 资源…')textarea.placeholder='给 Agent 一个任务，或用 @ 引用节点 / 资源…';
  panel.querySelector('[data-agent-bottom="send"]')?.setAttribute('aria-label','发送给 Agent');
  const tips={add:'添加节点',context:'引用当前画布上下文',tasks:'任务中心',clear:'新对话'};
  Object.entries(tips).forEach(([key,title])=>{const el=panel.querySelector(`[data-agent-bottom="${key}"]`);if(el)el.title=title});
}
function patchPanel(){
  patchQueued=false;
  panelObserver?.disconnect();
  try{
    panel.classList.add('agent-left-v2');
    relabelPanel();
    enhanceComposer();
  }finally{panelObserver?.observe(panel,{childList:true,subtree:true})}
}
function queuePatch(){if(patchQueued)return;patchQueued=true;queueMicrotask(patchPanel)}

function recoveryMessage(text){
  const log=panel.querySelector('.agent-recovery-shell .agent-log');
  if(!log)return;
  const row=document.createElement('div');
  row.className='agent-message assistant';
  row.innerHTML=`<div class="agent-avatar">A</div><div class="agent-bubble"><b>Agent</b><p>${escapeHtml(text)}</p></div>`;
  log.appendChild(row);
  log.scrollTop=log.scrollHeight;
}
function renderRecoveryPanel(){
  if(panel.childElementCount>0)return false;
  const stored=readStoredState();
  const selectedId=stored.selectedSkillId||'story-script';
  panel.innerHTML=`<div class="agent-recovery-shell">
    <div class="agent-head"><div class="agent-title"><b>${escapeHtml(stored.chatTitle||'新对话')}</b><span>Agent 恢复模式</span></div><div class="agent-head-actions"><button type="button" data-recovery-new title="新对话">＋</button><button type="button" data-recovery-tasks title="任务中心">◷</button><button type="button" data-recovery-close title="收起">×</button></div></div>
    <div class="agent-body"><div class="agent-log"><div class="agent-empty">Agent 面板已恢复。画布主渲染如果短暂中断，不会再出现整块空白。</div><div class="agent-message assistant"><div class="agent-avatar">A</div><div class="agent-bubble"><b>Agent</b><p>选择一个 Skill，或直接输入你的创作需求。当前选中的画布节点会自动作为上下文。</p></div></div></div>
    <div class="agent-skills"><div class="agent-skills-head"><b>一个 Skill，一部作品</b><button type="button" data-recovery-retry>↻ 重新连接</button></div><div class="agent-skill-grid">${recoverySkills.map(s=>`<button type="button" class="agent-skill-card ${selectedId===s.id?'active':''}" data-recovery-skill="${s.id}"><span class="agent-skill-icon">◇</span><span class="agent-skill-copy"><b>${escapeHtml(s.title)}</b><span>${escapeHtml(s.sub)}</span></span></button>`).join('')}</div></div></div>
    <div class="agent-composer"><div class="agent-context-strip-v2">${contextStripHtml()}</div><div class="agent-input"><textarea id="agentDraft" placeholder="给 Agent 一个任务，或用 @ 引用节点 / 资源…">${escapeHtml(stored.draft||'')}</textarea><div class="agent-input-footer"><div class="agent-input-actions"><button type="button" data-recovery-add title="添加节点">＋</button><button type="button" data-recovery-context title="引用上下文">◇</button><button type="button" data-recovery-tasks title="任务中心">◷</button></div><button type="button" class="agent-send" data-recovery-send aria-label="发送给 Agent">↑</button></div></div></div>
  </div>`;
  bindRecoveryPanel();
  queuePatch();
  return true;
}
function tryNativeRender(){
  try{window.dispatchEvent(new Event('resize'))}catch{}
}
function bindRecoveryPanel(){
  const draft=panel.querySelector('#agentDraft');
  draft?.addEventListener('input',()=>writeStoredState({draft:draft.value}));
  panel.querySelector('[data-recovery-close]')?.addEventListener('click',()=>applyVisualOpen(false));
  panel.querySelector('[data-recovery-new]')?.addEventListener('click',()=>{
    writeStoredState({draft:'',chatTitle:'新对话',messages:[]});
    if(draft)draft.value='';
    const log=panel.querySelector('.agent-log');
    if(log)log.innerHTML='<div class="agent-empty">新对话已建立。</div>';
  });
  panel.querySelectorAll('[data-recovery-tasks]').forEach(b=>b.addEventListener('click',()=>document.querySelector('#taskBtn')?.click()));
  panel.querySelector('[data-recovery-add]')?.addEventListener('click',()=>document.querySelector('#bottomDock [data-dock-action="add"]')?.click());
  panel.querySelector('[data-recovery-context]')?.addEventListener('click',()=>{
    const strip=panel.querySelector('.agent-context-strip-v2');if(strip)strip.innerHTML=contextStripHtml();
  });
  panel.querySelectorAll('[data-recovery-skill]').forEach(b=>b.addEventListener('click',()=>{
    writeStoredState({selectedSkillId:b.dataset.recoverySkill});
    panel.querySelectorAll('[data-recovery-skill]').forEach(x=>x.classList.toggle('active',x===b));
  }));
  panel.querySelector('[data-recovery-retry]')?.addEventListener('click',()=>{
    panel.innerHTML='';
    tryNativeRender();
    setTimeout(()=>{if(!panel.childElementCount){renderRecoveryPanel();recoveryMessage('主 Agent 渲染仍未完成，已继续使用恢复面板。')}} ,80);
  });
  const submit=()=>{
    const text=String(draft?.value||'').trim();
    if(!text)return;
    writeStoredState({draft:text});
    /* Ask the native Agent renderer to reconnect first. When it succeeds, its
       own Ctrl/Cmd+Enter handler runs agentSubmitDraft(), preserving the real engine. */
    panel.innerHTML='';
    tryNativeRender();
    setTimeout(()=>{
      const nativeDraft=panel.querySelector('#agentDraft');
      const isRecovery=Boolean(panel.querySelector('.agent-recovery-shell'));
      if(nativeDraft&&!isRecovery){
        nativeDraft.value=text;
        nativeDraft.dispatchEvent(new Event('input',{bubbles:true}));
        nativeDraft.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',ctrlKey:true,bubbles:true,cancelable:true}));
        return;
      }
      if(!panel.childElementCount)renderRecoveryPanel();
      const restored=panel.querySelector('#agentDraft');if(restored)restored.value=text;
      recoveryMessage('Agent 执行器尚未完成重新连接。输入内容已保留，没有丢失；请点击“重新连接”后再发送。');
    },90);
  };
  panel.querySelector('[data-recovery-send]')?.addEventListener('click',submit);
  draft?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();submit()}});
}

function ensurePanelReady(){
  if(recoveryQueued||!app.classList.contains('agent-open'))return;
  recoveryQueued=true;
  /* First let app.js finish its native click/render cycle. */
  queueMicrotask(()=>{
    if(!panel.childElementCount)tryNativeRender();
    requestAnimationFrame(()=>{
      if(app.classList.contains('agent-open')&&!panel.childElementCount)renderRecoveryPanel();
      recoveryQueued=false;
      queuePatch();
    });
  });
}

function applyVisualOpen(open){
  app.classList.toggle('agent-open',Boolean(open));
  agentButton.setAttribute('aria-expanded',open?'true':'false');
  agentButton.classList.toggle('active',Boolean(open));
  if(open){
    panel.style.opacity='1';
    panel.style.pointerEvents='auto';
    ensurePanelReady();
    setTimeout(()=>panel.querySelector('#agentDraft')?.focus(),60);
  }else{
    panel.style.removeProperty('opacity');
    panel.style.removeProperty('pointer-events');
    const stored=readStoredState();writeStoredState({...stored,open:false});
  }
}
function syncOpenState(){
  placeAgentButton();
  const open=app.classList.contains('agent-open');
  agentButton.setAttribute('aria-expanded',open?'true':'false');
  agentButton.classList.toggle('active',open);
  if(open)ensurePanelReady();
  else{panel.style.removeProperty('opacity');panel.style.removeProperty('pointer-events')}
  queuePatch();
}
function refreshContextAfterCanvasChange(){
  if(!app.classList.contains('agent-open'))return;
  const strip=panel.querySelector('.agent-context-strip-v2');if(strip)strip.innerHTML=contextStripHtml();
}

/* app.js owns Agent state. We only verify that the click resulted in a usable
   panel. This fallback never replaces a successfully rendered native Agent. */
agentButton.addEventListener('click',()=>{clickStartedOpen=app.classList.contains('agent-open')},{capture:true});
agentButton.addEventListener('click',()=>{
  const started=clickStartedOpen;
  queueMicrotask(()=>{
    if(started===null)return;
    const current=app.classList.contains('agent-open');
    if(current===started)applyVisualOpen(!started);
    else if(current)ensurePanelReady();
    clickStartedOpen=null;
  });
});

placeAgentButton();
panelObserver=new MutationObserver(()=>{queuePatch();if(app.classList.contains('agent-open')&&!panel.childElementCount)ensurePanelReady()});
panelObserver.observe(panel,{childList:true,subtree:true});
appObserver=new MutationObserver(syncOpenState);
appObserver.observe(app,{attributes:true,attributeFilter:['class']});
nodeLayer&&new MutationObserver(refreshContextAfterCanvasChange).observe(nodeLayer,{attributes:true,subtree:true,attributeFilter:['class']});
syncOpenState();
})();