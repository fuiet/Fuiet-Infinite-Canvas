import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
require('../provider-runtime-core.js');
require('../provider-adapter-contract.js');

const core=globalThis.CanvasProviderRuntimeCore;
const adapters=globalThis.CanvasProviderAdapters;

test('DataEyes/Hailuo terminal task content URL is treated as the video result',()=>{
  const response={task:{status:'succeeded',content:{url:'https://cdn.example.test/result.mp4'}}};
  const result=core.classifyAsyncPoll(response,{},'video');
  assert.equal(result.state,'success');
  assert.equal(result.providerSucceeded,true);
  assert.equal(result.resultPending,false);
  assert.equal(result.output,'https://cdn.example.test/result.mp4');
});

test('nested data.task.content URL is parsed without provider-specific frontend code',()=>{
  const response={data:{task:{status:'completed',content:{url:'https://cdn.example.test/nested.mp4'}}}};
  const result=core.classifyAsyncPoll(response,{},'video');
  assert.equal(result.state,'success');
  assert.equal(result.output,'https://cdn.example.test/nested.mp4');
});

test('provider success without a result is explicitly visible to the state machine',()=>{
  const result=core.classifyAsyncPoll({task:{status:'succeeded'}},{},'video');
  assert.equal(result.state,'success');
  assert.equal(result.providerSucceeded,true);
  assert.equal(result.resultPending,true);
  assert.equal(result.output,undefined);
});

test('XOGPU completed metadata content endpoint is treated as the video result',()=>{
  const response={
    id:'task_xogpu_1',
    status:'completed',
    progress:100,
    metadata:{content_url:'/v1/videos/task_xogpu_1/content'}
  };
  const result=core.classifyAsyncPoll(response,{},'video');
  assert.equal(result.state,'success');
  assert.equal(result.providerSucceeded,true);
  assert.equal(result.resultPending,false);
  assert.equal(result.output,'/v1/videos/task_xogpu_1/content');
});

test('DataEyes H3 profile centralizes its terminal result shape',()=>{
  const provider={baseUrl:'https://platform.dataeyes.ai',protocol:'openai-compatible'};
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',adapterKey:'standard-video-async-v1',createPath:'/hailuo/v2/video_generation',pollPath:'/hailuo/v2/query/video_generation/{{taskId}}'};
  const route=adapters.resolveRoute(provider,model,'video','generate');
  assert.equal(route.adapterKey,'standard-video-async-v1');
  assert.equal(route.createPath,'/hailuo/v2/video_generation');
  assert.equal(route.pollPath,'/hailuo/v2/query/video_generation/{{taskId}}');
  assert.equal(route.taskIdPath,'task_id');
  assert.equal(route.statusPath,'task.status');
  assert.equal(route.outputPath,'task.content.url');
  assert.equal(route.contentPath,'');
});
