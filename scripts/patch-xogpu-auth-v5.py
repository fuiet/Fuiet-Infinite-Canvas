from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
preview = root / 'browser-runtime-preview.js'
router = root / 'browser-runtime.js'
index = root / 'index.html'
test_file = root / 'tests' / 'xogpu-auth-v5.test.mjs'

src = preview.read_text(encoding='utf-8')

old_auth = "function authCandidates(provider){let key=String(provider?.apiKey||'').trim();if(!key)return[{}];key=key.replace(/^Bearer\\s+/i,'').trim();const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();if(host==='xogpu.com'||host.endsWith('.xogpu.com'))return[{Authorization:`Bearer ${key}`}];const list=[];const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key});const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}"
new_auth = "function normalizeProviderApiKey(value){let key=String(value||'').trim();key=key.replace(/^Authorization\\s*:\\s*/i,'').trim();key=key.replace(/^Bearer\\s+/i,'').trim();key=key.replace(/^[\\\"'`]+|[\\\"'`]+$/g,'').trim();key=key.replace(/[\\u200B-\\u200D\\uFEFF]/g,'').trim();return key}function authCandidates(provider){const key=normalizeProviderApiKey(provider?.apiKey);if(!key)return[{}];const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();const list=[];if(host==='xogpu.com'||host.endsWith('.xogpu.com')){list.push({Authorization:`Bearer ${key}`},{Authorization:key},{'x-api-key':key},{'api-key':key})}else{const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key})}const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}"
if old_auth not in src:
    raise SystemExit('authCandidates anchor not found')
src = src.replace(old_auth, new_auth, 1)

old_fetch = "async function fetchWithAuth(provider,url,init={}){\n  url=credentialedProviderUrl(provider,url);\n  let last=null;\n  for(const auth of authCandidates(provider)){\n    const res=await providerFetch(url,{...init,headers:{accept:'application/json',...(init.headers||{}),...auth}});\n    last=res;\n    if(![401,403].includes(res.status))return res;\n  }\n  return last;\n}"
new_fetch = "async function responseAuthRejected(res){if([401,403].includes(res.status))return true;if(!res?.ok)return false;try{const ct=String(res.headers.get('content-type')||'').toLowerCase();if(!(ct.includes('json')||ct.startsWith('text/')))return false;const text=await res.clone().text();return /unauthorized|invalid access token|invalid[^;\\n]*(?:token|api[ _-]?key)|access token/i.test(text)}catch{return false}}\nasync function fetchWithAuth(provider,url,init={}){\n  url=credentialedProviderUrl(provider,url);\n  let last=null;\n  for(const auth of authCandidates(provider)){\n    const res=await providerFetch(url,{...init,headers:{accept:'application/json',...(init.headers||{}),...auth}});\n    last=res;\n    if(!(await responseAuthRejected(res)))return res;\n  }\n  return last;\n}"
if old_fetch not in src:
    raise SystemExit('fetchWithAuth anchor not found')
src = src.replace(old_fetch, new_fetch, 1)

old_provider_json = "async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);const explicitFailure=Boolean(parsed?.kind==='json'&&parsed?.value&&typeof parsed.value==='object'&&parsed.value.success===false);if(!res.ok||explicitFailure){const detail=runtimeErrorText(parsed.value);const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();const authFailure=/unauthorized|invalid access token|invalid[^;\\n]*(?:token|api[ _-]?key)|access token/i.test(String(detail||''));const status=!res.ok?res.status:(authFailure?401:400);const xogpu=host==='xogpu.com'||host.endsWith('.xogpu.com');const prefix=xogpu&&authFailure?'XOGPU 认证失败：API Key 无效、已过期，或没有 discount_video_generation 权限':`供应商 HTTP ${status}`;const err=new Error(`${prefix}${detail?`：${detail.slice(0,500)}`:''}`);err.status=status;err.detail=detail;err.providerFailure=explicitFailure;if(status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}"
new_provider_json = "async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);const explicitFailure=Boolean(parsed?.kind==='json'&&parsed?.value&&typeof parsed.value==='object'&&parsed.value.success===false);if(!res.ok||explicitFailure){const detail=runtimeErrorText(parsed.value);const host=(()=>{try{return new URL(String(provider?.baseUrl||'')).hostname.toLowerCase()}catch{return''}})();const authFailure=/unauthorized|invalid access token|invalid[^;\\n]*(?:token|api[ _-]?key)|access token/i.test(String(detail||''));const status=!res.ok?res.status:(authFailure?401:400);const xogpu=host==='xogpu.com'||host.endsWith('.xogpu.com');const key=normalizeProviderApiKey(provider?.apiKey);const keyMeta=key?`；已使用已保存密钥（长度 ${key.length}${key.startsWith('sk-')?'，前缀 sk-':''}）`:'；当前没有可用密钥';const prefix=xogpu&&authFailure?`XOGPU 认证失败：已依次尝试 Bearer、Authorization 原始值、x-api-key、api-key${keyMeta}。XOGPU 仍拒绝该密钥`:`供应商 HTTP ${status}`;const err=new Error(`${prefix}${detail?`：${detail.slice(0,500)}`:''}`);err.status=status;err.detail=detail;err.providerFailure=explicitFailure;if(status===429)err.retryAfterMs=providerRetryAfterMs(res,detail);throw err}return parsed}"
if old_provider_json not in src:
    raise SystemExit('providerJson anchor not found')
src = src.replace(old_provider_json, new_provider_json, 1)

preview.write_text(src, encoding='utf-8')

rsrc = router.read_text(encoding='utf-8')
old_preview_cache = './browser-runtime-preview.js?v=20260909-xogpu-auth-4'
new_preview_cache = './browser-runtime-preview.js?v=20260909-xogpu-auth-5'
if old_preview_cache not in rsrc:
    raise SystemExit('router cache anchor not found')
router.write_text(rsrc.replace(old_preview_cache, new_preview_cache, 1), encoding='utf-8')

html = index.read_text(encoding='utf-8')
old_router_cache = './browser-runtime.js?v=20260909-xogpu-auth-4'
new_router_cache = './browser-runtime.js?v=20260909-xogpu-auth-5'
if old_router_cache not in html:
    raise SystemExit('index cache anchor not found')
index.write_text(html.replace(old_router_cache, new_router_cache, 1), encoding='utf-8')

test_file.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('XOGPU key normalization removes copied auth prefixes and invisible characters',()=>{
  assert.match(preview,/function normalizeProviderApiKey/);
  assert.match(preview,/Authorization\\s\*:\\s\*/);
  assert.match(preview,/Bearer\\s\+/);
  assert.match(preview,/u200B/);
});

test('XOGPU retries semantic auth failures across safe header variants',()=>{
  assert.match(preview,/Authorization:`Bearer \$\{key\}`/);
  assert.match(preview,/\{Authorization:key\}/);
  assert.match(preview,/x-api-key/);
  assert.match(preview,/api-key/);
  assert.match(preview,/responseAuthRejected/);
  assert.match(preview,/res\.clone\(\)\.text\(\)/);
});

test('XOGPU final error reports auth variants without exposing the key',()=>{
  assert.match(preview,/已依次尝试 Bearer、Authorization 原始值、x-api-key、api-key/);
  assert.match(preview,/长度 \$\{key\.length\}/);
});

test('browser cache keys are bumped for XOGPU auth v5',()=>{
  assert.match(router,/browser-runtime-preview\.js\?v=20260909-xogpu-auth-5/);
  assert.match(html,/browser-runtime\.js\?v=20260909-xogpu-auth-5/);
});
""", encoding='utf-8')
