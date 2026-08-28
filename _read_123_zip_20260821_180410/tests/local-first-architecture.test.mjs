import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const cloudflare=read('functions/api/[[path]].js');
const browser=read('browser-runtime.js');
const server=read('server.js');
const desktop=read('electron-main.cjs');
const pkg=JSON.parse(read('package.json'));

test('Cloudflare remains a stateless preview proxy, never the authoritative runtime',()=>{
  assert.match(cloudflare,/Cloudflare Pages preview transport only/);
  assert.match(cloudflare,/persistence:false/);
  assert.match(cloudflare,/pathname==='\/api\/proxy'/);
  assert.match(cloudflare,/return json\(\{error:'此 Cloudflare 部署只负责网页预览和无状态代理/);
  assert.doesNotMatch(cloudflare,/require\(['"]\.\/?store|CanvasStore|canvas\.sqlite|schema_migrations|provider_output_json/);
  assert.doesNotMatch(cloudflare,/\bR2Bucket\b|\bD1Database\b|\bKVNamespace\b/);
});

test('browser preview refuses desktop media processing instead of returning fake success',()=>{
  assert.match(browser,/path==='\/api\/media\/process'.*?501/s);
  assert.match(browser,/FFmpeg \/ ImageMagick 本地处理将在 Windows 正式版运行/);
});

test('desktop runtime owns local SQLite/media state on loopback',()=>{
  assert.match(server,/CANVAS_DATA_DIR/);
  assert.match(server,/const HOST = IS_WEB_RUNTIME \?[^\n]+: '127\.0\.0\.1'/);
  assert.match(desktop,/process\.env\.CANVAS_DATA_DIR = path\.join\(userDataRoot, 'data'\)/);
  assert.match(desktop,/const HOST = '127\.0\.0\.1'/);
});

test('desktop package excludes Cloudflare deployment code and bundles local media tools separately',()=>{
  assert.equal(pkg.main,'electron-main.cjs');
  assert.ok(pkg.build.files.includes('!functions/**'));
  assert.ok(pkg.build.files.includes('!wrangler.toml'));
  assert.ok(pkg.build.files.includes('!runtime-tools/**'));
  assert.deepEqual(pkg.build.extraResources,[{from:'runtime-tools',to:'tools',filter:['**/*']}]);
});
