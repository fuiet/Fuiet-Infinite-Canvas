/* Fuiet Agent · top-right entry / right workspace surface
 * app.js remains the native Agent engine. This layer guarantees that opening
 * Agent always renders a usable panel, even when the main canvas render aborts.
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
let ensuring=false;
let internalToggle=false;
let clickStartedOpen=null;

const typeIcon={text:'▤',script:'▥',image:'▧',video:'▶',audio:'♪',director:'◇'};
const recoverySkills=[
  {id:'story-script',title:'故事脚本生成',sub:'剧本 / 分镜 / 资产'},
  {id:'character-three-view',title:'角色三视图',sub:'角色设定与一致性'},
  {id:'reference-video',title:'全能参考生视频',sub:'首帧 / 参考图驱动'},
  {id:'smart-edit',title:'智能剪辑',sub:'排序 / 拼接 / 混剪'}
];

function escapeHtml(value){return String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]||ch))}
function readStoredState(){
  try{const raw=globalThis.CanvasBrowserStorageManager?.getItem?.(AGENT_STATE_KEY);const parsed=raw?JSON.parse(raw):{};return parsed&&typeof parsed==='object'?parsed:{}}catch{return{}}
}
function writeStoredState(patch){
  try{const next={...readStoredState(),...patch};globalThis.CanvasBrowserStorageManager?.setItem?.(AGENT_STATE_KEY,JSON.stringify(next));return next}catch{return patch||{}}
}
function forceViewportPanelStyles(){
  const set=(name,value)=>panel.style.setProperty(name,value,'important');
  set('position','fixed');
  set('top','0');
  set('right','0');
  set('bottom','0');
  set('left','auto');
  set('width',window.innerWidth<=820?'min(404px, 92vw)':'404px');
  set('height','100dvh');
  set('max-height','none');
  set('margin','0');
  set('z-index','10000');
  set('border-top','0');
  if(app.classList.contains('agent-open')){
    set('transform','translateX(0)');
    set('opacity','1');
    set('pointer-events','auto');
  }else{
    set('transform','translateX(100%)');
    set('pointer-events','none');
  }
}
function placeAgentButton(){
  document.querySelector('#agentLeftRail')?.remove();
  agentButton.removeAttribute('aria-hidden');agentButton.setAttribute('aria-label','Agent');agentButton.title='Agent';
  if(settingsButton?.parentElement&&settingsButton.nextElementSibling!==agentButton)settingsButton.insertAdjacentElement('afterend',agentButton);
}
function selectedNodeContexts(){
  if(!nodeLayer)return[];const seen=new Set();
  return [...nodeLayer.querySelectorAll('.node.selected,.node.multi-selected')].map(el=>{const id=String(el.dataset.id||'');if(!id||seen.has(id))return null;seen.add(id);const title=String(el.querySelector('.node-title-stack b,.node-title b,.node-title')?.textContent||el.dataset.nodeType||'节点').trim();const type=String(el.dataset.nodeType||'node');return{id,title,type}}).filter(Boolean).slice(0,6);
}
function skillContext(){const active=panel.querySelector('.agent-skill-card.active .agent-skill-copy b');return active?String(active.textContent||'').trim():''}
function contextStripHtml(){
  const nodes=selectedNodeContexts(),skill=skillContext();
  const nodeHtml=nodes.map(n=>`<span class="agent-context-chip-v2" title="当前画布上下文"><i>${typeIcon[n.type]||'◇'}</i><b>${escapeHtml(n.title)}</b></span>`).join('');
  const skillHtml=skill?`<span class="agent-context-chip-v2 skill" title="当前 Skill"><i>◇</i><b>${escapeHtml(skill)}</b></span>`:'';
  return nodeHtml+skillHtml||'<span class="agent-context-empty-v2">选中画布节点后，会自动带入 Agent 上下文</span>';
}
function panelMeaningful(){
  if(!panel.childElementCount)return false;
  if(panel.querySelector('.agent-recovery-shell'))return true;
  const structural=panel.querySelector('.agent-head')&&panel.querySelector('.agent-composer')&&panel.querySelector('#agentDraft');
  const text=String(panel.textContent||'').replace(/\s+/g,'').trim();
  return Boolean(structural&&text.length>=4);
}
function relabelNativePanel(){
  const title=panel.querySelector('.agent-title b');if(title&&!String(title.textContent||'').trim())title.textContent='新对话';
  const skillTitle=panel.querySelector('.agent-skills-head b');if(skillTitle)skillTitle.textContent='一个 Skill，一部作品';
  const shuffle=panel.querySelector('.agent-skills-head [data-agent-skill="shuffle"] span');if(shuffle)shuffle.textContent='换一批';
  const footer=panel.querySelector('.agent-footer span');if(footer)footer.textContent='Fuiet Agent · 画布全局执行器';
}
function enhanceComposer(){
  const composer=panel.querySelector('.agent-composer');if(!composer)return;
  let strip=composer.querySelector('.agent-context-strip-v2');if(!strip){strip=document.createElement('div');strip.className='agent-context-strip-v2';composer.insertBefore(strip,composer.firstChild)}
  const html=contextStripHtml();if(strip.innerHTML!==html)strip.innerHTML=html;
  const textarea=panel.querySelector('#agentDraft');if(textarea)textarea.placeholder='给 Agent 一个任务，或用 @ 引用节点 / 资源…';
  panel.querySelector('[data-agent-bottom="send"]')?.setAttribute('aria-label','发送给 Agent');
}
function patchPanel(){
  patchQueued=false;panelObserver?.disconnect();
  try{panel.classList.add('agent-left-v2');forceViewportPanelStyles();if(panelMeaningful()){relabelNativePanel();enhanceComposer()}}
  finally{panelObserver?.observe(panel,{childList:true,subtree:true})}
}
function queuePatch(){if(patchQueued)return;patchQueued=true;queueMicrotask(patchPanel)}

function recoveryMessage(text,role='assistant'){
  const log=panel.querySelector('.agent-recovery-shell .agent-log');if(!log)return;
  const row=document.createElement('div');row.className=`agent-message ${role==='user'?'user':'assistant'}`;
  row.innerHTML=`<div class="agent-avatar">${role==='user'?'我':'A'}</div><div class="agent-bubble"><b>${role==='user'?'你':'Agent'}</b><p>${escapeHtml(text)}</p></div>`;
  log.appendChild(row);log.scrollTop=log.scrollHeight;
}
function renderRecoveryPanel(force=false){
  if(!force&&panelMeaningful())return false;
  const stored=readStoredState(),selectedId=stored.selectedSkillId||'story-script';
  panel.innerHTML=`<div class="agent-recovery-shell" data-agent-recovery="1">
    <div class="agent-head"><div class="agent-title"><b>${escapeHtml(stored.chatTitle||'新对话')}</b><span>Agent</span></div><div class="agent-head-actions"><button type="button" data-recovery-new title="新对话">＋</button><button type="button" data-recovery-tasks title="任务中心">◷</button><button type="button" data-recovery-close title="收起">×</button></div></div>
    <div class="agent-body"><div class="agent-log"><div class="agent-message assistant"><div class="agent-avatar">A</div><div class="agent-bubble"><b>Agent</b><p>选择一个 Skill，或直接输入你的创作需求。当前选中的画布节点会自动作为上下文。</p></div></div></div>
    <div class="agent-skills"><div class="agent-skills-head"><b>一个 Skill，一部作品</b><button type="button" data-recovery-retry>↻ 重新连接</button></div><div class="agent-skill-grid">${recoverySkills.map(s=>`<button type="button" class="agent-skill-card ${selectedId===s.id?'active':''}" data-recovery-skill="${s.id}"><span class="agent-skill-icon">◇</span><span class="agent-skill-copy"><b>${escapeHtml(s.title)}</b><span>${escapeHtml(s.sub)}</span></span></button>`).join('')}</div></div></div>
    <div class="agent-composer"><div class="agent-context-strip-v2">${contextStripHtml()}</div><div class="agent-input"><textarea id="agentDraft" placeholder="给 Agent 一个任务，或用 @ 引用节点 / 资源…">${escapeHtml(stored.draft||'')}</textarea><div class="agent-input-footer"><div class="agent-input-actions"><button type="button" data-recovery-add title="添加节点">＋</button><button type="button" data-recovery-context title="引用上下文">◇</button><button type="button" data-recovery-tasks title="任务中心">◷</button></div><button type="button" class="agent-send" data-recovery-send aria-label="发送给 Agent">↑</button></div></div></div>
  </div>`;
  forceViewportPanelStyles();bindRecoveryPanel();queuePatch();return true;
}
function applyVisualOpen(open){
  app.classList.toggle('agent-open',Boolean(open));agentButton.setAttribute('aria-expanded',open?'true':'false');agentButton.classList.toggle('active',Boolean(open));
  forceViewportPanelStyles();
  if(open){writeStoredState({open:true});ensurePanelReady();setTimeout(()=>panel.querySelector('#agentDraft')?.focus(),50)}
  else{writeStoredState({open:false})}
}
async function reconnectNative(draftText=''){
  if(internalToggle)return false;internalToggle=true;
  try{
    if(app.classList.contains('agent-open')){agentButton.click();await new Promise(r=>setTimeout(r,35))}
    agentButton.click();await new Promise(r=>setTimeout(r,80));
    const nativeDraft=panel.querySelector('#agentDraft');const native=panelMeaningful()&&!panel.querySelector('.agent-recovery-shell')&&nativeDraft;
    if(!native)return false;
    if(draftText){nativeDraft.value=draftText;nativeDraft.dispatchEvent(new Event('input',{bubbles:true}))}
    return true;
  }finally{internalToggle=false}
}
async function sendFromRecovery(){
  const draft=panel.querySelector('#agentDraft'),text=String(draft?.value||'').trim();if(!text)return;
  writeStoredState({draft:text});recoveryMessage(text,'user');
  const connected=await reconnectNative(text);
  if(connected){const send=panel.querySelector('[data-agent-bottom="send"]');if(send){send.click();return}}
  if(!panel.querySelector('.agent-recovery-shell'))renderRecoveryPanel(true);
  const restored=panel.querySelector('#agentDraft');if(restored)restored.value=text;
  recoveryMessage('Agent 主执行器暂时没有完成连接。你的输入已经保留；可以点击“重新连接”继续，不会丢失内容。');
}
function bindRecoveryPanel(){
  const draft=panel.querySelector('#agentDraft');draft?.addEventListener('input',()=>writeStoredState({draft:draft.value}));
  panel.querySelector('[data-recovery-close]')?.addEventListener('click',()=>{if(app.classList.contains('agent-open'))agentButton.click();else applyVisualOpen(false)});
  panel.querySelector('[data-recovery-new]')?.addEventListener('click',()=>{writeStoredState({draft:'',chatTitle:'新对话',messages:[]});if(draft)draft.value='';const log=panel.querySelector('.agent-log');if(log)log.innerHTML='<div class="agent-empty">新对话已建立。</div>'});
  panel.querySelectorAll('[data-recovery-tasks]').forEach(b=>b.addEventListener('click',()=>document.querySelector('#taskBtn')?.click()));
  panel.querySelector('[data-recovery-add]')?.addEventListener('click',()=>document.querySelector('#bottomDock [data-dock-action="add"]')?.click());
  panel.querySelector('[data-recovery-context]')?.addEventListener('click',()=>{const strip=panel.querySelector('.agent-context-strip-v2');if(strip)strip.innerHTML=contextStripHtml()});
  panel.querySelectorAll('[data-recovery-skill]').forEach(b=>b.addEventListener('click',()=>{writeStoredState({selectedSkillId:b.dataset.recoverySkill});panel.querySelectorAll('[data-recovery-skill]').forEach(x=>x.classList.toggle('active',x===b))}));
  panel.querySelector('[data-recovery-retry]')?.addEventListener('click',async()=>{const text=String(panel.querySelector('#agentDraft')?.value||'');const ok=await reconnectNative(text);if(!ok){renderRecoveryPanel(true);recoveryMessage('主 Agent 仍未连接成功，已保留当前恢复面板。')}});
  panel.querySelector('[data-recovery-send]')?.addEventListener('click',sendFromRecovery);
  draft?.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();sendFromRecovery()}});
}
function ensurePanelReady(){
  if(ensuring||!app.classList.contains('agent-open'))return;ensuring=true;
  panel.classList.add('agent-left-v2');forceViewportPanelStyles();
  queueMicrotask(()=>{
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        forceViewportPanelStyles();
        if(app.classList.contains('agent-open')&&!panelMeaningful())renderRecoveryPanel(true);
        queuePatch();ensuring=false;
      });
    });
  });
}
function syncOpenState(){
  placeAgentButton();const open=app.classList.contains('agent-open');agentButton.setAttribute('aria-expanded',open?'true':'false');agentButton.classList.toggle('active',open);forceViewportPanelStyles();
  if(open)ensurePanelReady();queuePatch();
}
function refreshContextAfterCanvasChange(){if(!app.classList.contains('agent-open'))return;const strip=panel.querySelector('.agent-context-strip-v2');if(strip)strip.innerHTML=contextStripHtml()}

agentButton.addEventListener('click',()=>{if(internalToggle)return;clickStartedOpen=app.classList.contains('agent-open')},{capture:true});
agentButton.addEventListener('click',()=>{
  if(internalToggle)return;const started=clickStartedOpen;clickStartedOpen=null;
  queueMicrotask(()=>{const current=app.classList.contains('agent-open');if(started!==null&&current===started)applyVisualOpen(!started);else if(current)ensurePanelReady()});
});

window.addEventListener('resize',forceViewportPanelStyles,{passive:true});
placeAgentButton();forceViewportPanelStyles();
panelObserver=new MutationObserver(()=>{queuePatch();if(app.classList.contains('agent-open')&&!panelMeaningful())ensurePanelReady()});
panelObserver.observe(panel,{childList:true,subtree:true});
appObserver=new MutationObserver(syncOpenState);appObserver.observe(app,{attributes:true,attributeFilter:['class']});
nodeLayer&&new MutationObserver(refreshContextAfterCanvasChange).observe(nodeLayer,{attributes:true,subtree:true,attributeFilter:['class']});
syncOpenState();
})();