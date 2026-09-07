from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
app_path = root / 'app.js'
boot_path = root / 'browser-bootstrap.js'
highlight_path = root / 'script-shot-description-editor-highlight-v1.js'
highlight_css_path = root / 'styles' / 'script-shot-description-editor-highlight-v1.css'
dialogue_css_path = root / 'styles' / 'script-shot-dialogue-reference-v1.css'
test_path = root / 'tests' / 'script-shot-dialogue-reference.test.mjs'

app = app_path.read_text(encoding='utf-8')

old_sync = """  function syncShotMentionsFromDescription(d,shot,text){
    const cat=scriptAssetCatalog(d),mentioned=cat.filter(a=>a.name&&String(text||'').includes('@'+a.name));
    shot.assetRefs=mentioned.map(a=>a.id);
    shot.characters=mentioned.filter(a=>a.assetType==='character').map(a=>a.name).join('、');
    const scenes=mentioned.filter(a=>a.assetType==='scene').map(a=>a.name);shot.scene=scenes[0]||'';
    shot.props=mentioned.filter(a=>a.assetType==='prop').map(a=>a.name).join('、');
  }
"""
new_sync = """  function autoMentionAssetNames(text,catalog){
    let value=String(text||'');
    const assets=(catalog||[]).filter(a=>a?.name).sort((a,b)=>String(b.name).length-String(a.name).length);
    for(const asset of assets){
      const name=String(asset.name||'').trim();if(!name)continue;
      let cursor=0;
      while(cursor<value.length){
        const index=value.indexOf(name,cursor);if(index<0)break;
        if(value[index-1]!=='@'){value=value.slice(0,index)+'@'+value.slice(index);cursor=index+name.length+1}else cursor=index+name.length;
      }
    }
    return value;
  }
  function scriptShotDialogueText(d,shot){
    return autoMentionAssetNames(String(shot?.dialogue||'').trim(),scriptAssetCatalog(d));
  }
  function scriptShotDialogueHtml(d,shot){
    let html=escapeHtml(scriptShotDialogueText(d,shot));
    for(const a of scriptAssetCatalog(d).filter(a=>a.name).sort((a,b)=>String(b.name).length-String(a.name).length)){
      const token=escapeHtml('@'+a.name);html=html.split(token).join(`<span class=\"shot-mention-token\">${token}</span>`);
    }
    return html||'<span class=\"shot-description-empty\">点击填写对白 / 旁白</span>';
  }
  function syncShotMentionsFromDescription(d,shot,text){
    const cat=scriptAssetCatalog(d),corpus=[String(text||''),String(shot?.dialogue||'')].join('\\n'),mentioned=cat.filter(a=>a.name&&(corpus.includes('@'+a.name)||corpus.includes(a.name)));
    shot.assetRefs=mentioned.map(a=>a.id);
    shot.characters=mentioned.filter(a=>a.assetType==='character').map(a=>a.name).join('、');
    const scenes=mentioned.filter(a=>a.assetType==='scene').map(a=>a.name);shot.scene=scenes[0]||'';
    shot.props=mentioned.filter(a=>a.assetType==='prop').map(a=>a.name).join('、');
  }
"""
if old_sync not in app:
    raise SystemExit('syncShotMentionsFromDescription anchor not found')
app = app.replace(old_sync, new_sync, 1)

anchor = """    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});setTimeout(()=>ta.focus(),0);
  }
  function scriptShotsHtml(n,d){"""
