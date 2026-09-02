import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime-preview.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const ROUTER_BUILD='20260902-desktop-runtime-router-1';
const PREVIEW_SW_BUILD='20260901-video-wait-progress-1';

test('browser resumes Agnes from provider create response video_id before stale upstream id',()=>{
  const start=runtime.indexOf('async function executeTask(task){');
  const end=runtime.indexOf('async function runTask(task){',start);
  assert.ok(start>=0&&end>start);
  const exec=runtime.slice(start,end);
  assert.match(exec,/recoveredUpstreamTaskId/);
  assert.match(exec,/Core\.extractTaskId\(task\.providerCreateResponse,route\)/);
  assert.match(exec,/recoveredUpstreamTaskId\|\|task\.upstreamTaskId/);
  assert.match(exec,/recoveredTaskId:true/);
});

test('normal successful polls stay at provider cadence and only real retry failures back off',()=>{
  const start=runtime.indexOf('const started=Date.now();let pollCount=0,retryAttempt=0;');
  const end=runtime.indexOf('async function runTask(task){',start);
  assert.ok(start>=0&&end>start);
  const exec=runtime.slice(start,end);
  assert.match(exec,/const delay=retryAttempt>0\?/);
  assert.match(exec,/:Math\.max\(500,Number\(route\.pollIntervalMs\|\|1500\)\)/);
  assert.match(exec,/retryAttempt=0;/);
  assert.match(exec,/pollCount\+\+;/);
  assert.doesNotMatch(exec,/attempt\+\+;/);
});

test('poll diagnostics preserve raw provider state and both Agnes ids',()=>{
  assert.match(runtime,/providerVideoId/);
  assert.match(runtime,/providerTaskId/);
  assert.match(runtime,/providerRawStatus:assessment\.status\|\|''/);
  assert.match(runtime,/providerProgress:assessment\.progress==null\?null:Number\(assessment\.progress\)/);
});

test('latest browser runtime router is deployed without coupling its version to the internal preview worker',()=>{
  assert.ok(index.includes(`browser-runtime.js?v=${ROUTER_BUILD}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${PREVIEW_SW_BUILD}`));
});
