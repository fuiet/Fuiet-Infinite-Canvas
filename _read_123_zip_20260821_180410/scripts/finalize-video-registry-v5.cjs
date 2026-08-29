const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const V='20260829-video-protocol-registry-1';
for(const file of ['index.html','models.html']){let s=read(file);s=s.replace(/provider-runtime-core\.js\?v=[^\"']+/g,`provider-runtime-core.js?v=${V}`);write(file,s)}
write('tests/video-protocol-registry.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const R=globalThis.CanvasVideoProtocolRegistry;
const A=globalThis.CanvasProviderAdapters;
const C=globalThis.CanvasProviderRuntimeCore;

test('video registry detects major model families including artsdance as seedance gateway',()=>{
  assert.equal(R.detectFamily({}, {id:'kling-v2.1-master'}),'kling');
  assert.equal(R.detectFamily({}, {id:'seedance-2.0-pro'}),'seedance');
  assert.equal(R.detectFamily({}, {id:'artsdance2.0-pro-260801'}),'seedance');
  assert.equal(R.detectFamily({}, {id:'minimax-h3'}),'minimax-hailuo');
  assert.equal(R.detectFamily({}, {id:'vidu-q2'}),'vidu');
  assert.equal(R.detectFamily({}, {id:'veo-3.1'}),'veo');
  assert.equal(R.detectFamily({}, {id:'wan2.2-i2v'}),'wan');
});

test('Kling and Seedance resolve to distinct model-family profiles instead of one blind standard route',()=>{
  const p={baseUrl:'https://gateway.example.com',protocol:'openai-compatible',videoProtocol:'auto'};
  const kling=A.resolveVideoRoute(p,{id:'kling-v2.1',modality:'video',adapterKey:'auto'},{parameters:{}},[]);
  const seed=A.resolveVideoRoute(p,{id:'artsdance2.0-pro-260801',modality:'video',adapterKey:'auto'},{parameters:{}},[]);
  assert.equal(kling.protocolFamily,'kling');
  assert.equal(seed.protocolFamily,'seedance');
  assert.ok(kling.createCandidates.includes('/v1/video/generations'));
  assert.ok(seed.pollPathCandidates.includes('/v1/video/generations/{{taskId}}'));
  assert.notEqual(kling.protocolProfile,seed.protocolProfile);
});

test('model-level video protocol override wins over family and provider defaults',()=>{
  const p={baseUrl:'https://gateway.example.com',videoProtocol:'auto',videoProtocolConfig:{createPath:'/v1/videos'}};
  const m={id:'seedance-2.0',modality:'video',videoProtocolConfig:{createPath:'/custom/seedance/create',pollPath:'/custom/tasks/{{taskId}}',outputPaths:['data.final.url']}};
  const route=A.resolveVideoRoute(p,m,{parameters:{}},[]);
  assert.equal(route.createPath,'/custom/seedance/create');
  assert.equal(route.pollPath,'/custom/tasks/{{taskId}}');
  assert.ok(route.outputPaths.includes('data.final.url'));
});

test('runtime core consumes ordered plural task status and output paths',()=>{
  const cfg={taskIdPaths:['meta.task'],statusPaths:['meta.state'],outputPaths:['meta.video.url'],successValues:['ready']};
  const raw={meta:{task:'abc',state:'ready',video:{url:'https://cdn.example.com/a.mp4'}}};
  assert.equal(C.extractTaskId(raw,cfg),'abc');
  const result=C.classifyAsyncPoll(raw,cfg,'video');
  assert.equal(result.state,'success');
  assert.equal(result.output,'https://cdn.example.com/a.mp4');
});

test('DataEyes Kling chooses text or image operation route',()=>{
  const p={baseUrl:'https://platform.dataeyes.ai'};
  const m={id:'kling-v2.1',modality:'video'};
  assert.equal(A.resolveVideoRoute(p,m,{parameters:{}},[]).createPath,'/kling/v1/videos/text2video');
  assert.equal(A.resolveVideoRoute(p,m,{parameters:{}},[{type:'image',url:'x'}]).createPath,'/kling/v1/videos/image2video');
});

test('gateway model families use JSON while Sora keeps multipart-compatible transport',()=>{
  const p={baseUrl:'https://gateway.example.com'};
  const seed=A.resolveVideoRoute(p,{id:'seedance-2.0',modality:'video'},{parameters:{}},[]);
  const sora=A.resolveVideoRoute(p,{id:'sora-2',modality:'video'},{parameters:{}},[]);
  assert.equal(seed.requestTransport,'json');
  assert.equal(sora.requestTransport,'multipart-fallback-json');
  assert.ok(seed.createCandidates.length>1);
  assert.ok(seed.pollPathCandidates.length>1);
});

test('generic generate and t2v i2v aliases normalize before Kling operation routing',()=>{
  assert.equal(R.detectOperation({parameters:{operation:'t2v'}}),'text-to-video');
  assert.equal(R.detectOperation({parameters:{operation:'i2v'}}),'image-to-video');
  assert.equal(R.detectOperation({parameters:{operation:'generate'},references:[{type:'image',url:'x'}]}),'image-to-video');
  const p={baseUrl:'https://platform.dataeyes.ai'};
  const m={id:'kling-v2.1',modality:'video'};
  assert.equal(A.resolveVideoRoute(p,m,{parameters:{operation:'generate'}},[{type:'image',url:'x'}]).createPath,'/kling/v1/videos/image2video');
});
`);
write('tests/video-error-reporting.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('structured task errors never collapse to object Object',()=>{
  assert.match(app,/function errorText\\(value,depth=0\\)/);
  assert.match(app,/taskFailureText\\(info\\)/);
  assert.match(app,/taskFailureText\\(created\\.task\\)/);
  assert.match(app,/text==='\\[object Object\\]'\\?'':text/);
});

test('proxy preserves upstream HTTP status for adaptive video fallback',()=>{
  assert.match(runtime,/Do not throw on upstream HTTP errors here/);
  assert.doesNotMatch(runtime,/if\\(!res\\.ok\\)\\{let d=\\{\\}/);
  assert.match(runtime,/err\\.status=res\\.status/);
  assert.match(runtime,/runtimeErrorText\\(parsed\\.value\\)/);
});

test('task failure persistence keeps status and detail',()=>{
  assert.match(runtime,/errorStatus:Number\\(error\\.status\\)/);
  assert.match(runtime,/errorDetail:detail/);
});

test('adaptive video protocol assets pin changed registry components to fresh versions',()=>{
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js']){
    assert.ok(index.includes(\`\${file}?v=${V}\`),file);
  }
  assert.ok(index.includes('video-request-parameters.js?v=20260828-video-error-reporting-1'));
});
`);
write('tests/video-result-cache-bust.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRY_VERSION='${V}';
const APP_VERSION='20260828-video-result-reconciliation-1';
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');

test('canvas loads video registry runtime and bootstrap with a fresh cache version',()=>{
  const index=read('index.html');
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(index.includes(\`./\${file}?v=\${REGISTRY_VERSION}\`),file);
});

test('model page uses the same fresh video registry runtime cache version',()=>{
  const models=read('models.html');
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(models.includes(\`./\${file}?v=\${REGISTRY_VERSION}\`),file);
});

test('bootstrap may keep unchanged app scripts on the reconciliation version',()=>{
  const bootstrap=read('browser-bootstrap.js');
  assert.ok(bootstrap.includes(\`const v='\${APP_VERSION}'\`));
  assert.match(bootstrap,/\`\\.\\/app\\.js\\?v=\\$\\{v\\}\`/);
});
`);
console.log('video registry cache/test finalization applied');
