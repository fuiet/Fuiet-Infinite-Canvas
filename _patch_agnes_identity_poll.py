from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-agnes-poll-nocache-1'
BUILD='20260831-agnes-id-route-1'

def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

# Browser runtime: distinguish provider video_id from task_id/id.
p=ROOT/'browser-runtime.js'
text=p.read_text(encoding='utf-8')
anchor="function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){\n"
helpers="""function isAgnesVideoRoute(route={}){const family=String(route?.protocolFamily||route?.family||''),profile=String(route?.protocolProfile||route?.profile||'');return family==='agnes-video'||profile.startsWith('agnes:')}
function providerVideoIdentity(raw={}){if(!raw||typeof raw!=='object')return{videoId:'',taskId:''};const videoId=Core?.firstPath?Core.firstPath(raw,['video_id','videoId','data.video_id','data.videoId']):'';const taskId=Core?.firstPath?Core.firstPath(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';return{videoId:videoId==null?'':String(videoId).trim(),taskId:taskId==null?'':String(taskId).trim()}}
function agnesLegacyTaskPollUrl(provider,taskId){const id=String(taskId||'').trim();return id?joinUrl(provider.baseUrl,`/v1/videos/${encodeURIComponent(id)}`):''}
"""
text=rep(text,anchor,helpers+anchor,'browser Agnes identity helpers')
old_strict="""  if(route?.strictPollPath===true){
    if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
    for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
    return out;
  }
"""
new_strict="""  if(route?.strictPollPath===true){
    if(isAgnesVideoRoute(route)){
      const identity=providerVideoIdentity(createdRaw),videoId=identity.videoId,providerTaskId=identity.taskId||(!videoId?String(taskId||'').trim():'');
      if(videoId){
        if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId:videoId})));
        for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId:videoId})));
        if(providerTaskId)add(agnesLegacyTaskPollUrl(provider,providerTaskId));
      }else if(providerTaskId){
        add(agnesLegacyTaskPollUrl(provider,providerTaskId));
        if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId:providerTaskId})));
      }else if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
      return out;
    }
    if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));
    for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
    return out;
  }
"""
text=rep(text,old_strict,new_strict,'browser strict Agnes identity routes')
old_resume="if(route?.strictPollPath===true){pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);activePollUrl=''}"
new_resume="if(route?.strictPollPath===true){const resumeIdentity=isAgnesVideoRoute(route)?{video_id:task.providerVideoId||'',task_id:task.providerTaskId||task.upstreamTaskId||taskId}:null;pollCandidates=videoPollUrlCandidates(provider,resumeIdentity,usedCreatePath,taskId,route);activePollUrl=''}"
text=rep(text,old_resume,new_resume,'browser strict resume identity')
old_poll_ids="""    const pollVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'';
    const pollTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollVideoId?{providerVideoId:String(pollVideoId)}:{}),...(pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress)});
"""
new_poll_ids="""    const pollVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'';
    const pollTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';
    if(modality==='video'&&isAgnesVideoRoute(route)&&pollVideoId){const upgraded=videoPollUrlCandidates(provider,{video_id:String(pollVideoId),task_id:pollTaskId||findTask(task.id)?.providerTaskId||''},usedCreatePath,String(pollVideoId),route);if(upgraded.length){pollCandidates=[...new Set([...upgraded,...pollCandidates])];activePollUrl=upgraded[0]}}
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollVideoId?{providerVideoId:String(pollVideoId)}:{}),...(pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress),videoProtocolDiagnostics:{...(findTask(task.id)?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}});
"""
text=rep(text,old_poll_ids,new_poll_ids,'browser promote real video id')
text=text.replace(OLD,BUILD)
p.write_text(text,encoding='utf-8')

