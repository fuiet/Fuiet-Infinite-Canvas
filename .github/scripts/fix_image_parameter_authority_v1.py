from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    n=text.count(old)
    if n!=1: raise SystemExit(f'{label}: expected 1 occurrence, found {n}')
    return text.replace(old,new,1)

# 1) app.js: current visible image controls are authoritative. Stale image aliases
# in toolParams must never override ratio/resolution/quality/count or leave a stale size.
s=read('app.js')
anchor="""  function imageQualityForNode(n){
    if(!n||n.type!=='image')return '';
    if(String(n.imageQuality||'').trim())return String(n.imageQuality);
    try{const raw=globalThis.CanvasBrowserStorageManager?.getItem('canvas-studio-image-quality-v2')||'{}',map=JSON.parse(raw);return String(map?.[n.id]||'标准画质')}catch{return '标准画质'}
  }
"""
insert=anchor+"""
  function imageGenerationParameters(n,caps={}){
    const tool={...(n?.toolParams||{})};
    // These keys are controlled by the visible image generator. Historical Image
    // Studio/version data may contain old values; retaining them here causes the
    // provider request to stay 1:1 even after the user changes the UI.
    for(const key of ['imageQuality','quality','qualityLabel','aspectRatio','aspect_ratio','resolution','size','width','height','image_size','count','n'])delete tool[key];
    const selectedQuality=imageQualityForNode(n)||'标准画质';
    const raw={
      ...tool,
      capabilities:caps,
      creativeContext:buildCreativeContextPacket(n),
      imageQuality:selectedQuality,
      qualityLabel:selectedQuality,
      aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'1:1',
      resolution:n.resolution||caps.resolutions?.[0]||'1K',
      count:Math.max(1,Number(n.count||1))
    };
    return globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
  }

  window.addEventListener('canvas:image-quality-change',event=>{
    const id=String(event?.detail?.nodeId||''),value=String(event?.detail?.value||'').trim();
    const node=state.nodes.find(x=>String(x.id)===id);
    if(!node||node.type!=='image'||!value)return;
    node.imageQuality=value;
    saveState();
  });
"""
s=replace_once(s,anchor,insert,'image quality helper')
old="""parameters:{imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9',count:n.count||1,duration:n.duration||caps.durations?.[0]||5,resolution:n.resolution||caps.resolutions?.[0]||'720p',capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})}"""
new="""parameters:n.type==='image'?imageGenerationParameters(n,caps):{aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9',count:n.count||1,duration:n.duration||caps.durations?.[0]||5,resolution:n.resolution||caps.resolutions?.[0]||'720p',capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})}"""
s=replace_once(s,old,new,'task parameter precedence')
write('app.js',s)

# 2) image-generator-v2: write quality to the actual node state as well as the
# storage compatibility map so it follows the same source-of-truth rules.
s=read('image-generator-v2.js')
old="""function setQuality(value){
  const id=activeNodeId();if(!id)return;
  const map=readMap(QUALITY_KEY);map[id]=value;writeMap(QUALITY_KEY,map);syncSummary();
}"""
new="""function setQuality(value){
  const id=activeNodeId();if(!id)return;
  const map=readMap(QUALITY_KEY);map[id]=value;writeMap(QUALITY_KEY,map);
  window.dispatchEvent(new CustomEvent('canvas:image-quality-change',{detail:{nodeId:id,value}}));
  syncSummary();
}"""
s=replace_once(s,old,new,'quality source of truth')
write('image-generator-v2.js',s)

# 3) browser-runtime: third-party OpenAI-compatible image gateways differ in which
# exact dimension aliases they accept. Send an exact rich profile first on non-
# official gateways, then retry the strict profile only when the gateway rejects
# unknown parameters. This remains a single successful generation request.
s=read('browser-runtime.js')
anchor="""function defaultRequestBody(provider,model,task,route,refs){
"""
helper="""function providerHost(provider){try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}}
function officialOpenAIImageProvider(provider){const h=providerHost(provider);return h==='api.openai.com'||h.endsWith('.openai.com')}
function imageRichRequestBody(provider,model,task,strictBody){
  if(officialOpenAIImageProvider(provider))return strictBody;
  if(task?.nodeType!=='image')return strictBody;
  const p=ImageParams?.normalize?.(task.parameters||{})||task.parameters||{};
  return{
    ...strictBody,
    ...(p.size?{size:p.size,image_size:p.size}:{}),
    ...(p.width?{width:Number(p.width)}:{}),
    ...(p.height?{height:Number(p.height)}:{}),
    ...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{}),
    ...(p.resolution?{resolution:p.resolution}:{}),
    ...(p.quality?{quality:p.quality,image_quality:p.quality}:{}),
    n:Math.max(1,Number(p.count||strictBody?.n||1))
  };
}
function imageRequestBodies(provider,model,task,route,refs){
  const strict=defaultRequestBody(provider,model,task,route,refs);
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return[strict];
  if(route.adapterKey!=='openai-image'||officialOpenAIImageProvider(provider))return[strict];
  const rich=imageRichRequestBody(provider,model,task,strict);
  return[rich,strict];
}

"""
if helper not in s:
    s=replace_once(s,anchor,helper+anchor,'image request helper')
old="""else created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});usedCreatePath=createPath;break"""
new="""else if(normalizeMod(task.nodeType)==='image'&&route.adapterKey==='openai-image'){
          const candidates=imageRequestBodies(provider,model,task,route,refs);let imageError=null;
          for(let bi=0;bi<candidates.length;bi++){
            try{created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(candidates[bi])});imageError=null;break}
            catch(error){imageError=error;if(bi===candidates.length-1||![400,405,415,422].includes(Number(error?.status)))throw error}
          }
          if(!created&&imageError)throw imageError;
        }else created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});usedCreatePath=createPath;break"""
s=replace_once(s,old,new,'image adaptive request')
write('browser-runtime.js',s)

# 4) cache bust so the browser cannot keep the old parameter pipeline.
s=read('browser-bootstrap.js')
s=re.sub(r"const v='[^']+';","const v='20260828-image-parameter-authority-1';",s,count=1)
write('browser-bootstrap.js',s)

# 5) regression test.
test=ROOT/'tests'/'image-parameter-authority.test.mjs'
test.write_text(r'''import test from 'node:test';
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

test('third-party image gateway receives exact dimension aliases with strict fallback',()=>{
  assert.match(runtime,/function imageRichRequestBody/);
  assert.match(runtime,/image_size:p\.size/);
  assert.match(runtime,/width:Number\(p\.width\)/);
  assert.match(runtime,/height:Number\(p\.height\)/);
  assert.match(runtime,/aspect_ratio:p\.aspectRatio/);
  assert.match(runtime,/resolution:p\.resolution/);
  assert.match(runtime,/image_quality:p\.quality/);
  assert.match(runtime,/function imageRequestBodies/);
  assert.match(runtime,/\[400,405,415,422\]/);
});
''',encoding='utf-8')
