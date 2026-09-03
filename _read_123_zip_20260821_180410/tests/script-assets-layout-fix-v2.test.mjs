import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-assets-layout-fix-v2.css',import.meta.url),'utf8');

test('asset layout bundle is cache-busted from index through bootstrap',()=>{
  assert.match(index,/browser-bootstrap\.js\?v=20260903-script-assets-layout-2/);
  assert.match(bootstrap,/const v='20260903-script-assets-layout-2'/);
  assert.match(bootstrap,/script-assets-reference-v1\.css\?v=\$\{v\}/);
  assert.match(bootstrap,/script-assets-layout-fix-v2\.css\?v=\$\{v\}/);
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}/);
});

test('角色 场景 道具 remain independent block rows',()=>{
  assert.match(css,/\.asset-block\{[\s\S]*display:block!important/);
  assert.match(css,/\.asset-block \+ \.asset-block\{[\s\S]*margin-top:26px!important/);
  assert.match(css,/\.script-asset-grid\.cards\{[\s\S]*display:flex!important;[\s\S]*flex-flow:row wrap!important/);
});

test('asset cards keep reference proportions instead of stretching across the row',()=>{
  assert.match(css,/flex:0 0 260px!important/);
  assert.match(css,/width:260px!important/);
  assert.match(css,/gap:12px!important/);
  assert.match(css,/flex:0 0 148px!important/);
  assert.match(css,/height:145px!important/);
});
