import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../image-request-parameters.js');
await import('../model-image-capabilities.js');
await import('../video-protocol-registry.js');
await import('../provider-runtime-core.js');
await import('../provider-adapter-contract.js');
const A=globalThis.CanvasProviderAdapters,I=globalThis.CanvasModelImageCapabilities,V=globalThis.CanvasVideoProtocolRegistry,C=globalThis.CanvasProviderRuntimeCore;
const provider={id:'agnes',name:'Agnes',baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'auto',models:[]};

test('Agnes provider no longer auto-injects a video model after XOGPU migration',()=>{
  const p=A.finalizeProvider(provider);const ids=p.models.map(m=>m.id);
  assert.equal(p.protocol,'openai-compatible');
  assert.deepEqual(['agnes-2.5-flash','agnes-image-2.1-flash'].every(id=>ids.includes(id)),true);
  assert.equal(ids.includes('agnes-video-2.5-flash'),false);
  assert.equal(p.models.find(m=>m.id==='agnes-2.5-flash').createPath,'/v1/chat/completions');
  assert.equal(p.models.find(m=>m.id==='agnes-image-2.1-flash').createPath,'/v1/images/generations');
});

test('Agnes Image 2.1 Flash uses size ratio extra_body and Data URI references',()=>{
  const model={id:'agnes-image-2.1-flash',modality:'image'};
  const mapped=I.mapRequest(provider,model,{resolution:'2K',aspectRatio:'16:9'},'cinematic cat',1,[{type:'image',url:'data:image/png;base64,AAAA'}]);
  assert.equal(mapped.profile,'agnes-image');assert.equal(mapped.body.size,'2K');assert.equal(mapped.body.ratio,'16:9');
  assert.deepEqual(mapped.body.extra_body.image,['data:image/png;base64,AAAA']);assert.equal(mapped.body.extra_body.response_format,'url');
  assert.equal('response_format' in mapped.body,false);
});

test('Agnes Video 2.5 Flash uses video_id query and metadata.url result',()=>{
  const model={id:'agnes-video-2.5-flash',modality:'video'};const route=V.resolve(provider,model,'text-to-video');
  assert.equal(route.createPath,'/v1/videos');assert.equal(route.taskIdPaths[0],'video_id');assert.equal(route.outputPaths[0],'metadata.url');
  assert.match(route.pollPath,/\/agnesapi\?video_id=\{\{taskId\}\}&model_name=agnes-video-2.5-flash/);assert.equal(route.referenceTransport,'url');
});

test('Agnes Video 2.5 Flash prefers video_id and recognizes live completed response shapes',()=>{
  const model={id:'agnes-video-2.5-flash',modality:'video'};const route=V.resolve(provider,model,'text-to-video');
  assert.equal(C.extractTaskId({id:'task_old',task_id:'task_old',video_id:'video_live'},route),'video_live');
  const done=C.classifyAsyncPoll({status:'completed',progress:100,metadata:{url:'https://cdn.example.com/final.mp4'}},route,'video');
  assert.equal(done.state,'success');assert.equal(done.output,'https://cdn.example.com/final.mp4');
  const legacy=C.classifyAsyncPoll({status:'completed',progress:100,remixed_from_video_id:'https://cdn.example.com/legacy.mp4'},route,'video');
  assert.equal(legacy.state,'success');assert.equal(legacy.output,'https://cdn.example.com/legacy.mp4');
});

test('Agnes Video 2.5 Flash text request is exact and fixed to 720P',()=>{
  const model={id:'agnes-video-2.5-flash',modality:'video'};const route=V.resolve(provider,model,'text-to-video');
  const mapped=V.mapRequest(provider,model,{prompt:'night city',parameters:{duration:5,resolution:'1080p',aspectRatio:'9:16'}},route,[]);
  assert.deepEqual(mapped.body,{model:'agnes-video-2.5-flash',prompt:'night city',seconds:'5',mode:'text',size:'720P',aspect_ratio:'9:16',n:1});
});

test('Agnes Video 2.5 Flash keyframe requires public URL and rejects browser-local or Base64 media',()=>{
  const model={id:'agnes-video-2.5-flash',modality:'video'};const route=V.resolve(provider,model,'image-to-video');
  const ok=V.mapRequest(provider,model,{prompt:'move',parameters:{duration:5}},route,[{type:'image',role:'first_frame',url:'https://cdn.example.com/a.png'}]);
  assert.equal(ok.body.mode,'keyframe');assert.equal(ok.body.first_frame,'https://cdn.example.com/a.png');
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'move',parameters:{}},route,[{type:'image',url:'data:image/png;base64,AAAA'}]),/公开访问的 HTTP\/HTTPS URL/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'move',parameters:{}},route,Array.from({length:6},(_,i)=>({type:'image',url:`https://cdn.example.com/${i}.png`})) ),/最多支持 5 张参考图片/);
});

test('browser and desktop runtimes wire Agnes image reference mapping without weakening video URL rules',()=>{
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8'),server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(browser,/ImageCapabilities\.mapRequest\(provider,model,task\.parameters\|\|\{\},String\(task\.prompt\|\|''\),Number\(task\.parameters\?\.count\|\|1\),refs\)/);
  assert.match(browser,/Agnes 文本模型的图像理解仅支持公开可访问的 image_url/);
  assert.match(server,/ImageCapabilities\.mapRequest\(provider,model,payload\.parameters\|\|\{\},payload\.prompt\|\|'',Number\(payload\.parameters\?\.count\|\|1\),refs\)/);
});


test('Agnes strict polling is identity-aware and never labels task_id as video_id',()=>{
  const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(registry,/strictPollPath:true/);
  assert.match(browser,/function providerVideoIdentity\(raw=\{\}\)/);
  assert.match(browser,/agnesLegacyTaskPollUrl\(provider,providerTaskId\)/);
  assert.match(browser,/resumeIdentity=isAgnesVideoRoute\(route\)/);
  assert.match(browser,/activePollUrl=upgraded\[0\]/);
  assert.match(app,/video_id:\$\{d\.providerVideoId\}/);
  assert.match(app,/task_id:\$\{d\.providerTaskId\}/);
});
