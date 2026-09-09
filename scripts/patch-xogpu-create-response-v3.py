from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
core = root / 'provider-runtime-core.js'
preview = root / 'browser-runtime-preview.js'
router = root / 'browser-runtime.js'
index = root / 'index.html'
test_file = root / 'tests' / 'xogpu-create-response-v3.test.mjs'

src = core.read_text(encoding='utf-8')
anchor = """function findStringByPrefix(value,prefix,depth=0){\n  if(depth>6||value==null)return '';\n  if(typeof value==='string')return value.startsWith(prefix)?value:'';\n  if(Array.isArray(value)){\n    for(const item of value){const hit=findStringByPrefix(item,prefix,depth+1);if(hit)return hit;}\n    return '';\n  }\n  if(typeof value==='object'){\n    for(const item of Object.values(value)){const hit=findStringByPrefix(item,prefix,depth+1);if(hit)return hit;}\n  }\n  return '';\n}\n"""
helper = anchor + """function findNamedTaskId(value,depth=0,allowPlainId=false){\n  if(depth>8||value==null)return '';\n  if(Array.isArray(value)){\n    for(const item of value){const hit=findNamedTaskId(item,depth+1,true);if(hit)return hit;}\n    return '';\n  }\n  if(typeof value!=='object')return '';\n  const priority=['task_id','taskId','taskID','job_id','jobId','jobID','video_id','videoId','videoID','generation_id','generationId','request_id','requestId','task_uuid','taskUuid','job_uuid','jobUuid','video_uuid','videoUuid'];\n  for(const key of priority){const item=value[key];if((typeof item==='string'||typeof item==='number')&&String(item).trim())return String(item).trim();}\n  for(const key of ['task','job','video','generation']){const item=value[key];if((typeof item==='string'||typeof item==='number')&&String(item).trim())return String(item).trim();}\n  if(allowPlainId){const item=value.id;if((typeof item==='string'||typeof item==='number')&&String(item).trim())return String(item).trim();}\n  for(const [key,item] of Object.entries(value)){\n    if(item==null||typeof item!=='object')continue;\n    const childAllowsId=allowPlainId||/^(?:data|result|response|payload|task|job|video|generation|item)$/i.test(key);\n    const hit=findNamedTaskId(item,depth+1,childAllowsId);if(hit)return hit;\n  }\n  return '';\n}\nfunction findTaskPrefixId(value){\n  return findStringByPrefix(value,'task_')||findStringByPrefix(value,'video_task_');\n}\n"""
if 'function findNamedTaskId(' not in src:
    if anchor not in src:
        raise SystemExit('findStringByPrefix anchor not found')
    src = src.replace(anchor, helper, 1)

old_extract = """function extractTaskId(response,config={}){\n  const configured=firstPath(response,[config.taskIdPath,...(Array.isArray(config.taskIdPaths)?config.taskIdPaths:[])]);\n  if(configured!==undefined&&configured!==null&&configured!=='')return String(configured);\n  const common=firstPath(response,[\n    'id','task_id','taskId','request_id','requestId','job_id','jobId',\n    'data.id','data.task_id','data.taskId','data.request_id','data.job_id','data.jobId',\n    'task.id','job.id','result.id','result.task.id','result.job.id','video.id','data.video.id','data.task.id','data.job.id','result.task_id','result.taskId'\n  ]);\n  if(common===undefined||common===null||common===''){\n    const scalar=typeof response?.data==='string'||typeof response?.data==='number'?response.data:(typeof response?.result==='string'||typeof response?.result==='number'?response.result:undefined);\n    if(scalar!==undefined&&scalar!==null&&String(scalar).trim())return String(scalar);\n  }\n  return common!==undefined&&common!==null&&common!==''?String(common):findStringByPrefix(response,'video_task_');\n}\n"""
new_extract = """function extractTaskId(response,config={}){\n  const configured=firstPath(response,[config.taskIdPath,...(Array.isArray(config.taskIdPaths)?config.taskIdPaths:[])]);\n  if(configured!==undefined&&configured!==null&&configured!=='')return String(configured);\n  const common=firstPath(response,[\n    'id','task_id','taskId','taskID','request_id','requestId','job_id','jobId','video_id','videoId','generation_id','generationId','task_uuid','taskUuid','job_uuid','jobUuid',\n    'data.id','data.task_id','data.taskId','data.request_id','data.requestId','data.job_id','data.jobId','data.video_id','data.videoId','data.generation_id','data.generationId','data.task_uuid','data.taskUuid','data.job_uuid','data.jobUuid',\n    'task.id','task.task_id','task.taskId','job.id','job.task_id','job.taskId','job.job_id','job.jobId','video.id','video.task_id','video.taskId','generation.id','generation.task_id','generation.taskId',\n    'data.task.id','data.task.task_id','data.task.taskId','data.job.id','data.job.task_id','data.job.taskId','data.video.id','data.video.task_id','data.video.taskId','data.generation.id','data.generation.task_id','data.generation.taskId',\n    'result.id','result.task_id','result.taskId','result.job_id','result.jobId','result.video_id','result.videoId','result.task.id','result.task.task_id','result.task.taskId','result.job.id','result.job.task_id','result.job.taskId',\n    'response.id','response.task_id','response.taskId','payload.id','payload.task_id','payload.taskId','0.id','0.task_id','0.taskId'\n  ]);\n  if(common!==undefined&&common!==null&&common!=='')return String(common);\n  const scalar=typeof response?.data==='string'||typeof response?.data==='number'?response.data:(typeof response?.result==='string'||typeof response?.result==='number'?response.result:undefined);\n  if(scalar!==undefined&&scalar!==null&&String(scalar).trim())return String(scalar);\n  const named=findNamedTaskId(response,0,true);if(named)return named;\n  return findTaskPrefixId(response);\n}\n"""
if old_extract in src:
    src = src.replace(old_extract, new_extract, 1)
