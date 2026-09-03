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

# Generated script nodes use a concise title. Prefer an explicit 《title》 from the
# source, then a non-generic node title, then the first useful source line.
node_title_marker = "  function nodeTitleBase(n){\n    const raw=String(n?.title||'').trim();"
node_title_replacement = """  function scriptNodeDisplayTitle(n){
    const d=n?.scriptData||{},source=String(d.title||d.name||d.summary||d.analysis?.summary||n?.sourceText||'').trim(),book=source.match(/《\\s*([^》\\n]{2,40})\\s*》/),raw=String(n?.title||'').trim();
    if(book?.[1])return book[1].trim();
    if(raw&&!['脚本生成器','脚本节点','Script'].includes(raw))return raw;
    const first=source.split(/\\r?\\n/).map(x=>x.replace(/^#+\\s*/,'').trim()).find(Boolean)||'脚本';
    return first.length>28?first.slice(0,28)+'…':first;
  }
  function nodeTitleBase(n){
    if(n?.type==='script'&&Array.isArray(n?.scriptData?.shots)&&n.scriptData.shots.length)return scriptNodeDisplayTitle(n);
    const raw=String(n?.title||'').trim();"""
app = replace_once(app, node_title_marker, node_title_replacement, 'script display title')

# Once shots exist, replace the old preset card with the compact three-stage card.
old_script_body = "      }else body = `<div class=\"script-node-compact\"><div class=\"script-compact-icon\"><i></i><i></i><i></i><i></i></div><div class=\"script-try-label\">尝试：</div><button data-script-preset=\"breakdown\">☰ <b>脚本生成分镜脚本</b></button><button data-script-preset=\"character\">♙ <b>角色生成分镜脚本</b></button><button data-script-preset=\"manual\">▤ <b>自己编写分镜脚本</b></button>${shots.length?`<small>${shots.length} 个镜头 · 点击卡片查看/继续编辑</small>`:''}</div>`;"
new_script_body = "      }else if(shots.length)body=scriptNodeReadyHtml(n,data);\n      else body = `<div class=\"script-node-compact\"><div class=\"script-compact-icon\"><i></i><i></i><i></i><i></i></div><div class=\"script-try-label\">尝试：</div><button data-script-preset=\"breakdown\">☰ <b>脚本生成分镜脚本</b></button><button data-script-preset=\"character\">♙ <b>角色生成分镜脚本</b></button><button data-script-preset=\"manual\">▤ <b>自己编写分镜脚本</b></button></div>`;"
app = replace_once(app, old_script_body, new_script_body, 'generated script card')

workflow_stats_marker = "  function scriptWorkflowStats(d){\n"
ready_helper = """  function scriptNodeReadyHtml(n,d){
    const s=scriptWorkflowStats(d),steps=[['确认镜头',1,s.shotsConfirmed],['准备资产',2,s.assetsReady],['合成提示词',3,s.promptsReady]];
    return `<button type=\"button\" class=\"script-node-ready\" data-open-script=\"${escapeAttr(n.id)}\" aria-label=\"打开脚本节点\"><span class=\"script-ready-icon\" aria-hidden=\"true\"><i></i><i></i><i></i></span><span class=\"script-ready-steps\">${steps.map(([label,no,done])=>`<span class=\"script-ready-step ${done?'done':''}\"><i>${done?'✓':no}</i><b>${label}</b></span>`).join('<em></em>')}</span><span class=\"script-ready-open\">打开脚本节点 →</span></button>`;
  }

"""
if ready_helper.strip() in app:
    raise SystemExit('script ready helper already present')
app = replace_once(app, workflow_stats_marker, ready_helper + workflow_stats_marker, 'script ready helper')

# Result toolbar: only rerun, batch storyboard images, batch videos.
old_toolbar = "    if(n.type==='script')return[{label:'编辑脚本',tool:'打开脚本',primary:true},{label:'看板',tool:'整集看板'},{label:'批量生成',action:'script-batch'},{label:'改生成提示',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];"
new_toolbar = "    if(n.type==='script')return[{label:'重新生成',action:'rerun',primary:true},{label:'批量生成分镜',action:'script-batch-image'},{label:'批量生成视频',action:'script-batch-video'}];"
app = replace_once(app, old_toolbar, new_toolbar, 'script result toolbar')

old_batch_action = "    if(a.action==='script-batch'){openScriptEditor(n,'batch-image');return}"
new_batch_action = "    if(a.action==='script-batch-image'){const d=ensureScriptData(n);if(scriptWorkflowRequire(n,d,'batch'))openScriptEditor(n,'batch-image');return}\n    if(a.action==='script-batch-video'){const d=ensureScriptData(n);if(scriptWorkflowRequire(n,d,'batch'))openScriptEditor(n,'batch-video');return}"
app = replace_once(app, old_batch_action, new_batch_action, 'script batch toolbar actions')

APP.write_text(app, encoding='utf-8')

css = CSS.read_text(encoding='utf-8')
css_block = """

/* Generated script node · compact three-stage summary */
.node-script[data-content-state="result"] .node-body{padding:0;min-height:0}.script-node-ready{width:100%;min-height:252px;padding:34px 26px 26px;border:0;border-radius:inherit;background:transparent;color:#e7e9e8;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:28px;font:inherit;cursor:pointer}.script-node-ready:hover{background:rgba(255,255,255,.018)}.script-ready-icon{width:42px;height:38px;display:flex;flex-direction:column;justify-content:center;gap:5px}.script-ready-icon i{display:block;height:4px;border-radius:999px;background:#6f7372}.script-ready-icon i:nth-child(1){width:34px}.script-ready-icon i:nth-child(2){width:27px}.script-ready-icon i:nth-child(3){width:20px}.script-ready-steps{width:100%;display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:start;justify-content:center}.script-ready-steps>em{height:1px;margin:10px 7px 0;background:#585c5b}.script-ready-step{min-width:56px;display:flex;flex-direction:column;align-items:center;gap:6px;color:#d2d5d4}.script-ready-step>i{width:22px;height:22px;border:1px solid #d8dcda;border-radius:50%;display:grid;place-items:center;font-style:normal;font-size:11px;line-height:1}.script-ready-step.done>i{border-color:#f0f2f1;background:#f0f2f1;color:#151716;font-weight:800}.script-ready-step>b{font-size:11px;line-height:15px;white-space:nowrap}.script-ready-open{width:100%;height:34px;margin-top:auto;border-radius:7px;background:#393b3b;display:grid;place-items:center;color:#f0f1f1;font-size:12px;font-weight:700}.script-node-ready:hover .script-ready-open{background:#444747}
"""
if 'Generated script node · compact three-stage summary' not in css:
    css += css_block
CSS.write_text(css, encoding='utf-8')

bootstrap = BOOTSTRAP.read_text(encoding='utf-8')
bootstrap = replace_once(
    bootstrap,
    "const v='20260903-script-editor-simplified-1';",
    "const v='20260903-script-node-compact-2';",
    'browser cache version',
)
BOOTSTRAP.write_text(bootstrap, encoding='utf-8')
