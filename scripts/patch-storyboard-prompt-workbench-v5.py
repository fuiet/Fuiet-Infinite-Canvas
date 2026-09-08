from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
core=ROOT/'script-workflow-core.js'
rich=ROOT/'script-final-prompt-rich-v1.js'
workbench=ROOT/'script-final-prompt-workbench-v4.js'
css=ROOT/'styles'/'script-final-prompt-workbench-v4.css'
bootstrap=ROOT/'browser-bootstrap.js'
test=ROOT/'tests'/'storyboard-prompt-workbench-v5.test.mjs'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old,new,1)

# 1) Workbench: stage 3 is storyboard-image prompt preparation only.
workbench.write_text(r'''/* Fuiet Script · Storyboard Prompt Workbench V5
 * Stage 3 of comic-drama production: script + shot + assets -> storyboard image prompt.
 * Video prompts intentionally belong to the later image-confirmed video stage.
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
let renderTimer=0,rendering=false,bulkBusy=false,selectedId='';
const oneBusy=new Set();

function active(){return Boolean(featureModal.querySelector('[data-script-tab="prompts"].active')&&featureModal.querySelector('.final-prompt-list'))}
function ids(){return [...featureModal.querySelectorAll('.final-prompt-list [data-final-shot]')].map(x=>x.dataset.finalShot).filter(Boolean)}
function ctx(id){try{return base.shotContext(id)}catch{return null}}
function aiOriginal(shot){return text(shot?.imagePromptAiOriginal).trim()}
function status(shot){
  if(!shot)return{key:'pending',label:'待合成'};
  if(oneBusy.has(String(shot.id))||shot.promptStatus==='generating')return{key:'generating',label:'AI 合成中'};
  if(shot.promptStatus==='error')return{key:'error',label:'合成失败'};
  if(shot.promptDirty||shot.promptStatus==='dirty')return{key:'dirty',label:'需要重新合成'};
  const current=text(shot.imagePrompt).trim(),original=aiOriginal(shot);
  if(current){
    if(original&&current!==original)return{key:'edited',label:'已人工修改'};
    return{key:original?'ai':'ready',label:original?'AI 已合成':'已就绪'};
  }
  return{key:'pending',label:'待合成'};
}
function mentionHtml(value,assets=[]){
  let html=esc(value||'');
  [...assets].filter(a=>a?.name).sort((a,b)=>text(b.name).length-text(a.name).length).forEach(a=>{
    const raw='@'+a.name,token=esc(raw),name=esc(a.name);
    html=html.split(token).join(`<span class="fpv5-mention">${token}</span>`);
    if(!text(value).includes(raw))html=html.replace(new RegExp(`(?<![@\\w])${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}(?![\\w])`,'g'),`<span class="fpv5-mention">@${name}</span>`);
  });
  return html;
}
function sourceBlock(label,value,assets=[],empty='—'){return `<section class="fpv5-source-block"><header>${esc(label)}</header><div>${value?mentionHtml(value,assets):`<em>${esc(empty)}</em>`}</div></section>`}
function assetLinks(c){return (c.assets||[]).map(a=>`<span class="fpv5-asset-link" title="${attr(text(a.description||a.prompt||'已关联资产'))}">@${esc(a.name||'未命名')}</span>`).join('<span class="fpv5-asset-sep">·</span>')||'<em>无关联资产</em>'}
function shotTitle(c,index){const s=c.shot;return `Shot ${String(s.no||index+1).padStart(2,'0')}`}
function shortAction(s){const v=text(s?.action).replace(/\s+/g,' ').trim();return v.length>28?v.slice(0,28)+'…':v||'未填写画面描述'}
function navItem(c,index){const s=c.shot,st=status(s),selected=String(s.id)===String(selectedId);return `<button type="button" class="fpv5-shot-nav ${selected?'active':''} ${st.key}" data-fpv5-select="${attr(s.id)}"><span><b>${shotTitle(c,index)}</b><i>${Number(s.duration||0)}s</i></span><p>${mentionHtml(shortAction(s),c.assets)}</p><small><i></i>${esc(st.label)}</small></button>`}
function contextDetails(c){
  const prev=c.previous,next=c.next,script=text(c.node?.sourceText).trim();
  const shotText=x=>x?`${x.shotSize||''}${x.action?` · ${x.action}`:''}${x.cameraMovement?` · ${x.cameraMovement}`:''}`:'边界镜头';
  return `<details class="fpv5-context"><summary>剧情上下文 <span>完整剧本已纳入 AI</span></summary><div class="fpv5-context-grid"><section><b>上一镜</b><p>${esc(shotText(prev))}</p></section><section><b>当前镜</b><p>${mentionHtml(c.shot.action,c.assets)}</p></section><section><b>下一镜</b><p>${esc(shotText(next))}</p></section></div><section class="fpv5-script-source"><b>完整剧本原文</b><pre>${esc(script||'当前脚本原文为空')}</pre></section></details>`;
}
function sourcePanel(c,index){const s=c.shot,st=status(s);return `<section class="fpv5-source-panel"><header class="fpv5-current-head"><div><strong>${shotTitle(c,index)}</strong><span>${Number(s.duration||0)}s</span></div><em class="${st.key}"><i></i>${esc(st.label)}</em></header>${sourceBlock('画面描述',s.action,c.assets,'未填写画面描述')}<div class="fpv5-meta-grid"><section><span>景别</span><b>${esc(s.shotSize||'未设置')}</b></section><section><span>光影氛围</span><b>${esc(s.lighting||'未填写')}</b></section><section><span>运镜</span><b>${esc(s.cameraMovement||'未填写')}</b></section><section><span>时长</span><b>${Number(s.duration||0)}s</b></section></div>${sourceBlock('对白 / 旁白',s.dialogue,c.assets,'无对白 / 旁白')}${sourceBlock('音效',s.sound,c.assets,'无额外音效')}<section class="fpv5-assets"><header>关联资产</header><div>${assetLinks(c)}</div></section>${contextDetails(c)}</section>`}
function promptPanel(c){
  const s=c.shot,original=aiOriginal(s),current=text(s.imagePrompt),canRestore=Boolean(original&&original!==current.trim()),st=status(s),busy=st.key==='generating';
  return `<section class="fpv5-prompt-panel"><header><div><strong>分镜提示词</strong><span>用于生成这一镜的关键分镜图片；可直接手动修改</span></div><small data-fpv5-count>${current.length} 字</small></header><textarea data-fpv5-prompt data-shot-id="${attr(s.id)}" spellcheck="false" placeholder="AI 会根据完整剧本、当前分镜、剧情风格和关联资产合成用于图片生成的最终分镜提示词。">${esc(current)}</textarea><div class="fpv5-prompt-meta"><span>最终进入图片生成器的是这里最后保存的版本</span><em data-fpv5-save></em></div><div class="fpv5-actions"><button type="button" data-fpv5-compose="${attr(s.id)}" ${busy?'disabled':''}>${busy?'正在合成…':current.trim()?'AI 重新合成':'AI 合成本镜'}</button><button type="button" class="secondary" data-fpv5-restore="${attr(s.id)}" ${canRestore?'':'disabled'}>恢复 AI 版本</button></div><footer><span>来源</span><b>${st.key==='edited'?'AI 原始版本 + 人工修改':original?'AI 合成版本':current.trim()?'已有分镜提示词':'尚未生成'}</b>${original?`<small>AI 原始版本已保留，可随时恢复</small>`:''}</footer></section>`;
}
function stats(items){const out={total:items.length,ready:0,todo:0};for(const c of items){const k=status(c.shot).key;if(['ai','edited','ready'].includes(k))out.ready++;else out.todo++}return out}
function page(items){
  if(!selectedId||!items.some(c=>String(c.shot.id)===String(selectedId)))selectedId=String(items[0]?.shot.id||'');
  const selected=items.find(c=>String(c.shot.id)===String(selectedId))||items[0],index=Math.max(0,items.indexOf(selected));
  const s=stats(items),first=items[0],data=first?.data||{},style=text(data.globalStyle?.text||data.style),script=text(first?.node?.sourceText),percent=s.total?Math.round(s.ready/s.total*100):0;
  return `<div class="fpv5-page"><header class="fpv5-topbar"><div class="fpv5-title"><strong>分镜提示词</strong><span>剧本 + 分镜 + 剧情风格 + 资产 → 用于生成分镜图片的最终提示词</span></div><div class="fpv5-progress"><span>${s.ready}/${s.total} 已就绪</span><i><b style="width:${percent}%"></b></i></div><button type="button" id="fpv5Bulk" ${bulkBusy||!s.total?'disabled':''}>${bulkBusy?'AI 合成中…':'AI 合成全部'}</button></header><section class="fpv5-global"><label><span>剧情 / 视觉风格</span><input id="fpv5Style" value="${attr(style)}" placeholder="例如：古风仙侠漫剧，东方美学，暖灰低饱和，电影光影"></label><div class="fpv5-script-state ${script?'ok':'warn'}"><span>剧本上下文</span><b>${script?'完整剧本已纳入 AI':'脚本原文为空'}</b><small>${script?`${script.length} 字`:'请先补充剧本原文'}</small></div></section><main class="fpv5-workspace"><aside class="fpv5-nav"><header><b>镜头</b><span>${items.length}</span></header><div>${items.map(navItem).join('')||'<em>暂无镜头</em>'}</div></aside>${selected?`<div class="fpv5-source-wrap">${sourcePanel(selected,index)}</div><div class="fpv5-prompt-wrap">${promptPanel(selected)}</div>`:'<div class="fpv5-empty">当前没有镜头</div>'}</main><footer class="fpv5-footer"><div><strong>${s.todo?`还有 ${s.todo} 个镜头未准备好`:'所有分镜提示词已就绪'}</strong><span>这一阶段只准备分镜图片；视频提示词会在分镜图片生成并确认后再生成。</span></div><button type="button" id="fpv5ToImages" ${s.todo?'disabled':''}>进入批量生成图片 →</button></footer></div>`;
}
function getHidden(id){return featureModal.querySelector(`[data-final-shot="${cssEscape(id)}"] [data-final-image]`)}
function savePrompt(ta,{rerender=false}={}){const id=ta.dataset.shotId,hidden=getHidden(id);if(!hidden)return;if(hidden.value!==ta.value){hidden.readOnly=false;hidden.value=ta.value;hidden.dispatchEvent(new Event('change',{bubbles:true}))}const state=ta.closest('.fpv5-prompt-panel')?.querySelector('[data-fpv5-save]');if(state){state.textContent='已保存';setTimeout(()=>{if(state.isConnected)state.textContent=''},900)}if(rerender)setTimeout(()=>render(true),40)}
function bind(root){
  const style=root.querySelector('#fpv5Style');if(style){let t=0;const sync=()=>{const src=featureModal.querySelector('#scriptStyle');if(src&&src.value!==style.value){src.value=style.value;src.dispatchEvent(new Event('change',{bubbles:true}))}};style.oninput=()=>{clearTimeout(t);t=setTimeout(sync,350)};style.onchange=sync}
  root.querySelectorAll('[data-fpv5-select]').forEach(btn=>btn.onclick=()=>{const ta=root.querySelector('[data-fpv5-prompt]');if(ta)savePrompt(ta);selectedId=String(btn.dataset.fpv5Select||'');render(true)});
  const ta=root.querySelector('[data-fpv5-prompt]');if(ta){let t=0;ta.oninput=()=>{const count=root.querySelector('[data-fpv5-count]');if(count)count.textContent=`${ta.value.length} 字`;clearTimeout(t);t=setTimeout(()=>savePrompt(ta),450)};ta.onchange=()=>savePrompt(ta);ta.onblur=()=>savePrompt(ta,{rerender:true})}
  root.querySelectorAll('[data-fpv5-compose]').forEach(btn=>btn.onclick=async()=>{const id=String(btn.dataset.fpv5Compose||'');if(!id||oneBusy.has(id))return;const current=root.querySelector('[data-fpv5-prompt]');if(current)savePrompt(current);oneBusy.add(id);btn.disabled=true;btn.textContent='正在合成…';try{if(typeof production.composeStoryboardOne!=='function')throw new Error('分镜提示词合成模块未加载');await production.composeStoryboardOne(id,task=>{const p=Math.round(Number(task?.progress||0));btn.textContent=p?`AI 合成 ${p}%`:'AI 合成中…'})}catch(e){console.error(e);btn.textContent='合成失败 · 重试'}finally{oneBusy.delete(id);setTimeout(()=>render(true),120)}});
  root.querySelectorAll('[data-fpv5-restore]').forEach(btn=>btn.onclick=()=>{const c=ctx(btn.dataset.fpv5Restore),original=aiOriginal(c?.shot),editor=root.querySelector('[data-fpv5-prompt]');if(!original||!editor)return;editor.value=original;savePrompt(editor,{rerender:true})});
  const bulk=root.querySelector('#fpv5Bulk');if(bulk)bulk.onclick=async()=>{if(bulkBusy)return;const current=root.querySelector('[data-fpv5-prompt]');if(current)savePrompt(current);bulkBusy=true;bulk.disabled=true;bulk.textContent='AI 合成中…';try{if(typeof production.bulkStoryboard!=='function')throw new Error('批量分镜提示词模块未加载');await production.bulkStoryboard(m=>{if(!bulk.isConnected)return;bulk.textContent=m?.done?`正在合成 ${m.done}/${m.total}`:`AI 合成 ${Math.max(1,Math.round(Number(m?.task?.progress||0)))}%`})}catch(e){console.error(e)}finally{bulkBusy=false;setTimeout(()=>render(true),150)}};
  const next=root.querySelector('#fpv5ToImages');if(next)next.onclick=()=>featureModal.querySelector('#scriptPromptsToBatch')?.click();
}
function capture(){const page=featureModal.querySelector('.fpv5-page'),nav=page?.querySelector('.fpv5-nav>div'),source=page?.querySelector('.fpv5-source-wrap'),activeEl=document.activeElement;if(activeEl?.matches?.('[data-fpv5-prompt]'))return{nav:nav?.scrollTop||0,source:source?.scrollTop||0,editing:true,start:activeEl.selectionStart,end:activeEl.selectionEnd};return{nav:nav?.scrollTop||0,source:source?.scrollTop||0}}
function restore(root,s){const nav=root.querySelector('.fpv5-nav>div'),source=root.querySelector('.fpv5-source-wrap');if(nav)nav.scrollTop=s?.nav||0;if(source)source.scrollTop=s?.source||0;if(!s?.editing)return;const ta=root.querySelector('[data-fpv5-prompt]');if(ta){ta.focus({preventScroll:true});try{ta.setSelectionRange(s.start??ta.value.length,s.end??ta.value.length)}catch{}}}
function render(force=false){if(rendering)return;const content=featureModal.querySelector('#scriptEditorContent');if(!content||!active()){featureModal.classList.remove('fpv5-prompts-active');content?.querySelector(':scope > .fpv5-page')?.remove();return}if(!force&&document.activeElement?.matches?.('.fpv5-page textarea,.fpv5-page input'))return;const items=ids().map(ctx).filter(Boolean),old=content.querySelector(':scope > .fpv5-page'),state=capture();rendering=true;try{featureModal.classList.add('fpv5-prompts-active');old?.remove();const wrap=document.createElement('div');wrap.innerHTML=page(items);const root=wrap.firstElementChild;content.prepend(root);bind(root);restore(root,state)}finally{rendering=false}}
function schedule(force=false){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render(force),60)}
const observer=new MutationObserver(muts=>{if(muts.some(m=>{const t=m.target instanceof Element?m.target:m.target?.parentElement;return !t?.closest?.('.fpv5-page')}))schedule()});observer.observe(featureModal,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});featureModal.addEventListener('click',e=>{if(e.target.closest('[data-script-tab]'))setTimeout(()=>render(true),50)},true);setInterval(()=>{if(active()&&!document.activeElement?.matches?.('.fpv5-page textarea,.fpv5-page input'))render()},1800);schedule(true);

globalThis.FuietStoryboardPromptWorkbenchV5=Object.freeze({version:5,render,status});
globalThis.FuietFinalPromptWorkbenchV4=globalThis.FuietStoryboardPromptWorkbenchV5;
})();
''',encoding='utf-8')

