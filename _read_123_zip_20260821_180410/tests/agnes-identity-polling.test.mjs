import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-id-route-1';

test('Agnes browser uses legacy task endpoint when create response has only task id',()=>{
  assert.match(browser,/const identity=providerVideoIdentity\(createdRaw\),videoId=identity\.videoId,providerTaskId=identity\.taskId/);
  assert.match(browser,/add\(agnesLegacyTaskPollUrl\(provider,providerTaskId\)\);\n        if\(route\.pollPath\)add/);
});

test('Agnes browser promotes returned video_id to canonical agnesapi polling',()=>{
  assert.match(browser,/if\(modality==='video'&&isAgnesVideoRoute\(route\)&&pollVideoId\)/);
  assert.match(browser,/videoPollUrlCandidates\(provider,\{video_id:String\(pollVideoId\)/);
  assert.match(browser,/activePollUrl=upgraded\[0\]/);
});

test('Agnes resume keeps both video and task identities',()=>{
  assert.match(browser,/video_id:task\.providerVideoId\|\|''/);
  assert.match(browser,/task_id:task\.providerTaskId\|\|task\.upstreamTaskId/);
});

test('desktop standard video runtime preserves the same Agnes identity semantics',()=>{
  assert.match(server,/function standardVideoProviderIdentity\(raw=\{\}\)/);
  assert.match(server,/function agnesDesktopPollTemplates/);
  assert.match(server,/videoId:providerVideoId\|\|'',taskId:providerTaskId\|\|''/);
  assert.match(server,/\/v1\/videos\/\$\{encodeURIComponent\(id\)\}/);
});

test('fresh identity-aware browser runtime build is deployed',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
});
