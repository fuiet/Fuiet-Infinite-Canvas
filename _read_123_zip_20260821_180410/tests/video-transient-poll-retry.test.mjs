import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../provider-runtime-core.js');
const C=globalThis.CanvasProviderRuntimeCore;

test('circuit-open failed status is retryable instead of terminal generation failure',()=>{
  const raw={status:'failed',message:'Leonardo upstream circuit is open, retry later'};
  const result=C.classifyAsyncPoll(raw,{},'video');
  assert.equal(result.state,'retryable');
  assert.equal(result.retryableFailure,true);
  assert.match(C.formatFailure(result,'上游轮询暂时不可用'),/circuit is open/i);
});

test('HTTP transient failures are recognized while content-policy generation failure stays terminal',()=>{
  assert.equal(C.isRetryableProviderFailure({status:503,message:'Service Unavailable'}),true);
  assert.equal(C.isRetryableProviderFailure({status:429,message:'Too many requests'}),true);
  const terminal=C.classifyAsyncPoll({status:'failed',message:'content policy violation'}, {}, 'video');
  assert.equal(terminal.state,'failure');
  assert.equal(terminal.retryableFailure,false);
});

test('browser preview retries polling in place instead of failing or resubmitting',()=>{
  const source=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(source,/assessment\.state==='retryable'/);
  assert.match(source,/Core\?\.isRetryableProviderFailure\?\.\(error\)/);
  assert.match(source,/status:'retrying'/);
  assert.match(source,/existingUpstreamTaskId/);
});

test('desktop runtime preserves upstream task id across transient poll failures',()=>{
  const source=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(source,/ProviderRuntimeCore\.isRetryableProviderFailure\?\.\(error\)/);
  assert.match(source,/assessment\.state==='retryable'/);
  assert.match(source,/保留上游任务/);
  assert.match(source,/payload\._upstream/);
});
