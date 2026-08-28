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
test('preview persistence belongs to IndexedDB browser runtime',()=>{assert.match(runtime,/indexedDB\.open/);assert.match(runtime,/STORES=\{providers:'providers',projects:'projects',tasks:'tasks',media:'media'/);assert.match(runtime,/browser-indexeddb-preview/);assert.match(runtime,/cloudflarePersistence:false/);assert.match(runtime,/localStorage\.removeItem/)});
test('provider core and storage manager execute before bootstrapped application UI',()=>{for(const html of [index,models]){const a=html.indexOf('provider-adapter-contract.js'),c=html.indexOf('provider-runtime-core.js'),b=html.indexOf('browser-runtime.js'),s=html.indexOf('browser-storage-manager.js'),boot=html.indexOf('browser-bootstrap.js');assert.ok(a>=0&&c>a&&b>c&&s>b&&boot>s)}assert.doesNotMatch(index,/src=\"\.\/app\.js/);assert.doesNotMatch(models,/src=\"\.\/models\.js/)});
test('Cloudflare function is stateless proxy only',()=>{assert.match(proxy,/pathname==='\/api\/proxy'/);assert.match(proxy,/pathname==='\/api\/health'/);assert.match(proxy,/persistence:false/);assert.doesNotMatch(proxy,/SUPABASE|D1Database|R2Bucket|KVNamespace|writeJSONStore/i);assert.doesNotMatch(activeWrangler,/SUPABASE|PROVIDER_SECRET_KEY|D1|R2|KV|CANVAS_OWNER/i)});
test('stateful Cloudflare server and persistence migrations are removed',()=>{assert.equal(fs.existsSync(path.join(ROOT,'dist/server')),false);assert.equal(fs.existsSync(path.join(ROOT,'supabase')),false);assert.equal(fs.existsSync(path.join(ROOT,'functions/media')),false)});
test('browser provider flow uses direct request then stateless proxy fallback',()=>{assert.match(runtime,/return await rawFetch\(url,\{\.\.\.init,mode:'cors'/);assert.match(runtime,/return proxyFetch\(url,init\)/);assert.match(runtime,/authCandidates/);assert.match(runtime,/\/v1\/models/);assert.match(runtime,/classifyAsyncPoll/)})
