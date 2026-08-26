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


# 1) Make text-node mode a single source of truth.
# Stored legacy textEditing flags must never leave a normal text node in a half-manual state.
migrate_marker = "if(x.type==='script'&&(!x.w||x.w===470||x.w===500))x.w=310;"
migrate_insert = (
    "if(x.type==='text'){"
    "x.textInputMode=x.textInputMode==='manual'?'manual':(x.textInputMode||'ai');"
    "x.textEditing=x.textInputMode==='manual';"
    "if(x.textInputMode==='manual'){if(!x.w||Number(x.w)===700)x.w=560;if(!x.h||Number(x.h)===400)x.h=320}"
    "else{x.textEditorExpanded=false;delete x.textEditorExpandedBackup}"
    "}"
    + migrate_marker
)
if migrate_insert not in app:
    app = replace_once(app, migrate_marker, migrate_insert, 'normalize text mode during state migration')

old_render_normalize = "    if(n.type==='text'&&n.textInputMode==='manual')n.textEditing=true;\n"
new_render_normalize = "    if(n.type==='text')n.textEditing=n.textInputMode==='manual';\n"
if old_render_normalize in app:
    app = replace_once(app, old_render_normalize, new_render_normalize, 'derive textEditing from persistent mode')
elif new_render_normalize not in app:
    raise SystemExit('derive textEditing from persistent mode: current implementation not recognized')

# 2) Every newly-created text node starts from a clean, deterministic state.
old_add_node = """  function addNode(type,worldPt,silent=false){
    snapshot(); const same=state.nodes.length+1;const n={id:uid('n'),type,x:worldPt.x,y:worldPt.y,w:type==='image'?620:type==='script'?310:type==='director'?420:320,title:`${defaultNodeName(type)} ${same}`,prompt:'',providerId:'',modelId:'',modelName:'',selected:false}; if(type==='text') n.text=''; if(type==='image'||type==='video') n.content=''; if(type==='script') ensureScriptData(n); if(type==='director') ensureDirectorData(n); ensureDefaultModel(n);state.nodes.push(n); selectNode(n.id); saveState(); if(!silent)showToast('已创建'+labelForType(type)+'节点');return n;
  }
"""
new_add_node = """  function addNode(type,worldPt,silent=false){
    snapshot(); const same=state.nodes.length+1;const n={id:uid('n'),type,x:worldPt.x,y:worldPt.y,w:type==='image'?620:type==='script'?310:type==='director'?420:320,title:`${defaultNodeName(type)} ${same}`,prompt:'',providerId:'',modelId:'',modelName:'',selected:false};
    if(type==='text'){n.text='';n.generatedText='';n.textHtml='';n.textInputMode='ai';n.textEditing=false;n.textEditorExpanded=false}
    if(type==='image'||type==='video') n.content=''; if(type==='script') ensureScriptData(n); if(type==='director') ensureDirectorData(n); ensureDefaultModel(n);state.nodes.push(n); selectNode(n.id); saveState(); if(!silent)showToast('已创建'+labelForType(type)+'节点');return n;
  }
"""
if old_add_node in app:
    app = replace_once(app, old_add_node, new_add_node, 'initialize text node deterministically')
elif "n.textInputMode='ai';n.textEditing=false;n.textEditorExpanded=false" not in app:
    raise SystemExit('initialize text node deterministically: current implementation not recognized')

# Text nodes already expose their actions inside the node; do not automatically open the bottom composer.
old_palette = "  function runPaletteNode(type,p,fromNodeId){const created=addNode(type,p,true);if(created&&['image','video','audio','text','script'].includes(created.type))expandedNodeId=created.id;if(fromNodeId&&created){const edge=createEdge(fromNodeId,created.id,{type:'asset',silent:true});if(!edge)showToast('这个节点组合无法连接')}saveState();render();return created}\n"
new_palette = "  function runPaletteNode(type,p,fromNodeId){const created=addNode(type,p,true);if(created&&['image','video','audio','script'].includes(created.type))expandedNodeId=created.id;else if(created?.type==='text')expandedNodeId=null;if(fromNodeId&&created){const edge=createEdge(fromNodeId,created.id,{type:'asset',silent:true});if(!edge)showToast('这个节点组合无法连接')}saveState();render();return created}\n"
if old_palette in app:
    app = replace_once(app, old_palette, new_palette, 'do not auto-expand new text nodes')
elif new_palette.strip() not in app:
    raise SystemExit('do not auto-expand new text nodes: current implementation not recognized')

# Selecting a persistent manual node always closes any stale generator surface.
old_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}\n"
new_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}\n"
if old_select in app:
    app = replace_once(app, old_select, new_select, 'manual text selection closes stale composer')
