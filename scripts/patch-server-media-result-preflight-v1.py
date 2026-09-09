from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'
SERVER = APP / 'server.js'
TEST = APP / 'tests' / 'server-media-result-preflight-v1.test.mjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def patch_server() -> None:
    text = SERVER.read_text(encoding='utf-8')

    if 'function resultPersistencePendingError(message,cause)' not in text:
        old = """async function materializeRemoteOutput(output,provider,modality=''){
  if(!output||output.type!=='url'||provider.downloadOutputs===false)return output;
  const value=String(output.value||'');if(value.startsWith('/media/')||value.startsWith('data:'))return output;
  if(!/^https?:\\/\\//i.test(value))return output;
  try{
    const sameProviderOrigin=isProviderOutputOrigin(provider,value);
    const headers=sameProviderOrigin?providerHeaders(provider):{};
    const policy=sameProviderOrigin?{allowCredentiallessCrossOriginRedirect:true}:{sameOrigin:false};
    const res=await fetchSafe(value,{method:'GET',headers,timeoutMs:120000},provider,policy);if(!res.ok)return output;
    const limit=modality==='video'?Math.max(MAX_UPLOAD_BYTES,250*1024*1024):MAX_UPLOAD_BYTES;
    const len=Number(res.headers.get('content-length')||0);if(len>limit)return output;
    const buf=Buffer.from(await res.arrayBuffer());if(buf.length>limit)return output;
    const ct=String(res.headers.get('content-type')||'').split(';')[0];const ext=safeExt(new URL(value).pathname,ct);const file=outFile(ext);fs.writeFileSync(file,buf);return {...output,sourceUrl:value,value:mediaUrl(file),persisted:true};
  }catch{return output}
}"""
        new = """function resultPersistencePendingError(message,cause){
  const error=new Error(message);error.code='RESULT_PENDING';if(cause)error.cause=cause;return error;
}
async function materializeRemoteOutput(output,provider,modality=''){
  if(!output||output.type!=='url'||provider.downloadOutputs===false)return output;
  const value=String(output.value||'');if(value.startsWith('/media/')||value.startsWith('data:'))return output;
  if(!/^https?:\\/\\//i.test(value))return output;
  const strictMedia=['image','video','audio'].includes(String(modality||'').toLowerCase());
  let lastError=null;
  for(let attempt=0;attempt<3;attempt++){
    if(attempt)await new Promise(resolve=>setTimeout(resolve,attempt===1?1200:3000));
    try{
      const sameProviderOrigin=isProviderOutputOrigin(provider,value);
      const headers=sameProviderOrigin?providerHeaders(provider):{};
      const policy=sameProviderOrigin?{allowCredentiallessCrossOriginRedirect:true}:{sameOrigin:false};
      const res=await fetchSafe(value,{method:'GET',headers,timeoutMs:120000},provider,policy);
      if(!res.ok)throw new Error(`结果文件下载失败 HTTP ${res.status}`);
      const limit=modality==='video'?Math.max(MAX_UPLOAD_BYTES,250*1024*1024):MAX_UPLOAD_BYTES;
      const len=Number(res.headers.get('content-length')||0);if(len>limit)throw new Error(`结果文件超过本地持久化限制 ${Math.round(limit/1024/1024)}MB`);
      const ct=String(res.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
      if(strictMedia&&(ct.startsWith('text/')||ct.includes('json')))throw new Error(`结果地址返回了 ${ct||'非媒体内容'}`);
      const buf=Buffer.from(await res.arrayBuffer());if(!buf.length)throw new Error('结果文件下载为空');if(buf.length>limit)throw new Error(`结果文件超过本地持久化限制 ${Math.round(limit/1024/1024)}MB`);
      const ext=safeExt(new URL(value).pathname,ct);const file=outFile(ext);fs.writeFileSync(file,buf);return {...output,sourceUrl:value,value:mediaUrl(file),persisted:true};
    }catch(error){lastError=error}
  }
  if(strictMedia)throw resultPersistencePendingError(`上游已生成成功，但结果文件尚未持久化到本地：${lastError?.message||lastError||'下载失败'}`,lastError);
  return output;
}"""
        text = replace_once(text, old, new, 'strict result persistence')

    if 'async function probeServerReference(part)' not in text:
        old = """async function appendServerXogpuPart(form,field,entry,total){const part=await serverReferenceBlob(entry),size=part.blob.size,max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);if(part.file&&['video','audio'].includes(entry.type)){try{const info=await probeMediaFile(part.file);if(info.duration&&(info.duration<2||info.duration>15))throw new Error(`XOGPU 参考${entry.type==='video'?'视频':'音频'}时长必须为 2-15 秒`)}catch(error){if(/时长必须/.test(String(error?.message||'')))throw error}}total.bytes+=size;total.files+=1;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件');form.append(field,part.blob,part.name)}"""
        new = """async function probeServerReference(part){
  if(part.file)return probeMediaFile(part.file);
  const ext=safeExt(part.name||'',String(part.blob?.type||'')),file=outFile(ext);fs.writeFileSync(file,Buffer.from(await part.blob.arrayBuffer()));
  try{return await probeMediaFile(file)}finally{try{fs.unlinkSync(file)}catch{}}
}
async function validateServerXogpuDuration(entry,part){if(!['video','audio'].includes(entry.type))return 0;const info=await probeServerReference(part),seconds=Number(info.duration||0);if(!Number.isFinite(seconds)||seconds<=0)throw new Error(`无法读取 XOGPU 参考${entry.type==='video'?'视频':'音频'}时长`);if(seconds<2||seconds>15)throw new Error(`XOGPU 参考${entry.type==='video'?'视频':'音频'}时长为 ${seconds.toFixed(2)} 秒，仅支持 2-15 秒`);return seconds}
async function validateServerXogpuFrameAspect(firstPart,lastPart){const [first,last]=await Promise.all([probeServerReference(firstPart),probeServerReference(lastPart)]),a=first.video,b=last.video;if(!a?.width||!a?.height||!b?.width||!b?.height)throw new Error('无法读取 XOGPU 首尾帧尺寸，已阻止提交');const ar=a.width/a.height,br=b.width/b.height,delta=Math.abs(ar-br)/Math.max(ar,br);if(delta>0.01)throw new Error(`首尾帧宽高比不一致（${a.width}x${a.height} vs ${b.width}x${b.height}），已在提交前阻止`);return{first:a,last:b}}
async function appendServerXogpuPart(form,field,entry,total,preparedPart=null){const part=preparedPart||await serverReferenceBlob(entry),size=part.blob.size,max=entry.type==='image'?10*1024*1024:entry.type==='video'?48*1024*1024:20*1024*1024;if(size>max)throw new Error(`XOGPU ${entry.type==='image'?'图片':entry.type==='video'?'视频':'音频'}单文件超过限制`);await validateServerXogpuDuration(entry,part);total.bytes+=size;total.files+=1;if(total.bytes>120*1024*1024)throw new Error('XOGPU 参考媒体总大小超过 120 MiB');if(total.files>12)throw new Error('XOGPU 参考媒体合计最多 12 个文件');form.append(field,part.blob,part.name)}"""
        text = replace_once(text, old, new, 'server XOGPU reference preflight')

        old_frames = """else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first);await appendServerXogpuPart(form,'input_reference',first,total);await appendServerXogpuPart(form,'end_reference',last,total)}else{"""
        new_frames = """else if(mode==='frames'){const first=images.find(x=>/first/.test(x.role))||images[0],last=images.find(x=>/last/.test(x.role))||images.find(x=>x!==first),firstPart=await serverReferenceBlob(first),lastPart=await serverReferenceBlob(last);await validateServerXogpuFrameAspect(firstPart,lastPart);await appendServerXogpuPart(form,'input_reference',first,total,firstPart);await appendServerXogpuPart(form,'end_reference',last,total,lastPart)}else{"""
        text = replace_once(text, old_frames, new_frames, 'server first-last aspect preflight')

    if "task.providerOutput?.type==='url'" not in text:
        old = """  const model=(provider.models||[]).find(m=>m.id===task.modelId&&m.modality===task.nodeType);
  if(!model)throw new Error('所选模型不存在，或模型类型与节点类型不匹配');
  assertTaskActive(task);taskLog(task,`开始执行：${provider.name} / ${model.name||model.id}`);"""
        new = """  const model=(provider.models||[]).find(m=>m.id===task.modelId&&m.modality===task.nodeType);
  if(!model)throw new Error('所选模型不存在，或模型类型与节点类型不匹配');
  if(task.providerStatus==='succeeded'&&task.resultStatus==='pending'&&task.providerOutput?.type==='url'){
    assertTaskActive(task);taskLog(task,'上游已经生成成功，仅重试结果文件持久化，不重新提交生成请求','warn');
    const output=await materializeRemoteOutput(task.providerOutput,provider,task.nodeType);
    updateTask(task,{status:'succeeded',progress:100,output,providerStatus:'succeeded',resultStatus:'saved',resultSavedAt:new Date().toISOString(),error:null,lastError:null});taskLog(task,'结果文件已持久化，任务完成');return;
  }
  assertTaskActive(task);taskLog(task,`开始执行：${provider.name} / ${model.name||model.id}`);"""
        text = replace_once(text, old, new, 'result-only retry branch')

        old_tail = """  assertTaskActive(task);output=await materializeRemoteOutput(output,provider,task.nodeType);
  updateTask(task,{status:'succeeded',progress:100,output,error:null});taskLog(task,'任务完成');"""
        new_tail = """  assertTaskActive(task);
  const mediaOutput=['image','video','audio'].includes(String(task.nodeType||'').toLowerCase())&&output?.type==='url';
  if(mediaOutput)updateTask(task,{providerStatus:'succeeded',resultStatus:'available',providerOutput:output,providerSucceededAt:task.providerSucceededAt||new Date().toISOString(),error:null});
  output=await materializeRemoteOutput(output,provider,task.nodeType);
  updateTask(task,{status:'succeeded',progress:100,output,error:null,...(mediaOutput?{providerStatus:'succeeded',resultStatus:'saved',resultSavedAt:new Date().toISOString(),lastError:null}:{})});taskLog(task,'任务完成');"""
        text = replace_once(text, old_tail, new_tail, 'mark provider success before persistence')

    SERVER.write_text(text, encoding='utf-8')


