from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    if old not in text: raise SystemExit(f'{label}: target not found')
    return text.replace(old,new,1)

# ---- index / load order ----
index=read('index.html')
old='''  <script src="./image-request-parameters.js?v=20260828-image-profiles-3"></script>\n  <script src="./video-request-parameters.js?v=20260828-video-runtime-1"></script>\n  <script src="./browser-runtime.js?v=20260828-image-profiles-3"></script>'''
new='''  <script src="./image-request-parameters.js?v=20260828-model-capabilities-1"></script>\n  <script src="./model-image-capabilities.js?v=20260828-model-capabilities-1"></script>\n  <script src="./video-request-parameters.js?v=20260828-video-runtime-1"></script>\n  <script src="./browser-runtime.js?v=20260828-model-capabilities-1"></script>'''
index=replace_once(index,old,new,'index capability load order')
index=index.replace('./browser-bootstrap.js?v=20260828-image-profiles-3','./browser-bootstrap.js?v=20260828-model-capabilities-1')
write('index.html',index)

# ---- package syntax gate ----
pkg=read('package.json')
pkg=replace_once(pkg,'node --check image-request-parameters.js && node --check video-request-parameters.js','node --check image-request-parameters.js && node --check model-image-capabilities.js && node --check video-request-parameters.js','package check')
write('package.json',pkg)

# ---- browser bootstrap cache bust ----
boot=read('browser-bootstrap.js')
boot=re.sub(r"const v='[^']+';","const v='20260828-model-capabilities-1';",boot,count=1)
write('browser-bootstrap.js',boot)

# ---- browser runtime: shared resolver is the only image request mapper ----
runtime=read('browser-runtime.js')
runtime=replace_once(runtime,'const ImageParams=globalThis.CanvasImageRequestParameters;','const ImageParams=globalThis.CanvasImageRequestParameters;\nconst ImageCapabilities=globalThis.CanvasModelImageCapabilities;','runtime capability global')
start=runtime.find('function imageProviderProfile(')
end=runtime.find('\nfunction imageResponseSize(',start)
if start<0 or end<0: raise SystemExit('runtime old image mapper block not found')
block=r'''function imageRequestBodies(provider,model,task,route,refs){
  const strict=defaultRequestBody(provider,model,task,route,refs);
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return[{profile:'template',body:strict,capability:null,selection:null}];
  if(route.adapterKey!=='openai-image')return[{profile:'generic',body:strict,capability:null,selection:null}];
  if(ImageCapabilities?.mapRequest){
    const mapped=ImageCapabilities.mapRequest(provider,model,task.parameters||{},String(task.prompt||''),Number(task.parameters?.count||1));
    return[{profile:mapped.profile,body:mapped.body,capability:{family:mapped.capability?.family||'',source:mapped.capability?.source||'',confidence:mapped.capability?.confidence??0,requestMode:mapped.capability?.requestMode||''},selection:{aspectRatio:mapped.selection?.aspectRatio||'',resolution:mapped.selection?.resolution||'',imageQuality:mapped.selection?.imageQuality||'',size:mapped.selection?.size||''}}];
  }
  return[{profile:'openai-fallback',body:strict,capability:null,selection:null}];
}
'''
runtime=runtime[:start]+block+runtime[end:]

old="""        const candidate={id,name,modality:rawModality,adapterKey:'auto',createPath:String(raw.createPath||'')};
        const modality=Adapters?.normalizeModelModality?Adapters.normalizeModelModality(rawModality,candidate):String(rawModality||'text').toLowerCase();
        return{id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:'auto',...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};"""
new="""        const candidate={id,name,modality:rawModality,adapterKey:'auto',createPath:String(raw.createPath||'')};
        const modality=Adapters?.normalizeModelModality?Adapters.normalizeModelModality(rawModality,candidate):String(rawModality||'text').toLowerCase();
        const base={id,name,modality,modalitySource:rawModality?'provider':'inferred',enabled:true,adapterKey:'auto',...(raw.owned_by?{ownedBy:String(raw.owned_by)}:{})};
        return ImageCapabilities?.decorateDiscoveredModel?ImageCapabilities.decorateDiscoveredModel({...provider,protocol:resolvedProtocol},raw,base):base;"""
runtime=replace_once(runtime,old,new,'runtime discovery decoration')
old="const candidate=candidates[bi];updateTask(task.id,{requestDiagnostics:imageRequestDiagnostics(candidate.profile,candidate.body,createPath)});"
new="const candidate=candidates[bi];updateTask(task.id,{requestDiagnostics:{...imageRequestDiagnostics(candidate.profile,candidate.body,createPath),selection:candidate.selection||null},capabilityDiagnostics:candidate.capability||null});"
runtime=replace_once(runtime,old,new,'runtime task diagnostics')
write('browser-runtime.js',runtime)

