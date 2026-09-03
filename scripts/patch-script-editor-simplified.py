from pathlib import Path
import re

root=Path('_read_123_zip_20260821_180410')
app=root/'app.js'
bootstrap=root/'browser-bootstrap.js'
index=root/'index.html'
css=root/'styles/script-editor-simplified-v1.css'
test=root/'tests/script-editor-simplified.test.mjs'


def replace_once(path, old, new, label):
    text=path.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    path.write_text(text.replace(old,new,1),encoding='utf-8')

# Full-screen script studio class must be cleaned up with the modal.
replace_once(app,
"function closeFeatureModal(){ featureModal.classList.add('hidden'); featureModal.classList.remove('text-fullscreen-modal'); featureModal.innerHTML=''; }",
"function closeFeatureModal(){ featureModal.classList.add('hidden'); featureModal.classList.remove('text-fullscreen-modal','script-studio-fullscreen'); featureModal.innerHTML=''; }",
'close modal class cleanup')

# Keep only the three production steps in the workflow header.
text=app.read_text(encoding='utf-8')
pattern=r"function scriptWorkflowStepsHtml\(d,tab\)\{(.*?)\n  \}\n  function scriptAssetLookup"
m=re.search(pattern,text,re.S)
if not m: raise SystemExit('scriptWorkflowStepsHtml block not found')
block=m.group(0)
block_new=re.sub(r"return `<div class=\\\"script-workflow-head\\\"><div class=\\\"script-workflow-steps\\\">\$\{steps\.map\(x=>`<button data-script-tab=\\\"\$\{x\.tab\}\\\" class=\\\"script-step \$\{tab===x\.tab\?'active':''\} \$\{x\.done\?'done':''\}\\\"><i>\$\{x\.done\?'✓':x\.no\}</i><span><b>\$\{x\.title\}</b><small>\$\{x\.meta\}</small></span></button>`\)\.join\('<em></em>'\)\}</div><div class=\\\"script-workflow-progress\\\">.*?</div></div>`;",
             "return `<div class=\"script-workflow-head simplified\"><div class=\"script-workflow-steps\">${steps.map(x=>`<button data-script-tab=\"${x.tab}\" class=\"script-step ${tab===x.tab?'active':''} ${x.done?'done':''}\"><i>${x.done?'✓':x.no}</i><span><b>${x.title}</b><small>${x.meta}</small></span></button>`).join('<em></em>')}</div></div>`;",
             block,count=1,flags=re.S)
if block_new==block: raise SystemExit('workflow header return not replaced')
text=text.replace(block,block_new,1)
app.write_text(text,encoding='utf-8')

