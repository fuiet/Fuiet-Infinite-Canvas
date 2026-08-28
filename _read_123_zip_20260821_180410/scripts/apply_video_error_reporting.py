from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')
def replace_once(text,old,new,label):
    if old not in text: raise SystemExit(f'{label}: target not found')
    return text.replace(old,new,1)

# 1) Frontend: recursively render structured errors instead of [object Object].
app=read('app.js')
old="""  function errorText(value){
    if(value==null)return'';
    if(typeof value==='string')return value;
    if(value instanceof Error)return value.message||String(value);
    if(typeof value==='object')return String(value.message||value.error||value.detail||value.reason||value.msg||value.title||'').trim()||JSON.stringify(value);
    return String(value);
  }
"""
new="""  function errorText(value,depth=0){
    if(value==null||depth>8)return'';
    if(typeof value==='string'){const text=value.trim();return text==='[object Object]'?'':text}
    if(value instanceof Error){return errorText(value.message,depth+1)||errorText(value.cause,depth+1)||String(value.name||'Error')}
    if(Array.isArray(value))return value.map(item=>errorText(item,depth+1)).filter(Boolean).join('；');
    if(typeof value==='object'){
      for(const key of ['message','error','detail','reason','msg','title','body','response','data']){const text=errorText(value[key],depth+1);if(text)return text}
      try{return JSON.stringify(value)}catch{return''}
    }
    return String(value);
  }
  function taskFailureText(task){
    if(!task)return'';
    const base=errorText(task.error)||errorText(task.errorDetail)||errorText(task.detail);
    const request=task.videoRequestDiagnostics||{},protocol=task.videoProtocolDiagnostics||{};
    let stage='';
    if(protocol.pollUrl){try{stage=`轮询 ${new URL(protocol.pollUrl,location.href).pathname}`}catch{stage='轮询视频任务'}}
    else if(request.createPath)stage=`创建 ${request.createPath}${request.transport?` · ${request.transport}`:''}`;
    return base&&stage?`${base} [${stage}]`:(base||stage);
  }
"""
app=replace_once(app,old,new,'app recursive errorText')
old="n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=info.error||'';saveState();scheduleWorkflowVisualUpdate();"
new="n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=taskFailureText(info);saveState();scheduleWorkflowVisualUpdate();"
app=replace_once(app,old,new,'monitor task error text')
old="if(['failed','canceled'].includes(info.status))throw new Error(info.status==='canceled'?'任务已取消':info.error||'生成失败');"
new="if(['failed','canceled'].includes(info.status))throw new Error(info.status==='canceled'?'任务已取消':taskFailureText(info)||'生成失败');"
app=replace_once(app,old,new,'monitor task failure throw')
old="else if(['failed','canceled'].includes(created.task.status))throw new Error(created.task.error||'生成失败');"
new="else if(['failed','canceled'].includes(created.task.status))throw new Error(taskFailureText(created.task)||'生成失败');"
app=replace_once(app,old,new,'created task failure throw')
old="}catch(err){lastError=err;n.taskStatus=err.message==='任务已取消'?'canceled':'failed';n.taskError=err.message;saveState();render();if(err.message==='任务已取消')break;if(ai<chain.length-1){"
new="}catch(err){const errMsg=errorText(err)||'生成失败';lastError=new Error(errMsg);n.taskStatus=errMsg==='任务已取消'?'canceled':'failed';n.taskError=errMsg;saveState();render();if(errMsg==='任务已取消')break;if(ai<chain.length-1){"
app=replace_once(app,old,new,'generate catch normalization')
write('app.js',app)