css.write_text(r'''/* Fuiet Script · Storyboard Prompt Workbench V5 */
.fpv5-prompts-active #scriptEditorContent{position:relative;display:flex!important;flex-direction:column!important;min-height:0!important;overflow:hidden!important}
.fpv5-prompts-active #scriptEditorContent>:not(.fpv5-page){display:none!important}
.fpv5-page{height:100%;min-height:0;display:flex;flex-direction:column;background:#101213;color:#eef1f2;overflow:hidden}
.fpv5-topbar{flex:0 0 66px;display:flex;align-items:center;gap:18px;padding:0 20px;border-bottom:1px solid #292d2f;background:#151718}.fpv5-title{min-width:0;display:flex;flex-direction:column;gap:4px}.fpv5-title strong{font-size:16px}.fpv5-title span{color:#7f888c;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fpv5-progress{margin-left:auto;display:flex;align-items:center;gap:10px}.fpv5-progress span{font-size:10px;color:#aeb5b8}.fpv5-progress>i{display:block;width:110px;height:4px;border-radius:99px;background:#292d2f;overflow:hidden}.fpv5-progress>i>b{display:block;height:100%;background:#dfe5e6;border-radius:inherit}#fpv5Bulk,#fpv5ToImages,.fpv5-actions button{border:0;border-radius:7px;font:inherit;font-weight:700;cursor:pointer;transition:.15s ease}#fpv5Bulk{height:34px;padding:0 15px;background:#f2f4f4;color:#111;font-size:10px}#fpv5Bulk:disabled{opacity:.5;cursor:progress}
.fpv5-global{flex:0 0 54px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:8px 20px;border-bottom:1px solid #24282a;background:#121415}.fpv5-global label,.fpv5-script-state{display:flex;align-items:center;gap:10px;min-width:0;padding:0 11px;border:1px solid #292e30;border-radius:8px;background:#0f1112}.fpv5-global label>span,.fpv5-script-state>span{font-size:9px;color:#858e92;white-space:nowrap}.fpv5-global input{flex:1;min-width:0;height:28px;border:0;border-left:1px solid #292e30;padding:0 9px;background:transparent;color:#e7eaeb;font:10px inherit;outline:none}.fpv5-script-state b{font-size:9px;white-space:nowrap}.fpv5-script-state small{color:#687176;font-size:8px}.fpv5-script-state.warn b{color:#d1a05f}
.fpv5-workspace{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:220px minmax(360px,.9fr) minmax(500px,1.2fr);overflow:hidden}.fpv5-nav{min-width:0;display:flex;flex-direction:column;border-right:1px solid #262a2c;background:#111314}.fpv5-nav>header{flex:0 0 40px;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid #24282a}.fpv5-nav>header b{font-size:10px}.fpv5-nav>header span{margin-left:auto;color:#70797d;font-size:9px}.fpv5-nav>div{min-height:0;overflow:auto;padding:7px}.fpv5-shot-nav{width:100%;display:flex;flex-direction:column;gap:5px;margin-bottom:5px;padding:9px 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left;cursor:pointer}.fpv5-shot-nav:hover{background:#171a1b}.fpv5-shot-nav.active{border-color:#374044;background:#191c1d}.fpv5-shot-nav>span{display:flex;align-items:center}.fpv5-shot-nav>span b{font-size:10px}.fpv5-shot-nav>span i{margin-left:auto;color:#747e82;font-size:8px;font-style:normal}.fpv5-shot-nav p{margin:0;color:#aab1b4;font-size:9px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fpv5-shot-nav small{display:flex;align-items:center;gap:5px;color:#7b8589;font-size:8px}.fpv5-shot-nav small i{width:5px;height:5px;border-radius:50%;background:currentColor}.fpv5-shot-nav.ai small{color:#6fb48f}.fpv5-shot-nav.edited small{color:#d4a35d}.fpv5-shot-nav.dirty small{color:#cf9660}.fpv5-shot-nav.error small{color:#d47979}.fpv5-shot-nav.generating small{color:#93a7bd}
.fpv5-source-wrap,.fpv5-prompt-wrap{min-width:0;min-height:0;overflow:auto}.fpv5-source-wrap{border-right:1px solid #262a2c;background:#121415}.fpv5-source-panel{padding:14px 15px 26px}.fpv5-current-head{display:flex;align-items:center;padding-bottom:11px;border-bottom:1px solid #282d2f}.fpv5-current-head>div{display:flex;align-items:baseline;gap:8px}.fpv5-current-head strong{font-size:14px}.fpv5-current-head span{font-size:9px;color:#768084}.fpv5-current-head>em{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:8px;font-style:normal;color:#8c969a}.fpv5-current-head>em i{width:5px;height:5px;border-radius:50%;background:currentColor}.fpv5-current-head>em.ai{color:#71b691}.fpv5-current-head>em.edited{color:#d2a15c}.fpv5-current-head>em.error{color:#d17777}.fpv5-source-block{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.055)}.fpv5-source-block header,.fpv5-assets header{margin-bottom:6px;color:#747e82;font-size:8px}.fpv5-source-block>div{color:#dce0e1;font-size:11px;line-height:1.65;white-space:pre-wrap;word-break:break-word}.fpv5-source-block em,.fpv5-assets em{color:#616b6f;font-style:normal}.fpv5-mention,.fpv5-asset-link{color:#21c7df;font-weight:500}.fpv5-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin:10px 0;background:#24292b;border:1px solid #24292b;border-radius:7px;overflow:hidden}.fpv5-meta-grid section{min-width:0;display:flex;flex-direction:column;gap:4px;padding:8px 9px;background:#151718}.fpv5-meta-grid span{font-size:8px;color:#697276}.fpv5-meta-grid b{font-size:9px;font-weight:500;color:#cbd0d2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fpv5-assets{padding:12px 0;border-bottom:1px solid rgba(255,255,255,.055)}.fpv5-assets>div{display:flex;align-items:center;flex-wrap:wrap;gap:5px;font-size:10px}.fpv5-asset-sep{color:#475055}
.fpv5-context{margin-top:12px;border:1px solid #292e30;border-radius:8px;background:#101213;overflow:hidden}.fpv5-context summary{display:flex;align-items:center;gap:8px;padding:9px 10px;cursor:pointer;font-size:9px;font-weight:600}.fpv5-context summary span{margin-left:auto;color:#697276;font-size:8px;font-weight:400}.fpv5-context-grid{display:grid;grid-template-columns:1fr;gap:1px;background:#252a2c;border-top:1px solid #252a2c}.fpv5-context-grid section{padding:8px 10px;background:#131516}.fpv5-context-grid b,.fpv5-script-source>b{font-size:8px;color:#727c80}.fpv5-context-grid p{margin:4px 0 0;color:#b9c0c2;font-size:9px;line-height:1.5}.fpv5-script-source{padding:9px 10px;border-top:1px solid #252a2c}.fpv5-script-source pre{max-height:180px;margin:6px 0 0;overflow:auto;white-space:pre-wrap;color:#8e979a;font:8px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.fpv5-prompt-wrap{background:#0f1112}.fpv5-prompt-panel{height:100%;min-height:460px;display:flex;flex-direction:column;padding:16px}.fpv5-prompt-panel>header{display:flex;align-items:flex-start;gap:12px;padding-bottom:10px}.fpv5-prompt-panel>header>div{display:flex;flex-direction:column;gap:3px}.fpv5-prompt-panel>header strong{font-size:14px}.fpv5-prompt-panel>header span{font-size:9px;color:#707a7e}.fpv5-prompt-panel>header small{margin-left:auto;font-size:8px;color:#677176}.fpv5-prompt-panel textarea{flex:1 1 auto;min-height:300px;resize:none;padding:14px;border:1px solid #2b3032;border-radius:9px;background:#121415;color:#e7eaeb;font:11px/1.72 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;outline:none}.fpv5-prompt-panel textarea:focus{border-color:#4b5559;background:#131617}.fpv5-prompt-meta{height:28px;display:flex;align-items:center;color:#626c70;font-size:8px}.fpv5-prompt-meta em{margin-left:auto;color:#72b691;font-style:normal}.fpv5-actions{display:flex;gap:7px}.fpv5-actions button{height:32px;padding:0 12px;background:#eef1f1;color:#111;font-size:9px}.fpv5-actions button.secondary{border:1px solid #343b3e;background:#191c1d;color:#c8cdcf}.fpv5-actions button:disabled{opacity:.4;cursor:not-allowed}.fpv5-prompt-panel>footer{display:grid;grid-template-columns:auto 1fr;gap:3px 8px;margin-top:12px;padding:10px;border:1px solid #252a2c;border-radius:7px;background:#111314}.fpv5-prompt-panel>footer span{grid-row:1/3;color:#687176;font-size:8px}.fpv5-prompt-panel>footer b{font-size:9px;font-weight:500}.fpv5-prompt-panel>footer small{color:#687176;font-size:8px}
.fpv5-footer{flex:0 0 58px;display:flex;align-items:center;gap:18px;padding:0 20px;border-top:1px solid #292d2f;background:#17191a}.fpv5-footer>div{min-width:0;display:flex;flex-direction:column;gap:3px}.fpv5-footer strong{font-size:10px}.fpv5-footer span{font-size:8px;color:#6d767a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#fpv5ToImages{margin-left:auto;height:34px;padding:0 15px;background:#f1f3f3;color:#111;font-size:10px}#fpv5ToImages:disabled{background:#25292a;color:#687176;cursor:not-allowed}.fpv5-empty{grid-column:2/4;display:grid;place-items:center;color:#6d767a}
@media(max-width:1250px){.fpv5-workspace{grid-template-columns:190px minmax(330px,.85fr) minmax(430px,1.15fr)}}
@media(max-width:950px){.fpv5-workspace{grid-template-columns:170px 1fr}.fpv5-prompt-wrap{grid-column:2}.fpv5-source-wrap{display:none}.fpv5-global{grid-template-columns:1fr}.fpv5-script-state{display:none}}
''',encoding='utf-8')