# Add compact visual-description helpers before the shots table renderer.
marker="  function scriptShotsHtml(n,d){"
helpers=r'''  function scriptShotVisualDescription(d,shot){
    const action=String(shot?.action||'').trim(),cat=scriptAssetCatalog(d),refs=matchShotAssets(shot,d).map(id=>cat.find(a=>a.id===id)).filter(Boolean),tokens=[];
    for(const a of refs){const tag='@'+String(a.name||'').trim();if(tag!=='@'&&!action.includes(tag)&&!tokens.includes(tag))tokens.push(tag)}
    return [tokens.join(' '),action].filter(Boolean).join(tokens.length&&action?'，':'');
  }
  function scriptShotDescriptionHtml(d,shot){
    let html=escapeHtml(scriptShotVisualDescription(d,shot));
    for(const a of scriptAssetCatalog(d).filter(a=>a.name).sort((a,b)=>String(b.name).length-String(a.name).length)){
      const token=escapeHtml('@'+a.name);html=html.split(token).join(`<span class="shot-mention-token">${token}</span>`);
    }
    return html||'<span class="shot-description-empty">点击填写画面描述</span>';
  }
  function syncShotMentionsFromDescription(d,shot,text){
    const cat=scriptAssetCatalog(d),mentioned=cat.filter(a=>a.name&&String(text||'').includes('@'+a.name));
    shot.assetRefs=mentioned.map(a=>a.id);
    shot.characters=mentioned.filter(a=>a.assetType==='character').map(a=>a.name).join('、');
    const scenes=mentioned.filter(a=>a.assetType==='scene').map(a=>a.name);shot.scene=scenes[0]||'';
    shot.props=mentioned.filter(a=>a.assetType==='prop').map(a=>a.name).join('、');
  }
  function scriptFinalPromptHtml(shot){
    if(shot?.promptDirty)return '<span class="shot-prompt-pending">待重新合成</span>';
    const image=String(shot?.imagePrompt||'').trim(),video=String(shot?.videoPrompt||'').trim();
    if(!image&&!video)return '<span class="shot-prompt-pending">待生成提示词</span>';
    return `<div class="shot-final-prompt">${image?`<span><b>图</b>${escapeHtml(image)}</span>`:''}${video?`<span><b>视频</b>${escapeHtml(video)}</span>`:''}</div>`;
  }
  function openShotDescriptionEditor(n,d,shot,rerender){
    $('.shot-description-editor',featureModal)?.remove();
    const current=scriptShotVisualDescription(d,shot),catalog=scriptAssetCatalog(d).filter(a=>a.name),overlay=document.createElement('div');
    overlay.className='shot-description-editor';
    overlay.innerHTML=`<div class="shot-description-dialog"><header><div><b>镜头 ${shot.no} · 画面描述</b><span>直接修改完整画面；输入 @ 可引用角色、场景和道具资产</span></div><button type="button" data-shot-desc-close>×</button></header><div class="shot-description-field"><textarea data-shot-description-text rows="8">${escapeHtml(current)}</textarea><div class="shot-mention-menu hidden" data-shot-mention-menu></div></div><footer><span>输入 @ 选择资产，引用会同步到该镜头</span><div><button type="button" data-shot-desc-cancel>取消</button><button type="button" class="primary" data-shot-desc-save>保存</button></div></footer></div>`;
    featureModal.appendChild(overlay);
    const ta=$('[data-shot-description-text]',overlay),menu=$('[data-shot-mention-menu]',overlay);
    const close=()=>overlay.remove();
    const renderMentions=()=>{
      const pos=ta.selectionStart??ta.value.length,before=ta.value.slice(0,pos),at=before.lastIndexOf('@');
      if(at<0){menu.classList.add('hidden');return}
      const query=before.slice(at+1);if(/[\s，。；、!?！？]/.test(query)){menu.classList.add('hidden');return}
      const matches=catalog.filter(a=>!query||String(a.name).toLowerCase().includes(query.toLowerCase())).slice(0,16);
      if(!matches.length){menu.classList.add('hidden');return}
      menu.innerHTML=matches.map(a=>`<button type="button" data-mention-id="${escapeAttr(a.id)}"><i>${a.assetType==='character'?'角色':a.assetType==='scene'?'场景':'道具'}</i><span>${escapeHtml(a.name)}</span>${a.mediaUrl?'<em>已有参考</em>':''}</button>`).join('');menu.classList.remove('hidden');
      $$('[data-mention-id]',menu).forEach(btn=>btn.onclick=()=>{const asset=catalog.find(a=>a.id===btn.dataset.mentionId);if(!asset)return;const end=ta.selectionStart??ta.value.length,start=ta.value.slice(0,end).lastIndexOf('@');ta.setRangeText('@'+asset.name,start,end,'end');menu.classList.add('hidden');ta.focus()});
    };
    ta.addEventListener('input',renderMentions);ta.addEventListener('keyup',renderMentions);ta.addEventListener('click',renderMentions);
    $('[data-shot-desc-close]',overlay).onclick=close;$('[data-shot-desc-cancel]',overlay).onclick=close;
    $('[data-shot-desc-save]',overlay).onclick=()=>{const value=ta.value.trim();shot.action=value;syncShotMentionsFromDescription(d,shot,value);markScriptShotDirty(shot,'画面描述已修改');scriptWorkflowInvalidate(d,'shots');saveState();close();rerender()};
    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});setTimeout(()=>ta.focus(),0);
  }
'''
text=app.read_text(encoding='utf-8')
if marker not in text: raise SystemExit('scriptShotsHtml marker not found')
text=text.replace(marker,helpers+marker,1)
app.write_text(text,encoding='utf-8')

