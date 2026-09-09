import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const registrySrc=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
const adapterSrc=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const sandbox={URL};
sandbox.globalThis=sandbox;
vm.runInNewContext(registrySrc,sandbox,{filename:'video-protocol-registry.js'});
vm.runInNewContext(adapterSrc,sandbox,{filename:'provider-adapter-contract.js'});
const Adapters=sandbox.CanvasProviderAdapters;

test('resolved XOGPU media route keeps origin-root canonical URL after operation route merge',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model=Adapters.xogpuKnownModels()[0];
  const route=Adapters.resolveVideoRoute(provider,model,{parameters:{operation:'image-to-video'}},[{type:'image',url:'https://example.com/frame.png'}]);
  assert.equal(route.createPath,'https://xogpu.com/api/user/discount-video-studio/jobs');
  assert.equal(route.createPath.includes('/v1/api/'),false);
  assert.deepEqual(Array.from(route.createCandidates),['https://xogpu.com/api/user/discount-video-studio/jobs']);
  assert.equal(route.requestTransport,'multipart');
  assert.equal(route.strictCreatePath,true);
});

test('XOGPU text-to-video route remains /v1/videos',()=>{
  const provider={baseUrl:'https://xogpu.com/v1'};
  const model=Adapters.xogpuKnownModels()[0];
  const route=Adapters.resolveVideoRoute(provider,model,{parameters:{operation:'text-to-video'}},[]);
  assert.equal(route.createPath,'/v1/videos');
  assert.equal(route.requestTransport,'json');
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache key is bumped for adapter route merge fix',()=>{
  assert.match(html,/provider-adapter-contract\.js\?v=20260909-xogpu-route-merge-2/);
});
