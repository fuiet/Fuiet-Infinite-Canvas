from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-provider-rate-limit-1'
BUILD='20260831-agnes-poll-nocache-1'

def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

p=ROOT/'browser-runtime.js'
text=p.read_text(encoding='utf-8')
text=rep(text,
"async function providerFetch(url,init={}){\n  try{\n    return await rawFetch(url,{...init,mode:'cors',redirect:'follow'});\n  }catch(error){",
"async function providerFetch(url,init={}){\n  const method=String(init.method||'GET').toUpperCase();\n  const fetchInit={...init,mode:'cors',redirect:'follow',...(['GET','HEAD'].includes(method)?{cache:'no-store'}:{})};\n  try{\n    return await rawFetch(url,fetchInit);\n  }catch(error){",
'provider GET no-store')

old_poll="async function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){try{return{parsed:await providerJson(provider,url,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url}}catch(error){last=error;if(![404,405].includes(Number(error?.status)))throw error}}throw last||new Error('没有可用的视频任务轮询接口')}"
new_poll="function freshVideoPollUrl(url,route){const profile=String(route?.protocolProfile||route?.profile||''),family=String(route?.protocolFamily||route?.family||'');if(family!=='agnes-video'&&!profile.startsWith('agnes:'))return String(url);try{const u=new URL(String(url));u.searchParams.set('_canvas_poll',String(Date.now()));return u.toString()}catch{return String(url)}}\nasync function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){last=error;if(![404,405].includes(Number(error?.status)))throw error}}throw last||new Error('没有可用的视频任务轮询接口')}"
text=rep(text,old_poll,new_poll,'fresh Agnes poll URL')

text=rep(text,
"const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;\n        updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}});",
"const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;\n        updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,lastPollRequestUrl:result.requestUrl||activePollUrl,pollCandidates}});",
'poll request diagnostics')

# Refresh provider IDs from each Agnes poll response so diagnostics reflect the actual object being queried.
text=rep(text,
"const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,modality):{state:'pending',output:null};\n    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress)});",
"const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,modality):{state:'pending',output:null};\n    const pollVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['video_id','videoId','data.video_id','data.videoId']):'';\n    const pollTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(polled.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';\n    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),...(pollVideoId?{providerVideoId:String(pollVideoId)}:{}),...(pollTaskId?{providerTaskId:String(pollTaskId)}:{}),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress)});",
'poll response IDs')

text=text.replace(OLD,BUILD)
p.write_text(text,encoding='utf-8')

for name in ['index.html','models.html','browser-bootstrap.js']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')

for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s:
        fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

(ROOT/'tests'/'agnes-poll-cache.test.mjs').write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-agnes-poll-nocache-1';

test('provider GET and HEAD requests bypass browser HTTP cache',()=>{
  assert.match(runtime,/const fetchInit=\{\.\.\.init,mode:'cors',redirect:'follow',\.\.\.\(\['GET','HEAD'\]\.includes\(method\)\?\{cache:'no-store'\}:\{\}\)\}/);
  assert.match(runtime,/rawFetch\(url,fetchInit\)/);
});

test('Agnes polling gets a fresh cache-busting query on every request',()=>{
  assert.match(runtime,/function freshVideoPollUrl\(url,route\)/);
  assert.match(runtime,/family!=='agnes-video'/);
  assert.match(runtime,/searchParams\.set\('_canvas_poll',String\(Date\.now\(\)\)\)/);
  assert.match(runtime,/const requestUrl=freshVideoPollUrl\(url,route\)/);
});

test('poll diagnostics preserve canonical URL and actual fresh request URL',()=>{
  assert.match(runtime,/return\{parsed:await providerJson\(provider,requestUrl/);
  assert.match(runtime,/lastPollRequestUrl:result\.requestUrl\|\|activePollUrl/);
});

test('poll response refreshes provider video and task ids',()=>{
  assert.match(runtime,/const pollVideoId=/);
  assert.match(runtime,/providerVideoId:String\(pollVideoId\)/);
  assert.match(runtime,/const pollTaskId=/);
  assert.match(runtime,/providerTaskId:String\(pollTaskId\)/);
});

test('fresh browser runtime build is deployed',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${BUILD}`));
});
""",encoding='utf-8')

print('patched Agnes poll cache',BUILD)
# retrigger: stale direct-fetch regression assertion has been updated on main