# Replace the shots table only; number of rows stays dynamic via d.shots.map().
text=app.read_text(encoding='utf-8')
start=text.find('  function scriptShotsHtml(n,d){')
end=text.find('\n  function scriptWorkflowStats(d){',start)
if start<0 or end<0: raise SystemExit('scriptShotsHtml function boundary not found')
new_fn=r'''  function scriptShotsHtml(n,d){const stats=scriptWorkflowStats(d);return `<div class="script-table-wrap simplified"><table class="script-editor-table simplified"><thead><tr><th>镜号</th><th>时长</th><th>画面描述</th><th>景别</th><th>光影氛围</th><th>对白 / 旁白</th><th>音效</th><th>运镜</th><th>最终提示词</th><th>操作</th></tr></thead><tbody>${d.shots.map((s,i)=>`<tr data-shot-row="${s.id}"><td class="shot-number">${i+1}</td><td><input class="shot-duration" data-shot="duration" type="number" min=".5" step=".5" value="${Number(s.duration||3)}"><span class="shot-duration-unit">s</span></td><td class="shot-description-column"><button type="button" class="shot-description-cell" data-edit-shot-description="${s.id}">${scriptShotDescriptionHtml(d,s)}</button></td><td><select data-shot="shotSize">${['大全景','全景','中景','近景','特写','极特写'].map(x=>`<option ${x===s.shotSize?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea data-shot="lighting">${escapeHtml(s.lighting||'')}</textarea></td><td><textarea data-shot="dialogue">${escapeHtml(s.dialogue||'')}</textarea></td><td><textarea data-shot="sound">${escapeHtml(s.sound||'')}</textarea></td><td><textarea data-shot="cameraMovement">${escapeHtml(s.cameraMovement||'')}</textarea></td><td class="shot-final-prompt-column">${scriptFinalPromptHtml(s)}</td><td class="shot-actions-column"><button type="button" class="shot-more-btn" data-shot-menu="${s.id}" aria-label="镜头操作">•••</button><div class="shot-row-menu hidden" data-shot-row-menu="${s.id}"><button data-move-shot="up" data-shot-id="${s.id}" ${i===0?'disabled':''}>上移</button><button data-move-shot="down" data-shot-id="${s.id}" ${i===d.shots.length-1?'disabled':''}>下移</button><button class="danger" data-delete-shot="${s.id}">删除镜头</button></div></td></tr>`).join('')}</tbody></table></div><div class="script-bottom-actions simplified"><button id="addShot">＋ 添加镜头</button><span class="spacer"></span><button id="confirmScriptShots" class="primary">${stats.shotsConfirmed?'下一步：准备资产':'确认镜头 → 准备资产'}</button></div>`}
'''
text=text[:start]+new_fn+text[end:]
app.write_text(text,encoding='utf-8')

# Simplify the editor chrome and enter true full-screen mode.
text=app.read_text(encoding='utf-8')
old="""      modalShell('Script Studio · 分镜故事板',`<div class=\"script-editor-shell\">${scriptWorkflowStepsHtml(d,tab)}<div class=\"script-secondary-tabs\"><button data-script-tab=\"state\" class=\"${tab==='state'?'active':''}\">剧情状态</button><button data-script-tab=\"batch\" class=\"${tab==='batch'?'active':''}\">批量生产</button><button id=\"scriptDashboardBtn\" class=\"script-dashboard-tab\">整集生产看板</button><button id=\"scriptContinuityTop\">连续性检查</button></div><div id=\"scriptEditorContent\" class=\"script-editor-content\"></div></div>`,{full:true});
"""
new="""      modalShell('Script Studio · 分镜故事板',`<div class=\"script-editor-shell simplified\">${scriptWorkflowStepsHtml(d,tab)}<div id=\"scriptEditorContent\" class=\"script-editor-content\"></div></div>`,{full:true});featureModal.classList.add('script-studio-fullscreen');
"""
if old not in text: raise SystemExit('openScriptEditor chrome not found')
text=text.replace(old,new,1)
app.write_text(text,encoding='utf-8')

