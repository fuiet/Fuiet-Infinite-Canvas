import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime-preview.js'),'utf8');

function sliceBetween(start,end){
  const a=runtime.indexOf(start),b=runtime.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  assert.ok(b>a,`missing ${end}`);
  return runtime.slice(a,b);
}

test('credentialed browser provider requests are pinned to Provider Base URL origin',()=>{
  assert.match(runtime,/function credentialedProviderUrl\(provider,url\)/);
  assert.match(runtime,/安全策略阻止向供应商 Base URL 之外的地址发送 API Key/);
  const fn=sliceBetween('async function fetchWithAuth(provider,url,init={})','async function fetchProviderResource');
  assert.match(fn,/url=credentialedProviderUrl\(provider,url\)/);
  assert.match(fn,/authCandidates\(provider\)/);
  assert.ok(fn.indexOf('credentialedProviderUrl(provider,url)')<fn.indexOf('authCandidates(provider)'),'origin validation must happen before auth headers are attached');
});

test('video polling ignores malicious cross-origin status and poll URLs',()=>{
  const helpers=sliceBetween('function providerOrigin(provider)','function authCandidates(provider)');
  assert.match(helpers,/function providerRouteUrl\(provider,value\)/);
  assert.match(helpers,/isProviderOriginUrl\(provider,url\)\?url:''/);
  const polling=sliceBetween('function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route)','async function pollVideoJson');
  assert.match(polling,/videoRouteCandidate\(provider,value\)/);
  assert.doesNotMatch(polling,/videoResourceCandidate\(provider,value\)/);
});

test('cross-origin CDN result downloads are credentialless while same-origin results may authenticate',()=>{
  const resource=sliceBetween('async function fetchProviderResource(provider,url,init={})','async function readResponse');
  assert.match(resource,/if\(isProviderOriginUrl\(provider,url\)\)return fetchWithAuth\(provider,url,init\)/);
  assert.match(resource,/stripCredentialHeaders\(init\.headers\|\|\{\}\)/);
  const content=sliceBetween('async function fetchVideoContent(provider,createdRaw,taskId,route,activePollUrl=', 'function videoRequestDiagnostics');
  assert.match(content,/videoResourceCandidate\(provider,value\)/);
  assert.match(content,/fetchProviderResource\(provider,url,\{method:'GET'\}\)/);
  assert.doesNotMatch(content,/fetchWithAuth\(provider,url,\{method:'GET'\}\)/);
});

test('credential stripping covers common API key and token header names',()=>{
  const helpers=sliceBetween('function providerOrigin(provider)','function authCandidates(provider)');
  for(const name of ['authorization','proxy-authorization','x-api-key','api-key'])assert.ok(helpers.includes(name),`missing protected header ${name}`);
  assert.match(helpers,/token\|secret\|api\[-_\]\?key/);
});
