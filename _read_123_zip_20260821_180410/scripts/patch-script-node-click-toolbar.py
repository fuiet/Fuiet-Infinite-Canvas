from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app.js'
CSS = ROOT / 'styles' / 'script-node-progress-v1.css'
BOOTSTRAP = ROOT / 'browser-bootstrap.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


app = APP.read_text(encoding='utf-8')

# A generated script card should behave like a normal selectable canvas node.
# Only the dedicated "打开脚本节点" button enters the full-screen script editor.
old_ready = "    return `<button type=\"button\" class=\"script-node-ready\" data-open-script=\"${escapeAttr(n.id)}\" aria-label=\"打开脚本节点\"><span class=\"script-ready-icon\" aria-hidden=\"true\"><i></i><i></i><i></i></span><span class=\"script-ready-steps\">${steps.map(([label,no,done])=>`<span class=\"script-ready-step ${done?'done':''}\"><i>${done?'✓':no}</i><b>${label}</b></span>`).join('<em></em>')}</span><span class=\"script-ready-open\">打开脚本节点 →</span></button>`;"
new_ready = "    return `<div class=\"script-node-ready\" data-script-node-ready=\"${escapeAttr(n.id)}\" aria-label=\"脚本节点\"><span class=\"script-ready-icon\" aria-hidden=\"true\"><i></i><i></i><i></i></span><span class=\"script-ready-steps\">${steps.map(([label,no,done])=>`<span class=\"script-ready-step ${done?'done':''}\"><i>${done?'✓':no}</i><b>${label}</b></span>`).join('<em></em>')}</span><button type=\"button\" class=\"script-ready-open\" data-open-script=\"${escapeAttr(n.id)}\">打开脚本节点 →</button></div>`;"
if 'data-script-node-ready=' not in app:
    app = replace_once(app, old_ready, new_ready, 'script ready selectable card')

old_open_listener = "    $('[data-open-script]',el)?.addEventListener('click',e=>{e.stopPropagation();openScriptEditor(n)});"
new_open_listener = "    $('[data-open-script]',el)?.addEventListener('click',e=>{e.stopPropagation();openScriptEditor(n)});\n    $('[data-script-node-ready]',el)?.addEventListener('click',e=>{if(e.target.closest('[data-open-script]'))return;e.stopPropagation();selectNode(n.id)});"
if "[data-script-node-ready]',el)?.addEventListener('click'" not in app:
    app = replace_once(app, old_open_listener, new_open_listener, 'script ready click selection')

# Script nodes use the compact result toolbar from the reference: just the three
# production actions, without the generic "脚本结果" label.
old_toolbar_tail = "    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px';\n    toolbar.innerHTML=`<span class=\"selection-toolbar-label\">${escapeHtml(labelForType(n.type))}结果</span>`+actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));"
new_toolbar_tail = "    if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));\n      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-estimatedWidth-16,r.left+r.width/2-estimatedWidth/2))+'px';\n      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-58)+'px';\n      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;\n    }\n    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px';\n    toolbar.innerHTML=`<span class=\"selection-toolbar-label\">${escapeHtml(labelForType(n.type))}结果</span>`+actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));"
if "if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));" not in app:
    app = replace_once(app, old_toolbar_tail, new_toolbar_tail, 'script result toolbar layout')

# Clicking an already-generated script result should select it AND reopen the
# generator panel below it. This keeps the compact toolbar and generator visible
# at the same time; only the explicit open button enters the full editor.
old_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}"
new_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;else if(!additive&&target?.type==='script'&&uiV23NodeContentState(target)==='result')expandedNodeId=target.id;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}"
if "target?.type==='script'&&uiV23NodeContentState(target)==='result'" not in app:
    app = replace_once(app, old_select, new_select, 'script result select opens generator')

old_pointerup = "    }else{const clicked=state.nodes.find(n=>n.id===finished.id);expandedNodeId=clicked&&uiV23NodeContentState(clicked)==='empty'?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"
new_pointerup = "    }else{const clicked=state.nodes.find(n=>n.id===finished.id),clickedState=clicked?uiV23NodeContentState(clicked):'';expandedNodeId=clicked&&(clickedState==='empty'||(clicked.type==='script'&&clickedState==='result'))?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"
if "clickedState==='empty'||(clicked.type==='script'&&clickedState==='result')" not in app:
    app = replace_once(app, old_pointerup, new_pointerup, 'script result pointerup opens generator')

old_toolbar_visibility = "    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}"
new_toolbar_visibility = "    if(!n||contentState!=='result'||(expandedNodeId===n.id&&n.type!=='script')){toolbar.classList.add('hidden');return}"
if "(expandedNodeId===n.id&&n.type!=='script')" not in app:
    app = replace_once(app, old_toolbar_visibility, new_toolbar_visibility, 'keep script toolbar with generator')

