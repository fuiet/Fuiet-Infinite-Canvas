from pathlib import Path
import re

root=Path('_read_123_zip_20260821_180410')
app_path=root/'app.js'
css_path=root/'styles'/'text-node.css'
index_path=root/'index.html'
bootstrap_path=root/'browser-bootstrap.js'
test_path=root/'tests'/'text-result-editor-ui.test.mjs'

app=app_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')
bootstrap=bootstrap_path.read_text(encoding='utf-8')

# 1) Normal text results have no top AI action toolbar.
old_actions="if(n.type==='text')return[{label:'改写',action:'text-rewrite',primary:true},{label:'扩写',action:'text-expand'},{label:'精简',action:'text-simplify'},{label:'翻译',action:'text-translate'},{label:'文生图',action:'text-image'},{label:'文生视频',action:'text-video'}];"
if old_actions not in app:
    raise SystemExit('text top actions anchor missing')
app=app.replace(old_actions,"if(n.type==='text')return[];",1)

toolbar_anchor="""    const contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
"""
if toolbar_anchor not in app:
    raise SystemExit('renderToolbar text anchor missing')
app=app.replace(toolbar_anchor,"""    if(n?.type==='text'){toolbar.classList.add('hidden');return}
    const contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
""",1)

# 2) Reuse the existing rich-text formatting logic and make Expand open a true fullscreen editor.
format_pattern=re.compile(r"  function runManualTextFormat\(n,action\)\{[\s\S]*?\n  \}\n  function renderManualTextToolbar",re.M)
format_replacement="""  function applyManualTextFormat(n,editor,action){
    if(!editor)return;
    if(action==='copy'){
      const selected=String(window.getSelection?.()?.toString?.()||'').trim(),value=selected||manualTextPlainValue(editor);
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>showToast('已复制文本')).catch(()=>showToast('复制失败'));
      else showToast('当前浏览器不支持剪贴板复制');
      return;
    }
    editor.focus();
    if(action==='clear'){document.execCommand('removeFormat',false,null);document.execCommand('formatBlock',false,'P')}
    if(action==='h1')document.execCommand('formatBlock',false,'H1');
    if(action==='h2')document.execCommand('formatBlock',false,'H2');
    if(action==='h3')document.execCommand('formatBlock',false,'H3');
    if(action==='p')document.execCommand('formatBlock',false,'P');
    if(action==='bold')document.execCommand('bold',false,null);
    if(action==='italic')document.execCommand('italic',false,null);
    if(action==='bullet')document.execCommand('insertUnorderedList',false,null);
    if(action==='number')document.execCommand('insertOrderedList',false,null);
    if(action==='rule')document.execCommand('insertHorizontalRule',false,null);
    syncManualTextEditor(n,editor);
  }
  function runManualTextFormat(n,action){
    const editor=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`);if(!editor)return;
    if(action==='expand'){openTextFullscreenEditor(n);return;}
    applyManualTextFormat(n,editor,action);
  }
  function renderManualTextToolbar"""
app,count=format_pattern.subn(format_replacement,app,count=1)
if count!=1:
    raise SystemExit(f'format function replacement count={count}')

app=app.replace('data-text-format="expand" title="展开 / 收起">↗</button>','data-text-format="expand" title="全屏编辑">↗</button>',1)

fullscreen_anchor="""  function beginManualTextEdit(n){
"""
if fullscreen_anchor not in app:
    raise SystemExit('beginManualTextEdit anchor missing')
