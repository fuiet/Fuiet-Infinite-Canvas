import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../script-workflow-core.js');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('new Script Workflow V1 data is blank and production-safe',()=>{
  const d=Core.createScriptData();
  assert.equal(d.schemaVersion,1);assert.deepEqual(d.assets,{characters:[],scenes:[],props:[]});assert.deepEqual(d.shots,[]);assert.equal(d.globalStyle.text,'');
});

test('legacy script data migrates without losing content',()=>{
  const old={style:'电影感写实',assets:{characters:[{name:'林栀',prompt:'固定脸'}]},shots:[{scene:'工作室',characters:'林栀',action:'抬头',imagePrompt:'旧图词',videoPrompt:'旧视频词'}]};
  const d=Core.normalizeScriptData(old,{idFactory:p=>p+'_1'});const s=d.shots[0];
  assert.equal(d.globalStyle.text,'电影感写实');assert.equal(d.assets.characters[0].name,'林栀');assert.equal(s.action,'抬头');assert.equal(s.imagePrompt,'旧图词');assert.equal(s.videoPrompt,'旧视频词');assert.ok(s.id);assert.deepEqual(s.outputs.imageNodeIds,[]);
});

test('shot dirty state and output relationships are explicit',()=>{
  const d=Core.createScriptData();d.shots=[Core.normalizeShot({id:'shot_1',action:'A'},0)];const s=d.shots[0];Core.markShotDirty(s,'资产变化');assert.equal(s.promptStatus,'dirty');Core.markShotReady(s);assert.equal(s.promptStatus,'ready');Core.registerShotOutput(s,'image','node_1');Core.registerShotOutput(s,'video','node_2');assert.deepEqual(s.outputs.imageNodeIds,['node_1']);assert.equal(s.outputs.selectedVideoNodeId,'node_2');
});

test('generation snapshots freeze style asset and provider context',()=>{
  const snap=Core.createGenerationSnapshot({scriptNodeId:'script_1',shot:{id:'shot_1',no:1},type:'video',prompt:'move',globalStyle:{text:'写实',revision:2},assets:[{id:'a1',type:'character',name:'林栀',revision:3,mediaUrl:'/a.png',prompt:'固定脸'}],providerId:'p1',modelId:'m1',parameters:{duration:5}});assert.equal(snap.shotId,'shot_1');assert.equal(snap.globalStyle.revision,2);assert.equal(snap.assets[0].revision,3);assert.equal(snap.parameters.duration,5);
});

test('script editor exposes complete shot fields and batch creation stops before paid execution',()=>{
  for(const label of ['光影氛围','音效','运镜'])assert.match(app,new RegExp(label));
  assert.match(app,/generationSnapshot=scriptGenerationSnapshot/);assert.match(app,/connectScriptShotAssetNodes/);assert.match(app,/registerScriptShotOutput/);assert.match(app,/确认并创建生成器组/);assert.doesNotMatch(app,/id="batchAutoRun"/);assert.match(app,/autoFlow:false/);
});