# Desktop runtime parity.
p=ROOT/'server.js'
text=p.read_text(encoding='utf-8')
anchor="function standardVideoResponsePollUrl(created,provider,config={}){\n  if(config.strictPollPath===true)return'';\n  return providerVideoRouteUrl(provider,ProviderRuntimeCore.extractPollUrl(created));\n}\n"
helpers="""function isAgnesVideoConfig(config={}){const family=String(config.protocolFamily||config.family||''),profile=String(config.protocolProfile||config.profile||'');return family==='agnes-video'||profile.startsWith('agnes:')}
function standardVideoProviderIdentity(raw={}){const videoId=ProviderRuntimeCore.firstPath?.(raw,['video_id','videoId','data.video_id','data.videoId']);const taskId=ProviderRuntimeCore.firstPath?.(raw,['task_id','taskId','data.task_id','data.taskId','id','data.id']);return{videoId:videoId==null?'':String(videoId).trim(),taskId:taskId==null?'':String(taskId).trim()}}
function agnesDesktopPollTemplates(provider,config,{videoId='',taskId='',fallbackId=''}={}){const out=[],add=v=>{v=String(v||'').trim();if(v&&!out.includes(v))out.push(v)};if(videoId){if(config.pollPath)add(renderPathTemplate(config.pollPath,{taskId:videoId}));for(const t of (config.pollPathCandidates||[]))add(renderPathTemplate(t,{taskId:videoId}));if(taskId)add(`/v1/videos/${encodeURIComponent(taskId)}`)}else{const id=taskId||fallbackId;if(id){add(`/v1/videos/${encodeURIComponent(id)}`);if(config.pollPath)add(renderPathTemplate(config.pollPath,{taskId:id}))}}return out}
"""
text=rep(text,anchor,anchor+helpers,'desktop Agnes identity helpers')
old_init="""  updateTask(task,{progress:8});
  let taskId='',activePollUrl='';
  const resume=payload._upstream&&payload._upstream.protocol==='standard-video-async-v1'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){
    taskId=String(resume.id);
"""
new_init="""  updateTask(task,{progress:8});
  let taskId='',activePollUrl='',providerVideoId='',providerTaskId='';
  const resume=payload._upstream&&payload._upstream.protocol==='standard-video-async-v1'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){
    taskId=String(resume.id);providerVideoId=String(resume.videoId||'');providerTaskId=String(resume.taskId||'');
"""
text=rep(text,old_init,new_init,'desktop resume identity')
old_create="""    taskId=standardVideoTaskId(created,config);
    if(!taskId)throw new Error('视频任务已提交，但响应中未找到任务 ID。可在供应商/模型高级配置中设置 taskIdPath。');
    activePollUrl=standardVideoResponsePollUrl(created,provider,config);
    payload._upstream={protocol:'standard-video-async-v1',modelId:model.id,id:String(taskId),pollUrl:activePollUrl||'',createdAt:new Date().toISOString()};
    task.payload=payload;updateTask(task,{payload,progress:20});taskLog(task,`已持久化视频任务 ID：${taskId}`);
"""
new_create="""    taskId=standardVideoTaskId(created,config);
    if(!taskId)throw new Error('视频任务已提交，但响应中未找到任务 ID。可在供应商/模型高级配置中设置 taskIdPath。');
    const identity=standardVideoProviderIdentity(created);providerVideoId=identity.videoId;providerTaskId=identity.taskId;
    activePollUrl=standardVideoResponsePollUrl(created,provider,config);
    payload._upstream={protocol:'standard-video-async-v1',modelId:model.id,id:String(taskId),videoId:providerVideoId||'',taskId:providerTaskId||'',pollUrl:activePollUrl||'',createdAt:new Date().toISOString()};
    task.payload=payload;updateTask(task,{payload,providerVideoId:providerVideoId||'',providerTaskId:providerTaskId||'',progress:20});taskLog(task,`已持久化视频任务 ID：${taskId}`);
"""
text=rep(text,old_create,new_create,'desktop persist identity')
old_templates="""    const pollCtx={...ctx,taskId};
    const pollTemplates=[...new Set([...(config.strictPollPath===true?[]:[activePollUrl]),String(config.pollPath||'/v1/videos/{{taskId}}'),...(Array.isArray(config.pollPathCandidates)?config.pollPathCandidates:[])].filter(Boolean))];
"""
new_templates="""    const pollCtx={...ctx,taskId:providerVideoId||taskId};
    const pollTemplates=isAgnesVideoConfig(config)?agnesDesktopPollTemplates(provider,config,{videoId:providerVideoId,taskId:providerTaskId,fallbackId:taskId}):[...new Set([...(config.strictPollPath===true?[]:[activePollUrl]),String(config.pollPath||'/v1/videos/{{taskId}}'),...(Array.isArray(config.pollPathCandidates)?config.pollPathCandidates:[])].filter(Boolean))];
"""
text=rep(text,old_templates,new_templates,'desktop identifier-aware templates')
old_assess="""    const assessment=ProviderRuntimeCore.classifyAsyncPoll(polled,config,'video');
    const status=assessment.status,progressRaw=assessment.progress;
"""
new_assess="""    const assessment=ProviderRuntimeCore.classifyAsyncPoll(polled,config,'video');
    if(isAgnesVideoConfig(config)){const identity=standardVideoProviderIdentity(polled);let changed=false;if(identity.videoId&&identity.videoId!==providerVideoId){providerVideoId=identity.videoId;changed=true}if(identity.taskId&&identity.taskId!==providerTaskId){providerTaskId=identity.taskId;changed=true}if(changed){payload._upstream={...(payload._upstream||{}),videoId:providerVideoId||'',taskId:providerTaskId||''};task.payload=payload;updateTask(task,{payload,providerVideoId:providerVideoId||'',providerTaskId:providerTaskId||''});taskLog(task,`Agnes 轮询身份已更新：video_id=${providerVideoId||'未返回'} task_id=${providerTaskId||'未返回'}`)}}
    const status=assessment.status,progressRaw=assessment.progress;
"""
text=rep(text,old_assess,new_assess,'desktop promote real video id')
p.write_text(text,encoding='utf-8')

