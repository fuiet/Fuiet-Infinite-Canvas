import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Upstream=require('../upstream-generation-inputs-v1.js');
const Images=require('../model-image-capabilities.js');

test('video task restores all connected upstream refs and uses upstream text as prompt',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'video',
    prompt:'',
    references:[],
    parameters:{videoMode:'text2video',generationMode:'text2video',creativeContext:{linkedReferences:[
      {id:'text-1',type:'text',role:'prompt_context',text:'赛博朋克雨夜里，黑衣人物缓慢向镜头走来。'},
      {id:'image-1',type:'image',role:'reference',url:'https://cdn.example.com/street.png'}
    ]}}
  });
  assert.equal(task.prompt,'赛博朋克雨夜里，黑衣人物缓慢向镜头走来。');
  assert.equal(task.references.length,2);
  assert.equal(task.references[1].url,'https://cdn.example.com/street.png');
  assert.equal(task.parameters.videoMode,'image2video');
  assert.equal(task.parameters.generationMode,'image2video');
  assert.equal(task.parameters.operation,'image2video');
  assert.deepEqual(task.parameters.upstreamInputContract,{version:1,connected:true,textCount:1,mediaCount:1,localPromptOptional:true});
});

test('single connected image becomes XOGPU first frame instead of weak omni reference',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'video',prompt:'',references:[],
    parameters:{videoMode:'text2video',generationMode:'text2video',creativeContext:{linkedReferences:[
      {id:'text-1',type:'text',role:'prompt_context',text:'让角色缓慢向镜头走来'},
      {id:'image-1',type:'image',role:'reference',url:'https://cdn.example.com/character.png'}
    ]}}
  });
  const src=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const ctx={globalThis:{},URL};vm.createContext(ctx);vm.runInContext(src,ctx);
  const V=ctx.globalThis.CanvasVideoProtocolRegistry;
  const operation=V.detectOperation({references:task.references,parameters:task.parameters});
  assert.equal(operation,'image-to-video');
  const mapped=V.mapRequest(
    {baseUrl:'https://xogpu.com/v1'},
    {id:'MiniMax-H3',name:'MiniMax H3'},
    task,
    {protocolFamily:'xogpu-minimax-h3',videoOperation:operation},
    task.references
  );
  const image=mapped.body.content.find(item=>item.type==='image_url');
  assert.equal(image.role,'first_frame');
  assert.equal(image.image_url.url,'https://cdn.example.com/character.png');
});

test('explicit first and last frames preserve frame generation semantics',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'video',prompt:'镜头自然过渡',references:[],
    parameters:{videoMode:'text2video',creativeContext:{linkedReferences:[
      {id:'first',type:'image',role:'first_frame',url:'https://cdn.example.com/first.png'},
      {id:'last',type:'image',role:'last_frame',url:'https://cdn.example.com/last.png'}
    ]}}
  });
  assert.equal(task.parameters.videoMode,'frame2video');
  assert.equal(task.parameters.generationMode,'frame2video');
  assert.equal(task.parameters.operation,'first-last-frame');
});

test('local generator prompt is optional supplemental text, not a replacement for upstream text',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'image',
    prompt:'电影级写实光影',
    references:[{id:'text-1',type:'text',text:'白色小狗站在房间中央'}],
    parameters:{creativeContext:{linkedReferences:[]}}
  });
  assert.equal(task.prompt,'白色小狗站在房间中央\n\n电影级写实光影');
});

test('reference-only generation gets a safe provider prompt without requiring generator text',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'video',prompt:'',references:[],
    parameters:{creativeContext:{linkedReferences:[{id:'image-1',type:'image',url:'https://cdn.example.com/ref.png'}]}}
  });
  assert.match(task.prompt,/严格依据已连接的上游参考素材生成视频/);
  assert.equal(task.references.length,1);
  assert.equal(task.parameters.videoMode,'image2video');
});

test('seedream image request actually includes the connected image and upstream text',()=>{
  const mapped=Images.mapRequest(
    {name:'Volcengine',baseUrl:'https://ark.cn-beijing.volces.com/api/v3'},
    {id:'doubao-seedream-4.5',name:'Seedream 4.5',modality:'image'},
    {aspectRatio:'1:1',resolution:'2K'},
    '',1,
    [
      {type:'text',role:'prompt_context',text:'保持参考角色，改成雨夜街景'},
      {type:'image',role:'reference',url:'https://cdn.example.com/character.png'}
    ]
  );
  assert.equal(mapped.body.prompt,'保持参考角色，改成雨夜街景');
  assert.equal(mapped.body.image,'https://cdn.example.com/character.png');
  assert.match(mapped.profile,/reference/);
});

test('image adapter refuses to silently ignore an upstream image on a text-only model',()=>{
  assert.throws(()=>Images.mapRequest(
    {name:'SiliconFlow',baseUrl:'https://api.siliconflow.cn/v1'},
    {id:'Qwen/Qwen-Image',name:'Qwen Image',modality:'image'},
    {aspectRatio:'1:1',resolution:'原生'},'',1,
    [{type:'image',role:'reference',url:'https://cdn.example.com/ref.png'}]
  ),/不支持参考图|阻止/);
});
