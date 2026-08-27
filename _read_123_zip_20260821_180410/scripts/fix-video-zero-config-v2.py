from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CONTRACT=ROOT/'provider-adapter-contract.js'
SERVER=ROOT/'server.js'
WORKER=ROOT/'dist/server/secure-index.js'
TEST=ROOT/'tests/video-zero-config-v2.test.mjs'


def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old,new,1)


def replace_function(text, marker, new_code):
    start=text.find(marker)
    if start<0: raise SystemExit(f'function marker not found: {marker}')
    brace=text.find('{',start)
    if brace<0: raise SystemExit(f'opening brace not found: {marker}')
    depth=0;i=brace;state='normal';quote=''
    while i<len(text):
        c=text[i];n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal';i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal';quote=''
        else:
            if c in "'\"`": state='string';quote=c
            elif c=='/' and n=='/': state='line';i+=1
            elif c=='/' and n=='*': state='block';i+=1
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:
                    return text[:start]+new_code+text[i+1:]
        i+=1
    raise SystemExit(f'unclosed function: {marker}')

# ---- Shared contract: migrate the old implicit video route, but preserve genuinely custom routes.
contract=CONTRACT.read_text(encoding='utf-8')
old_route="""function routeIsExplicit(model={}){
  const explicitAdapter=Boolean(String(model.adapterKey||'').trim()&&String(model.adapterKey||'auto').trim()!=='auto');
  const hasExplicitRoute=Boolean(String(model.createPath||model.operationRoutes?.generate?.createPath||'').trim());
  return {explicitAdapter,hasExplicitRoute,autoDefaults:!explicitAdapter&&!hasExplicitRoute};
}"""
new_route="""function looksLikeLegacyAutoVideoRoute(value={}){
  const create=String(value.createPath||'').trim(), poll=String(value.pollPath||'').trim();
  const request=value.requestTemplate&&typeof value.requestTemplate==='object'?value.requestTemplate:{};
  const pollBody=value.pollBodyTemplate&&typeof value.pollBodyTemplate==='object'?value.pollBodyTemplate:{};
  const noCustom=!String(value.taskIdPath||'').trim()&&!String(value.statusPath||'').trim()&&!String(value.progressPath||'').trim()&&!String(value.outputPath||'').trim()&&!Object.keys(request).length&&!Object.keys(pollBody).length;
  return create==='/v1/video/generations'&&poll==='/v1/video/generations/{{taskId}}'&&noCustom;
}
function migrateLegacyAutoVideoRoute(value={}){
  if(!looksLikeLegacyAutoVideoRoute(value))return value;
  return {...value,createPath:'/v1/videos',pollPath:'/v1/videos/{{taskId}}',contentPath:'/v1/videos/{{taskId}}/content'};
}
function routeIsExplicit(model={}){
  const legacyAuto=looksLikeLegacyAutoVideoRoute(model);
  const explicitAdapter=!legacyAuto&&Boolean(String(model.adapterKey||'').trim()&&String(model.adapterKey||'auto').trim()!=='auto');
  const hasExplicitRoute=!legacyAuto&&Boolean(String(model.createPath||model.operationRoutes?.generate?.createPath||'').trim());
  return {explicitAdapter,hasExplicitRoute,autoDefaults:!explicitAdapter&&!hasExplicitRoute};
}"""
contract=replace_once(contract,old_route,new_route,'legacy video route migration helper')
contract=replace_once(contract,
"const providerVideo=nodeType==='video'?compact(provider.videoProtocolConfig||{}):{};",
"const providerVideo=nodeType==='video'?migrateLegacyAutoVideoRoute(compact(provider.videoProtocolConfig||{})):{};",
'provider video route migration')
contract=replace_once(contract,
"    createPath:model.createPath,",
"    createPath:autoDefaults?undefined:model.createPath,",
'ignore implicit legacy model create path')
CONTRACT.write_text(contract,encoding='utf-8')

