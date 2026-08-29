const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const write=(name,s)=>fs.writeFileSync(path.join(root,name),s);
const VERSION='20260829-agnes-video-only-2';

write('tests/video-protocol-registry.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const R=globalThis.CanvasVideoProtocolRegistry;
const A=globalThis.CanvasProviderAdapters;
const C=globalThis.CanvasProviderRuntimeCore;
const provider={baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'openai-compatible'};
const model={id:'agnes-video-2.5-flash',modality:'video'};

test('video registry exposes Agnes only',()=>{
  assert.deepEqual(R.publicProfiles(),['agnes-video']);
  assert.equal(R.detectFamily(provider,model),'agnes-video');
  assert.equal(R.detectFamily({baseUrl:'https://gateway.example.com'},{id:'kling-v3',modality:'video'}),'unsupported-video');
});

test('provider discovery may retain non-Agnes video metadata without assigning an executable route',()=>{
  const route=A.resolveRoute({baseUrl:'https://gateway.example.com/v1',protocol:'openai-compatible'},{id:'sora-2',modality:'video'},'video','generate');
  assert.equal(route.adapterKey,'unsupported-video');
  assert.equal(route.createPath,'');
  assert.equal(route.pollPath,'');
  assert.equal(route.protocolFamily,'unsupported-video');
});

test('actual non-Agnes video execution is rejected before any network request',()=>{
  for(const id of ['kling-v3','seedance-2.0','veo-3.1','minimax-h3','vidu-q2','wan2.2','grok-video'])assert.throws(()=>A.resolveVideoRoute({baseUrl:'https://gateway.example.com'},{id,modality:'video'},{parameters:{}},[]),/固定为 Agnes API/);
});

test('Agnes video route uses exactly one documented create and poll endpoint',()=>{
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);
  assert.equal(route.createPath,'/v1/videos');
  assert.deepEqual(route.createCandidates,['/v1/videos']);
  assert.equal(route.pollPath,'https://apihub.agnes-ai.com/agnesapi?video_id={{taskId}}&model_name=agnes-video-2.5-flash');
  assert.deepEqual(route.pollPathCandidates,[route.pollPath]);
  assert.equal(route.taskIdPaths[0],'video_id');
  assert.equal(route.outputPaths[0],'metadata.url');
});

test('Agnes request stays fixed to 720P and keeps operation aliases',()=>{
  assert.equal(R.detectOperation({parameters:{operation:'t2v'}}),'text-to-video');
  assert.equal(R.detectOperation({parameters:{operation:'i2v'}}),'image-to-video');
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);
  const mapped=A.mapVideoRequest(provider,model,{prompt:'night city',parameters:{duration:4,resolution:'480p',aspectRatio:'16:9'}},route,[]);
  assert.equal(mapped.body.size,'720P');
  assert.equal(mapped.body.seconds,'4');
});

test('provider finalization disables non-Agnes video models instead of breaking provider save',()=>{
  const generic=A.finalizeProvider({baseUrl:'https://gateway.example.com/v1',protocol:'openai-compatible',models:[{id:'sora-2',modality:'video'},{id:'gpt-5',modality:'text'}]});
  const video=generic.models.find(x=>x.id==='sora-2');
  assert.ok(video);
  assert.equal(video.enabled,false);
  assert.equal(video.createPath||'','');
  assert.equal(video.adapterResolved.ready,false);
  assert.match(video.unsupportedReason,/固定为 Agnes API/);
});

