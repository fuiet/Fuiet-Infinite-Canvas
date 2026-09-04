import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const picker=fs.readFileSync(new URL('../script-asset-picker-modal-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-asset-picker-modal-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('prepare-assets empty preview opens the dedicated image picker modal',()=>{
  assert.match(picker,/\.script-asset-card \.asset-preview/);
  assert.match(picker,/cardHasMedia\(card\)/);
  assert.match(picker,/stopImmediatePropagation\(\)/);
  assert.match(picker,/script-asset-picker-modal/);
});

test('picker exposes the four requested image sources',()=>{
  for(const label of ['AI生成','从当前画布选择','本地上传','个人资产库'])assert.ok(picker.includes(label));
  assert.ok(picker.includes("picker.tab='canvas'"));
  assert.ok(picker.includes('当前画布暂无节点'));
});

test('picker reuses existing asset handlers instead of duplicating asset persistence',()=>{
  assert.match(picker,/drawerAssetGenerate/);
  assert.match(picker,/drawerAssetUpload/);
  assert.match(picker,/drawerAssetCanvas/);
  assert.match(picker,/drawerAssetBindCanvas/);
});

test('picker hides the inspector while open and is styled as a centered modal',()=>{
  assert.match(css,/body\.script-asset-picker-open .*\.script-asset-drawer\{display:none!important\}/);
  assert.match(css,/position:fixed;inset:0;z-index:100000/);
  assert.match(css,/width:min\(800px/);
});

test('picker script and stylesheet are loaded by browser bootstrap',()=>{
  assert.match(bootstrap,/script-asset-picker-modal-v1\.js/);
  assert.match(bootstrap,/script-asset-picker-modal-v1\.css/);
});