# ---- Node runtime.
server=SERVER.read_text(encoding='utf-8')
new_fetch_safe="""async function fetchSafe(url,options={},provider={},policy={}){
  let enforceProviderOrigin=policy.sameOrigin!==false&&Boolean(provider?.baseUrl);
  let baseOrigin='';
  if(enforceProviderOrigin){
    const base=await validateOutboundUrl(provider.baseUrl,provider);baseOrigin=new URL(base).origin;
  }
  let current=await validateOutboundUrl(url,provider);
  if(enforceProviderOrigin&&new URL(current).origin!==baseOrigin)throw new Error('上游请求必须与 API Base URL 同源');
  let requestOptions={...options};
  for(let i=0;i<4;i++){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),requestOptions.timeoutMs||60000);
    try{
      const res=await fetch(current,{...requestOptions,signal:controller.signal,redirect:'manual',timeoutMs:undefined});
      if([301,302,303,307,308].includes(res.status)&&res.headers.get('location')){
        const next=new URL(res.headers.get('location'),current).toString();const validated=await validateOutboundUrl(next,provider);
        if(enforceProviderOrigin&&new URL(validated).origin!==baseOrigin){
          if(policy.allowCredentiallessCrossOriginRedirect===true){
            requestOptions={...requestOptions,headers:sanitizeHeaderObject(requestOptions.headers||{})};
            enforceProviderOrigin=false;
          }else throw new Error('上游重定向到不同域名，已阻止以避免认证信息泄露');
        }
        current=validated;continue;
      }
      return res;
    }finally{clearTimeout(timeout)}
  }
  throw new Error('上游重定向次数过多');
}"""
server=replace_function(server,'async function fetchSafe(',new_fetch_safe)
server=replace_once(server,"createPath:String(raw.createPath ?? old.createPath ?? '/v1/video/generations').trim() || '/v1/video/generations',","createPath:String(raw.createPath ?? old.createPath ?? '/v1/videos').trim() || '/v1/videos',",'node video create default')
server=replace_once(server,"pollPath:String(raw.pollPath ?? old.pollPath ?? '/v1/video/generations/{{taskId}}').trim() || '/v1/video/generations/{{taskId}}',","pollPath:String(raw.pollPath ?? old.pollPath ?? '/v1/videos/{{taskId}}').trim() || '/v1/videos/{{taskId}}',",'node video poll default')
server=replace_once(server,"    pollBodyTemplate:(raw.pollBodyTemplate&&typeof raw.pollBodyTemplate==='object')?raw.pollBodyTemplate:((old.pollBodyTemplate&&typeof old.pollBodyTemplate==='object')?old.pollBodyTemplate:null),\n    taskIdPath:","    pollBodyTemplate:(raw.pollBodyTemplate&&typeof raw.pollBodyTemplate==='object')?raw.pollBodyTemplate:((old.pollBodyTemplate&&typeof old.pollBodyTemplate==='object')?old.pollBodyTemplate:null),\n    contentPath:String(raw.contentPath ?? old.contentPath ?? '/v1/videos/{{taskId}}/content').trim(),\n    taskIdPath:",'node video content default')
server=replace_once(server,"    pollBodyTemplate: (m.pollBodyTemplate&&typeof m.pollBodyTemplate==='object')?m.pollBodyTemplate:null,\n    statusPath:","    pollBodyTemplate: (m.pollBodyTemplate&&typeof m.pollBodyTemplate==='object')?m.pollBodyTemplate:null,\n    contentPath: String(m.contentPath || '').trim(),\n    statusPath:",'node model content path')

