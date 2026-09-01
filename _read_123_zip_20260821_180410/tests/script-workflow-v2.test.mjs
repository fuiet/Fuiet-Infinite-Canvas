import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-workflow-v2.css',import.meta.url),'utf8');

test('script editor exposes the three required primary production stages',()=>{
  assert.match(app,/确认镜头/);assert.match(app,/准备资产/);assert.match(app,/合成提示词/);assert.match(app,/scriptWorkflowRequire/);assert.match(app,/shotsConfirmed/);assert.match(app,/assetsReady/);assert.match(app,/promptsReady/);
});

test('AI breakdown stops for human shot review instead of auto-finalizing production prompts',()=>{
  assert.match(app,/AI 拆解完成，等待镜头与资产确认/);assert.match(app,/scriptWorkflowMark\(d,'shots',\{shotsConfirmed:false,assetsReady:false,promptsReady:false\}\)/);
});

test('asset management uses a right drawer with AI upload and canvas reference sources',()=>{
  for(const text of ['script-asset-drawer','AI 生成参考图','上传参考图','从画布选择图片','设为参考'])assert.match(app,new RegExp(text));
  assert.match(css,/\.script-asset-drawer/);assert.match(app,/uploadBlob\(file/);assert.match(app,/bindScriptAssetToNode/);
});

test('batch asset creation only targets missing visual assets and paid batch remains gated',()=>{
  assert.match(app,/filter\(\(\[a\]\)=>!a\.mediaUrl\)/);assert.match(app,/缺失资产生成器/);assert.match(app,/if\(!scriptWorkflowRequire\(n,d,'batch'\)\)return\[\]/);
});

test('asset result updates invalidate approval but do not trigger paid media reruns',()=>{
  assert.match(app,/资产生成结果已更新/);assert.match(app,/scriptWorkflowInvalidate\(sn\.scriptData,'assets'\)/);assert.doesNotMatch(app,/资产生成结果已更新[^\n]{0,200}executeWorkflowIds/);
});
