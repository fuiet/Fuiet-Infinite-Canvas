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

APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
old_open_css = ".script-ready-open{width:100%;height:34px;margin-top:auto;border-radius:7px;background:#393b3b;display:grid;place-items:center;color:#f0f1f1;font-size:12px;font-weight:700}"
new_open_css = ".script-ready-open{width:100%;height:34px;margin-top:auto;border:0;padding:0;border-radius:7px;background:#393b3b;display:grid;place-items:center;color:#f0f1f1;font:inherit;font-size:12px;font-weight:700;cursor:pointer;box-sizing:border-box}"
if new_open_css not in css:
    css = replace_once(css, old_open_css, new_open_css, 'script open button css')
if '.script-ready-open:focus-visible{' not in css:
    css += "\n.script-ready-open:focus-visible{outline:1px solid #8f9493;outline-offset:2px}\n"
CSS.write_text(css, encoding='utf-8')

bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
old_version = "const v='20260903-script-node-compact-2';"
new_version = "const v='20260903-script-node-click-toolbar-3';"
if new_version not in bootstrap:
    bootstrap = replace_once(bootstrap, old_version, new_version, 'browser cache version')
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')
