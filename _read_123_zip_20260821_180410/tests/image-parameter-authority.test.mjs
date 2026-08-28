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

test('image request runtime delegates dimensions to the shared model capability resolver',()=>{
  assert.match(runtime,/CanvasModelImageCapabilities/);
  assert.match(runtime,/ImageCapabilities\.mapRequest/);
  assert.match(runtime,/capabilityDiagnostics/);
  assert.doesNotMatch(runtime,/function imageProviderProfile/);
});
