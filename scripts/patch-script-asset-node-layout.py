from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410' / 'app.js'
BOOT = ROOT / '_read_123_zip_20260821_180410' / 'browser-bootstrap.js'
LAYOUT = ROOT / '_read_123_zip_20260821_180410' / 'script-asset-node-layout-v1.js'
TEST = ROOT / '_read_123_zip_20260821_180410' / 'tests' / 'script-asset-node-layout.test.mjs'

layout_src = r'''/* Fuiet Infinite Canvas · script asset canvas layout
 * Script-created asset nodes must be readable production artifacts, not overlapping cards.
 * New nodes are placed on a collision-aware grid to the right of their script node.
 * Legacy script asset nodes are repaired once; user movement after repair is preserved.
 */
(()=>{
'use strict';
const OPS=new Set(['script_asset','script_asset_reference']);
const TYPE_ORDER={characters:0,character:0,scenes:1,scene:1,props:2,prop:2};
const GRID=Object.freeze({columns:3,nodeWidth:320,nodeHeight:300,gapX:72,gapY:72,offsetX:520,padding:24,version:1});
const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
function isScriptAssetNode(node,scriptNodeId=''){
  if(!node||node.type!=='image'||!OPS.has(String(node.toolParams?.operation||'')))return false;
  return !scriptNodeId||String(node.toolParams?.scriptNodeId||'')===String(scriptNodeId);
}
function nodeRect(node,w=GRID.nodeWidth,h=GRID.nodeHeight){return{x:num(node?.x),y:num(node?.y),w:Math.max(1,num(node?.w,w)),h:Math.max(1,num(node?.h,h))}}
function rectsOverlap(a,b,padding=GRID.padding){return a.x<a.x+a.w&&a.y<a.y+a.h&&a.x<b.x+b.w+padding&&a.x+a.w+padding>b.x&&a.y<b.y+b.h+padding&&a.y+a.h+padding>b.y}
function slotPlacement(scriptNode,index=0){
  const slot=Math.max(0,Math.floor(num(index,0))),col=slot%GRID.columns,row=Math.floor(slot/GRID.columns);
  return{x:num(scriptNode?.x)+GRID.offsetX+col*(GRID.nodeWidth+GRID.gapX),y:num(scriptNode?.y)+row*(GRID.nodeHeight+GRID.gapY),index:slot};
}
function collides(candidate,nodes=[],options={}){
  const rect={x:candidate.x,y:candidate.y,w:num(options.w,GRID.nodeWidth),h:num(options.h,GRID.nodeHeight)};
  return nodes.some(node=>rectsOverlap(rect,nodeRect(node),num(options.padding,GRID.padding)));
}
function nextPlacement(state={},scriptNode,options={}){
  const nodes=Array.isArray(state.nodes)?state.nodes:[],ignore=new Set((options.ignoreNodeIds||[]).map(String));
  const own=nodes.filter(node=>isScriptAssetNode(node,scriptNode?.id)&&!ignore.has(String(node.id)));
  const occupied=nodes.filter(node=>!ignore.has(String(node.id)));
  const requested=Number.isFinite(Number(options.index))?Math.max(0,Math.floor(Number(options.index))):own.length;
  for(let slot=requested;slot<requested+600;slot++){
    const candidate=slotPlacement(scriptNode,slot);
    if(!collides(candidate,occupied,options))return candidate;
  }
  return slotPlacement(scriptNode,requested+600);
}
function catalogOrder(scriptNode){
  const out=new Map(),assets=scriptNode?.scriptData?.assets||{};let index=0;
  for(const key of ['characters','scenes','props'])for(const asset of (Array.isArray(assets[key])?assets[key]:[]))if(asset?.id&&!out.has(String(asset.id)))out.set(String(asset.id),index++);
  return out;
}
function repairState(state={}){
  if(!Array.isArray(state.nodes)||!state.nodes.length)return state;
  const scripts=new Map(state.nodes.filter(node=>node?.type==='script'&&node?.id).map(node=>[String(node.id),node]));
  for(const [scriptId,scriptNode] of scripts){
    const all=state.nodes.filter(node=>isScriptAssetNode(node,scriptId));
    const moving=all.filter(node=>num(node.toolParams?.scriptAssetLayoutVersion,0)<GRID.version);
    if(!moving.length)continue;
    const order=catalogOrder(scriptNode);
    moving.sort((a,b)=>{
      const ai=order.has(String(a.toolParams?.assetId||''))?order.get(String(a.toolParams.assetId)):999999;
      const bi=order.has(String(b.toolParams?.assetId||''))?order.get(String(b.toolParams.assetId)):999999;
      if(ai!==bi)return ai-bi;
      const at=TYPE_ORDER[String(a.toolParams?.assetType||'')]??99,bt=TYPE_ORDER[String(b.toolParams?.assetType||'')]??99;
      return at-bt||num(a.y)-num(b.y)||num(a.x)-num(b.x)||String(a.id).localeCompare(String(b.id));
    });
    const movingIds=new Set(moving.map(node=>String(node.id))),occupied=state.nodes.filter(node=>!movingIds.has(String(node.id)));
    let slot=0;
    for(const node of moving){
      let candidate;
      for(;slot<1000;slot++){
        candidate=slotPlacement(scriptNode,slot);
        if(!collides(candidate,occupied,{w:num(node.w,GRID.nodeWidth),h:num(node.h,GRID.nodeHeight)})){slot++;break}
      }
      node.x=candidate.x;node.y=candidate.y;
      node.toolParams={...(node.toolParams||{}),scriptAssetLayoutVersion:GRID.version};
      occupied.push(node);
    }
  }
  return state;
}
const api=Object.freeze({GRID,isScriptAssetNode,nodeRect,rectsOverlap,slotPlacement,nextPlacement,repairState});
globalThis.FuietScriptAssetNodeLayoutV1=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
'''

