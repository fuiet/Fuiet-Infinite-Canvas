from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUNTIME=ROOT/'_read_123_zip_20260821_180410'/'browser-runtime.js'
text=RUNTIME.read_text(encoding='utf-8')

# Central credential boundary: anything carrying provider auth must stay on the
# configured Base URL origin. Cross-origin result/CDN downloads remain possible,
# but only after auth-like headers are stripped.
marker="function authCandidates(provider){"
helpers=r'''function providerOrigin(provider){try{return new URL(String(provider?.baseUrl||''),location.href).origin}catch{return''}}
function isProviderOriginUrl(provider,url){try{const expected=providerOrigin(provider);if(!expected)return false;return new URL(String(url||''),String(provider?.baseUrl||location.href)).origin===expected}catch{return false}}
function credentialedProviderUrl(provider,url){if(!isProviderOriginUrl(provider,url))throw new Error('安全策略阻止向供应商 Base URL 之外的地址发送 API Key');return String(url)}
function stripCredentialHeaders(headers={}){const out={};for(const [k,v] of Object.entries(headers||{})){const n=String(k).toLowerCase();if(n==='authorization'||n==='proxy-authorization'||n==='x-api-key'||n==='api-key'||/(^|[-_])(token|secret|api[-_]?key)([-_]|$)/i.test(n))continue;out[k]=v}return out}
function providerRouteUrl(provider,value){const text=String(value||'').trim();if(!text)return'';try{const url=/^https?:\/\//i.test(text)?text:joinUrl(provider.baseUrl,text);return isProviderOriginUrl(provider,url)?url:''}catch{return''}}
function providerResourceUrl(provider,value){const text=String(value||'').trim();if(!text)return'';try{if(/^https?:\/\//i.test(text))return new URL(text).toString();if(text.startsWith('/'))return joinUrl(provider.baseUrl,text);return''}catch{return''}}
'''
if 'function credentialedProviderUrl(provider,url)' not in text:
    if marker not in text: raise SystemExit('authCandidates marker missing')
    text=text.replace(marker,helpers+marker,1)

old_fetch="async function fetchWithAuth(provider,url,init={}){\n  let last=null;"
new_fetch="async function fetchWithAuth(provider,url,init={}){\n  url=credentialedProviderUrl(provider,url);\n  let last=null;"
if old_fetch in text:
    text=text.replace(old_fetch,new_fetch,1)
elif new_fetch not in text:
    raise SystemExit('fetchWithAuth marker missing')

# Keep signed CDN result downloads working without ever forwarding provider auth.
fetch_end="  return last;\n}\nasync function readResponse(res)"
fetch_insert="  return last;\n}\nasync function fetchProviderResource(provider,url,init={}){\n  if(isProviderOriginUrl(provider,url))return fetchWithAuth(provider,url,init);\n  return providerFetch(url,{...init,headers:stripCredentialHeaders(init.headers||{})});\n}\nasync function readResponse(res)"
if 'async function fetchProviderResource(provider,url,init={})' not in text:
    if fetch_end not in text: raise SystemExit('fetchWithAuth end marker missing')
    text=text.replace(fetch_end,fetch_insert,1)

old_video="function videoUrlCandidate(provider,value){const text=String(value||'').trim();if(!text)return'';if(/^https?:\\/\\//i.test(text))return text;if(text.startsWith('/'))return joinUrl(provider.baseUrl,text);return''}\nfunction videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){\n  const out=[],add=value=>{const url=videoUrlCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};"
new_video="function videoRouteCandidate(provider,value){return providerRouteUrl(provider,value)}\nfunction videoResourceCandidate(provider,value){return providerResourceUrl(provider,value)}\nfunction videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){\n  const out=[],add=value=>{const url=videoRouteCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};"
if old_video in text:
    text=text.replace(old_video,new_video,1)
elif 'function videoRouteCandidate(provider,value)' not in text:
    raise SystemExit('videoUrlCandidate marker missing')

old_content="const candidates=[],add=value=>{const url=videoUrlCandidate(provider,value);if(url&&!candidates.includes(url))candidates.push(url)};"
new_content="const candidates=[],add=value=>{const url=videoResourceCandidate(provider,value);if(url&&!candidates.includes(url))candidates.push(url)};"
if old_content in text:
    text=text.replace(old_content,new_content,1)
elif new_content not in text:
    raise SystemExit('fetchVideoContent candidate marker missing')

old_download="let last=null;for(const url of candidates){const res=await fetchWithAuth(provider,url,{method:'GET'});"
new_download="let last=null;for(const url of candidates){const res=await fetchProviderResource(provider,url,{method:'GET'});"
if old_download in text:
    text=text.replace(old_download,new_download,1)
elif new_download not in text:
    raise SystemExit('fetchVideoContent download marker missing')

RUNTIME.write_text(text,encoding='utf-8')
print('browser provider-origin hardening applied')
