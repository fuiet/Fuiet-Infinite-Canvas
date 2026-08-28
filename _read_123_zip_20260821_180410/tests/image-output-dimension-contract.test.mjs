import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const dims=require('../image-output-dimensions.js');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('dimension helper parses exact target sizes and detects equality',()=>{
  assert.deepEqual(dims.parseSize('1024x576'),{width:1024,height:576,size:'1024x576'});
  assert.equal(dims.sameSize(1024,576,'1024x576'),true);
  assert.equal(dims.sameSize(1122,1402,'1024x1024'),false);
});

test('dimension helper center-crops mismatched aspect ratios before resize',()=>{
  const crop=dims.cropRect(1122,1402,1024,1024);
  assert.equal(Math.round(crop.sWidth),1122);
  assert.equal(Math.round(crop.sHeight),1122);
  assert.equal(Math.round(crop.sy),140);
  assert.equal(Math.round(crop.sx),0);
});

test('image UI parameters are resolved by the model capability resolver before generic normalization',()=>{
  assert.match(app,/resolver\.normalizeSelection\(provider,model,raw\)/);
  assert.doesNotMatch(app,/resolver\.normalizeSelection\(provider,model,normalized\)/);
});

test('browser runtime validates real generated pixels and corrects mismatches',()=>{
  assert.match(runtime,/const ImageOutputDimensions=globalThis\.CanvasImageOutputDimensions/);
  assert.match(runtime,/async function enforceGeneratedImageDimensions/);
  assert.match(runtime,/createImageBitmap/);
  assert.match(runtime,/ImageOutputDimensions\?\.cropRect/);
  assert.match(runtime,/generated-image-\$\{targetSize\}/);
  assert.match(runtime,/imageDimensionCorrected/);
  assert.match(runtime,/finalImageSize/);
});

test('dimension helper loads before browser runtime',()=>{
  const helper=index.indexOf('image-output-dimensions.js?v=20260828-image-dimension-contract-1');
  const runtimePos=index.indexOf('browser-runtime.js?v=20260828-image-dimension-contract-1');
  assert.ok(helper>=0&&runtimePos>helper);
});