# Fix a typo-prone overlap expression defensively before writing.
layout_src = layout_src.replace("return a.x<a.x+a.w&&a.y<a.y+a.h&&a.x<b.x+b.w+padding&&a.x+a.w+padding>b.x&&a.y<b.y+b.h+padding&&a.y+a.h+padding>b.y", "return a.x<b.x+b.w+padding&&a.x+a.w+padding>b.x&&a.y<b.y+b.h+padding&&a.y+a.h+padding>b.y")
LAYOUT.write_text(layout_src, encoding='utf-8')

app = APP.read_text(encoding='utf-8')
old_return = "    return next;\n  }\n  function errorText(value,depth=0){"
new_return = "    try{globalThis.FuietScriptAssetNodeLayoutV1?.repairState?.(next)}catch(error){console.warn('[script-asset-layout] legacy repair skipped',error)}\n    return next;\n  }\n  function errorText(value,depth=0){"
if old_return not in app and "legacy repair skipped" not in app:
    raise SystemExit('migrateState insertion point not found')
app = app.replace(old_return, new_return, 1)

old_upload = "  function createUploadedScriptAssetNode(scriptNode,a,key,url){const img={id:uid('n'),type:'image',x:scriptNode.x+520+(a.nodeIds?.length||0)*24,y:scriptNode.y+(key==='characters'?0:key==='scenes'?300:600),w:320,title:`${a.name||'脚本资产'} · 参考`,content:'',outputUrl:url,prompt:'',providerId:'',modelId:'',modelName:'',toolParams:{operation:'script_asset_reference',assetType:key,assetId:a.id,scriptNodeId:scriptNode.id}};state.nodes.push(img);createEdge(scriptNode.id,img.id,{type:'script-asset',role:key==='characters'?'character_reference':key==='scenes'?'scene_reference':'image_reference',silent:true});return img}"
new_upload = "  function createUploadedScriptAssetNode(scriptNode,a,key,url){const place=globalThis.FuietScriptAssetNodeLayoutV1?.nextPlacement?.(state,scriptNode)||{x:scriptNode.x+520,y:scriptNode.y};const img={id:uid('n'),type:'image',x:place.x,y:place.y,w:320,title:`${a.name||'脚本资产'} · 参考`,content:'',outputUrl:url,prompt:'',providerId:'',modelId:'',modelName:'',toolParams:{operation:'script_asset_reference',assetType:key,assetId:a.id,scriptNodeId:scriptNode.id,scriptAssetLayoutVersion:1}};state.nodes.push(img);createEdge(scriptNode.id,img.id,{type:'script-asset',role:key==='characters'?'character_reference':key==='scenes'?'scene_reference':'image_reference',silent:true});return img}"
if old_upload not in app and "scriptAssetLayoutVersion:1}};state.nodes.push(img);createEdge(scriptNode.id,img.id,{type:'script-asset'" not in app:
    raise SystemExit('uploaded script asset creator not found')
