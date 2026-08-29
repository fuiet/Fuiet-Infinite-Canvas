import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');

function listen(server){return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>resolve(server.address().port));});}
function close(server){return new Promise(resolve=>server.close(()=>resolve()));}
async function freePort(){const s=net.createServer();const port=await listen(s);await close(s);return port;}
async function waitHealth(port,child){
  const deadline=Date.now()+10000;
  while(Date.now()<deadline){
    if(child.exitCode!=null)throw new Error(`canvas server exited early with code ${child.exitCode}`);
    try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return;}catch{}
    await new Promise(r=>setTimeout(r,80));
  }
  throw new Error('canvas server did not become healthy');
}
async function stopChild(child){
  if(child.exitCode!=null)return;
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,3000))]);
  if(child.exitCode==null)child.kill('SIGKILL');
}
async function jsonCall(port,url,init={}){
  const res=await fetch(`http://127.0.0.1:${port}${url}`,init);
  const data=await res.json().catch(()=>null);
  return {res,data};
}

test('Node provider gateway redacts auth headers and blocks credentialed cross-origin redirects',{concurrency:false},async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-node-provider-security-'));
  for(const name of ['server.js','store.js','video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','local-media-result.js'])fs.copyFileSync(path.join(ROOT,name),path.join(tmp,name));
  const canvasPort=await freePort();
  const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,NODE_NO_WARNINGS:'1',HOST:'127.0.0.1',PORT:String(canvasPort),CANVAS_ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});
  let childErr='';child.stderr.on('data',d=>{childErr+=String(d)});
  let sinkHits=0,sinkAuthorization='';
  const sink=http.createServer((req,res)=>{sinkHits++;sinkAuthorization=String(req.headers.authorization||'');res.writeHead(200,{'content-type':'application/json'});res.end('{"ok":true}');});
  const sinkPort=await listen(sink);
  const redirector=http.createServer((req,res)=>{res.writeHead(302,{location:`http://127.0.0.1:${sinkPort}/steal`});res.end();});
  const redirectPort=await listen(redirector);
  try{
    await waitHealth(canvasPort,child);
    const created=await jsonCall(canvasPort,'/api/providers',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        name:'Header Redaction',baseUrl:`http://127.0.0.1:${redirectPort}`,allowPrivateHosts:true,
        apiKey:'super-secret-key',defaultHeaders:{Authorization:'Bearer header-secret','X-Trace':'keep-me'},
        models:[{id:'gpt-test',name:'GPT test',modality:'text'}]
      })
    });
    assert.equal(created.res.status,200,JSON.stringify(created.data));
    const listed=await jsonCall(canvasPort,'/api/providers');
    const text=JSON.stringify(listed.data);
    assert.equal(text.includes('super-secret-key'),false);
    assert.equal(text.includes('header-secret'),false);
    assert.equal(listed.data.providers[0].defaultHeaders.Authorization,undefined);
    assert.equal(listed.data.providers[0].defaultHeaders['X-Trace'],'keep-me');
    const stored=JSON.parse(fs.readFileSync(path.join(tmp,'.data','providers.json'),'utf8'))[0];
    assert.equal(stored.defaultHeaders.Authorization,undefined);
    assert.equal(stored.defaultHeaders['X-Trace'],'keep-me');
    assert.ok(stored.apiKeyEncrypted);
    assert.equal(JSON.stringify(stored).includes('super-secret-key'),false);

    const redirected=await jsonCall(canvasPort,'/api/providers/test-config',{
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
        baseUrl:`http://127.0.0.1:${redirectPort}`,allowPrivateHosts:true,apiKey:'redirect-secret'
      })
    });
    assert.equal(redirected.res.status,502,JSON.stringify(redirected.data));
    assert.match(String(redirected.data?.error||''),/不同域名|同源|认证信息/);
    assert.equal(sinkHits,0,'cross-origin redirect target must never receive the request');
    assert.equal(sinkAuthorization,'');
  } finally {
    await close(redirector).catch(()=>{});await close(sink).catch(()=>{});await stopChild(child);fs.rmSync(tmp,{recursive:true,force:true});
  }
  assert.equal(childErr,'',childErr);
});