import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wrangler=fs.readFileSync(path.join(ROOT,'wrangler.toml'),'utf8');
const deployment=fs.readFileSync(path.join(ROOT,'SECURITY_DEPLOYMENT.md'),'utf8');

function value(name){
  const m=wrangler.match(new RegExp(`^${name}\\s*=\\s*"([^"]*)"`,'m'));
  return m?.[1] ?? '';
}

test('public Cloudflare configuration is owner-isolated and not desktop-account-free by default',()=>{
  assert.equal(value('CANVAS_DESKTOP_SINGLE_USER'),'0');
  assert.equal(value('CANVAS_ENFORCE_OWNER'),'1');
  assert.equal(value('CANVAS_CLAIM_UNOWNED'),'0');
  assert.equal(value('CANVAS_ALLOW_UNAUTHENTICATED_OWNER'),'0');
  assert.equal(value('CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS'),'0');
});

test('deployment guide documents the current video contract and safe restart behavior',()=>{
  assert.match(deployment,/POST `?\/v1\/videos`?/);
  assert.match(deployment,/GET `?\/v1\/videos\/\{\{taskId\}\}`?/);
  assert.match(deployment,/\/v1\/videos\/\{\{taskId\}\}\/content/);
  assert.doesNotMatch(deployment,/默认异步视频协议[\s\S]{0,200}\/v1\/video\/generations/);
  assert.match(deployment,/避免重复提交|重复扣费/);
});