app = app.replace(old_upload, new_upload, 1)

old_gen = "  function createScriptAssetNode(scriptNode,a,type,offset=0,select=true){const p=providerById(scriptNode.assetProviderId),m=p?.models?.find(x=>x.id===scriptNode.assetModelId&&x.modality==='image');const img={id:uid('n'),type:'image',x:scriptNode.x+520+offset,y:scriptNode.y+(type==='characters'?0:type==='scenes'?300:600),w:320,title:a.name||'脚本资产',content:'',outputUrl:a.mediaUrl||'',prompt:a.prompt||'',providerId:p?.id||'',modelId:m?.id||'',modelName:m?.name||'',toolParams:{operation:'script_asset',assetType:type,assetId:a.id,scriptNodeId:scriptNode.id}};state.nodes.push(img);state.edges.push({id:uid('e'),source:scriptNode.id,target:img.id,type:'script-asset'});(a.nodeIds||(a.nodeIds=[])).push(img.id);if(select)selectedId=img.id;saveState();render();return img}"
new_gen = "  function createScriptAssetNode(scriptNode,a,type,layoutIndex=0,select=true){const p=providerById(scriptNode.assetProviderId),m=p?.models?.find(x=>x.id===scriptNode.assetModelId&&x.modality==='image'),place=globalThis.FuietScriptAssetNodeLayoutV1?.nextPlacement?.(state,scriptNode,{index:layoutIndex})||{x:scriptNode.x+520,y:scriptNode.y};const img={id:uid('n'),type:'image',x:place.x,y:place.y,w:320,title:a.name||'脚本资产',content:'',outputUrl:a.mediaUrl||'',prompt:a.prompt||'',providerId:p?.id||'',modelId:m?.id||'',modelName:m?.name||'',toolParams:{operation:'script_asset',assetType:type,assetId:a.id,scriptNodeId:scriptNode.id,scriptAssetLayoutVersion:1}};state.nodes.push(img);state.edges.push({id:uid('e'),source:scriptNode.id,target:img.id,type:'script-asset'});(a.nodeIds||(a.nodeIds=[])).push(img.id);if(select)selectedId=img.id;saveState();render();return img}"
if old_gen not in app and "function createScriptAssetNode(scriptNode,a,type,layoutIndex=0" not in app:
    raise SystemExit('script asset generator creator not found')
app = app.replace(old_gen, new_gen, 1)
app = app.replace("createScriptAssetNode(n,a,t,i*34,false)", "createScriptAssetNode(n,a,t,i,false)")
APP.write_text(app, encoding='utf-8')

boot = BOOT.read_text(encoding='utf-8')
boot = boot.replace("const v='20260904-script-asset-picker-modal-5';", "const v='20260907-script-asset-node-layout-1';")
marker = "  `./image-node-display-normalizer-v1.js?v=${v}`,\n  `./app.js?v=${v}"
replacement = "  `./image-node-display-normalizer-v1.js?v=${v}`,\n  `./script-asset-node-layout-v1.js?v=${v}`,\n  `./app.js?v=${v}"
if marker not in boot and "script-asset-node-layout-v1.js" not in boot:
    raise SystemExit('bootstrap app marker not found')
