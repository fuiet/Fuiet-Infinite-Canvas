import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../image-request-parameters.js');
await import('../model-image-capabilities.js');
const R=globalThis.CanvasModelImageCapabilities;
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../image-generator-v2.js',import.meta.url),'utf8');
const ratioPicker=fs.readFileSync(new URL('../image-ratio-picker-v1.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('GPT image exposes only native sizes and supported quality levels',()=>{
  const p={baseUrl:'https://api.openai.com/v1',protocol:'openai-compatible'},m={id:'gpt-image-2',name:'GPT Image 2'};
  const c=R.resolve(p,m);assert.deepEqual(c.aspectRatios,['1:1','3:2','2:3']);assert.deepEqual(c.qualityLabels,['自动画质','低画质','标准画质','高画质']);
  const r=R.mapRequest(p,m,{aspectRatio:'3:2',resolution:'原生',imageQuality:'高画质'},'cat',1);assert.equal(r.body.size,'1536x1024');assert.equal(r.body.quality,'high');
});

test('Seedream maps resolution plus ratio into a non-square exact size',()=>{
  const p={baseUrl:'https://ark.cn-beijing.volces.com/api/v3',name:'火山方舟'},m={id:'doubao-seedream-4-0-250828',name:'Seedream 4.0'};
  const c=R.resolve(p,m);assert.ok(c.aspectRatios.includes('16:9'));assert.ok(c.resolutions.includes('2K'));
  const r=R.mapRequest(p,m,{aspectRatio:'16:9',resolution:'2K'},'scene',1);assert.equal(r.profile,'seedream-size');assert.match(r.body.size,/^\d+x\d+$/);assert.notEqual(r.body.size.split('x')[0],r.body.size.split('x')[1]);
});

test('SiliconFlow Qwen Image uses model recommended image_size',()=>{
  const p={baseUrl:'https://api.siliconflow.cn/v1',name:'SiliconFlow'},m={id:'Qwen/Qwen-Image',name:'Qwen Image'};
  const c=R.resolve(p,m);assert.deepEqual(c.aspectRatios,['1:1','16:9','9:16','4:3','3:4','3:2','2:3']);
  const r=R.mapRequest(p,m,{aspectRatio:'16:9',resolution:'原生'},'scene',1);assert.equal(r.body.image_size,'1664x928');assert.equal(r.body.size,undefined);
});

test('Gemini image model maps UI choices to aspect_ratio and image_size',()=>{
  const p={baseUrl:'https://gateway.example/v1',name:'Gateway'},m={id:'gemini-3.1-flash-image',name:'Gemini 3.1 Flash Image'};
  const r=R.mapRequest(p,m,{aspectRatio:'21:9',resolution:'4K'},'scene',1);assert.equal(r.body.aspect_ratio,'21:9');assert.equal(r.body.image_size,'4K');
});

test('explicit provider model metadata overrides registry options',()=>{
  const p={baseUrl:'https://custom.example/v1'},m={id:'custom-image',modality:'image',rawCapabilities:{supported_sizes:['800x600','600x800'],supported_qualities:['standard','hd'],image_request_mode:'openai-size'}};
  const c=R.resolve(p,m);assert.deepEqual(c.aspectRatios,['4:3','3:4']);assert.deepEqual(c.qualityLabels,['标准画质','高画质']);assert.equal(c.source,'metadata');
});

test('image node UI is driven by resolved model capabilities',()=>{
  assert.match(app,/imageCapabilitiesFor\(provider,model\)/);assert.match(app,/syncImageNodeCapabilities/);assert.match(app,/generator\.dataset\.imageQualities/);assert.match(app,/Array\.from\(\{length:imageCountMax\}/);
  assert.match(generator,/function availableQualities/);assert.match(generator,/generator\.dataset\.imageQuality/);assert.match(ratioPicker,/imageCapabilityManaged==='1'/);
});

test('browser discovery preserves model capability metadata and request mapper shares resolver',()=>{
  assert.match(runtime,/decorateDiscoveredModel/);assert.match(runtime,/ImageCapabilities\.mapRequest/);assert.match(runtime,/capabilityDiagnostics/);
});

test('capability resolver and output validator load before browser runtime with one cache contract',()=>{
  const v='20260828-image-dimension-contract-1';
  const resolverPos=index.indexOf(`model-image-capabilities.js?v=${v}`);
  const validatorPos=index.indexOf(`image-output-dimensions.js?v=${v}`);
  const runtimePos=index.indexOf(`browser-runtime.js?v=${v}`);
  assert.ok(resolverPos>0&&validatorPos>resolverPos&&runtimePos>validatorPos);
});
