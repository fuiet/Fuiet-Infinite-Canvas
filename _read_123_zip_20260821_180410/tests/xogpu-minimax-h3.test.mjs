import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-request-parameters.js');
await import('../video-protocol-registry.js');
await import('../provider-runtime-core.js');
await import('../provider-adapter-contract.js');
const V=globalThis.CanvasVideoProtocolRegistry,A=globalThis.CanvasProviderAdapters,C=globalThis.CanvasProviderRuntimeCore,P=globalThis.CanvasVideoRequestParameters;
const provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com',protocol:'auto',apiKey:'sk-test',models:[]};

test('XOGPU provider injects documented MiniMax-H3 special-group model and Bearer auth defaults',()=>{
  const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');
  assert.ok(m);assert.equal(m.modality,'video');assert.equal(m.createPath,'/v1/videos');assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');
  assert.equal(p.authHeader,'Authorization');assert.equal(p.authScheme,'Bearer');
  assert.equal(m.capabilities.billingGroup,'discount_video_generation');
  assert.deepEqual(m.capabilities.durations,Array.from({length:15},(_,i)=>i+1));
  assert.deepEqual(m.capabilities.resolutions,['768p']);assert.ok(m.capabilities.aspectRatios.includes('adaptive'));
});

test('XOGPU MiniMax-H3 uses exact create poll and content endpoints',()=>{
  const model=A.finalizeProvider({...provider,models:[{id:'MiniMax-H3',name:'MiniMax H3',modality:'video',modalitySource:'provider'}]}).models.find(x=>x.id==='MiniMax-H3'),route=V.resolve(provider,model,'text-to-video');
  assert.equal(route.profile,'xogpu:minimax-h3');assert.equal(route.createPath,'/v1/videos');assert.equal(route.pollPath,'/v1/videos/{{taskId}}');assert.equal(route.contentPath,'/v1/videos/{{taskId}}/content');
  assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/videos/generations/{{taskId}}','/v1/video/generations/{{taskId}}','/v1/tasks/{{taskId}}']);
  assert.equal(route.strictPollPath,true);assert.equal(route.taskIdPath,'id');assert.equal(route.statusPath,'status');assert.equal(route.progressPath,'progress');assert.equal(route.referenceTransport,'url');assert.equal(route.pollIntervalMs,15000);
  assert.equal(C.extractTaskId({id:'task_123',task_id:'task_123'},route),'task_123');
});

test('XOGPU text-to-video body follows discount_video_generation docs exactly',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'},route=V.resolve(provider,model,'text-to-video');
  const mapped=V.mapRequest(provider,model,{prompt:'cinematic ocean',parameters:{duration:5,aspectRatio:'16:9',resolution:'1080p'}},route,[]);
  assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'cinematic ocean',duration:5,ratio:'16:9',group:'discount_video_generation',n:1});
});

test('XOGPU image and first-last-frame requests use documented content items and adaptive ratio',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};
  let route=V.resolve(provider,model,'image-to-video');
  let mapped=V.mapRequest(provider,model,{prompt:'move forward',parameters:{duration:6,aspectRatio:'adaptive'}},route,[{type:'image',url:'https://cdn.example.com/first.png'}]);
  assert.equal(mapped.body.ratio,'adaptive');assert.deepEqual(mapped.body.content,[{type:'text',text:'move forward'},{type:'image_url',image_url:{url:'https://cdn.example.com/first.png'},role:'first_frame'}]);
  route=V.resolve(provider,model,'first-last-frame');
  mapped=V.mapRequest(provider,model,{prompt:'day to night',parameters:{duration:10,aspectRatio:'adaptive'}},route,[{type:'image',role:'first_frame',url:'https://cdn.example.com/a.png'},{type:'image',role:'last_frame',url:'https://cdn.example.com/b.png'}]);
  assert.equal(mapped.body.content[1].role,'first_frame');assert.equal(mapped.body.content[2].role,'last_frame');
});

test('XOGPU multimodal references enforce HTTPS and documented media limits',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'},route=V.resolve(provider,model,'reference-to-video');
  const refs=[{type:'image',url:'https://cdn.example.com/a.webp'},{type:'video',url:'https://cdn.example.com/motion.mp4'},{type:'audio',url:'https://cdn.example.com/voice.wav'}];
  const mapped=V.mapRequest(provider,model,{prompt:'<Picture 1> follows <Video 1>',parameters:{duration:10,ratio:'adaptive'}},route,refs);
  assert.deepEqual(mapped.body.content.map(x=>x.type),['text','image_url','video_url','audio_url']);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'bad',parameters:{duration:5,ratio:'adaptive'}},route,[{type:'image',url:'http://example.com/a.png'}]),/HTTPS URL/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'too many',parameters:{duration:5,ratio:'adaptive'}},route,Array.from({length:10},(_,i)=>({type:'image',url:`https://cdn.example.com/${i}.png`})) ),/最多支持 9 张图片/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'text only adaptive',parameters:{duration:5,ratio:'adaptive'}},V.resolve(provider,model,'text-to-video'),[]),/adaptive 比例仅适用于/);
});

test('XOGPU image references accept Base64 data URLs while video and audio stay HTTPS-only',()=>{
  const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'},route=V.resolve(provider,model,'image-to-video'),imageData='data:image/png;base64,iVBORw0KGgo=';
  const mapped=V.mapRequest(provider,model,{prompt:'animate local image',parameters:{duration:5,ratio:'adaptive'}},route,[{type:'image',url:imageData}]);
  assert.equal(mapped.body.content[1].type,'image_url');assert.equal(mapped.body.content[1].image_url.url,imageData);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'bad video data',parameters:{duration:5,ratio:'adaptive'}},V.resolve(provider,model,'reference-to-video'),[{type:'video',url:'data:video/mp4;base64,AAAA'}]),/HTTPS URL/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'bad audio data',parameters:{duration:5,ratio:'16:9'}},V.resolve(provider,model,'reference-to-video'),[{type:'audio',url:'data:audio/wav;base64,AAAA'}]),/HTTPS URL/);
  assert.throws(()=>V.mapRequest(provider,model,{prompt:'bad browser local',parameters:{duration:5,ratio:'adaptive'}},route,[{type:'image',url:'/__browser_media/media_local'}]),/Base64 Data URL/);
});

test('shared video parameters preserve adaptive for XOGPU instead of coercing it to 16:9',()=>{
  const p=P.normalize({duration:5,aspectRatio:'adaptive',resolution:'768p'});assert.equal(p.aspectRatio,'adaptive');assert.equal(p.aspect_ratio,'adaptive');assert.equal(p.size,'');
});
