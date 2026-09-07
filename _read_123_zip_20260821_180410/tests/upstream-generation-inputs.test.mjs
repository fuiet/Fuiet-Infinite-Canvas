import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Upstream=require('../upstream-generation-inputs-v1.js');
const Images=require('../model-image-capabilities.js');

function withStoredCanvasState(state,run){
  const previous=globalThis.CanvasBrowserStorageManager;
  globalThis.CanvasBrowserStorageManager={getItem:key=>key==='libtv-clone-state'?JSON.stringify(state):null};
  try{return run()}finally{
    if(previous===undefined)delete globalThis.CanvasBrowserStorageManager;
    else globalThis.CanvasBrowserStorageManager=previous;
  }
}
function videoRegistry(){
  const src=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');
  const ctx={globalThis:{},URL};vm.createContext(ctx);vm.runInContext(src,ctx);
  return ctx.globalThis.CanvasVideoProtocolRegistry;
}

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
  assert.deepEqual(task.parameters.upstreamInputContract,{version:5,connected:true,textCount:1,mediaCount:1,scriptAssetCount:0,scriptStyleCount:0,promptProvenance:false,localPromptOptional:true});
});

test('script batch task inherits uploaded character scene and prop media without canvas image nodes',()=>{
  withStoredCanvasState({nodes:[{
    id:'script-1',type:'script',scriptData:{
      assets:{
        characters:[{id:'char-1',name:'小林',prompt:'短发青年',mediaUrl:'https://cdn.example.com/xiaolin.png'}],
        scenes:[{id:'scene-1',name:'客厅',prompt:'暖色现代客厅',mediaUrl:'https://cdn.example.com/living-room.png'}],
        props:[{id:'prop-1',name:'红色钥匙',prompt:'红色金属钥匙',mediaUrl:'https://cdn.example.com/key.png'}]
      },
      shots:[{id:'shot-1',characters:'小林',scene:'客厅',props:'红色钥匙',action:'小林在客厅拿起红色钥匙',dialogue:'',assetRefs:['char-1','scene-1','prop-1']}]
    }
  }]},()=>{
    const task=Upstream.normalizeTask({
      nodeType:'image',prompt:'已经确认的最终图像提示词',references:[],
      parameters:{scriptNodeId:'script-1',shotId:'shot-1',creativeContext:{linkedReferences:[]}}
    });
    assert.equal(task.prompt,'已经确认的最终图像提示词');
    assert.equal(task.references.length,3);
    assert.deepEqual(task.references.map(ref=>ref.url).sort(),[
      'https://cdn.example.com/key.png',
      'https://cdn.example.com/living-room.png',
      'https://cdn.example.com/xiaolin.png'
    ]);
    assert.deepEqual(task.references.map(ref=>ref.role).sort(),['character_reference','image_reference','scene_reference']);
    assert.equal(task.parameters.upstreamInputContract.scriptAssetCount,3);
    assert.equal(task.parameters.upstreamInputContract.scriptStyleCount,0);
    assert.equal(task.parameters.upstreamInputContract.mediaCount,3);
  });
});

test('script asset fallback de-duplicates an already connected media reference',()=>{
  withStoredCanvasState({nodes:[{
    id:'script-1',type:'script',scriptData:{
      assets:{characters:[{id:'char-1',name:'小林',mediaUrl:'https://cdn.example.com/xiaolin.png'}],scenes:[],props:[]},
      shots:[{id:'shot-1',characters:'小林',scene:'',props:'',action:'小林看向镜头',dialogue:'',assetRefs:['char-1']}]
    }
  }]},()=>{
    const task=Upstream.normalizeTask({
      nodeType:'image',prompt:'final',
      references:[{id:'image-node-1',sourceNodeId:'image-node-1',type:'image',role:'character_reference',url:'https://cdn.example.com/xiaolin.png'}],
      parameters:{scriptNodeId:'script-1',shotId:'shot-1',creativeContext:{linkedReferences:[]}}
    });
    assert.equal(task.references.length,1);
    assert.equal(task.references[0].id,'image-node-1');
    assert.equal(task.references[0].url,'https://cdn.example.com/xiaolin.png');
    assert.equal(task.parameters.upstreamInputContract.mediaCount,1);
    assert.equal(task.parameters.upstreamInputContract.scriptAssetCount,0);
  });
});

test('script asset fallback also recovers a named asset when legacy assetRefs is empty',()=>{
  withStoredCanvasState({nodes:[{
    id:'script-1',type:'script',scriptData:{
      assets:{characters:[],scenes:[],props:[{id:'prop-1',name:'红色钥匙',mediaUrl:'https://cdn.example.com/key.png'}]},
      shots:[{id:'shot-1',characters:'',scene:'',props:'红色钥匙',action:'手拿起红色钥匙',dialogue:'',assetRefs:[]}]
    }
  }]},()=>{
    const task=Upstream.normalizeTask({nodeType:'image',prompt:'final',references:[],parameters:{scriptNodeId:'script-1',shotId:'shot-1'}});
    assert.equal(task.references.length,1);
    assert.equal(task.references[0].assetId,'prop-1');
    assert.equal(task.references[0].role,'image_reference');
  });
});

