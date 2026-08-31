from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD_CACHE='20260831-xogpu-strict-request-1'
NEW_CACHE='20260831-xogpu-poll-fallback-1'

# 1) Registry: keep documented OpenAI video poll first, then fall back to New API generic task read.
registry=ROOT/'video-protocol-registry.js'
s=registry.read_text(encoding='utf-8')
old="pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}'],strictPollPath:true"
new="pollPath:'/v1/videos/{{taskId}}',pollPathCandidates:['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}'],strictPollPath:true"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('XOGPU poll candidates marker not found')
registry.write_text(s,encoding='utf-8')

# 2) Browser runtime: 501 from XOGPU OpenAI-video status is a protocol capability miss, not task failure.
browser=ROOT/'browser-runtime.js'
b=browser.read_text(encoding='utf-8')
old_poll="function freshVideoPollUrl(url,route){const profile=String(route?.protocolProfile||route?.profile||''),family=String(route?.protocolFamily||route?.family||'');if(family!=='agnes-video'&&!profile.startsWith('agnes:'))return String(url);try{const u=new URL(String(url));u.searchParams.set('_canvas_poll',String(Date.now()));return u.toString()}catch{return String(url)}}\nasync function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){last=error;if(![404,405].includes(Number(error?.status)))throw error}}throw last||new Error('没有可用的视频任务轮询接口')}"
new_poll="function freshVideoPollUrl(url,route){const profile=String(route?.protocolProfile||route?.profile||''),family=String(route?.protocolFamily||route?.family||'');if(family!=='agnes-video'&&!profile.startsWith('agnes:'))return String(url);try{const u=new URL(String(url));u.searchParams.set('_canvas_poll',String(Date.now()));return u.toString()}catch{return String(url)}}\nfunction isXogpuVideoRoute(route={}){const family=String(route?.protocolFamily||route?.family||'').toLowerCase(),profile=String(route?.protocolProfile||route?.profile||'').toLowerCase();return family==='xogpu-minimax-h3'||profile==='xogpu:minimax-h3'}\nfunction shouldFallbackVideoPollError(error,route={}){const status=Number(error?.status);return[404,405].includes(status)||(isXogpuVideoRoute(route)&&status===501)}\nasync function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){last=error;if(shouldFallbackVideoPollError(error,route))continue;throw error}}throw last||new Error('没有可用的视频任务轮询接口')}"
if old_poll in b:
    b=b.replace(old_poll,new_poll,1)
elif new_poll not in b:
    raise SystemExit('browser pollVideoJson marker not found')

# Recover already-paid XOGPU tasks that were incorrectly failed solely because /v1/videos/{id} returned 501.
ready_marker="runtime.ready=initializePersistence();\nruntime.ready.then(()=>{"
recovery_helper="""function recoverableXogpuNotImplementedTask(task){
  if(!task||task.status!=='failed'||!String(task.upstreamTaskId||'').trim())return false;
  const message=[task.error,task.lastError,task.errorDetail].map(x=>String(x||'')).join(' ');
  if(Number(task.errorStatus)!==501&&!/not_implemented:\\d+/i.test(message))return false;
  const provider=findProvider(task.providerId)||task.providerSnapshot||{};
  let host='';try{host=new URL(String(provider.baseUrl||'')).hostname.toLowerCase()}catch{}
  const modelId=String(task.modelId||task.modelSnapshot?.id||'').toLowerCase();
  return(host==='xogpu.com'||host.endsWith('.xogpu.com'))&&/minimax[-_. ]?h3|\\bh3\\b/.test(modelId);
}
"""
if 'function recoverableXogpuNotImplementedTask(' not in b:
    if ready_marker not in b: raise SystemExit('runtime.ready marker not found')
    b=b.replace(ready_marker,recovery_helper+ready_marker,1)

old_loop="""  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}
"""
new_loop="""  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(recoverableXogpuNotImplementedTask(t)){t.status='queued';t.providerStatus=t.providerStatus==='succeeded'?'succeeded':'processing';t.resultStatus=t.providerStatus==='succeeded'?'pending':(t.resultStatus||'pending');t.error=null;t.lastError=null;t.errorStatus=null;t.errorDetail=null;t.updatedAt=now();changed=true;continue}
    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}
"""
if old_loop in b:
    b=b.replace(old_loop,new_loop,1)
elif new_loop not in b:
    raise SystemExit('browser startup recovery loop marker not found')

b=b.replace(OLD_CACHE,NEW_CACHE)
browser.write_text(b,encoding='utf-8')