# Replace the shots-tab binding with null-safe source handling + description editor/menu.
text=app.read_text(encoding='utf-8')
old="""      const saveRows=()=>{$$('[data-shot-row]',featureModal).forEach(r=>{const s=d.shots.find(x=>x.id===r.dataset.shotRow);if(!s)return;$$('[data-shot]',r).forEach(x=>{const k=x.dataset.shot;s[k]=k==='duration'?Number(x.value):x.value})});n.sourceText=$('#scriptSource').value;saveState()};
"""
new="""      const saveRows=()=>{$$('[data-shot-row]',featureModal).forEach(r=>{const s=d.shots.find(x=>x.id===r.dataset.shotRow);if(!s)return;$$('[data-shot]',r).forEach(x=>{const k=x.dataset.shot;s[k]=k==='duration'?Number(x.value):x.value})});const source=$('#scriptSource');if(source)n.sourceText=source.value;saveState()};
"""
if old not in text: raise SystemExit('saveRows binding not found')
text=text.replace(old,new,1)

insert_after="""      $$('[data-shot-row] [data-shot]',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');scriptWorkflowInvalidate(d,'shots');saveRows()});
"""
addition="""      $$('[data-edit-shot-description]',featureModal).forEach(btn=>btn.onclick=()=>{const shot=d.shots.find(s=>s.id===btn.dataset.editShotDescription);if(shot)openShotDescriptionEditor(n,d,shot,rerender)});
      $$('[data-shot-menu]',featureModal).forEach(btn=>btn.onclick=e=>{e.stopPropagation();const menu=$(`[data-shot-row-menu=\"${btn.dataset.shotMenu}\"]`,featureModal);$$('.shot-row-menu',featureModal).forEach(x=>{if(x!==menu)x.classList.add('hidden')});menu?.classList.toggle('hidden')});
"""
if insert_after not in text: raise SystemExit('shot onchange binding not found')
text=text.replace(insert_after,insert_after+addition,1)

# Old controls are no longer visible; make the remaining handlers optional.
text=text.replace("$('#scriptProductionDashboard').onclick=()=>{saveRows();openEpisodeDashboard(n)};$('#scriptContinuityAudit').onclick=()=>{saveRows();openContinuityAudit(n)};", "$('#scriptProductionDashboard')?.addEventListener('click',()=>{saveRows();openEpisodeDashboard(n)});$('#scriptContinuityAudit')?.addEventListener('click',()=>{saveRows();openContinuityAudit(n)});",1)
text=text.replace("$('#downloadScript').onclick=()=>downloadJson(`${state.projectName}-script.json`,d);", "$('#downloadScript')?.addEventListener('click',()=>downloadJson(`${state.projectName}-script.json`,d));",1)
text=text.replace("$('#scriptProvider').onchange=()=>{n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId='';saveRows();rerender()};", "if($('#scriptProvider'))$('#scriptProvider').onchange=()=>{n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId='';saveRows();rerender()};",1)
text=text.replace("$('#scriptModel').onchange=()=>{n.scriptModelId=$('#scriptModel').value;saveRows()};", "if($('#scriptModel'))$('#scriptModel').onchange=()=>{n.scriptModelId=$('#scriptModel').value;saveRows()};",1)
text=text.replace("$('#aiBreakdownScript').onclick=()=>{saveRows();n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId=$('#scriptModel').value;saveState();aiBreakdownScript(n)};", "if($('#aiBreakdownScript'))$('#aiBreakdownScript').onclick=()=>{saveRows();n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId=$('#scriptModel').value;saveState();aiBreakdownScript(n)};",1)
app.write_text(text,encoding='utf-8')

