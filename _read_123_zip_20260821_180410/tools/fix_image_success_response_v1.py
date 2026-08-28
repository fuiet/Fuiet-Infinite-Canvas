from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str):
    text = path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'missing patch anchor in {path}: {old[:120]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


core = ROOT / 'provider-runtime-core.js'
replace_once(
    core,
    "  if(modality==='image')return ['data.0.url','images.0.url','output.url','result.url','data.url','url'];",
    "  if(modality==='image')return ['data.0.url','data.0.image_url','data.0.imageUrl','images.0.url','images.0.image_url','images.0.imageUrl','output.0.url','output.url','result.images.0.url','result.image.url','result.url','data.url','url'];"
)

replace_once(
    core,
    "function extractOutput(response,config={},modality='video'){\n  if(config.outputPath){\n    const explicit=getPath(response,config.outputPath);\n    if(explicit!==undefined&&explicit!==null&&explicit!=='')return explicit;\n  }\n  return firstPath(response,outputPaths(modality));\n}",
    "function normalizeImageCandidate(value){\n  if(value===undefined||value===null||value==='')return undefined;\n  if(typeof value==='object'){\n    const nested=firstPath(value,['url','image_url','imageUrl','b64_json','base64','image_base64','image']);\n    return nested===value?undefined:normalizeImageCandidate(nested);\n  }\n  const text=String(value).trim();\n  if(!text)return undefined;\n  if(/^(https?:\\/\\/|data:image\\/|blob:|\\/\\/)/i.test(text))return text;\n  if(text.startsWith('/'))return text;\n  // Values reaching this helper from explicit base64/image fields are image bytes,\n  // not arbitrary response text. Keep them browser-renderable as a data URL.\n  if(text.length>=16)return `data:image/png;base64,${text.replace(/\\s+/g,'')}`;\n  return undefined;\n}\nfunction extractImageOutput(response,config={}){\n  if(config.outputPath){\n    const explicit=normalizeImageCandidate(getPath(response,config.outputPath));\n    if(explicit)return explicit;\n  }\n  const urlLike=firstPath(response,[\n    'data.0.url','data.0.image_url','data.0.imageUrl','images.0.url','images.0.image_url','images.0.imageUrl',\n    'output.0.url','output.url','result.images.0.url','result.image.url','result.url','data.url','url',\n    'images.0','output.0'\n  ]);\n  const normalizedUrl=normalizeImageCandidate(urlLike);\n  if(normalizedUrl)return normalizedUrl;\n  const encoded=firstPath(response,[\n    'data.0.b64_json','data.0.base64','data.0.image_base64','images.0.b64_json','images.0.base64','images.0.image_base64',\n    'output.0.b64_json','output.0.base64','result.images.0.b64_json','result.images.0.base64','result.image_base64',\n    'data.image_base64','image_base64','b64_json','base64'\n  ]);\n  const normalizedEncoded=normalizeImageCandidate(encoded);\n  if(normalizedEncoded)return normalizedEncoded;\n  const genericImage=firstPath(response,['data.0.image','images.0.image','output.image','result.image','data.image','image']);\n  return normalizeImageCandidate(genericImage);\n}\nfunction extractOutput(response,config={},modality='video'){\n  if(modality==='image'){\n    const image=extractImageOutput(response,config);\n    if(image!==undefined&&image!==null&&image!=='')return image;\n  }\n  if(config.outputPath){\n    const explicit=getPath(response,config.outputPath);\n    if(explicit!==undefined&&explicit!==null&&explicit!=='')return explicit;\n  }\n  return firstPath(response,outputPaths(modality));\n}"
)

replace_once(
    core,
    "  DEFAULT_SUCCESS,DEFAULT_FAILURE,getPath,firstPath,extractTaskId,extractStatus,extractProgress,extractOutput,\n",
    "  DEFAULT_SUCCESS,DEFAULT_FAILURE,getPath,firstPath,extractTaskId,extractStatus,extractProgress,extractImageOutput,extractOutput,\n"
)

