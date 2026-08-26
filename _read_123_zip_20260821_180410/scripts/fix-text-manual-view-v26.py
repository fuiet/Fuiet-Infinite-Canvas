from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
css_path = root / 'styles' / 'text-node.css'
test_path = root / 'tests' / 'text-node-v23.test.mjs'
app = app_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
tests = test_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Manual mode is persistent, but editing is transient and only begins on double click.
old_migrate = "x.textInputMode=x.textInputMode==='manual'?'manual':(x.textInputMode||'ai');x.textEditing=x.textInputMode==='manual';"
new_migrate = "x.textInputMode=x.textInputMode==='manual'?'manual':(x.textInputMode||'ai');x.textEditing=false;"
if old_migrate in app:
    app = replace_once(app, old_migrate, new_migrate, 'manual edit state must not persist across reload')
elif new_migrate not in app:
    raise SystemExit('manual edit migration state not recognized')

old_render_state = "    if(n.type==='text')n.textEditing=n.textInputMode==='manual';\n"
new_render_state = "    if(n.type==='text'&&n.textInputMode!=='manual')n.textEditing=false;\n"
if old_render_state in app:
    app = replace_once(app, old_render_state, new_render_state, 'manual mode must not force editor open')
elif new_render_state not in app:
    raise SystemExit('manual render state not recognized')

old_class = "    if(n.type==='text'){el.classList.toggle('text-node-editing',Boolean(n.textEditing));el.classList.toggle('text-node-editor-expanded',Boolean(n.textEditorExpanded))}\n"
new_class = "    if(n.type==='text'){el.classList.toggle('text-node-manual',n.textInputMode==='manual');el.classList.toggle('text-node-editing',Boolean(n.textEditing));el.classList.toggle('text-node-editor-expanded',Boolean(n.textEditorExpanded))}\n"
if old_class in app:
    app = replace_once(app, old_class, new_class, 'manual node class')
elif "text-node-manual" not in app:
    raise SystemExit('manual node class not recognized')

old_begin = r'''  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const current=String(n.text||n.generatedText||'');
    n.text=current;
    n.generatedText='';
    n.textHtml=n.textHtml||plainTextToManualHtml(current);
    n.textInputMode='manual';
    // Legacy compatibility flag mirrors the persistent mode; it is never used to exit the mode.
    n.textEditing=true;
    n.w=560;
    n.h=320;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    toolbar.classList.add('hidden');
    saveState();
    render();
    setTimeout(()=>{
      const field=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
    },0);
  }
  function finishManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
    if(editor)syncManualTextEditor(n,editor);
    n.textInputMode='manual';
    n.textEditing=true;
    n.textHtml=sanitizeManualTextHtml(String(n.textHtml||plainTextToManualHtml(n.text||'')));
    saveState();
    renderToolbar();
  }
'''
new_begin = r'''  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const current=String(n.text||n.generatedText||'');
    n.text=current;
    n.generatedText='';
    n.textHtml=n.textHtml||plainTextToManualHtml(current);
    n.textInputMode='manual';
    n.textEditing=false;
    n.w=560;
    n.h=320;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    toolbar.classList.add('hidden');
    saveState();
    render();
  }
  function startManualTextEditing(n){
    if(!n||n.type!=='text'||n.textInputMode!=='manual')return;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    n.textEditing=true;
    saveState();
    render();
    setTimeout(()=>{
      const field=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
    },0);
  }
  function finishManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
    if(editor)syncManualTextEditor(n,editor);
    n.textInputMode='manual';
    n.textEditing=false;
    n.textHtml=sanitizeManualTextHtml(String(n.textHtml||plainTextToManualHtml(n.text||'')));
    saveState();
    render();
  }
'''
if old_begin in app:
    app = replace_once(app, old_begin, new_begin, 'manual mode view/edit split')
elif 'function startManualTextEditing(n)' not in app:
    raise SystemExit('manual mode view/edit split not recognized')