# 2) Add storyboard-only AI synthesis to production module, leaving legacy video synthesis intact for later stages.
r=rich.read_text(encoding='utf-8')
if 'function storyboardSchema()' not in r:
    anchor='\nasync function waitFor(sel,timeout=2500)'
    if anchor not in r: raise SystemExit('rich insertion anchor not found')
    block=r'''
function storyboardSchema(){return{imageSpec:{visualDescription:'当前镜头最终静态画面，明确前景/主体/后景与人物道具关系',performance:'可见姿态、表情、视线、手部与道具交互；把对白情绪转成可见表演',composition:'构图、机位高度和方向、主体位置、景深、空间层次',cameraIntent:'把运镜意图转译成当前关键帧的构图意图，不描述连续运动过程',lighting:'光源方向、明暗、色温、材质反光',mood:'可见情绪氛围',constraints:['本镜头图片生成必须保持的关系'],forbidden:['本镜头图片生成必须避免的错误']}}}
function compileStoryboardImage(ctx,spec={}){const s=ctx.shot,g=groups(ctx.assets),constraints=uniq([...(spec.constraints||[]),...defaultConstraints(ctx)]),forbidden=uniq([...(spec.forbidden||[]),...defaultForbidden(ctx)]),roles=g.characters.map(assetText),scenes=g.scenes.map(assetText),props=g.props.map(assetText),visible=text(spec.visualDescription||spec.visual||s.action||'严格按照当前 Shot 画面描述呈现'),performance=text(spec.performance||spec.characterPerformance),composition=text(spec.composition||`${s.shotSize||'中景'}，明确主体位置、机位、景深和前中后景关系`),cameraIntent=text(spec.cameraIntent),lighting=text(spec.lighting||s.lighting),mood=text(spec.mood);return[
`分镜画面：${visible}`,
performance&&`人物表演：${performance}`,
`出场角色：\n${bullets(roles)}`,
`场景：\n${bullets(scenes.length?scenes:(s.scene?[s.scene]:[]))}`,
`关键道具：\n${bullets(props)}`,
`构图与机位：${composition}${cameraIntent?`；${cameraIntent}`:''}`,
lighting&&`光影氛围：${lighting}${mood?`；${mood}`:''}`,
`参考资产规则：\n${bullets(refRules(ctx))}`,
`画面一致性约束：\n${numbered(constraints)}`,
`禁止事项：\n${bullets(forbidden)}`,
ctx.style&&`[剧情 / 视觉风格：${ctx.style}]`
].filter(Boolean).join('\n\n')}
function storyboardInstruction(payload){return `你是专业漫剧分镜导演、摄影指导和 AI 图片提示词编译器。当前阶段只负责“剧本 → 分镜提示词 → 分镜图片”，禁止生成视频提示词。\n\n你必须综合 scriptSource 完整剧本、currentShot 的时长/画面描述/景别/光影/对白旁白/音效/运镜、globalStyle、associatedAssets、previousShot 和 nextShot 来理解当前镜头。\n\n规则：\n1. 最终目标是生成一张关键分镜图片，只保留对静态图片生成真正有意义的信息。\n2. duration 用来理解镜头节奏和关键动作瞬间，但不要机械写“X秒”进图片描述。\n3. dialogue / 旁白用于判断说话人、情绪、视线、嘴部状态和表演，把它转译成可见表演；不要把整句台词机械复制进图片 Prompt。\n4. sound 用于理解环境和动作质感，只转译成可见环境/动作线索；不要在最终图片 Prompt 里写“听到某声音”。\n5. cameraMovement 用于理解构图意图和主体关系，只转译成关键帧构图，不写连续推拉摇移过程。\n6. 资产必须保持身份、服装、结构、比例、材质和空间逻辑一致；需要引用时使用 @资产名，不新增剧本未设定的重要人物/道具。\n7. previousShot / nextShot 只用于连续性、指代和剧情理解，不得把相邻镜头事件混入当前画面。\n8. 输出应明确主体、动作瞬间、表情视线、手部与道具关系、场景、构图机位、景深、光影与风格，避免空泛“电影感/高清”堆词。\n\n只返回合法 JSON，不要 Markdown，不要解释。结构：${JSON.stringify(storyboardSchema())}\n\n输入：${JSON.stringify(payload)}`}
async function storyboardAiOne(ctx,onProgress){const r=await runtimeFor(ctx.node),payload={scriptSource:text(ctx.node?.sourceText||''),globalStyle:ctx.style,currentShot:{id:ctx.shot.id,no:ctx.shot.no,duration:ctx.shot.duration,shotSize:ctx.shot.shotSize,scene:ctx.shot.scene,characters:ctx.shot.characters,props:ctx.shot.props,action:ctx.shot.action,lighting:ctx.shot.lighting,dialogue:ctx.shot.dialogue,sound:ctx.shot.sound,cameraMovement:ctx.shot.cameraMovement},associatedAssets:ctx.assets.map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),previousShot:ctx.previous,nextShot:ctx.next},prompt=storyboardInstruction(payload),created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:r.pid,modelId:r.mid,providerSnapshot:r.p,modelSnapshot:r.m,nodeType:'text',prompt,references:[],maxRetries:Number(ctx.state?.workflowSettings?.maxRetries??1),parameters:{operation:'storyboard_prompt_synthesis_single',responseFormat:'json_object'}})}),info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,onProgress),parsed=extractJson(info.output?.value??info.output?.text??'');if(!parsed?.imageSpec)throw new Error('模型没有返回合法的 imageSpec JSON');return{imagePrompt:compileStoryboardImage(ctx,parsed.imageSpec)}}
async function storyboardAiBatch(hit,data,onProgress){const r=await runtimeFor(hit.node),shots=data.shots||[],out=[],size=4;for(let o=0;o<shots.length;o+=size){const chunk=shots.slice(o,o+size),payload={scriptSource:text(hit.node?.sourceText||''),globalStyle:text(data.globalStyle?.text||data.style),shots:chunk.map(s=>{const c=base.shotContext(s.id);return{id:s.id,no:s.no,duration:s.duration,shotSize:s.shotSize,scene:s.scene,characters:s.characters,props:s.props,action:s.action,lighting:s.lighting,dialogue:s.dialogue,sound:s.sound,cameraMovement:s.cameraMovement,associatedAssets:(c?.assets||[]).map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),previousShot:c?.previous,nextShot:c?.next}})},prompt=`${storyboardInstruction({scriptSource:payload.scriptSource,globalStyle:payload.globalStyle,shots:payload.shots})}\n\n这是批量任务。返回结构必须是：${JSON.stringify({shots:[{id:'原 shot id',...storyboardSchema()}]})}`,created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:r.pid,modelId:r.mid,providerSnapshot:r.p,modelSnapshot:r.m,nodeType:'text',prompt,references:[],maxRetries:Number(hit.state?.workflowSettings?.maxRetries??1),parameters:{operation:'storyboard_prompt_synthesis_batch',responseFormat:'json_object'}})}),info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,t=>onProgress?.({done:o,total:shots.length,task:t})),parsed=extractJson(info.output?.value??info.output?.text??'');if(!Array.isArray(parsed?.shots))throw new Error(`第 ${o+1}-${o+chunk.length} 镜返回不完整`);for(const s of chunk){const raw=parsed.shots.find(x=>String(x?.id)===String(s.id)),c=base.shotContext(s.id);if(!raw?.imageSpec||!c)throw new Error(`模型遗漏第 ${s.no} 镜`);out.push({id:String(s.id),imagePrompt:compileStoryboardImage(c,raw.imageSpec)})}onProgress?.({done:Math.min(shots.length,o+chunk.length),total:shots.length,task:{progress:100}})}return out}
async function commitStoryboard(results){const active=featureModal.querySelector('[data-script-tab].active')?.dataset.scriptTab||'';if(active!=='prompts')featureModal.querySelector('[data-script-tab="prompts"]')?.click();await waitFor('.final-prompt-list',3000);for(const x of results){const card=await waitFor(`[data-final-shot="${CSS.escape(String(x.id))}"]`,2000);if(!card)continue;const image=card.querySelector('[data-final-image]');if(image){image.readOnly=false;image.dataset.aiOriginal=x.imagePrompt;image.value=x.imagePrompt;image.dispatchEvent(new Event('change',{bubbles:true}))}}if(active&&active!=='prompts'){await sleep(20);featureModal.querySelector(`[data-script-tab="${CSS.escape(active)}"]`)?.click()}}
async function composeStoryboardOne(shotId,onProgress){const c=base.shotContext(shotId);if(!c)throw new Error('找不到当前镜头');const result=await storyboardAiOne(c,onProgress);await commitStoryboard([{id:String(shotId),...result}]);return result}
async function bulkStoryboard(onProgress){const first=featureModal.querySelector('[data-final-shot]')?.dataset.finalShot;if(!first)throw new Error('当前没有镜头');const c=base.shotContext(first);if(!c)throw new Error('找不到当前脚本');const out=await storyboardAiBatch({state:c.state,node:c.node},c.data,onProgress);if(out.length!==(c.data.shots||[]).length)throw new Error(`模型只返回了 ${out.length}/${(c.data.shots||[]).length} 个分镜提示词`);await commitStoryboard(out);toast(`已合成 ${out.length} 个镜头的分镜提示词`);return out}
'''
    r=r.replace(anchor,'\n'+block+anchor,1)
