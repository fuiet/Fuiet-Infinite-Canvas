import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('episode composition consumes selected Shot videos in script order',()=>{
  assert.match(app,/function scriptEpisodeVideoSequence\(scriptNode\)/);
  assert.match(app,/selectedShotProductionNode\(scriptNode,shot,'video'\)/);
  assert.match(app,/sequence\.rows\.forEach\(\(\{shot,video\}\)=>\{/);
  assert.match(app,/timelineClipFromNode\(video,cursor,'V1'\)/);
  assert.match(app,/clip\.scriptShotNo=shot\.no/);
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
test('existing rendered composition becomes stale when source sequence changes',()=>{
  assert.match(app,/if\(existed&&nodeHasReusableResult\(node\)\)\{node\.inputStale=true/);
  assert.match(app,/脚本当前采用视频序列已更新，请重新渲染成片/);
});
