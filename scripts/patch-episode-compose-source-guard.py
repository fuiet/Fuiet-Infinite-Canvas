from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# Add a source-of-truth guard for composition timelines.
anchor="  function episodeComposeTimelineFingerprint(data){"
if anchor not in s:
    raise SystemExit('episodeComposeTimelineFingerprint anchor missing')
helper=r'''  function scriptEpisodeComposeSourceGuard(composeNode){
    if(!composeNode||composeNode.toolParams?.operation!=='script_episode_compose')return{ok:true,reason:''};const scriptNode=state.nodes.find(x=>x.id===composeNode.toolParams?.scriptNodeId&&x.type==='script');if(!scriptNode)return{ok:false,reason:'成片关联脚本已不存在，不能继续渲染旧时间轴'};const sequence=scriptEpisodeVideoSequence(scriptNode);if(!sequence.ready){const first=sequence.blockers[0];return{ok:false,scriptNode,sequence,reason:first?`当前 Shot 来源未就绪：Shot ${first.shot.no} · ${first.blocker}`:'当前 Shot 来源未就绪'}}const revision=scriptEpisodeComposeRevision(sequence),stored=composeNode.toolParams?.episodeComposeRevision||'';if(!stored||stored!==revision)return{ok:false,scriptNode,sequence,revision,reason:'当前采用 Shot 视频已变化，请先回整集生产看板同步成片时间轴后再渲染'};return{ok:true,scriptNode,sequence,revision,reason:''};
  }
'''
s=s.replace(anchor,helper+anchor,1)

# Opening a composition timeline warns immediately if its Shot sources are stale, but still allows editing.
old="    if(!trimOnly&&n?.toolParams?.operation==='script_episode_compose')refreshEpisodeComposeResultStaleness(n);\n    const media=trimOnly?[n]:connectedMedia(n);"
new="    if(!trimOnly&&n?.toolParams?.operation==='script_episode_compose'){const guard=scriptEpisodeComposeSourceGuard(n);if(!guard.ok){markEpisodeComposeResultsStale(n,guard.reason);showToast(guard.reason)}else refreshEpisodeComposeResultStaleness(n)}\n    const media=trimOnly?[n]:connectedMedia(n);"
if old not in s:
    raise SystemExit('open timeline composition guard anchor missing')
s=s.replace(old,new,1)

# Export must re-check live Shot source state so direct node access cannot render an obsolete timeline.
old="$('#timelineExport').onclick=async()=>{if(!data.clips.length)return showToast('时间轴没有素材');if(!trimOnly&&n.toolParams?.operation==='script_episode_compose'){n.timelineData=data;refreshEpisodeComposeResultStaleness(n)}const clips="
new="$('#timelineExport').onclick=async()=>{if(!data.clips.length)return showToast('时间轴没有素材');if(!trimOnly&&n.toolParams?.operation==='script_episode_compose'){n.timelineData=data;const guard=scriptEpisodeComposeSourceGuard(n);if(!guard.ok){markEpisodeComposeResultsStale(n,guard.reason);saveState();return showToast(guard.reason)}refreshEpisodeComposeResultStaleness(n)}const clips="
if old not in s:
    raise SystemExit('timeline export composition guard anchor missing')
s=s.replace(old,new,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-episode-compose-source-guard.test.mjs'
t.write_text(r'''import test from 'node:test';
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
''',encoding='utf-8')
print('patched episode composition source guard')
