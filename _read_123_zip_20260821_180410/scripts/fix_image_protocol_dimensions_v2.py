from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
runtime_path = ROOT / 'browser-runtime.js'
index_path = ROOT / 'index.html'
test_path = ROOT / 'tests' / 'image-provider-profiles.test.mjs'

runtime = runtime_path.read_text(encoding='utf-8')

start = runtime.find('function imageRichRequestBody(')
end = runtime.find('\nfunction defaultRequestBody(', start)
if start < 0 or end < 0:
    raise SystemExit('image request helper block not found')

replacement = r'''function imageProviderProfile(provider={},model={}){
  const host=providerHost(provider), hint=`${provider?.name||''} ${host} ${model?.id||''} ${model?.name||''}`.toLowerCase();
  if(officialOpenAIImageProvider(provider))return'openai';
  if(/siliconflow|silicon-flow/.test(hint))return'siliconflow';
  if(/seedream|doubao|jimeng|volcengine|volces|ark\.cn-/.test(hint))return'seedream';
  if(/flux|qwen[-_/ ]?image|stable[-_/ ]?diffusion|sdxl|kolors/.test(hint))return'diffusion';
  return'openai-compatible';
}
function imageProfileBody(profile,provider,model,task,strictBody){
  const p=ImageParams?.normalize?.(task.parameters||{})||task.parameters||{}, count=Math.max(1,Number(p.count||strictBody?.n||1));
  const common={model:model.id,prompt:String(task.prompt||'')};
  if(profile==='openai')return{...common,n:count,...(p.size?{size:p.size}:{}),...(p.quality?{quality:p.quality}:{})};
  if(profile==='siliconflow')return{...common,image_size:p.size,batch_size:count};
  if(profile==='seedream')return{...common,size:p.size,sequential_image_generation:'disabled',stream:false,response_format:'url'};
  if(profile==='diffusion')return{...common,width:Number(p.width),height:Number(p.height),aspect_ratio:p.aspectRatio,image_size:p.size,batch_size:count,...(p.quality?{quality:p.quality}:{})};
  return{...common,n:count,size:p.size,...(p.quality?{quality:p.quality}:{})};
}
function imageRequestBodies(provider,model,task,route,refs){
  const strict=defaultRequestBody(provider,model,task,route,refs);
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return[{profile:'template',body:strict}];
  if(route.adapterKey!=='openai-image')return[{profile:'generic',body:strict}];
  const profile=imageProviderProfile(provider,model), primary=imageProfileBody(profile,provider,model,task,strict);
  const list=[{profile,body:primary}];
  if(profile==='seedream')list.push({profile:'seedream-width-height',body:{model:model.id,prompt:String(task.prompt||''),width:Number((ImageParams?.normalize?.(task.parameters||{})||{}).width),height:Number((ImageParams?.normalize?.(task.parameters||{})||{}).height),response_format:'url'}});
  if(profile==='openai-compatible')list.push({profile:'width-height',body:{model:model.id,prompt:String(task.prompt||''),width:Number((ImageParams?.normalize?.(task.parameters||{})||{}).width),height:Number((ImageParams?.normalize?.(task.parameters||{})||{}).height),n:Math.max(1,Number(task.parameters?.count||1))}});
  return list;
}
function imageResponseSize(raw){
  const value=Core?.firstPath?Core.firstPath(raw,['data.0.size','images.0.size','output.0.size','output.size','result.size','size']):undefined;
  return value==null?'':String(value);
}
function imageRequestDiagnostics(profile,body,path){
  const safe={};
  for(const key of ['model','size','image_size','width','height','aspect_ratio','resolution','quality','image_quality','n','batch_size'])if(body?.[key]!==undefined)safe[key]=body[key];
  return{profile,path:String(path||''),parameters:safe,at:now()};
}
'''
runtime = runtime[:start] + replacement + runtime[end:]

old = "const candidates=imageRequestBodies(provider,model,task,route,refs);let imageError=null;\n          for(let bi=0;bi<candidates.length;bi++){\n            try{created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(candidates[bi])});imageError=null;break}\n            catch(error){imageError=error;if(bi===candidates.length-1||![400,405,415,422].includes(Number(error?.status)))throw error}\n          }"
new = "const candidates=imageRequestBodies(provider,model,task,route,refs);let imageError=null;\n          for(let bi=0;bi<candidates.length;bi++){\n            const candidate=candidates[bi];updateTask(task.id,{requestDiagnostics:imageRequestDiagnostics(candidate.profile,candidate.body,createPath)});\n            try{created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(candidate.body)});imageError=null;break}\n            catch(error){imageError=error;if(bi===candidates.length-1||![400,405,415,422].includes(Number(error?.status)))throw error}\n          }"
if old not in runtime:
    raise SystemExit('image candidate loop not found')
runtime = runtime.replace(old,new,1)

old_success = "const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,normalizeMod(task.nodeType)):undefined;\n    const value=extracted!==undefined?extracted:(normalizeMod(task.nodeType)==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url??JSON.stringify(raw));\n    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,normalizeMod(task.nodeType))});"
new_success = "const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,normalizeMod(task.nodeType)):undefined;\n    const value=extracted!==undefined?extracted:(normalizeMod(task.nodeType)==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url??JSON.stringify(raw));\n    const upstreamSize=normalizeMod(task.nodeType)==='image'?imageResponseSize(raw):'';\n    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,normalizeMod(task.nodeType)),...(upstreamSize?{upstreamSize}:{})});"
if old_success not in runtime:
    raise SystemExit('sync success block not found')
runtime = runtime.replace(old_success,new_success,1)

runtime_path.write_text(runtime,encoding='utf-8')

index = index_path.read_text(encoding='utf-8')
index = re.sub(r'image-request-parameters\.js\?v=[^"\']+', 'image-request-parameters.js?v=20260828-image-profiles-2', index)
index = re.sub(r'browser-runtime\.js\?v=[^"\']+', 'browser-runtime.js?v=20260828-image-profiles-2', index)
index = re.sub(r'browser-bootstrap\.js\?v=[^"\']+', 'browser-bootstrap.js?v=20260828-image-profiles-2', index)
index_path.write_text(index,encoding='utf-8')

test_path.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('image runtime uses provider-specific request profiles instead of mixed aliases',()=>{
  assert.match(runtime,/function imageProviderProfile/);
  assert.match(runtime,/siliconflow/);
  assert.match(runtime,/seedream/);
  assert.match(runtime,/image_size:p\.size/);
  assert.match(runtime,/size:p\.size,sequential_image_generation:'disabled'/);
  assert.match(runtime,/width:Number\(p\.width\),height:Number\(p\.height\)/);
});

test('image task records the exact upstream request profile and returned size',()=>{
  assert.match(runtime,/requestDiagnostics:imageRequestDiagnostics/);
  assert.match(runtime,/upstreamSize/);
  assert.match(runtime,/data\.0\.size/);
});

test('image protocol runtime is cache busted',()=>{
  assert.match(index,/image-request-parameters\.js\?v=20260828-image-profiles-2/);
  assert.match(index,/browser-runtime\.js\?v=20260828-image-profiles-2/);
});
''',encoding='utf-8')
