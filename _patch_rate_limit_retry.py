from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD_RUNTIME='20260829-agnes-live-poll-4'
OLD_APP='20260831-video-task-diagnostics-1'
BUILD='20260831-provider-rate-limit-1'

def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

runtime_path=ROOT/'browser-runtime.js'
runtime=runtime_path.read_text(encoding='utf-8')
runtime=rep(runtime,
"const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),resultRetryTimers:new Map(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};",
"const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),resultRetryTimers:new Map(),rateLimitRetryTimers:new Map(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};",
'runtime rate limit timer map')

old_provider="function videoRequestDiagnostics(model,task,refs,createPath,transport,route={}){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{};return{createPath,transport,modelId:String(model?.id||''),protocolFamily:route.protocolFamily||'',protocolProfile:route.protocolProfile||'',videoOperation:route.videoOperation||'',duration:Number(p.duration||p.seconds||0),resolution:String(p.resolution||''),aspectRatio:String(p.aspectRatio||p.aspect_ratio||''),size:String(p.size||''),referenceCount:refs.length,hasFirstFrame:refs.some(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image')}}\nasync function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=runtimeErrorText(parsed.value);const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;throw err}return parsed}"
new_provider="function videoRequestDiagnostics(model,task,refs,createPath,transport,route={}){const p=VideoParams?.normalize?.(task.parameters||{})||task.parameters||{};return{createPath,transport,modelId:String(model?.id||''),protocolFamily:route.protocolFamily||'',protocolProfile:route.protocolProfile||'',videoOperation:route.videoOperation||'',duration:Number(p.duration||p.seconds||0),resolution:String(p.resolution||''),aspectRatio:String(p.aspectRatio||p.aspect_ratio||''),size:String(p.size||''),referenceCount:refs.length,hasFirstFrame:refs.some(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image')}}\nfunction providerRetryAfterMs(res,detail=''){\n  const clamp=ms=>Math.max(1000,Math.min(15*60*1000,Math.round(Number(ms)||0)));\n  const header=String(res?.headers?.get?.('retry-after')||'').trim();\n  if(header){const seconds=Number(header);if(Number.isFinite(seconds)&&seconds>=0)return clamp(seconds*1000+1000);const at=Date.parse(header);if(Number.isFinite(at))return clamp(Math.max(1000,at-Date.now()+1000))}\n  const reset=Number(res?.headers?.get?.('x-ratelimit-reset')||res?.headers?.get?.('ratelimit-reset')||0);if(Number.isFinite(reset)&&reset>0){const ms=reset>1e12?reset-Date.now():reset*1000-Date.now();if(ms>0)return clamp(ms+1000)}\n  const m=String(detail||'').match(/per\\s+(\\d+(?:\\.\\d+)?)\\s*(second|minute|hour)/i);if(m){const n=Number(m[1])||1,unit=m[2].toLowerCase(),factor=unit.startsWith('hour')?3600000:unit.startsWith('minute')?60000:1000;return clamp(n*factor+1000)}\n  return 65000;\n}\nasync function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=runtimeErrorText(parsed.value);const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;if(res.status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}"
runtime=rep(runtime,old_provider,new_provider,'provider retry after parsing')

runtime=rep(runtime,
"if(['succeeded','failed','canceled'].includes(list[i].status)){const timer=runtime.resultRetryTimers.get(id);if(timer){clearTimeout(timer);runtime.resultRetryTimers.delete(id)}}",
"if(['succeeded','failed','canceled'].includes(list[i].status)){const timer=runtime.resultRetryTimers.get(id);if(timer){clearTimeout(timer);runtime.resultRetryTimers.delete(id)}const rateTimer=runtime.rateLimitRetryTimers.get(id);if(rateTimer){clearTimeout(rateTimer);runtime.rateLimitRetryTimers.delete(id)}}",
'terminal timer cleanup')