runtime = ROOT / 'browser-runtime.js'
replace_once(
    runtime,
    "function outputObject(value,modality='text'){\n  if(value==null)return null;\n  if(typeof value==='object'&&value.type&&('value'in value))return value;\n  if(modality==='text')return{type:'text',value:String(value),text:String(value)};\n  return{type:'url',value:String(value),url:String(value),sourceUrl:String(value)};\n}",
    "function outputObject(value,modality='text'){\n  if(value==null)return null;\n  if(typeof value==='object'&&value.type&&('value'in value))return value;\n  if(modality==='text')return{type:'text',value:String(value),text:String(value)};\n  return{type:'url',value:String(value),url:String(value),sourceUrl:String(value)};\n}\nfunction validMediaOutput(value){const text=String(value||'').trim();return /^(https?:\\/\\/|data:|blob:|\\/\\/|\\/media\\/|\\/__browser_media\\/)/i.test(text)}\nasync function normalizeGeneratedOutput(value,modality,provider){\n  if(value==null)return value;\n  let text=typeof value==='string'?value.trim():value;\n  if(modality==='image'&&typeof text==='string'&&/^data:image\\//i.test(text)){\n    try{const blob=await (await rawFetch(text)).blob(),stored=await storeMediaBlob(blob,{name:'generated-image'});return stored.url}catch{}\n  }\n  if(typeof text==='string'&&text.startsWith('/')&&!text.startsWith('/__browser_media/')&&!text.startsWith('/media/')){\n    try{return joinUrl(provider?.baseUrl||location.origin,text)}catch{}\n  }\n  return text;\n}"
)

replace_once(
    runtime,
    "    const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,normalizeMod(task.nodeType)):undefined;\n    const value=extracted!==undefined?extracted:(normalizeMod(task.nodeType)==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url??JSON.stringify(raw));\n    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,normalizeMod(task.nodeType))});",
    "    const raw=created.value,modality=normalizeMod(task.nodeType),extracted=Core?.extractOutput?Core.extractOutput(raw,route,modality):undefined;\n    let value=extracted!==undefined?extracted:(modality==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url);\n    value=await normalizeGeneratedOutput(value,modality,provider);\n    if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');\n    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality)});"
)

replace_once(
    runtime,
    "      if(output==null||output==='')throw new Error('任务成功但没有找到输出结果');\n      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(output,normalizeMod(task.nodeType))});",
    "      if(output==null||output==='')throw new Error('任务成功但没有找到输出结果');\n      const modality=normalizeMod(task.nodeType);output=await normalizeGeneratedOutput(output,modality,provider);\n      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');\n      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(output,modality)});"
)

app = ROOT / 'app.js'
replace_once(
    app,
    "if(typeof output==='string')return /^(https?:\\/\\/|data:|\\/media\\/)/i.test(output.trim())?output.trim():'';",
    "if(typeof output==='string')return /^(https?:\\/\\/|data:|blob:|\\/media\\/|\\/__browser_media\\/)/i.test(output.trim())?output.trim():'';"
)

# Force all runtime layers involved in image response parsing to a fresh URL.
index = ROOT / 'index.html'
text = index.read_text(encoding='utf-8')
for old in [
    'image-request-parameters.js?v=20260828-image-parameter-authority-2',
    'browser-runtime.js?v=20260828-image-parameter-authority-2',
    'browser-bootstrap.js?v=20260828-image-parameter-authority-2',
    'provider-runtime-core.js?v=20260828-video-runtime-1',
]:
    if old not in text:
        # Accept older main entry versions too; this migration follows prior cache-bust commits.
        continue
