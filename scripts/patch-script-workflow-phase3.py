from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')

# 1) Add selective rule synthesis helper immediately after synthesizeScriptPrompts.
needle="""  async function aiSynthesizeScriptPrompts(n){"""
if needle not in s:
    raise SystemExit('aiSynthesizeScriptPrompts anchor missing')
helper=r'''  function synthesizeScriptPromptSubset(n,shotIds=[]){
    const d=ensureScriptData(n),ids=new Set((shotIds||[]).filter(Boolean));if(!ids.size)return showToast('请至少选择一个 Shot');
    const cat=scriptAssetCatalog(d),style=globalThis.FuietScriptWorkflowCore?.globalStyleText?.(d)||d.style||'';let count=0;
    (d.shots||[]).forEach(sh=>{if(!ids.has(sh.id))return;sh.assetRefs=matchShotAssets(sh,d);const assets=sh.assetRefs.map(id=>cat.find(a=>a.id===id)).filter(Boolean),assetText=assets.map(a=>`@${a.name}（${a.prompt||'保持资产一致'}）`).join('；'),stateText=narrativeStatePrompt(n,sh),baseImage=sh.baseImagePrompt||sh.imagePrompt||'',baseVideo=sh.baseVideoPrompt||sh.videoPrompt||'';sh.baseImagePrompt=sh.baseImagePrompt||baseImage;sh.baseVideoPrompt=sh.baseVideoPrompt||baseVideo;sh.imagePrompt=[style?`整体风格：${style}`:'',`景别：${sh.shotSize}`,`画面：${sh.action}`,sh.scene?`场景：${sh.scene}`:'',sh.lighting?`光影氛围：${sh.lighting}`:'',assetText?`一致性资产：${assetText}`:'',stateText,baseImage?`补充：${baseImage}`:''].filter(Boolean).join('。')+'。';sh.videoPrompt=[`镜头画面：${sh.action}`,sh.cameraMovement?`运镜：${sh.cameraMovement}`:'',sh.dialogue?`对白/旁白：${sh.dialogue}`:'',sh.sound?`音效：${sh.sound}`:'',assetText?`保持主体/场景/道具：${assets.map(a=>'@'+a.name).join('、')}`:'',style?`视觉风格：${style}`:'',stateText,baseVideo||'动作自然，镜头调度符合叙事',`目标时长约 ${Number(sh.duration||3)} 秒`].filter(Boolean).join('。')+'。';sh.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,sh));globalThis.FuietScriptWorkflowCore?.markShotReady?.(sh)||(()=>{sh.promptDirty=false;sh.promptStatus='ready';sh.dirtyReason=''})();count++});
    d.workflow=d.workflow||{};d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&String(x.videoPrompt||'').trim()&&!x.promptDirty);d.workflow.stage=d.workflow.promptsReady?'ready':'prompts';d.workflow.updatedAt=new Date().toISOString();d.finalized=d.workflow.promptsReady;if(d.finalized)d.finalizedAt=new Date().toISOString();saveState();showToast(`已重新合成 ${count} 个 Shot 的最终提示词`);return count;
  }

'''
s=s.replace(needle,helper+needle,1)

# 2) Replace prompt page with selectable shots and per-shot action.
pat=r"  function scriptPromptsHtml\(n,d\)\{.*?\n  function providerModelSelectHtml"
m=re.search(pat,s,re.S)
if not m:
    raise SystemExit('scriptPromptsHtml block missing')