css.write_text(r'''/* Simplified full-screen Script Studio */
.feature-modal.script-studio-fullscreen{padding:0!important;align-items:stretch!important;justify-content:stretch!important}.script-studio-fullscreen .feature-dialog.full{width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;border-radius:0!important;border:0!important;display:flex;flex-direction:column;background:#111315}.script-studio-fullscreen .feature-head{position:absolute;right:10px;top:8px;z-index:8;height:34px!important;min-height:0!important;padding:0!important;border:0!important;background:transparent!important}.script-studio-fullscreen .feature-head>div{display:none}.script-studio-fullscreen .feature-head .feature-close{width:30px;height:30px;border-radius:7px}.script-studio-fullscreen .feature-body{padding:0!important;height:100vh!important;max-height:none!important;overflow:hidden!important}.script-editor-shell.simplified{height:100vh;display:flex;flex-direction:column;min-width:0;background:#111315}.script-workflow-head.simplified{flex:0 0 62px;display:flex;justify-content:center;padding:0 70px;border-bottom:1px solid #292d31;background:#0f1113}.script-workflow-head.simplified .script-workflow-steps{width:min(660px,70vw);grid-template-columns:1fr 72px 1fr 72px 1fr}.script-workflow-head.simplified .script-step{min-width:0;justify-content:flex-start;padding:8px 12px}.script-workflow-head.simplified .script-step b{font-size:11px}.script-workflow-head.simplified .script-step small{font-size:8px}.script-editor-shell.simplified .script-editor-content{flex:1;min-height:0;display:flex;flex-direction:column;padding:0!important;overflow:hidden}.script-table-wrap.simplified{flex:1;min-height:0;overflow:auto;border:0!important;border-radius:0!important;background:#121416}.script-editor-table.simplified{width:100%;min-width:1460px;border-collapse:separate;border-spacing:0;table-layout:fixed}.script-editor-table.simplified thead{position:sticky;top:0;z-index:3;background:#1b1d20}.script-editor-table.simplified th{height:44px;padding:0 9px;text-align:left;font-size:10px;font-weight:500;color:#8e969f;border-right:1px solid #33373c;border-bottom:1px solid #3b3f44}.script-editor-table.simplified td{height:88px;padding:7px 8px;vertical-align:top;border-right:1px solid #2d3135;border-bottom:1px solid #2d3135;background:#151719}.script-editor-table.simplified th:nth-child(1),.script-editor-table.simplified td:nth-child(1){width:54px;text-align:center}.script-editor-table.simplified th:nth-child(2),.script-editor-table.simplified td:nth-child(2){width:70px}.script-editor-table.simplified th:nth-child(3),.script-editor-table.simplified td:nth-child(3){width:380px}.script-editor-table.simplified th:nth-child(4),.script-editor-table.simplified td:nth-child(4){width:92px}.script-editor-table.simplified th:nth-child(5),.script-editor-table.simplified td:nth-child(5){width:190px}.script-editor-table.simplified th:nth-child(6),.script-editor-table.simplified td:nth-child(6){width:220px}.script-editor-table.simplified th:nth-child(7),.script-editor-table.simplified td:nth-child(7){width:160px}.script-editor-table.simplified th:nth-child(8),.script-editor-table.simplified td:nth-child(8){width:170px}.script-editor-table.simplified th:nth-child(9),.script-editor-table.simplified td:nth-child(9){width:180px}.script-editor-table.simplified th:nth-child(10),.script-editor-table.simplified td:nth-child(10){width:68px;text-align:center}.script-editor-table.simplified textarea,.script-editor-table.simplified select,.script-editor-table.simplified input{width:100%;box-sizing:border-box;border:0!important;background:transparent!important;color:#e6e8ea!important;font-size:11px;line-height:1.45;outline:none;box-shadow:none!important}.script-editor-table.simplified textarea{height:72px;resize:none;overflow:auto}.shot-number{padding-top:14px!important;color:#c7ccd1;font-size:12px}.shot-duration{display:inline-block!important;width:38px!important;font-weight:600}.shot-duration-unit{font-size:9px;color:#6f777f}.shot-description-cell{width:100%;height:72px;padding:3px 4px;border:0;background:transparent;color:#e7e9eb;text-align:left;line-height:1.5;font-size:11px;overflow:hidden;cursor:text}.shot-description-cell:hover{background:#1b1f22}.shot-mention-token{color:#22b8d6}.shot-description-empty,.shot-prompt-pending{color:#686f76}.shot-final-prompt{height:70px;overflow:hidden;display:flex;flex-direction:column;gap:5px;color:#aeb5bc;font-size:9px;line-height:1.4}.shot-final-prompt span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.shot-final-prompt b{display:inline-block;margin-right:5px;color:#6fd1e7;font-size:8px}.shot-actions-column{position:relative}.shot-more-btn{width:32px;height:28px;border:0;background:transparent;color:#89919a;font-weight:700;letter-spacing:2px}.shot-row-menu{position:absolute;right:10px;top:39px;z-index:6;width:106px;padding:5px;border:1px solid #353a40;border-radius:8px;background:#202327;box-shadow:0 10px 26px rgba(0,0,0,.36);display:flex;flex-direction:column;gap:3px}.shot-row-menu.hidden{display:none}.shot-row-menu button{height:28px;border:0;border-radius:5px;background:transparent;color:#c9ced3;text-align:left;padding:0 9px;font-size:9px}.shot-row-menu button:hover{background:#2a2e33}.shot-row-menu button.danger{color:#e89393}.script-bottom-actions.simplified{flex:0 0 54px;margin:0!important;padding:9px 14px!important;border-top:1px solid #303439;background:#121416;display:flex;align-items:center}.script-bottom-actions.simplified button{height:32px}.shot-description-editor{position:absolute;inset:0;z-index:30;display:grid;place-items:center;background:rgba(0,0,0,.46)}.shot-description-dialog{width:min(760px,calc(100vw - 44px));border:1px solid #41464c;border-radius:12px;background:#1a1c1f;box-shadow:0 24px 80px rgba(0,0,0,.52);overflow:hidden}.shot-description-dialog header{height:58px;padding:0 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #30343a}.shot-description-dialog header>div{display:flex;flex-direction:column;gap:4px}.shot-description-dialog header b{font-size:12px;color:#f0f2f3}.shot-description-dialog header span{font-size:9px;color:#767e86}.shot-description-dialog header button{width:28px;height:28px;border:0;border-radius:6px;background:#24282c;color:#aeb4ba}.shot-description-field{position:relative;padding:14px}.shot-description-field textarea{width:100%;min-height:190px;padding:12px;border:1px solid #343940;border-radius:8px;background:#121416;color:#eef0f2;font-size:12px;line-height:1.65;resize:vertical;outline:none}.shot-description-field textarea:focus{border-color:#5b6670}.shot-mention-menu{position:absolute;left:14px;top:64px;width:250px;max-height:280px;overflow:auto;padding:5px;border:1px solid #3a4046;border-radius:8px;background:#23262a;box-shadow:0 16px 36px rgba(0,0,0,.4)}.shot-mention-menu.hidden{display:none}.shot-mention-menu button{width:100%;height:38px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:#dfe3e6;display:grid;grid-template-columns:54px 1fr auto;align-items:center;text-align:left}.shot-mention-menu button:hover{background:#30343a}.shot-mention-menu i{font-style:normal;color:#929aa2;font-size:9px}.shot-mention-menu span{font-size:11px}.shot-mention-menu em{font-style:normal;color:#68c9dd;font-size:8px}.shot-description-dialog footer{height:56px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #30343a;color:#737b83;font-size:9px}.shot-description-dialog footer>div{display:flex;gap:8px}.shot-description-dialog footer button{height:32px;padding:0 14px;border:1px solid #383e45;border-radius:7px;background:#24282d;color:#cbd0d5}.shot-description-dialog footer button.primary{background:#f2f3f3;color:#17191b;border-color:#f2f3f3}@media(max-width:1000px){.script-workflow-head.simplified .script-workflow-steps{width:80vw;grid-template-columns:1fr 28px 1fr 28px 1fr}.script-editor-table.simplified{min-width:1280px}}
''',encoding='utf-8')

