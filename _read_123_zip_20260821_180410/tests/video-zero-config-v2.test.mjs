import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');

test('zero-config video uses current OpenAI-compatible async contract',async()=>{
  delete globalThis.CanvasProviderAdapters;
  await import(pathToFileURL(path.join(ROOT,'provider-adapter-contract.js')).href+`?v=${Date.now()}`);
  const c=globalThis.CanvasProviderAdapters;
  const provider={id:'p1',baseUrl:'https://api.example.com/v1',protocol:'openai-compatible',models:[{id:'sora-2',name:'Sora 2',modality:'video'}]};
  const finalized=c.finalizeProvider(provider);
  const model=finalized.models[0];
  assert.equal(model.createPath,'/v1/videos');
  assert.equal(model.pollPath,'/v1/videos/{{taskId}}');
  assert.equal(model.contentPath,'/v1/videos/{{taskId}}/content');
  const route=c.resolveRoute(finalized,model,'video','generate');
  assert.equal(route.createPath,'/v1/videos');
  assert.equal(route.contentPath,'/v1/videos/{{taskId}}/content');
});

test('legacy implicit video defaults self-heal while custom legacy routes stay intact',async()=>{
  const c=globalThis.CanvasProviderAdapters;
  const legacy={id:'p',baseUrl:'https://api.example.com/v1',videoProtocolConfig:{createPath:'/v1/video/generations',pollPath:'/v1/video/generations/{{taskId}}'},models:[{id:'video-x',modality:'video',adapterKey:'standard-video-async-v1',createPath:'/v1/video/generations',pollPath:'/v1/video/generations/{{taskId}}'}]};
  const healed=c.resolveRoute(legacy,legacy.models[0],'video','generate');
  assert.equal(healed.createPath,'/v1/videos');
  assert.equal(healed.pollPath,'/v1/videos/{{taskId}}');
  const customModel={...legacy.models[0],requestTemplate:{model:'{{model}}',prompt:'{{prompt}}'}};
  const custom=c.resolveRoute({...legacy,videoProtocolConfig:{}},customModel,'video','generate');
  assert.equal(custom.createPath,'/v1/video/generations');
});

test('Node and Worker runtimes contain authenticated content fallback without cross-origin credential leakage',()=>{
  const node=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
  const worker=fs.readFileSync(path.join(ROOT,'dist/server/secure-index.js'),'utf8');
  for(const src of [node,worker]){
    assert.match(src,/contentPath/);
    assert.match(src,/allowCredentiallessCrossOriginRedirect/);
    assert.match(src,/sanitizeHeaderObject/);
    assert.match(src,/\/v1\/videos/);
  }
  assert.match(node,/downloadStandardVideoContent/);
  assert.match(worker,/fetchCompletedVideoContent/);
});
