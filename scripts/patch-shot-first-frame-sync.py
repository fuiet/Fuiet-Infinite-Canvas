from pathlib import Path
import re
ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# Add first-frame sync helper before output picker.
anchor="  function shotOutputNodePickerHtml(scriptNode,shot,type){"
if anchor not in s: raise SystemExit('shotOutputNodePickerHtml anchor missing')
helper=r'''  function syncSelectedShotFirstFrame(scriptNode,shot,{markStale=true}={}){
    if(!scriptNode||!shot)return false;const image=selectedShotProductionNode(scriptNode,shot,'image'),video=selectedShotProductionNode(scriptNode,shot,'video');if(!image||!video)return false;
    const current=state.edges.find(e=>e.target===video.id&&(e.role==='first_frame'||e.semanticRole==='first_frame'||e.targetSlot==='first_frame')),already=current?.source===image.id&&video.toolParams?.firstFrame===image.id;if(already)return false;
    state.edges=state.edges.filter(e=>!(e.target===video.id&&(e.role==='first_frame'||e.semanticRole==='first_frame'||e.targetSlot==='first_frame')));
    createEdge(image.id,video.id,{type:'asset',role:'first_frame',silent:true});video.toolParams=video.toolParams||{};video.toolParams.firstFrame=image.id;video.runCacheKey='';
    if(markStale&&nodeHasReusableResult(video)){video.inputStale=true;video.inputStaleReason='当前采用分镜图已变更，需要重新生成视频';video.inputStaleAt=new Date().toISOString()}return true;
  }
'''
s=s.replace(anchor,helper+anchor,1)

# Production status: stale input is not considered done even if old result exists/frozen.
old="function productionStatusMeta(node){\n    if(!node)return{key:'missing',label:'未创建'};if(node.frozen&&nodeHasReusableResult(node))return{key:'frozen',label:'已冻结'};"
new="function productionStatusMeta(node){\n    if(!node)return{key:'missing',label:'未创建'};if(node.inputStale)return{key:'stale',label:'待重跑'};if(node.frozen&&nodeHasReusableResult(node))return{key:'frozen',label:'已冻结'};"
if old not in s: raise SystemExit('productionStatusMeta prefix missing')
s=s.replace(old,new,1)

# On selected output switch, synchronize the chosen image/video relationship.
old="setSelectedShotProductionNode(shot,sel.dataset.shotType,sel.value);saveState();showToast(`Shot ${shot.no} 已切换当前采用的${sel.dataset.shotType==='video'?'视频':'分镜图'}结果`);rerender()"
new="setSelectedShotProductionNode(shot,sel.dataset.shotType,sel.value);syncSelectedShotFirstFrame(n,shot,{markStale:true});saveState();showToast(`Shot ${shot.no} 已切换当前采用的${sel.dataset.shotType==='video'?'视频':'分镜图'}结果${sel.dataset.shotType==='image'&&selectedShotProductionNode(n,shot,'video')?.inputStale?'；视频首帧已同步并标记待重跑':''}`);rerender()"
if old not in s: raise SystemExit('selected output change handler missing')
s=s.replace(old,new,1)

# New video node: store firstFrame identity explicitly when auto-wiring.
old="if(type==='video'){const imageNode=selectedShotProductionNode(scriptNode,shot,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}registerScriptShotOutput"
new="if(type==='video'){const imageNode=selectedShotProductionNode(scriptNode,shot,'image');if(imageNode){createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true});node.toolParams.firstFrame=imageNode.id}}registerScriptShotOutput"
if old not in s: raise SystemExit('new video first frame anchor missing')
s=s.replace(old,new,1)

# Regeneration: always sync selected first frame before running, and clear stale marker after snapshot refresh.
old="connectScriptShotAssetNodes(scriptNode,d,shot,node);node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,{providerId:node.providerId,modelId:node.modelId,modelName:node.modelName,aspectRatio:node.aspectRatio||config.aspectRatio,priority:node.queuePriority??config.priority});registerScriptShotOutput(shot,type,node.id);"
new="connectScriptShotAssetNodes(scriptNode,d,shot,node);node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,{providerId:node.providerId,modelId:node.modelId,modelName:node.modelName,aspectRatio:node.aspectRatio||config.aspectRatio,priority:node.queuePriority??config.priority});node.inputStale=false;node.inputStaleReason='';registerScriptShotOutput(shot,type,node.id);if(type==='video')syncSelectedShotFirstFrame(scriptNode,shot,{markStale:false});"
if old not in s: raise SystemExit('regenerate snapshot anchor missing')
s=s.replace(old,new,1)

# Existing fallback first-frame block should also store identity.
old="if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=selectedShotProductionNode(scriptNode,shot,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}"
new="if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=selectedShotProductionNode(scriptNode,shot,'image');if(imageNode){createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true});node.toolParams=node.toolParams||{};node.toolParams.firstFrame=imageNode.id}}"
if old not in s: raise SystemExit('regenerate first frame fallback missing')
s=s.replace(old,new,1)

# Continuity audit should explicitly block stale video input/result mismatch.
anchor="    if(image&&video&&nodeHasReusableResult(image)&&!state.edges.some(e=>e.source===image.id&&e.target===video.id&&(e.role==='first_frame'||e.semanticRole==='first_frame'||e.targetSlot==='first_frame'))&&video.toolParams?.firstFrame!==image.id)add('warn','视频未绑定当前分镜为首帧','可能导致人物、构图或场景连续性漂移','production');"
if anchor not in s: raise SystemExit('continuity first-frame check missing')
replacement=anchor+"\n    if(video?.inputStale)add('error','视频输入已变更',video.inputStaleReason||'当前视频结果基于旧分镜图，需要重新生成','production');"
s=s.replace(anchor,replacement,1)

app.write_text(s,encoding='utf-8')

t=ROOT/'tests'/'script-first-frame-sync.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('changing selected Shot image rewires selected video first frame',()=>{
  assert.match(app,/function syncSelectedShotFirstFrame\(scriptNode,shot,\{markStale=true\}=\{\}\)/);
  assert.match(app,/state\.edges=state\.edges\.filter\(e=>!\(e\.target===video\.id&&\(e\.role==='first_frame'/);
  assert.match(app,/createEdge\(image\.id,video\.id,\{type:'asset',role:'first_frame',silent:true\}\)/);
  assert.match(app,/video\.toolParams\.firstFrame=image\.id/);
});
test('old video result becomes stale instead of silently pretending current',()=>{
  assert.match(app,/video\.inputStale=true/);
  assert.match(app,/当前采用分镜图已变更，需要重新生成视频/);
  assert.match(app,/if\(node\.inputStale\)return\{key:'stale',label:'待重跑'\}/);
  assert.match(app,/视频输入已变更/);
});
test('explicit rerun clears stale state and resyncs first frame without auto charging',()=>{
  assert.match(app,/node\.inputStale=false;node\.inputStaleReason=''/);
  assert.match(app,/syncSelectedShotFirstFrame\(scriptNode,shot,\{markStale:false\}\)/);
});
''',encoding='utf-8')
print('patched selected Shot first-frame sync')
