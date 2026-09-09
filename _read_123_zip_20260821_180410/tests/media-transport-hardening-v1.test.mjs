import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const proxy=fs.readFileSync(new URL('../functions/api/[[path]].js',import.meta.url),'utf8');

test('browser proxy streams multipart without the legacy 25MB base64 gate',()=>{
  assert.match(browser,/PROXY_FORM_META='__canvas_proxy_meta_v2'/);
  assert.match(browser,/x-canvas-proxy-mode':'form-data-v2'/);
  assert.doesNotMatch(browser,/在线预览的单个代理文件不能超过 25MB/);
  assert.doesNotMatch(browser,/base64:await blobToBase64\(value\)/);
  assert.match(proxy,/request\.formData\(\)/);
  assert.match(proxy,/name===PROXY_FORM_META/);
});

test('remote generated images are auth-aware and must persist locally',()=>{
  assert.match(browser,/async function materializeGeneratedImageOutput\(value,provider\)/);
  const start=browser.indexOf('async function materializeGeneratedImageOutput(value,provider)');
  const end=browser.indexOf('async function normalizeGeneratedOutput',start);
  const fn=browser.slice(start,end);
  assert.match(fn,/fetchProviderResource\(provider,url/);
  assert.match(fn,/storeMediaBlob\(typed,\{name:'generated-image'\}\)/);
  assert.match(browser,/async function generatedImageBlob\(value,provider\)/);
});

test('XOGPU video and audio references are preflighted to 2-15 seconds',()=>{
  assert.match(browser,/async function xogpuValidateReferenceDuration\(entry,blob\)/);
  assert.match(browser,/seconds<2\|\|seconds>15/);
  assert.match(browser,/await xogpuValidateReferenceDuration\(entry,blob\)/);
});

test('XOGPU first and last frames are checked for aspect-ratio mismatch before upload',()=>{
  assert.match(browser,/async function xogpuValidateFrameAspectRatio\(firstBlob,lastBlob\)/);
  assert.match(browser,/delta>0\.01/);
  const frameStart=browser.indexOf("else if(mode==='frames')");
  const frameEnd=browser.indexOf('}else{',frameStart);
  const frameBranch=browser.slice(frameStart,frameEnd>frameStart?frameEnd:undefined);
  assert.ok(frameBranch.indexOf('xogpuValidateFrameAspectRatio')>=0);
  assert.ok(frameBranch.indexOf("appendXogpuPart(form,'input_reference'")>frameBranch.indexOf('xogpuValidateFrameAspectRatio'));
});