# ---- app: model capability resolver controls node defaults, UI options, task params ----
app=read('app.js')
old="""  function setNodeModel(n,item){
    if(!n||!item)return;
    n.providerId=item.providerId;n.modelId=item.id;n.modelName=item.name||item.id;
    const c={...defaultCapabilities(n.type,item.id,item.name),...(item.capabilities||{})};
    if(n.type==='video'){n.duration=n.duration||c.durations?.[0]||5;n.resolution=n.resolution||c.resolutions?.[0]||'720p';n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'16:9';syncVideoNodeCapabilities(n,c)}
    if(n.type==='image')n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'1:1';
  }"""
new="""  function imageCapabilitiesFor(provider,model){
    try{return globalThis.CanvasModelImageCapabilities?.resolve?.(provider||{},model||{})||null}catch{return null}
  }
  function syncImageNodeCapabilities(n,cap,{reset=false}={}){
    if(!n||n.type!=='image'||!cap)return;
    const ratios=cap.aspectRatios?.length?cap.aspectRatios:['1:1'],resolutions=cap.resolutions?.length?cap.resolutions:['1K'],qualities=cap.qualityLabels?.length?cap.qualityLabels:['模型默认'];
    if(reset||!ratios.includes(String(n.aspectRatio||'')))n.aspectRatio=ratios[0];
    if(reset||!resolutions.includes(String(n.resolution||'')))n.resolution=resolutions[0];
    if(reset||!qualities.includes(String(n.imageQuality||'')))n.imageQuality=qualities[0];
    const max=Math.max(1,Number(cap.maxImages||1));n.count=Math.max(1,Math.min(max,Number(n.count||1)));
    n.imageCapabilityFamily=cap.family||'';n.imageCapabilitySource=cap.source||'';n.imageCapabilityConfidence=Number(cap.confidence||0);
  }
  function setNodeModel(n,item){
    if(!n||!item)return;
    n.providerId=item.providerId;n.modelId=item.id;n.modelName=item.name||item.id;
    const c={...defaultCapabilities(n.type,item.id,item.name),...(item.capabilities||{})};
    if(n.type==='video'){n.duration=n.duration||c.durations?.[0]||5;n.resolution=n.resolution||c.resolutions?.[0]||'720p';n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'16:9';syncVideoNodeCapabilities(n,c)}
    if(n.type==='image'){const cap=imageCapabilitiesFor(providerById(item.providerId),item);if(cap)syncImageNodeCapabilities(n,cap,{reset:true});else n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'1:1'}
  }"""
app=replace_once(app,old,new,'app setNodeModel')

old="const m=ensureDefaultModel(n),caps=modelCapabilities(n),hints=getAutoLinkHints(n.prompt||'',n.id),refs=collectReferences(n.id),contextCandidates=creativeContextCandidates(n),contextHigh=contextCandidates.filter(x=>x.score>=80).length;"
new="const m=ensureDefaultModel(n),baseCaps=modelCapabilities(n),imageCaps=n.type==='image'&&m?imageCapabilitiesFor(providerById(n.providerId),m):null,caps=imageCaps?{...baseCaps,aspectRatios:imageCaps.aspectRatios,resolutions:imageCaps.resolutions,imageQualities:imageCaps.qualityLabels,maxImages:imageCaps.maxImages}:baseCaps,hints=getAutoLinkHints(n.prompt||'',n.id),refs=collectReferences(n.id),contextCandidates=creativeContextCandidates(n),contextHigh=contextCandidates.filter(x=>x.score>=80).length;\n    if(n.type==='image'&&imageCaps)syncImageNodeCapabilities(n,imageCaps);"
app=replace_once(app,old,new,'app render generator capability')

old="""      const imageResolutions=caps.resolutions||['1K','2K','4K'];
      generator.innerHTML=`<div class=\"lib-gen-main image-generator-main\">"""
new="""      const imageResolutions=caps.resolutions||['1K'];
      const imageQualities=imageCaps?.qualityLabels||['模型默认'];
      const imageCountMax=Math.max(1,Math.min(4,Number(imageCaps?.maxImages||4)));
      generator.dataset.imageCapabilityManaged='1';generator.dataset.imageRatios=JSON.stringify(ratios);generator.dataset.imageResolutions=JSON.stringify(imageResolutions);generator.dataset.imageQualities=JSON.stringify(imageQualities);generator.dataset.imageQuality=n.imageQuality||imageQualities[0];generator.dataset.imageCapabilityFamily=imageCaps?.family||'';generator.dataset.imageCapabilitySource=imageCaps?.source||'';
      generator.innerHTML=`<div class=\"lib-gen-main image-generator-main\">"""
app=replace_once(app,old,new,'app image generator datasets')
old="${[1,2,3,4].map(x=>`<option value=\"${x}\" ${Number(n.count||1)===x?'selected':''}>${x}张</option>`).join('')}"
new="${Array.from({length:imageCountMax},(_,i)=>i+1).map(x=>`<option value=\"${x}\" ${Number(n.count||1)===x?'selected':''}>${x}张</option>`).join('')}"
app=replace_once(app,old,new,'app count capability')

old="""    return globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
  }

  window.addEventListener('canvas:image-quality-change'"""
