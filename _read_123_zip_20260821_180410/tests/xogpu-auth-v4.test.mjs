import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU uses strict Bearer auth and strips accidental Bearer prefix',()=>{
  assert.match(preview,/key=key\.replace\(\/\^Bearer\\s\+\/i,''\)\.trim\(\)/);
  assert.match(preview,/host==='xogpu\.com'\|\|host\.endsWith\('\.xogpu\.com'\)\)return\[\{Authorization:`Bearer \$\{key\}`\}\]/);
});

test('HTTP 200 success false is treated as provider failure',()=>{
  assert.match(preview,/parsed\.value\.success===false/);
  assert.match(preview,/discount_video_generation 权限/);
});

test('browser cache keys are bumped for XOGPU auth fix',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-auth-4/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-auth-4/);
});
