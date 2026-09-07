import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='_read_123_zip_20260821_180410';
const app=fs.readFileSync(`${root}/app.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('Image Studio / Canvas Studio entry points are removed',()=>{
  for(const token of ['openImageStudio(','imageGenExpand','data-act="image-studio"',"tool==='图像工作台'",'Image Studio · 图像工作台']){
    assert.equal(app.includes(token),false,`still contains ${token}`);
  }
});

test('image model selection returns directly to inline generator',()=>{
  assert.match(app,/const reopenActiveEditor=\(\)=>\{if\(expandedNodeId!==n\.id\)return render\(\);if\(n\.type==='video'\)openVideoStudio\(n\);else render\(\)\};/);
  assert.match(app,/\$\$\('\[data-model-pick\]'[^\n]+setNodeModel\(n,item\)[^\n]+reopenActiveEditor\(\)/);
});

test('normal image generator model and prompt controls remain intact',()=>{
  assert.match(app,/class=\"lib-gen-main image-generator-main\"/);
  assert.match(app,/id=\"modelPickerBtn\"/);
  assert.match(app,/id=\"promptInput\"/);
  assert.match(app,/id=\"ratioSelect\"/);
  assert.match(app,/id=\"resolutionSelect\"/);
  assert.match(app,/id=\"generateBtn\"/);
});

test('image context menu keeps useful direct actions without Studio',()=>{
  assert.match(app,/data-act=\"image-storyboard\"/);
  assert.match(app,/data-act=\"image-video\"/);
  assert.doesNotMatch(app,/data-act=\"image-studio\"/);
});

test('generated image click behavior remains enabled',()=>{
  assert.match(app,/clicked\.type==='image'&&clickedState==='result'/);
});

test('browser cache explicitly invalidates old Image Studio runtime',()=>{
  assert.match(boot,/&imageStudio=removed-1/);
});
