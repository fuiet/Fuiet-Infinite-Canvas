import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const BUILD='20260831-xogpu-poll-fallback-1';

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