new_body="""function standardVideoBody(model,payload,config={}){
  const p={...(payload.parameters||{})};
  const refs=Array.isArray(payload.references)?payload.references:[];
  const images=refs.filter(x=>String(x?.type||'').toLowerCase()==='image').map(x=>String(x?.url||x?.value||'')).filter(Boolean);
  const videos=refs.filter(x=>String(x?.type||'').toLowerCase()==='video').map(x=>String(x?.url||x?.value||'')).filter(Boolean);
  const audios=refs.filter(x=>String(x?.type||'').toLowerCase()==='audio').map(x=>String(x?.url||x?.value||'')).filter(Boolean);
  const createPath=String(config.createPath||'');
  const openAIVideos=/\\/v1\\/videos(?:$|\\?)/i.test(createPath)&&!/generations/i.test(createPath);
  const body={model:model.id,prompt:payload.prompt||''};
  const duration=Number(p.duration||p.seconds);
  const ratio=String(p.ratio||p.aspectRatio||'16:9').trim();
  if(openAIVideos){
    if(Number.isFinite(duration)&&duration>0)body.seconds=String(duration);
    const explicitSize=String(p.size||'').trim();
    body.size=explicitSize||((ratio==='9:16')?'720x1280':(ratio==='1:1'?'1024x1024':'1280x720'));
    if(images[0])body.input_reference={image_url:images[0]};
  }else{
    if(Number.isFinite(duration)&&duration>0)body.duration=duration;
    if(ratio)body.ratio=ratio;
    if(p.resolution!=null&&String(p.resolution).trim())body.resolution=p.resolution;
    if(images.length)body.images=images;
    if(videos.length)body.videos=videos;
    if(audios.length)body.audios=audios;
  }
  const internal=new Set(['aspectRatio','ratio','duration','seconds','resolution','size','count','capabilities','creativeContext','contextPacket','operation','sourceVersionId','sourceVideoUrl','sourceDuration','preserveOutsideRange']);
  for(const [k,v] of Object.entries(p)){
    if(internal.has(k)||v===undefined)continue;
    if(k==='supplierParams'||k==='providerParams'){
      if(v&&typeof v==='object'&&!Array.isArray(v))Object.assign(body,v);
      continue;
    }
    if(!/^[_$]/.test(k))body[k]=v;
  }
  return body;
}"""
server=replace_function(server,'function standardVideoBody(',new_body)

content_helper="""async function downloadStandardVideoContent(task,provider,config,taskId){
  const template=String(config.contentPath||'').trim();
  if(!template)return null;
  const contentPath=template.replace(/\\{\\{taskId\\}\\}/g,encodeURIComponent(String(taskId)));
  const contentUrl=joinUrl(provider.baseUrl,contentPath);
  const res=await fetchSafe(contentUrl,{method:'GET',headers:providerHeaders(provider),timeoutMs:120000},provider,{allowCredentiallessCrossOriginRedirect:true});
  if(!res.ok)throw new Error(`视频内容下载失败 HTTP ${res.status}：${(await res.text()).slice(0,300)}`);
  const mime=String(res.headers.get('content-type')||'video/mp4').split(';')[0].trim().toLowerCase();
  if(mime.includes('json')){
    const parsed=await res.json();const output=standardVideoOutput(parsed,config);
    if(output!=null)return normalizeOutput(output,'video',provider);
    throw new Error('视频内容接口返回 JSON，但未识别到视频 URL');
  }
  const declared=Number(res.headers.get('content-length')||0);const limit=Math.max(MAX_UPLOAD_BYTES,250*1024*1024);
  if(declared>limit)throw new Error('生成视频文件过大，超过服务端持久化限制');
  const bytes=Buffer.from(await res.arrayBuffer());if(bytes.length>limit)throw new Error('生成视频文件过大，超过服务端持久化限制');
  const file=outFile(safeExt('',mime)||'.mp4');fs.writeFileSync(file,bytes);
  return {type:'url',value:mediaUrl(file),mime,sourceUrl:contentUrl,persisted:true};
}\n"""
server=replace_once(server,'async function executeStandardVideoAsync(task,provider,model,payload){',content_helper+'async function executeStandardVideoAsync(task,provider,model,payload){','insert node video content downloader')
server=replace_once(server,
"  const config=normalizeVideoProtocolConfig(provider.videoProtocolConfig,provider.videoProtocolConfig);\n  const createPath=String(config.createPath||'/v1/video/generations');",
"  const sharedRoute=ProviderAdapterContract.resolveRoute(provider,model,'video','generate');\n  const config=normalizeVideoProtocolConfig(sharedRoute,sharedRoute);\n  const createPath=String(config.createPath||'/v1/videos');",
'node shared video route')
server=replace_once(server,"standardVideoBody(model,payload);","standardVideoBody(model,payload,config);",'node path-aware video body')
server=replace_once(server,"config.pollPath||'/v1/video/generations/{{taskId}}'","config.pollPath||'/v1/videos/{{taskId}}'",'node poll fallback')
old_success="""    if(success.includes(status)||(config.allowOutputWithoutTerminalStatus===true&&!status&&output!=null)){
      if(output==null)throw new Error(`视频任务状态为 ${status||'成功'}，但没有解析到视频结果 URL。请配置 outputPath。`);
      return normalizeOutput(output,'video',provider);
    }"""
