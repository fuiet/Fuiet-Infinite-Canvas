from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
RUNTIME_BUILD='20260829-agnes-live-poll-4'
APP_BUILD='20260831-video-task-diagnostics-1'


def replace_once(text, old, new, label, required=True):
    if new in text:
        return text
    if old not in text:
        if required:
            raise SystemExit(f'anchor not found: {label}')
        return text
    return text.replace(old,new,1)

app_path=ROOT/'app.js'
app=app_path.read_text(encoding='utf-8')

old="function nodeTaskVisualState(n){const wf=workflowNodeStatus(n.id).status;if(wf)return wf;if(n.frozen)return'frozen';const s=String(n.taskStatus||'');if(['queued','polling','retrying','running','fallback'].includes(s))return s==='queued'?'pending':'running';if(['succeeded','failed','canceled'].includes(s))return s;return''}"
new="""function nodeTaskVisualState(n){const wf=workflowNodeStatus(n.id).status;if(wf)return wf;if(n.frozen)return'frozen';const s=String(n.taskStatus||'');if(['queued','polling','retrying','running','fallback','provider_succeeded','result_pending'].includes(s))return s==='queued'?'pending':'running';if(['succeeded','failed','canceled'].includes(s))return s;return''}
  function safeTaskDiagnosticText(value){let text=String(value??'');text=text.replace(/Bearer\\s+[A-Za-z0-9._~+\\/=-]+/gi,'Bearer [redacted]');text=text.replace(/((?:x-api-key|api-key|authorization)\\s*[:=]\\s*)[^\\s,;&]+/gi,'$1[redacted]');text=text.replace(/((?:api[-_]?key|token|secret)\\s*[:=]\\s*)[^\\s,;&]+/gi,'$1[redacted]');return text.slice(0,500)}
  function taskDiagnosticSnapshot(info={}){const rawProgress=info.providerProgress,p=rawProgress===null||rawProgress===undefined||rawProgress===''?NaN:Number(rawProgress);return{status:String(info.status||''),providerStatus:String(info.providerStatus||''),resultStatus:String(info.resultStatus||''),providerRawStatus:String(info.providerRawStatus||''),providerProgress:Number.isFinite(p)?p:null,upstreamTaskId:String(info.upstreamTaskId||''),providerVideoId:String(info.providerVideoId||''),providerTaskId:String(info.providerTaskId||''),lastPollAt:String(info.lastPollAt||''),lastError:safeTaskDiagnosticText(info.lastError||'')}}
  function syncNodeTaskDiagnostics(n,info){if(n&&info)n.taskDiagnostics=taskDiagnosticSnapshot(info)}
  function taskDiagnosticSummary(info={}){const d=taskDiagnosticSnapshot(info),parts=[],raw=d.providerRawStatus||d.providerStatus||d.status;if(raw)parts.push(`上游:${raw}`);if(d.providerProgress!=null)parts.push(`上游进度:${Math.max(0,Math.min(100,Math.round(d.providerProgress)))}%`);const id=d.providerVideoId||d.upstreamTaskId||d.providerTaskId;if(id)parts.push(`video_id:${id}`);if(d.lastPollAt)parts.push(`轮询:${d.lastPollAt}`);if(d.lastError)parts.push(`错误:${d.lastError}`);return parts.join(' · ')}
  function videoTaskDiagnosticsHtml(n){if(n?.type!=='video'||!n?.taskId)return'';const d=n.taskDiagnostics||{},active=['queued','running','polling','retrying','provider_succeeded','result_pending'].includes(String(n.taskStatus||''));if(!active&&!d.lastError)return'';const raw=String(d.providerRawStatus||d.providerStatus||n.taskStatus||'等待'),p=Number(d.providerProgress),hasProgress=d.providerProgress!==null&&d.providerProgress!==undefined&&d.providerProgress!==''&&Number.isFinite(p),id=String(d.providerVideoId||d.upstreamTaskId||d.providerTaskId||'');let poll='尚未收到轮询结果';if(d.lastPollAt){const dt=new Date(d.lastPollAt);poll=Number.isNaN(dt.getTime())?String(d.lastPollAt):dt.toLocaleTimeString()}const phase=['provider_succeeded','result_pending'].includes(String(n.taskStatus||''))?'上游已完成 · 正在同步视频':'上游实时状态';return `<div class=\"video-task-diagnostics\"><div class=\"video-task-diagnostics-head\"><span>${escapeHtml(phase)}</span><b>${escapeHtml(raw)}${hasProgress?` · ${Math.max(0,Math.min(100,Math.round(p)))}%`:''}</b></div><div class=\"video-task-diagnostics-meta\">${id?`<span><i>video_id</i><code>${escapeHtml(id)}</code></span>`:''}<span><i>最近轮询</i><code>${escapeHtml(poll)}</code></span>${d.resultStatus?`<span><i>结果</i><code>${escapeHtml(String(d.resultStatus))}</code></span>`:''}</div>${d.lastError?`<div class=\"video-task-diagnostics-error\">${escapeHtml(String(d.lastError))}</div>`:''}</div>`}"""
