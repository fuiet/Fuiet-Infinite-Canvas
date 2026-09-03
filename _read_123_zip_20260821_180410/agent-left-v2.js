/* Fuiet Agent · LibTV-style left workspace surface
 * Enhances the existing Agent engine in app.js without duplicating its state,
 * node creation, Skill routing, task-center or context actions.
 */
(()=>{
'use strict';
const app=document.querySelector('#app');
const panel=document.querySelector('#agentPanel');
const legacyButton=document.querySelector('#agentBtn');
const nodeLayer=document.querySelector('#nodeLayer');
if(!app||!panel||!legacyButton)return;

let panelObserver=null;
let appObserver=null;
let patchQueued=false;

const icon=`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="13" rx="3"/><path d="M7.5 18v2"/><path d="M16.5 18v2"/><path d="M8 9h.01"/><path d="M16 9h.01"/><path d="M9 13h6"/></svg>`;
const typeIcon={
  text:'▤',script:'▥',image:'▧',video:'▶',audio:'♪',director:'◇'
};

function ensureRail(){
  let rail=document.querySelector('#agentLeftRail');
  if(rail)return rail;
  rail=document.createElement('div');
  rail.id='agentLeftRail';
  rail.className='agent-left-rail';
  rail.innerHTML=`<button id="agentRailButton" class="agent-rail-button" type="button" aria-label="打开 Agent" aria-expanded="false">${icon}<span>Agent</span></button>`;
  app.appendChild(rail);
  rail.querySelector('#agentRailButton')?.addEventListener('click',()=>legacyButton.click());
  return rail;
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

function escapeHtml(value){
  return String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
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
  const send=panel.querySelector('[data-agent-bottom="send"]');
  if(send)send.setAttribute('aria-label','发送给 Agent');
  const add=panel.querySelector('[data-agent-bottom="add"]');
  if(add)add.title='添加节点';
  const context=panel.querySelector('[data-agent-bottom="context"]');
  if(context)context.title='引用当前画布上下文';
  const tasks=panel.querySelector('[data-agent-bottom="tasks"]');
  if(tasks)tasks.title='任务中心';
  const clear=panel.querySelector('[data-agent-bottom="clear"]');
  if(clear)clear.title='新对话';
}

function patchPanel(){
  patchQueued=false;
  panelObserver?.disconnect();
  try{
    panel.classList.add('agent-left-v2');
    relabelPanel();
    enhanceComposer();
  }finally{
    panelObserver?.observe(panel,{childList:true,subtree:true});
  }
}
function queuePatch(){
  if(patchQueued)return;
  patchQueued=true;
  queueMicrotask(patchPanel);
}

function syncOpenState(){
  const open=app.classList.contains('agent-open');
  const rail=ensureRail();
  rail.classList.toggle('panel-open',open);
  const btn=rail.querySelector('#agentRailButton');
  btn?.setAttribute('aria-expanded',open?'true':'false');
  btn?.classList.toggle('active',open);
  queuePatch();
}

function refreshContextAfterCanvasChange(){
  if(!app.classList.contains('agent-open'))return;
  queuePatch();
}

ensureRail();
legacyButton.setAttribute('aria-hidden','true');
panelObserver=new MutationObserver(queuePatch);
panelObserver.observe(panel,{childList:true,subtree:true});
appObserver=new MutationObserver(syncOpenState);
appObserver.observe(app,{attributes:true,attributeFilter:['class']});
nodeLayer&&new MutationObserver(refreshContextAfterCanvasChange).observe(nodeLayer,{attributes:true,subtree:true,attributeFilter:['class']});
syncOpenState();
})();