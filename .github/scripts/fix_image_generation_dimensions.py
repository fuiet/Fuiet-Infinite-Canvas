from pathlib import Path
import re

ROOT = Path('_read_123_zip_20260821_180410')


def read(name):
    return (ROOT / name).read_text(encoding='utf-8')


def write(name, text):
    (ROOT / name).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old, new, 1)


# Shared image request parameter normalizer. This is provider-agnostic and testable.
image_params = r'''/* Fuiet Infinite Canvas · image generation request parameters */
(()=>{
'use strict';
function cleanRatio(value){
  const raw=String(value||'1:1').trim().replace('/',':');
  const m=raw.match(/^(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)$/);
  if(!m)return '1:1';
  const w=Number(m[1]),h=Number(m[2]);
  return w>0&&h>0?`${m[1]}:${m[2]}`:'1:1';
}
function resolutionEdge(value){
  const raw=String(value||'1K').trim().toUpperCase();
  if(raw==='1K')return 1024;
  if(raw==='2K')return 2048;
  if(raw==='4K')return 4096;
  const px=raw.match(/^(\d{3,5})(?:PX)?$/);
  if(px)return Math.max(64,Number(px[1]));
  return 1024;
}
function round8(value){return Math.max(8,Math.round(Number(value||0)/8)*8)}
function parseSize(value){
  const m=String(value||'').trim().match(/^(\d{2,5})\s*[x×]\s*(\d{2,5})$/i);
  return m?{width:Number(m[1]),height:Number(m[2])}:null;
}
function dimensions(resolution='1K',aspectRatio='1:1',explicitSize=''){
  const fixed=parseSize(explicitSize);
  if(fixed)return{...fixed,size:`${fixed.width}x${fixed.height}`,aspectRatio:cleanRatio(aspectRatio)};
  const ratio=cleanRatio(aspectRatio),[rw,rh]=ratio.split(':').map(Number),edge=resolutionEdge(resolution);
  let width,height;
  if(rw>=rh){width=edge;height=round8(edge*rh/rw)}else{height=edge;width=round8(edge*rw/rh)}
  return{width,height,size:`${width}x${height}`,aspectRatio:ratio};
}
function normalizeQuality(value){
  const raw=String(value||'标准画质').trim().toLowerCase();
  if(['低画质','low','draft'].includes(raw))return'low';
  if(['高画质','high','hd','ultra'].includes(raw))return'high';
  if(['标准画质','standard','medium','normal','auto'].includes(raw))return'medium';
  return raw||'medium';
}
function normalize(parameters={}){
  const p={...(parameters||{})};
  const aspectRatio=cleanRatio(p.aspectRatio||p.aspect_ratio||'1:1');
  const resolution=String(p.resolution||'1K');
  const dim=dimensions(resolution,aspectRatio,p.size||'');
  const imageQuality=p.imageQuality||p.qualityLabel||p.quality||'标准画质';
  return{
    ...p,
    imageQuality,
    quality:normalizeQuality(imageQuality),
    resolution,
    aspectRatio,
    aspect_ratio:aspectRatio,
    width:dim.width,
    height:dim.height,
    size:dim.size
  };
}
const api=Object.freeze({cleanRatio,resolutionEdge,dimensions,normalizeQuality,normalize});
globalThis.CanvasImageRequestParameters=api;
})();
'''
write('image-request-parameters.js', image_params)

# browser-runtime: normalize image task parameters once, before request templates/adapters.
s = read('browser-runtime.js')
s = replace_once(
    s,
    "const Core=globalThis.CanvasProviderRuntimeCore;",
    "const Core=globalThis.CanvasProviderRuntimeCore;\nconst ImageParams=globalThis.CanvasImageRequestParameters;",
    'browser runtime image params dependency'
)
s = replace_once(
    s,
    "const mod=normalizeMod(task.nodeType||model.modality),p=task.parameters||{},prompt=String(task.prompt||''),modelId=model.id;",
    "const mod=normalizeMod(task.nodeType||model.modality),rawParams=task.parameters||{},p=mod==='image'?(ImageParams?.normalize?.(rawParams)||rawParams):rawParams,prompt=String(task.prompt||''),modelId=model.id;",
    'browser runtime normalize image parameters'
)
s = replace_once(
    s,
    "if(route.adapterKey==='openai-image')return{model:modelId,prompt,n:Number(p.count||1),...(p.size?{size:p.size}:{}),...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{})};",
    "if(route.adapterKey==='openai-image')return{model:modelId,prompt,n:Number(p.count||1),...(p.size?{size:p.size}:{}),...(p.quality?{quality:p.quality}:{}),...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{})};",
    'openai image size quality payload'
)
write('browser-runtime.js', s)

