import test from 'node:test';
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