# UI: do not label a fallback task id as video_id.
p=ROOT/'app.js'
text=p.read_text(encoding='utf-8')
old_summary="const id=d.providerVideoId||d.upstreamTaskId||d.providerTaskId;if(id)parts.push(`video_id:${id}`);"
new_summary="if(d.providerVideoId)parts.push(`video_id:${d.providerVideoId}`);if(d.providerTaskId)parts.push(`task_id:${d.providerTaskId}`);else if(d.upstreamTaskId&&!d.providerVideoId)parts.push(`upstream_id:${d.upstreamTaskId}`);"
text=rep(text,old_summary,new_summary,'diagnostic summary identity labels')
old_html="const raw=String(d.providerRawStatus||d.providerStatus||n.taskStatus||'等待'),p=Number(d.providerProgress),hasProgress=d.providerProgress!==null&&d.providerProgress!==undefined&&d.providerProgress!==''&&Number.isFinite(p),id=String(d.providerVideoId||d.upstreamTaskId||d.providerTaskId||'');let poll='尚未收到轮询结果';"
new_html="const raw=String(d.providerRawStatus||d.providerStatus||n.taskStatus||'等待'),p=Number(d.providerProgress),hasProgress=d.providerProgress!==null&&d.providerProgress!==undefined&&d.providerProgress!==''&&Number.isFinite(p),videoId=String(d.providerVideoId||''),taskId=String(d.providerTaskId||(!videoId?d.upstreamTaskId||'':''));let poll='尚未收到轮询结果';"
text=rep(text,old_html,new_html,'diagnostic html identity vars')
old_meta="${id?`<span><i>video_id</i><code>${escapeHtml(id)}</code></span>`:''}<span><i>最近轮询</i>"
new_meta="${videoId?`<span><i>video_id</i><code>${escapeHtml(videoId)}</code></span>`:''}${taskId?`<span><i>task_id</i><code>${escapeHtml(taskId)}</code></span>`:''}<span><i>最近轮询</i>"
text=rep(text,old_meta,new_meta,'diagnostic html identity labels')
text=text.replace(OLD,BUILD)
p.write_text(text,encoding='utf-8')

