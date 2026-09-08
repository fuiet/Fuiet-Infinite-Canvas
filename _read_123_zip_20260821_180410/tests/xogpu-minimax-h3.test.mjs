import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-request-parameters.js');
await import('../video-protocol-registry.js');
await import('../provider-runtime-core.js');
await import('../provider-adapter-contract.js');
const V=globalThis.CanvasVideoProtocolRegistry,A=globalThis.CanvasProviderAdapters;
const provider={id:'xogpu',name:'XOGPU',baseUrl:'https://xogpu.com',protocol:'auto',apiKey:'sk-test',models:[]};
const model={id:'MiniMax-H3',name:'MiniMax H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};

test('text mode uses /v1/videos JSON only',()=>{const route=V.resolve(provider,model,'text-to-video'),mapped=V.mapRequest(provider,model,{prompt:'ocean',parameters:{duration:5,ratio:'16:9'}},route,[]);assert.equal(route.createPath,'/v1/videos');assert.equal(route.requestTransport,'json');assert.deepEqual(mapped.body,{model:'MiniMax-H3',prompt:'ocean',duration:5,ratio:'16:9',group:'discount_video_generation'});assert.equal('content' in mapped.body,false)});

test('all media modes use discount studio multipart and never JSON fallback',()=>{for(const op of ['image-to-video','first-last-frame','reference-to-video']){const route=V.resolve(provider,model,op);assert.equal(route.createPath,'/api/user/discount-video-studio/jobs');assert.equal(route.requestTransport,'multipart');assert.equal(route.strictCreatePath,true);assert.equal(route.noJsonFallback,true);assert.equal(route.strictMediaTransport,true)}});

test('image mode emits studio fields, not content[]',()=>{const route=V.resolve(provider,model,'image-to-video'),mapped=V.mapRequest(provider,model,{prompt:'wave',parameters:{duration:6,ratio:'adaptive'}},route,[{type:'image',url:'/__browser_media/a'}]);assert.equal(mapped.body.model,'MiniMax-H3');assert.equal(mapped.body.seconds,6);assert.equal(mapped.body.size,'1280x720');assert.deepEqual(JSON.parse(mapped.body.metadata),{mode:'image',ratio:'adaptive'});assert.equal('content' in mapped.body,false)});

test('frames and multi use documented metadata modes',()=>{let route=V.resolve(provider,model,'first-last-frame'),mapped=V.mapRequest(provider,model,{prompt:'transition',parameters:{duration:10,ratio:'adaptive'}},route,[{type:'image',role:'first_frame',url:'/a'},{type:'image',role:'last_frame',url:'/b'}]);assert.equal(JSON.parse(mapped.body.metadata).mode,'frames');route=V.resolve(provider,model,'reference-to-video');mapped=V.mapRequest(provider,model,{prompt:'keep identity',parameters:{duration:10,ratio:'adaptive'}},route,[{type:'image',url:'/i'},{type:'video',url:'/v'}]);assert.equal(JSON.parse(mapped.body.metadata).mode,'multi')});

test('connected media cannot silently stay text-to-video',()=>{const refs=[{type:'image',url:'/local.png'}];assert.equal(V.detectOperation({references:refs,parameters:{generationMode:'text2video'}}),'image-to-video')});

test('known XOGPU model exposes documented discount group and limits',()=>{const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');assert.ok(m);assert.equal(m.capabilities.billingGroup,'discount_video_generation');assert.equal(m.capabilities.maxImages,9);assert.equal(m.capabilities.maxVideos,3);assert.equal(m.capabilities.maxAudios,3)});
