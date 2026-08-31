from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'
CSS=ROOT/'styles'/'context-toolbar.css'
OLD='20260831-media-width-unified-1'
BUILD='20260831-context-toolbar-clear-1'

s=APP.read_text(encoding='utf-8')

anchor='  const MEDIA_NODE_DISPLAY_WIDTH=620;\n'
if 'const CONTEXT_TOOLBAR_SAFE_TOP=58;' not in s:
    if anchor not in s:
        raise SystemExit('media display width anchor missing')
    s=s.replace(anchor,anchor+'  const CONTEXT_TOOLBAR_SAFE_TOP=58;\n',1)

repls={
    "toolbar.style.top=Math.max(16,r.top-60)+'px';":"toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-60)+'px';",
    "toolbar.style.top='54px';":"toolbar.style.top=CONTEXT_TOOLBAR_SAFE_TOP+'px';",
    "toolbar.style.top=Math.max(16,r.top-58)+'px';":"toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-58)+'px';",
    "toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(45,r.top-40)+'px';":"toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px';",
    "toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(45,r.top-40)+'px'":"toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'",
}
for old,new in repls.items():
    if old in s:
        s=s.replace(old,new)

if 'Math.max(16,r.top-58)' in s or 'Math.max(16,r.top-60)' in s:
    raise SystemExit('unsafe context toolbar top clamp remains')
APP.write_text(s,encoding='utf-8')

css=CSS.read_text(encoding='utf-8')
old_rule='.node-toolbar{position:absolute;z-index:94;display:flex;align-items:center;gap:4px;max-width:min(900px,calc(100vw - 96px));min-height:38px;padding:4px;border:1px solid var(--ui-line);border-radius:var(--ui-radius-float);background:rgba(27,29,28,.98);box-shadow:var(--ui-shadow-float);overflow-x:auto;overflow-y:hidden}'
new_rule='.node-toolbar{position:absolute;z-index:94;display:flex;align-items:center;gap:4px;max-width:min(900px,calc(100vw - 96px));min-height:38px;padding:4px;border:1px solid var(--ui-line);border-radius:var(--ui-radius-float);background:#1b1d1c;box-shadow:var(--ui-shadow-float);overflow-x:auto;overflow-y:hidden;backdrop-filter:none;-webkit-backdrop-filter:none}'
if old_rule not in css:
    raise SystemExit('context toolbar base rule changed')
css=css.replace(old_rule,new_rule,1)
CSS.write_text(css,encoding='utf-8')

for name in ['browser-bootstrap.js','browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8')
    if OLD in text:
        fp.write_text(text.replace(OLD,BUILD),encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    if OLD in text:
        fp.write_text(text.replace(OLD,BUILD),encoding='utf-8')

(ROOT/'tests'/'context-toolbar-safe-area.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/context-toolbar.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('context toolbars stay below workspace chrome',()=>{
  assert.match(app,/const CONTEXT_TOOLBAR_SAFE_TOP=58/);
  assert.match(app,/Math\.max\(CONTEXT_TOOLBAR_SAFE_TOP,r\.top-58\)/);
  assert.match(app,/Math\.max\(CONTEXT_TOOLBAR_SAFE_TOP,r\.top-60\)/);
  assert.doesNotMatch(app,/Math\.max\(16,r\.top-58\)/);
  assert.doesNotMatch(app,/Math\.max\(16,r\.top-60\)/);
});

test('context toolbar itself never blurs workspace behind it',()=>{
  assert.match(css,/\.node-toolbar\{[\s\S]*background:#1b1d1c/);
  assert.match(css,/backdrop-filter:none/);
  assert.match(css,/-webkit-backdrop-filter:none/);
});

test('canvas cache key advances for clear context toolbar',()=>{
  assert.match(boot,/20260831-context-toolbar-clear-1/);
});
''',encoding='utf-8')

print('patched clear context toolbar safe area',BUILD)
