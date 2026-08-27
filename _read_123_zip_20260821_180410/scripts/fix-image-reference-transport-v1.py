from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/'server.js'
WORKER=ROOT/'dist/server/secure-index.js'
TEST=ROOT/'tests'/'image-reference-transport.test.mjs'


def replace_once(text, old, new, label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old,new,1)


def replace_function(text, marker, new_code):
    start=text.find(marker)
    if start<0: raise SystemExit(f'function marker not found: {marker}')
    paren=text.find('(',start)
    if paren<0: raise SystemExit(f'function parameters not found: {marker}')
    depth=0;state='normal';quote='';i=paren;signature_end=-1
    while i<len(text):
        c=text[i];n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal';i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal';quote=''
        else:
            if c in "'\"`": state='string';quote=c
            elif c=='/' and n=='/': state='line';i+=1
            elif c=='/' and n=='*': state='block';i+=1
            elif c=='(': depth+=1
            elif c==')':
                depth-=1
                if depth==0: signature_end=i;break
        i+=1
    if signature_end<0: raise SystemExit(f'function signature not closed: {marker}')
    brace=text.find('{',signature_end+1)
    if brace<0: raise SystemExit(f'opening brace not found: {marker}')
    depth=0;i=brace;state='normal';quote=''
    while i<len(text):
        c=text[i];n=text[i+1] if i+1<len(text) else ''
        if state=='line':
            if c=='\n': state='normal'
        elif state=='block':
            if c=='*' and n=='/': state='normal';i+=1
        elif state=='string':
            if c=='\\': i+=1
            elif c==quote: state='normal';quote=''
        else:
            if c in "'\"`": state='string';quote=c
            elif c=='/' and n=='/': state='line';i+=1
            elif c=='/' and n=='*': state='block';i+=1
            elif c=='{': depth+=1
            elif c=='}':
                depth-=1
                if depth==0:return text[:start]+new_code+text[i+1:]
        i+=1
    raise SystemExit(f'unclosed function: {marker}')