test('runtime core parses Agnes terminal result from metadata.url',()=>{
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);
  const raw={status:'completed',progress:100,metadata:{url:'https://cdn.example.com/a.mp4'}};
  const result=C.classifyAsyncPoll(raw,route,'video');
  assert.equal(result.state,'success');
  assert.equal(result.output,'https://cdn.example.com/a.mp4');
});
`);

write('tests/video-generation-runtime.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-request-parameters.js');
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const V=globalThis.CanvasVideoRequestParameters,A=globalThis.CanvasProviderAdapters,C=globalThis.CanvasProviderRuntimeCore;
const provider={baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'openai-compatible'};
const model={id:'agnes-video-2.5-flash',modality:'video'};

test('video parameter utility remains available for the canvas UI',()=>{assert.equal(V.standardSize('720p','16:9'),'1280x720');assert.equal(V.standardSize('720p','9:16'),'720x1280');assert.equal(V.normalize({duration:8}).seconds,'8')});
test('actual non-Agnes video execution is rejected',()=>{for(const id of ['sora-2','kling-v3','seedance-2.0','veo-3','minimax-h3','vidu-q2','wan2.2','grok-video','custom-video'])assert.throws(()=>A.resolveVideoRoute({baseUrl:'https://gateway.example.com/v1'},{id,modality:'video'},{parameters:{}},[]),/固定为 Agnes API/)});
test('browser video runtime contains no adaptive create or poll endpoint guessing',()=>{const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');for(const old of ['VIDEO_AUTO_RETRY_STATUSES','buildStandardVideoForm','alternateVideoCreatePaths','videoPollUrlCandidates','matchingPollPath','pollVideoJson','fetchVideoContent','/v1/video/generations','/v1/videos/generations'])assert.equal(src.includes(old),false,old);assert.match(src,/function agnesVideoPollUrl\(provider,model,route,taskId\)/);assert.match(src,/const paths=\[route\.createPath\]/)});
test('browser Agnes polling uses one exact activePollUrl',()=>{const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');assert.match(src,/activePollUrl=agnesVideoPollUrl\(provider,model,route,taskId\)/);assert.match(src,/const pollUrl=modality==='video'\?activePollUrl:/);assert.doesNotMatch(src,/pollCandidates/)});
test('Agnes create response must provide video_id before polling',()=>{const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);assert.equal(C.extractTaskId({video_id:'video-1'},route),'video-1');assert.equal(C.extractTaskId({status:'queued'},route),'')});
test('Agnes completed response resolves metadata.url only after terminal success',()=>{const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);assert.equal(route.allowOutputWithoutTerminalStatus,false);assert.equal(C.classifyAsyncPoll({status:'processing',progress:10,metadata:{url:'https://cdn.test/early.mp4'}},route,'video').state,'pending');const done=C.classifyAsyncPoll({status:'completed',progress:100,metadata:{url:'https://cdn.test/final.mp4'}},route,'video');assert.equal(done.state,'success');assert.equal(done.output,'https://cdn.test/final.mp4')});
`);

write('tests/video-provider-result-parsing.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const core=globalThis.CanvasProviderRuntimeCore,adapters=globalThis.CanvasProviderAdapters;
const provider={baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'openai-compatible'};
const model={id:'agnes-video-2.5-flash',modality:'video'};

test('Agnes terminal completed response uses metadata.url as video result',()=>{const route=adapters.resolveVideoRoute(provider,model,{parameters:{}},[]);const result=core.classifyAsyncPoll({status:'completed',progress:100,metadata:{url:'https://cdn.example.test/result.mp4'}},route,'video');assert.equal(result.state,'success');assert.equal(result.providerSucceeded,true);assert.equal(result.resultPending,false);assert.equal(result.output,'https://cdn.example.test/result.mp4')});
test('Agnes provider success without result stays explicitly result-pending',()=>{const route=adapters.resolveVideoRoute(provider,model,{parameters:{}},[]);const result=core.classifyAsyncPoll({status:'completed',progress:100},route,'video');assert.equal(result.state,'success');assert.equal(result.providerSucceeded,true);assert.equal(result.resultPending,true);assert.equal(result.output,undefined)});
test('Agnes route contains no generic or legacy video endpoints',()=>{const route=adapters.resolveVideoRoute(provider,model,{parameters:{}},[]);assert.equal(route.createPath,'/v1/videos');assert.match(route.pollPath,/apihub\.agnes-ai\.com\/agnesapi\?video_id=/);assert.equal(route.outputPath,'metadata.url');const text=JSON.stringify(route);for(const old of ['dataeyes','hailuo','kling','seedance','/v1/tasks/','/v1/video/generations'])assert.equal(text.toLowerCase().includes(old),false,old)});
`);

write('tests/video-reference-transport.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-protocol-registry.js');
const R=globalThis.CanvasVideoProtocolRegistry;
const provider={baseUrl:'https://apihub.agnes-ai.com/v1'};
const model={id:'agnes-video-2.5-flash',modality:'video'};

test('Agnes keyframe accepts only public HTTP HTTPS image URLs',()=>{const route=R.resolve(provider,model,'image-to-video');const ok=R.mapRequest(provider,model,{prompt:'move',parameters:{duration:5}},route,[{type:'image',url:'https://cdn.example/a.png'}]);assert.equal(ok.body.first_frame,'https://cdn.example/a.png');for(const url of ['/__browser_media/media_x','blob:https://canvas.test/x','data:image/png;base64,AAAA','/media/a.png','http://localhost/media/a.png'])assert.throws(()=>R.mapRequest(provider,model,{prompt:'move',parameters:{}},route,[{type:'image',url}]),/公开访问的 HTTP\/HTTPS URL|Agnes 可公开访问/)});
test('Agnes reference mode permits at most five public images and no reference video',()=>{const route=R.resolve(provider,model,'reference-to-video');const refs=Array.from({length:5},(_,i)=>({type:'image',url:'https://cdn.example/'+i+'.png'}));assert.equal(R.mapRequest(provider,model,{prompt:'refs',parameters:{}},route,refs).body.images.length,5);assert.throws(()=>R.mapRequest(provider,model,{prompt:'refs',parameters:{}},route,[...refs,{type:'image',url:'https://cdn.example/6.png'}]),/最多支持 5 张/);assert.throws(()=>R.mapRequest(provider,model,{prompt:'refs',parameters:{}},route,[{type:'video',url:'https://cdn.example/v.mp4'}]),/不支持 reference 视频/)});
test('browser and desktop video paths contain no generic video endpoint guessing',()=>{const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');for(const old of ['videoPollUrlCandidates','matchingPollPath','pollVideoJson','buildStandardVideoForm','/v1/video/generations','/v1/videos/generations'])assert.equal(browser.includes(old),false,old);for(const old of ['genericPollPath','defaultPoll','downloadStandardVideoContent','standardVideoBody',"config.pollPath||'/v1/videos/{{taskId}}'"])assert.equal(server.includes(old),false,old);assert.match(server,/isAgnesVideoModel/)});
`);

