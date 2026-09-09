from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
preview = root / 'browser-runtime-preview.js'
router = root / 'browser-runtime.js'
index = root / 'index.html'
test_file = root / 'tests' / 'xogpu-auth-v4.test.mjs'

src = preview.read_text(encoding='utf-8')
old_auth = "function authCandidates(provider){const key=String(provider?.apiKey||'').trim(),list=[];if(!key)return[{}];const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key});const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}"
new_auth = "function authCandidates(provider){let key=String(provider?.apiKey||'').trim();if(!key)return[{}];key=key.replace(/^Bearer\\s+/i,'').trim();const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();if(host==='xogpu.com'||host.endsWith('.xogpu.com'))return[{Authorization:`Bearer ${key}`}];const list=[];const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key});const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}"
if old_auth in src:
    src = src.replace(old_auth, new_auth, 1)
elif "host==='xogpu.com'||host.endsWith('.xogpu.com')" not in src:
    raise SystemExit('authCandidates anchor not found')

old_provider_json = "async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=runtimeErrorText(parsed.value);const err=new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`);err.status=res.status;err.detail=detail;if(res.status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}"
new_provider_json = "async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);const explicitFailure=Boolean(parsed?.kind==='json'&&parsed?.value&&typeof parsed.value==='object'&&parsed.value.success===false);if(!res.ok||explicitFailure){const detail=runtimeErrorText(parsed.value);const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();const authFailure=/unauthorized|invalid access token|invalid[^;\\n]*(?:token|api[ _-]?key)|access token/i.test(String(detail||''));const status=!res.ok?res.status:(authFailure?401:400);const xogpu=host==='xogpu.com'||host.endsWith('.xogpu.com');const prefix=xogpu&&authFailure?'XOGPU 认证失败：API Key 无效、已过期，或没有 discount_video_generation 权限':`供应商 HTTP ${status}`;const err=new Error(`${prefix}${detail?`：${detail.slice(0,500)}`:''}`);err.status=status;err.detail=detail;err.providerFailure=explicitFailure;if(status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}"
if old_provider_json in src:
    src = src.replace(old_provider_json, new_provider_json, 1)
elif 'discount_video_generation 权限' not in src:
    raise SystemExit('providerJson anchor not found')
preview.write_text(src, encoding='utf-8')

rsrc = router.read_text(encoding='utf-8')
old_preview_cache = './browser-runtime-preview.js?v=20260909-xogpu-create-response-3'
new_preview_cache = './browser-runtime-preview.js?v=20260909-xogpu-auth-4'
if old_preview_cache in rsrc:
    rsrc = rsrc.replace(old_preview_cache, new_preview_cache, 1)
elif new_preview_cache not in rsrc:
    raise SystemExit('router preview cache anchor not found')
router.write_text(rsrc, encoding='utf-8')

html = index.read_text(encoding='utf-8')
old_router_cache = './browser-runtime.js?v=20260909-xogpu-create-response-3'
new_router_cache = './browser-runtime.js?v=20260909-xogpu-auth-4'
if old_router_cache in html:
    html = html.replace(old_router_cache, new_router_cache, 1)
elif new_router_cache not in html:
    raise SystemExit('index router cache anchor not found')
index.write_text(html, encoding='utf-8')

test_file.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU uses strict Bearer auth and strips accidental Bearer prefix',()=>{
  assert.match(preview,/key=key\.replace\(\/\^Bearer\\s\+\/i,''\)\.trim\(\)/);
  assert.match(preview,/host==='xogpu\.com'\|\|host\.endsWith\('\.xogpu\.com'\)\)return\[\{Authorization:`Bearer \$\{key\}`\}\]/);
});

test('HTTP 200 success false is treated as provider failure',()=>{
  assert.match(preview,/parsed\.value\.success===false/);
  assert.match(preview,/discount_video_generation 权限/);
});

test('browser cache keys are bumped for XOGPU auth fix',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-auth-4/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-auth-4/);
});
""", encoding='utf-8')