elif "target?.type==='text'&&target.textInputMode==='manual'" not in app:
    raise SystemExit('manual text selection closes stale composer: current implementation not recognized')

render_generator_marker = "    const n=state.nodes.find(x=>x.id===expandedNodeId);if(!n||!['image','video','audio','text','script'].includes(n.type)){generator.classList.add('hidden');return}\n"
render_generator_guard = render_generator_marker + "    if(n.type==='text'&&n.textInputMode==='manual'){expandedNodeId=null;generator.classList.add('hidden');return}\n"
if render_generator_guard not in app:
    app = replace_once(app, render_generator_marker, render_generator_guard, 'manual mode never renders composer')

# 3) Manual mode is two size steps smaller: 560x320 instead of 700x400.
size_replacements = [
    ("n.textEditorExpanded=true;n.textEditorExpandedBackup={w:n.w||700,h:n.h||400};n.w=Math.max(Number(n.w||700),980);n.h=Math.max(Number(n.h||400),620);",
     "n.textEditorExpanded=true;n.textEditorExpandedBackup={w:n.w||560,h:n.h||320};n.w=Math.max(Number(n.w||560),840);n.h=Math.max(Number(n.h||320),520);",
     'manual expanded size'),
    ("const backup=n.textEditorExpandedBackup||{};n.w=Number(backup.w||700);n.h=Number(backup.h||400);n.textEditorExpanded=false;delete n.textEditorExpandedBackup;",
     "const backup=n.textEditorExpandedBackup||{};n.w=Number(backup.w||560);n.h=Number(backup.h||320);n.textEditorExpanded=false;delete n.textEditorExpandedBackup;",
     'manual restore size'),
    ("    n.w=700;\n    n.h=400;\n", "    n.w=560;\n    n.h=320;\n", 'manual base size'),
]
for old, new, label in size_replacements:
    if old in app:
        app = replace_once(app, old, new, label)
    elif new not in app:
        raise SystemExit(f'{label}: current implementation not recognized')

# 4) Re-selecting the manual editor itself must select the node without destroying the editor/caret.
manual_select_helper = r'''  function selectManualTextNode(n,el){
    if(!n||n.type!=='text'||n.textInputMode!=='manual')return;
    selectedEdgeId=null;selectedGroupId=null;expandedNodeId=null;
    selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);
    $$('.node',nodeLayer).forEach(nodeEl=>{
      const active=nodeEl.dataset.id===n.id;
      nodeEl.classList.toggle('selected',active);
      nodeEl.classList.remove('multi-selected');
      nodeEl.dataset.interactionState=active?'selected':'idle';
    });
    generator.classList.add('hidden');
    renderToolbar();
  }
'''
if 'function selectManualTextNode' not in app:
    sync_block = r'''  function syncManualTextEditor(n,editor){
    if(!n||!editor)return;
    n.text=manualTextPlainValue(editor);n.generatedText='';n.textInputMode='manual';n.textHtml=sanitizeManualTextHtml(editor.innerHTML);
    saveState();renderEdges();
  }
'''
    app = replace_once(app, sync_block, sync_block + manual_select_helper, 'manual editor selection helper')

# The toolbar must key off the persistent mode, not the legacy editing flag.
old_toolbar_check = "    if(n?.type==='text'&&n.textEditing){\n"
new_toolbar_check = "    if(n?.type==='text'&&n.textInputMode==='manual'){\n"
if old_toolbar_check in app:
    app = replace_once(app, old_toolbar_check, new_toolbar_check, 'manual toolbar persistent-mode check')
elif new_toolbar_check not in app:
    raise SystemExit('manual toolbar persistent-mode check: current implementation not recognized')

old_result_dblclick = "    if(n.type==='text'&&contentState==='result'&&!n.textEditing){\n"
new_result_dblclick = "    if(n.type==='text'&&contentState==='result'&&n.textInputMode!=='manual'){\n"
if old_result_dblclick in app:
    app = replace_once(app, old_result_dblclick, new_result_dblclick, 'text result double click mode check')
elif new_result_dblclick not in app:
    raise SystemExit('text result double click mode check: current implementation not recognized')

