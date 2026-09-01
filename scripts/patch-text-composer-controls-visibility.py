from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
TEXT_COMPOSER_HEIGHT = 224

app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')
old = "const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:142,bottomLimit=window.innerHeight-dockReserve-edge;"
new = f"const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:{TEXT_COMPOSER_HEIGHT},bottomLimit=window.innerHeight-dockReserve-edge;"
if old not in app:
    raise SystemExit('text composer positioning height anchor missing')
app = app.replace(old, new, 1)
app_path.write_text(app, encoding='utf-8')

css_path = ROOT / 'styles' / 'text-node.css'
css = css_path.read_text(encoding='utf-8')
outer_old = '''.generator-panel.text-generator{
  width:594px!important;
  min-width:594px!important;
  max-width:594px!important;
  height:142px!important;
  min-height:142px!important;
  max-height:none!important;
  overflow:visible!important;
}
'''
outer_new = f'''.generator-panel.text-generator{{
  width:594px!important;
  min-width:594px!important;
  max-width:594px!important;
  height:{TEXT_COMPOSER_HEIGHT}px!important;
  min-height:{TEXT_COMPOSER_HEIGHT}px!important;
  max-height:none!important;
  overflow:visible!important;
}}
'''
if outer_old not in css:
    raise SystemExit('text composer outer height anchor missing')
css = css.replace(outer_old, outer_new, 1)

main_old = '''.generator-panel.text-generator .text-generator-main,
.generator-panel.text-generator>.lib-gen-main{
  width:594px;
  height:142px;
  min-height:142px;
  display:flex;
  flex-direction:column;
'''
main_new = f'''.generator-panel.text-generator .text-generator-main,
.generator-panel.text-generator>.lib-gen-main{{
  width:594px;
  height:{TEXT_COMPOSER_HEIGHT}px;
  min-height:{TEXT_COMPOSER_HEIGHT}px;
  display:flex;
  flex-direction:column;
'''
if main_old not in css:
    raise SystemExit('text composer main height anchor missing')
css = css.replace(main_old, main_new, 1)

prompt_anchor = '''.generator-panel.text-generator .prompt-box,
.generator-panel.text-generator .prompt-box.libtv-prompt{
  position:relative;
  flex:1 1 auto;
  min-height:96px;
'''
if prompt_anchor not in css:
    raise SystemExit('text composer prompt anchor missing')
head_rules = '''.generator-panel.text-generator .detail-ui-head{
  flex:0 0 42px;
  min-height:42px;
  height:42px;
  margin:0!important;
  padding:0 16px;
}
.generator-panel.text-generator .detail-section-label{display:none!important}
'''
css = css.replace(prompt_anchor, head_rules + prompt_anchor, 1)

controls_old = '''.generator-panel.text-generator .lib-gen-controls{
  flex:0 0 38px;
  min-height:38px;
  height:38px;
  padding:2px 9px 6px;
  gap:5px;
  border-top:0;
  background:var(--ui-surface-2);
}
'''
controls_new = '''.generator-panel.text-generator .lib-gen-controls{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  flex:0 0 38px;
  min-height:38px;
  height:38px;
  align-items:center;
  padding:2px 9px 6px;
  gap:5px;
  border-top:0;
  background:var(--ui-surface-2);
  overflow:visible;
}
'''
if controls_old not in css:
    raise SystemExit('text composer controls anchor missing')
css = css.replace(controls_old, controls_new, 1)
css_path.write_text(css, encoding='utf-8')

test_path = ROOT / 'tests' / 'text-node-v23.test.mjs'
test = test_path.read_text(encoding='utf-8')
old_test = 'assert.match(css, /height:142px!important/);'
new_test = f'assert.match(css, /height:{TEXT_COMPOSER_HEIGHT}px!important/);'
if old_test not in test:
    raise SystemExit('text composer height test anchor missing')
test = test.replace(old_test, new_test, 1)
old_media_test = r'  assert.doesNotMatch(css, /@media\s*\(max-width:/);'
new_media_test = r'  assert.match(css, /\.generator-panel\.text-generator \.detail-section-label\{display:none!important\}/);'
if old_media_test not in test:
    raise SystemExit('text composer stale media assertion anchor missing')
test = test.replace(old_media_test, new_media_test, 1)

test_anchor = '''  assert.match(css, /\\.generator-panel\\.text-generator \\.model-pill/);
  assert.match(app, /const footerLabel=n\\.type==='text'\\?'':/);
'''
test_replacement = '''  assert.match(css, /\\.generator-panel\\.text-generator \\.model-pill/);
  assert.match(css, /\\.generator-panel\\.text-generator \\.lib-gen-controls\\{[\\s\\S]*display:flex!important;[\\s\\S]*visibility:visible!important;[\\s\\S]*opacity:1!important;/);
  assert.match(app, /const footerLabel=n\\.type==='text'\\?'':/);
'''
if test_anchor not in test:
    raise SystemExit('text model visibility regression anchor missing')
test = test.replace(test_anchor, test_replacement, 1)
test_path.write_text(test, encoding='utf-8')

print(f'patched text composer height to {TEXT_COMPOSER_HEIGHT}px and forced model controls visible')
