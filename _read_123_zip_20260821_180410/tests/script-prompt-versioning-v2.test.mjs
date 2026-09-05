import test from 'node:test';
import assert from 'node:assert/strict';
import core from '../script-workflow-core.js';

test('prompt result stores shot/style/asset source versions',()=>{
  const data=core.createScriptData();
  data.globalStyle.text='真人写实';
  data.globalStyle.revision=3;
  data.assets.characters.push({id:'char_a',type:'character',name:'林晓',revision:4,prompt:'黑色中长发'});
  data.shots.push({id:'shot_1',no:1,action:'林晓站在门口',assetRefs:['char_a'],shotRevision:2});
  core.normalizeScriptData(data);
  const shot=data.shots[0];
  core.setPromptResult(data,shot,{imagePrompt:'完整画面提示词',videoPrompt:'完整运动提示词'});
  assert.equal(shot.promptStatus,'ready');
  assert.equal(shot.promptSource.shotRevision,2);
  assert.equal(shot.promptSource.styleRevision,3);
  assert.equal(shot.promptSource.assetRevisions.char_a,4);
  assert.ok(shot.promptGeneratedAt);
  assert.equal(core.isPromptSourceCurrent(data,shot),true);
});

test('asset revision invalidates only shots that reference that asset',()=>{
  const data=core.createScriptData();
  data.assets.characters.push({id:'char_a',type:'character',name:'林晓',revision:1});
  data.assets.characters.push({id:'char_b',type:'character',name:'王胖子',revision:1});
  data.shots.push({id:'shot_1',assetRefs:['char_a'],imagePrompt:'a',videoPrompt:'b'});
  data.shots.push({id:'shot_2',assetRefs:['char_b'],imagePrompt:'c',videoPrompt:'d'});
  core.normalizeScriptData(data);
  core.setPromptResult(data,data.shots[0],{imagePrompt:'a',videoPrompt:'b'});
  core.setPromptResult(data,data.shots[1],{imagePrompt:'c',videoPrompt:'d'});
  core.touchAsset(data.assets.characters[0]);
  const count=core.invalidateShotsForAsset(data,'char_a');
  assert.equal(count,1);
  assert.equal(data.shots[0].promptStatus,'dirty');
  assert.equal(data.shots[1].promptStatus,'ready');
});

test('style changes invalidate all final prompts',()=>{
  const data=core.createScriptData();
  data.shots.push({id:'shot_1',imagePrompt:'a',videoPrompt:'b'});
  data.shots.push({id:'shot_2',imagePrompt:'c',videoPrompt:'d'});
  core.normalizeScriptData(data);
  data.shots.forEach(s=>core.setPromptResult(data,s,{imagePrompt:s.imagePrompt,videoPrompt:s.videoPrompt}));
  core.touchGlobalStyle(data);
  assert.equal(core.invalidateShotsForStyle(data),2);
  assert.equal(core.promptStats(data).dirty,2);
  assert.equal(data.finalized,false);
});

test('generation snapshot carries the exact prompt revision used by generator',()=>{
  const shot={id:'shot_1',no:1,promptRevision:7,promptGeneratedAt:'2026-09-05T00:00:00.000Z',promptSource:{shotRevision:2,styleRevision:4,assetRevisions:{char_a:3},fingerprint:'x'}};
  const snap=core.createGenerationSnapshot({scriptNodeId:'script_1',shot,type:'video',prompt:'运动提示词'});
  assert.equal(snap.promptRevision,7);
  assert.equal(snap.promptGeneratedAt,'2026-09-05T00:00:00.000Z');
  assert.equal(snap.promptSource.assetRevisions.char_a,3);
});
