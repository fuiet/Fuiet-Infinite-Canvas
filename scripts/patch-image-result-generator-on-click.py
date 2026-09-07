from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
app = ROOT / 'app.js'
boot = ROOT / 'browser-bootstrap.js'
test = ROOT / 'tests' / 'image-result-generator-on-click.test.mjs'

old = "else{const clicked=state.nodes.find(n=>n.id===finished.id),clickedState=clicked?uiV23NodeContentState(clicked):'';expandedNodeId=clicked&&(clickedState==='empty'||(clicked.type==='script'&&clickedState==='result'))?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"
new = "else{const clicked=state.nodes.find(n=>n.id===finished.id),clickedState=clicked?uiV23NodeContentState(clicked):'',openGenerator=clicked&&(clickedState==='empty'||(clicked.type==='image'&&clickedState==='result')||(clicked.type==='script'&&clickedState==='result'));expandedNodeId=openGenerator?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}"

s = app.read_text()
if new not in s:
    if old not in s:
        raise SystemExit('finishNodeDrag click-open pattern not found')
    s = s.replace(old, new, 1)
    app.write_text(s)

b = boot.read_text()
if '&resultimagegen=1' not in b:
    marker = '&shotdesc=reference-1`,'
    if marker not in b:
        raise SystemExit('app bootstrap cache marker not found')
    b = b.replace(marker, '&shotdesc=reference-1&resultimagegen=1`,', 1)
    boot.write_text(b)

test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root='_read_123_zip_20260821_180410';
const app=fs.readFileSync(`${root}/app.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('clicking a generated image result opens its generator',()=>{
  assert.match(app,/clicked\.type==='image'&&clickedState==='result'/);
  assert.match(app,/expandedNodeId=openGenerator\?finished\.id:null/);
});

test('result opening remains click-only and does not open after drag or shift multi-select',()=>{
  assert.match(app,/if\(moved\)\{saveState\(\);expandedNodeId=null;\}else if\(finished\.additive\)/);
  assert.match(app,/finished\.additive[\s\S]{0,220}expandedNodeId=null/);
});

test('video and audio result nodes keep their existing click behavior',()=>{
  const finish=app.slice(app.indexOf('function finishNodeDrag()'),app.indexOf('function ensureGuideLayer'));
  assert.doesNotMatch(finish,/clicked\.type==='video'&&clickedState==='result'/);
  assert.doesNotMatch(finish,/clicked\.type==='audio'&&clickedState==='result'/);
});

test('image result generator uses the same canonical node parameters',()=>{
  assert.match(app,/function renderGenerator\(\)/);
  assert.match(app,/const n=state\.nodes\.find\(x=>x\.id===expandedNodeId\)/);
  assert.match(app,/if\(n\.type==='image'/);
  assert.match(app,/input\?\.addEventListener\('input',e=>\{n\.prompt=e\.target\.value;saveState\(\)\}\)/);
  assert.match(app,/openModelPickerForNode\(n,e\.currentTarget\)/);
});

test('browser cache key forces the updated app click behavior to load',()=>{
  assert.match(boot,/resultimagegen=1/);
});
''')

print('Image result click -> generator patch applied.')
