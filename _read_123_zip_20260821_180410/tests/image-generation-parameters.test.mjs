import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await import('../image-request-parameters.js');
const Params=globalThis.CanvasImageRequestParameters;
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');

 test('image 1K 1:1 resolves to an exact square request',()=>{
  const p=Params.normalize({resolution:'1K',aspectRatio:'1:1',imageQuality:'标准画质',count:1});
  assert.equal(p.width,1024);assert.equal(p.height,1024);assert.equal(p.size,'1024x1024');assert.equal(p.aspect_ratio,'1:1');assert.equal(p.quality,'medium');
});

test('image resolution and aspect ratio produce deterministic dimensions',()=>{
  assert.deepEqual(Params.dimensions('1K','16:9'),{width:1024,height:576,size:'1024x576',aspectRatio:'16:9'});
  assert.deepEqual(Params.dimensions('2K','9:16'),{width:1152,height:2048,size:'1152x2048',aspectRatio:'9:16'});
  assert.deepEqual(Params.dimensions('4K','3:4'),{width:3072,height:4096,size:'3072x4096',aspectRatio:'3:4'});
});

test('image quality UI is consumed by the real task request',()=>{
  assert.match(app,/function imageQualityForNode\(n\)/);
  assert.match(app,/imageQuality:imageQualityForNode\(n\),aspectRatio:/);
  assert.match(app,/imageQuality:imageQualityForNode\(n\).*nodeRunSignature|nodeRunSignature[\s\S]*imageQuality:imageQualityForNode\(n\)/);
});

test('browser runtime sends normalized image size and quality',()=>{
  assert.match(runtime,/CanvasImageRequestParameters/);
  assert.match(runtime,/ImageParams\?\.normalize/);
  assert.match(runtime,/p\.size\?\{size:p\.size\}/);
  assert.match(runtime,/p\.quality\?\{quality:p\.quality\}/);
  assert.ok(index.indexOf('image-request-parameters.js')<index.indexOf('browser-runtime.js'));
});