# Clicking a manual editor selects the node and immediately restores its toolbar.
old_events = r'''    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>e.stopPropagation());
      ta.addEventListener('click',e=>e.stopPropagation());
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();syncManualTextEditor(n,e.currentTarget)}
      });
      ta.addEventListener('blur',e=>syncManualTextEditor(n,e.currentTarget));
    }
'''
new_events = r'''    const ta=$('[data-text-manual]',el);
    if(ta){
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
if old_events in app:
    app = replace_once(app, old_events, new_events, 'manual editor re-selection and blur behavior')
elif "selectManualTextNode(n,el)" not in app or "e.currentTarget.blur();renderToolbar()" not in app:
    raise SystemExit('manual editor re-selection and blur behavior: current implementation not recognized')

# Clicking the frame/header of a manual node must release editor focus so Delete works like every other node.
old_node_pointer = "    el.addEventListener('pointerdown', e => onNodePointerDown(e,n,el));\n"
new_node_pointer = r'''    el.addEventListener('pointerdown',e=>{
      if(n.type==='text'&&n.textInputMode==='manual'&&!e.target.closest('[data-text-manual]')){
        const active=document.activeElement;if(active?.matches?.('[data-text-manual]'))active.blur();
      }
      onNodePointerDown(e,n,el);
    });
'''
if old_node_pointer in app:
    app = replace_once(app, old_node_pointer, new_node_pointer, 'manual node normal deletion focus behavior')
elif "active?.matches?.('[data-text-manual]')" not in app:
    raise SystemExit('manual node normal deletion focus behavior: current implementation not recognized')

# 5) CSS must agree with the smaller 560x320 manual canvas.
css_replacements = [
    (".node.node-text.text-node-editing{\n  min-height:400px;", ".node.node-text.text-node-editing{\n  min-height:320px;", 'manual node css height'),
    (".node.node-text.text-node-editing>.node-body{\n  min-height:398px;", ".node.node-text.text-node-editing>.node-body{\n  min-height:318px;", 'manual body css height'),
    (".node.node-text.text-node-editing .text-node-shell.is-manual-editing{\n  min-height:398px;\n  height:100%;\n  padding:24px 30px 26px;", ".node.node-text.text-node-editing .text-node-shell.is-manual-editing{\n  min-height:318px;\n  height:100%;\n  padding:20px 24px 22px;", 'manual shell css size'),
    ("  min-height:344px;\n  height:100%;", "  min-height:264px;\n  height:100%;", 'manual editor css height'),
]
for old, new, label in css_replacements:
    if old in css:
        css = replace_once(css, old, new, label)
    elif new not in css:
        raise SystemExit(f'{label}: current stylesheet not recognized')

# 6) Extend the contract tests for all four reported regressions.
old_toolbar_assert = "  assert.match(app, /n\\?\\.type==='text'&&n\\.textEditing/);\n"
new_toolbar_assert = "  assert.match(app, /n\\?\\.type==='text'&&n\\.textInputMode==='manual'/);\n"
if old_toolbar_assert in tests:
    tests = replace_once(tests, old_toolbar_assert, new_toolbar_assert, 'manual toolbar test uses persistent mode')
elif new_toolbar_assert not in tests:
    raise SystemExit('manual toolbar test uses persistent mode: current test not recognized')

stability_test = r'''

test('text nodes remain stable across creation, selection, manual mode and deletion', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /n\.textInputMode='ai';n\.textEditing=false;n\.textEditorExpanded=false/);
  assert.match(app, /\['image','video','audio','script'\]\.includes\(created\.type\)/);
  assert.match(app, /else if\(created\?\.type==='text'\)expandedNodeId=null/);
  assert.match(app, /if\(n\.type==='text'\)n\.textEditing=n\.textInputMode==='manual'/);
  assert.match(app, /function selectManualTextNode/);
  assert.match(app, /pointerdown',e=>\{e\.stopPropagation\(\);selectManualTextNode\(n,el\)\}/);
  assert.match(app, /e\.currentTarget\.blur\(\);renderToolbar\(\)/);
  assert.match(app, /active\?\.matches\?\.\('\[data-text-manual\]'\)\)active\.blur\(\)/);
  assert.match(app, /n\.w=560/);
  assert.match(app, /n\.h=320/);
  assert.match(css, /\.node\.node-text\.text-node-editing\{\s*min-height:320px/);
});
'''
if "test('text nodes remain stable across creation, selection, manual mode and deletion'" not in tests:
    tests += stability_test

# Final invariants: no known mixed-state regressions may remain.
checks = {
    "new text node still auto-opens composer": "['image','video','audio','text','script'].includes(created.type)",
    "manual toolbar still depends on textEditing": "n?.type==='text'&&n.textEditing",
    "manual editor still swallows selection": "ta.addEventListener('pointerdown',e=>e.stopPropagation())",
    "old manual size still present": "n.w=700;\n    n.h=400;",
}
for label, needle in checks.items():
    if needle in app:
        raise SystemExit(label)

app_path.write_text(app, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
test_path.write_text(tests, encoding='utf-8')
print('Applied text-node stability, sizing, toolbar and deletion fixes.')