# Bump browser cache references and stale build assertions.
for name in ['index.html','models.html','browser-bootstrap.js']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s:
        fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

# Replace the obsolete strict-only Agnes assertion.
fp=ROOT/'tests'/'agnes-fixed-adapter.test.mjs'
s=fp.read_text(encoding='utf-8')
old="""test('Agnes browser polling uses only the documented agnesapi route and heals persisted generic poll urls',()=>{
  const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(registry,/strictPollPath:true/);
  assert.match(browser,/if\\(route\\?\\.strictPollPath===true\\)\\{/);
  assert.match(browser,/return out;\\n  \\}\\n  const responseUrl=/);
  assert.match(browser,/if\\(route\\?\\.strictPollPath===true\\)\\{pollCandidates=videoPollUrlCandidates\\(provider,null,usedCreatePath,taskId,route\\);activePollUrl=''\\}/);
});
"""
new="""test('Agnes strict polling is identity-aware and never labels task_id as video_id',()=>{
  const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(registry,/strictPollPath:true/);
  assert.match(browser,/function providerVideoIdentity\\(raw=\\{\\}\\)/);
  assert.match(browser,/agnesLegacyTaskPollUrl\\(provider,providerTaskId\\)/);
  assert.match(browser,/resumeIdentity=isAgnesVideoRoute\\(route\\)/);
  assert.match(browser,/activePollUrl=upgraded\\[0\\]/);
  assert.match(app,/video_id:\\$\\{d\\.providerVideoId\\}/);
  assert.match(app,/task_id:\\$\\{d\\.providerTaskId\\}/);
});
"""
if old not in s: raise SystemExit('anchor not found: obsolete Agnes strict test')
fp.write_text(s.replace(old,new,1),encoding='utf-8')

(ROOT/'tests'/'agnes-identity-polling.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-id-route-1';

test('Agnes browser uses legacy task endpoint when create response has only task id',()=>{
  assert.match(browser,/const identity=providerVideoIdentity\\(createdRaw\\),videoId=identity\\.videoId,providerTaskId=identity\\.taskId/);
  assert.match(browser,/add\\(agnesLegacyTaskPollUrl\\(provider,providerTaskId\\)\\);\\n        if\\(route\\.pollPath\\)add/);
});

test('Agnes browser promotes returned video_id to canonical agnesapi polling',()=>{
  assert.match(browser,/if\\(modality==='video'&&isAgnesVideoRoute\\(route\\)&&pollVideoId\\)/);
  assert.match(browser,/videoPollUrlCandidates\\(provider,\\{video_id:String\\(pollVideoId\\)/);
  assert.match(browser,/activePollUrl=upgraded\\[0\\]/);
});

test('Agnes resume keeps both video and task identities',()=>{
  assert.match(browser,/video_id:task\\.providerVideoId\\|\\|''/);
  assert.match(browser,/task_id:task\\.providerTaskId\\|\\|task\\.upstreamTaskId/);
});

test('desktop standard video runtime preserves the same Agnes identity semantics',()=>{
  assert.match(server,/function standardVideoProviderIdentity\\(raw=\\{\\}\\)/);
  assert.match(server,/function agnesDesktopPollTemplates/);
  assert.match(server,/videoId:providerVideoId\\|\\|'',taskId:providerTaskId\\|\\|''/);
  assert.match(server,/\/v1\/videos\/\\$\\{encodeURIComponent\\(id\\)\\}/);
});

test('fresh identity-aware browser runtime build is deployed',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
});
""",encoding='utf-8')

print('patched Agnes identity-aware polling',BUILD)
