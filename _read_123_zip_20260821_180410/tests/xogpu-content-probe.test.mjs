import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('XOGPU preserves not_implemented poll failures and probes documented content endpoint',()=>{
  assert.match(browser,/function isXogpuNotImplementedError\(error,route=\{\}\)/);
  assert.match(browser,/function probeXogpuVideoContent\(provider,createdRaw,taskId,route\)/);
  assert.match(browser,/\/v1\/videos\/\$\{taskId\}\/content/);
  assert.match(browser,/error\?\.xogpuNotImplemented===true\|\|isXogpuNotImplementedError\(error,route\)/);
  assert.match(browser,/pollFallback:'content-probe'/);
});

test('XOGPU content probe treats not-ready HTTP responses as pending instead of generation failure',()=>{
  assert.match(browser,/\[400,404,409,425,429,500,501,502,503,504\]\.includes\(res\.status\)/);
  assert.match(browser,/status:'polling',providerStatus:latest\?\.providerStatus==='succeeded'\?'succeeded':'processing'/);
});

test('XOGPU content probe can finish and persist a paid task without another create request',()=>{
  assert.match(browser,/if\(probe\?\.ready\)/);
  assert.match(browser,/status:'succeeded',providerStatus:'succeeded',resultStatus:'saved'/);
  assert.match(browser,/contentProbeReady:true/);
});

test('video failure UI reports poll failure instead of stale create stage',()=>{
  assert.match(app,/const pollStageUrl=protocol\.lastPollErrorUrl\|\|protocol\.lastPollRequestUrl\|\|protocol\.pollUrl/);
});
