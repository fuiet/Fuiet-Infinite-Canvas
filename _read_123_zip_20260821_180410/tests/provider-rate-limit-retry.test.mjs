import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260901-xogpu-video-display-1';

test('HTTP 429 captures provider Retry-After instead of immediate retry',()=>{
  assert.match(runtime,/function providerRetryAfterMs\(res,detail=''\)/);
  assert.match(runtime,/headers\?\.get\?\.\('retry-after'\)/);
  assert.match(runtime,/if\(res\.status===429\)err\.retryAfterMs=providerRetryAfterMs\(res,detail\)/);
  assert.match(runtime,/retryReason:'rate_limit'/);
  assert.match(runtime,/scheduleRateLimitRetry\(task\.id,delay\)/);
});

test('rate limited create retry waits before queue pump and survives refresh',()=>{
  assert.match(runtime,/function scheduleRateLimitRetry\(id,delay=65000\)/);
  assert.match(runtime,/setTimeout\(\(\)=>\{runtime\.rateLimitRetryTimers\.delete\(id\)/);
  assert.match(runtime,/t\.status==='retrying'&&t\.retryReason==='rate_limit'&&!t\.upstreamTaskId/);
  const start=runtime.indexOf("if(Number(error?.status)===429");
  const end=runtime.indexOf("if(!error?.noRetry",start+10);
  const branch=runtime.slice(start,end);
  assert.ok(branch.includes("status:'retrying'"));
  assert.ok(branch.includes('scheduleRateLimitRetry(task.id,delay)'));
  assert.doesNotMatch(branch,/pump\(\)/);
});

test('video diagnostics show rate limit wait and next automatic retry',()=>{
  assert.match(app,/retryReason:String\(info\.retryReason\|\|''\)/);
  assert.match(app,/供应商限流 · 等待自动重试/);
  assert.match(app,/自动重试/);
  assert.match(app,/供应商触发限流，正在等待自动重试/);
});

test('fresh runtime build is loaded',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${BUILD}`));
});
