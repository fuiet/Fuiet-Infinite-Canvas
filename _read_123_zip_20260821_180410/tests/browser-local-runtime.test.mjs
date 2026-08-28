import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const proxy=fs.readFileSync(path.join(ROOT,'functions/api/[[path]].js'),'utf8');
const wrangler=fs.readFileSync(path.join(ROOT,'wrangler.toml'),'utf8');
const activeWrangler=wrangler.split(/\r?\n/).filter(x=>!x.trim().startsWith('#')).join('\n');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
test('preview persistence belongs to browser runtime',()=>{assert.match(runtime,/fuiet-browser-providers-v1/);assert.match(runtime,/fuiet-browser-projects-v1/);assert.match(runtime,/fuiet-browser-tasks-v1/);assert.match(runtime,/localStorage\.setItem/);assert.match(runtime,/cloudflarePersistence:false/)});
test('provider core executes before application UI',()=>{for(const html of [index,models]){const a=html.indexOf('provider-adapter-contract.js'),c=html.indexOf('provider-runtime-core.js'),b=html.indexOf('browser-runtime.js');assert.ok(a>=0&&c>a&&b>c)}assert.ok(index.indexOf('app.js')>index.indexOf('browser-runtime.js'));assert.ok(models.indexOf('models.js')>models.indexOf('browser-runtime.js'))});
test('Cloudflare function is stateless proxy only',()=>{assert.match(proxy,/pathname==='\/api\/proxy'/);assert.match(proxy,/pathname==='\/api\/health'/);assert.match(proxy,/persistence:false/);assert.doesNotMatch(proxy,/SUPABASE|D1Database|R2Bucket|KVNamespace|writeJSONStore/i);assert.doesNotMatch(activeWrangler,/SUPABASE|PROVIDER_SECRET_KEY|D1|R2|KV|CANVAS_OWNER/i)});
test('stateful Cloudflare server and persistence migrations are removed',()=>{assert.equal(fs.existsSync(path.join(ROOT,'dist/server')),false);assert.equal(fs.existsSync(path.join(ROOT,'supabase')),false);assert.equal(fs.existsSync(path.join(ROOT,'functions/media')),false)});
test('browser provider flow uses direct request then stateless proxy fallback',()=>{assert.match(runtime,/return await rawFetch\(url,\{\.\.\.init,mode:'cors'/);assert.match(runtime,/return proxyFetch\(url,init\)/);assert.match(runtime,/authCandidates/);assert.match(runtime,/\/v1\/models/);assert.match(runtime,/classifyAsyncPoll/)})