# 2) Browser runtime: preserve upstream HTTP responses through the Cloudflare proxy.
# The caller (providerJson) must see 400/415/422 so video protocol fallback continues.
runtime=read('browser-runtime.js')
anchor="const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));\n"
helper="""const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function runtimeErrorText(value,depth=0){
  if(value==null||depth>8)return'';
  if(typeof value==='string'){const text=value.trim();return text==='[object Object]'?'':text}
  if(value instanceof Error)return runtimeErrorText(value.message,depth+1)||runtimeErrorText(value.cause,depth+1)||String(value.name||'Error');
  if(Array.isArray(value))return value.map(item=>runtimeErrorText(item,depth+1)).filter(Boolean).join('；');
  if(typeof value==='object'){
    for(const key of ['message','error','detail','reason','msg','title','body','response','data']){const text=runtimeErrorText(value[key],depth+1);if(text)return text}
    try{return JSON.stringify(value)}catch{return''}
  }
  return String(value);
}
"""
runtime=replace_once(runtime,anchor,helper,'runtime error helper')
old="""  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method:String(init.method||'GET').toUpperCase(),headers,...packed})});
  if(!res.ok){let d={};try{d=await res.clone().json()}catch{}if(res.status>=500||d.error)throw new Error(d.error||`代理请求失败 ${res.status}`)}
  return res;
"""
new="""  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method:String(init.method||'GET').toUpperCase(),headers,...packed})});
  // Do not throw on upstream HTTP errors here. The proxy intentionally mirrors the
  // upstream status/body; providerJson must receive that status so protocol fallback
  // can react to 400/404/405/415/422 instead of losing it inside a generic Error.
  return res;
"""
runtime=replace_once(runtime,old,new,'proxy preserves upstream status')
old="async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=parsed.kind==='json'?(parsed.value?.error?.message||parsed.value?.message||JSON.stringify(parsed.value)):String(parsed.value||'');const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;throw err}return parsed}"
new="async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=runtimeErrorText(parsed.value);const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;throw err}return parsed}"
runtime=replace_once(runtime,old,new,'provider structured error')
old="async function runTask(task){\n  try{return await executeTask(task)}catch(error){const current=findTask(task.id)||task,attempt=Number(current.attempt||0),max=Number(current.maxRetries??1);if(!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,error:String(error.message||error)});pump();return}return updateTask(task.id,{status:current.cancelRequested?'canceled':'failed',error:String(error.message||error),progress:current.progress||0})}\n}"
new="async function runTask(task){\n  try{return await executeTask(task)}catch(error){const current=findTask(task.id)||task,attempt=Number(current.attempt||0),max=Number(current.maxRetries??1),message=runtimeErrorText(error)||'生成失败',detail=runtimeErrorText(error?.detail);const failurePatch={error:message,...(Number.isFinite(Number(error?.status))?{errorStatus:Number(error.status)}:{}),...(detail?{errorDetail:detail}:{})};if(!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,...failurePatch});pump();return}return updateTask(task.id,{status:current.cancelRequested?'canceled':'failed',...failurePatch,progress:current.progress||0})}\n}"
runtime=replace_once(runtime,old,new,'runtime task error persistence')
write('browser-runtime.js',runtime)

# 3) Real cache bust. The previous video protocol patch changed these files but the
# entry HTML kept older query versions, so browsers could continue executing stale JS.
version='20260828-video-error-reporting-1'
index=read('index.html')
for filename in ['provider-adapter-contract.js','provider-runtime-core.js','video-request-parameters.js','browser-runtime.js','browser-bootstrap.js']:
    prefix=f'<script src="./{filename}?v='
    start=index.find(prefix)
    if start<0: raise SystemExit(f'index cache target missing: {filename}')
    value_start=start+len(prefix)
    value_end=index.find('"',value_start)
    index=index[:value_start]+version+index[value_end:]
write('index.html',index)
boot=read('browser-bootstrap.js')
import re
boot,n=re.subn(r"const v='[^']+';",f"const v='{version}';",boot,count=1)
if n!=1: raise SystemExit('bootstrap cache version target missing')
write('browser-bootstrap.js',boot)

# 4) Regression contract.
test=ROOT/'tests'/'video-error-reporting.test.mjs'
test.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('structured task errors never collapse to object Object',()=>{
  assert.match(app,/function errorText\(value,depth=0\)/);
  assert.match(app,/taskFailureText\(info\)/);
  assert.match(app,/taskFailureText\(created\.task\)/);
  assert.match(app,/text==='\\[object Object\\]'\?'':text/);
});

test('proxy preserves upstream HTTP status for adaptive video fallback',()=>{
  assert.match(runtime,/Do not throw on upstream HTTP errors here/);
  assert.doesNotMatch(runtime,/if\(!res\.ok\)\{let d=\{\}/);
  assert.match(runtime,/err\.status=res\.status/);
  assert.match(runtime,/runtimeErrorText\(parsed\.value\)/);
});

test('task failure persistence keeps status and detail',()=>{
  assert.match(runtime,/errorStatus:Number\(error\.status\)/);
  assert.match(runtime,/errorDetail:detail/);
});

test('all adaptive video protocol assets are actually cache busted',()=>{
  for(const file of ['provider-adapter-contract.js','provider-runtime-core.js','video-request-parameters.js','browser-runtime.js','browser-bootstrap.js']){
    assert.ok(index.includes(`${file}?v=20260828-video-error-reporting-1`),file);
  }
});
""",encoding='utf-8')
print('video error reporting and proxy status repair applied')
