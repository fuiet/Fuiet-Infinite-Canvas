import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adapter=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU keeps the known-working internal billing group',()=>{
  assert.ok(adapter.includes("billingGroup:'discount_video_generation'"));
  assert.ok(!adapter.includes("billingGroup:'特惠视频生成'"));
});

test('browser loads a fresh XOGPU runtime after rollback',()=>{
  assert.ok(router.includes('browser-runtime-preview.js?v=20260902-xogpu-baseline-runtime-1'));
  assert.ok(index.includes('provider-adapter-contract.js?v=20260902-xogpu-baseline-runtime-1'));
  assert.ok(index.includes('browser-runtime.js?v=20260902-xogpu-baseline-runtime-1'));
});

test('XOGPU create errors expose safe route diagnostics without credentials',()=>{
  assert.ok(preview.includes('XOGPU URL ${safeUrl(createUrl)}'));
  assert.ok(preview.includes('Base ${safeUrl(provider.baseUrl)}'));
  assert.ok(preview.includes('createUrl:safeUrl(createUrl)'));
  assert.ok(preview.includes('requestGroup:String(requestBody?.group'));
  assert.ok(!preview.includes('requestApiKey'));
});
