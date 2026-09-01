from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
TEXT_COMPOSER_HEIGHT = 224
PROMPT_MIN_HEIGHT = 128


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'{label} anchor missing')
    return text.replace(old, new, 1)


# 1) Give the text composer enough real layout height and turn the existing
# model binding into an explicit, visible text-model selector.
app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')
app = replace_once(
    app,
    "const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:142,bottomLimit=window.innerHeight-dockReserve-edge;",
    f"const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:{TEXT_COMPOSER_HEIGHT},bottomLimit=window.innerHeight-dockReserve-edge;",
    'text composer positioning height',
)

old_picker = """<button id=\"modelPickerBtn\" class=\"model-pill ${noModel?'needs-model':''}\"><span class=\"model-dot\"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button><button id=\"fallbackModelBtn\""""
new_picker = """<button id=\"modelPickerBtn\" class=\"model-pill text-model-picker ${noModel?'needs-model':''}\" type=\"button\" title=\"选择模型\" aria-label=\"选择模型\"><span class=\"text-model-picker-label\">选择模型</span><span class=\"model-dot\"></span><b class=\"text-model-picker-name\">${escapeHtml(modelLabel)}</b><i class=\"text-model-picker-caret\">${uiIcon('chevronDown')}</i></button><button id=\"fallbackModelBtn\""""
app = replace_once(app, old_picker, new_picker, 'text model picker markup')
app_path.write_text(app, encoding='utf-8')


# 2) Make the selector row visible in the text composer and reserve enough
# space for the prompt + selector without relying on overflow accidents.
css_path = ROOT / 'styles' / 'text-node.css'
css = css_path.read_text(encoding='utf-8')
css = replace_once(
    css,
    """.generator-panel.text-generator{
  width:594px!important;
  min-width:594px!important;
  max-width:594px!important;
  height:142px!important;
  min-height:142px!important;
  max-height:none!important;
  overflow:visible!important;
}
""",
    f""".generator-panel.text-generator{{
  width:594px!important;
  min-width:594px!important;
  max-width:594px!important;
  height:{TEXT_COMPOSER_HEIGHT}px!important;
  min-height:{TEXT_COMPOSER_HEIGHT}px!important;
  max-height:none!important;
  overflow:visible!important;
}}
""",
    'text composer outer height',
)
css = replace_once(
    css,
    """.generator-panel.text-generator .text-generator-main,
.generator-panel.text-generator>.lib-gen-main{
  width:594px;
  height:142px;
  min-height:142px;
  display:flex;
  flex-direction:column;
""",
    f""".generator-panel.text-generator .text-generator-main,
.generator-panel.text-generator>.lib-gen-main{{
  width:594px;
  height:{TEXT_COMPOSER_HEIGHT}px;
  min-height:{TEXT_COMPOSER_HEIGHT}px;
  display:flex;
  flex-direction:column;
""",
    'text composer main height',
)
css = replace_once(
    css,
    """.generator-panel.text-generator .prompt-box,
.generator-panel.text-generator .prompt-box.libtv-prompt{
  position:relative;
  flex:1 1 auto;
  min-height:96px;
""",
    f""".generator-panel.text-generator .prompt-box,
.generator-panel.text-generator .prompt-box.libtv-prompt{{
  position:relative;
  flex:1 1 auto;
  min-height:{PROMPT_MIN_HEIGHT}px;
""",
    'text prompt minimum height',
)
css = replace_once(
    css,
    """.generator-panel.text-generator .lib-gen-controls{
  flex:0 0 38px;
  min-height:38px;
  height:38px;
  padding:2px 9px 6px;
  gap:5px;
  border-top:0;
  background:var(--ui-surface-2);
}
""",
    """.generator-panel.text-generator .lib-gen-controls{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
  flex:0 0 42px;
  min-height:42px;
  height:42px;
  align-items:center;
  padding:4px 9px 7px;
  gap:6px;
  border-top:1px solid var(--ui-line);
  background:var(--ui-surface-2);
  overflow:visible;
}
""",
    'text composer controls row',
)
css = replace_once(
    css,
    """.generator-panel.text-generator .model-pill{
  max-width:220px;
  padding:0 8px;
  justify-content:flex-start;
  gap:6px;
  border-radius:7px;
  cursor:pointer;
}
""",
    """.generator-panel.text-generator .model-pill{
  flex:0 1 286px;
  min-width:190px;
  max-width:286px;
  padding:0 9px;
  justify-content:flex-start;
  gap:6px;
  border:1px solid var(--ui-line);
  border-radius:7px;
  cursor:pointer;
}
""",
    'text model pill sizing',
)
css = replace_once(
    css,
    """.generator-panel.text-generator .model-pill>i{
  width:12px;
  height:12px;
  display:grid;
  place-items:center;
  flex:0 0 12px;
}
.generator-panel.text-generator .model-pill.needs-model{color:var(--ui-selected)}
""",
    """.generator-panel.text-generator .model-pill>i{
  width:12px;
  height:12px;
  display:grid;
  place-items:center;
  flex:0 0 12px;
}
.generator-panel.text-generator .text-model-picker-label{
  flex:0 0 auto;
  color:var(--ui-text-3);
  font-size:10px;
  line-height:14px;
  font-weight:600;
  white-space:nowrap;
}
.generator-panel.text-generator .text-model-picker-name{
  flex:1 1 auto;
  min-width:0;
  max-width:none!important;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.generator-panel.text-generator .text-model-picker-caret{margin-left:auto}
.generator-panel.text-generator .model-pill.needs-model{color:var(--ui-selected)}
""",
    'text model picker label styles',
)
css_path.write_text(css, encoding='utf-8')


# 3) Keep the regression test aligned with the real visible composer height.
# The existing test already proves the button calls openModelPickerForNode(),
# lists allModelsForType(), and persists the chosen item through setNodeModel().
test_path = ROOT / 'tests' / 'text-node-v23.test.mjs'
test = test_path.read_text(encoding='utf-8')
test = replace_once(
    test,
    '  assert.match(css, /height:142px!important/);',
    f'  assert.match(css, /height:{TEXT_COMPOSER_HEIGHT}px!important/);',
    'text composer height test',
)
test = replace_once(
    test,
    '  assert.match(css, /\\.generator-panel\\.text-generator \\.model-pill/);',
    "  assert.match(css, /\\.generator-panel\\.text-generator \\.model-pill/);\n  assert.match(css, /\\.generator-panel\\.text-generator \\.text-model-picker-label/);\n  assert.match(app, /text-model-picker-label\\\">选择模型</);",
    'text model picker visibility test',
)
test_path.write_text(test, encoding='utf-8')

print(f'patched text composer to {TEXT_COMPOSER_HEIGHT}px with a visible functional model picker')