text = text.replace('provider-runtime-core.js?v=20260828-video-runtime-1','provider-runtime-core.js?v=20260828-image-result-parsing-1')
text = text.replace('provider-runtime-core.js?v=20260828-image-parameter-authority-2','provider-runtime-core.js?v=20260828-image-result-parsing-1')
text = text.replace('image-request-parameters.js?v=20260828-image-dimensions-1','image-request-parameters.js?v=20260828-image-result-parsing-1')
text = text.replace('image-request-parameters.js?v=20260828-image-parameter-authority-2','image-request-parameters.js?v=20260828-image-result-parsing-1')
text = text.replace('browser-runtime.js?v=20260828-video-runtime-1','browser-runtime.js?v=20260828-image-result-parsing-1')
text = text.replace('browser-runtime.js?v=20260828-image-parameter-authority-2','browser-runtime.js?v=20260828-image-result-parsing-1')
text = text.replace('browser-bootstrap.js?v=20260828-video-runtime-1','browser-bootstrap.js?v=20260828-image-result-parsing-1')
text = text.replace('browser-bootstrap.js?v=20260828-image-parameter-authority-2','browser-bootstrap.js?v=20260828-image-result-parsing-1')
index.write_text(text,encoding='utf-8')

bootstrap = ROOT / 'browser-bootstrap.js'
btext = bootstrap.read_text(encoding='utf-8')
import re
btext, n = re.subn(r"const v='[^']+';", "const v='20260828-image-result-parsing-1';", btext, count=1)
if n != 1:
    raise SystemExit('bootstrap cache version anchor missing')
bootstrap.write_text(btext,encoding='utf-8')

# Add focused regression coverage.
test = ROOT / 'tests' / 'image-success-response.test.mjs'
test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSource = fs.readFileSync(new URL('../provider-runtime-core.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(coreSource, context);
const Core = context.globalThis.CanvasProviderRuntimeCore;

const route = { outputPath: 'data.0.url', successValues: ['succeeded','completed'] };

test('image result parser accepts common URL response shapes', () => {
  assert.equal(Core.extractOutput({data:[{image_url:'https://cdn.example/a.png'}]}, route, 'image'), 'https://cdn.example/a.png');
  assert.equal(Core.extractOutput({images:[{url:'https://cdn.example/b.png'}]}, route, 'image'), 'https://cdn.example/b.png');
  assert.equal(Core.extractOutput({result:{images:[{url:'https://cdn.example/c.png'}]}}, route, 'image'), 'https://cdn.example/c.png');
  assert.equal(Core.extractOutput({output:[{url:'https://cdn.example/d.png'}]}, route, 'image'), 'https://cdn.example/d.png');
});

test('image result parser converts b64_json to browser-renderable data URL', () => {
  const out = Core.extractOutput({data:[{b64_json:'YWJjZGVmZ2hpamtsbW5vcA=='}]}, route, 'image');
  assert.equal(out, 'data:image/png;base64,YWJjZGVmZ2hpamtsbW5vcA==');
});

test('async successful image response with base64 is classified as success with output', () => {
  const result = Core.classifyAsyncPoll({status:'completed',data:[{b64_json:'YWJjZGVmZ2hpamtsbW5vcA=='}]}, route, 'image');
  assert.equal(result.state, 'success');
  assert.equal(result.output, 'data:image/png;base64,YWJjZGVmZ2hpamtsbW5vcA==');
});

test('browser runtime persists inline generated images instead of treating JSON as a URL', () => {
  const src = fs.readFileSync(new URL('../browser-runtime.js', import.meta.url), 'utf8');
  assert.match(src, /normalizeGeneratedOutput/);
  assert.match(src, /generated-image/);
  assert.match(src, /上游已返回成功响应，但未识别到图片结果字段/);
  assert.doesNotMatch(src, /raw\?\.url\?\?raw\?\.data\?\.url\?\?JSON\.stringify\(raw\)/);
});

test('canvas accepts IndexedDB media URLs as generated output', () => {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /\\\/__browser_media\\\//);
});
''',encoding='utf-8')

print('image success response parsing patch applied')
