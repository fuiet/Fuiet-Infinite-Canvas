from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# Replace episode composition helpers with revision-aware, edit-preserving implementation.
pattern=re.compile(r"  function scriptEpisodeVideoSequence\(scriptNode\)\{.*?\n  function openEpisodeDashboard\(scriptNode\)\{",re.S)
m=pattern.search(s)
if not m:
    raise SystemExit('episode composition helper block missing')

replacement=r'''  function scriptEpisodeVideoSequence(scriptNode){
    const d=ensureScriptData(scriptNode),rows=(d.shots||[]).map(shot=>{const video=selectedShotProductionNode(scriptNode,shot,'video'),status=productionStatusMeta(video);let blocker='';if(!video)blocker='未创建视频';else if(video.inputStale)blocker='视频输入已变更，待重跑';else if(!nodeHasReusableResult(video)||!video.outputUrl)blocker=status.label||'视频未完成';return{shot,video,status,blocker}});return{rows,ready:rows.length>0&&rows.every(r=>!r.blocker),blockers:rows.filter(r=>r.blocker)};
  }
  function scriptEpisodeComposeRevision(sequence){
    return JSON.stringify((sequence?.rows||[]).map(({shot,video})=>({shotId:shot?.id||'',shotNo:Number(shot?.no||0),videoNodeId:video?.id||'',versionId:activeResultVersionId(video),outputUrl:video?.outputUrl||'',duration:Number(video?.duration||video?.mediaMeta?.duration||shot?.duration||0)})));
  }
  function episodeComposeTimelineFingerprint(data){
    return JSON.stringify({clips:(data?.clips||[]).map(c=>({nodeId:c.nodeId||'',url:c.url||'',scriptShotId:c.scriptShotId||'',scriptShotNo:Number(c.scriptShotNo||0),track:c.track||'',start:Number(c.start||0),in:Number(c.in||0),out:Number(c.out||0),speed:Number(c.speed||1),muted:Boolean(c.muted),transitionIn:c.transitionIn||'none',transitionDuration:Number(c.transitionDuration||0),volume:Number(c.volume??1),volumeKeyframes:c.volumeKeyframes||[]})),resolution:data?.resolution||'',fps:Number(data?.fps||0),markers:data?.markers||[],subtitles:data?.subtitles||[],subtitleStyle:data?.subtitleStyle||{},grade:data?.grade||{},trackState:data?.trackState||{}});
  }
  function episodeComposeResultNodes(composeNode){
    if(!composeNode)return[];const linked=new Set(state.edges.filter(e=>e.source===composeNode.id).map(e=>e.target));return state.nodes.filter(x=>x.id!==composeNode.id&&x.type==='video'&&(x.toolParams?.episodeComposeSourceNodeId===composeNode.id||(linked.has(x.id)&&['视频合成','video-compose-timeline'].includes(x.toolParams?.operation))));
  }
  function markEpisodeComposeResultsStale(composeNode,reason='成片来源已变化，需要重新渲染'){
    let changed=0;episodeComposeResultNodes(composeNode).forEach(node=>{if(node.inputStale&&node.inputStaleReason===reason)return;node.inputStale=true;node.inputStaleReason=reason;node.inputStaleAt=new Date().toISOString();node.runCacheKey='';changed++});return changed;
  }
  function stampEpisodeComposeRenderResult(composeNode,resultNode,data){
    if(!composeNode||!resultNode||composeNode.toolParams?.operation!=='script_episode_compose')return resultNode;resultNode.toolParams=resultNode.toolParams||{};resultNode.toolParams.episodeComposeSourceNodeId=composeNode.id;resultNode.toolParams.episodeComposeRevision=composeNode.toolParams?.episodeComposeRevision||'';resultNode.toolParams.episodeComposeTimelineFingerprint=episodeComposeTimelineFingerprint(data);resultNode.inputStale=false;resultNode.inputStaleReason='';composeNode.toolParams.lastRenderedRevision=resultNode.toolParams.episodeComposeRevision;composeNode.toolParams.lastRenderedTimelineFingerprint=resultNode.toolParams.episodeComposeTimelineFingerprint;return resultNode;
  }
  function refreshEpisodeComposeResultStaleness(composeNode){
    if(!composeNode||composeNode.toolParams?.operation!=='script_episode_compose')return 0;const revision=composeNode.toolParams?.episodeComposeRevision||'',fingerprint=episodeComposeTimelineFingerprint(composeNode.timelineData||{});let changed=0;episodeComposeResultNodes(composeNode).forEach(node=>{const wrongRevision=Boolean(revision&&node.toolParams?.episodeComposeRevision&&node.toolParams.episodeComposeRevision!==revision),wrongTimeline=Boolean(node.toolParams?.episodeComposeTimelineFingerprint&&node.toolParams.episodeComposeTimelineFingerprint!==fingerprint);if((wrongRevision||wrongTimeline)&&!node.inputStale){node.inputStale=true;node.inputStaleReason=wrongRevision?'当前采用 Shot 视频已变化，需要重新渲染成片':'成片时间轴已修改，需要重新渲染';node.inputStaleAt=new Date().toISOString();node.runCacheKey='';changed++}});if(changed)saveState();return changed;
  }
  function buildScriptEpisodeTimelineData(sequence,previous=null){
    const prev=previous&&typeof previous==='object'?previous:{},prevClips=Array.isArray(prev.clips)?prev.clips:[],clips=[];let cursor=0;
    sequence.rows.forEach(({shot,video})=>{const fresh=timelineClipFromNode(video,cursor,'V1'),old=prevClips.find(c=>c.scriptShotId===shot.id);if(old){const maxOut=Math.max(.05,Number(video.duration||video.mediaMeta?.duration||shot.duration||fresh.out||5));fresh.in=Math.max(0,Math.min(maxOut-.05,Number(old.in||0)));fresh.out=Math.max(fresh.in+.05,Math.min(maxOut,Number(old.out||maxOut)));fresh.speed=Math.max(.1,Number(old.speed||1));fresh.muted=Boolean(old.muted);fresh.volume=Number(old.volume??1);fresh.transitionIn=old.transitionIn||'none';fresh.transitionDuration=Number(old.transitionDuration||.45);fresh.volumeKeyframes=Array.isArray(old.volumeKeyframes)?old.volumeKeyframes:[]}fresh.track='V1';fresh.start=cursor;fresh.scriptShotId=shot.id;fresh.scriptShotNo=shot.no;clips.push(fresh);cursor+=clipTimelineDuration(fresh)});
    const extras=prevClips.filter(c=>!c.scriptShotId&&c.nodeId&&state.nodes.some(n=>n.id===c.nodeId));clips.push(...extras.map(c=>({...c,volumeKeyframes:Array.isArray(c.volumeKeyframes)?c.volumeKeyframes:[]})));
    const data={...prev,clips,resolution:prev.resolution||'720p',fps:Number(prev.fps||30),duration:timelineDuration(clips),snap:Number(prev.snap||.1),snapEnabled:prev.snapEnabled!==false,selectedClipId:clips.some(c=>c.id===prev.selectedClipId)?prev.selectedClipId:(clips[0]?.id||''),playhead:Math.max(0,Math.min(timelineDuration(clips),Number(prev.playhead||0))),zoom:Number(prev.zoom||1),markers:Array.isArray(prev.markers)?prev.markers:[],subtitles:Array.isArray(prev.subtitles)?prev.subtitles:[],subtitleStyle:{fontSize:42,color:'#ffffff',outline:2,bottom:72,...(prev.subtitleStyle||{})},grade:{brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,...(prev.grade||{})},trackState:prev.trackState||{}};return data;
  }
  function createOrUpdateScriptEpisodeTimeline(scriptNode){
    const sequence=scriptEpisodeVideoSequence(scriptNode);if(!sequence.ready){const first=sequence.blockers[0];return showToast(first?`不能创建成片：Shot ${first.shot.no} · ${first.blocker}`:'还没有可合成的视频镜头')}
    const revision=scriptEpisodeComposeRevision(sequence);snapshot('创建整集成片时间轴');let node=state.nodes.find(x=>x.type==='video'&&x.toolParams?.operation==='script_episode_compose'&&x.toolParams?.scriptNodeId===scriptNode.id);const existed=Boolean(node);if(!node){node={id:uid('n'),type:'video',x:scriptNode.x+980,y:scriptNode.y,w:380,title:`${scriptNode.title||'脚本'} · 成片时间轴`,content:'',prompt:'按脚本 Shot 顺序合成为完整成片',providerId:'',modelId:'',modelName:'',outputUrl:'',duration:0,toolParams:{operation:'script_episode_compose',scriptNodeId:scriptNode.id}};state.nodes.push(node);createEdge(scriptNode.id,node.id,{type:'script',role:'script_context',silent:true})}
    const previousRevision=node.toolParams?.episodeComposeRevision||'',changed=Boolean(previousRevision&&previousRevision!==revision),needsBuild=!node.timelineData?.clips?.length||changed||!previousRevision;if(changed)markEpisodeComposeResultsStale(node,'当前采用 Shot 视频已变化，需要重新渲染成片');if(needsBuild)node.timelineData=buildScriptEpisodeTimelineData(sequence,node.timelineData);node.duration=node.timelineData?.duration||0;node.runCacheKey='';node.toolParams=node.toolParams||{};node.toolParams.sourceShotVideoNodeIds=sequence.rows.map(r=>r.video.id);node.toolParams.episodeComposeRevision=revision;node.inputStale=false;node.inputStaleReason='';state.edges=state.edges.filter(e=>!(e.target===node.id&&e.type==='script-compose-shot'));sequence.rows.forEach(({shot,video})=>state.edges.push({id:uid('e'),source:video.id,target:node.id,type:'script-compose-shot',role:'video_reference',semanticRole:'video_reference',targetSlot:'video_reference',scriptShotId:shot.id,scriptShotNo:shot.no}));saveState();render();focusNode(node.id);showToast(changed?`成片时间轴已同步 · ${sequence.rows.length} 个 Shot；旧成片已标记待重渲染`:`成片时间轴${existed?'已打开':'已创建'} · ${sequence.rows.length} 个 Shot；不会自动渲染`);setTimeout(()=>openTimelineEditor(node,{trimOnly:false}),0);return node;
  }
  function openEpisodeDashboard(scriptNode){'''
