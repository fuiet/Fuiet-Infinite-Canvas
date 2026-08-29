from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
BUILD='20260829-video-display-3'

runtime_path=ROOT/'browser-runtime.js'
app_path=ROOT/'app.js'
index_path=ROOT/'index.html'
models_path=ROOT/'models.html'
bootstrap_path=ROOT/'browser-bootstrap.js'
old_test_path=ROOT/'tests/browser-video-result-persistence.test.mjs'
new_test_path=ROOT/'tests/browser-video-display-pipeline.test.mjs'

runtime=runtime_path.read_text(encoding='utf-8')
old="await navigator.serviceWorker.register('./browser-media-sw.js?v=20260828-idb-1',{scope:'./'});"
new=f"const registration=await navigator.serviceWorker.register('./browser-media-sw.js?v={BUILD}',{{scope:'./',updateViaCache:'none'}});try{{await registration.update()}}catch{{}}"
if old in runtime:
    runtime=runtime.replace(old,new,1)
elif BUILD not in runtime:
    raise SystemExit('service worker registration anchor not found')

anchor="async function materializeGeneratedVideoOutput(value,provider){"
helper="""async function typedGeneratedVideoBlob(blob,url,res){
  if(!(blob instanceof Blob)||!blob.size)return blob;
  const current=String(blob.type||res?.headers?.get?.('content-type')||'').split(';')[0].trim().toLowerCase();
  if(current.startsWith('video/'))return blob;
  const hint=`${String(url||'')} ${String(res?.headers?.get?.('content-disposition')||'')}`.toLowerCase();
  let mime='';
  if(/\\.(mp4|m4v)(?:[?#]|$)/i.test(hint))mime='video/mp4';
  else if(/\\.webm(?:[?#]|$)/i.test(hint))mime='video/webm';
  else if(/\\.(mov|qt)(?:[?#]|$)/i.test(hint))mime='video/quicktime';
  else if(/\\.(ogv|ogg)(?:[?#]|$)/i.test(hint))mime='video/ogg';
  if(!mime){
    try{
      const head=new Uint8Array(await blob.slice(0,16).arrayBuffer());
      const ascii=String.fromCharCode(...head);
      if(head.length>=8&&ascii.slice(4,8)==='ftyp')mime='video/mp4';
      else if(head.length>=4&&head[0]===0x1a&&head[1]===0x45&&head[2]===0xdf&&head[3]===0xa3)mime='video/webm';
      else if(ascii.startsWith('OggS'))mime='video/ogg';
    }catch{}
  }
  return mime?new Blob([blob],{type:mime}):blob;
}
"""
if 'async function typedGeneratedVideoBlob(blob,url,res)' not in runtime:
    if anchor not in runtime: raise SystemExit('video materialization anchor not found')
    runtime=runtime.replace(anchor,helper+anchor,1)

old_block="""  const parsed=await readResponse(res);
  if(parsed.kind!=='blob'||!parsed.value)throw new Error('视频结果下载后未能保存到浏览器本地媒体库');
  return parsed.value;
}"""
new_block="""  const blob=await res.blob();
  if(!blob.size)throw new Error('视频结果下载为空文件');
  const typed=await typedGeneratedVideoBlob(blob,url,res);
  const stored=await storeMediaBlob(typed,{name:'generated-video'});
  if(!stored?.url)throw new Error('视频结果下载后未能保存到浏览器本地媒体库');
  return stored.url;
}"""
if old_block in runtime:
    runtime=runtime.replace(old_block,new_block,1)
elif "storeMediaBlob(typed,{name:'generated-video'})" not in runtime:
    raise SystemExit('binary video persistence block not found')
runtime_path.write_text(runtime,encoding='utf-8')

app=app_path.read_text(encoding='utf-8')
old_regex="/^(https?:\\/\\/|data:|\\/media\\/)/i.test(v.trim())"
new_regex="/^(https?:\\/\\/|data:|blob:|\\/\\/|\\/media\\/|\\/__browser_media\\/)/i.test(v.trim())"
count=app.count(old_regex)
if count:
    app=app.replace(old_regex,new_regex)
elif '/__browser_media\\/' not in app:
    raise SystemExit('generated output URL resolver anchor not found')
app_path.write_text(app,encoding='utf-8')

for p in (index_path,models_path):
    text=p.read_text(encoding='utf-8')
    text=text.replace('20260829-agnes-poll-exact-1',BUILD)
    p.write_text(text,encoding='utf-8')

bootstrap=bootstrap_path.read_text(encoding='utf-8')
bootstrap=bootstrap.replace("const v='20260829-agnes-poll-exact-1';",f"const v='{BUILD}';")
bootstrap_path.write_text(bootstrap,encoding='utf-8')

old_test=old_test_path.read_text(encoding='utf-8')
old_test=old_test.replace("  assert.match(helper,/parsed\\.kind!==['\"]blob['\"]/);", "  assert.match(helper,/res\\.blob\\(\\)/);\n  assert.match(helper,/typedGeneratedVideoBlob\\(blob,url,res\\)/);\n  assert.match(helper,/storeMediaBlob\\(typed,\\{name:'generated-video'\\}\\)/);")
old_test_path.write_text(old_test,encoding='utf-8')

new_test_path.write_text(f"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {{fileURLToPath}} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');
const BUILD='{BUILD}';

test('canvas deployment cache busts the fixed video runtime and application display code',()=>{{
  for(const src of [index,models,bootstrap])assert.ok(src.includes(BUILD),'missing fresh video display build id');
  assert.ok(index.includes(`browser-runtime.js?v=${{BUILD}}`));
  assert.ok(index.includes(`browser-bootstrap.js?v=${{BUILD}}`));
  assert.doesNotMatch(index,/browser-runtime\\.js\\?v=20260829-agnes-poll-exact-1/);
}});

test('browser media service worker bypasses stale HTTP cache',()=>{{
  assert.ok(runtime.includes(`browser-media-sw.js?v=${{BUILD}}`));
  assert.match(runtime,/updateViaCache:'none'/);
  assert.match(runtime,/registration\\.update\\(\\)/);
}});

test('downloaded generated videos get a playable MIME type before IndexedDB persistence',()=>{{
  assert.match(runtime,/async function typedGeneratedVideoBlob\\(blob,url,res\\)/);
  assert.match(runtime,/ascii\\.slice\\(4,8\\)===['\"]ftyp['\"]/);
  assert.match(runtime,/mime='video\\/mp4'/);
  assert.match(runtime,/mime='video\\/webm'/);
  assert.match(runtime,/storeMediaBlob\\(typed,\\{{name:'generated-video'\\}}\\)/);
}});

test('canvas result URL resolver accepts IndexedDB media URLs in object fields and nested fields',()=>{{
  const start=app.indexOf('function resolveGeneratedOutputUrl(output)');
  const end=app.indexOf('function semanticInputType',start);
  const section=app.slice(start,end>start?end:start+5000);
  const matches=section.match(/__browser_media/g)||[];
  assert.ok(matches.length>=3,'local browser media URL must be accepted for strings, direct object keys, and nested object paths');
  assert.match(section,/blob:/);
}});
""",encoding='utf-8')

print('patched browser video display pipeline',BUILD)
