import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-xogpu-minimax-h3-1';

test('Agnes video create requests share a persisted provider-level throttle',()=>{
  assert.match(runtime,/function providerCreateThrottleKey\(provider,route=\{\}\)/);
  assert.match(runtime,/const minGap=65000/);
  assert.match(runtime,/providerCreateLastAt/);
  assert.match(runtime,/providerCreateCooldownUntil/);
  assert.match(runtime,/if\(modality==='video'\)reserveProviderCreateSlot\(provider,route\)/);
});

test('provider HTTP 429 records a shared cooldown',()=>{
  assert.match(runtime,/recordProviderCreateRateLimit\(provider,route,error\?\.retryAfterMs\)/);
  assert.match(runtime,/Math\.max\(65000,Math\.min\(15\*60\*1000/);
});

test('HTTP 429 does not consume normal task retry budget',()=>{
  assert.match(runtime,/if\(Number\(error\?\.status\)===429&&!error\?\.noRetry&&!current\.cancelRequested\)/);
  assert.match(runtime,/status:'retrying',attempt,\.\.\.failurePatch/);
  assert.doesNotMatch(runtime,/status:'retrying',attempt:attempt\+1/);
  assert.match(runtime,/rateLimitRetryCount:Number\(current\.rateLimitRetryCount\|\|0\)\+1/);
});

test('fresh browser build ships provider throttle logic',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
});
