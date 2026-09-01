import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('episode composition consumes selected Shot videos in script order',()=>{
  assert.match(app,/function scriptEpisodeVideoSequence\(scriptNode\)/);
  assert.match(app,/selectedShotProductionNode\(scriptNode,shot,'video'\)/);
  assert.match(app,/sequence\.rows\.forEach\(\(\{shot,video\}\)=>\{/);
  assert.match(app,/timelineClipFromNode\(video,cursor,'V1'\)/);
  assert.match(app,/fresh\.scriptShotNo=shot\.no/);
});
test('episode composition blocks missing stale or unfinished selected videos',()=>{
  assert.match(app,/if\(!video\)blocker='未创建视频'/);
  assert.match(app,/else if\(video\.inputStale\)blocker='视频输入已变更，待重跑'/);
  assert.match(app,/else if\(!nodeHasReusableResult\(video\)\|\|!video\.outputUrl\)/);
  assert.match(app,/不能创建成片：Shot/);
});
test('episode composition creates timeline without auto rendering',()=>{
  assert.match(app,/operation:'script_episode_compose'/);
  assert.match(app,/sourceShotVideoNodeIds=sequence\.rows\.map\(r=>r\.video\.id\)/);
  assert.match(app,/不会自动渲染/);
  assert.match(app,/setTimeout\(\(\)=>openTimelineEditor\(node,\{trimOnly:false\}\),0\)/);
});
test('rendered episode results become stale when selected Shot sources change',()=>{
  assert.match(app,/function markEpisodeComposeResultsStale\(composeNode,reason=/);
  assert.match(app,/if\(changed\)markEpisodeComposeResultsStale\(node,'当前采用 Shot 视频已变化，需要重新渲染成片'\)/);
  assert.match(app,/node\.inputStale=true/);
  assert.match(app,/旧成片已标记待重渲染/);
});