app=replace_once(app,old,new,'node task visual state')

old="""async function monitorNodeTask(n,taskId,attempt,seedTask=null){
    let info=seedTask;
    while(true){"""
new="""async function monitorNodeTask(n,taskId,attempt,seedTask=null){
    let info=seedTask;if(info)syncNodeTaskDiagnostics(n,info);
    while(true){"""
app=replace_once(app,old,new,'monitor seed diagnostics')

poll_line="info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;"
if "syncNodeTaskDiagnostics(n,info);" not in app[app.find(poll_line):app.find(poll_line)+220]:
    if poll_line not in app: raise SystemExit('anchor not found: monitor poll diagnostics')
    app=app.replace(poll_line,poll_line+"syncNodeTaskDiagnostics(n,info);",1)

old="n.taskStatus=created.task.status;n.taskProgress=created.task.progress||0;saveState();render();"
new="n.taskStatus=created.task.status;n.taskProgress=created.task.progress||0;syncNodeTaskDiagnostics(n,created.task);saveState();render();"
app=replace_once(app,old,new,'created task diagnostics')

old="body=`<div class=\"video-node-shell ${emptyVideo?'is-empty':'has-output'}\">${uploadAction}${media}${quick}</div>`;"
new="body=`<div class=\"video-node-shell ${emptyVideo?'is-empty':'has-output'}\">${uploadAction}${media}<div class=\"video-task-diagnostics-slot\" data-video-task-diagnostics>${videoTaskDiagnosticsHtml(n)}</div>${quick}</div>`;"
app=replace_once(app,old,new,'video diagnostics slot')

old="const pct=status==='pending'?4:Math.max(8,Math.min(100,Number(n?.taskProgress||0)));$('i',bar).style.width=pct+'%'}else bar?.remove()});"
new="const pct=status==='pending'?4:Math.max(8,Math.min(100,Number(n?.taskProgress||0)));$('i',bar).style.width=pct+'%'}else bar?.remove();const diag=$('[data-video-task-diagnostics]',el);if(diag&&n?.type==='video')diag.innerHTML=videoTaskDiagnosticsHtml(n)});"
app=replace_once(app,old,new,'live diagnostics refresh')

old="<small>${escapeHtml((t.error||t.id||'').slice(0,90))}</small>"
new="<small>${escapeHtml((taskDiagnosticSummary(t)||t.error||t.id||'').slice(0,220))}</small>"
app=replace_once(app,old,new,'task manager diagnostics')
app=app.replace("['queued','running','polling','retrying','cancelling'].includes(t.status)","['queued','running','polling','retrying','provider_succeeded','result_pending','cancelling'].includes(t.status)")
app_path.write_text(app,encoding='utf-8')

css_path=ROOT/'styles/video-node.css'
css=css_path.read_text(encoding='utf-8')
block="""

/* Live upstream diagnostics for async video tasks. */
.video-task-diagnostics-slot:empty{display:none}
.video-task-diagnostics-slot{margin:8px 0 10px}
.video-task-diagnostics{
  padding:8px 9px;
  border:1px solid #383838;
  border-radius:7px;
  background:#1f1f1f;
  color:#aaa;
  font:400 10px/14px var(--ui-font-sans);
}
.video-task-diagnostics-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
.video-task-diagnostics-head span{color:#8c8c8c}
.video-task-diagnostics-head b{color:#e0b35b;font-weight:600;text-align:right}
.video-task-diagnostics-meta{display:grid;gap:3px}
.video-task-diagnostics-meta span{min-width:0;display:grid;grid-template-columns:64px minmax(0,1fr);gap:6px}
.video-task-diagnostics-meta i{color:#747474;font-style:normal}
.video-task-diagnostics-meta code{color:#bdbdbd;font:500 9px/13px var(--ui-font-mono,monospace);overflow-wrap:anywhere;user-select:text}
.video-task-diagnostics-error{margin-top:6px;padding-top:6px;border-top:1px solid #323232;color:#d68b8b;overflow-wrap:anywhere;user-select:text}
"""
if '.video-task-diagnostics-slot:empty' not in css: css+=block
css_path.write_text(css,encoding='utf-8')

index_path=ROOT/'index.html'
index=index_path.read_text(encoding='utf-8')
index=index.replace('./styles/video-node.css\"','./styles/video-node.css?v='+APP_BUILD+'\"')
index=index.replace('browser-bootstrap.js?v='+RUNTIME_BUILD,'browser-bootstrap.js?v='+APP_BUILD)
index_path.write_text(index,encoding='utf-8')

models_path=ROOT/'models.html'
models=models_path.read_text(encoding='utf-8').replace('browser-bootstrap.js?v='+RUNTIME_BUILD,'browser-bootstrap.js?v='+APP_BUILD)
models_path.write_text(models,encoding='utf-8')

