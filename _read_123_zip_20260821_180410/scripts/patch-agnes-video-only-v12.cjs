const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const write=(name,s)=>fs.writeFileSync(path.join(root,name),s);
const VERSION='20260829-agnes-video-only-1';

// Provider contract: video is Agnes-only; non-Agnes video models are removed/unsupported.
{
  const file='provider-adapter-contract.js';
  let s=read(file);
  const marker="function isAgnesProvider(provider={}){\n  const h=providerHost(provider);return h==='apihub.agnes-ai.com'||h.endsWith('.agnes-ai.com');\n}\n";
  if(!s.includes(marker))throw new Error('isAgnesProvider marker missing');
  s=s.replace(marker,marker+"function isAgnesVideoModel(provider={},model={}){return isAgnesProvider(provider)&&String(model?.id||'').trim().toLowerCase()==='agnes-video-2.5-flash'}\n");
  const modMarker="  const mod=normalizeModelModality(model.modality,model);\n";
  if(!s.includes(modMarker))throw new Error('inferAdapterKey modality marker missing');
  s=s.replace(modMarker,modMarker+"  if(mod==='video'&&!isAgnesVideoModel(provider,model))return 'unsupported-video';\n");
  const videoDefault="  if(key==='standard-video-async-v1')return{createPath:'/v1/videos',method:'POST',responseMode:'async',taskIdPath:'',pollPath:'/v1/videos/{{taskId}}',pollMethod:'GET',contentPath:'/v1/videos/{{taskId}}/content',statusPath:'',progressPath:'',outputPath:'',successValues:SUCCESS,failureValues:FAILURE,allowOutputWithoutTerminalStatus:true,pollIntervalMs:1500,timeoutMs:1200000};\n";
  if(!s.includes(videoDefault))throw new Error('standard video defaults missing');
  s=s.replace(videoDefault,"  if(key==='standard-video-async-v1')return{createPath:'',method:'POST',responseMode:'async',pollMethod:'GET',successValues:SUCCESS,failureValues:FAILURE,pollIntervalMs:1500,timeoutMs:3600000};\n  if(key==='unsupported-video')return{createPath:'',method:'POST',responseMode:'async'};\n");
  s=s.replace(/function knownVideoResultProfile\(provider=\{\},model=\{\},operation='generate'\)\{[\s\S]*?\n\}\nfunction looksLikeLegacyAutoVideoRoute/,`function knownVideoResultProfile(provider={},model={},operation='generate'){
  if(!isAgnesVideoModel(provider,model))throw new Error('视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash；通用视频接口和其他供应商视频协议已停用');
  if(!VideoProtocols?.resolve)throw new Error('Agnes 视频协议未加载');
  const profile=VideoProtocols.resolve(provider,model,operation)||{};
  return{...profile,protocolFamily:'agnes-video',protocolProfile:profile.protocolProfile||profile.profile||'agnes:agnes-video-2.5-flash'};
}
function looksLikeLegacyAutoVideoRoute`);
  s=s.replace(/function looksLikeLegacyAutoVideoRoute\(value=\{\}\)\{[\s\S]*?\n\}\nfunction routeIsExplicit\(model=\{\}\)\{[\s\S]*?\n\}/,`function routeIsExplicit(model={}){
  const nested=model.videoProtocolConfig&&typeof model.videoProtocolConfig==='object'?model.videoProtocolConfig:{};
  const nestedExplicit=Object.keys(nested).some(k=>nested[k]!==undefined&&nested[k]!==null&&nested[k]!=='');
  const explicitAdapter=Boolean(String(model.adapterKey||'').trim()&&String(model.adapterKey||'auto').trim()!=='auto');
  const hasExplicitRoute=Boolean(String(model.createPath||model.operationRoutes?.generate?.createPath||'').trim());
  return {explicitAdapter,hasExplicitRoute,nestedExplicit,autoDefaults:!explicitAdapter&&!hasExplicitRoute&&!nestedExplicit};
}`);
  const resolveMarker="function resolveRoute(provider={},model={},nodeType='',operation='generate'){\n";
  if(!s.includes(resolveMarker))throw new Error('resolveRoute marker missing');
  s=s.replace(resolveMarker,resolveMarker+`  if(nodeType==='video'){
    if(!isAgnesVideoModel(provider,model))throw new Error('视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash；通用视频接口和其他供应商视频协议已停用');
    const route={...knownVideoResultProfile(provider,model,operation),adapterKey:'standard-video-async-v1'};
    route.method='POST';route.pollMethod='GET';route.successValues=SUCCESS;route.failureValues=FAILURE;
    route.pollIntervalMs=clamp(route.pollIntervalMs,500,30000,1500);route.timeoutMs=clamp(route.timeoutMs,5000,3600000,3600000);
    return route;
  }
`);
  const providerFinalize=`  if(isAgnesProvider(next)){
    if(!next.protocol||next.protocol==='auto')next.protocol='openai-compatible';
    const byId=new Map(models.map(model=>[String(model?.id||''),model]));
    for(const known of agnesKnownModels()){const current=byId.get(known.id);byId.set(known.id,current?{...known,...current,id:known.id}:known)}
    models=[...byId.values()];
  }
`;
  if(!s.includes(providerFinalize))throw new Error('finalizeProvider Agnes block missing');
  s=s.replace(providerFinalize,`  if(isAgnesProvider(next)){
    if(!next.protocol||next.protocol==='auto')next.protocol='openai-compatible';
    const byId=new Map(models.map(model=>[String(model?.id||''),model]));
    for(const known of agnesKnownModels()){const current=byId.get(known.id);byId.set(known.id,current?{...known,...current,id:known.id}:known)}
    models=[...byId.values()].filter(model=>normalizeModelModality(model?.modality,model)!=='video'||String(model?.id||'').toLowerCase()==='agnes-video-2.5-flash');
  }else{
    models=models.filter(model=>normalizeModelModality(model?.modality,model)!=='video');
  }
`);
  s=s.replace('normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,agnesKnownModels','normalizeReferenceTransport,normalizeModelModality,providerLooksOpenAIStyle,isAgnesProvider,isAgnesVideoModel,agnesKnownModels');
  write(file,s);
}

