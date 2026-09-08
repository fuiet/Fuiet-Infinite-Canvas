import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');

test('XOGPU specialized mapper wins before any generic requestTemplate',()=>{
  const priority=src.indexOf("if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'");
  const template=src.indexOf('if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);');
  assert.ok(priority>=0);assert.ok(template>priority);
});

test('XOGPU text-only JSON is strict and contains no media content array',()=>{
  const start=src.indexOf('function xogpuStrictVideoBody('),end=src.indexOf('function mergeUpstreamReferenceText',start);
  const fn=src.slice(start,end);
  assert.match(fn,/group:'discount_video_generation'/);
  assert.match(fn,/model:'MiniMax-H3'/);
  assert.equal(/out\.content|content=src\.content/.test(fn),false);
});

test('XOGPU media uses discount studio multipart exact fields',()=>{
  assert.match(src,/function buildXogpuDiscountVideoForm/);
  assert.match(src,/form\.append\('metadata',JSON\.stringify\(\{mode,ratio\}\)\)/);
  for(const field of ['input_reference','end_reference','reference_images','reference_videos','reference_audios'])assert.ok(src.includes(`form,'${field}'`)||src.includes(`form.append('${field}'`));
});

test('XOGPU media route forbids silent JSON fallback',()=>{
  assert.match(src,/route\.noJsonFallback\|\|route\.strictMediaTransport/);
  assert.match(src,/route\?\.strictCreatePath\|\|!autoVideoRoute/);
});