insert="""function scheduleRateLimitRetry(id,delay=65000){
  const wait=Math.max(1000,Math.min(15*60*1000,Number(delay)||65000));
  const previous=runtime.rateLimitRetryTimers.get(id);if(previous)clearTimeout(previous);
  const timer=setTimeout(()=>{runtime.rateLimitRetryTimers.delete(id);const current=findTask(id);if(!current||current.cancelRequested||current.status!=='retrying'||current.retryReason!=='rate_limit')return;updateTask(id,{status:'queued',error:null,lastError:null,nextRetryAt:null,rateLimitRetryAt:null,retryReason:null});pump()},wait);
  runtime.rateLimitRetryTimers.set(id,timer);
}
"""
runtime=rep(runtime,"function upsertTask(task){",insert+"function upsertTask(task){",'rate limit scheduler')

old_retry="if(!error?.noRetry&&!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,...failurePatch});pump();return}"
new_retry="if(Number(error?.status)===429&&!error?.noRetry&&!current.cancelRequested&&attempt<max){const delay=Math.max(1000,Number(error?.retryAfterMs)||65000),retryAt=new Date(Date.now()+delay).toISOString(),waiting=updateTask(task.id,{status:'retrying',attempt:attempt+1,...failurePatch,error:null,lastError:message,retryReason:'rate_limit',nextRetryAt:retryAt,rateLimitRetryAt:retryAt,rateLimitDelayMs:delay});scheduleRateLimitRetry(task.id,delay);return waiting}\n    if(!error?.noRetry&&!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,...failurePatch});pump();return}"
runtime=rep(runtime,old_retry,new_retry,'429 delayed retry')

old_start="if(['provider_succeeded','result_pending'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.updatedAt=now();changed=true;continue}\n    if(['running','polling','retrying'].includes(t.status)){"
new_start="if(['provider_succeeded','result_pending'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.updatedAt=now();changed=true;continue}\n    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}\n    if(['running','polling','retrying'].includes(t.status)){"
runtime=rep(runtime,old_start,new_start,'restore rate limited task')
runtime=runtime.replace(OLD_RUNTIME,BUILD)
runtime_path.write_text(runtime,encoding='utf-8')

app_path=ROOT/'app.js'
app=app_path.read_text(encoding='utf-8')
old_snap="function taskDiagnosticSnapshot(info={}){const rawProgress=info.providerProgress,p=rawProgress===null||rawProgress===undefined||rawProgress===''?NaN:Number(rawProgress);return{status:String(info.status||''),providerStatus:String(info.providerStatus||''),resultStatus:String(info.resultStatus||''),providerRawStatus:String(info.providerRawStatus||''),providerProgress:Number.isFinite(p)?p:null,upstreamTaskId:String(info.upstreamTaskId||''),providerVideoId:String(info.providerVideoId||''),providerTaskId:String(info.providerTaskId||''),lastPollAt:String(info.lastPollAt||''),lastError:safeTaskDiagnosticText(info.lastError||'')}}"
new_snap="function taskDiagnosticSnapshot(info={}){const rawProgress=info.providerProgress,p=rawProgress===null||rawProgress===undefined||rawProgress===''?NaN:Number(rawProgress);return{status:String(info.status||''),providerStatus:String(info.providerStatus||''),resultStatus:String(info.resultStatus||''),providerRawStatus:String(info.providerRawStatus||''),providerProgress:Number.isFinite(p)?p:null,upstreamTaskId:String(info.upstreamTaskId||''),providerVideoId:String(info.providerVideoId||''),providerTaskId:String(info.providerTaskId||''),lastPollAt:String(info.lastPollAt||''),retryReason:String(info.retryReason||''),nextRetryAt:String(info.nextRetryAt||info.rateLimitRetryAt||''),lastError:safeTaskDiagnosticText(info.lastError||'')}}"
app=rep(app,old_snap,new_snap,'diagnostic rate limit fields')
old_summary="if(d.lastPollAt)parts.push(`轮询:${d.lastPollAt}`);if(d.lastError)parts.push(`错误:${d.lastError}`);"
new_summary="if(d.lastPollAt)parts.push(`轮询:${d.lastPollAt}`);if(d.retryReason==='rate_limit'&&d.nextRetryAt)parts.push(`限流重试:${d.nextRetryAt}`);if(d.lastError)parts.push(`错误:${d.lastError}`);"
app=rep(app,old_summary,new_summary,'task manager rate limit summary')
old_phase="const phase=['provider_succeeded','result_pending'].includes(String(n.taskStatus||''))?'上游已完成 · 正在同步视频':'上游实时状态';"
new_phase="const phase=d.retryReason==='rate_limit'?'供应商限流 · 等待自动重试':['provider_succeeded','result_pending'].includes(String(n.taskStatus||''))?'上游已完成 · 正在同步视频':'上游实时状态';"
app=rep(app,old_phase,new_phase,'video rate limit phase')
old_meta="${d.resultStatus?`<span><i>结果</i><code>${escapeHtml(String(d.resultStatus))}</code></span>`:''}</div>"
new_meta="${d.resultStatus?`<span><i>结果</i><code>${escapeHtml(String(d.resultStatus))}</code></span>`:''}${d.retryReason==='rate_limit'&&d.nextRetryAt?`<span><i>自动重试</i><code>${escapeHtml(new Date(d.nextRetryAt).toLocaleTimeString())}</code></span>`:''}</div>"
app=rep(app,old_meta,new_meta,'video retry time')
old_sync="n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=(resultSyncing||retrying)?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':retrying?'上游服务暂时不可用，正在继续查询原任务…':'';"
new_sync="n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=(resultSyncing||retrying)?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':retrying?(info.retryReason==='rate_limit'?'供应商触发限流，正在等待自动重试…':'上游服务暂时不可用，正在继续查询原任务…'):'';"
app=rep(app,old_sync,new_sync,'monitor rate limit message')
app_path.write_text(app,encoding='utf-8')

