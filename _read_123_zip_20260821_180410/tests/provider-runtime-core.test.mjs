import test from 'node:test';
import assert from 'node:assert/strict';
import '../provider-runtime-core.js';
const Core=globalThis.CanvasProviderRuntimeCore;

test('shared runtime core parses common async task shapes',()=>{
  assert.equal(Core.extractTaskId({data:{taskId:'abc'}}), 'abc');
  assert.equal(Core.extractTaskId({job:{id:'job-7'}}, {taskIdPath:'job.id'}), 'job-7');
  assert.equal(Core.extractStatus({data:{state:'processing'}}), 'processing');
  assert.equal(Core.extractProgress({task:{progress:42}}), 42);
});

test('shared runtime core classifies success, failure and pending consistently',()=>{
  const route={successValues:['done'],failureValues:['failed'],outputPath:'result.url'};
  const success=Core.classifyAsyncPoll({status:'done',result:{url:'https://cdn.test/v.mp4'}},route,'video');
  assert.equal(success.state,'success');assert.equal(success.output,'https://cdn.test/v.mp4');
  const failure=Core.classifyAsyncPoll({status:'failed',error:{message:'bad input'}},route,'video');
  assert.equal(failure.state,'failure');assert.equal(failure.detail,'bad input');
  const pending=Core.classifyAsyncPoll({status:'processing',progress:33},route,'video');
  assert.equal(pending.state,'pending');assert.equal(pending.progress,33);
});

test('output-without-status requires an explicit opt-in and polling delay is bounded',()=>{
  assert.equal(Core.classifyAsyncPoll({result:{url:'https://cdn.test/a.mp4'}},{outputPath:'result.url'},'video').state,'pending');
  assert.equal(Core.classifyAsyncPoll({result:{url:'https://cdn.test/a.mp4'}},{outputPath:'result.url',allowOutputWithoutTerminalStatus:true},'video').state,'success');
  assert.equal(Core.nextPollDelay(1500,0),1500);
  assert.ok(Core.nextPollDelay(1500,50)<=30000);
});


test('shared runtime core extracts provider supplied poll URLs',()=>{
  assert.equal(Core.extractPollUrl({poll_url:'/v1/jobs/a'}),'/v1/jobs/a');
  assert.equal(Core.extractPollUrl({data:{statusUrl:'https://api.test/jobs/b'}}),'https://api.test/jobs/b');
  assert.equal(Core.extractPollUrl({links:{status:'/tasks/c'}}),'/tasks/c');
  assert.equal(Core.extractPollUrl({status:'processing'}),undefined);
});