server=SERVER.read_text(encoding='utf-8')
node_image_code=r'''function imageFileName(index,mime='image/png'){
  const ext=String(mime).includes('jpeg')?'.jpg':String(mime).includes('webp')?'.webp':String(mime).includes('gif')?'.gif':'.png';
  return `reference-${index+1}${ext}`;
}
async function imageReferenceBlob(provider,ref,index){
  const value=String(ref?.url||ref?.value||'').trim();
  if(!value)throw new Error('参考图片缺少可用 URL');
  if(value.startsWith('data:')){
    const match=value.match(/^data:([^;,]+)?;base64,(.*)$/s);if(!match)throw new Error('参考图片 data URL 格式无效');
    const mime=match[1]||'image/png';const bytes=Buffer.from(match[2],'base64');
    if(!bytes.length)throw new Error('参考图片内容为空');
    return {blob:new Blob([bytes],{type:mime}),filename:ref?.name||imageFileName(index,mime)};
  }
  if(value.startsWith('/media/')){
    const file=mediaPathFromUrl(value);const bytes=fs.readFileSync(file);const mime=String(ref?.mime||'image/png');
    return {blob:new Blob([bytes],{type:mime}),filename:ref?.name||path.basename(file)||imageFileName(index,mime)};
  }
  if(!/^https?:\/\//i.test(value))throw new Error('OpenAI 图片编辑只接受可读取的图片 URL、data URL 或本地媒体');
  const base=new URL(provider.baseUrl),target=new URL(value);let res;
  if(target.origin===base.origin){
    const headers=providerHeaders(provider);delete headers['Content-Type'];delete headers['content-type'];
    res=await fetchSafe(value,{method:'GET',headers,timeoutMs:120000},provider,{allowCredentiallessCrossOriginRedirect:true});
  }else res=await fetchSafe(value,{method:'GET',headers:{},timeoutMs:120000},{},{sameOrigin:false});
  if(!res.ok)throw new Error(`参考图片下载失败 HTTP ${res.status}`);
  const mime=String(res.headers.get('content-type')||ref?.mime||'image/png').split(';')[0].trim();const bytes=Buffer.from(await res.arrayBuffer());
  if(!bytes.length)throw new Error('参考图片下载结果为空');
  return {blob:new Blob([bytes],{type:mime}),filename:ref?.name||imageFileName(index,mime)};
}
function appendImageEditParams(form,parameters={}){
  const allowed=['n','size','quality','background','output_format','output_compression','input_fidelity','moderation','user'];
  for(const key of allowed){const value=parameters?.[key];if(value!==undefined&&value!==null&&value!=='')form.append(key,String(value));}
  const extra=parameters?.supplierParams||parameters?.providerParams;
  if(extra&&typeof extra==='object'&&!Array.isArray(extra))for(const [key,value] of Object.entries(extra))if(value!==undefined&&value!==null&&['string','number','boolean'].includes(typeof value))form.append(key,String(value));
}
async function executeOpenAIImage(task, provider, model, payload) {
  updateTask(task,{progress:10});
  const refs=(payload.references||[]).filter(x=>String(x?.type||x?.kind||'image').toLowerCase()==='image'&&(x?.url||x?.value));
  let data;
  if(refs.length){
    const form=new FormData();form.append('model',model.id);form.append('prompt',payload.prompt||'');appendImageEditParams(form,payload.parameters||{});
    const parts=[];for(let i=0;i<refs.length;i++)parts.push(await imageReferenceBlob(provider,refs[i],i));
    const field=parts.length>1?'image[]':'image';for(const part of parts)form.append(field,part.blob,part.filename);
    const headers=providerHeaders(provider);delete headers['Content-Type'];delete headers['content-type'];
    const editUrl=joinUrl(provider.baseUrl,'/v1/images/edits');
    const res=await fetchSafe(editUrl,{method:'POST',headers,body:form,timeoutMs:180000},provider);
    const text=await res.text();try{data=text?JSON.parse(text):{}}catch{throw new Error(`图片编辑返回了无效 JSON：${text.slice(0,300)}`)}
    if(!res.ok)throw new Error(`图片编辑失败 HTTP ${res.status}：${String(data?.error?.message||data?.message||text).slice(0,500)}`);
  }else{
    const body={model:model.id,prompt:payload.prompt||'',n:payload.parameters?.count||payload.parameters?.n||1};
    if(payload.parameters?.size)body.size=payload.parameters.size;
    if(payload.parameters?.aspectRatio)body.aspect_ratio=payload.parameters.aspectRatio;
    for(const key of ['quality','background','output_format','output_compression','moderation','user'])if(payload.parameters?.[key]!=null)body[key]=payload.parameters[key];
    data=await fetchJson(joinUrl(provider.baseUrl,'/v1/images/generations'),{method:'POST',headers:providerHeaders(provider),body:JSON.stringify(body),timeoutMs:120000,provider});
  }
  const url=deepGet(data,'data.0.url'),b64=deepGet(data,'data.0.b64_json');
  if(url)return normalizeOutput(url,'image',provider);
  if(b64)return normalizeOutput(`data:image/png;base64,${b64}`,'image',provider);
  return normalizeOutput(data,'image',provider);
}'''
server=replace_function(server,'async function executeOpenAIImage(',node_image_code)
SERVER.write_text(server,encoding='utf-8')