test('global script style media URLs and canvas nodes become style references',()=>{
  withStoredCanvasState({nodes:[
    {id:'style-node-1',type:'image',title:'胶片风格',outputUrl:'https://cdn.example.com/style-node.png'},
    {id:'script-1',type:'script',scriptData:{
      globalStyle:{text:'90 年代胶片电影质感',referenceMediaUrls:['https://cdn.example.com/style-upload.png'],referenceNodeIds:['style-node-1']},
      assets:{characters:[],scenes:[],props:[]},
      shots:[{id:'shot-1',characters:'',scene:'街道',props:'',action:'人物走过街道',dialogue:'',assetRefs:[]}]
    }}
  ]},()=>{
    const task=Upstream.normalizeTask({nodeType:'image',prompt:'最终画面提示词',references:[],parameters:{scriptNodeId:'script-1',shotId:'shot-1'}});
    const styleRefs=task.references.filter(ref=>ref.kind==='script_style');
    assert.equal(styleRefs.length,2);
    assert.deepEqual(styleRefs.map(ref=>ref.url).sort(),['https://cdn.example.com/style-node.png','https://cdn.example.com/style-upload.png']);
    assert.ok(styleRefs.every(ref=>ref.role==='style_reference'));
    assert.equal(task.parameters.upstreamInputContract.scriptStyleCount,2);
  });
});

test('single semantic character reference stays reference-to-video instead of becoming a first frame',()=>{
  withStoredCanvasState({nodes:[{
    id:'script-1',type:'script',scriptData:{
      globalStyle:{text:'',referenceMediaUrls:[],referenceNodeIds:[]},
      assets:{characters:[{id:'char-1',name:'小林',mediaUrl:'https://cdn.example.com/xiaolin.png'}],scenes:[],props:[]},
      shots:[{id:'shot-1',characters:'小林',scene:'',props:'',action:'小林向镜头走来',dialogue:'',assetRefs:['char-1']}]
    }
  }]},()=>{
    const task=Upstream.normalizeTask({nodeType:'video',prompt:'小林缓慢向镜头走来',references:[],parameters:{scriptNodeId:'script-1',shotId:'shot-1',videoMode:'text2video',generationMode:'text2video'}});
    assert.equal(task.parameters.operation,'reference2video');
    assert.equal(task.parameters.videoMode,'omni_reference');
    assert.equal(task.parameters.generationMode,'omni_reference');
    const V=videoRegistry(),operation=V.detectOperation({references:task.references,parameters:task.parameters});
    assert.equal(operation,'reference-to-video');
    const mapped=V.mapRequest(
      {baseUrl:'https://xogpu.com/v1'},
      {id:'MiniMax-H3',name:'MiniMax H3'},
      task,
      {protocolFamily:'xogpu-minimax-h3',videoOperation:operation},
      task.references
    );
    const image=mapped.body.content.find(item=>item.type==='image_url');
    assert.equal(image.role,'reference_image');
    assert.equal(image.image_url.url,'https://cdn.example.com/xiaolin.png');
  });
});

test('single style reference also stays reference-to-video',()=>{
  withStoredCanvasState({nodes:[{
    id:'script-1',type:'script',scriptData:{
      globalStyle:{text:'复古胶片',referenceMediaUrls:['https://cdn.example.com/style.png'],referenceNodeIds:[]},
      assets:{characters:[],scenes:[],props:[]},
      shots:[{id:'shot-1',characters:'',scene:'街道',props:'',action:'街道空镜',dialogue:'',assetRefs:[]}]
    }
  }]},()=>{
    const task=Upstream.normalizeTask({nodeType:'video',prompt:'街道空镜',references:[],parameters:{scriptNodeId:'script-1',shotId:'shot-1',videoMode:'text2video'}});
    assert.equal(task.references.length,1);
    assert.equal(task.references[0].role,'style_reference');
    assert.equal(task.parameters.operation,'reference2video');
    assert.equal(task.parameters.videoMode,'omni_reference');
  });
});

test('single connected image becomes XOGPU first frame instead of weak omni reference',()=>{
  const task=Upstream.normalizeTask({
    nodeType:'video',prompt:'',references:[],
    parameters:{videoMode:'text2video',generationMode:'text2video',creativeContext:{linkedReferences:[
      {id:'text-1',type:'text',role:'prompt_context',text:'让角色缓慢向镜头走来'},
      {id:'image-1',type:'image',role:'reference',url:'https://cdn.example.com/character.png'}
    ]}}
  });
  const V=videoRegistry();
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