test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-editor-simplified-v1.css',import.meta.url),'utf8');

test('shot table keeps ten requested columns while shot rows stay dynamic',()=>{
  const start=app.indexOf('function scriptShotsHtml(n,d)');
  const end=app.indexOf('function scriptWorkflowStats(d)',start);
  const fn=app.slice(start,end);
  for(const title of ['镜号','时长','画面描述','景别','光影氛围','对白 / 旁白','音效','运镜','最终提示词','操作'])assert.ok(fn.includes(`<th>${title}</th>`),title);
  for(const removed of ['<th>场景</th>','<th>角色</th>','<th>道具</th>','<th>资产引用</th>','<th>生产</th>','<th>顺序</th>'])assert.ok(!fn.includes(removed),removed);
  assert.ok(fn.includes('d.shots.map((s,i)=>'), 'AI-produced shot count remains dynamic');
});

test('visual description editor supports @ asset mentions and syncs hidden shot metadata',()=>{
  assert.ok(app.includes('openShotDescriptionEditor'));
  assert.ok(app.includes("lastIndexOf('@')"));
  assert.ok(app.includes("shot.assetRefs=mentioned.map(a=>a.id)"));
  assert.ok(app.includes("shot.characters=mentioned.filter"));
  assert.ok(app.includes("shot.scene=scenes[0]||''"));
  assert.ok(app.includes("shot.props=mentioned.filter"));
});

