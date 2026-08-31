from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-agnes-resume-heal-1'
BUILD='20260831-node-task-reattach-1'

p=ROOT/'app.js'
text=p.read_text(encoding='utf-8')
anchor="""  window.addEventListener('pagehide',()=>{if(!backendOnline||!authenticated||!state.projectId)return;try{const payload=deepClone(state);fetch('/api/projects/'+encodeURIComponent(state.projectId),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({name:payload.projectName,data:payload,forceSnapshot:false})})}catch{}});
"""
insert="""  const resumedNodeTaskMonitors=new Map();
  function persistedNodeTaskAttempt(n){
    const providerId=String(n?.taskProviderId||n?.providerId||''),modelId=String(n?.taskModelId||n?.modelId||''),provider=providerById(providerId),model=provider?.models?.find(m=>String(m.id)===modelId)||null;
    return{provider,model,providerId,modelId,modelName:model?.name||n?.modelName||modelId||'模型',primary:true};
  }
  function applyRecoveredTaskSuccess(n,info,attempt){
    if(!n||!info||n.taskId!==info.id)return false;
    syncNodeTaskDiagnostics(n,info);const out=info.output||{},resolvedUrl=resolveGeneratedOutputUrl(out.value??out);if(resolvedUrl)n.outputUrl=resolvedUrl;
    if(out.type==='url'&&!n.outputUrl)n.outputUrl=String(out.value||'').trim();
    else if(out.type==='text'){if(n.type==='text')n.text=out.value;else n.generatedText=out.value}
    else if(out.type!=='url'&&out.value!==undefined)n.generatedResult=out.value;
    if(!n.outputUrl&&n.type==='video'){const fallbackUrl=resolveGeneratedOutputUrl(n.generatedResult)||resolveGeneratedOutputUrl(n.toolParams?.output)||resolveGeneratedOutputUrl(n.toolParams?.result);if(fallbackUrl)n.outputUrl=fallbackUrl}
    n.taskStatus='succeeded';n.taskProgress=100;n.taskError='';n.taskSyncMessage='';n.outputSourceUrl=out.sourceUrl||n.outputSourceUrl||'';n.lastUsedProviderId=attempt.providerId||n.taskProviderId||n.providerId||'';n.lastUsedModelId=attempt.modelId||n.taskModelId||n.modelId||'';n.lastUsedModelName=attempt.modelName||n.modelName||'';
    const hasVersion=n.outputUrl&&(n.resultVersions||[]).some(v=>String(v.outputUrl||'')===String(n.outputUrl));if(n.outputUrl&&!hasVersion)recordNodeResultVersion(n,{providerId:n.lastUsedProviderId,modelId:n.lastUsedModelId,modelName:n.lastUsedModelName});
    saveState();render();return true;
  }
  async function resumePersistedNodeTask(n){
    if(!n?.taskId||resumedNodeTaskMonitors.has(n.id))return;
    const taskId=String(n.taskId),attempt=persistedNodeTaskAttempt(n);
    const work=(async()=>{try{
      let info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;if(!info||String(n.taskId)!==taskId)return;
      syncNodeTaskDiagnostics(n,info);n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=['failed','canceled'].includes(info.status)?taskFailureText(info):'';n.taskSyncMessage=['provider_succeeded','result_pending'].includes(info.status)?'上游已生成，正在同步视频结果…':'';saveState();render();
      if(info.status==='succeeded'){applyRecoveredTaskSuccess(n,info,attempt);return}
      if(['failed','canceled'].includes(info.status))return;
      if(!['queued','running','polling','retrying','provider_succeeded','result_pending','fallback'].includes(info.status))return;
      info=await monitorNodeTask(n,taskId,attempt,info);if(info?.status==='succeeded'&&String(n.taskId)===taskId)applyRecoveredTaskSuccess(n,info,attempt);
    }catch(error){if(String(n.taskId)!==taskId)return;n.taskSyncMessage='任务恢复监控暂时失败，页面会保留原任务 ID；请勿重新生成。';n.taskError=safeTaskDiagnosticText(errorText(error));saveState();render()}finally{resumedNodeTaskMonitors.delete(n.id)}})();
    resumedNodeTaskMonitors.set(n.id,work);return work;
  }
  function resumePersistedNodeTaskMonitors(){
    const active=new Set(['queued','running','polling','retrying','provider_succeeded','result_pending','fallback']);
    for(const n of state.nodes){if(n?.taskId&&active.has(String(n.taskStatus||'')))resumePersistedNodeTask(n)}
  }

"""
if 'function resumePersistedNodeTaskMonitors()' not in text:
    if anchor not in text: raise SystemExit('pagehide anchor not found')
    text=text.replace(anchor,insert+anchor,1)
old_init="""  (async function init(){const ok=await checkAuth();const params=new URLSearchParams(location.search),requestedProject=params.get('projectId');if(requestedProject)state.projectId=requestedProject;if(ok){await loadProviders();await ensureServerProject();}render();const open=params.get('open');if(open==='providers'&&ok)openProviderModal();})();
"""
new_init="""  (async function init(){const ok=await checkAuth();const params=new URLSearchParams(location.search),requestedProject=params.get('projectId');if(requestedProject)state.projectId=requestedProject;if(ok){await loadProviders();await ensureServerProject();}render();resumePersistedNodeTaskMonitors();const open=params.get('open');if(open==='providers'&&ok)openProviderModal();})();
"""
if new_init not in text:
    if old_init not in text: raise SystemExit('init anchor not found')
    text=text.replace(old_init,new_init,1)
p.write_text(text.replace(OLD,BUILD),encoding='utf-8')

# Force the latest app/bootstrap/runtime assets to be fetched on the fixed production origin.
for name in ['index.html','models.html','browser-bootstrap.js','browser-runtime.js']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s: fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

(ROOT/'tests'/'node-task-reattach.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-node-task-reattach-1';

test('canvas startup reattaches monitors for persisted active node tasks',()=>{
  assert.match(app,/function resumePersistedNodeTaskMonitors\(\)/);
  assert.match(app,/resumePersistedNodeTaskMonitors\(\);const open=/);
  assert.match(app,/apiJson\('\/api\/tasks\/'\+encodeURIComponent\(taskId\)\)/);
  assert.match(app,/monitorNodeTask\(n,taskId,attempt,info\)/);
});

test('reattach path never creates a replacement provider task',()=>{
  const start=app.indexOf('async function resumePersistedNodeTask(n)');
  const end=app.indexOf("window.addEventListener('pagehide'",start);
  const section=app.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.doesNotMatch(section,/apiJson\('\/api\/tasks',\{method:'POST'/);
  assert.match(section,/请勿重新生成/);
});

test('already completed tasks restore output directly into the node',()=>{
  assert.match(app,/function applyRecoveredTaskSuccess\(n,info,attempt\)/);
  assert.match(app,/resolveGeneratedOutputUrl\(out\.value\?\?out\)/);
  assert.match(app,/n\.taskStatus='succeeded';n\.taskProgress=100/);
  assert.match(app,/recordNodeResultVersion/);
});

test('fresh app build is forced through bootstrap and production index',()=>{
  assert.ok(bootstrap.includes(`const v='${BUILD}'`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
});
""",encoding='utf-8')
print('patched node task reattach',BUILD)
