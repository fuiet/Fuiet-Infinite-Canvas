from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-node-task-reattach-1'
BUILD='20260831-agnes-provider-throttle-1'


def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

p=ROOT/'browser-runtime.js'
text=p.read_text(encoding='utf-8')

anchor="""function scheduleRateLimitRetry(id,delay=65000){
  const wait=Math.max(1000,Math.min(15*60*1000,Number(delay)||65000));
  const previous=runtime.rateLimitRetryTimers.get(id);if(previous)clearTimeout(previous);
  const timer=setTimeout(()=>{runtime.rateLimitRetryTimers.delete(id);const current=findTask(id);if(!current||current.cancelRequested||current.status!=='retrying'||current.retryReason!=='rate_limit')return;updateTask(id,{status:'queued',error:null,lastError:null,nextRetryAt:null,rateLimitRetryAt:null,retryReason:null});pump()},wait);
  runtime.rateLimitRetryTimers.set(id,timer);
}
"""
insert=anchor+"""function providerCreateThrottleKey(provider,route={}){
  let origin='';try{origin=new URL(String(provider?.baseUrl||''),location.href).origin}catch{}
  const family=String(route?.protocolFamily||route?.protocolProfile||route?.adapterKey||'').toLowerCase();
  const host=(()=>{try{return new URL(String(provider?.baseUrl||''),location.href).hostname.toLowerCase()}catch{return''}})();
  if(!(host.includes('agnes-ai.com')||host.includes('agnes-ai.cn')||family.includes('agnes')))return'';
  return `${String(provider?.id||'agnes')}|${origin||host||'agnes'}|video-create`;
}
function reserveProviderCreateSlot(provider,route={}){
  const key=providerCreateThrottleKey(provider,route);if(!key)return null;
  const q=queueState(),last={...(q.providerCreateLastAt||{})},cooldowns={...(q.providerCreateCooldownUntil||{})},nowMs=Date.now();
  const minGap=65000,due=Math.max(Number(cooldowns[key]||0),Number(last[key]||0)+minGap);
  if(due>nowMs){const wait=Math.max(1000,due-nowMs);const err=new Error(`供应商创建限流：约 ${Math.ceil(wait/1000)} 秒后自动提交`);err.status=429;err.retryAfterMs=wait+250;err.localRateLimit=true;err.providerRateLimitKey=key;throw err}
  last[key]=nowMs;setQueue({providerCreateLastAt:last});return key;
}
function recordProviderCreateRateLimit(provider,route={},delay=65000){
  const key=providerCreateThrottleKey(provider,route);if(!key)return null;
  const q=queueState(),cooldowns={...(q.providerCreateCooldownUntil||{})},wait=Math.max(65000,Math.min(15*60*1000,Number(delay)||65000));
  cooldowns[key]=Math.max(Number(cooldowns[key]||0),Date.now()+wait);setQueue({providerCreateCooldownUntil:cooldowns});return cooldowns[key];
}
"""
text=rep(text,anchor,insert,'provider throttle helpers')

old="""  if(!resumingUpstream){
    const paths=modality==='video'?alternateVideoCreatePaths(route,model):[route.createPath];
"""
new="""  if(!resumingUpstream){
    if(modality==='video')reserveProviderCreateSlot(provider,route);
    const paths=modality==='video'?alternateVideoCreatePaths(route,model):[route.createPath];
"""
text=rep(text,old,new,'reserve create slot')

old="""      }catch(error){
        lastCreateError=error;
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
"""
new="""      }catch(error){
        lastCreateError=error;
        if(Number(error?.status)===429&&modality==='video')recordProviderCreateRateLimit(provider,route,error?.retryAfterMs);
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
"""
text=rep(text,old,new,'record provider 429 cooldown')

old="""    if(Number(error?.status)===429&&!error?.noRetry&&!current.cancelRequested&&attempt<max){const delay=Math.max(1000,Number(error?.retryAfterMs)||65000),retryAt=new Date(Date.now()+delay).toISOString(),waiting=updateTask(task.id,{status:'retrying',attempt:attempt+1,...failurePatch,error:null,lastError:message,retryReason:'rate_limit',nextRetryAt:retryAt,rateLimitRetryAt:retryAt,rateLimitDelayMs:delay});scheduleRateLimitRetry(task.id,delay);return waiting}
"""
new="""    if(Number(error?.status)===429&&!error?.noRetry&&!current.cancelRequested){const delay=Math.max(1000,Number(error?.retryAfterMs)||65000),retryAt=new Date(Date.now()+delay).toISOString(),waiting=updateTask(task.id,{status:'retrying',attempt,...failurePatch,error:null,lastError:message,retryReason:'rate_limit',nextRetryAt:retryAt,rateLimitRetryAt:retryAt,rateLimitDelayMs:delay,rateLimitRetryCount:Number(current.rateLimitRetryCount||0)+1});scheduleRateLimitRetry(task.id,delay);return waiting}
"""
text=rep(text,old,new,'429 does not consume retry budget')

old="""if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',providerStatus:'pending',resultStatus:'pending',upstreamTaskId:'',upstreamCreatePath:'',providerOutput:null,providerResultUrl:'',providerSucceededAt:null,resultSavedAt:null,lastPollAt:null,lastError:null,progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}
"""
new="""if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',providerStatus:'pending',resultStatus:'pending',upstreamTaskId:'',upstreamCreatePath:'',providerOutput:null,providerResultUrl:'',providerSucceededAt:null,resultSavedAt:null,lastPollAt:null,lastError:null,progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),rateLimitRetryCount:0,cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}
"""
text=rep(text,old,new,'initialize rate limit retry count')

text=text.replace(OLD,BUILD)
p.write_text(text,encoding='utf-8')

for name in ['index.html','browser-bootstrap.js','app.js','models.html']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s: fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

(ROOT/'tests'/'agnes-provider-create-throttle.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-provider-throttle-1';

test('Agnes video create requests share a persisted provider-level throttle',()=>{
  assert.match(runtime,/function providerCreateThrottleKey\(provider,route=\{\}\)/);
  assert.match(runtime,/const minGap=65000/);
  assert.match(runtime,/providerCreateLastAt/);
  assert.match(runtime,/providerCreateCooldownUntil/);
  assert.match(runtime,/if\(modality==='video'\)reserveProviderCreateSlot\(provider,route\)/);
});

test('provider HTTP 429 records a shared cooldown',()=>{
  assert.match(runtime,/recordProviderCreateRateLimit\(provider,route,error\?\.retryAfterMs\)/);
  assert.match(runtime,/Math\.max\(65000,Math\.min\(15\*60\*1000/);
});

test('HTTP 429 does not consume normal task retry budget',()=>{
  assert.match(runtime,/if\(Number\(error\?\.status\)===429&&!error\?\.noRetry&&!current\.cancelRequested\)/);
  assert.match(runtime,/status:'retrying',attempt,\.\.\.failurePatch/);
  assert.doesNotMatch(runtime,/status:'retrying',attempt:attempt\+1/);
  assert.match(runtime,/rateLimitRetryCount:Number\(current\.rateLimitRetryCount\|\|0\)\+1/);
});

test('fresh browser build ships provider throttle logic',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
});
""",encoding='utf-8')
print('patched Agnes provider create throttle',BUILD)