r=replace_once(r,"globalThis.FuietFinalPromptProduction=Object.freeze({version:2,compileImage,compileVideo,ruleCompose,openRich,composeOne,bulk});","globalThis.FuietFinalPromptProduction=Object.freeze({version:3,compileImage,compileVideo,compileStoryboardImage,ruleCompose,openRich,composeOne,bulk,composeStoryboardOne,bulkStoryboard});",'production export')
rich.write_text(r,encoding='utf-8')

# 3) Persist AI original storyboard prompt and treat storyboard-image prompt as stage-3 readiness.
c=core.read_text(encoding='utf-8')
c=replace_once(c,"s.imagePrompt=text(s.imagePrompt||s.image_prompt);s.videoPrompt=text(s.videoPrompt||s.video_prompt);","s.imagePrompt=text(s.imagePrompt||s.image_prompt);s.videoPrompt=text(s.videoPrompt||s.video_prompt);s.imagePromptAiOriginal=text(s.imagePromptAiOriginal||s.storyboardPromptAiOriginal);s.imagePromptAiGeneratedAt=text(s.imagePromptAiGeneratedAt||s.storyboardPromptAiGeneratedAt);",'core original fields')
c=replace_once(c,"if(!shot||shot.promptDirty||shot.promptStatus==='dirty'||shot.promptStatus==='error')return false;if(!text(shot.imagePrompt).trim()||!text(shot.videoPrompt).trim())return false;","if(!shot||shot.promptDirty||shot.promptStatus==='dirty'||shot.promptStatus==='error')return false;if(!text(shot.imagePrompt).trim())return false;",'core current-source readiness')
core.write_text(c,encoding='utf-8')

