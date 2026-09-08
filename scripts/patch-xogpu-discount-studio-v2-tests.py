from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'_read_123_zip_20260821_180410'
UP=APP/'tests'/'upstream-generation-inputs.test.mjs'
STRICT=APP/'tests'/'xogpu-browser-strict-request.test.mjs'

text=UP.read_text(encoding='utf-8')
text=text.replace('upstreamInputContract,{version:5,','upstreamInputContract,{version:6,')
old="""    const image=mapped.body.content.find(item=>item.type==='image_url');
    assert.equal(image.role,'reference_image');
    assert.equal(image.image_url.url,'https://cdn.example.com/xiaolin.png');"""
new="""    assert.equal(mapped.body.model,'MiniMax-H3');
    assert.equal(mapped.body.seconds,5);
    assert.deepEqual(JSON.parse(mapped.body.metadata),{mode:'multi',ratio:'adaptive'});
    assert.equal('content' in mapped.body,false);
    assert.equal(task.references[0].url,'https://cdn.example.com/xiaolin.png');"""
if old not in text: raise SystemExit('character reference assertion block missing')
text=text.replace(old,new,1)
old="""  const image=mapped.body.content.find(item=>item.type==='image_url');
  assert.equal(image.role,'first_frame');
  assert.equal(image.image_url.url,'https://cdn.example.com/character.png');"""
new="""  assert.equal(mapped.body.model,'MiniMax-H3');
  assert.equal(mapped.body.seconds,5);
  assert.deepEqual(JSON.parse(mapped.body.metadata),{mode:'image',ratio:'adaptive'});
  assert.equal('content' in mapped.body,false);
  assert.equal(task.references.find(ref=>ref.type==='image').url,'https://cdn.example.com/character.png');"""
if old not in text: raise SystemExit('single image assertion block missing')
text=text.replace(old,new,1)
UP.write_text(text,encoding='utf-8')

STRICT.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');

test('XOGPU specialized mapper wins before any generic requestTemplate',()=>{
  const priority=src.indexOf(\"if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'\");
  const template=src.indexOf('if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);');
  assert.ok(priority>=0);assert.ok(template>priority);
});

test('XOGPU text-only JSON is strict and contains no media content array',()=>{
  const start=src.indexOf('function xogpuStrictVideoBody('),end=src.indexOf('function mergeUpstreamReferenceText',start);
  const fn=src.slice(start,end);
  assert.match(fn,/group:'discount_video_generation'/);
  assert.match(fn,/model:'MiniMax-H3'/);
  assert.equal(/out\\.content|content=src\\.content/.test(fn),false);
});

test('XOGPU media uses discount studio multipart exact fields',()=>{
  assert.match(src,/function buildXogpuDiscountVideoForm/);
  assert.match(src,/form\\.append\\('metadata',JSON\\.stringify\\(\\{mode,ratio\\}\\)\\)/);
  for(const field of ['input_reference','end_reference','reference_images','reference_videos','reference_audios'])assert.ok(src.includes(`form,'${field}'`)||src.includes(`form.append('${field}'`));
});

test('XOGPU media route forbids silent JSON fallback',()=>{
  assert.match(src,/route\\.noJsonFallback\\|\\|route\\.strictMediaTransport/);
  assert.match(src,/route\\?\\.strictCreatePath\\|\\|!autoVideoRoute/);
});
""",encoding='utf-8')
print('XOGPU transport regression tests updated')