def write_test() -> None:
    TEST.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');

test('server media result persistence never silently falls back for generated media',()=>{
  assert.ok(server.includes("function resultPersistencePendingError(message,cause)"));
  assert.ok(server.includes("error.code='RESULT_PENDING'"));
  assert.ok(server.includes("for(let attempt=0;attempt<3;attempt++)"));
  assert.ok(server.includes("task.providerStatus==='succeeded'&&task.resultStatus==='pending'&&task.providerOutput?.type==='url'"));
  assert.ok(server.includes("仅重试结果文件持久化，不重新提交生成请求"));
  assert.ok(server.includes("providerOutput:output"));
});

test('server XOGPU duration preflight probes local, data and remote references',()=>{
  assert.ok(server.includes('async function probeServerReference(part)'));
  assert.ok(server.includes('async function validateServerXogpuDuration(entry,part)'));
  assert.ok(server.includes('seconds<2||seconds>15'));
  assert.ok(server.includes('await validateServerXogpuDuration(entry,part)'));
});

test('server XOGPU first-last frame aspect ratio is validated before append',()=>{
  assert.ok(server.includes('async function validateServerXogpuFrameAspect(firstPart,lastPart)'));
  assert.ok(server.includes('delta>0.01'));
  const start=server.indexOf("else if(mode==='frames')");
  const end=server.indexOf('}else{',start);
  const branch=server.slice(start,end>start?end:undefined);
  assert.ok(branch.includes('validateServerXogpuFrameAspect(firstPart,lastPart)'));
  assert.ok(branch.indexOf('validateServerXogpuFrameAspect')<branch.indexOf("appendServerXogpuPart(form,'input_reference'"));
});
""", encoding='utf-8')


patch_server()
write_test()
print('server media result/preflight v1 applied')
