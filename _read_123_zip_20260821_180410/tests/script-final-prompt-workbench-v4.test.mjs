import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='_read_123_zip_20260821_180410';
const workbench=fs.readFileSync(`${root}/script-final-prompt-workbench-v4.js`,'utf8');
const css=fs.readFileSync(`${root}/styles/script-final-prompt-workbench-v4.css`,'utf8');
const rich=fs.readFileSync(`${root}/script-final-prompt-rich-v1.js`,'utf8');
const v2=fs.readFileSync(`${root}/script-final-prompt-v2.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('V4 replaces dense V3 table with shot workbench cards',()=>{
  assert.match(workbench,/class=\"fpv4-card/);
  assert.match(workbench,/镜头输入/);
  assert.match(workbench,/分镜图提示词/);
  assert.match(workbench,/视频提示词/);
  assert.match(css,/\.fpv4-prompts-active \.fpv3-page\{display:none!important\}/);
});

test('workbench exposes all requested shot synthesis inputs',()=>{
  for(const token of ['duration','shotSize','cameraMovement','lighting','action','dialogue','sound','assets'])assert.match(workbench,new RegExp(token));
  assert.match(workbench,/剧情 \/ 视觉风格/);
  assert.match(workbench,/完整剧本/);
});

test('manual editing writes through canonical hidden final prompt controls',()=>{
  assert.match(workbench,/data-fpv4-prompt/);
  assert.match(workbench,/\[data-final-\$\{type\}\]/);
  assert.match(workbench,/dispatchEvent\(new Event\('change'/);
  assert.match(workbench,/自动保存/);
});

test('production AI synthesis receives full script source',()=>{
  assert.match(rich,/scriptSource:text\(ctx\.node\?\.sourceText\|\|''\)/);
  assert.match(rich,/scriptSource:text\(hit\.node\?\.sourceText\|\|''\)/);
  assert.match(rich,/scriptSource 是完整剧本原文/);
  assert.match(v2,/scriptSource:text\(ctx\.node\?\.sourceText\|\|''\)/);
  assert.match(v2,/scriptSource:text\(node\?\.sourceText\|\|''\)/);
});

test('single-shot AI compose is available to workbench',()=>{
  assert.match(rich,/async function composeOne\(shotId,onProgress\)/);
  assert.match(rich,/Object\.freeze\(\{version:2,[^}]*composeOne,bulk\}\)/);
  assert.match(workbench,/production\.composeOne/);
});

test('bootstrap loads workbench after V3 with isolated cache key',()=>{
  const v3=boot.indexOf('script-final-prompt-page-v3.js');
  const v4=boot.indexOf('script-final-prompt-workbench-v4.js');
  assert.ok(v3>=0&&v4>v3);
  assert.match(boot,/promptWorkbenchV='20260907-final-prompt-workbench-v4-1'/);
  assert.match(boot,/script-final-prompt-workbench-v4\.css/);
});