new=r'''  function scriptPromptsHtml(n,d){const dirtyCount=(d.shots||[]).filter(s=>s.promptDirty).length,style=d.globalStyle?.text??d.style??'',stats=scriptWorkflowStats(d);return `<div class="script-stage-intro"><div><b>第 3 步 · 合成最终提示词</b><span>把已确认的镜头、角色 / 场景 / 道具资产和全局风格合成为图片提示词与视频运动提示词。可单镜头、多选或全部处理。</span></div><i class="${stats.promptsReady?'done':''}">${stats.promptsReady?'已完成':'待合成'}</i></div><div class="prompt-compose-head"><div><b>最终提示词</b><span>${dirtyCount?`<span class="script-impact-note">${dirtyCount} 个镜头需要重新合成</span>`:'<span class="script-impact-note clean">当前提示词已同步</span>'}</span></div><label>全局风格 <input id="scriptStyle" value="${escapeAttr(style)}"></label><button id="selectDirtyPrompts">选择待同步</button><button id="synthesizeSelected">合成选中</button><button id="synthesizeAgain">合成全部</button><button id="aiSynthesizePrompts" class="primary">AI 专业合成全部</button></div><div class="final-prompt-list">${d.shots.map(s=>`<article class="${s.promptDirty?'dirty':''}" data-final-shot="${s.id}"><header><label class="shot-prompt-select"><input type="checkbox" data-prompt-shot="${s.id}" ${s.promptDirty?'checked':''}><b>Shot ${s.no}</b></label><span>${escapeHtml(s.shotSize)} · ${Number(s.duration)}s${s.promptDirty?`<i class="dirty-badge">${escapeHtml(s.dirtyReason||'待同步')}</i>`:''}</span><button type="button" data-synthesize-shot="${s.id}">重合成本镜</button></header><label>分镜图片提示词<textarea data-final-image rows="4">${escapeHtml(s.imagePrompt||'')}</textarea></label><label>视频运动提示词<textarea data-final-video rows="4">${escapeHtml(s.videoPrompt||'')}</textarea></label></article>`).join('')}</div><div class="script-bottom-actions"><span>${stats.promptsReadyCount}/${stats.shotsTotal} 个镜头生产提示词已就绪</span><span class="spacer"></span><button id="scriptPromptsToBatch" class="primary">进入批量生产 →</button></div>`}
  function providerModelSelectHtml'''
s=s[:m.start()]+new+s[m.end():]

# 3) Bind selection actions inside prompt tab before manual textarea binding.
anchor=""";$$('[data-final-shot]',featureModal).forEach(card=>{"""
if anchor not in s:
    raise SystemExit('prompt binding anchor missing')
bind=r''';$('#selectDirtyPrompts')?.addEventListener('click',()=>{$$('[data-prompt-shot]',featureModal).forEach(x=>x.checked=Boolean(d.shots.find(sh=>sh.id===x.dataset.promptShot)?.promptDirty))});$('#synthesizeSelected')?.addEventListener('click',()=>{const ids=$$('[data-prompt-shot]:checked',featureModal).map(x=>x.dataset.promptShot);if(!ids.length)return showToast('请先勾选需要合成的 Shot');synthesizeScriptPromptSubset(n,ids);rerender()});$$('[data-synthesize-shot]',featureModal).forEach(b=>b.onclick=()=>{synthesizeScriptPromptSubset(n,[b.dataset.synthesizeShot]);rerender()});$$('[data-final-shot]',featureModal).forEach(card=>{'''
s=s.replace(anchor,bind,1)

# 4) Add batch shot reference preview helper and replace batch html.
anchor="""  function scriptBatchHtml(n,d,defaultType){"""
if anchor not in s:
    raise SystemExit('batch anchor missing')
meta=r'''  function scriptBatchShotMeta(n,d,shot,type){
    const cat=scriptAssetCatalog(d),refs=matchShotAssets(shot,d).map(id=>cat.find(a=>a.id===id)).filter(Boolean),assetNames=refs.map(a=>`@${a.name}`).join('、')||'无显式资产';const image=type==='video'?latestShotProductionNode(n.id,shot.id,'image'):null;return{assetNames,imageLabel:type==='video'?(image?.outputUrl?`首帧：${image.title||`Shot ${shot.no} 分镜图`}`:'首帧：暂无，将按文生视频创建'):'',missingRefs:refs.filter(a=>!a.mediaUrl).length};
  }
'''
s=s.replace(anchor,meta+anchor,1)
pat=r"  function scriptBatchHtml\(n,d,defaultType\)\{.*?\n  function bindScriptTab"
m=re.search(pat,s,re.S)
if not m:
    raise SystemExit('scriptBatchHtml block missing')
