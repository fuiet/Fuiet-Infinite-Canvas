import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-protocol-registry.js');
const V=globalThis.CanvasVideoProtocolRegistry;
const provider={baseUrl:'https://xogpu.com'};
const model={id:'MiniMax-H3',name:'MiniMax-H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};

test('XOGPU poll profile falls back from OpenAI video status to generic New API task status',()=>{
  const route=V.resolve(provider,model,'text-to-video');
  assert.equal(route.pollPath,'/v1/videos/{{taskId}}');
  assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']);
  assert.equal(route.strictPollPath,true);
});

test('browser treats XOGPU 501 as recoverable poll failure and probes video content',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoRoute\(route=\{\}\)/);
  assert.match(src,/function isXogpuNotImplementedError\(error,route=\{\}\)/);
  assert.match(src,/function probeXogpuVideoContent\(provider,createdRaw,taskId,route\)/);
  assert.match(src,/pollFallback:'content-probe'/);
});

test('browser recovers an already-paid XOGPU task failed only by not_implemented poll error',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function recoverableXogpuNotImplementedTask\(task\)/);
  assert.match(src,/task\.status!=='failed'\|\|!String\(task\.upstreamTaskId/);
  assert.match(src,/not_implemented:\\d\+/);
  assert.match(src,/if\(recoverableXogpuNotImplementedTask\(t\)\)\{t\.status='queued'/);
});

test('desktop also falls back on XOGPU 501 without resubmitting',()=>{
  const src=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoConfig\(config=\{\}\)/);
  assert.match(src,/isXogpuVideoConfig\(config\)&&Number\(error\?\.status\)===501/);
});