worker=WORKER.read_text(encoding='utf-8')
worker_helper=r'''function workerImageFileName(index,mime='image/png'){
  const ext=String(mime).includes('jpeg')?'.jpg':String(mime).includes('webp')?'.webp':String(mime).includes('gif')?'.gif':'.png';
  return `reference-${index+1}${ext}`;
}
async function workerImageReferenceBlob(provider,model,ref,index,env){
  const value=String(ref?.url||ref?.value||'').trim();if(!value)throw new Error('参考图片缺少可用 URL');
  if(value.startsWith('data:')){
    const match=value.match(/^data:([^;,]+)?;base64,(.*)$/s);if(!match)throw new Error('参考图片 data URL 格式无效');
    const mime=match[1]||'image/png';const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));if(!bytes.length)throw new Error('参考图片内容为空');
    return {blob:new Blob([bytes],{type:mime}),filename:ref?.name||workerImageFileName(index,mime)};
  }
  if(!/^https?:\/\//i.test(value))throw new Error('OpenAI 图片编辑只接受可读取的图片 URL 或 data URL');
  const base=validateOutboundUrl(provider.baseUrl,provider,env),target=validateOutboundUrl(value,targetOriginProvider(value,provider,env),env);let res;
  if(target.origin===base.origin){
    const headers=buildHeaders(provider,model);headers.delete('content-type');
    res=await safeProviderFetch(provider,value,{method:'GET',headers,timeoutMs:120000},env,{allowCredentiallessCrossOriginRedirect:true});
  }else res=await safePublicFetch(value,{method:'GET',headers:{},timeoutMs:120000},env);
  if(!res.ok)throw new Error(`参考图片下载失败 HTTP ${res.status}`);
  const mime=String(res.headers.get('content-type')||ref?.mime||'image/png').split(';')[0].trim();const bytes=new Uint8Array(await res.arrayBuffer());if(!bytes.length)throw new Error('参考图片下载结果为空');
  return {blob:new Blob([bytes],{type:mime}),filename:ref?.name||workerImageFileName(index,mime)};
}
function targetOriginProvider(value,provider,env){
  try{return new URL(value).origin===new URL(provider.baseUrl).origin?provider:{}}catch{return {}}
}
function appendWorkerImageEditParams(form,parameters={}){
  const allowed=['n','size','quality','background','output_format','output_compression','input_fidelity','moderation','user'];
  for(const key of allowed){const value=parameters?.[key];if(value!==undefined&&value!==null&&value!=='')form.append(key,String(value));}
  const extra=parameters?.supplierParams||parameters?.providerParams;
  if(extra&&typeof extra==='object'&&!Array.isArray(extra))for(const [key,value] of Object.entries(extra))if(value!==undefined&&value!==null&&['string','number','boolean'].includes(typeof value))form.append(key,String(value));
}
async function submitOpenAIImageEditRequest(task,provider,model,references,env){
  const imageRefs=references.filter(x=>String(x?.type||x?.kind||'image').toLowerCase()==='image'&&(x?.url||x?.value));
  if(!imageRefs.length)return null;
  const form=new FormData();form.append('model',model.id);form.append('prompt',String(task.payload?.prompt||''));appendWorkerImageEditParams(form,task.payload?.parameters||{});
  const parts=[];for(let i=0;i<imageRefs.length;i++)parts.push(await workerImageReferenceBlob(provider,model,imageRefs[i],i,env));
  const field=parts.length>1?'image[]':'image';for(const part of parts)form.append(field,part.blob,part.filename);
  const url=resolveProviderUrl(provider,'/v1/images/edits',env);const headers=buildHeaders(provider,model);headers.delete('content-type');
  const res=await safeProviderFetch(provider,url,{method:'POST',headers,body:form,timeoutMs:180000},env);
  return {url,res};
}
'''
worker=replace_once(worker,'async function submitTask(task, request, env, ctx) {',worker_helper+'async function submitTask(task, request, env, ctx) {','insert Worker image edit helpers')
old_submit="""  const context = { model: model.id, modelId: model.id, prompt: task.payload?.prompt || '', parameters: task.payload?.parameters || {}, references };
  const body = route.requestTemplate && Object.keys(route.requestTemplate).length ? replaceTemplate(route.requestTemplate, context) : defaultBody(task, model, references, route);
  const url = resolveProviderUrl(provider, route.createPath, env);
  const method = String(route.method || 'POST').toUpperCase();
  const res = await safeProviderFetch(provider, url, { method, headers: buildHeaders(provider, model), body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body), timeoutMs: task.nodeType === 'video' ? 180000 : 120000 }, env);"""
