import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const patch=fs.readFileSync(new URL('../script-assets-reference-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-assets-reference-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('prepare-assets reference adapter is loaded after the script studio',()=>{
  assert.match(bootstrap,/script-assets-reference-v1\.js/);
  assert.match(bootstrap,/script-assets-reference-v1\.css/);
});

test('asset cards open a right-side inspector and each section gets a visual add card',()=>{
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) 505px/);
  assert.match(css,/\.script-asset-drawer/);
  assert.match(patch,/script-asset-add-card/);
  assert.match(patch,/data-open-script-asset/);
});

test('drawer exposes generate, upload, and canvas selection while keeping prompt editable',()=>{
  for(const action of ['AI 生成${kind}图','上传已有图片','从画布选择'])assert.ok(patch.includes(action));
  assert.ok(patch.includes("relabelDrawerField(labels[2],'生成提示词')"));
  assert.match(app,/drawerAssetPrompt/);
  assert.match(app,/a\.prompt=prompt/);
});

test('one-click asset generation executes existing per-asset generation instead of only creating generators',()=>{
  assert.match(patch,/runBulkGeneration/);
  assert.match(patch,/generate\.click\(\)/);
  assert.match(patch,/stopImmediatePropagation\(\)/);
  assert.match(patch,/一键生成所有资产/);
});

test('assets stage has dynamic missing/complete status and blocks prompt stage until media is ready',()=>{
  assert.match(patch,/检测到有 \$\{counts\.角色\} 个角色/);
  assert.match(patch,/资产已生成，如再次生成将会覆盖之前的角色/);
  assert.match(patch,/data-script-tab=\\"prompts\\"/);
  assert.match(patch,/还有 \$\{missing\.length\} 个资产未准备完成/);
});
