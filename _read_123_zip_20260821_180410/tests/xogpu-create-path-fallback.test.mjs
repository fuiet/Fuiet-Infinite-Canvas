import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-protocol-registry.js');
const V=globalThis.CanvasVideoProtocolRegistry;
const provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com/v1'};
const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};

test('XOGPU keeps documented create endpoint first and exposes gateway fallbacks',()=>{
  const route=V.resolve(provider,model,'image-to-video');
  assert.equal(route.createPath,'/v1/videos');
  assert.deepEqual(route.createCandidates,['/v1/videos','/v1/videos/generations','/v1/video/generations']);
  assert.deepEqual(route.pollPathCandidates.slice(0,3),['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}']);
});

test('browser retries specialized XOGPU create only when the endpoint is missing',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  assert.ok(src.includes("if(isXogpuVideoRoute(route))return[...new Set([first,...profile])]"));
  assert.ok(src.includes("const retryMissingXogpuRoute=isXogpuVideoRoute(route)&&Number(error?.status)===404"));
  assert.ok(src.includes("if(!retryMissingXogpuRoute&&(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status))))throw error"));
});

test('desktop retries XOGPU create candidates on 404 only',()=>{
  const src=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.ok(src.includes("const retryableCreateError=isXogpuVideoConfig(config)?Number(error?.status)===404:[400,404,405,415,422].includes(Number(error?.status))"));
});
