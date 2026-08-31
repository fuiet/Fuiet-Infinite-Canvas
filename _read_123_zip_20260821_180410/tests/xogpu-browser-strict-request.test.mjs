import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');

test('XOGPU specialized mapper wins before any generic requestTemplate',()=>{
  const priority=src.indexOf("if(mod==='video'&&String(route?.protocolFamily||route?.family||'').toLowerCase()==='xogpu-minimax-h3'");
  const template=src.indexOf('if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);');
  assert.ok(priority>=0);assert.ok(template>priority);
});

test('XOGPU outbound video JSON is strict-whitelisted immediately before POST',()=>{
  assert.match(src,/function xogpuStrictVideoBody\(body=\{\},route=\{\}\)/);
  assert.match(src,/group:'discount_video_generation'/);
  assert.match(src,/if\(Array\.isArray\(src\.content\)&&src\.content\.length\)out\.content=src\.content/);
  assert.match(src,/portableizeVideoJsonBody\(body,route\)\.then\(value=>xogpuStrictVideoBody\(value,route\)\)/);
});

test('XOGPU strict body does not copy legacy top-level image aliases',()=>{
  const start=src.indexOf('function xogpuStrictVideoBody('),end=src.indexOf('function defaultRequestBody(',start);
  const fn=src.slice(start,end);
  assert.ok(fn.includes("const out={model:'MiniMax-H3'"));
  assert.equal(/out\.(images|image|image_url|image_urls|seconds|size|aspect_ratio)\s*=/.test(fn),false);
});