# 4) App workflow UI/readiness: stage 3 means storyboard prompt ready; batch button goes to images.
a=app.read_text(encoding='utf-8')
a=replace_once(a,"steps=[['确认镜头',1,s.shotsConfirmed],['准备资产',2,s.assetsReady],['合成提示词',3,s.promptsReady]]","steps=[['确认镜头',1,s.shotsConfirmed],['准备资产',2,s.assetsReady],['分镜提示词',3,s.promptsReady]]",'ready steps')
a=replace_once(a,"const shots=d.shots||[],assets=scriptAssetCatalog(d),promptReady=shots.filter(s=>String(s.imagePrompt||'').trim()&&String(s.videoPrompt||'').trim()&&!s.promptDirty).length","const shots=d.shots||[],assets=scriptAssetCatalog(d),promptReady=shots.filter(s=>String(s.imagePrompt||'').trim()&&!s.promptDirty).length",'workflow stats')
a=a.replace("请先完成第 3 步：合成最终提示词","请先完成第 3 步：分镜提示词")
a=a.replace("{tab:'prompts',no:3,title:'合成提示词'","{tab:'prompts',no:3,title:'分镜提示词'")
a=a.replace("'资产已确认 · 进入提示词':'确认资产 → 合成提示词'","'资产已确认 · 进入分镜提示词':'确认资产 → 分镜提示词'")
a=a.replace('<th>最终提示词</th>','<th>分镜提示词</th>',1)
# Replace shot-table prompt preview with storyboard image prompt only.
pattern=r"  function scriptFinalPromptHtml\(shot\)\{[\s\S]*?\n  \}\n  function scriptShotsHtml"
replacement="""  function scriptFinalPromptHtml(shot){
    if(shot?.promptDirty)return '<span class=\"shot-prompt-pending\">待重新合成</span>';
    const image=String(shot?.imagePrompt||'').trim();
    if(!image)return '<span class=\"shot-prompt-pending\">待生成分镜提示词</span>';
    return `<div class=\"shot-final-prompt\"><span><b>分镜</b>${escapeHtml(image)}</span></div>`;
  }
  function scriptShotsHtml"""
