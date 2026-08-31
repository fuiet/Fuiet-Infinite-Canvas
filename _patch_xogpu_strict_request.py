from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')

# 1) XOGPU special-group MiniMax-H3 is a documented fixed model. Do not depend on the generic catalog.
adapter=ROOT/'provider-adapter-contract.js'
s=adapter.read_text(encoding='utf-8')
current="""  if(isXogpuProvider(next)){
    if(!String(next.authHeader||'').trim())next.authHeader='Authorization';
    if(!String(next.authScheme||'').trim())next.authScheme='Bearer';
    const knownById=new Map(xogpuKnownModels().map(model=>[String(model.id||'').toLowerCase(),model]));
    models=models.filter(model=>{
      const id=String(model?.id||'').toLowerCase(),known=knownById.get(id);
      if(!known)return true;
      const source=String(model?.modalitySource||'').trim().toLowerCase();
      const staleInjected=!source&&String(model?.videoProtocolFamily||'')==='xogpu-minimax-h3'&&String(model?.capabilities?.billingGroup||'')==='discount_video_generation';
      return !staleInjected;
    }).map(model=>{
      const known=knownById.get(String(model?.id||'').toLowerCase());if(!known)return model;
      return{...model,...known,id:known.id,name:model.name||known.name,enabled:model.enabled!==false,pricing:model.pricing||known.pricing,modalitySource:model.modalitySource||'user'};
    });
  }
"""
restored="""  if(isXogpuProvider(next)){
    if(!String(next.authHeader||'').trim())next.authHeader='Authorization';
    if(!String(next.authScheme||'').trim())next.authScheme='Bearer';
    for(const known of xogpuKnownModels()){
      const current=models.find(model=>String(model?.id||'').toLowerCase()===known.id.toLowerCase());
      models=models.filter(model=>String(model?.id||'').toLowerCase()!==known.id.toLowerCase());
      models.push(current?{...current,...known,id:known.id,name:current.name||known.name,enabled:current.enabled!==false,pricing:current.pricing||known.pricing}:known);
    }
  }
"""
if current in s:
    s=s.replace(current,restored,1)
elif restored not in s:
    raise SystemExit('XOGPU finalize block not found')
adapter.write_text(s,encoding='utf-8')

# 2) Browser runtime: XOGPU must bypass generic/legacy requestTemplate and be strictly whitelisted.
browser=ROOT/'browser-runtime.js'
b=browser.read_text(encoding='utf-8')
helper="""function xogpuStrictVideoBody(body={},route={}){
  const family=String(route?.protocolFamily||route?.family||'').trim().toLowerCase();
  if(family!=='xogpu-minimax-h3')return body;
  const src=body&&typeof body==='object'?body:{};
  const duration=Math.max(1,Math.min(15,Math.round(Number(src.duration)||5)));
  const allowedRatios=['16:9','9:16','1:1','4:3','3:4','21:9','adaptive'];
  const ratio=allowedRatios.includes(String(src.ratio||''))?String(src.ratio):'16:9';
  const out={model:'MiniMax-H3',prompt:String(src.prompt||''),duration,ratio,group:'discount_video_generation',n:Math.max(1,Math.round(Number(src.n)||1))};
  if(Array.isArray(src.content)&&src.content.length)out.content=src.content;
  return out;
}
"""
if 'function xogpuStrictVideoBody(' not in b:
    marker='function defaultRequestBody(provider,model,task,route,refs){'
    if marker not in b: raise SystemExit('defaultRequestBody marker not found')
    b=b.replace(marker,helper+marker,1)

ctx="const ctx={model:modelId,prompt,references:refs,parameters:p,task};\n  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);"
priority="const ctx={model:modelId,prompt,references:refs,parameters:p,task};\n  if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return xogpuStrictVideoBody(mapped.body,route);}\n  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);"
if ctx in b:
    b=b.replace(ctx,priority,1)
elif priority not in b:
    raise SystemExit('requestTemplate precedence marker not found')

old_return="if(mod==='video'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return mapped.body;"
new_return="if(mod==='video'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return xogpuStrictVideoBody(mapped.body,route);"
if old_return in b:
    b=b.replace(old_return,new_return,1)
elif new_return not in b:
    raise SystemExit('video mapped body return marker not found')