new=r'''  function scriptBatchHtml(n,d,defaultType){const type=defaultType||'image';return `<div class="batch-panel"><div class="batch-flow-banner"><div><b>脚本 → 生成器组 → 人工确认 → 整组执行</b><span>这里仅创建已填好提示词、资产引用和模型参数的普通生成节点，不会立即调用付费 API。先检查引用，再创建生成器组。</span></div></div><div class="batch-config"><label>生成类型<select id="batchType"><option value="image" ${type==='image'?'selected':''}>批量生分镜图</option><option value="video" ${type==='video'?'selected':''}>批量生视频</option></select></label><div id="batchProviderModels">${providerModelSelectHtml(type,n.batchProviderId||'',n.batchModelId||'','batch')}</div><label>画幅比<select id="batchRatio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option></select></label><label>队列优先级<select id="batchPriority"><option value="90">高 · 90</option><option value="50" selected>普通 · 50</option><option value="10">低 · 10</option></select></label></div><div class="batch-selection-tools"><button id="batchSelectAll">全选</button><button id="batchSelectNone">全不选</button><button id="batchSelectDirty">只选待更新</button><span>可先选 1–3 个 Shot 测试模型与风格，再创建全量生成器。</span></div><div class="batch-shot-list v2">${d.shots.map(sh=>{const meta=scriptBatchShotMeta(n,d,sh,type);return `<label class="batch-shot-review ${meta.missingRefs?'warn':''}"><input type="checkbox" data-batch-shot="${sh.id}" checked><span>Shot ${sh.no}</span><div><b>${escapeHtml(sh.action)}</b><small>${escapeHtml((type==='image'?sh.imagePrompt:sh.videoPrompt)||'尚未合成提示词')}</small><em>资产：${escapeHtml(meta.assetNames)}${meta.missingRefs?` · ${meta.missingRefs} 个参考图缺失`:''}${meta.imageLabel?` · ${escapeHtml(meta.imageLabel)}`:''}</em></div></label>`}).join('')}</div><div id="batchCostPreview" class="batch-cost-preview"></div><div class="feature-actions"><button id="batchCreateGroup" class="primary">确认并创建生成器组</button></div></div>`}
  function bindScriptTab'''
s=s[:m.start()]+new+s[m.end():]

# 5) Add batch selection handlers before refreshCost call.
anchor=""";$('#batchCreateGroup').onclick=()=>batchCreateFromScript(n,d,$('#batchType').value,{autoRun:false});refreshCost();"""
if anchor not in s:
    raise SystemExit('batch bindings anchor missing')
repl=r''';$('#batchSelectAll')?.addEventListener('click',()=>{$$('[data-batch-shot]',featureModal).forEach(x=>x.checked=true);refreshCost()});$('#batchSelectNone')?.addEventListener('click',()=>{$$('[data-batch-shot]',featureModal).forEach(x=>x.checked=false);refreshCost()});$('#batchSelectDirty')?.addEventListener('click',()=>{$$('[data-batch-shot]',featureModal).forEach(x=>x.checked=Boolean(d.shots.find(sh=>sh.id===x.dataset.batchShot)?.promptDirty));refreshCost()});$('#batchCreateGroup').onclick=()=>batchCreateFromScript(n,d,$('#batchType').value,{autoRun:false});refreshCost();'''
s=s.replace(anchor,repl,1)

app.write_text(s,encoding='utf-8')

# Add regression tests.
t=ROOT/'tests'/'script-workflow-phase3.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('prompt synthesis supports single selected and all shots',()=>{
  assert.match(app,/function synthesizeScriptPromptSubset\(n,shotIds=\[\]\)/);
  assert.match(app,/data-prompt-shot=/);
  assert.match(app,/data-synthesize-shot=/);
  assert.match(app,/id="synthesizeSelected"/);
});
test('batch review exposes asset and first frame metadata before node creation',()=>{
  assert.match(app,/function scriptBatchShotMeta\(n,d,shot,type\)/);
  assert.match(app,/资产：\$\{escapeHtml\(meta\.assetNames\)\}/);
  assert.match(app,/首帧：暂无，将按文生视频创建/);
  assert.match(app,/可先选 1–3 个 Shot 测试模型与风格/);
});
test('batch selection supports subset testing',()=>{
  assert.match(app,/id="batchSelectAll"/);
  assert.match(app,/id="batchSelectNone"/);
  assert.match(app,/id="batchSelectDirty"/);
});
''',encoding='utf-8')
print('patched Script Workflow Phase 3')
