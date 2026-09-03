from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app.js'
BOOTSTRAP = ROOT / 'browser-bootstrap.js'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


app = APP.read_text(encoding='utf-8')

# 1) Selecting a generated script result should keep it expanded so the generator
# panel opens below the node as well as the result toolbar above it.
old_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}"
new_select = "  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;else if(!additive&&target?.type==='script'&&uiV23NodeContentState(target)==='result')expandedNodeId=target.id;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}"
if "target?.type==='script'&&uiV23NodeContentState(target)==='result'" not in app:
    app = replace_once(app, old_select, new_select, 'script result select opens generator')

old_pointerup = "    }else{const clicked=state.nodes.find(n=>n.id===finished.id);expandedNodeId=clicked&&uiV23NodeContentState(clicked)==='empty'?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"
new_pointerup = "    }else{const clicked=state.nodes.find(n=>n.id===finished.id),clickedState=clicked?uiV23NodeContentState(clicked):'';expandedNodeId=clicked&&(clickedState==='empty'||(clicked.type==='script'&&clickedState==='result'))?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"
if "clickedState==='empty'||(clicked.type==='script'&&clickedState==='result')" not in app:
    app = replace_once(app, old_pointerup, new_pointerup, 'script result pointerup opens generator')

# 2) Expanded media normally hides its toolbar. Script results are the exception:
# the reference interaction shows toolbar above and generator below simultaneously.
old_toolbar_visibility = "    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}"
new_toolbar_visibility = "    if(!n||contentState!=='result'||(expandedNodeId===n.id&&n.type!=='script')){toolbar.classList.add('hidden');return}"
if "(expandedNodeId===n.id&&n.type!=='script')" not in app:
    app = replace_once(app, old_toolbar_visibility, new_toolbar_visibility, 'keep script toolbar with generator')

# 3) Use the toolbar's actual rendered width so its visual center is exactly above
# the script node. Leave a 30px gap above the card, matching the supplied reference.
old_script_toolbar = "    if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));\n      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-estimatedWidth-16,r.left+r.width/2-estimatedWidth/2))+'px';\n      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-58)+'px';\n      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;\n    }"
new_script_toolbar = "    if(n.type==='script'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(430,actions.length*132));\n      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''}\" data-top-action=\"${i}\">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');\n      const toolbarRect=toolbar.getBoundingClientRect(),toolbarWidth=Math.min(window.innerWidth-32,toolbarRect.width||estimatedWidth),toolbarHeight=toolbarRect.height||38,toolbarGap=30;\n      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-toolbarWidth-16,r.left+r.width/2-toolbarWidth/2))+'px';\n      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-toolbarHeight-toolbarGap)+'px';\n      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;\n    }"
if 'toolbarGap=30' not in app:
    app = replace_once(app, old_script_toolbar, new_script_toolbar, 'center script toolbar above node')

# 4) Keep the same positioning while panning/zooming. Previously the expanded-state
# reposition function fell back to the generic left-aligned toolbar placement.
old_reposition = "  function repositionExpandedSurfaces(){if(!expandedNodeId)return;const n=state.nodes.find(x=>x.id===expandedNodeId),el=n&&document.querySelector(`.node[data-id=\"${CSS.escape(String(n.id))}\"]`);if(!el)return;const r=el.getBoundingClientRect();if(!toolbar.classList.contains('hidden')){toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'}if(!generator.classList.contains('hidden'))positionGeneratorBelowNode(n,el,n.type==='script'?Math.min(360,window.innerWidth-96):Math.max(420,Math.min(560,r.width+60)))}"
new_reposition = "  function repositionExpandedSurfaces(){if(!expandedNodeId)return;const n=state.nodes.find(x=>x.id===expandedNodeId),el=n&&document.querySelector(`.node[data-id=\"${CSS.escape(String(n.id))}\"]`);if(!el)return;const r=el.getBoundingClientRect();if(!toolbar.classList.contains('hidden')){if(n.type==='script'){const tr=toolbar.getBoundingClientRect(),tw=Math.min(window.innerWidth-32,tr.width||430),th=tr.height||38;toolbar.style.left=Math.max(16,Math.min(window.innerWidth-tw-16,r.left+r.width/2-tw/2))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-th-30)+'px'}else{toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'}}if(!generator.classList.contains('hidden'))positionGeneratorBelowNode(n,el,n.type==='script'?Math.min(660,window.innerWidth-64):Math.max(420,Math.min(560,r.width+60)))}"
if "r.top-th-30" not in app:
    app = replace_once(app, old_reposition, new_reposition, 'reposition script toolbar and generator')

# 5) Center the script generator underneath the node too. Other generator types keep
# their existing positioning behavior.
old_generator_left = "    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,r.left-10))+'px';"
new_generator_left = "    const generatorLeft=n?.type==='script'?r.left+r.width/2-desiredWidth/2:r.left-10;\n    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,generatorLeft))+'px';"
if "const generatorLeft=n?.type==='script'" not in app:
    app = replace_once(app, old_generator_left, new_generator_left, 'center script generator')

APP.write_text(app, encoding='utf-8')

# Cache-bust app.js while preserving the earlier token used by existing tests.
bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
old_loader = "  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3`,"
new_loader = "  `./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1&scriptclick=toolbar-3&scriptgen=panel-4`,"
if '&scriptgen=panel-4' not in bootstrap:
    bootstrap = replace_once(bootstrap, old_loader, new_loader, 'script generator cache-bust')
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')