insert = """    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});setTimeout(()=>ta.focus(),0);
  }
  function openShotDialogueEditor(n,d,shot,rerender){
    $('.shot-dialogue-editor',featureModal)?.remove();
    const current=scriptShotDialogueText(d,shot),catalog=scriptAssetCatalog(d).filter(a=>a.name),overlay=document.createElement('div');
    overlay.className='shot-description-editor shot-dialogue-editor';
    overlay.innerHTML=`<div class=\"shot-description-dialog\"><header><div><b>镜头 ${shot.no} · 对白 / 旁白</b><span>直接修改对白或旁白；输入 @ 可引用角色、场景和道具资产</span></div><button type=\"button\" data-shot-dialogue-close>×</button></header><div class=\"shot-description-field\"><textarea data-shot-dialogue-text rows=\"8\">${escapeHtml(current)}</textarea><div class=\"shot-mention-menu hidden\" data-shot-dialogue-mention-menu></div></div><footer><span>输入 @ 选择资产，引用会同步到该镜头</span><div><button type=\"button\" data-shot-dialogue-cancel>取消</button><button type=\"button\" class=\"primary\" data-shot-dialogue-save>保存</button></div></footer></div>`;
    featureModal.appendChild(overlay);
    const ta=$('[data-shot-dialogue-text]',overlay),menu=$('[data-shot-dialogue-mention-menu]',overlay);
    const close=()=>overlay.remove();
    const renderMentions=()=>{
      const pos=ta.selectionStart??ta.value.length,before=ta.value.slice(0,pos),at=before.lastIndexOf('@');
      if(at<0||/\\s/.test(before.slice(at+1))){menu.classList.add('hidden');return}
      const query=before.slice(at+1).toLowerCase(),matches=catalog.filter(a=>!query||String(a.name||'').toLowerCase().includes(query)).slice(0,12);
      if(!matches.length){menu.classList.add('hidden');return}
      menu.innerHTML=matches.map(a=>`<button type=\"button\" data-dialogue-mention-id=\"${escapeAttr(a.id)}\"><i>${a.assetType==='character'?'角色':a.assetType==='scene'?'场景':'道具'}</i><span>${escapeHtml(a.name)}</span>${a.mediaUrl?'<em>已有参考</em>':''}</button>`).join('');menu.classList.remove('hidden');
      $$('[data-dialogue-mention-id]',menu).forEach(btn=>btn.onclick=()=>{const asset=catalog.find(a=>a.id===btn.dataset.dialogueMentionId);if(!asset)return;const end=ta.selectionStart??ta.value.length,start=ta.value.slice(0,end).lastIndexOf('@');ta.setRangeText('@'+asset.name,start,end,'end');menu.classList.add('hidden');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.focus()});
    };
    ta.addEventListener('input',renderMentions);ta.addEventListener('keyup',renderMentions);ta.addEventListener('click',renderMentions);
    $('[data-shot-dialogue-close]',overlay).onclick=close;$('[data-shot-dialogue-cancel]',overlay).onclick=close;
    $('[data-shot-dialogue-save]',overlay).onclick=()=>{const value=autoMentionAssetNames(ta.value.trim(),catalog);shot.dialogue=value;syncShotMentionsFromDescription(d,shot,shot.action||'');markScriptShotDirty(shot,'对白 / 旁白已修改');scriptWorkflowInvalidate(d,'shots');saveState();close();rerender()};
    overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close()});setTimeout(()=>ta.focus(),0);
  }
  function scriptShotsHtml(n,d){"""
if anchor not in app:
    raise SystemExit('dialogue editor insertion anchor not found')
app = app.replace(anchor, insert, 1)

old_cell = """<td><textarea data-shot=\"dialogue\">${escapeHtml(s.dialogue||'')}</textarea></td>"""
new_cell = """<td class=\"shot-dialogue-column\"><textarea data-shot=\"dialogue\" class=\"shot-dialogue-source\" aria-hidden=\"true\">${escapeHtml(s.dialogue||'')}</textarea><button type=\"button\" class=\"shot-dialogue-cell\" data-edit-shot-dialogue=\"${s.id}\">${scriptShotDialogueHtml(d,s)}</button></td>"""
if old_cell not in app:
    raise SystemExit('dialogue table cell anchor not found')
app = app.replace(old_cell, new_cell, 1)

old_bind = """      $$('[data-edit-shot-description]',featureModal).forEach(btn=>btn.onclick=()=>{const shot=d.shots.find(s=>s.id===btn.dataset.editShotDescription);if(shot)openShotDescriptionEditor(n,d,shot,rerender)});
"""
new_bind = old_bind + """      $$('[data-edit-shot-dialogue]',featureModal).forEach(btn=>btn.onclick=()=>{const shot=d.shots.find(s=>s.id===btn.dataset.editShotDialogue);if(shot)openShotDialogueEditor(n,d,shot,rerender)});
"""
if old_bind not in app:
    raise SystemExit('dialogue binding anchor not found')
app = app.replace(old_bind, new_bind, 1)
app_path.write_text(app, encoding='utf-8')

# Generalize the existing textarea mirror highlighter to also support dialogue.
highlight = highlight_path.read_text(encoding='utf-8')
highlight = highlight.replace("const TEXTAREA_SELECTOR='textarea[data-shot-description-text]';", "const TEXTAREA_SELECTOR='textarea[data-shot-description-text],textarea[data-shot-dialogue-text]';")
highlight = highlight.replace("const MARK='data-shot-description-highlight-ready';", "const MARK='data-shot-editor-highlight-ready';")
highlight_path.write_text(highlight, encoding='utf-8')

highlight_css = highlight_css_path.read_text(encoding='utf-8')
highlight_css = highlight_css.replace("textarea[data-shot-description-text]{", "textarea[data-shot-description-text],\n.script-editor-shell.simplified .shot-description-field textarea[data-shot-dialogue-text]{")
highlight_css = highlight_css.replace("textarea[data-shot-description-text]::selection{", "textarea[data-shot-description-text]::selection,\n.script-editor-shell.simplified .shot-description-field textarea[data-shot-dialogue-text]::selection{")
highlight_css_path.write_text(highlight_css, encoding='utf-8')