bootstrap_path=ROOT/'browser-bootstrap.js'
bootstrap=bootstrap_path.read_text(encoding='utf-8').replace("const v='"+RUNTIME_BUILD+"';","const v='"+APP_BUILD+"';")
bootstrap_path.write_text(bootstrap,encoding='utf-8')

cache_test=ROOT/'tests/video-result-cache-bust.test.mjs'
text=cache_test.read_text(encoding='utf-8')
text=text.replace("const APP_VERSION='"+RUNTIME_BUILD+"';","const APP_VERSION='"+APP_BUILD+"';")
text=text.replace("const BOOTSTRAP_VERSION='"+RUNTIME_BUILD+"';","const BOOTSTRAP_VERSION='"+APP_BUILD+"';")
cache_test.write_text(text,encoding='utf-8')

error_test=ROOT/'tests/video-error-reporting.test.mjs'
text=error_test.read_text(encoding='utf-8').replace('browser-bootstrap.js?v='+RUNTIME_BUILD,'browser-bootstrap.js?v='+APP_BUILD)
error_test.write_text(text,encoding='utf-8')

display_test=ROOT/'tests/browser-video-display-pipeline.test.mjs'
display_test.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');
const RUNTIME_BUILD='20260829-agnes-live-poll-4';
const APP_BUILD='20260831-video-task-diagnostics-1';

test('canvas deployment keeps runtime build while cache busting the application diagnostics code',()=>{
  for(const src of [index,models])assert.ok(src.includes(RUNTIME_BUILD),'missing current video runtime build id');
  assert.ok(index.includes(`browser-runtime.js?v=${RUNTIME_BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${APP_BUILD}`));
  assert.ok(models.includes(`browser-bootstrap.js?v=${APP_BUILD}`));
  assert.ok(bootstrap.includes(`const v='${APP_BUILD}'`));
  assert.ok(index.includes(`styles/video-node.css?v=${APP_BUILD}`));
  assert.doesNotMatch(index,/browser-runtime\.js\?v=20260829-agnes-poll-exact-1/);
});

test('browser media service worker bypasses stale HTTP cache',()=>{
  assert.ok(runtime.includes(`browser-media-sw.js?v=${RUNTIME_BUILD}`));
  assert.match(runtime,/updateViaCache:'none'/);
  assert.match(runtime,/registration\.update\(\)/);
});

test('downloaded generated videos get a playable MIME type before IndexedDB persistence',()=>{
  assert.match(runtime,/async function typedGeneratedVideoBlob\(blob,url,res\)/);
  assert.match(runtime,/ascii\.slice\(4,8\)===['\"]ftyp['\"]/);
  assert.match(runtime,/mime='video\/mp4'/);
  assert.match(runtime,/mime='video\/webm'/);
  assert.match(runtime,/storeMediaBlob\(typed,\{name:'generated-video'\}\)/);
});

test('canvas result URL resolver accepts IndexedDB media URLs in object fields and nested fields',()=>{
  const start=app.indexOf('function resolveGeneratedOutputUrl(output)');
  const end=app.indexOf('function semanticInputType',start);
  const section=app.slice(start,end>start?end:start+5000);
  const matches=section.match(/__browser_media/g)||[];
  assert.ok(matches.length>=3,'local browser media URL must be accepted for strings, direct object keys, and nested object paths');
  assert.match(section,/blob:/);
});
""",encoding='utf-8')

diag_test=ROOT/'tests/video-task-diagnostics.test.mjs'
diag_test.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-video-task-diagnostics-1';

test('provider success and result pending stay visually active',()=>{
  assert.match(app,/\['queued','polling','retrying','running','fallback','provider_succeeded','result_pending'\]/);
});

test('video nodes expose safe upstream task diagnostics',()=>{
  assert.match(app,/function taskDiagnosticSnapshot\(info=\{\}\)/);
  assert.match(app,/providerVideoId/);
  assert.match(app,/providerRawStatus/);
  assert.match(app,/providerProgress/);
  assert.match(app,/lastPollAt/);
  assert.match(app,/function videoTaskDiagnosticsHtml\(n\)/);
  assert.match(app,/data-video-task-diagnostics/);
  assert.match(app,/syncNodeTaskDiagnostics\(n,info\)/);
  assert.match(app,/syncNodeTaskDiagnostics\(n,created\.task\)/);
  const start=app.indexOf('function taskDiagnosticSnapshot');
  const end=app.indexOf('function videoTaskDiagnosticsHtml',start);
  const section=app.slice(start,end);
  assert.doesNotMatch(section,/providerCreateResponse|providerOutput|apiKey/i);
  assert.match(app,/Bearer \[redacted\]/);
});

test('task manager shows upstream diagnostics',()=>{
  assert.match(app,/taskDiagnosticSummary\(t\)/);
});

test('diagnostics styling and fresh app cache are deployed',()=>{
  assert.match(css,/\.video-task-diagnostics/);
  assert.ok(index.includes(`styles/video-node.css?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
});
""",encoding='utf-8')

print('patched video task diagnostics',APP_BUILD)
