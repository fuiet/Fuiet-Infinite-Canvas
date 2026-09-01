from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')

# app.js: the UI v2 detail header is injected after render, so text composer
# positioning must reserve the real post-enhancement height rather than 142px.
app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')
old = "const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:142,bottomLimit=window.innerHeight-dockReserve-edge;"
new = "const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:184,bottomLimit=window.innerHeight-dockReserve-edge;"
if old not in app:
    raise SystemExit('text composer positioning height anchor missing')
app = app.replace(old, new, 1)
app_path.write_text(app, encoding='utf-8')

# text-node.css: UI v2 prepends .detail-ui-head and .detail-section-label.
# The old fixed 142px box clips .lib-gen-controls completely. Give the text
# composer enough room and make the controls an explicit visible final row.
css_path = ROOT / 'styles' / 'text-node.css'
css = css_path.read_text(encoding='utf-8')
css = css.replace('  height:142px!important;\n  min-height:142px!important;', '  height:184px!important;\n  min-height:184px!important;', 1)
css = css.replace('  height:142px;\n  min-height:142px;', '  height:184px;\n  min-height:184px;', 1)

prompt_anchor = '''.generator-panel.text-generator .prompt-box,\n.generator-panel.text-generator .prompt-box.libtv-prompt{\n  position:relative;\n  flex:1 1 auto;\n  min-height:96px;\n'''
if prompt_anchor not in css:
    raise SystemExit('text composer prompt anchor missing')

head_rules = '''.generator-panel.text-generator .detail-ui-head{\n  flex:0 0 42px;\n  min-height:42px;\n  height:42px;\n  margin:0!important;\n  padding:0 16px;\n}\n.generator-panel.text-generator .detail-section-label{display:none!important}\n'''
css = css.replace(prompt_anchor, head_rules + prompt_anchor, 1)

controls_old = '''.generator-panel.text-generator .lib-gen-controls{\n  flex:0 0 38px;\n  min-height:38px;\n  height:38px;\n  padding:2px 9px 6px;\n  gap:5px;\n  border-top:0;\n  background:var(--ui-surface-2);\n}\n'''
controls_new = '''.generator-panel.text-generator .lib-gen-controls{\n  display:flex!important;\n  visibility:visible!important;\n  opacity:1!important;\n  flex:0 0 38px;\n  min-height:38px;\n  height:38px;\n  align-items:center;\n  padding:2px 9px 6px;\n  gap:5px;\n  border-top:0;\n  background:var(--ui-surface-2);\n  overflow:visible;\n}\n'''
if controls_old not in css:
    raise SystemExit('text composer controls anchor missing')
css = css.replace(controls_old, controls_new, 1)
css_path.write_text(css, encoding='utf-8')

# Regression test: the enhanced header must not clip the text model picker.
test_path = ROOT / 'tests' / 'text-node-v23.test.mjs'
test = test_path.read_text(encoding='utf-8')
test = test.replace('assert.match(css, /height:142px!important/);', 'assert.match(css, /height:184px!important/);', 1)
addition = r'''\n\ntest('ui v2 detail header cannot clip the text composer model controls', () => {\n  const app = read('app.js');\n  const css = read('styles/text-node.css');\n  const ui = read('ui-v2.js');\n  assert.match(ui, /h\.className='detail-ui-head'/);\n  assert.match(ui, /controls\.before\(label\)/);\n  assert.match(app, /isAudio\?210:184,bottomLimit/);\n  assert.match(css, /\.generator-panel\.text-generator \.detail-section-label\{display:none!important\}/);\n  assert.match(css, /\.generator-panel\.text-generator \.lib-gen-controls\{\s*display:flex!important;/);\n  assert.match(css, /visibility:visible!important/);\n  assert.match(app, /id=\"modelPickerBtn\" class=\"model-pill/);\n});\n'''
if "ui v2 detail header cannot clip the text composer model controls" not in test:
    test = test.rstrip() + addition + '\n'
test_path.write_text(test, encoding='utf-8')

print('patched text composer controls visibility')