# 3) Desktop parity: same 501 fallback behavior.
server=ROOT/'server.js'
sv=server.read_text(encoding='utf-8')
old_helper="function isAgnesVideoConfig(config={}){const family=String(config.protocolFamily||config.family||''),profile=String(config.protocolProfile||config.profile||'');return family==='agnes-video'||profile.startsWith('agnes:')}"
new_helper=old_helper+"\nfunction isXogpuVideoConfig(config={}){const family=String(config.protocolFamily||config.family||'').toLowerCase(),profile=String(config.protocolProfile||config.profile||'').toLowerCase();return family==='xogpu-minimax-h3'||profile==='xogpu:minimax-h3'}"
if old_helper in sv and 'function isXogpuVideoConfig(' not in sv:
    sv=sv.replace(old_helper,new_helper,1)
elif 'function isXogpuVideoConfig(' not in sv:
    raise SystemExit('server video config helper marker not found')
old_catch="if([404,405].includes(Number(error?.status)))continue;if(ProviderRuntimeCore.isRetryableProviderFailure?.(error)){retryablePollError=error;break}throw error"
new_catch="if([404,405].includes(Number(error?.status))||(isXogpuVideoConfig(config)&&Number(error?.status)===501))continue;if(ProviderRuntimeCore.isRetryableProviderFailure?.(error)){retryablePollError=error;break}throw error"
if old_catch in sv:
    sv=sv.replace(old_catch,new_catch,1)
elif new_catch not in sv:
    raise SystemExit('server poll catch marker not found')
server.write_text(sv,encoding='utf-8')

# 4) Cache-bust all browser references and stale test assertions.
for path in ROOT.rglob('*'):
    if not path.is_file() or path in {browser,server,registry}: continue
    if path.suffix.lower() not in {'.js','.mjs','.html','.css'}: continue
    text=path.read_text(encoding='utf-8')
    if OLD_CACHE in text:
        path.write_text(text.replace(OLD_CACHE,NEW_CACHE),encoding='utf-8')

# 5) Regression tests.
test=ROOT/'tests'/'xogpu-poll-fallback.test.mjs'
test.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
await import('../video-protocol-registry.js');
const V=globalThis.CanvasVideoProtocolRegistry;
const provider={baseUrl:'https://xogpu.com'};
const model={id:'MiniMax-H3',name:'MiniMax-H3',modality:'video',videoProtocolFamily:'xogpu-minimax-h3'};

test('XOGPU poll profile falls back from OpenAI video status to generic New API task status',()=>{
  const route=V.resolve(provider,model,'text-to-video');
  assert.equal(route.pollPath,'/v1/videos/{{taskId}}');
  assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']);
  assert.equal(route.strictPollPath,true);
});

test('browser treats XOGPU 501 as poll-route fallback rather than generation failure',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoRoute\\(route=\\{\\}\\)/);
  assert.match(src,/isXogpuVideoRoute\\(route\\)&&status===501/);
  assert.match(src,/if\\(shouldFallbackVideoPollError\\(error,route\\)\\)continue/);
});

test('browser recovers an already-paid XOGPU task failed only by not_implemented poll error',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function recoverableXogpuNotImplementedTask\\(task\\)/);
  assert.match(src,/task\.status!=='failed'\\|\\|!String\\(task\.upstreamTaskId/);
  assert.match(src,/not_implemented:\\\\d\+/);
  assert.match(src,/if\\(recoverableXogpuNotImplementedTask\\(t\\)\\)\\{t\.status='queued'/);
});

test('desktop also falls back on XOGPU 501 without resubmitting',()=>{
  const src=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoConfig\\(config=\\{\\}\\)/);
  assert.match(src,/isXogpuVideoConfig\\(config\\)&&Number\\(error\?\.status\\)===501/);
});
""",encoding='utf-8')

# Tighten existing XOGPU endpoint regression to require the generic task fallback.
xogpu_test=ROOT/'tests'/'xogpu-minimax-h3.test.mjs'
xt=xogpu_test.read_text(encoding='utf-8')
needle="assert.equal(route.profile,'xogpu:minimax-h3');assert.equal(route.createPath,'/v1/videos');assert.equal(route.pollPath,'/v1/videos/{{taskId}}');assert.equal(route.contentPath,'/v1/videos/{{taskId}}/content');"
replacement=needle+"\n  assert.deepEqual(route.pollPathCandidates,['/v1/videos/{{taskId}}','/v1/tasks/{{taskId}}']);"
if needle in xt and replacement not in xt:
    xt=xt.replace(needle,replacement,1)
xogpu_test.write_text(xt,encoding='utf-8')

print('XOGPU 501 poll fallback patch applied')