fullscreen_fn="""  function openTextFullscreenEditor(n){
    if(!n||n.type!=='text'||!n.textEditing)return;
    const inlineEditor=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`);
    if(inlineEditor)syncManualTextEditor(n,inlineEditor);
    const editorHtml=sanitizeManualTextHtml(String(n.textHtml||plainTextToManualHtml(n.text||n.generatedText||'')));
    featureModal.classList.add('text-fullscreen-modal');
    featureModal.innerHTML=`<div class=\"text-fullscreen-shell\"><header class=\"text-fullscreen-head\"><b>${escapeHtml(n.title||'文本节点')}</b><button type=\"button\" data-text-fullscreen-close aria-label=\"退出全屏\">×</button></header><div class=\"text-fullscreen-toolbar\"><button class=\"text-format-btn text-format-clear\" data-text-fullscreen-format=\"clear\" title=\"清除格式\"><span>∅</span></button><span class=\"text-format-separator\"></span><button class=\"text-format-btn\" data-text-fullscreen-format=\"h1\" title=\"一级标题\">H1</button><button class=\"text-format-btn\" data-text-fullscreen-format=\"h2\" title=\"二级标题\">H2</button><button class=\"text-format-btn\" data-text-fullscreen-format=\"h3\" title=\"三级标题\">H3</button><button class=\"text-format-btn text-format-paragraph\" data-text-fullscreen-format=\"p\" title=\"正文\">¶</button><span class=\"text-format-separator\"></span><button class=\"text-format-btn text-format-bold\" data-text-fullscreen-format=\"bold\" title=\"加粗\">B</button><button class=\"text-format-btn text-format-italic\" data-text-fullscreen-format=\"italic\" title=\"斜体\">I</button><span class=\"text-format-separator\"></span><button class=\"text-format-btn text-format-list\" data-text-fullscreen-format=\"bullet\" title=\"无序列表\"><span>•</span><i>≡</i></button><button class=\"text-format-btn text-format-list\" data-text-fullscreen-format=\"number\" title=\"有序列表\"><span>1</span><i>≡</i></button><span class=\"text-format-separator\"></span><button class=\"text-format-btn text-format-rule\" data-text-fullscreen-format=\"rule\" title=\"分割线\">—</button><span class=\"text-format-separator\"></span><button class=\"text-format-btn\" data-text-fullscreen-format=\"copy\" title=\"复制\">▣</button></div><main class=\"text-fullscreen-content\"><div class=\"text-fullscreen-editor\" data-text-fullscreen-editor contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" spellcheck=\"true\">${editorHtml}</div></main></div>`;
    featureModal.classList.remove('hidden');
    const editor=$('[data-text-fullscreen-editor]',featureModal);
    const close=()=>{
      if(editor)syncManualTextEditor(n,editor);
      featureModal.classList.add('hidden');featureModal.classList.remove('text-fullscreen-modal');featureModal.innerHTML='';featureModal.onpointerdown=null;
      render();
      setTimeout(()=>{$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`)?.focus();renderToolbar()},0);
    };
    $('[data-text-fullscreen-close]',featureModal).onclick=close;
    $$('[data-text-fullscreen-format]',featureModal).forEach(btn=>{btn.onpointerdown=e=>e.preventDefault();btn.onclick=e=>{e.preventDefault();e.stopPropagation();applyManualTextFormat(n,editor,btn.dataset.textFullscreenFormat)}});
    editor?.addEventListener('input',()=>syncManualTextEditor(n,editor));
    editor?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close()}});
    featureModal.onpointerdown=e=>e.stopPropagation();
    requestAnimationFrame(()=>{editor?.focus();if(editor){const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}});
  }

"""
app=app.replace(fullscreen_anchor,fullscreen_fn+"  function beginManualTextEdit(n,{fromResult=false}={}){\n",1)

# Enter edit mode immediately on generated result double-click, with a visibly larger card.
begin_old="""    n.textInputMode='manual';
    n.textEditing=false;
    n.w=560;
    n.h=320;
"""
if begin_old not in app:
    raise SystemExit('beginManualTextEdit sizing anchor missing')
app=app.replace(begin_old,"""    n.textInputMode='manual';
    n.textEditing=Boolean(fromResult);
    n.w=fromResult?700:560;
    n.h=fromResult?400:320;
""",1)

begin_tail="""    toolbar.classList.add('hidden');
    saveState();
    render();
  }
  function startManualTextEditing(n){
"""
if begin_tail not in app:
    raise SystemExit('beginManualTextEdit tail anchor missing')
app=app.replace(begin_tail,"""    toolbar.classList.add('hidden');
    saveState();
    render();
    if(fromResult)setTimeout(()=>{
      const field=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`);field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
      renderToolbar();
    },0);
  }
  function startManualTextEditing(n){
""",1)