boot = boot.replace(marker, replacement, 1)
BOOT.write_text(boot, encoding='utf-8')

TEST.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Layout=require('../script-asset-node-layout-v1.js');

function overlap(a,b){return Layout.rectsOverlap({x:a.x,y:a.y,w:a.w||320,h:a.h||300},{x:b.x,y:b.y,w:b.w||320,h:b.h||300},0)}

test('script assets use a stable 3-column grid with real spacing',()=>{
  const script={id:'script-1',type:'script',x:100,y:200,w:310};
  const points=Array.from({length:7},(_,i)=>Layout.slotPlacement(script,i));
  assert.deepEqual(points.slice(0,4).map(p=>[p.x,p.y]),[[620,200],[1012,200],[1404,200],[620,572]]);
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)assert.equal(overlap({...points[i],w:320,h:300},{...points[j],w:320,h:300}),false);
});

test('next placement skips a canvas node occupying the preferred slot',()=>{
  const script={id:'script-1',type:'script',x:100,y:200,w:310};
  const blocker={id:'other',type:'image',x:620,y:200,w:320,h:300};
  const place=Layout.nextPlacement({nodes:[script,blocker]},script,{index:0});
  assert.deepEqual([place.x,place.y],[1012,200]);
});

test('legacy overlapping script assets are repaired once without moving ordinary nodes',()=>{
  const script={id:'script-1',type:'script',x:0,y:0,w:310,scriptData:{assets:{characters:[{id:'a1'},{id:'a2'}],scenes:[{id:'a3'}],props:[]}}};
  const normal={id:'normal',type:'image',x:-800,y:-800,w:320,h:300};
  const assets=[
    {id:'n1',type:'image',x:520,y:0,w:320,toolParams:{operation:'script_asset',scriptNodeId:'script-1',assetId:'a1',assetType:'characters'}},
    {id:'n2',type:'image',x:554,y:0,w:320,toolParams:{operation:'script_asset',scriptNodeId:'script-1',assetId:'a2',assetType:'characters'}},
    {id:'n3',type:'image',x:588,y:300,w:320,toolParams:{operation:'script_asset',scriptNodeId:'script-1',assetId:'a3',assetType:'scenes'}}
  ];
  const state={nodes:[script,normal,...assets]};
  Layout.repairState(state);
  assert.deepEqual(assets.map(n=>[n.x,n.y]),[[520,0],[912,0],[1304,0]]);
  assert.ok(assets.every(n=>n.toolParams.scriptAssetLayoutVersion===1));
  assert.deepEqual([normal.x,normal.y],[-800,-800]);
  const after=assets.map(n=>[n.x,n.y]);
  assets[0].x+=111;
  Layout.repairState(state);
  assert.equal(assets[0].x,after[0][0]+111,'already repaired nodes preserve later user movement');
});

test('app creators use collision-aware layout instead of 24/34px overlap offsets',()=>{
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/FuietScriptAssetNodeLayoutV1\?\.nextPlacement/);
  assert.match(app,/FuietScriptAssetNodeLayoutV1\?\.repairState/);
  assert.doesNotMatch(app,/createScriptAssetNode\(n,a,t,i\*34,false\)/);
  assert.doesNotMatch(app,/scriptNode\.x\+520\+\(a\.nodeIds\?\.length\|\|0\)\*24/);
});

test('bootstrap loads asset layout before app and bumps cache revision',()=>{
  const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
  assert.match(boot,/20260907-script-asset-node-layout-1/);
  assert.ok(boot.indexOf('script-asset-node-layout-v1.js')<boot.indexOf('./app.js?v='));
});
''', encoding='utf-8')

print('Script asset node layout patch applied.')
