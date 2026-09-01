from pathlib import Path

root=Path('_read_123_zip_20260821_180410')
app_path=root/'app.js'
bootstrap_path=root/'browser-bootstrap.js'
test_path=root/'tests'/'text-result-editor-ui.test.mjs'

app=app_path.read_text(encoding='utf-8')
bootstrap=bootstrap_path.read_text(encoding='utf-8')
test=test_path.read_text(encoding='utf-8')

old="toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-60)+'px';"
new="toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-108)+'px';"
if old not in app:
    raise SystemExit('text editor toolbar top offset anchor missing')
app=app.replace(old,new,1)

old_boot="`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1`,"
new_boot="`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&toolbar=text-gap-1`,"
if old_boot not in bootstrap:
    raise SystemExit('app bootstrap cache anchor missing')
bootstrap=bootstrap.replace(old_boot,new_boot,1)

marker="test('text editing toolbar keeps a larger gap above the node'"
if marker not in test:
    test += """\n\ntest('text editing toolbar keeps a larger gap above the node',()=>{\n  assert.match(app,/toolbar\\.style\\.top=Math\\.max\\(CONTEXT_TOOLBAR_SAFE_TOP,r\\.top-108\\)\\+'px';/);\n  assert.match(bootstrap,/app\\.js\\?v=\\$\\{v\\}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&toolbar=text-gap-1/);\n});\n"""

app_path.write_text(app,encoding='utf-8')
bootstrap_path.write_text(bootstrap,encoding='utf-8')
test_path.write_text(test,encoding='utf-8')
print('patched text editor toolbar gap')