old_text_body = r'''      if(n.textEditing){
        const editorHtml=richTextHtml||plainTextToManualHtml(textValue);
        body=`<div class="text-node-shell is-manual-editing"><div class="text-node-editor" data-text-manual contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="输入内容...">${editorHtml}</div></div>`;
      }else if(textValue.trim()){
        body=`<div class="text-node-shell has-text"><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
      }else{
        body=`<div class="text-node-shell is-empty"><div class="text-node-placeholder" aria-hidden="true"><span class="text-node-lines"><i></i><i></i><i></i><i></i></span></div><div class="text-node-try">尝试：</div><button type="button" data-text-quick="manual"><span>${uiIcon('subtitle')}</span><b>自己编写内容</b></button><button type="button" data-text-quick="video"><span>${uiIcon('video')}</span><b>文生视频</b></button><button type="button" data-text-quick="image"><span>${uiIcon('image')}</span><b>图片反推提示词</b></button></div>`;
      }
'''
new_text_body = r'''      if(n.textInputMode==='manual'&&n.textEditing){
        const editorHtml=richTextHtml||plainTextToManualHtml(textValue);
        body=`<div class="text-node-shell is-manual-editing"><div class="text-node-editor" data-text-manual contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="输入内容...">${editorHtml}</div></div>`;
      }else if(n.textInputMode==='manual'&&!textValue.trim()){
        body=`<div class="text-node-shell is-manual-empty" data-text-manual-view><div class="text-manual-empty-message">请编写内容，开始你的创作。</div><span class="text-manual-empty-lines" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`;
      }else if(textValue.trim()){
        body=`<div class="text-node-shell has-text"><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
      }else{
        body=`<div class="text-node-shell is-empty"><div class="text-node-placeholder" aria-hidden="true"><span class="text-node-lines"><i></i><i></i><i></i><i></i></span></div><div class="text-node-try">尝试：</div><button type="button" data-text-quick="manual"><span>${uiIcon('subtitle')}</span><b>自己编写内容</b></button><button type="button" data-text-quick="video"><span>${uiIcon('video')}</span><b>文生视频</b></button><button type="button" data-text-quick="image"><span>${uiIcon('image')}</span><b>图片反推提示词</b></button></div>`;
      }
'''
if old_text_body in app:
    app = replace_once(app, old_text_body, new_text_body, 'manual empty view')
elif 'text-manual-empty-message' not in app:
    raise SystemExit('manual empty view not recognized')

old_toolbar = "    if(n?.type==='text'&&n.textInputMode==='manual'){\n"
new_toolbar = "    if(n?.type==='text'&&n.textInputMode==='manual'&&n.textEditing){\n"
if old_toolbar in app:
    app = replace_once(app, old_toolbar, new_toolbar, 'toolbar only while editing')
elif new_toolbar not in app:
    raise SystemExit('manual toolbar state not recognized')

# Single click keeps normal node selection; double click enters the editor.
dbl_marker = "    const ta=$('[data-text-manual]',el);\n"
dbl_insert = r'''    if(n.type==='text'&&n.textInputMode==='manual'&&!n.textEditing){
      el.addEventListener('dblclick',e=>{
        if(e.target.closest('button,.node-port,.node-resize-handle'))return;
        e.preventDefault();e.stopPropagation();startManualTextEditing(n);
      });
    }
    const ta=$('[data-text-manual]',el);
'''
if "startManualTextEditing(n);" not in app.split("const ta=$('[data-text-manual]',el);")[0][-1200:]:
    app = replace_once(app, dbl_marker, dbl_insert, 'double click starts manual editor')

old_events = r'''    if(ta){
      ta.addEventListener('pointerdown',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('click',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();syncManualTextEditor(n,e.currentTarget);e.currentTarget.blur();renderToolbar()}
      });
      ta.addEventListener('blur',e=>syncManualTextEditor(n,e.currentTarget));
    }
'''
new_events = r'''    if(ta){
      ta.addEventListener('pointerdown',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('click',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();syncManualTextEditor(n,e.currentTarget);e.currentTarget.blur()}
      });
      ta.addEventListener('blur',e=>{
        syncManualTextEditor(n,e.currentTarget);
        setTimeout(()=>{if(n.textEditing){n.textEditing=false;saveState();render()}},0);
      });
    }
'''
if old_events in app:
    app = replace_once(app, old_events, new_events, 'manual editor exits on blur without leaving manual mode')
elif "setTimeout(()=>{if(n.textEditing){n.textEditing=false;saveState();render()}},0);" not in app:
    raise SystemExit('manual editor blur behavior not recognized')

