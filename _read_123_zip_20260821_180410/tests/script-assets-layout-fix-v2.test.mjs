import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-assets-layout-fix-v2.css',import.meta.url),'utf8');

test('asset layout bundle is loaded by browser bootstrap',()=>{
  assert.match(bootstrap,/const v='20260903-script-assets-overlap-fix-1'/);
  assert.match(bootstrap,/script-assets-reference-v1\.css\?v=\$\{v\}/);
  assert.match(bootstrap,/script-assets-layout-fix-v2\.css\?v=\$\{v\}/);
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}/);
  assert.match(index,/browser-bootstrap\.js\?v=/);
});

test('角色 场景 道具 remain independent block rows',()=>{
  assert.match(css,/\.asset-block\{[\s\S]*display:block!important/);
  assert.match(css,/margin:0 0 34px!important/);
  assert.match(css,/\.script-asset-grid\.cards\{[\s\S]*display:flex!important;[\s\S]*flex-flow:row wrap!important/);
  assert.match(css,/row-gap:24px!important/);
});

test('asset cards reserve real height for preview plus typography',()=>{
  assert.match(css,/\.script-asset-grid\.cards > \.script-asset-card\{[\s\S]*height:auto!important;[\s\S]*min-height:190px!important/);
  assert.match(css,/\.script-asset-card \.asset-preview\{[\s\S]*flex:0 0 145px!important;[\s\S]*height:145px!important/);
  assert.match(css,/\.script-asset-card \.asset-card-copy\{[\s\S]*position:static!important;[\s\S]*min-height:40px!important/);
  assert.match(css,/\.asset-card-copy b\{[\s\S]*line-height:18px!important/);
  assert.match(css,/\.asset-card-copy p\{[\s\S]*line-height:16px!important/);
});

test('asset cards keep reference proportions instead of stretching across the row',()=>{
  assert.match(css,/flex:0 0 260px!important/);
  assert.match(css,/width:260px!important/);
  assert.match(css,/column-gap:12px!important/);
  assert.match(css,/flex:0 0 148px!important/);
  assert.match(css,/height:145px!important/);
});