s=s[:m.start()]+replacement+s[m.end():]

# Expand dashboard state so it detects selected-video revisions even before user clicks sync.
old="const stats=episodeProductionStats(scriptNode),q=stats.quality,pct=stats.total?Math.round((stats.imageDone+stats.videoDone)/(stats.total*2)*100):0,qualityPct=q.totalSlots?Math.round(q.passedSlots/q.totalSlots*100):0,baseline=ensureScriptData(scriptNode).quality?.baseline,composeState=scriptEpisodeVideoSequence(scriptNode),composeNode=state.nodes.find(x=>x.type==='video'&&x.toolParams?.operation==='script_episode_compose'&&x.toolParams?.scriptNodeId===scriptNode.id);"
new="const stats=episodeProductionStats(scriptNode),q=stats.quality,pct=stats.total?Math.round((stats.imageDone+stats.videoDone)/(stats.total*2)*100):0,qualityPct=q.totalSlots?Math.round(q.passedSlots/q.totalSlots*100):0,baseline=ensureScriptData(scriptNode).quality?.baseline,composeState=scriptEpisodeVideoSequence(scriptNode),composeNode=state.nodes.find(x=>x.type==='video'&&x.toolParams?.operation==='script_episode_compose'&&x.toolParams?.scriptNodeId===scriptNode.id),composeRevision=composeState.ready?scriptEpisodeComposeRevision(composeState):'',composeOutdated=Boolean(composeNode&&(!composeState.ready||!composeNode.toolParams?.episodeComposeRevision||composeNode.toolParams.episodeComposeRevision!==composeRevision));if(composeNode){if(composeOutdated)markEpisodeComposeResultsStale(composeNode,'当前采用 Shot 视频已变化，需要重新渲染成片');else refreshEpisodeComposeResultStaleness(composeNode)}"
if old not in s:
    raise SystemExit('dashboard state line missing')