dialogue_css_path.write_text("""/* Reference-style dialogue / voiceover column: same visual language as shot description. */
.script-editor-table.simplified th:nth-child(6),
.script-editor-table.simplified td:nth-child(6){width:320px!important}
.script-editor-shell.simplified .script-editor-table.simplified th:nth-child(6){text-align:left!important;padding-left:14px!important}
.script-editor-shell.simplified .script-editor-table.simplified td.shot-dialogue-column{padding:0!important;vertical-align:middle!important;text-align:left!important;position:relative}
.script-editor-shell.simplified .shot-dialogue-source{display:none!important}
.script-editor-shell.simplified .shot-dialogue-cell{
  width:100%;min-height:76px;height:auto;max-height:92px;padding:10px 14px!important;
  border:0!important;background:transparent!important;color:#e8ebed!important;
  font-size:13px!important;font-weight:400;line-height:1.62!important;letter-spacing:0;
  text-align:left!important;white-space:pre-wrap;word-break:break-word;overflow:hidden;cursor:text;
  display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:4;
}
.script-editor-shell.simplified .shot-dialogue-cell:hover{background:#191c1f!important}
.script-editor-shell.simplified .shot-dialogue-cell .shot-mention-token{color:#21c7df!important;font-weight:500;background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;white-space:nowrap}
.script-editor-shell.simplified .shot-dialogue-editor .shot-description-field textarea[data-shot-dialogue-text]{font-size:14px!important;line-height:1.65!important;text-align:left!important}
.script-editor-shell.simplified .shot-dialogue-editor .shot-description-highlight-layer{text-align:left!important}
@media(max-width:1200px){.script-editor-table.simplified th:nth-child(6),.script-editor-table.simplified td:nth-child(6){width:280px!important}}
""", encoding='utf-8')

boot = boot_path.read_text(encoding='utf-8')
if "const dialogueV=" not in boot:
    boot = boot.replace("const shotEditorV='20260907-shot-editor-inline-mentions-2';", "const shotEditorV='20260907-shot-editor-inline-mentions-3';\nconst dialogueV='20260907-shot-dialogue-reference-1';")
else:
    boot = boot.replace("const shotEditorV='20260907-shot-editor-inline-mentions-2';", "const shotEditorV='20260907-shot-editor-inline-mentions-3';")
style_anchor = "      loadStyle(`./styles/script-shot-description-editor-highlight-v1.css?v=${shotEditorV}`),\n"
if "script-shot-dialogue-reference-v1.css" not in boot:
    if style_anchor not in boot:
        raise SystemExit('bootstrap style anchor not found')
    boot = boot.replace(style_anchor, style_anchor + "      loadStyle(`./styles/script-shot-dialogue-reference-v1.css?v=${dialogueV}`),\n", 1)
boot_path.write_text(boot, encoding='utf-8')

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-shot-dialogue-reference-v1.css',import.meta.url),'utf8');
const highlighter=fs.readFileSync(new URL('../script-shot-description-editor-highlight-v1.js',import.meta.url),'utf8');

test('dialogue column uses inline asset mentions and a dedicated editor',()=>{
  assert.match(app,/function scriptShotDialogueText\(d,shot\)/);
  assert.match(app,/data-edit-shot-dialogue/);
  assert.match(app,/function openShotDialogueEditor\(n,d,shot,rerender\)/);
  assert.match(app,/data-shot-dialogue-text/);
});

test('dialogue mentions are auto inserted in-place without prepending asset blocks',()=>{
  assert.match(app,/autoMentionAssetNames/);
  assert.match(app,/value\.indexOf\(name,cursor\)/);
  assert.doesNotMatch(css,/chip|pill/i);
  assert.match(css,/shot-mention-token\{color:#21c7df/);
});

test('dialogue-linked assets participate in shot asset references',()=>{
  assert.match(app,/String\(shot\?\.dialogue\|\|''\)/);
  assert.match(app,/corpus\.includes\('@'\+a\.name\)\|\|corpus\.includes\(a\.name\)/);
});

test('dialogue table stays concise, left aligned and line clamped',()=>{
  assert.match(css,/nth-child\(6\).*width:320px/s);
  assert.match(css,/text-align:left!important/);
  assert.match(css,/-webkit-line-clamp:4/);
});

test('dialogue modal reuses the inline cyan textarea highlighter',()=>{
  assert.match(highlighter,/textarea\[data-shot-dialogue-text\]/);
  assert.match(boot,/script-shot-dialogue-reference-v1\.css\?v=\$\{dialogueV\}/);
  assert.match(boot,/shot-editor-inline-mentions-3/);
});

test('confirmed shot description implementation remains present',()=>{
  assert.match(app,/function scriptShotVisualDescription\(d,shot\)/);
  assert.match(app,/function scriptShotDescriptionHtml\(d,shot\)/);
  assert.match(app,/data-edit-shot-description/);
});
""", encoding='utf-8')

print('Dialogue reference patch applied.')
