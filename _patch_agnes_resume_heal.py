from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-agnes-id-route-1'
BUILD='20260831-agnes-resume-heal-1'

def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

# Browser runtime: heal polluted Agnes identities and resume persisted upstream polling after reload.
p=ROOT/'browser-runtime.js'
text=p.read_text(encoding='utf-8')
old_identity="function providerVideoIdentity(raw={}){if(!raw||typeof raw!=='object')return{videoId:'',taskId:''};const videoId=Core?.firstPath?Core.firstPath(raw,['video_id','videoId','data.video_id','data.videoId']):'';const taskId=Core?.firstPath?Core.firstPath(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';return{videoId:videoId==null?'':String(videoId).trim(),taskId:taskId==null?'':String(taskId).trim()}}"
new_identity="function providerVideoIdentity(raw={}){if(!raw||typeof raw!=='object')return{videoId:'',taskId:'',ambiguousTaskAlias:false};let videoId=Core?.firstPath?Core.firstPath(raw,['video_id','videoId','data.video_id','data.videoId']):'',taskId=Core?.firstPath?Core.firstPath(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';videoId=videoId==null?'':String(videoId).trim();taskId=taskId==null?'':String(taskId).trim();const ambiguousTaskAlias=Boolean(videoId&&taskId&&videoId===taskId&&/^task[_-]/i.test(videoId));if(ambiguousTaskAlias)videoId='';return{videoId,taskId,ambiguousTaskAlias}}"
text=rep(text,old_identity,new_identity,'browser ambiguous Agnes identity')

old_resume="if(route?.strictPollPath===true){const resumeIdentity=isAgnesVideoRoute(route)?{video_id:task.providerVideoId||'',task_id:task.providerTaskId||task.upstreamTaskId||taskId}:null;pollCandidates=videoPollUrlCandidates(provider,resumeIdentity,usedCreatePath,taskId,route);activePollUrl=''}"
new_resume="if(route?.strictPollPath===true){let resumeIdentity=isAgnesVideoRoute(route)?providerVideoIdentity({video_id:task.providerVideoId||'',task_id:task.providerTaskId||task.upstreamTaskId||taskId}):null;if(resumeIdentity?.ambiguousTaskAlias){updateTask(task.id,{providerVideoId:'',providerTaskId:resumeIdentity.taskId,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),healedAmbiguousTaskAlias:true,healedAmbiguousTaskAliasAt:now()}})}pollCandidates=videoPollUrlCandidates(provider,resumeIdentity,usedCreatePath,taskId,route);activePollUrl=''}"
text=rep(text,old_resume,new_resume,'browser resume identity healing')

old_poll="""    const pollVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'';
    const pollTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';
    if(modality==='video'&&isAgnesVideoRoute(route)&&pollVideoId){const upgraded=videoPollUrlCandidates(provider,{video_id:String(pollVideoId),task_id:pollTaskId||findTask(task.id)?.providerTaskId||''},usedCreatePath,String(pollVideoId),route);if(upgraded.length){pollCandidates=[...new Set([...upgraded,...pollCandidates])];activePollUrl=upgraded[0]}}
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollVideoId?{providerVideoId:String(pollVideoId)}:{}),...(pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress),videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}});
"""
new_poll="""    const pollIdentity=modality==='video'&&isAgnesVideoRoute(route)?providerVideoIdentity(polled.value):null;
    const pollVideoId=pollIdentity?pollIdentity.videoId:(modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'');
    const pollTaskId=pollIdentity?pollIdentity.taskId:(modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'');
    if(modality==='video'&&isAgnesVideoRoute(route)&&pollVideoId){const upgraded=videoPollUrlCandidates(provider,{video_id:String(pollVideoId),task_id:pollTaskId||findTask(task.id)?.providerTaskId||''},usedCreatePath,String(pollVideoId),route);if(upgraded.length){pollCandidates=[...new Set([...upgraded,...pollCandidates])];activePollUrl=upgraded[0]}}
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollIdentity?.ambiguousTaskAlias?{providerVideoId:'',providerTaskId:String(pollTaskId||'')}:(pollVideoId?{providerVideoId:String(pollVideoId)}:{})),...(!pollIdentity?.ambiguousTaskAlias&&pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress),videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates,...(pollIdentity?.ambiguousTaskAlias?{healedAmbiguousTaskAlias:true}:{} )}});
"""
text=rep(text,old_poll,new_poll,'browser poll identity healing')

