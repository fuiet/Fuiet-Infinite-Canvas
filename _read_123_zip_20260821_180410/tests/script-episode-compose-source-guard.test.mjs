import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('composition timeline validates against current selected Shot source revision',()=>{
  assert.match(app,/function scriptEpisodeComposeSourceGuard\(composeNode\)/);
  assert.match(app,/scriptEpisodeVideoSequence\(scriptNode\)/);
  assert.match(app,/scriptEpisodeComposeRevision\(sequence\)/);
  assert.match(app,/stored!==revision/);
});

test('composition source guard blocks missing or unready script sources',()=>{
  assert.match(app,/成片关联脚本已不存在，不能继续渲染旧时间轴/);
  assert.match(app,/当前 Shot 来源未就绪：Shot/);
  assert.match(app,/当前采用 Shot 视频已变化，请先回整集生产看板同步成片时间轴后再渲染/);
});

test('opening stale composition warns and invalidates old rendered children',()=>{
  assert.match(app,/const guard=scriptEpisodeComposeSourceGuard\(n\);if\(!guard\.ok\)\{markEpisodeComposeResultsStale\(n,guard\.reason\);showToast\(guard\.reason\)\}/);
});

test('timeline export rechecks live source state and refuses stale render',()=>{
  assert.match(app,/timelineExport[\s\S]*const guard=scriptEpisodeComposeSourceGuard\(n\)/);
  assert.match(app,/if\(!guard\.ok\)\{markEpisodeComposeResultsStale\(n,guard\.reason\);saveState\(\);return showToast\(guard\.reason\)\}/);
});
