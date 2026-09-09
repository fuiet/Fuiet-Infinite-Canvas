import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
const sandbox={URL,globalThis:{}};
vm.runInNewContext(src,sandbox,{filename:'video-protocol-registry.js'});
const Registry=sandbox.globalThis.CanvasVideoProtocolRegistry;

test('XOGPU MiniMax-H3 discount media create route is origin-root even when Base URL ends in /v1',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model={id:'MiniMax-H3',name:'MiniMax-H3'};
  const route=Registry.resolve(provider,model,'image-to-video');
  assert.equal(route.createPath,'https://xogpu.com/api/user/discount-video-studio/jobs');
  assert.deepEqual(Array.from(route.createCandidates),['https://xogpu.com/api/user/discount-video-studio/jobs']);
  assert.ok(Array.from(route.pollPathCandidates).includes('https://xogpu.com/api/user/discount-video-studio/jobs/{{taskId}}'));
  assert.equal(route.createPath.includes('/v1/api/'),false);
});

test('XOGPU text-to-video keeps the normal /v1/videos route',()=>{
  const route=Registry.resolve({baseUrl:'https://xogpu.com/v1'},{id:'MiniMax-H3',name:'MiniMax-H3'},'text-to-video');
  assert.equal(route.createPath,'/v1/videos');
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache key is bumped for corrected XOGPU protocol registry',()=>{
  assert.match(html,/video-protocol-registry\.js\?v=20260909-xogpu-root-route-1/);
});
