import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const proxy=fs.readFileSync(path.join(ROOT,'functions/api/[[path]].js'),'utf8');

function sliceBetween(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);assert.ok(b>a,`missing ${end}`);return source.slice(a,b);
}

test('browser video URLs are materialized before a task is marked saved',()=>{
  const helper=sliceBetween(runtime,'async function materializeGeneratedVideoOutput(value,provider)','function imageTargetSelection');
  assert.match(helper,/fetchProviderResource\(provider,url/);
  assert.match(helper,/readResponse\(res\)/);
  assert.match(helper,/parsed\.kind!==['"]blob['"]/);
  const completion=sliceBetween(runtime,"if(assessment.state==='success')",'const current=findTask(task.id);');
  assert.match(completion,/materializeGeneratedVideoOutput\(output,provider\)/);
  assert.ok(completion.indexOf('materializeGeneratedVideoOutput(output,provider)')<completion.indexOf("status:'succeeded'"));
});

test('immediate and synchronous browser video outputs are also persisted',()=>{
  assert.match(runtime,/if\(modality==='video'\)value=await materializeGeneratedVideoOutput\(value,provider\)/);
  const immediate=sliceBetween(runtime,"if(modality==='video'&&immediateOutput&&!taskId)","if(!taskId)");
  assert.match(immediate,/materializeGeneratedVideoOutput\(value,provider\)/);
  assert.match(immediate,/resultStatus:'saved'/);
});

test('Pages proxy strips credentials and follows cross-origin GET result redirects',()=>{
  assert.match(proxy,/function stripCredentialHeaders\(headers\)/);
  const redirect=sliceBetween(proxy,'for(let redirects=0;redirects<4;redirects++)',`return json({error:'上游重定向次数过多'}`);
  assert.match(redirect,/if\(next\.origin!==current\.origin\)/);
  assert.match(redirect,/if\(!\['GET','HEAD'\]\.includes\(method\)\)return json\(\{error:'已阻止非读取请求跨域重定向'\},502\)/);
  assert.match(redirect,/stripCredentialHeaders\(headers\)/);
  assert.match(redirect,/payload=undefined/);
  assert.doesNotMatch(redirect,/已阻止携带供应商认证信息跨域重定向/);
});

test('credential stripping protects common provider secrets on CDN redirects',()=>{
  const helper=sliceBetween(proxy,'function stripCredentialHeaders(headers)','function responseHeaders');
  for(const name of ['authorization','proxy-authorization','x-api-key','api-key'])assert.ok(helper.includes(name),`missing ${name}`);
  assert.match(helper,/token\|secret\|api\[-_\]\?key/);
});