test('script studio is true fullscreen and only exposes the three production steps',()=>{
  assert.ok(app.includes("featureModal.classList.add('script-studio-fullscreen')"));
  assert.ok(css.includes('.feature-modal.script-studio-fullscreen'));
  assert.ok(css.includes('width:100vw!important'));
  assert.ok(css.includes('height:100vh!important'));
  const editorStart=app.indexOf("modalShell('Script Studio · 分镜故事板'");
  const editorEnd=app.indexOf("const c=$('#scriptEditorContent')",editorStart);
  const editor=app.slice(editorStart,editorEnd);
  assert.ok(!editor.includes('script-secondary-tabs'));
});
''',encoding='utf-8')

# Load the new override stylesheet and bust canvas caches.
oldv=re.search(r"const v='([^']+)';",bootstrap.read_text(encoding='utf-8'))
if not oldv: raise SystemExit('bootstrap version not found')
b=bootstrap.read_text(encoding='utf-8').replace(oldv.group(0),"const v='20260903-script-editor-simplified-1';",1)
needle="      loadStyle(`./styles/script-workflow-v2.css?v=${v}`),\n"
if needle not in b: raise SystemExit('script workflow stylesheet load not found')
b=b.replace(needle,needle+"      loadStyle(`./styles/script-editor-simplified-v1.css?v=${v}`),\n",1)
bootstrap.write_text(b,encoding='utf-8')
idx=index.read_text(encoding='utf-8')
idx,n=re.subn(r'browser-bootstrap\.js\?v=[^\"]+', 'browser-bootstrap.js?v=20260903-script-editor-simplified-1', idx, count=1)
if n!=1: raise SystemExit(f'index bootstrap cache: expected 1 match, got {n}')
index.write_text(idx,encoding='utf-8')