new_submit="""  const context = { model: model.id, modelId: model.id, prompt: task.payload?.prompt || '', parameters: task.payload?.parameters || {}, references };
  const hasCustomTemplate=Boolean(route.requestTemplate&&Object.keys(route.requestTemplate).length);
  const useImageEdit=!hasCustomTemplate&&task.nodeType==='image'&&route.adapterKey==='openai-image'&&references.some(x=>String(x?.type||x?.kind||'image').toLowerCase()==='image'&&(x?.url||x?.value));
  let body=null,url='',method='POST',res;
  if(useImageEdit){
    const edit=await submitOpenAIImageEditRequest(task,provider,model,references,env);url=edit.url;res=edit.res;
  }else{
    body=hasCustomTemplate?replaceTemplate(route.requestTemplate,context):defaultBody(task,model,references,route);
    url=resolveProviderUrl(provider,route.createPath,env);method=String(route.method||'POST').toUpperCase();
    res=await safeProviderFetch(provider,url,{method,headers:buildHeaders(provider,model),body:['GET','HEAD'].includes(method)?undefined:JSON.stringify(body),timeoutMs:task.nodeType==='video'?180000:120000},env);
  }"""
worker=replace_once(worker,old_submit,new_submit,'switch Worker image references to multipart edits')
WORKER.write_text(worker,encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import worker from '../dist/server/final-entry.js';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const REF=Buffer.from('PNG_REFERENCE_MARKER').toString('base64');
function listen(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
function close(server){return new Promise(resolve=>server.close(()=>resolve()));}
async function freePort(){const s=net.createServer();const port=await listen(s);await close(s);return port;}
async function waitHealth(port,child){const deadline=Date.now()+10000;while(Date.now()<deadline){if(child.exitCode!=null)throw new Error(`server exited ${child.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return}catch{}await new Promise(r=>setTimeout(r,60))}throw new Error('server health timeout')}
async function stopChild(child){if(child.exitCode!=null)return;child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(child.exitCode==null)child.kill('SIGKILL')}
async function jsonCall(port,url,init={}){const res=await fetch(`http://127.0.0.1:${port}${url}`,init);return {res,data:await res.json().catch(()=>null)}}

test('Node OpenAI image adapter sends reference images as multipart image edits',{concurrency:false},async()=>{
  let seen={path:'',contentType:'',authorization:'',body:''};
  const upstream=http.createServer(async(req,res)=>{
    if(req.url==='/v1/images/edits'){
      const chunks=[];for await(const c of req)chunks.push(c);seen={path:req.url,contentType:String(req.headers['content-type']||''),authorization:String(req.headers.authorization||''),body:Buffer.concat(chunks).toString('latin1')};
      res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({data:[{b64_json:Buffer.from('OUTPUT').toString('base64')}]}));return;
    }
    res.writeHead(404,{'content-type':'application/json'});res.end('{}');
  });
  const upstreamPort=await listen(upstream),canvasPort=await freePort(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-image-ref-'));
  for(const name of ['server.js','store.js','provider-adapter-contract.js'])fs.copyFileSync(path.join(ROOT,name),path.join(tmp,name));
  const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,HOST:'127.0.0.1',PORT:String(canvasPort),CANVAS_ADMIN_PASSWORD:'',NODE_OPTIONS:'--no-warnings'},stdio:['ignore','pipe','pipe']});
  try{
    await waitHealth(canvasPort,child);
    const provider=await jsonCall(canvasPort,'/api/providers',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'img',name:'img',baseUrl:`http://127.0.0.1:${upstreamPort}/v1`,allowPrivateHosts:true,protocol:'openai-compatible',apiKey:'secret',downloadOutputs:false,models:[{id:'gpt-image-2',name:'gpt-image-2',modality:'image'}]})});
    assert.equal(provider.res.status,200,JSON.stringify(provider.data));
    const task=await jsonCall(canvasPort,'/api/tasks',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({providerId:'img',modelId:'gpt-image-2',nodeType:'image',prompt:'edit this',references:[{type:'image',url:`data:image/png;base64,${REF}`}],parameters:{size:'1024x1024'}})});
    assert.ok([200,201,202].includes(task.res.status),JSON.stringify(task.data));
    const deadline=Date.now()+5000;while(!seen.path&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
    assert.equal(seen.path,'/v1/images/edits');assert.match(seen.contentType,/multipart\/form-data; boundary=/i);assert.equal(seen.authorization,'Bearer secret');
    assert.match(seen.body,/name="model"/);assert.match(seen.body,/gpt-image-2/);assert.match(seen.body,/name="image(?:\[\])?"/);assert.match(seen.body,/PNG_REFERENCE_MARKER/);
  }finally{await close(upstream).catch(()=>{});await stopChild(child);fs.rmSync(tmp,{recursive:true,force:true})}
});

