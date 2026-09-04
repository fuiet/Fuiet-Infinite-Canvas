import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../script-inline-asset-refs-v1.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('inline asset runtime parses',()=>{
  assert.doesNotThrow(()=>new Function(runtime));
});

test('script prompt requires natural inline @asset references',()=>{
  assert.ok(runtime.includes('每个 shot.action 必须把该镜头实际使用的角色、场景、道具直接嵌入画面描述'));
  assert.ok(runtime.includes('不要把 @资产名单独堆在句首、句尾'));
  assert.ok(runtime.includes('@林晓站在门内'));
  assert.ok(runtime.includes('@林晓：胖子！'));
});

test('successful breakdown output is normalized before app consumes it',()=>{
  assert.match(runtime,/function normalizeBreakdownObject/);
  assert.match(runtime,/function ensureActionReferences/);
  assert.match(runtime,/next\.dialogue=tagKnownNames/);
  assert.match(runtime,/rewriteTaskOutput/);
});

test('bootstrap loads inline ref runtime after skill pack and before app',()=>{
  assert.match(bootstrap,/script-node-skill-pack-v1\.js\?v=\$\{v\}[\s\S]*script-inline-asset-refs-v1\.js\?v=\$\{v\}[\s\S]*app\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/const v='20260904-script-inline-assets-1'/);
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-inline-assets-1/);
});
