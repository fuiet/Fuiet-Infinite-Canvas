from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
server_path = ROOT / 'server.js'
test_path = ROOT / 'tests' / 'desktop-video-poll-parity.test.mjs'
server = server_path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str):
    global server
    count = server.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    server = server.replace(old, new, 1)


replace_once(
"""    allowOutputWithoutTerminalStatus:raw.allowOutputWithoutTerminalStatus === true || old.allowOutputWithoutTerminalStatus === true,
    protocolFamily:String(raw.protocolFamily??raw.family??old.protocolFamily??old.family??'').trim(),""",
"""    allowOutputWithoutTerminalStatus:raw.allowOutputWithoutTerminalStatus === true || old.allowOutputWithoutTerminalStatus === true,
    strictPollPath:raw.strictPollPath === true || old.strictPollPath === true,
    protocolFamily:String(raw.protocolFamily??raw.family??old.protocolFamily??old.family??'').trim(),""",
'preserve strictPollPath in normalized desktop video config')

replace_once(
"""function standardVideoOutput(polled,config={}){return ProviderRuntimeCore.extractOutput(polled,config,'video');}
async function downloadStandardVideoContent(task,provider,config,taskId){""",
"""function standardVideoOutput(polled,config={}){return ProviderRuntimeCore.extractOutput(polled,config,'video');}
function providerVideoRouteUrl(provider,value){
  const text=String(value||'').trim();if(!text)return'';
  try{
    const candidate=/^https?:\\/\\//i.test(text)?text:joinUrl(provider.baseUrl,text);
    const baseOrigin=new URL(String(provider.baseUrl||'')).origin;
    const url=new URL(candidate);
    return url.origin===baseOrigin?url.toString():'';
  }catch{return''}
}
function standardVideoResponsePollUrl(created,provider,config={}){
  if(config.strictPollPath===true)return'';
  const value=firstDeepValue(created,[
    'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl',
    'data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl',
    'links.status','links.poll','links.self','task.status_url','task.poll_url'
  ]);
  return providerVideoRouteUrl(provider,value);
}
async function downloadStandardVideoContent(task,provider,config,taskId){""",
'add safe provider-response poll URL extraction')

replace_once(
"""  updateTask(task,{progress:8});
  let taskId='';
  const resume=payload._upstream&&payload._upstream.protocol==='standard-video-async-v1'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){taskId=String(resume.id);taskLog(task,`恢复标准视频任务：${taskId}`)}
  else{""",
"""  updateTask(task,{progress:8});
  let taskId='',activePollUrl='';
  const resume=payload._upstream&&payload._upstream.protocol==='standard-video-async-v1'&&payload._upstream.modelId===model.id?payload._upstream:null;
  if(resume?.id){
    taskId=String(resume.id);
    activePollUrl=config.strictPollPath===true?'':providerVideoRouteUrl(provider,resume.pollUrl);
    if(config.strictPollPath===true&&resume.pollUrl){payload._upstream={...resume,pollUrl:''};task.payload=payload;updateTask(task,{payload})}
    taskLog(task,`恢复标准视频任务：${taskId}`);
  }
  else{""",
'load only server-persisted safe poll URL on resume')

replace_once(
"""    taskId=standardVideoTaskId(created,config);
    if(!taskId)throw new Error('视频任务已提交，但响应中未找到任务 ID。可在供应商/模型高级配置中设置 taskIdPath。');
    payload._upstream={protocol:'standard-video-async-v1',modelId:model.id,id:String(taskId),createdAt:new Date().toISOString()};
    task.payload=payload;updateTask(task,{payload,progress:20});taskLog(task,`已持久化视频任务 ID：${taskId}`);""",
"""    taskId=standardVideoTaskId(created,config);
    if(!taskId)throw new Error('视频任务已提交，但响应中未找到任务 ID。可在供应商/模型高级配置中设置 taskIdPath。');
    activePollUrl=standardVideoResponsePollUrl(created,provider,config);
    payload._upstream={protocol:'standard-video-async-v1',modelId:model.id,id:String(taskId),pollUrl:activePollUrl||'',createdAt:new Date().toISOString()};
    task.payload=payload;updateTask(task,{payload,progress:20});taskLog(task,`已持久化视频任务 ID：${taskId}`);""",
'persist provider-derived same-origin poll URL')

replace_once(
"""    const pollCtx={...ctx,taskId};
    const pollTemplates=[...new Set([String(config.pollPath||'/v1/videos/{{taskId}}'),...(Array.isArray(config.pollPathCandidates)?config.pollPathCandidates:[])].filter(Boolean))];""",
"""    const pollCtx={...ctx,taskId};
    const pollTemplates=[...new Set([...(config.strictPollPath===true?[]:[activePollUrl]),String(config.pollPath||'/v1/videos/{{taskId}}'),...(Array.isArray(config.pollPathCandidates)?config.pollPathCandidates:[])].filter(Boolean))];""",
'prefer provider response poll URL unless route is strict')

replace_once(
"""    if(pathname==='/api/tasks'&&req.method==='POST'){
      const body=await readJson(req),now=new Date().toISOString();const task={id:uid('task_'),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),nodeType:String(body.nodeType||''),payload:body,output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:Math.max(0,Math.min(5,Number(body.maxRetries??1))),priority:Math.max(0,Math.min(100,Number(body.priority??50))),cancelRequested:false,logs:[]};""",
"""    if(pathname==='/api/tasks'&&req.method==='POST'){
      const body=await readJson(req),taskPayload={...body};delete taskPayload._upstream;
      const now=new Date().toISOString();const task={id:uid('task_'),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),nodeType:String(body.nodeType||''),payload:taskPayload,output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:Math.max(0,Math.min(5,Number(body.maxRetries??1))),priority:Math.max(0,Math.min(100,Number(body.priority??50))),cancelRequested:false,logs:[]};""",
'strip client-supplied upstream resume state')

server_path.write_text(server, encoding='utf-8')

test_path.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');

test('desktop video config preserves strict polling routes',()=>{
  assert.match(server,/strictPollPath:raw\.strictPollPath === true \|\| old\.strictPollPath === true/);
  assert.match(registry,/profile:'agnes:'\+modelId[\s\S]*strictPollPath:true/);
});

test('desktop accepts only same-origin provider response polling routes',()=>{
  assert.match(server,/function providerVideoRouteUrl\(provider,value\)/);
  assert.match(server,/return url\.origin===baseOrigin\?url\.toString\(\):''/);
  assert.match(server,/function standardVideoResponsePollUrl\(created,provider,config=\{\}\)/);
  assert.match(server,/'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl'/);
  assert.match(server,/if\(config\.strictPollPath===true\)return''/);
});

test('desktop persists and resumes provider-derived poll route but strict routes ignore it',()=>{
  assert.match(server,/pollUrl:activePollUrl\|\|''/);
  assert.match(server,/activePollUrl=config\.strictPollPath===true\?'':providerVideoRouteUrl\(provider,resume\.pollUrl\)/);
  assert.match(server,/config\.strictPollPath===true\?\[\]:\[activePollUrl\]/);
});

test('task creation strips client supplied upstream state',()=>{
  assert.match(server,/taskPayload=\{\.\.\.body\};delete taskPayload\._upstream/);
  assert.match(server,/payload:taskPayload/);
});
""", encoding='utf-8')

print('patched desktop video polling parity and wrote regression tests')