# Bind the requested double-click directly on every generated text result node.
dbl_anchor="""    if(n.type==='text'&&n.textInputMode==='manual'&&!n.textEditing){
      el.addEventListener('dblclick',e=>{
"""
if dbl_anchor not in app:
    raise SystemExit('manual dblclick anchor missing')
app=app.replace(dbl_anchor,"""    if(n.type==='text'&&contentState==='result'&&n.textInputMode!=='manual'){
      el.addEventListener('dblclick',e=>{
        if(e.target.closest('button,.node-port,.node-resize-handle'))return;
        e.preventDefault();e.stopPropagation();beginManualTextEdit(n,{fromResult:true});
      });
    }
    if(n.type==='text'&&n.textInputMode==='manual'&&!n.textEditing){
      el.addEventListener('dblclick',e=>{
""",1)

app=app.replace("beginManualTextEdit(n)});","beginManualTextEdit(n,{fromResult:true})});",1)

# Fullscreen modal cleanup must not leak to the next feature dialog.
app=app.replace("function closeFeatureModal(){ featureModal.classList.add('hidden'); featureModal.innerHTML=''; }","function closeFeatureModal(){ featureModal.classList.add('hidden'); featureModal.classList.remove('text-fullscreen-modal'); featureModal.innerHTML=''; }",1)

# 3) Remove the nested visual frame and add fullscreen editor presentation.
css_marker='/* Text result editor v2.7: direct content + fullscreen editing. */'
if css_marker not in css:
    css += """

/* Text result editor v2.7: direct content + fullscreen editing. */
.node.node-text[data-content-state="result"] .text-node-shell.has-text{
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  border-radius:inherit!important;
}
.node.node-text[data-content-state="result"] .text-node-preview{
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  border-radius:0!important;
  background:transparent!important;
  padding:0!important;
}

.feature-modal.text-fullscreen-modal{
  position:fixed!important;
  inset:0!important;
  z-index:420!important;
  padding:0!important;
  display:block!important;
  background:#090a0a!important;
  backdrop-filter:none!important;
}
.feature-modal.text-fullscreen-modal.hidden{display:none!important}
.text-fullscreen-shell{position:absolute;inset:0;background:#090a0a;color:var(--ui-text-1);overflow:hidden}
.text-fullscreen-head{position:absolute;left:0;right:0;top:0;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #262827;background:#090a0a;z-index:2}
.text-fullscreen-head>b{font:500 13px/18px var(--ui-font-sans);color:#dfe1de}
.text-fullscreen-head>button{width:30px;height:30px;border:0;background:transparent;color:#8d918d;font-size:22px;line-height:1;border-radius:7px}
.text-fullscreen-head>button:hover{background:#1c1e1d;color:#fff}
.text-fullscreen-toolbar{position:absolute;top:44px;left:50%;z-index:3;transform:translateX(-50%);height:48px;display:flex;align-items:center;gap:2px;padding:7px 10px;border:1px solid #343735;border-radius:0 0 12px 12px;background:#262827;box-shadow:0 12px 34px rgba(0,0,0,.3)}
.text-fullscreen-toolbar .text-format-btn{width:34px;min-width:34px;height:34px;min-height:34px;display:grid;place-items:center;padding:0;border:0;border-radius:7px;background:transparent;color:#a8aaa7;font:600 13px/1 var(--ui-font-sans);cursor:pointer}
.text-fullscreen-toolbar .text-format-btn:hover,.text-fullscreen-toolbar .text-format-btn:focus-visible{background:#323533;color:#e3e5e2;outline:none}
.text-fullscreen-toolbar .text-format-clear{color:#646865}
.text-fullscreen-toolbar .text-format-paragraph{font-size:17px}
.text-fullscreen-toolbar .text-format-bold{font-size:18px;font-weight:800}
.text-fullscreen-toolbar .text-format-italic{font-size:18px;font-style:italic;font-family:Georgia,serif}
.text-fullscreen-toolbar .text-format-list{display:flex;align-items:center;justify-content:center;gap:2px;font-size:11px}
.text-fullscreen-toolbar .text-format-list i{font:400 15px/1 var(--ui-font-sans);font-style:normal;transform:scaleX(.72)}
.text-fullscreen-toolbar .text-format-rule{font-size:19px;font-weight:400}
.text-fullscreen-toolbar .text-format-separator{width:1px;height:22px;flex:0 0 1px;margin:0 3px;background:#3a3d3b}
.text-fullscreen-content{position:absolute;top:108px;bottom:24px;left:50%;width:min(760px,calc(100vw - 64px));transform:translateX(-50%);overflow:auto;scrollbar-width:thin;scrollbar-color:#454846 transparent}
.text-fullscreen-editor{width:100%;min-height:100%;padding:0 4px 48px;outline:0;border:0;background:transparent;color:#e6e6e3;caret-color:#e6e6e3;font:400 16px/1.7 var(--ui-font-sans);overflow-wrap:anywhere;user-select:text}
.text-fullscreen-editor h1{margin:0 0 14px;font:700 30px/1.3 var(--ui-font-sans)}
.text-fullscreen-editor h2{margin:0 0 12px;font:700 24px/1.35 var(--ui-font-sans)}
.text-fullscreen-editor h3{margin:0 0 10px;font:650 20px/1.4 var(--ui-font-sans)}
.text-fullscreen-editor p{margin:0 0 10px}
.text-fullscreen-editor ul,.text-fullscreen-editor ol{margin:8px 0 10px;padding-left:24px}
.text-fullscreen-editor blockquote{margin:10px 0;padding-left:14px;border-left:2px solid #4d514f;color:var(--ui-text-2)}
.text-fullscreen-editor hr{margin:14px 0;border:0;border-top:1px solid #464946}
"""