a,n=re.subn(pattern,replacement,a,count=1)
if n!=1: raise SystemExit('scriptFinalPromptHtml patch failed')
old='<textarea data-final-image rows="4">${escapeHtml(s.imagePrompt||\'\')}</textarea>'
new='<textarea data-final-image data-ai-original="${escapeAttr(s.imagePromptAiOriginal||\'\')}" rows="4">${escapeHtml(s.imagePrompt||\'\')}</textarea>'
if old not in a: raise SystemExit('data-final-image anchor missing')
a=a.replace(old,new,1)
a=a.replace("d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&String(x.videoPrompt||'').trim()&&!x.promptDirty)","d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&!x.promptDirty)")
old_handler="s.imagePrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&!x.promptDirty);saveState()"
new_handler="s.imagePrompt=e.target.value;if(e.target.dataset.aiOriginal){s.imagePromptAiOriginal=e.target.dataset.aiOriginal;s.imagePromptAiGeneratedAt=new Date().toISOString()}globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&!x.promptDirty);saveState()"
if old_handler not in a: raise SystemExit('image prompt handler anchor missing')
a=a.replace(old_handler,new_handler,1)
app.write_text(a,encoding='utf-8')

# 5) Cache bust workbench/production code.
b=bootstrap.read_text(encoding='utf-8')
b=replace_once(b,"const promptWorkbenchV='20260907-final-prompt-workbench-v4-1';","const promptWorkbenchV='20260908-storyboard-prompt-workbench-v5-1';",'bootstrap workbench version')
bootstrap.write_text(b,encoding='utf-8')