# app: quality becomes a real node request parameter rather than UI-only state.
s = read('app.js')
anchor = "  function semanticWarningHtml(n){"
helper = """  function imageQualityForNode(n){\n    if(!n||n.type!=='image')return '';\n    if(String(n.imageQuality||'').trim())return String(n.imageQuality);\n    try{const raw=globalThis.CanvasBrowserStorageManager?.getItem('canvas-studio-image-quality-v2')||'{}',map=JSON.parse(raw);return String(map?.[n.id]||'标准画质')}catch{return '标准画质'}\n  }\n\n"""
if helper.strip() not in s:
    if anchor not in s:
        raise SystemExit('app quality helper insertion point missing')
    s = s.replace(anchor, helper + anchor, 1)

old_params = "parameters:{aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9',count:n.count||1,duration:n.duration||caps.durations?.[0]||5,resolution:n.resolution||caps.resolutions?.[0]||'720p',capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})}"
new_params = "parameters:{imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9',count:n.count||1,duration:n.duration||caps.durations?.[0]||5,resolution:n.resolution||caps.resolutions?.[0]||'720p',capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})}"
s = replace_once(s, old_params, new_params, 'task image quality parameter')

old_sig = "return JSON.stringify({providerId:n.providerId,modelId:n.modelId,prompt:n.prompt,aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,toolParams:n.toolParams,refs,creativeContext:ctx});"
new_sig = "return JSON.stringify({providerId:n.providerId,modelId:n.modelId,prompt:n.prompt,imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,toolParams:n.toolParams,refs,creativeContext:ctx});"
s = replace_once(s, old_sig, new_sig, 'image quality run signature')

old_version = "parameters:{aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,videoMode:n.videoMode,...(n.toolParams||{})}"
new_version = "parameters:{imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,videoMode:n.videoMode,...(n.toolParams||{})}"
# result version + history each use this shape; update all occurrences deliberately.
count = s.count(old_version)
if count < 2:
    raise SystemExit(f'image result metadata expected >=2 occurrences, found {count}')
s = s.replace(old_version, new_version)
write('app.js', s)

# Cache/version and script ordering.
s = read('browser-bootstrap.js')
s = re.sub(r"const v='[^']+';", "const v='20260828-image-dimensions-1';", s, count=1)
write('browser-bootstrap.js', s)

for name in ['index.html','models.html']:
    s = read(name)
    if 'image-request-parameters.js' not in s:
        marker = '<script src="./provider-runtime-core.js?v=20260828-browser-runtime-1"></script>'
        if marker not in s:
            raise SystemExit(f'{name}: provider runtime marker missing')
        s = s.replace(marker, marker + '\n  <script src="./image-request-parameters.js?v=20260828-image-dimensions-1"></script>', 1)
    s = re.sub(r'browser-runtime\.js\?v=[^"\']+', 'browser-runtime.js?v=20260828-image-dimensions-1', s, count=1)
    s = re.sub(r'browser-bootstrap\.js\?v=[^"\']+', 'browser-bootstrap.js?v=20260828-image-dimensions-1', s, count=1)
    write(name, s)

# Ensure syntax check covers the new shared module.
s = read('package.json')
if 'node --check image-request-parameters.js' not in s:
    s = s.replace('node --check browser-runtime.js &&', 'node --check browser-runtime.js && node --check image-request-parameters.js &&', 1)
write('package.json', s)

# Regression tests: dimensions, quality and request plumbing.
test = r'''import test from 'node:test';
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
'''
write('tests/image-generation-parameters.test.mjs', test)

print('patched image generation dimensions, quality and regression coverage')