write('tests/video-result-cache-bust.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const VERSION='${VERSION}';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('canvas loads strict Agnes-only video runtime with one fresh cache version',()=>{const index=read('index.html');for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(index.includes(file+'?v='+VERSION),file)});
test('models page loads the same Agnes-only runtime version',()=>{const models=read('models.html');for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(models.includes(file+'?v='+VERSION),file)});
test('bootstrap loads application scripts at Agnes-only version',()=>{const bootstrap=read('browser-bootstrap.js');assert.ok(bootstrap.includes("const v='"+VERSION+"'"));assert.ok(bootstrap.includes('./app.js?v=\${v}'))});
`);

write('tests/video-error-reporting.test.mjs',`import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('structured task errors never collapse to object Object',()=>{assert.match(app,/function errorText\(value,depth=0\)/);assert.match(app,/taskFailureText\(info\)/);assert.match(app,/text==='\[object Object\]'\?'':text/)});
test('Agnes upstream HTTP errors preserve status and readable detail',()=>{assert.match(runtime,/err\.status=res\.status/);assert.match(runtime,/runtimeErrorText\(parsed\.value\)/);assert.match(runtime,/errorStatus:Number\(error\.status\)/);assert.match(runtime,/errorDetail:detail/)});
test('Agnes-only browser assets are cache-busted together',()=>{for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js','browser-bootstrap.js'])assert.ok(index.includes(file+'?v=${VERSION}'),file)});
`);

{
  const file='tests/provider-save-auto-discovery.test.mjs';
  let s=read(file);
  s=s.replace("assert.equal(data.modelCount,2);","assert.equal(data.modelCount,3);");
  s=s.replace("    assert.equal(byId['sora-2'],undefined,'non-Agnes discovered video models are filtered');","    assert.ok(byId['sora-2']);\n    assert.equal(byId['sora-2'].enabled,false,'non-Agnes video is retained for discovery metadata but disabled');\n    assert.equal(byId['sora-2'].createPath||'','');\n    assert.equal(byId['sora-2'].adapterResolved?.ready,false);");
  s=s.replace("    assert.equal(byId['sora-2'].createPath,'/v1/videos');\n    assert.equal(byId['sora-2'].pollPath,'/v1/videos/{{taskId}}');\n    assert.equal(byId['sora-2'].contentPath,'/v1/videos/{{taskId}}/content');","    assert.ok(byId['sora-2']);\n    assert.equal(byId['sora-2'].enabled,false,'non-Agnes video is retained for discovery metadata but disabled');\n    assert.equal(byId['sora-2'].createPath||'','');\n    assert.equal(byId['sora-2'].adapterResolved?.ready,false);");
  write(file,s);
}

{
  const file='tests/agnes-fixed-adapter.test.mjs';
  let s=read(file);
  s=s.replace(/test\('Agnes browser polling uses only the documented agnesapi route and has no generic fallback',[\s\S]*?\n\}\);\n?$/m,`test('Agnes browser polling uses only the documented agnesapi route and has no generic fallback',()=>{
  const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.ok(registry.includes("function publicProfiles(){return['agnes-video']}"));
  assert.match(registry,/strictPollPath:true/);
  assert.match(browser,/function agnesVideoPollUrl\\(provider,model,route,taskId\\)/);
  for(const old of ['videoPollUrlCandidates','matchingPollPath','pollVideoJson','alternateVideoCreatePaths','VIDEO_AUTO_RETRY_STATUSES','fetchVideoContent'])assert.equal(browser.includes(old),false,old);
  assert.match(browser,/activePollUrl=agnesVideoPollUrl\\(provider,model,route,taskId\\)/);
});
`);
  write(file,s);
}

console.log('Agnes-only tests migrated:',VERSION);
