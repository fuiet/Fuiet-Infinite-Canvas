from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
server_path=ROOT/'server.js'
test_path=ROOT/'tests'/'remote-output-persistence.test.mjs'
server=server_path.read_text(encoding='utf-8')


def replace_once(old,new,label):
    global server
    count=server.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    server=server.replace(old,new,1)


replace_once(
"""async function materializeRemoteOutput(output,provider){
  if(!output||output.type!=='url'||provider.downloadOutputs===false)return output;
  const value=String(output.value||'');if(value.startsWith('/media/')||value.startsWith('data:'))return output;
  if(!/^https?:\\/\\//i.test(value))return output;
  try{
    const res=await fetchSafe(value,{method:'GET',headers:{},timeoutMs:120000},provider,{sameOrigin:false});if(!res.ok)return output;
    const len=Number(res.headers.get('content-length')||0);if(len>MAX_UPLOAD_BYTES)return output;
    const buf=Buffer.from(await res.arrayBuffer());if(buf.length>MAX_UPLOAD_BYTES)return output;
    const ct=String(res.headers.get('content-type')||'').split(';')[0];const ext=safeExt(new URL(value).pathname,ct);const file=outFile(ext);fs.writeFileSync(file,buf);return {...output,sourceUrl:value,value:mediaUrl(file)};
  }catch{return output}
}""",
"""function isProviderOutputOrigin(provider,value){
  try{return Boolean(provider?.baseUrl)&&new URL(String(value||'')).origin===new URL(String(provider.baseUrl)).origin}catch{return false}
}
async function materializeRemoteOutput(output,provider,modality=''){
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
}""",
'authenticate same-origin output downloads without leaking credentials cross-origin')

replace_once(
"""  assertTaskActive(task);output=await materializeRemoteOutput(output,provider);
  updateTask(task,{status:'succeeded',progress:100,output,error:null});taskLog(task,'任务完成');""",
"""  assertTaskActive(task);output=await materializeRemoteOutput(output,provider,task.nodeType);
  updateTask(task,{status:'succeeded',progress:100,output,error:null});taskLog(task,'任务完成');""",
'pass modality to output persistence')

server_path.write_text(server,encoding='utf-8')

test_path.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');

test('remote output persistence authenticates only provider-origin downloads',()=>{
  assert.match(server,/function isProviderOutputOrigin\(provider,value\)/);
  assert.match(server,/sameProviderOrigin\?providerHeaders\(provider\):\{\}/);
  assert.match(server,/sameProviderOrigin\?\{allowCredentiallessCrossOriginRedirect:true\}:\{sameOrigin:false\}/);
});

test('provider credentials are stripped before a same-origin result redirect reaches a CDN',()=>{
  assert.match(server,/allowCredentiallessCrossOriginRedirect:true/);
  assert.match(server,/sanitizeHeaderObject\(requestOptions\.headers\|\|\{\}\)/);
});

test('remote video persistence uses the same 250MB floor as explicit video content downloads',()=>{
  assert.match(server,/modality==='video'\?Math\.max\(MAX_UPLOAD_BYTES,250\*1024\*1024\):MAX_UPLOAD_BYTES/);
  assert.match(server,/materializeRemoteOutput\(output,provider,task\.nodeType\)/);
  assert.match(server,/value:mediaUrl\(file\),persisted:true/);
});
""",encoding='utf-8')

print('patched authenticated remote output persistence and video persistence limit')
