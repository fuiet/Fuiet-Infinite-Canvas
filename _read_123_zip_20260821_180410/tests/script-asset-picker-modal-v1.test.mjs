import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const picker=fs.readFileSync(new URL('../script-asset-picker-modal-v1.js',import.meta.url),'utf8');
const reference=fs.readFileSync(new URL('../script-assets-reference-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-asset-picker-modal-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('prepare-assets empty preview and editor hero open the dedicated image picker modal',()=>{
  assert.match(picker,/\.script-asset-card \.asset-preview/);
  assert.match(picker,/\.script-asset-hero-trigger/);
  assert.match(picker,/activeAssetCard\(\)/);
  assert.match(picker,/cardHasMedia\(card\)/);
  assert.match(picker,/stopImmediatePropagation\(\)/);
  assert.match(picker,/script-asset-picker-modal/);
});

test('asset picker capture listener loads before the legacy reference adapter',()=>{
  const pickerPos=bootstrap.indexOf('./script-asset-picker-modal-v1.js');
  const referencePos=bootstrap.indexOf('./script-assets-reference-v1.js');
  assert.ok(pickerPos>=0);
  assert.ok(referencePos>=0);
  assert.ok(pickerPos<referencePos);
  assert.match(reference,/\.script-asset-hero-trigger,\.script-asset-hero-more/);
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

test('picker runtime is loaded and cache-busted from index through browser bootstrap',()=>{
  assert.match(bootstrap,/script-asset-picker-modal-v1\.js/);
  assert.match(bootstrap,/script-asset-picker-modal-v1\.css/);
  assert.match(bootstrap,/20260904-script-asset-picker-modal-4/);
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-asset-picker-modal-4/);
});