new_success="""    if(success.includes(status)||(config.allowOutputWithoutTerminalStatus===true&&!status&&output!=null)){
      if(output!=null)return normalizeOutput(output,'video',provider);
      const content=await downloadStandardVideoContent(task,provider,config,taskId);
      if(content)return content;
      throw new Error(`视频任务状态为 ${status||'成功'}，但没有解析到视频结果 URL，且未配置可用的 contentPath。`);
    }"""
server=replace_once(server,old_success,new_success,'node video content fallback')
SERVER.write_text(server,encoding='utf-8')

# ---- Cloudflare Worker runtime.
worker=WORKER.read_text(encoding='utf-8')
worker=replace_once(worker,
"if (nodeType === 'video') return { createPath: '/v1/video/generations', method: 'POST', responseMode: 'async', taskIdPath: '', pollPath: '/v1/video/generations/{{taskId}}', statusPath: '', progressPath: '', outputPath: '', successValues: TERMINAL_SUCCESS, failureValues: TERMINAL_FAILURE, pollIntervalMs: 1500, timeoutMs: 1200000 };",
"if (nodeType === 'video') return { createPath: '/v1/videos', method: 'POST', responseMode: 'async', taskIdPath: '', pollPath: '/v1/videos/{{taskId}}', contentPath: '/v1/videos/{{taskId}}/content', statusPath: '', progressPath: '', outputPath: '', successValues: TERMINAL_SUCCESS, failureValues: TERMINAL_FAILURE, pollIntervalMs: 1500, timeoutMs: 1200000 };",
'worker video default route')

new_worker_safe="""async function safeProviderFetch(provider, urlText, options = {}, env = {}, policy = {}) {
  const base = validateOutboundUrl(provider?.baseUrl, provider, env);
  let current = validateOutboundUrl(urlText, provider, env);
  let enforceProviderOrigin = true;
  if (current.origin !== base.origin) throw new Error('上游请求必须与 API Base URL 同源');
  let requestOptions={...options};
  for (let i = 0; i < 4; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), clamp(requestOptions.timeoutMs, 1000, 180000, 30000));
    try {
      const res = await fetch(current.toString(), { ...requestOptions, timeoutMs: undefined, signal: controller.signal, redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.get('location')) {
        const next = validateOutboundUrl(new URL(res.headers.get('location'), current).toString(), provider, env);
        if (enforceProviderOrigin && next.origin !== base.origin) {
          if (policy.allowCredentiallessCrossOriginRedirect === true) {
            requestOptions={...requestOptions,headers:sanitizeHeaderObject(Object.fromEntries(new Headers(requestOptions.headers||{}).entries()))};
            enforceProviderOrigin=false;
          } else throw new Error('上游重定向到不同域名，已阻止以避免认证信息泄露');
        }
        current = next;
        continue;
      }
      return res;
    } finally { clearTimeout(timeout); }
  }
  throw new Error('上游重定向次数过多');
}"""
worker=replace_function(worker,'async function safeProviderFetch(',new_worker_safe)

