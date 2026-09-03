import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-node-progress-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('generated script node uses the compact three-stage card and opens the existing editor',()=>{
  assert.match(app,/function scriptNodeDisplayTitle\(n\)/);
  assert.match(app,/else if\(shots\.length\)body=scriptNodeReadyHtml\(n,data\)/);
  assert.match(app,/function scriptNodeReadyHtml\(n,d\)/);
  assert.ok(app.includes('确认镜头'));
  assert.ok(app.includes('准备资产'));
  assert.ok(app.includes('合成提示词'));
  assert.ok(app.includes('打开脚本节点 →'));
  assert.match(app,/data-open-script/);
  assert.match(app,/\$\('\[data-open-script\]',el\)\?\.addEventListener\('click',e=>\{e\.stopPropagation\(\);openScriptEditor\(n\)\}\)/);
  assert.match(css,/\.script-node-ready\{/);
  assert.match(css,/\.script-ready-steps\{/);
});

test('script result toolbar keeps only rerun, batch storyboard, and batch video actions',()=>{
  const line=app.split('\n').find(x=>x.includes("if(n.type==='script')return["));
  assert.ok(line,'script toolbar definition should exist');
  assert.ok(line.includes("label:'重新生成'"));
  assert.ok(line.includes("label:'批量生成分镜'"));
  assert.ok(line.includes("label:'批量生成视频'"));
  for(const removed of ['编辑脚本','看板','改生成提示','更多'])assert.ok(!line.includes(`label:'${removed}'`),`${removed} should not remain in generated script toolbar`);
});

test('batch toolbar actions preserve final-prompt production semantics',()=>{
  assert.match(app,/script-batch-image'\)\{const d=ensureScriptData\(n\);if\(scriptWorkflowRequire\(n,d,'batch'\)\)openScriptEditor\(n,'batch-image'\)/);
  assert.match(app,/script-batch-video'\)\{const d=ensureScriptData\(n\);if\(scriptWorkflowRequire\(n,d,'batch'\)\)openScriptEditor\(n,'batch-video'\)/);
  assert.ok(app.includes("prompt:type==='image'?shot.imagePrompt:shot.videoPrompt"));
  assert.ok(app.includes("if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(n)"));
});

test('compact script node assets are cache-busted',()=>{
  assert.ok(bootstrap.includes("const v='20260903-script-node-compact-2';"));
});
