import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const generator=fs.readFileSync(new URL('../image-generator-v2.js',import.meta.url),'utf8');

test('image controls override stale toolParams dimension aliases',()=>{
  assert.match(app,/function imageGenerationParameters\(n,caps=\{\}\)/);
  for(const key of ['size','width','height','image_size','aspectRatio','aspect_ratio','resolution','imageQuality','quality']){
    assert.ok(app.includes(`'${key}'`),`expected stale key ${key} to be stripped`);
  }
  assert.match(app,/parameters:n\.type==='image'\?imageGenerationParameters\(n,caps\)/);
});

test('quality selection is promoted to node state',()=>{
  assert.match(generator,/canvas:image-quality-change/);
  assert.match(app,/node\.imageQuality=value/);
});

test('third-party image gateway uses provider-specific dimension dialects instead of mixed aliases',()=>{
  assert.match(runtime,/function imageProviderProfile/);
  assert.match(runtime,/profile==='siliconflow'/);
  assert.match(runtime,/image_size:p\.size/);
  assert.match(runtime,/profile==='seedream'/);
  assert.match(runtime,/size:p\.size,sequential_image_generation:'disabled'/);
  assert.match(runtime,/profile==='diffusion'/);
  assert.match(runtime,/width:Number\(p\.width\),height:Number\(p\.height\)/);
  assert.match(runtime,/requestDiagnostics:imageRequestDiagnostics/);
  assert.match(runtime,/\[400,405,415,422\]/);
});
