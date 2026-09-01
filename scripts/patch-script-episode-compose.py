from pathlib import Path
import re
ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# Add ordered selected-video sequence and timeline creator before openEpisodeDashboard.
anchor="  function openEpisodeDashboard(scriptNode){"
if anchor not in s: raise SystemExit('openEpisodeDashboard anchor missing')
helper=r'''  function scriptEpisodeVideoSequence(scriptNode){
    const d=ensureScriptData(scriptNode),rows=(d.shots||[]).map(shot=>{const video=selectedShotProductionNode(scriptNode,shot,'video'),status=productionStatusMeta(video);let blocker='';if(!video)blocker='未创建视频';else if(video.inputStale)blocker='视频输入已变更，待重跑';else if(!nodeHasReusableResult(video)||!video.outputUrl)blocker=status.label||'视频未完成';return{shot,video,status,blocker}});return{rows,ready:rows.length>0&&rows.every(r=>!r.blocker),blockers:rows.filter(r=>r.blocker)};
  }
  function buildScriptEpisodeTimelineData(sequence){
    const clips=[];let cursor=0;sequence.rows.forEach(({shot,video})=>{const clip=timelineClipFromNode(video,cursor,'V1');clip.scriptShotId=shot.id;clip.scriptShotNo=shot.no;clips.push(clip);cursor+=clipTimelineDuration(clip)});return{clips,resolution:'720p',fps:30,duration:Math.max(1,cursor),snap:.1,snapEnabled:true,selectedClipId:clips[0]?.id||'',playhead:0,zoom:1,markers:[],subtitles:[],subtitleStyle:{fontSize:42,color:'#ffffff',outline:2,bottom:72},grade:{brightness:0,contrast:1,saturation:1,gamma:1,temperature:0},trackState:{}};
  }
  function createOrUpdateScriptEpisodeTimeline(scriptNode){
    const sequence=scriptEpisodeVideoSequence(scriptNode);if(!sequence.ready){const first=sequence.blockers[0];return showToast(first?`不能创建成片：Shot ${first.shot.no} · ${first.blocker}`:'还没有可合成的视频镜头')}
    snapshot('创建整集成片时间轴');let node=state.nodes.find(x=>x.type==='video'&&x.toolParams?.operation==='script_episode_compose'&&x.toolParams?.scriptNodeId===scriptNode.id);const existed=Boolean(node);if(!node){node={id:uid('n'),type:'video',x:scriptNode.x+980,y:scriptNode.y,w:380,title:`${scriptNode.title||'脚本'} · 成片时间轴`,content:'',prompt:'按脚本 Shot 顺序合成为完整成片',providerId:'',modelId:'',modelName:'',outputUrl:'',duration:0,toolParams:{operation:'script_episode_compose',scriptNodeId:scriptNode.id}};state.nodes.push(node);createEdge(scriptNode.id,node.id,{type:'script',role:'script_context',silent:true})}
    if(existed&&nodeHasReusableResult(node)){node.inputStale=true;node.inputStaleReason='脚本当前采用视频序列已更新，请重新渲染成片'}node.timelineData=buildScriptEpisodeTimelineData(sequence);node.duration=node.timelineData.duration;node.runCacheKey='';node.toolParams=node.toolParams||{};node.toolParams.sourceShotVideoNodeIds=sequence.rows.map(r=>r.video.id);state.edges=state.edges.filter(e=>!(e.target===node.id&&e.type==='script-compose-shot'));sequence.rows.forEach(({shot,video})=>state.edges.push({id:uid('e'),source:video.id,target:node.id,type:'script-compose-shot',role:'video_reference',semanticRole:'video_reference',targetSlot:'video_reference',scriptShotId:shot.id,scriptShotNo:shot.no}));saveState();render();focusNode(node.id);showToast(`成片时间轴已${existed?'更新':'创建'} · ${sequence.rows.length} 个 Shot，按脚本顺序排列；不会自动渲染`);setTimeout(()=>openTimelineEditor(node,{trimOnly:false}),0);return node;
  }
'''
s=s.replace(anchor,helper+anchor,1)

# Dashboard derives compose readiness.
old="const stats=episodeProductionStats(scriptNode),q=stats.quality,pct=stats.total?Math.round((stats.imageDone+stats.videoDone)/(stats.total*2)*100):0,qualityPct=q.totalSlots?Math.round(q.passedSlots/q.totalSlots*100):0,baseline=ensureScriptData(scriptNode).quality?.baseline;"
new="const stats=episodeProductionStats(scriptNode),q=stats.quality,pct=stats.total?Math.round((stats.imageDone+stats.videoDone)/(stats.total*2)*100):0,qualityPct=q.totalSlots?Math.round(q.passedSlots/q.totalSlots*100):0,baseline=ensureScriptData(scriptNode).quality?.baseline,composeState=scriptEpisodeVideoSequence(scriptNode),composeNode=state.nodes.find(x=>x.type==='video'&&x.toolParams?.operation==='script_episode_compose'&&x.toolParams?.scriptNodeId===scriptNode.id);"
if old not in s: raise SystemExit('dashboard stats line missing')
s=s.replace(old,new,1)

# Add compose action before batch line.
old='<button id="episodeBaseline" ${q.approvedShots===stats.total&&q.errorCount===0?\'\':\'disabled\'}>${baseline?\'更新生产基线\':\'建立生产基线\'}</button><button id="episodeOpenBatch">批量生产线</button>'
new='<button id="episodeBaseline" ${q.approvedShots===stats.total&&q.errorCount===0?\'\':\'disabled\'}>${baseline?\'更新生产基线\':\'建立生产基线\'}</button><button id="episodeCompose" ${composeState.ready?\'\':\'disabled\'}>${composeNode?\'更新成片时间轴\':\'创建成片时间轴\'}</button><button id="episodeOpenBatch">批量生产线</button>'
if old not in s: raise SystemExit('dashboard action html missing')
s=s.replace(old,new,1)

# Add blocker summary after progress.
old='</div><div class="episode-dashboard-actions"><button id="episodeContinue">'
new='</div>${composeState.ready?`<div class="episode-compose-ready">成片就绪：${composeState.rows.length} 个当前采用视频将严格按 Shot 顺序进入时间轴。</div>`:`<div class="episode-compose-blocked">成片未就绪：${composeState.blockers.slice(0,4).map(r=>`Shot ${r.shot.no} ${r.blocker}`).join("；")}${composeState.blockers.length>4?`；另有 ${composeState.blockers.length-4} 个`:``}</div>`}<div class="episode-dashboard-actions"><button id="episodeContinue">'
if old not in s: raise SystemExit('dashboard progress/action boundary missing')
s=s.replace(old,new,1)

# Bind compose button.
old="$('#episodeRefresh').onclick=()=>openEpisodeDashboard(scriptNode);$('#episodeOpenBatch').onclick=()=>openScriptEditor(scriptNode,'batch-image');"
new="$('#episodeRefresh').onclick=()=>openEpisodeDashboard(scriptNode);$('#episodeCompose')?.addEventListener('click',()=>createOrUpdateScriptEpisodeTimeline(scriptNode));$('#episodeOpenBatch').onclick=()=>openScriptEditor(scriptNode,'batch-image');"
if old not in s: raise SystemExit('dashboard bindings missing')
s=s.replace(old,new,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-episode-compose.test.mjs'
t.write_text(r'''import test from 'node:test';
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
''',encoding='utf-8')
print('patched script episode composition')
