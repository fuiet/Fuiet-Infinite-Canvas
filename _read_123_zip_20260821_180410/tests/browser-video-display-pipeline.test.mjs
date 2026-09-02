import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime-preview.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');
const ROUTER_BUILD='20260902-desktop-runtime-router-1';
const PREVIEW_SW_BUILD='20260901-video-wait-progress-1';

test('canvas deployment uses a fresh runtime router and bootstrap cache key',()=>{
  for(const src of [index,models])assert.ok(src.includes(ROUTER_BUILD),'missing current desktop/browser runtime router build id');
  assert.ok(index.includes(`browser-runtime.js?v=${ROUTER_BUILD}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${ROUTER_BUILD}`));
  assert.ok(models.includes(`browser-bootstrap.js?v=${ROUTER_BUILD}`));
  assert.ok(bootstrap.includes(`const v='${ROUTER_BUILD}'`));
  assert.doesNotMatch(index,/browser-runtime\.js\?v=20260829-agnes-poll-exact-1/);
});

test('browser preview media service worker bypasses stale HTTP cache',()=>{
  assert.ok(runtime.includes(`browser-media-sw.js?v=${PREVIEW_SW_BUILD}`));
  assert.match(runtime,/updateViaCache:'none'/);
  assert.match(runtime,/registration\.update\(\)/);
});

test('downloaded generated videos get a playable MIME type before IndexedDB persistence',()=>{
  assert.match(runtime,/async function typedGeneratedVideoBlob\(blob,url,res\)/);
  assert.match(runtime,/ascii\.slice\(4,8\)===['\"]ftyp['\"]/);
  assert.match(runtime,/mime='video\/mp4'/);
  assert.match(runtime,/mime='video\/webm'/);
  assert.match(runtime,/storeMediaBlob\(typed,\{name:'generated-video'\}\)/);
});

test('canvas result URL resolver accepts IndexedDB media URLs in object fields and nested fields',()=>{
  const start=app.indexOf('function resolveGeneratedOutputUrl(output)');
  const end=app.indexOf('function semanticInputType',start);
  const section=app.slice(start,end>start?end:start+5000);
  const matches=section.match(/__browser_media/g)||[];
  assert.ok(matches.length>=3,'local browser media URL must be accepted for strings, direct object keys, and nested object paths');
  assert.match(section,/blob:/);
});