for name in ['index.html','models.html','browser-bootstrap.js']:
    p=ROOT/name;text=p.read_text(encoding='utf-8').replace(OLD_RUNTIME,BUILD).replace(OLD_APP,BUILD);p.write_text(text,encoding='utf-8')

for p in (ROOT/'tests').glob('*.test.mjs'):
    text=p.read_text(encoding='utf-8')
    if OLD_RUNTIME in text or OLD_APP in text:
        p.write_text(text.replace(OLD_RUNTIME,BUILD).replace(OLD_APP,BUILD),encoding='utf-8')

test_path=ROOT/'tests/provider-rate-limit-retry.test.mjs'
test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-provider-rate-limit-1';

test('HTTP 429 captures provider Retry-After instead of immediate retry',()=>{
  assert.match(runtime,/function providerRetryAfterMs\(res,detail=''\)/);
  assert.match(runtime,/headers\?\.get\?\.\('retry-after'\)/);
  assert.match(runtime,/if\(res\.status===429\)err\.retryAfterMs=providerRetryAfterMs\(res,detail\)/);
  assert.match(runtime,/retryReason:'rate_limit'/);
  assert.match(runtime,/scheduleRateLimitRetry\(task\.id,delay\)/);
});

test('rate limited create retry waits before queue pump and survives refresh',()=>{
  assert.match(runtime,/function scheduleRateLimitRetry\(id,delay=65000\)/);
  assert.match(runtime,/setTimeout\(\(\)=>\{runtime\.rateLimitRetryTimers\.delete\(id\)/);
  assert.match(runtime,/t\.status==='retrying'&&t\.retryReason==='rate_limit'&&!t\.upstreamTaskId/);
  const start=runtime.indexOf("if(Number(error?.status)===429");
  const end=runtime.indexOf("if(!error?.noRetry",start+10);
  const branch=runtime.slice(start,end);
  assert.ok(branch.includes("status:'retrying'"));
  assert.ok(branch.includes('scheduleRateLimitRetry(task.id,delay)'));
  assert.doesNotMatch(branch,/pump\(\)/);
});

test('video diagnostics show rate limit wait and next automatic retry',()=>{
  assert.match(app,/retryReason:String\(info\.retryReason\|\|''\)/);
  assert.match(app,/供应商限流 · 等待自动重试/);
  assert.match(app,/自动重试/);
  assert.match(app,/供应商触发限流，正在等待自动重试/);
});

test('fresh runtime build is loaded',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${BUILD}`));
});
""",encoding='utf-8')

print('patched provider 429 delayed retry',BUILD)