# Center the script toolbar using its actual rendered width, not the old 430 px
# estimate, and leave a larger visual gap above the node like the reference UI.
old_script_toolbar = "    if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));\n      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-estimatedWidth-16,r.left+r.width/2-estimatedWidth/2))+'px';\n      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-58)+'px';\n      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;\n    }"
new_script_toolbar = "    if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));\n      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n      const toolbarRect=toolbar.getBoundingClientRect(),toolbarWidth=Math.min(window.innerWidth-32,toolbarRect.width||estimatedWidth),toolbarHeight=toolbarRect.height||38,toolbarGap=30;\n      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-toolbarWidth-16,r.left+r.width/2-toolbarWidth/2))+'px';\n      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-toolbarHeight-toolbarGap)+'px';\n      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;\n    }"
if 'toolbarGap=30' not in app:
    app = replace_once(app, old_script_toolbar, new_script_toolbar, 'center script toolbar above node')

# While the canvas pans/zooms, keep the expanded script toolbar centered above
# the node instead of falling back to the generic left-aligned overlay position.
old_reposition = "  function repositionExpandedSurfaces(){if(!expandedNodeId)return;const n=state.nodes.find(x=>x.id===expandedNodeId),el=n&&document.querySelector(`.node[data-id=\"${CSS.escape(String(n.id))}\"]`);if(!el)return;const r=el.getBoundingClientRect();if(!toolbar.classList.contains('hidden')){toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'}if(!generator.classList.contains('hidden'))positionGeneratorBelowNode(n,el,n.type==='script'?Math.min(360,window.innerWidth-96):Math.max(420,Math.min(560,r.width+60)))}"
new_reposition = "  function repositionExpandedSurfaces(){if(!expandedNodeId)return;const n=state.nodes.find(x=>x.id===expandedNodeId),el=n&&document.querySelector(`.node[data-id=\"${CSS.escape(String(n.id))}\"]`);if(!el)return;const r=el.getBoundingClientRect();if(!toolbar.classList.contains('hidden')){if(n.type==='script'){const tr=toolbar.getBoundingClientRect(),tw=Math.min(window.innerWidth-32,tr.width||430),th=tr.height||38;toolbar.style.left=Math.max(16,Math.min(window.innerWidth-tw-16,r.left+r.width/2-tw/2))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-th-30)+'px'}else{toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'}}if(!generator.classList.contains('hidden'))positionGeneratorBelowNode(n,el,n.type==='script'?Math.min(660,window.innerWidth-64):Math.max(420,Math.min(560,r.width+60)))}"
if "r.top-th-30" not in app:
    app = replace_once(app, old_reposition, new_reposition, 'reposition script toolbar and generator')

# Center the script generator under the node as well, matching the reference
# composition where the node sits on the generator panel's horizontal center.
old_generator_left = "    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,r.left-10))+'px';"
new_generator_left = "    const generatorLeft=n?.type==='script'?r.left+r.width/2-desiredWidth/2:r.left-10;\n    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,generatorLeft))+'px';"
if 'const generatorLeft=n?.type===' not in app:
    app = replace_once(app, old_generator_left, new_generator_left, 'center script generator')

APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
old_open_css = ".script-ready-open{width:100%;height:34px;margin-top:auto;border-radius:7px;background:#393b3b;display:grid;place-items:center;color:#f0f1f1;font-size:12px;font-weight:700}"
new_open_css = ".script-ready-open{width:100%;height:34px;margin-top:auto;border:0;padding:0;border-radius:7px;background:#393b3b;display:grid;place-items:center;color:#f0f1f1;font:inherit;font-size:12px;font-weight:700;cursor:pointer;box-sizing:border-box}"
if new_open_css not in css:
    css = replace_once(css, old_open_css, new_open_css, 'script open button css')
if '.script-ready-open:focus-visible{' not in css:
    css += "\n.script-ready-open:focus-visible{outline:1px solid #8f9493;outline-offset:2px}\n"
CSS.write_text(css, encoding='utf-8')

# Keep the existing shared cache version so legacy regression tests remain valid.
# Preserve the previous scriptclick token and append a new token for this behavior.
bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
old_app_loader = "  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1`,"
new_app_loader = "  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3`,"
if '&scriptclick=toolbar-3' not in bootstrap:
    bootstrap = replace_once(bootstrap, old_app_loader, new_app_loader, 'app cache-bust')
if '&scriptgen=panel-4' not in bootstrap:
    bootstrap = replace_once(bootstrap, '&scriptclick=toolbar-3`', '&scriptclick=toolbar-3&scriptgen=panel-4`', 'script generator cache-bust')
old_style_loader = "      loadStyle(`./styles/script-node-progress-v1.css?v=${v}`),"
new_style_loader = "      loadStyle(`./styles/script-node-progress-v1.css?v=${v}&scriptclick=toolbar-3`),"
if 'script-node-progress-v1.css?v=${v}&scriptclick=toolbar-3' not in bootstrap:
    bootstrap = replace_once(bootstrap, old_style_loader, new_style_loader, 'script node css cache-bust')
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')
