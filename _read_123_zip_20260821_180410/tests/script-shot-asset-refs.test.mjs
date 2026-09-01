import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('shot editor exposes explicit stable asset references',()=>{
  assert.match(app,/function shotAssetRefsCellHtml\(d,shot\)/);
  assert.match(app,/@\$\{escapeHtml\(a\.name\|\|'未命名资产'\)\}/);
  assert.match(app,/data-shot-asset-select/);
  assert.match(app,/data-add-shot-asset/);
  assert.match(app,/data-remove-shot-asset/);
});
test('shot asset refs mutate assetIds rather than names',()=>{
  assert.match(app,/shot\.assetRefs=\[\.\.\.new Set\(\[\.\.\.\(shot\.assetRefs\|\|\[\]\),id\]\)\]/);
  assert.match(app,/shot\.assetRefs=\(shot\.assetRefs\|\|\[\]\)\.filter\(id=>id!==btn\.dataset\.removeShotAsset\)/);
  assert.match(app,/markScriptShotDirty\(shot,'资产引用已修改'\)/);
});