new="""    const normalized=globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
    const provider=providerById(n.providerId),model=modelForNode(n),resolver=globalThis.CanvasModelImageCapabilities;
    if(provider&&model&&resolver?.normalizeSelection){const selected=resolver.normalizeSelection(provider,model,normalized),{imageCapabilities,...clean}=selected;return clean}
    return normalized;
  }

  window.addEventListener('canvas:image-quality-change'"""
app=replace_once(app,old,new,'app task parameter resolver')

old="const targetParams=globalThis.CanvasImageRequestParameters?.normalize?.({resolution:n.resolution||'1K',aspectRatio:targetRatio})||{};"
new="const targetProvider=providerById(n.providerId),targetModel=modelForNode(n),targetParams=targetProvider&&targetModel&&globalThis.CanvasModelImageCapabilities?.normalizeSelection?globalThis.CanvasModelImageCapabilities.normalizeSelection(targetProvider,targetModel,{resolution:n.resolution||'1K',aspectRatio:targetRatio,imageQuality:n.imageQuality||''}):(globalThis.CanvasImageRequestParameters?.normalize?.({resolution:n.resolution||'1K',aspectRatio:targetRatio})||{});"
app=replace_once(app,old,new,'app generating target size')
write('app.js',app)

# ---- image generator: quality options come from selected model ----
gen=read('image-generator-v2.js')
old="""function qualityForNode(){
  const id=activeNodeId();const map=readMap(QUALITY_KEY);return map[id]||'标准画质';
}
function setQuality(value){
  const id=activeNodeId();if(!id)return;
  const map=readMap(QUALITY_KEY);map[id]=value;writeMap(QUALITY_KEY,map);
  window.dispatchEvent(new CustomEvent('canvas:image-quality-change',{detail:{nodeId:id,value}}));
  syncSummary();
}"""
new="""function availableQualities(){
  try{const v=JSON.parse(generator.dataset.imageQualities||'[]');if(Array.isArray(v)&&v.length)return v.map(String)}catch{}
  return ['模型默认'];
}
function qualityForNode(){
  const direct=String(generator.dataset.imageQuality||'').trim();if(direct)return direct;
  const id=activeNodeId();const map=readMap(QUALITY_KEY),allowed=availableQualities(),saved=map[id];return allowed.includes(saved)?saved:allowed[0];
}
function setQuality(value){
  const id=activeNodeId();if(!id)return;
  const allowed=availableQualities();if(!allowed.includes(value))value=allowed[0];
  generator.dataset.imageQuality=value;
  const map=readMap(QUALITY_KEY);map[id]=value;writeMap(QUALITY_KEY,map);
  window.dispatchEvent(new CustomEvent('canvas:image-quality-change',{detail:{nodeId:id,value}}));
  syncSummary();
}"""
gen=replace_once(gen,old,new,'dynamic quality helpers')
gen=replace_once(gen,"${['低画质','标准画质','高画质'].map(x=>`<button type=\"button\" data-quality=\"${x}\" class=\"${qualityForNode()===x?'active':''}\">${x}</button>`).join('')}","${availableQualities().map(x=>`<button type=\"button\" data-quality=\"${esc(x)}\" class=\"${qualityForNode()===x?'active':''}\">${esc(x)}</button>`).join('')}",'dynamic quality buttons')
write('image-generator-v2.js',gen)

# ---- ratio visual layer must not re-add unsupported ratios ----
ratio=read('image-ratio-picker-v1.js')
old="""function ensureRatioOptions(){
  const select=generator.querySelector('#ratioSelect');
  if(!select)return;
  const current=String(select.value||'1:1');"""
new="""function ensureRatioOptions(){
  const select=generator.querySelector('#ratioSelect');
  if(!select)return;
  if(generator.dataset.imageCapabilityManaged==='1')return;
  const current=String(select.value||'1:1');"""
ratio=replace_once(ratio,old,new,'ratio picker capability guard')
write('image-ratio-picker-v1.js',ratio)

# ---- replace obsolete request-mapper test and add resolver integration tests ----
auth=read('tests/image-parameter-authority.test.mjs')
start=auth.find("test('third-party image gateway")
if start<0: raise SystemExit('old image gateway test not found')
end=auth.find('\n});',start)
if end<0: raise SystemExit('old image gateway test end not found')
end+=4
replacement="""test('image request runtime delegates dimensions to the shared model capability resolver',()=>{
  assert.match(runtime,/CanvasModelImageCapabilities/);
  assert.match(runtime,/ImageCapabilities\.mapRequest/);
  assert.match(runtime,/capabilityDiagnostics/);
  assert.doesNotMatch(runtime,/function imageProviderProfile/);
});"""
auth=auth[:start]+replacement+auth[end:]
write('tests/image-parameter-authority.test.mjs',auth)

test=r'''import test from 'node:test';
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

test('capability resolver loads before browser runtime and all new assets are cache busted',()=>{
  const a=index.indexOf('model-image-capabilities.js?v=20260828-model-capabilities-1'),b=index.indexOf('browser-runtime.js?v=20260828-model-capabilities-1');assert.ok(a>0&&b>a);
});
'''
write('tests/model-image-capabilities.test.mjs',test)
print('model image capability integration applied')
