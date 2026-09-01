from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
ui_path = ROOT / 'ui-v2.js'
bootstrap_path = ROOT / 'browser-bootstrap.js'
test_path = ROOT / 'tests' / 'text-generator-ui-v2-stability.test.mjs'

ui = ui_path.read_text(encoding='utf-8')
old = """    const kind=selectedNodeKind();\n    main.classList.add('detail-kind-'+kind);\n    if(!main.querySelector('.detail-ui-head')){\n"""
new = """    const kind=selectedNodeKind();\n    main.classList.add('detail-kind-'+kind);\n    if(kind==='文本'){\n      main.querySelector('.detail-ui-head')?.remove();\n      main.querySelectorAll('.detail-section-label').forEach(el=>el.remove());\n      return;\n    }\n    if(!main.querySelector('.detail-ui-head')){\n"""
if old not in ui:
    if new not in ui:
        raise SystemExit('ui-v2 text generator enhancement anchor not found')
else:
    ui = ui.replace(old, new, 1)
ui_path.write_text(ui, encoding='utf-8')

bootstrap = bootstrap_path.read_text(encoding='utf-8')
old_boot = "  `./ui-v2.js?v=${v}`,"
new_boot = "  `./ui-v2.js?v=${v}&fix=text-controls-stable-1`,"
if old_boot in bootstrap:
    bootstrap = bootstrap.replace(old_boot, new_boot, 1)
elif new_boot not in bootstrap:
    raise SystemExit('browser-bootstrap ui-v2 loader anchor not found')
bootstrap_path.write_text(bootstrap, encoding='utf-8')

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../ui-v2.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('UI v2 leaves text generator native controls stable', () => {
  const guard = ui.indexOf("if(kind==='文本'){");
  const headInsert = ui.indexOf('main.prepend(h)');
  assert.ok(guard >= 0, 'text generator guard must exist');
  assert.ok(headInsert > guard, 'text generator guard must run before detail header injection');
  assert.match(ui, /main\.querySelector\('\.detail-ui-head'\)\?\.remove\(\)/);
  assert.match(ui, /main\.querySelectorAll\('\.detail-section-label'\)\.forEach\(el=>el\.remove\(\)\)/);
});

test('browser cache-busts the stable text-controls UI v2 patch', () => {
  assert.match(bootstrap, /ui-v2\.js\?v=\$\{v\}&fix=text-controls-stable-1/);
});
""", encoding='utf-8')

print('text generator controls stability patch applied')