s=s.replace(old,new,1)

old="${composeNode?'更新成片时间轴':'创建成片时间轴'}"
new="${composeNode?(composeOutdated?'同步成片时间轴':'打开成片时间轴'):'创建成片时间轴'}"
if old not in s:
    raise SystemExit('compose button label missing')
s=s.replace(old,new,1)

# On opening a composition timeline, reconcile prior rendered children against current timeline edits.
old="  function openTimelineEditor(n,{trimOnly=false}={}){\n    const media=trimOnly?[n]:connectedMedia(n);"
new="  function openTimelineEditor(n,{trimOnly=false}={}){\n    if(!trimOnly&&n?.toolParams?.operation==='script_episode_compose')refreshEpisodeComposeResultStaleness(n);\n    const media=trimOnly?[n]:connectedMedia(n);"
if old not in s:
    raise SystemExit('openTimelineEditor prefix missing')
s=s.replace(old,new,1)

# Stamp both local and third-party render result nodes with the exact source/timeline revision.
old="if(result.outputs?.[0]){makeLocalResultNode(n,result.outputs[0],trimOnly?'裁取片段':'时间轴合成结果',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips});close();showToast('时间轴渲染完成');return}"
new="if(result.outputs?.[0]){const rendered=makeLocalResultNode(n,result.outputs[0],trimOnly?'裁取片段':'时间轴合成结果',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips});if(!trimOnly)stampEpisodeComposeRenderResult(n,rendered,{...data,clips});saveState();close();showToast('时间轴渲染完成');return}"
if old not in s:
    raise SystemExit('local timeline render success block missing')
