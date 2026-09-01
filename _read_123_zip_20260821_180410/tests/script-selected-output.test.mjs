import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Shot output uses explicit selected production node',()=>{
  assert.match(app,/function selectedShotProductionNode\(scriptNode,shot,type=''\)/);
  assert.match(app,/selectedVideoNodeId/);
  assert.match(app,/selectedImageNodeId/);
  assert.match(app,/data-shot-output-select/);
  assert.match(app,/setSelectedShotProductionNode\(shot,sel\.dataset\.shotType,sel\.value\)/);
});
test('video first frame and production review use selected Shot image',()=>{
  assert.match(app,/selectedShotProductionNode\(scriptNode,shot,'image'\)/);
  assert.match(app,/selectedShotProductionNode\(n,shot,'image'\)/);
  assert.match(app,/const node=selectedShotProductionNode\(scriptNode,shot,type\),q=ensureShotQuality/);
});
test('non-shot selectors no longer dirty prompt data',()=>{
  assert.match(app,/\$\$\('\[data-shot-row\] \[data-shot\]'[\s\S]*镜头信息已修改/);
  assert.doesNotMatch(app,/\[data-shot-row\] input,\[data-shot-row\] textarea,\[data-shot-row\] select/);
});
test('production baseline records selected node identity',()=>{
  assert.match(app,/imageNodeId:img\?\.id\|\|''/);
  assert.match(app,/videoNodeId:vid\?\.id\|\|''/);
});
