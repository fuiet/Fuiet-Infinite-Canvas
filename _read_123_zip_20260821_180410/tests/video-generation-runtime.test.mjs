import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import '../video-request-parameters.js';import '../provider-runtime-core.js';const DIR=path.dirname(fileURLToPath(import.meta.url));const ROOT=path.resolve(DIR,'..');const V=globalThis.CanvasVideoRequestParameters,C=globalThis.CanvasProviderRuntimeCore;
test('standard video params map size',()=>{assert.equal(V.standardSize('720p','16:9'),'1280x720');assert.equal(V.standardSize('720p','9:16'),'720x1280');assert.equal(V.standardSize('1080p','16:9'),'1792x1024');assert.equal(V.normalize({duration:8}).seconds,'8')});
test('runtime core recognizes broader schemas',()=>{assert.equal(C.extractTaskId({data:{video:{id:'video_1'}}}),'video_1');const a=C.classifyAsyncPoll({data:{video:{status:'ready',url:'https://cdn.test/a.mp4'}}},{},'video');assert.equal(a.state,'success');assert.equal(a.output,'https://cdn.test/a.mp4');assert.equal(C.classifyAsyncPoll({status:'rejected',error:{message:'bad'}},{},'video').state,'failure')});
test('browser runtime supports multipart video and local refs',()=>{const src=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');for(const x of ['buildStandardVideoForm','input_reference','alternateVideoCreatePaths','/v1/video/generations','referenceBlob','/__browser_media/'])assert.ok(src.includes(x),x)});
test('Cloudflare proxy reconstructs multipart statelessly',()=>{const src=fs.readFileSync(path.join(ROOT,'functions/api/[[path]].js'),'utf8');assert.match(src,/bodyType==='form-data'/);assert.match(src,/new FormData\(\)/);assert.match(src,/new Blob/);assert.match(src,/no-store/)});
test('Sora defaults use 4 8 12 and landscape portrait ratios',()=>{const src=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');assert.match(src,/\/sora\/\.test\(t\)\?\[4,8,12\]/);assert.match(src,/\/sora\/\.test\(t\)\?\['16:9','9:16'\]/)});


test('auto video protocol retries request-format failures across common create paths',()=>{
  const src=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
  assert.match(src,/VIDEO_AUTO_RETRY_STATUSES=new Set\(\[400,404,405,415,422\]\)/);
  assert.match(src,/\/v1\/video\/generations/);
  assert.match(src,/\/v1\/videos\/generations/);
  assert.match(src,/\/api\/v1\/video\/generations/);
  assert.match(src,/VIDEO_AUTO_RETRY_STATUSES\.has\(Number\(error\?\.status\)\)/);
});

test('video polling follows response urls and falls back to task endpoints',()=>{
  const src=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
  assert.match(src,/videoPollUrlCandidates/);
  assert.equal(C.extractPollUrl({status_url:'/v1/jobs/status-1'}),'/v1/jobs/status-1');
  assert.equal(C.extractPollUrl({poll_url:'/v1/jobs/poll-2'}),'/v1/jobs/poll-2');
  assert.match(src,/Core\?\.extractPollUrl\?Core\.extractPollUrl\(createdRaw\)/);
  assert.match(src,/`\/v1\/tasks\/\$\{taskId\}`/);
  assert.match(src,/pollVideoJson/);
  assert.match(src,/fetchVideoContent/);
});

test('video core accepts task-state and nested result schemas',()=>{
  assert.equal(C.extractTaskId({result:{task:{id:'job-9'}}}),'job-9');
  const a=C.classifyAsyncPoll({data:{task:{state:'completed',result:{url:'https://cdn.test/v.mp4'}}}},{allowOutputWithoutTerminalStatus:true},'video');
  assert.equal(a.state,'success');
  assert.equal(a.output,'https://cdn.test/v.mp4');
  const b=C.classifyAsyncPoll({data:{task_result:{videos:[{url:'https://cdn.test/v2.mp4'}]}}},{allowOutputWithoutTerminalStatus:true},'video');
  assert.equal(b.state,'success');
  assert.equal(b.output,'https://cdn.test/v2.mp4');
});

test('standard video adapter accepts output without terminal status',()=>{
  const src=fs.readFileSync(path.join(ROOT,'provider-adapter-contract.js'),'utf8');
  assert.match(src,/standard-video-async-v1'[\s\S]*allowOutputWithoutTerminalStatus:true/);
});