new_default_body="""function defaultBody(task, model, references, route={}) {
  const payload = task.payload || {}, parameters = payload.parameters || {}, prompt = String(payload.prompt || '');
  if (task.nodeType === 'text' || task.nodeType === 'script') return { model: model.id, messages: parameters.messages || [{ role: 'user', content: prompt }] };
  if (task.nodeType === 'image') {
    const body = { model: model.id, prompt };
    if (parameters.size) body.size = parameters.size;
    if (references.length) body.images = references.filter(x => x.type === 'image').map(x => x.url);
    return body;
  }
  if (task.nodeType === 'audio') return { model: model.id, input: prompt, voice: parameters.voice || 'alloy', response_format: parameters.responseFormat || 'mp3' };
  const images = references.filter(x => x.type === 'image').map(x => x.url), videos = references.filter(x => x.type === 'video').map(x => x.url), audios = references.filter(x => x.type === 'audio').map(x => x.url);
  const createPath=String(route.createPath||'');
  const openAIVideos=/\\/v1\\/videos(?:$|\\?)/i.test(createPath)&&!/generations/i.test(createPath);
  let body;
  if(openAIVideos){
    const duration=Number(parameters.duration||parameters.seconds||5);
    body={model:model.id,prompt,seconds:String(duration),size:String(parameters.size||ratioToSize(parameters.ratio||parameters.aspectRatio||'16:9'))};
    if(images[0])body.input_reference={image_url:images[0]};
  }else{
    body={model:model.id,prompt,duration:Number(parameters.duration||parameters.seconds||5),ratio:parameters.ratio||parameters.aspectRatio||'16:9'};
    if(parameters.resolution)body.resolution=parameters.resolution;
    if(images.length)body.images=images;if(videos.length)body.videos=videos;if(audios.length)body.audios=audios;
  }
  for (const [key, value] of Object.entries(parameters)) if (!['messages', 'duration', 'seconds', 'ratio', 'aspectRatio', 'resolution', 'size'].includes(key) && !key.startsWith('_')) body[key] = value;
  return body;
}"""
worker=replace_function(worker,'function defaultBody(',new_default_body)
worker=replace_once(worker,'defaultBody(task, model, references);','defaultBody(task, model, references, route);','worker path-aware video body')

worker_helper="""async function fetchCompletedVideoContent(task, provider, model, route, taskId, env) {
  const template=String(route.contentPath||'').trim();if(!template)return null;
  const contentPath=template.replace(/\\{\\{taskId\\}\\}/g,encodeURIComponent(String(taskId)));
  const contentUrl=resolveProviderUrl(provider,contentPath,env);
  const res=await safeProviderFetch(provider,contentUrl,{method:'GET',headers:buildHeaders(provider,model),timeoutMs:120000},env,{allowCredentiallessCrossOriginRedirect:true});
  if(!res.ok)throw new Error(`视频内容下载失败 ${res.status}：${(await res.text()).slice(0,300)}`);
  const mime=String(res.headers.get('content-type')||'video/mp4').split(';')[0].trim();
  if(mime.includes('json')){
    const parsed=await res.json();const output=extractOutput(parsed,task.nodeType,route);
    return output&&output.type==='url'?persistMediaOutput(task,output,provider,env):null;
  }
  const objectPath=`video_${task.id}_${crypto.randomUUID().slice(0,8)}${extensionForMime(mime)}`;
  const localUrl=await storageUpload(env,objectPath,res.body,mime);
  await recordMediaAsset(task,objectPath,mime,contentUrl,env);
  return {type:'url',value:localUrl,sourceUrl:contentUrl,persisted:true};
}\n"""
worker=replace_once(worker,'async function submitTask(task, request, env, ctx) {',worker_helper+'async function submitTask(task, request, env, ctx) {','insert worker video content downloader')
old_worker_success="""  if (success.has(status)) {
    let output = extractOutput(parsed, task.nodeType, route);
    if (!output || output.type !== 'url') throw new Error(`上游任务状态为 ${status}，但没有识别到最终媒体 URL`);
    output = await persistMediaOutput(task, output, provider, env);
    task.output = output; task.status = 'succeeded'; task.progress = 100; task.error = null; task.updatedAt = nowIso(); await persistTask(task, env);
    return { done: true };
  }"""