s=s.replace(old,new,1)

old="const out=createDerivedNode(n,'video',trimOnly?'裁取片段':'视频合成结果','根据专业多轨时间轴渲染并输出',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips,resolution:$('#tlResolution').value},520);out.timelineData={...data,clips};out.duration=timelineDuration(clips);close();saveState();render();showToast('已创建第三方时间轴处理任务')"
new="const out=createDerivedNode(n,'video',trimOnly?'裁取片段':'视频合成结果','根据专业多轨时间轴渲染并输出',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips,resolution:$('#tlResolution').value},520);out.timelineData={...data,clips};out.duration=timelineDuration(clips);if(!trimOnly)stampEpisodeComposeRenderResult(n,out,out.timelineData);close();saveState();render();showToast('已创建第三方时间轴处理任务')"
if old not in s:
    raise SystemExit('third-party timeline render block missing')
s=s.replace(old,new,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-episode-compose-revision.test.mjs'
t.write_text(r'''import test from 'node:test';
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

test('opening a composition timeline detects edits after the last render',()=>{
  assert.match(app,/function refreshEpisodeComposeResultStaleness\(composeNode\)/);
  assert.match(app,/wrongTimeline=Boolean\(node\.toolParams\?\.episodeComposeTimelineFingerprint/);
  assert.match(app,/成片时间轴已修改，需要重新渲染/);
  assert.match(app,/if\(!trimOnly&&n\?\.toolParams\?\.operation==='script_episode_compose'\)refreshEpisodeComposeResultStaleness\(n\)/);
});
''',encoding='utf-8')
print('patched episode composition revision safety')
