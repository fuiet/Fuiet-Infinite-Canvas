import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');

test('XOGPU create-stage 501 is treated as uncertain submission and never auto-retried',()=>{
  assert.match(src,/isXogpuVideoRoute\(route\)&&isXogpuNotImplementedError\(error,route\)/);
  assert.match(src,/error\.noRetry=true/);
  assert.match(src,/error\.code='XOGPU_CREATE_NOT_IMPLEMENTED'/);
  assert.match(src,/submissionState:'uncertain'/);
  assert.match(src,/为避免重复扣费，网站不会自动重新提交/);
});