# Manual view styling from the supplied reference: dark 560x320 node, prompt, four centered lines.
manual_css = r'''

/* Manual text mode v2.6: single-click select, double-click edit. */
.node.node-text.text-node-manual{
  min-height:320px;
  border:1px solid #555957;
  border-radius:18px;
  background:#151616;
  box-shadow:none;
}
.node.node-text.text-node-manual:hover{border-color:#6b6f6c}
.node.node-text.text-node-manual.selected,
.node.node-text.text-node-manual[data-interaction-state="selected"]{
  border-color:#858986;
  box-shadow:none;
}
.node.node-text.text-node-manual>.node-body{
  min-height:318px;
  height:100%;
  border-radius:inherit;
  background:#151616;
  overflow:hidden;
}
.text-node-shell.is-manual-empty{
  min-height:318px;
  height:100%;
  padding:62px 24px 24px;
  align-items:center;
  background:#151616;
  cursor:default;
}
.text-manual-empty-message{
  color:#a9aaa7;
  font:400 18px/1.5 var(--ui-font-sans);
  text-align:center;
  user-select:none;
}
.text-manual-empty-lines{
  width:86px;
  display:flex;
  flex-direction:column;
  gap:7px;
  margin-top:43px;
  color:#626562;
}
.text-manual-empty-lines>i{
  display:block;
  width:86px;
  height:8px;
  border-radius:1px;
  background:currentColor;
}
.text-manual-empty-lines>i:last-child{width:52px}
'''
if '/* Manual text mode v2.6:' not in css:
    css += manual_css

# Update contract tests to the new interaction model.
old_toolbar_assert = "  assert.match(app, /n\\?\\.type==='text'&&n\\.textInputMode==='manual'/);\n"
new_toolbar_assert = "  assert.match(app, /n\\?\\.type==='text'&&n\\.textInputMode==='manual'&&n\\.textEditing/);\n"
if old_toolbar_assert in tests:
    tests = replace_once(tests, old_toolbar_assert, new_toolbar_assert, 'toolbar test uses transient edit flag')

old_stability_render = "  assert.match(app, /if\\(n\\.type==='text'\\)n\\.textEditing=n\\.textInputMode==='manual'/);\n"
new_stability_render = "  assert.match(app, /if\\(n\\.type==='text'&&n\\.textInputMode!=='manual'\\)n\\.textEditing=false/);\n"
if old_stability_render in tests:
    tests = replace_once(tests, old_stability_render, new_stability_render, 'stability test for transient edit state')

old_escape_assert = "  assert.match(app, /e\\.currentTarget\\.blur\\(\\);renderToolbar\\(\\)/);\n"
new_escape_assert = "  assert.match(app, /e\\.currentTarget\\.blur\\(\\)/);\n"
if old_escape_assert in tests:
    tests = replace_once(tests, old_escape_assert, new_escape_assert, 'escape test')

manual_view_test = r'''

test('manual text mode shows an empty prompt and enters editing only on double click', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /请编写内容，开始你的创作。/);
  assert.match(app, /text-manual-empty-lines/);
  assert.match(app, /n\.textInputMode==='manual'&&!n\.textEditing/);
  assert.match(app, /addEventListener\('dblclick'/);
  assert.match(app, /startManualTextEditing\(n\)/);
  assert.match(app, /n\.textEditing=false/);
  assert.match(css, /\.node\.node-text\.text-node-manual/);
  assert.match(css, /\.text-node-shell\.is-manual-empty/);
});
'''
if "manual text mode shows an empty prompt and enters editing only on double click" not in tests:
    tests += manual_view_test

# Final contracts.
required_app = [
    '请编写内容，开始你的创作。',
    'function startManualTextEditing(n)',
    "n.textInputMode==='manual'&&!n.textEditing",
    "n?.type==='text'&&n.textInputMode==='manual'&&n.textEditing",
    "setTimeout(()=>{if(n.textEditing){n.textEditing=false;saveState();render()}},0);",
]
for marker in required_app:
    if marker not in app:
        raise SystemExit(f'missing app contract: {marker}')
if "if(n.type==='text')n.textEditing=n.textInputMode==='manual'" in app:
    raise SystemExit('manual mode still forces editing on every render')

app_path.write_text(app, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
test_path.write_text(tests, encoding='utf-8')
print('Applied manual text view / double-click edit behavior.')
