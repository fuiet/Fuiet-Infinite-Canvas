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
async function freePort(){const s=net.createServer();const p=await listen(s);await close(s);return p;}
async function waitHealth(port,child){const end=Date.now()+10000;while(Date.now()<end){if(child.exitCode!=null)throw new Error(`server exited ${child.exitCode}`);try{const r=await fetch(`http://127.0.0.1:${port}/api/health`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,60));}throw new Error('health timeout');}
async function stop(child){if(child.exitCode!=null)return;child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,2500))]);if(child.exitCode==null)child.kill('SIGKILL');}
async function call(port,pathName,body){const res=await fetch(`http://127.0.0.1:${port}${pathName}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return{res,data:await res.json()};}
async function fixture(){const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'canvas-api-zero-config-'));for(const n of ['server.js','store.js','provider-adapter-contract.js','provider-runtime-core.js'])fs.copyFileSync(path.join(ROOT,n),path.join(tmp,n));const port=await freePort();const child=spawn(process.execPath,['server.js'],{cwd:tmp,env:{...process.env,NODE_NO_WARNINGS:'1',HOST:'127.0.0.1',PORT:String(port),CANVAS_ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});await waitHealth(port,child);return{tmp,port,child};}

test('saving only Base URL + API Key auto-discovers models, auth style and executable adapters',{concurrency:false},async()=>{
  let bearerWasTried=false;let xApiKeySeen='';
  const upstream=http.createServer((req,res)=>{
    const authSeen=String(req.headers.authorization||'');if(authSeen.startsWith('Bearer '))bearerWasTried=true;xApiKeySeen=String(req.headers['x-api-key']||'');
    if(req.url==='/v1/models'){
      if(xApiKeySeen!=='key-123'){res.writeHead(401,{'content-type':'application/json'});return res.end('{"error":{"message":"bad auth"}}');}
      res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({object:'list',data:[{id:'gpt-5',object:'model'},{id:'gpt-image-1',object:'model'},{id:'sora-2',object:'model'}]}));
    }
    res.writeHead(404,{'content-type':'application/json'});res.end('{}');
  });
  const upstreamPort=await listen(upstream);const fx=await fixture();
  try{
    const {res,data}=await call(fx.port,'/api/providers',{baseUrl:`http://127.0.0.1:${upstreamPort}`,apiKey:'key-123',allowPrivateHosts:true});
    assert.equal(res.status,200,JSON.stringify(data));
    assert.equal(data.modelCount,3);
    assert.equal(data.autoConfigured,true);
    assert.equal(data.provider.protocol,'openai-compatible');
    assert.equal(data.provider.authHeader,'x-api-key');
    assert.equal(data.provider.authScheme,'');
    assert.equal(JSON.stringify(data).includes('key-123'),false);
    const byId=Object.fromEntries(data.provider.models.map(m=>[m.id,m]));
    assert.equal(byId['gpt-5'].createPath,'/v1/chat/completions');
    assert.equal(byId['gpt-image-1'].createPath,'/v1/images/generations');
    assert.equal(byId['sora-2'].createPath,'/v1/videos');
    assert.equal(byId['sora-2'].pollPath,'/v1/videos/{{taskId}}');
    assert.equal(byId['sora-2'].contentPath,'/v1/videos/{{taskId}}/content');
    assert.equal(bearerWasTried,true,'Bearer is tried before x-api-key');
    assert.equal(xApiKeySeen,'key-123');
  } finally {await stop(fx.child);fs.rmSync(fx.tmp,{recursive:true,force:true});await close(upstream);}
});

test('provider is still saved when model discovery is unavailable',{concurrency:false},async()=>{
  const upstream=http.createServer((req,res)=>{res.writeHead(req.url==='/'?200:404,{'content-type':'application/json'});res.end(req.url==='/'?'{}':'{"error":"not found"}');});
  const upstreamPort=await listen(upstream);const fx=await fixture();
  try{
    const {res,data}=await call(fx.port,'/api/providers',{baseUrl:`http://127.0.0.1:${upstreamPort}`,apiKey:'abc',allowPrivateHosts:true});
    assert.equal(res.status,200,JSON.stringify(data));
    assert.equal(data.modelCount,0);
    assert.equal(data.autoConfigured,false);
    assert.match(String(data.warning||''),/已保存|没有发现模型/);
    const listed=await fetch(`http://127.0.0.1:${fx.port}/api/providers`).then(r=>r.json());
    assert.equal(listed.providers.length,1);
    assert.equal(listed.providers[0].hasApiKey,true);
  } finally {await stop(fx.child);fs.rmSync(fx.tmp,{recursive:true,force:true});await close(upstream);}
});