old_startup="""runtime.ready.then(()=>{
  const list=tasks();let changed=false;
  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(['provider_succeeded','result_pending'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.updatedAt=now();changed=true;continue}
    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}
"""
new_startup="""runtime.ready.then(()=>{
  const list=tasks();let changed=false;
  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(t.status==='retrying'&&t.retryReason==='rate_limit'&&!t.upstreamTaskId){const due=Date.parse(t.nextRetryAt||t.rateLimitRetryAt||''),delay=Number.isFinite(due)?Math.max(1000,due-Date.now()):65000;scheduleRateLimitRetry(t.id,delay);continue}
    if(['provider_succeeded','result_pending','running','polling','fallback','retrying'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.lastError=t.status==='retrying'?t.lastError:null;t.updatedAt=now();changed=true;continue}
    if(['running','polling','fallback'].includes(t.status)&&!t.upstreamTaskId){t.status='failed';t.error='页面刷新发生在上游任务 ID 持久化之前；为避免重复扣费不会自动重新提交，请重新创建任务。';t.lastError=t.error;t.updatedAt=now();changed=true;continue}
"""
text=rep(text,old_startup,new_startup,'browser startup upstream recovery')

text=text.replace(OLD,BUILD)
p.write_text(text,encoding='utf-8')

# Desktop identity normalization parity.
p=ROOT/'server.js'
text=p.read_text(encoding='utf-8')
old_desktop="function standardVideoProviderIdentity(raw={}){const videoId=ProviderRuntimeCore.firstPath?.(raw,['video_id','videoId','data.video_id','data.videoId']);const taskId=ProviderRuntimeCore.firstPath?.(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']);return{videoId:videoId==null?'':String(videoId).trim(),taskId:taskId==null?'':String(taskId).trim()}}"
new_desktop="function standardVideoProviderIdentity(raw={}){let videoId=ProviderRuntimeCore.firstPath?.(raw,['video_id','videoId','data.video_id','data.videoId']),taskId=ProviderRuntimeCore.firstPath?.(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']);videoId=videoId==null?'':String(videoId).trim();taskId=taskId==null?'':String(taskId).trim();const ambiguousTaskAlias=Boolean(videoId&&taskId&&videoId===taskId&&/^task[_-]/i.test(videoId));if(ambiguousTaskAlias)videoId='';return{videoId,taskId,ambiguousTaskAlias}}"
text=rep(text,old_desktop,new_desktop,'desktop ambiguous Agnes identity')
p.write_text(text,encoding='utf-8')

# Cache bump.
for name in ['index.html','models.html','browser-bootstrap.js','app.js']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s:
        fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

# Add regression coverage.
(ROOT/'tests'/'browser-task-reload-recovery.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-resume-heal-1';

test('browser reload resumes only already-persisted upstream active tasks',()=>{
  assert.match(runtime,/\['provider_succeeded','result_pending','running','polling','fallback','retrying'\]\.includes\(t\.status\)&&t\.upstreamTaskId/);
  assert.match(runtime,/t\.status='queued'/);
  assert.match(runtime,/\['running','polling','fallback'\]\.includes\(t\.status\)&&!t\.upstreamTaskId/);
  assert.match(runtime,/为避免重复扣费不会自动重新提交/);
});

test('polling tasks are not left visually alive while executor is stopped after reload',()=>{
  const ready=runtime.slice(runtime.indexOf('runtime.ready.then(()=>'),runtime.indexOf('window.fetch=async function'));
  assert.match(ready,/running','polling'/);
  assert.match(ready,/saveTasks\(list\);pump\(\)/);
});

test('Agnes task alias pollution is healed instead of reused as a video id',()=>{
  assert.match(runtime,/const ambiguousTaskAlias=Boolean\(videoId&&taskId&&videoId===taskId&&\/\^task\[_-\]\/i\.test\(videoId\)\)/);
  assert.match(runtime,/if\(ambiguousTaskAlias\)videoId=''/);
  assert.match(runtime,/healedAmbiguousTaskAlias:true/);
  assert.match(server,/const ambiguousTaskAlias=Boolean\(videoId&&taskId&&videoId===taskId&&\/\^task\[_-\]\/i\.test\(videoId\)\)/);
});

test('fresh browser build is deployed for task recovery healing',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${BUILD}`));
});
""",encoding='utf-8')

print('patched Agnes reload recovery and identity healing',BUILD)