# Cache bust only the files touched here while retaining previous tokens for older regression tests.
old_css='styles/text-node.css?v=20260901-text-result-card-scroll-1'
if old_css not in index:
    raise SystemExit('text css cache anchor missing')
index=index.replace(old_css,old_css+'&ui=text-result-editor-1',1)
old_app='`./app.js?v=${v}&fix=generator-input-focus-1`'
if old_app not in bootstrap:
    raise SystemExit('app cache anchor missing')
bootstrap=bootstrap.replace(old_app,'`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1`',1)

# Focused regression coverage for the requested interaction.
test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('normal text results do not expose the old AI action toolbar',()=>{
  assert.match(app,/if\(n\.type==='text'\)return\[\];/);
  assert.match(app,/if\(n\?\.type==='text'\)\{toolbar\.classList\.add\('hidden'\);return\}/);
  assert.doesNotMatch(app,/if\(n\.type==='text'\)return\[\{label:'改写'/);
});

test('generated text enters a larger editable node on double click',()=>{
  assert.match(app,/beginManualTextEdit\(n,\{fromResult:true\}\)/);
  assert.match(app,/n\.textEditing=Boolean\(fromResult\)/);
  assert.match(app,/n\.w=fromResult\?700:560;/);
  assert.match(app,/n\.h=fromResult\?400:320;/);
});

test('text result content is direct and frameless inside the node',()=>{
  assert.match(css,/data-content-state="result"\] \.text-node-preview\{[\s\S]*?border:0!important;[\s\S]*?box-shadow:none!important;[\s\S]*?background:transparent!important;/);
});

test('editing toolbar expand opens a real fullscreen editor',()=>{
  assert.match(app,/if\(action==='expand'\)\{openTextFullscreenEditor\(n\);return;\}/);
  assert.match(app,/function openTextFullscreenEditor\(n\)/);
  assert.match(app,/data-text-fullscreen-editor contenteditable="true"/);
  assert.match(css,/\.feature-modal\.text-fullscreen-modal\{[\s\S]*?position:fixed!important;[\s\S]*?inset:0!important;/);
});

test('text editor assets are cache busted without removing prior fixes',()=>{
  assert.match(index,/text-node\.css\?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1/);
});
""",encoding='utf-8')

app_path.write_text(app,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
bootstrap_path.write_text(bootstrap,encoding='utf-8')
print('patched text result editor UI')