elif "return findTaskPrefixId(response);" not in src:
    raise SystemExit('extractTaskId anchor not found')
core.write_text(src, encoding='utf-8')

psrc = preview.read_text(encoding='utf-8')
old_error = "if(!taskId){const error=new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果；为避免重复扣费不会自动重新提交');error.noRetry=true;throw error}"
new_error = "if(!taskId){const responsePreview=(()=>{try{let text=JSON.stringify(created.value);text=text.replace(/(\\\"(?:authorization|api[_-]?key|token|secret)\\\"\\s*:\\s*\\\")[^\\\"]*(\\\")/gi,'$1[redacted]$2');return text.length>700?text.slice(0,700)+'…':text}catch{return''}})();const error=new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果；为避免重复扣费不会自动重新提交'+(responsePreview?`；创建响应：${responsePreview}`:''));error.noRetry=true;error.providerCreateResponse=created.value;throw error}"
if old_error in psrc:
    psrc = psrc.replace(old_error, new_error, 1)
elif 'error.providerCreateResponse=created.value' not in psrc:
    raise SystemExit('preview missing-task-id anchor not found')
preview.write_text(psrc, encoding='utf-8')

rsrc = router.read_text(encoding='utf-8')
old_preview_cache = './browser-runtime-preview.js?v=20260908-xogpu-discount-studio-2'
new_preview_cache = './browser-runtime-preview.js?v=20260909-xogpu-create-response-3'
if old_preview_cache in rsrc:
    rsrc = rsrc.replace(old_preview_cache,new_preview_cache,1)
elif new_preview_cache not in rsrc:
    raise SystemExit('browser preview cache key anchor not found')
router.write_text(rsrc, encoding='utf-8')

html = index.read_text(encoding='utf-8')
repls = {
    './provider-runtime-core.js?v=20260901-video-wait-progress-1': './provider-runtime-core.js?v=20260909-xogpu-create-response-3',
    './browser-runtime.js?v=20260902-xogpu-baseline-runtime-1': './browser-runtime.js?v=20260909-xogpu-create-response-3',
}
for old,new in repls.items():
    if old in html:
        html = html.replace(old,new,1)
    elif new not in html:
        raise SystemExit(f'cache key anchor not found: {old}')
index.write_text(html, encoding='utf-8')

test_file.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSrc=fs.readFileSync(new URL('../provider-runtime-core.js',import.meta.url),'utf8');
const sandbox={};sandbox.globalThis=sandbox;vm.runInNewContext(coreSrc,sandbox,{filename:'provider-runtime-core.js'});
const Core=sandbox.CanvasProviderRuntimeCore;

test('extracts XOGPU task id from nested uncommon create response shapes',()=>{
  assert.equal(Core.extractTaskId({data:{job:{taskId:'task_nested_1'}}}), 'task_nested_1');
  assert.equal(Core.extractTaskId({payload:{generation_id:'task_generation_2'}}), 'task_generation_2');
  assert.equal(Core.extractTaskId([{id:'task_array_3'}]), 'task_array_3');
  assert.equal(Core.extractTaskId({ok:true,job:{uuid:'task_uuid_4'}}), 'task_uuid_4');
  assert.equal(Core.extractTaskId({ok:true,envelope:{anything:'task_prefixed_5'}}), 'task_prefixed_5');
});

test('does not mistake unrelated nested user id for a task id',()=>{
  assert.equal(Core.extractTaskId({user:{id:'user_123'},ok:true}), '');
});

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
test('missing task id error includes a sanitized create response preview for diagnostics',()=>{
  assert.match(preview,/创建响应/);
  assert.match(preview,/\[redacted\]/);
});

const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
test('router loads the new preview runtime version',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-create-response-3/);
});

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('browser cache keys are bumped for XOGPU create-response parser',()=>{
  assert.match(html,/provider-runtime-core\.js\?v=20260909-xogpu-create-response-3/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-create-response-3/);
});
""", encoding='utf-8')