old_promise="let portableVideoJsonBodyPromise=null;const videoJsonBody=()=>portableVideoJsonBodyPromise||(portableVideoJsonBodyPromise=portableizeVideoJsonBody(body,route));"
new_promise="let portableVideoJsonBodyPromise=null;const videoJsonBody=()=>portableVideoJsonBodyPromise||(portableVideoJsonBodyPromise=portableizeVideoJsonBody(body,route).then(value=>xogpuStrictVideoBody(value,route)));"
if old_promise in b:
    b=b.replace(old_promise,new_promise,1)
elif new_promise not in b:
    raise SystemExit('videoJsonBody promise marker not found')

# Cache-bust the browser runtime/service worker so production cannot keep the bad request code.
b=b.replace('20260831-xogpu-minimax-h3-1','20260831-xogpu-strict-request-1')
browser.write_text(b,encoding='utf-8')
for path in [ROOT/'index.html',ROOT/'browser-media-sw.js']:
    if path.exists():
        text=path.read_text(encoding='utf-8').replace('20260831-xogpu-minimax-h3-1','20260831-xogpu-strict-request-1')
        path.write_text(text,encoding='utf-8')

# 3) Restore the fixed-model regression test and add strict browser request-body regression tests.
test=ROOT/'tests'/'xogpu-minimax-h3.test.mjs'
t=test.read_text(encoding='utf-8')
start=t.find("test('XOGPU provider does not invent MiniMax-H3")
end=t.find("test('XOGPU MiniMax-H3 uses exact create poll and content endpoints'")
if start!=-1 and end!=-1 and end>start:
    replacement="""test('XOGPU provider injects documented MiniMax-H3 special-group model and Bearer auth defaults',()=>{\n  const p=A.finalizeProvider(provider),m=p.models.find(x=>x.id==='MiniMax-H3');\n  assert.ok(m);assert.equal(m.modality,'video');assert.equal(m.createPath,'/v1/videos');assert.equal(m.videoProtocolFamily,'xogpu-minimax-h3');\n  assert.equal(p.authHeader,'Authorization');assert.equal(p.authScheme,'Bearer');\n  assert.equal(m.capabilities.billingGroup,'discount_video_generation');\n  assert.deepEqual(m.capabilities.durations,Array.from({length:15},(_,i)=>i+1));\n  assert.deepEqual(m.capabilities.resolutions,['768p']);assert.ok(m.capabilities.aspectRatios.includes('adaptive'));\n});\n\n"""
    t=t[:start]+replacement+t[end:]
elif "XOGPU provider injects documented MiniMax-H3 special-group model" not in t:
    raise SystemExit('catalog-truth tests not found for replacement')
test.write_text(t,encoding='utf-8')

static_test=ROOT/'tests'/'xogpu-browser-strict-request.test.mjs'
static_test.write_text("""import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nconst src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');\n\ntest('XOGPU specialized mapper wins before any generic requestTemplate',()=>{\n  const priority=src.indexOf(\"if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'\");\n  const template=src.indexOf('if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);');\n  assert.ok(priority>=0);assert.ok(template>priority);\n});\n\ntest('XOGPU outbound video JSON is strict-whitelisted immediately before POST',()=>{\n  assert.match(src,/function xogpuStrictVideoBody\\(body=\\{\\},route=\\{\\}\\)/);\n  assert.match(src,/group:'discount_video_generation'/);\n  assert.match(src,/if\\(Array\\.isArray\\(src\\.content\\)&&src\\.content\\.length\\)out\\.content=src\\.content/);\n  assert.match(src,/portableizeVideoJsonBody\\(body,route\\)\\.then\\(value=>xogpuStrictVideoBody\\(value,route\\)\\)/);\n});\n\ntest('XOGPU strict body does not copy legacy top-level image aliases',()=>{\n  const start=src.indexOf('function xogpuStrictVideoBody('),end=src.indexOf('function defaultRequestBody(',start);\n  const fn=src.slice(start,end);\n  assert.ok(fn.includes(\"const out={model:'MiniMax-H3'\"));\n  assert.equal(/out\\.(images|image|image_url|image_urls|seconds|size|aspect_ratio)\\s*=/.test(fn),false);\n});\n""",encoding='utf-8')

print('XOGPU strict request patch applied')