new_worker_success="""  if (success.has(status)) {
    let output = extractOutput(parsed, task.nodeType, route);
    if ((!output || output.type !== 'url') && task.nodeType === 'video') output = await fetchCompletedVideoContent(task, provider, model, route, upstream.taskId, env);
    if (!output || output.type !== 'url') throw new Error(`上游任务状态为 ${status}，但没有识别到最终媒体 URL，也无法从 contentPath 获取媒体内容`);
    output = await persistMediaOutput(task, output, provider, env);
    task.output = output; task.status = 'succeeded'; task.progress = 100; task.error = null; task.updatedAt = nowIso(); await persistTask(task, env);
    return { done: true };
  }"""
worker=replace_once(worker,old_worker_success,new_worker_success,'worker video content fallback')
WORKER.write_text(worker,encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');

test('zero-config video uses current OpenAI-compatible async contract',async()=>{
  delete globalThis.CanvasProviderAdapters;
  await import(pathToFileURL(path.join(ROOT,'provider-adapter-contract.js')).href+`?v=${Date.now()}`);
  const c=globalThis.CanvasProviderAdapters;
  const provider={id:'p1',baseUrl:'https://api.example.com/v1',protocol:'openai-compatible',models:[{id:'sora-2',name:'Sora 2',modality:'video'}]};
  const finalized=c.finalizeProvider(provider);
  const model=finalized.models[0];
  assert.equal(model.createPath,'/v1/videos');
  assert.equal(model.pollPath,'/v1/videos/{{taskId}}');
  assert.equal(model.contentPath,'/v1/videos/{{taskId}}/content');
  const route=c.resolveRoute(finalized,model,'video','generate');
  assert.equal(route.createPath,'/v1/videos');
  assert.equal(route.contentPath,'/v1/videos/{{taskId}}/content');
});

test('legacy implicit video defaults self-heal while custom legacy routes stay intact',async()=>{
  const c=globalThis.CanvasProviderAdapters;
  const legacy={id:'p',baseUrl:'https://api.example.com/v1',videoProtocolConfig:{createPath:'/v1/video/generations',pollPath:'/v1/video/generations/{{taskId}}'},models:[{id:'video-x',modality:'video',adapterKey:'standard-video-async-v1',createPath:'/v1/video/generations',pollPath:'/v1/video/generations/{{taskId}}'}]};
  const healed=c.resolveRoute(legacy,legacy.models[0],'video','generate');
  assert.equal(healed.createPath,'/v1/videos');
  assert.equal(healed.pollPath,'/v1/videos/{{taskId}}');
  const customModel={...legacy.models[0],requestTemplate:{model:'{{model}}',prompt:'{{prompt}}'}};
  const custom=c.resolveRoute({...legacy,videoProtocolConfig:{}},customModel,'video','generate');
  assert.equal(custom.createPath,'/v1/video/generations');
});

test('Node and Worker runtimes contain authenticated content fallback without cross-origin credential leakage',()=>{
  const node=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');
  const worker=fs.readFileSync(path.join(ROOT,'dist/server/secure-index.js'),'utf8');
  for(const src of [node,worker]){
    assert.match(src,/contentPath/);
    assert.match(src,/allowCredentiallessCrossOriginRedirect/);
    assert.match(src,/sanitizeHeaderObject/);
    assert.match(src,/\/v1\/videos/);
  }
  assert.match(node,/downloadStandardVideoContent/);
  assert.match(worker,/fetchCompletedVideoContent/);
});
''',encoding='utf-8')
print('Applied current video zero-config runtime patch to shared contract, Node, and Worker.')