function ctx(){const jobs=[];return {ctx:{waitUntil(p){jobs.push(Promise.resolve(p))}},flush:async()=>{while(jobs.length)await jobs.shift()}}}
async function workerCall(url,{method='GET',body}={}){const c=ctx();const res=await worker.fetch(new Request(`https://canvas.test${url}`,{method,headers:body?{'content-type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined}),{PROVIDER_SECRET_KEY:'image-ref-test'},c.ctx);const data=await res.json().catch(()=>({}));await c.flush();return {res,data}}

test('Worker OpenAI image adapter sends prepared reference as multipart edit',{concurrency:false},async()=>{
  const realFetch=globalThis.fetch;let seen=null;
  globalThis.__canvasWorkerState={booted:true,supabase:null,providers:[],projects:[],tasks:[],bridgeToken:'x',bridgeState:{},sessions:new Map(),media:new Map()};globalThis.__canvasProviderMigrationPromise=null;
  globalThis.fetch=async(input,init={})=>{
    const u=new URL(typeof input==='string'?input:input.url);
    if(u.hostname==='image.vendor.test'&&u.pathname==='/v1/images/edits'){
      const headers=new Headers(init.headers||{});const form=init.body;
      seen={path:u.pathname,authorization:headers.get('authorization'),contentType:headers.get('content-type'),model:form.get('model'),prompt:form.get('prompt'),image:form.get('image')||form.get('image[]')};
      return Response.json({data:[{url:'https://cdn.vendor.test/final.png'}]});
    }
    return realFetch(input,init);
  };
  try{
    const saved=await workerCall('/api/providers',{method:'POST',body:{id:'img-worker',name:'img',baseUrl:'https://image.vendor.test/v1',protocol:'openai-compatible',apiKey:'secret',downloadOutputs:false,models:[{id:'gpt-image-2',name:'gpt-image-2',modality:'image'}]}});assert.equal(saved.res.status,200,JSON.stringify(saved.data));
    const created=await workerCall('/api/tasks',{method:'POST',body:{providerId:'img-worker',modelId:'gpt-image-2',nodeType:'image',prompt:'edit this',references:[{type:'image',url:`data:image/png;base64,${REF}`}],parameters:{size:'1024x1024'}}});assert.ok([200,201,202].includes(created.res.status),JSON.stringify(created.data));
    assert.ok(seen,'image edit request was not observed');assert.equal(seen.path,'/v1/images/edits');assert.equal(seen.authorization,'Bearer secret');assert.equal(seen.contentType,null);assert.equal(seen.model,'gpt-image-2');assert.equal(seen.prompt,'edit this');assert.ok(seen.image instanceof Blob);assert.equal(await seen.image.text(),'PNG_REFERENCE_MARKER');
  }finally{globalThis.fetch=realFetch}
});

test('prompt-only image generation remains on /v1/images/generations',()=>{
  const node=fs.readFileSync(path.join(ROOT,'server.js'),'utf8');const edge=fs.readFileSync(path.join(ROOT,'dist/server/secure-index.js'),'utf8');
  assert.match(node,/\/v1\/images\/generations/);assert.match(node,/\/v1\/images\/edits/);assert.match(edge,/\/v1\/images\/edits/);assert.match(node,/new FormData\(\)/);assert.match(edge,/new FormData\(\)/);
});
''',encoding='utf-8')
print('Patched Node and Worker OpenAI image adapters for real multipart reference-image transport.')
