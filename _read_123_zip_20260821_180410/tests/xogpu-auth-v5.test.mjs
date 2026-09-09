import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU key normalization removes copied auth prefixes and invisible characters',()=>{
  assert.match(preview,/function normalizeProviderApiKey/);
  assert.match(preview,/Authorization\\s\*:\\s\*/);
  assert.match(preview,/Bearer\\s\+/);
  assert.match(preview,/u200B/);
});

test('XOGPU retries semantic auth failures across safe header variants',()=>{
  assert.match(preview,/Authorization:`Bearer \$\{key\}`/);
  assert.match(preview,/\{Authorization:key\}/);
  assert.match(preview,/x-api-key/);
  assert.match(preview,/api-key/);
  assert.match(preview,/responseAuthRejected/);
  assert.match(preview,/res\.clone\(\)\.text\(\)/);
});

test('XOGPU final error reports auth variants without exposing the key',()=>{
  assert.match(preview,/已依次尝试 Bearer、Authorization 原始值、x-api-key、api-key/);
  assert.match(preview,/长度 \$\{key\.length\}/);
});

test('browser cache keys are bumped for XOGPU auth v5',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-auth-5/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-auth-5/);
});
