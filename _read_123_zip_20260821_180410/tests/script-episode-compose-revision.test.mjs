import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('episode composition revision changes when a selected video version changes in place',()=>{
  assert.match(app,/function scriptEpisodeComposeRevision\(sequence\)/);
  assert.match(app,/versionId:activeResultVersionId\(video\)/);
  assert.match(app,/outputUrl:video\?\.outputUrl\|\|''/);
});

test('syncing selected Shot videos preserves timeline editorial layers',()=>{
  assert.match(app,/function buildScriptEpisodeTimelineData\(sequence,previous=null\)/);
  assert.match(app,/old=prevClips\.find\(c=>c\.scriptShotId===shot\.id\)/);
  assert.match(app,/transitionIn=old\.transitionIn\|\|'none'/);
  assert.match(app,/const extras=prevClips\.filter\(c=>!c\.scriptShotId/);
  assert.match(app,/subtitles:Array\.isArray\(prev\.subtitles\)\?prev\.subtitles:\[\]/);
  assert.match(app,/grade:\{brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,\.\.\.\(prev\.grade\|\|\{\}\)\}/);
});

test('old rendered episode children are invalidated when source revision changes',()=>{
  assert.match(app,/function markEpisodeComposeResultsStale\(composeNode,reason=/);
  assert.match(app,/node\.inputStale=true/);
  assert.match(app,/当前采用 Shot 视频已变化，需要重新渲染成片/);
  assert.match(app,/composeOutdated=Boolean\(composeNode&&\(!composeState\.ready/);
});

test('timeline renders are stamped with source and editorial fingerprints',()=>{
  assert.match(app,/function stampEpisodeComposeRenderResult\(composeNode,resultNode,data\)/);
  assert.match(app,/episodeComposeSourceNodeId=composeNode\.id/);
  assert.match(app,/episodeComposeRevision=composeNode\.toolParams\?\.episodeComposeRevision\|\|''/);
  assert.match(app,/episodeComposeTimelineFingerprint=episodeComposeTimelineFingerprint\(data\)/);
  assert.match(app,/stampEpisodeComposeRenderResult\(n,rendered,\{\.\.\.data,clips\}\)/);
  assert.match(app,/stampEpisodeComposeRenderResult\(n,out,out\.timelineData\)/);
});

test('opening saving and exporting a composition timeline detects post-render edits',()=>{
  assert.match(app,/if\(!trimOnly&&n\?\.toolParams\?\.operation==='script_episode_compose'\)refreshEpisodeComposeResultStaleness\(n\)/);
  assert.match(app,/timelineSave[\s\S]*refreshEpisodeComposeResultStaleness\(n\)/);
  assert.match(app,/timelineExport[\s\S]*refreshEpisodeComposeResultStaleness\(n\)/);
  assert.match(app,/成片时间轴已修改，需要重新渲染/);
});