# 6) Focused regression tests.
test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='_read_123_zip_20260821_180410';
const ui=fs.readFileSync(`${root}/script-final-prompt-workbench-v4.js`,'utf8');
const css=fs.readFileSync(`${root}/styles/script-final-prompt-workbench-v4.css`,'utf8');
const rich=fs.readFileSync(`${root}/script-final-prompt-rich-v1.js`,'utf8');
const core=fs.readFileSync(`${root}/script-workflow-core.js`,'utf8');
const app=fs.readFileSync(`${root}/app.js`,'utf8');
const bootstrap=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('prompt stage is a three-column storyboard prompt workbench',()=>{
  assert.match(ui,/分镜提示词/);
  assert.match(ui,/fpv5-nav/);
  assert.match(ui,/fpv5-source-panel/);
  assert.match(ui,/fpv5-prompt-panel/);
  assert.match(css,/grid-template-columns:220px minmax\(360px,.9fr\) minmax\(500px,1.2fr\)/);
});

test('workbench exposes one editable storyboard image prompt, not a video prompt editor',()=>{
  assert.match(ui,/data-fpv5-prompt/);
  assert.doesNotMatch(ui,/data-fpv5-prompt="video"/);
  assert.match(ui,/视频提示词会在分镜图片生成并确认后再生成/);
  assert.match(ui,/进入批量生成图片/);
});

