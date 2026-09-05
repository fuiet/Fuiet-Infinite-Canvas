import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const composer=fs.readFileSync(new URL('../script-final-prompt-composer-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('step 3 composer exposes table statuses and per-shot modal',()=>{
  assert.match(composer,/最终提示词/);
  assert.match(composer,/待生成提示词/);
  assert.match(composer,/需要重新合成/);
  assert.match(composer,/合成失败/);
  assert.match(composer,/查看提示词/);
  assert.match(composer,/data-open-final-prompt/);
  assert.match(composer,/data-modal-image/);
  assert.match(composer,/data-modal-video/);
});

test('smart synthesis compiles shot, assets, style and neighbor context',()=>{
  assert.match(composer,/function sourceObject\(ctx,shot\)/);
  assert.match(composer,/previous:serializeShot/);
  assert.match(composer,/next:serializeShot/);
  assert.match(composer,/assets:assets\.map/);
  assert.match(composer,/style:\{text:/);
  assert.match(composer,/只回答“这一帧长什么样”/);
  assert.match(composer,/只回答“这一帧接下来怎么动”/);
  assert.match(composer,/final_prompt_synthesis/);
});

test('source fingerprint invalidates stale prompts without trusting display text',()=>{
  assert.match(composer,/function sourceFingerprint\(ctx,shot\)/);
  assert.match(composer,/meta\.fingerprint&&meta\.fingerprint!==fp/);
  assert.match(composer,/shot\.promptDirty/);
  assert.match(composer,/mode:'manual'/);
});

test('single-shot and batch synthesis support smart and rule fallback modes',()=>{
  assert.match(composer,/async function smartSynthesize\(ctx,shot\)/);
  assert.match(composer,/function autoCompose\(ctx,shot\)/);
  assert.match(composer,/value="smart" checked/);
  assert.match(composer,/value="auto"/);
  assert.match(composer,/async function batchSmart\(onlyDirty\)/);
  assert.match(composer,/Math\.min\(2,shots\.length\)/);
  assert.match(composer,/一键合成全部提示词/);
});

test('composer is loaded by browser bootstrap',()=>{
  assert.match(bootstrap,/script-final-prompt-composer-v1\.js/);
  assert.match(bootstrap,/script-final-prompt-composer-v1\.css/);
});
