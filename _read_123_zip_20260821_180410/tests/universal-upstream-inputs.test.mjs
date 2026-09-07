import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Upstream=require('../upstream-generation-inputs-v1.js');

function linked(){return[
  {id:'text-1',type:'text',role:'prompt_context',title:'原始故事',text:'女孩在雨夜车站发现一只受伤的小狗。'},
  {id:'image-1',type:'image',role:'character_reference',title:'女孩角色图',url:'https://cdn.example.com/girl.png'},
  {id:'video-1',type:'video',role:'motion_reference',title:'雨夜动作参考',url:'https://cdn.example.com/rain.mp4'}
]}

test('text generation uses upstream text as primary prompt and preserves image/video references',()=>{
  const task=Upstream.normalizeTask({nodeType:'text',prompt:'请根据素材生成结构化剧本。',references:[],parameters:{operation:'script_breakdown',creativeContext:{linkedReferences:linked()}}});
  assert.ok(task.prompt.startsWith('女孩在雨夜车站发现一只受伤的小狗。'));
  assert.ok(task.prompt.indexOf('女孩在雨夜')<task.prompt.indexOf('请根据素材'));
  assert.equal(task.references.length,3);
  assert.deepEqual(task.references.map(x=>x.type).sort(),['image','text','video']);
  assert.equal(task.parameters.upstreamInputContract.version,5);
  assert.equal(task.parameters.upstreamInputContract.textCount,1);
  assert.equal(task.parameters.upstreamInputContract.mediaCount,2);
});

test('script tasks obey the same universal upstream contract',()=>{
  const task=Upstream.normalizeTask({nodeType:'script',prompt:'补充要求：每集 60 秒。',references:linked(),parameters:{}});
  assert.match(task.prompt,/女孩在雨夜车站/);
  assert.match(task.prompt,/每集 60 秒/);
  assert.equal(task.references.filter(x=>x.type==='image').length,1);
  assert.equal(task.references.filter(x=>x.type==='video').length,1);
  assert.equal(task.parameters.upstreamInputContract.version,5);
});

test('audio generation also receives upstream text and media instead of bypassing the contract',()=>{
  const task=Upstream.normalizeTask({nodeType:'audio',prompt:'生成旁白',references:linked(),parameters:{}});
  assert.ok(task.prompt.startsWith('女孩在雨夜车站'));
  assert.equal(task.references.length,3);
  assert.equal(task.parameters.upstreamInputContract.connected,true);
});

test('desktop and browser text runtimes explicitly support connected image/video references',()=>{
  const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
  const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
  for(const source of [server,browser]){
    assert.match(source,/function providerTextReferenceContent\(/);
    assert.match(source,/type:'image_url'/);
    assert.match(source,/type:'video_url'/);
    assert.match(source,/mergeUpstreamReferenceText\(prompt,references/);
    assert.match(source,/【上游媒体参考】/);
  }
});

test('browser cache revisions force the universal input contract and runtime refresh',()=>{
  const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
  const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(bootstrap,/20260907-universal-upstream-inputs-1/);
  assert.match(router,/browser-runtime-preview\.js\?v=20260907-universal-upstream-inputs-1/);
});