test('storyboard AI consumes full script and every shot field but only returns imageSpec',()=>{
  for(const token of ['scriptSource','duration','shotSize','action','lighting','dialogue','sound','cameraMovement','associatedAssets','previousShot','nextShot'])assert.ok(rich.includes(token),token);
  assert.match(rich,/当前阶段只负责“剧本 → 分镜提示词 → 分镜图片”，禁止生成视频提示词/);
  assert.match(rich,/function storyboardSchema\(\)\{return\{imageSpec:/);
  assert.match(rich,/operation:'storyboard_prompt_synthesis_single'/);
  assert.match(rich,/operation:'storyboard_prompt_synthesis_batch'/);
});

test('storyboard compiler translates nonvisual fields instead of copying audio and motion into final image prompt',()=>{
  assert.match(rich,/dialogue \/ 旁白用于判断说话人、情绪、视线、嘴部状态和表演/);
  assert.match(rich,/sound 用于理解环境和动作质感/);
  assert.match(rich,/cameraMovement 用于理解构图意图/);
  const start=rich.indexOf('function compileStoryboardImage');
  const end=rich.indexOf('function storyboardInstruction',start);
  const compiler=rich.slice(start,end);
  assert.doesNotMatch(compiler,/声音参考：/);
  assert.doesNotMatch(compiler,/运镜状态：/);
});

test('AI original storyboard prompt is persisted and can be restored after manual edits',()=>{
  assert.match(core,/imagePromptAiOriginal/);
  assert.match(app,/data-ai-original/);
  assert.match(app,/s\.imagePromptAiOriginal=e\.target\.dataset\.aiOriginal/);
  assert.match(ui,/恢复 AI 版本/);
  assert.match(ui,/imagePromptAiOriginal/);
});

test('stage-3 readiness requires storyboard image prompts only and opens image batch production',()=>{
  assert.match(app,/promptReady=shots\.filter\(s=>String\(s\.imagePrompt\|\|''\)\.trim\(\)&&!s\.promptDirty\)\.length/);
  assert.match(app,/d\.workflow\.promptsReady=\(d\.shots\|\|\[\]\)\.every\(x=>String\(x\.imagePrompt\|\|''\)\.trim\(\)&&!x\.promptDirty\)/);
  assert.match(app,/openScriptEditor\(n,'batch-image'\)/);
  assert.match(app,/title:'分镜提示词'/);
  assert.match(core,/if\(!text\(shot\.imagePrompt\)\.trim\(\)\)return false/);
});

test('browser loads the V5 workbench with a fresh cache key',()=>{
  assert.match(bootstrap,/const promptWorkbenchV='20260908-storyboard-prompt-workbench-v5-1'/);
  assert.match(bootstrap,/script-final-prompt-workbench-v4\.js\?v=\$\{promptWorkbenchV\}/);
  assert.match(bootstrap,/script-final-prompt-workbench-v4\.css\?v=\$\{promptWorkbenchV\}/);
});
''',encoding='utf-8')

print('Storyboard Prompt Workbench V5 patch applied.')