// Browser runtime: Agnes JSON create + documented poll only. No endpoint guessing or multipart fallback.
{
  const file='browser-runtime.js';
  let s=read(file);
  s=s.replace(/async function buildStandardVideoForm\(model,task,refs\)\{[^\n]*\}\n/, '');
  s=s.replace(/function autoVideoRoute\(model,route\)\{[^\n]*\}\nconst VIDEO_AUTO_RETRY_STATUSES=new Set\([^\n]*\);\nfunction alternateVideoCreatePaths\(route,model\)\{[\s\S]*?\n\}\nfunction matchingPollPath\(createPath,taskId,route\)\{[^\n]*\}/,`function alternateVideoCreatePaths(route){return[String(route.createPath||'/v1/videos')]}
function matchingPollPath(createPath,taskId,route){return fillTemplate(route.pollPath||'',{taskId})}`);
  s=s.replace(/function videoPollUrlCandidates\(provider,createdRaw,createPath,taskId,route\)\{[\s\S]*?\n\}\nasync function pollVideoJson/,`function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){
  const out=[],add=value=>{const url=videoRouteCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};
  if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
  for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
  return out;
}
async function pollVideoJson`);
  s=s.replace(/\n  const genericContent=route\.protocolFamily==='generic-video'\|\|route\.protocolFamily==='sora-openai';\n  if\(genericContent&&activePollUrl\)add\(activePollUrl\.replace\(\/\\\/\$\/,'\'\'\)\+'\/content'\);\n  if\(genericContent\)for\(const path of \[`\/v1\/videos\/\$\{taskId\}\/content`,`\/v1\/video\/generations\/\$\{taskId\}\/content`,`\/v1\/videos\/generations\/\$\{taskId\}\/content`\]\)add\(joinUrl\(provider\.baseUrl,path\)\);/, '');
  // Safer literal fallback if regex above does not match due formatting.
  s=s.replace("  const genericContent=route.protocolFamily==='generic-video'||route.protocolFamily==='sora-openai';\n  if(genericContent&&activePollUrl)add(activePollUrl.replace(/\\/$/,'')+'/content');\n  if(genericContent)for(const path of [`/v1/videos/${taskId}/content`,`/v1/video/generations/${taskId}/content`,`/v1/videos/generations/${taskId}/content`])add(joinUrl(provider.baseUrl,path));\n",'');
  s=s.replace(/if\(mod==='video'\)\{const mapped=Adapters\?\.mapVideoRequest\?\.\(provider,model,\{\.\.\.task,parameters:p\},route,refs\);if\(mapped\?\.body\)return mapped\.body;[\s\S]*?\}\n\s*\n\s*return\{model:modelId,prompt,\.\.\.p,\.\.\.\(refs\.length\?\{references:refs\}:\{\}\)\};/,`if(mod==='video'){const mapped=Adapters?.mapVideoRequest?.(provider,model,{...task,parameters:p},route,refs);if(mapped?.body)return mapped.body;throw new Error('Agnes 视频请求映射失败');}

  return{model:modelId,prompt,...p,...(refs.length?{references:refs}:{})};`);
  s=s.replace(/if\(route\.adapterKey==='standard-video-async-v1'\)\{[\s\S]*?\n\s*\}else if\(modality==='image'&&route\.adapterKey==='openai-image'\)\{/,`if(route.adapterKey==='standard-video-async-v1'){
            updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json',route)});
            created=await providerJson(provider,createUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(await videoJsonBody())});
          }else if(modality==='image'&&route.adapterKey==='openai-image'){`);
  s=s.replace("      }catch(error){\n        lastCreateError=error;\n        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;\n      }","      }catch(error){\n        lastCreateError=error;\n        throw error;\n      }");
  const modalityMarker="  const modality=normalizeMod(task.nodeType);\n";
  if(!s.includes(modalityMarker))throw new Error('browser modality marker missing');
  s=s.replace(modalityMarker,modalityMarker+"  if(modality==='video'&&(!Adapters?.isAgnesProvider?.(provider)||String(model.id||'').toLowerCase()!=='agnes-video-2.5-flash'))throw new Error('视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash');\n");
  write(file,s);
}

// Desktop runtime: enforce the same Agnes-only boundary before any upstream video request.
{
  const file='server.js';
  let s=read(file);
  const marker="async function executeStandardVideoAsync(task,provider,model,payload){\n  if(task.nodeType!=='video')throw new Error('标准异步视频协议只能用于视频模型');\n";
  if(!s.includes(marker))throw new Error('server video executor marker missing');
  s=s.replace(marker,marker+"  if(!ProviderAdapterContract.isAgnesProvider?.(provider)||String(model?.id||'').toLowerCase()!=='agnes-video-2.5-flash')throw new Error('视频生成已固定为 Agnes API，目前仅支持 agnes-video-2.5-flash');\n");
  write(file,s);
}

// Replace obsolete generic protocol tests with Agnes-only contract tests.
{
  const file='tests/video-protocol-registry.test.mjs';
  write(file,`import test from 'node:test';
import assert from 'node:assert/strict';
await import('../video-protocol-registry.js');
await import('../provider-adapter-contract.js');
await import('../provider-runtime-core.js');
const R=globalThis.CanvasVideoProtocolRegistry;
const A=globalThis.CanvasProviderAdapters;
const C=globalThis.CanvasProviderRuntimeCore;
const provider={baseUrl:'https://apihub.agnes-ai.com/v1',protocol:'openai-compatible'};
const model={id:'agnes-video-2.5-flash',modality:'video'};

test('video registry exposes Agnes only',()=>{
  assert.deepEqual(R.publicProfiles(),['agnes-video']);
  assert.equal(R.detectFamily(provider,model),'agnes-video');
  assert.equal(R.detectFamily({baseUrl:'https://gateway.example.com'},{id:'kling-v3',modality:'video'}),'unsupported-video');
});

test('non-Agnes video protocols are rejected instead of guessed',()=>{
  for(const id of ['kling-v3','seedance-2.0','veo-3.1','minimax-h3','vidu-q2','wan2.2','grok-video'])assert.throws(()=>A.resolveVideoRoute({baseUrl:'https://gateway.example.com'},{id,modality:'video'},{parameters:{}},[]),/固定为 Agnes API/);
});

test('Agnes video route uses only documented create and poll endpoints',()=>{
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);
  assert.equal(route.createPath,'/v1/videos');assert.deepEqual(route.createCandidates,['/v1/videos']);
  assert.equal(route.pollPath,'https://apihub.agnes-ai.com/agnesapi?video_id={{taskId}}&model_name=agnes-video-2.5-flash');
  assert.deepEqual(route.pollPathCandidates,[route.pollPath]);assert.equal(route.taskIdPaths[0],'video_id');assert.equal(route.outputPaths[0],'metadata.url');
});

test('Agnes request stays 720P and keeps operation aliases',()=>{
  assert.equal(R.detectOperation({parameters:{operation:'t2v'}}),'text-to-video');assert.equal(R.detectOperation({parameters:{operation:'i2v'}}),'image-to-video');
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);const mapped=A.mapVideoRequest(provider,model,{prompt:'night city',parameters:{duration:4,resolution:'480p',aspectRatio:'16:9'}},route,[]);
  assert.equal(mapped.body.size,'720P');assert.equal(mapped.body.seconds,'4');
});

test('provider finalization removes non-Agnes video models',()=>{
  const generic=A.finalizeProvider({baseUrl:'https://gateway.example.com/v1',models:[{id:'kling-v3',modality:'video'},{id:'gpt-5',modality:'text'}]});assert.deepEqual(generic.models.map(x=>x.id),['gpt-5']);
  const agnes=A.finalizeProvider({baseUrl:'https://apihub.agnes-ai.com/v1',models:[{id:'kling-v3',modality:'video'}]});assert.equal(agnes.models.some(x=>x.id==='kling-v3'),false);assert.equal(agnes.models.some(x=>x.id==='agnes-video-2.5-flash'),true);
});

test('runtime core still parses Agnes terminal result',()=>{
  const route=A.resolveVideoRoute(provider,model,{parameters:{}},[]);const raw={status:'completed',progress:100,metadata:{url:'https://cdn.example.com/a.mp4'}};
  assert.equal(C.classifyAsyncPoll(raw,route,'video').state,'success');assert.equal(C.classifyAsyncPoll(raw,route,'video').output,'https://cdn.example.com/a.mp4');
});
`);
}

// Update Agnes regression: explicit-only polling is now stronger than the old strict/fallback shape.
{
  const file='tests/agnes-fixed-adapter.test.mjs';let s=read(file);
  s=s.replace(/test\('Agnes browser polling uses only the documented agnesapi route and heals persisted generic poll urls',[\s\S]*?\n\}\);\n?$/,`test('Agnes browser polling uses only the documented agnesapi route and has no generic fallback',()=>{
  const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(registry,/publicProfiles\(\)\{return\['agnes-video'\]\}/);
  assert.match(registry,/strictPollPath:true/);
  assert.match(browser,/function videoPollUrlCandidates\(provider,createdRaw,createPath,taskId,route\)/);
  assert.doesNotMatch(browser,/const responseUrl=Core\?\.firstPath/);
  assert.doesNotMatch(browser,/genericContent/);
  assert.match(browser,/if\(route\?\.strictPollPath===true\)\{pollCandidates=videoPollUrlCandidates\(provider,null,usedCreatePath,taskId,route\);activePollUrl=''\}/);
});
`);
  write(file,s);
}

// Browser cache bust for changed runtime/contract assets.
for(const file of ['index.html','models.html','browser-bootstrap.js','tests/video-result-cache-bust.test.mjs','tests/video-error-reporting.test.mjs']){
  let s=read(file);
  s=s.replaceAll('20260829-agnes-poll-exact-1',VERSION).replaceAll('20260829-workflow-visual-fix-1',VERSION).replaceAll('20260829-agnes-fixed-adapter-1',VERSION);
  write(file,s);
}
console.log('Agnes-only video patch applied');
