import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('prompt synthesis supports single selected and all shots',()=>{
  assert.match(app,/function synthesizeScriptPromptSubset\(n,shotIds=\[\]\)/);
  assert.match(app,/data-prompt-shot=/);
  assert.match(app,/data-synthesize-shot=/);
  assert.match(app,/id="synthesizeSelected"/);
});
test('batch review exposes asset and first frame metadata before node creation',()=>{
  assert.match(app,/function scriptBatchShotMeta\(n,d,shot,type\)/);
  assert.match(app,/资产：\$\{escapeHtml\(meta\.assetNames\)\}/);
  assert.match(app,/首帧：暂无，将按文生视频创建/);
  assert.match(app,/可先选 1–3 个 Shot 测试模型与风格/);
});
test('batch selection supports subset testing',()=>{
  assert.match(app,/id="batchSelectAll"/);
  assert.match(app,/id="batchSelectNone"/);
  assert.match(app,/id="batchSelectDirty"/);
});
