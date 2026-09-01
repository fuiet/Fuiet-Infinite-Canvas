from pathlib import Path
import re, json

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'


def replace_function(text,name,new_code):
    marker=f'  function {name}('
    start=text.find(marker)
    if start<0:
        raise SystemExit(f'missing function: {name}')
    nxt=text.find('\n  function ',start+len(marker))
    if nxt<0:
        raise SystemExit(f'missing next function after: {name}')
    return text[:start]+new_code.rstrip()+text[nxt:]


def replace_once(text,old,new,label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old,new,1)

# Reuse the already-reviewed formal PRD embedded in the first helper.
old_helper=Path('scripts/apply-script-workflow-v1.py').read_text(encoding='utf-8')
m=re.search(r"spec=r'''([\s\S]*?)'''\n",old_helper)
if not m:
    raise SystemExit('formal Script Workflow V1 spec not found')
(ROOT/'SCRIPT_WORKFLOW_V1.md').write_text(m.group(1).rstrip()+'\n',encoding='utf-8')

core=r'''/* Fuiet Script Workflow V1 · shared data contract */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FuietScriptWorkflowCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA_VERSION=1;
  const arr=v=>Array.isArray(v)?v:[];
  const text=v=>String(v??'');
  const uniq=v=>[...new Set(arr(v).filter(Boolean))];
  const now=()=>new Date().toISOString();
  const makeId=(factory,prefix)=>typeof factory==='function'?factory(prefix):`${prefix}_${Math.random().toString(36).slice(2,10)}`;
  function normalizeGlobalStyle(data){
    const old=text(data?.style),src=data?.globalStyle&&typeof data.globalStyle==='object'?data.globalStyle:{};
    const out={text:text(src.text||old),referenceNodeIds:uniq(src.referenceNodeIds),referenceMediaUrls:uniq(src.referenceMediaUrls),revision:Math.max(0,Number(src.revision||0)),updatedAt:text(src.updatedAt)};
    data.globalStyle=out;data.style=out.text;return out;
  }
  function normalizeAsset(asset,type,idFactory){
    const a=asset&&typeof asset==='object'?asset:{};
    a.id=a.id||makeId(idFactory,type==='character'?'char':type==='scene'?'scene':'prop');
    a.type=type;a.name=text(a.name||a.title||'');a.description=text(a.description);a.prompt=text(a.prompt||a.description);a.mediaUrl=text(a.mediaUrl||a.referenceUrl);a.nodeIds=uniq(a.nodeIds);a.versions=arr(a.versions);a.revision=Math.max(0,Number(a.revision||0));a.updatedAt=text(a.updatedAt);return a;
  }
  function emptyOutputs(v={}){return{imageNodeIds:uniq(v.imageNodeIds),videoNodeIds:uniq(v.videoNodeIds),selectedImageNodeId:text(v.selectedImageNodeId),selectedVideoNodeId:text(v.selectedVideoNodeId)}}
  function normalizeShot(shot,index,idFactory){
    const s=shot&&typeof shot==='object'?shot:{};
    s.id=s.id||makeId(idFactory,'shot');s.no=Math.max(1,Number(s.no||index+1));s.color=text(s.color||'#55616b');
    s.scene=text(s.scene);s.characters=Array.isArray(s.characters)?s.characters.join('、'):text(s.characters);s.props=Array.isArray(s.props)?s.props.join('、'):text(s.props);s.shotSize=text(s.shotSize||s.shot_size||'中景');
    s.lighting=text(s.lighting||s.light||s.atmosphere);s.action=text(s.action||s.visual||s.description);s.dialogue=text(s.dialogue||s.voice);s.sound=text(s.sound||s.sfx);s.cameraMovement=text(s.cameraMovement||s.camera_movement||s.camera||s.motion);
    s.duration=Math.max(.5,Number(s.duration||3));s.assetRefs=uniq(s.assetRefs);s.baseImagePrompt=text(s.baseImagePrompt||s.imagePrompt||s.image_prompt);s.baseVideoPrompt=text(s.baseVideoPrompt||s.videoPrompt||s.video_prompt);s.imagePrompt=text(s.imagePrompt||s.image_prompt);s.videoPrompt=text(s.videoPrompt||s.video_prompt);
    s.promptDirty=Boolean(s.promptDirty);s.dirtyReason=text(s.dirtyReason);s.promptRevision=Math.max(0,Number(s.promptRevision||0));s.promptStatus=s.promptDirty?'dirty':text(s.promptStatus||(s.imagePrompt||s.videoPrompt?'ready':'empty'));s.outputs=emptyOutputs(s.outputs);return s;
  }
  function createScriptData(){return{schemaVersion:SCHEMA_VERSION,style:'',globalStyle:{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},assets:{characters:[],scenes:[],props:[]},shots:[],workflow:{stage:'draft',shotsConfirmed:false,assetsReady:false,promptsReady:false,updatedAt:''},production:{image:{},video:{}},quality:{shots:{},baseline:null},finalized:false}}
  function normalizeScriptData(input,opts={}){
    const d=input&&typeof input==='object'?input:createScriptData();d.schemaVersion=SCHEMA_VERSION;normalizeGlobalStyle(d);d.assets=d.assets&&typeof d.assets==='object'?d.assets:{};
    d.assets.characters=arr(d.assets.characters).map(a=>normalizeAsset(a,'character',opts.idFactory));d.assets.scenes=arr(d.assets.scenes).map(a=>normalizeAsset(a,'scene',opts.idFactory));d.assets.props=arr(d.assets.props).map(a=>normalizeAsset(a,'prop',opts.idFactory));d.shots=arr(d.shots).map((s,i)=>normalizeShot(s,i,opts.idFactory));d.shots.forEach((s,i)=>s.no=i+1);
    d.workflow=d.workflow&&typeof d.workflow==='object'?d.workflow:{};d.workflow.stage=text(d.workflow.stage||(d.shots.length?'shots':'draft'));d.workflow.shotsConfirmed=Boolean(d.workflow.shotsConfirmed);d.workflow.assetsReady=Boolean(d.workflow.assetsReady);d.workflow.promptsReady=Boolean(d.workflow.promptsReady);d.workflow.updatedAt=text(d.workflow.updatedAt);d.production=d.production&&typeof d.production==='object'?d.production:{image:{},video:{}};d.production.image=d.production.image||{};d.production.video=d.production.video||{};d.quality=d.quality&&typeof d.quality==='object'?d.quality:{shots:{},baseline:null};d.quality.shots=d.quality.shots||{};if(!('baseline' in d.quality))d.quality.baseline=null;d.finalized=Boolean(d.finalized);return d;
  }
  function markShotDirty(shot,reason='内容已修改'){if(!shot)return shot;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=now();return shot}
  function markShotReady(shot){if(!shot)return shot;shot.promptDirty=false;shot.promptStatus='ready';shot.dirtyReason='';shot.promptRevision=Math.max(0,Number(shot.promptRevision||0))+1;shot.promptUpdatedAt=now();return shot}
  function registerShotOutput(shot,type,nodeId,{select=true}={}){if(!shot||!nodeId)return;shot.outputs=emptyOutputs(shot.outputs);const key=type==='video'?'videoNodeIds':'imageNodeIds',selected=type==='video'?'selectedVideoNodeId':'selectedImageNodeId';shot.outputs[key]=uniq([...shot.outputs[key],nodeId]);if(select||!shot.outputs[selected])shot.outputs[selected]=nodeId}
  function createGenerationSnapshot({scriptNodeId='',shot,type='image',prompt='',globalStyle={},assets=[],providerId='',modelId='',parameters={}}={}){return{schemaVersion:SCHEMA_VERSION,createdAt:now(),scriptNodeId:text(scriptNodeId),shotId:text(shot?.id),shotNo:Number(shot?.no||0),type:type==='video'?'video':'image',prompt:text(prompt),globalStyle:{text:text(globalStyle?.text),revision:Math.max(0,Number(globalStyle?.revision||0))},assets:arr(assets).map(a=>({id:text(a.id),type:text(a.type||a.assetType),name:text(a.name),revision:Math.max(0,Number(a.revision||0)),mediaUrl:text(a.mediaUrl),prompt:text(a.prompt)})),providerId:text(providerId),modelId:text(modelId),parameters:JSON.parse(JSON.stringify(parameters||{}))}}
  function globalStyleText(data){return text(data?.globalStyle?.text||data?.style)}
  return{SCHEMA_VERSION,createScriptData,normalizeScriptData,normalizeGlobalStyle,normalizeAsset,normalizeShot,markShotDirty,markShotReady,registerShotOutput,createGenerationSnapshot,globalStyleText};
});
'''
(ROOT/'script-workflow-core.js').write_text(core,encoding='utf-8')

app=APP.read_text(encoding='utf-8')

ensure=r'''  function ensureScriptData(n){
    const Core=globalThis.FuietScriptWorkflowCore;
    if(!n.scriptData)n.scriptData=Core?.createScriptData?Core.createScriptData():{schemaVersion:1,style:'',globalStyle:{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},assets:{characters:[],scenes:[],props:[]},shots:[],workflow:{stage:'draft'},production:{image:{},video:{}},quality:{shots:{},baseline:null},finalized:false};
    if(Core?.normalizeScriptData)Core.normalizeScriptData(n.scriptData,{idFactory:prefix=>uid(prefix)});
    return n.scriptData;
  }'''
app=replace_function(app,'ensureScriptData',ensure)

# Dirty/ready prompt state.
app=replace_once(app,"function markScriptShotDirty(shot,reason='内容已修改'){if(!shot)return;shot.promptDirty=true;shot.dirtyReason=reason;shot.dirtyAt=new Date().toISOString()}","function markScriptShotDirty(shot,reason='内容已修改'){const Core=globalThis.FuietScriptWorkflowCore;if(Core?.markShotDirty)return Core.markShotDirty(shot,reason);if(!shot)return;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=new Date().toISOString()}",'dirty state')

# Shot table: all production fields are directly editable.
shots_html=r'''  function scriptShotsHtml(n,d){return `<div class="script-top-actions"><div class="script-source">${field('剧本 / 故事',`<textarea id="scriptSource" rows="3" placeholder="输入完整剧本或故事梗概…">${escapeHtml(n.sourceText||'')}</textarea>`,true)}</div><div class="script-ai-config">${providerModelSelectHtml('text',n.scriptProviderId||'',n.scriptModelId||'','script')}</div><button id="aiBreakdownScript" class="primary">AI 拆解</button></div><div class="script-table-wrap"><table class="script-editor-table"><thead><tr><th>序号</th><th>标记</th><th>场景</th><th>角色</th><th>道具</th><th>景别</th><th>画面描述</th><th>光影氛围</th><th>对白 / 旁白</th><th>音效</th><th>运镜</th><th>时长</th><th>生产</th><th>顺序</th><th></th></tr></thead><tbody>${d.shots.map((s,i)=>`<tr data-shot-row="${s.id}"><td><span class="shot-drag">≡</span>${i+1}</td><td><input data-shot="color" type="color" value="${s.color||'#55616b'}"></td><td><input data-shot="scene" value="${escapeAttr(s.scene||'')}"></td><td><input data-shot="characters" value="${escapeAttr(s.characters||'')}"></td><td><input data-shot="props" value="${escapeAttr(s.props||'')}"></td><td><select data-shot="shotSize">${['大全景','全景','中景','近景','特写','极特写'].map(x=>`<option ${x===s.shotSize?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea data-shot="action">${escapeHtml(s.action||'')}</textarea></td><td><textarea data-shot="lighting">${escapeHtml(s.lighting||'')}</textarea></td><td><textarea data-shot="dialogue">${escapeHtml(s.dialogue||'')}</textarea></td><td><textarea data-shot="sound">${escapeHtml(s.sound||'')}</textarea></td><td><textarea data-shot="cameraMovement">${escapeHtml(s.cameraMovement||'')}</textarea></td><td><input data-shot="duration" type="number" min=".5" step=".5" value="${Number(s.duration||3)}"></td><td>${shotProductionCellHtml(n,s)}</td><td><button data-move-shot="up" data-shot-id="${s.id}">↑</button><button data-move-shot="down" data-shot-id="${s.id}">↓</button></td><td><button data-delete-shot="${s.id}">×</button></td></tr>`).join('')}</tbody></table></div><div class="script-bottom-actions"><button id="addShot">＋ 新增 shot</button><button id="synthesizePrompts">合成最终提示词</button><button id="scriptGoProduction" class="primary">进入分镜生产线 →</button><button id="scriptProductionDashboard">整集看板</button><button id="scriptContinuityAudit">连续性检查</button><span class="spacer"></span><button id="downloadScript">导出 JSON</button></div>`}'''
app=replace_function(app,'scriptShotsHtml',shots_html)

# Global style is a structured, revisioned project rule.
prompts_html=r'''  function scriptPromptsHtml(n,d){const dirtyCount=(d.shots||[]).filter(s=>s.promptDirty).length,style=d.globalStyle?.text??d.style??'';return `<div class="prompt-compose-head"><div><b>最终提示词</b><span>综合当前 shot、角色 / 场景 / 道具与全局风格。${dirtyCount?` <span class="script-impact-note">${dirtyCount} 个镜头需要重新合成</span>`:' <span class="script-impact-note clean">全部已同步</span>'}</span></div><label>全局风格 <input id="scriptStyle" value="${escapeAttr(style)}"></label><button id="synthesizeAgain">规则合成</button><button id="aiSynthesizePrompts" class="primary">AI 专业合成</button></div><div class="final-prompt-list">${d.shots.map(s=>`<article class="${s.promptDirty?'dirty':''}" data-final-shot="${s.id}"><header><b>Shot ${s.no}</b><span>${escapeHtml(s.shotSize)} · ${Number(s.duration)}s${s.promptDirty?`<i class="dirty-badge">${escapeHtml(s.dirtyReason||'待同步')}</i>`:''}</span></header><label>图像提示词<textarea data-final-image rows="4">${escapeHtml(s.imagePrompt||'')}</textarea></label><label>视频提示词<textarea data-final-video rows="4">${escapeHtml(s.videoPrompt||'')}</textarea></label></article>`).join('')}</div>`}'''
app=replace_function(app,'scriptPromptsHtml',prompts_html)

# Batch creation always stops for inspection before paid execution.
batch_html=r'''  function scriptBatchHtml(n,d,defaultType){const type=defaultType||'image';return `<div class="batch-panel"><div class="batch-flow-banner"><div><b>脚本 → 生成器组 → 人工确认 → 整组执行</b><span>这里仅创建已填好提示词、资产引用和模型参数的普通生成节点，不会立即调用付费 API。</span></div></div><div class="batch-config"><label>生成类型<select id="batchType"><option value="image" ${type==='image'?'selected':''}>批量生分镜图</option><option value="video" ${type==='video'?'selected':''}>批量生视频</option></select></label><div id="batchProviderModels">${providerModelSelectHtml(type,n.batchProviderId||'',n.batchModelId||'','batch')}</div><label>画幅比<select id="batchRatio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option></select></label><label>队列优先级<select id="batchPriority"><option value="90">高 · 90</option><option value="50" selected>普通 · 50</option><option value="10">低 · 10</option></select></label><label>范围<select id="batchRange"><option>全部镜头</option><option>已勾选镜头</option></select></label></div><div class="batch-shot-list">${d.shots.map(s=>`<label><input type="checkbox" data-batch-shot="${s.id}" checked><span>Shot ${s.no}</span><b>${escapeHtml(s.action)}</b><small>${escapeHtml((type==='image'?s.imagePrompt:s.videoPrompt)||'尚未合成提示词')}</small></label>`).join('')}</div><div id="batchCostPreview" class="batch-cost-preview"></div><div class="feature-actions"><button id="batchCreateGroup" class="primary">确认并创建生成器组</button></div></div>`}'''
app=replace_function(app,'scriptBatchHtml',batch_html)

# New Shot is blank, and all requested fields are persisted.
app=replace_once(app,"d.shots.push({id:uid('shot'),no:d.shots.length+1,color:'#4e6570',scene:'',characters:'',shotSize:'中景',action:'新增镜头',dialogue:'',duration:3,imagePrompt:'',videoPrompt:''})","d.shots.push({id:uid('shot'),no:d.shots.length+1,color:'#4e6570',scene:'',characters:'',props:'',shotSize:'中景',lighting:'',action:'',dialogue:'',sound:'',cameraMovement:'',duration:3,assetRefs:[],baseImagePrompt:'',baseVideoPrompt:'',imagePrompt:'',videoPrompt:'',promptStatus:'empty',promptDirty:false,outputs:{imageNodeIds:[],videoNodeIds:[],selectedImageNodeId:'',selectedVideoNodeId:''}})",'blank add shot')

# Structured Global Style edits dirty affected prompts, but never auto-regenerate.
old="$('#scriptStyle').onchange=()=>{d.style=$('#scriptStyle').value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));d.finalized=false;saveState()}"
new="$('#scriptStyle').onchange=()=>{const value=$('#scriptStyle').value;d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};if(value!==d.globalStyle.text){d.globalStyle.text=value;d.globalStyle.revision=Number(d.globalStyle.revision||0)+1;d.globalStyle.updatedAt=new Date().toISOString();d.style=value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));d.finalized=false;saveState()}}"
app=replace_once(app,old,new,'global style onchange')
app=replace_once(app,"$('#synthesizeAgain').onclick=()=>{d.style=$('#scriptStyle').value;synthesizeScriptPrompts(n);rerender()}","$('#synthesizeAgain').onclick=()=>{d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=$('#scriptStyle').value;d.style=d.globalStyle.text;synthesizeScriptPrompts(n);rerender()}",'rule synth style')
app=replace_once(app,"$('#aiSynthesizePrompts').onclick=()=>{d.style=$('#scriptStyle').value;aiSynthesizeScriptPrompts(n)}","$('#aiSynthesizePrompts').onclick=()=>{d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=$('#scriptStyle').value;d.style=d.globalStyle.text;aiSynthesizeScriptPrompts(n)}",'ai synth style')
app=replace_once(app,"s.imagePrompt=e.target.value;s.promptDirty=false;s.dirtyReason='';saveState()","s.imagePrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()",'manual image prompt ready')
app=replace_once(app,"s.videoPrompt=e.target.value;s.promptDirty=false;s.dirtyReason='';saveState()","s.videoPrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()",'manual video prompt ready')

# Remove user-facing auto-run bindings from batch flow.
app=app.replace("$('#scriptAutoFlow').onchange=()=>{n.scriptAutoFlow=$('#scriptAutoFlow').checked;saveState()};","")
app=app.replace("$('#batchAutoRun').onclick=()=>batchCreateFromScript(n,d,$('#batchType').value,{autoRun:true});","")

# AI schema and parser include the complete Shot production fields.
app=replace_once(app,"shotSize:'全景/中景/近景/特写',action:'可视化动作与调度',dialogue:'对白或旁白',duration:3,imagePrompt:'只写本镜头额外图像信息',videoPrompt:'运镜、动作、声音额外信息'","shotSize:'全景/中景/近景/特写',lighting:'光影与画面氛围',action:'可视化动作与调度',dialogue:'对白或旁白',sound:'环境音/音效',cameraMovement:'运镜方式',duration:3,imagePrompt:'只写本镜头额外图像信息',videoPrompt:'动作、声音额外信息'",'breakdown schema')

old_shot_map="return{id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:String(x.scene||''),characters:Array.isArray(x.characters)?x.characters.join('、'):String(x.characters||''),props:Array.isArray(x.props)?x.props.join('、'):String(x.props||''),shotSize:String(x.shotSize||x.shot_size||'中景'),action:String(x.action||x.visual||x.description||''),dialogue:String(x.dialogue||x.voice||''),duration:Math.max(.5,Number(x.duration||3)),baseImagePrompt:String(x.imagePrompt||x.image_prompt||''),baseVideoPrompt:String(x.videoPrompt||x.video_prompt||''),imagePrompt:String(x.imagePrompt||x.image_prompt||''),videoPrompt:String(x.videoPrompt||x.video_prompt||''),assetRefs:names.map(v=>nameMap.get(v)).filter(Boolean)}"
new_shot_map="return globalThis.FuietScriptWorkflowCore.normalizeShot({id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:String(x.scene||''),characters:Array.isArray(x.characters)?x.characters.join('、'):String(x.characters||''),props:Array.isArray(x.props)?x.props.join('、'):String(x.props||''),shotSize:String(x.shotSize||x.shot_size||'中景'),lighting:String(x.lighting||x.atmosphere||''),action:String(x.action||x.visual||x.description||''),dialogue:String(x.dialogue||x.voice||''),sound:String(x.sound||x.sfx||''),cameraMovement:String(x.cameraMovement||x.camera_movement||x.camera||''),duration:Math.max(.5,Number(x.duration||3)),baseImagePrompt:String(x.imagePrompt||x.image_prompt||''),baseVideoPrompt:String(x.videoPrompt||x.video_prompt||''),imagePrompt:String(x.imagePrompt||x.image_prompt||''),videoPrompt:String(x.videoPrompt||x.video_prompt||''),assetRefs:names.map(v=>nameMap.get(v)).filter(Boolean)},i,prefix=>uid(prefix))"
app=replace_once(app,old_shot_map,new_shot_map,'parsed shot fields')
app=replace_once(app,"if(obj.style)d.style=String(obj.style);","if(obj.style){d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=String(obj.style);d.globalStyle.revision=Number(d.globalStyle.revision||0)+1;d.globalStyle.updatedAt=new Date().toISOString();d.style=d.globalStyle.text;}",'parsed global style')

# Prompt synthesis includes all Shot fields and structured global style.
synth=r'''  function synthesizeScriptPrompts(n){
    const d=ensureScriptData(n),cat=scriptAssetCatalog(d),style=globalThis.FuietScriptWorkflowCore?.globalStyleText?.(d)||d.style||'';(d.shots||[]).forEach(s=>{s.assetRefs=matchShotAssets(s,d);const assets=s.assetRefs.map(id=>cat.find(a=>a.id===id)).filter(Boolean);const assetText=assets.map(a=>`@${a.name}（${a.prompt||'保持资产一致'}）`).join('；'),stateText=narrativeStatePrompt(n,s);const baseImage=s.baseImagePrompt||s.imagePrompt||'',baseVideo=s.baseVideoPrompt||s.videoPrompt||'';s.baseImagePrompt=s.baseImagePrompt||baseImage;s.baseVideoPrompt=s.baseVideoPrompt||baseVideo;s.imagePrompt=[style?`整体风格：${style}`:'',`景别：${s.shotSize}`,`画面：${s.action}`,s.scene?`场景：${s.scene}`:'',s.lighting?`光影氛围：${s.lighting}`:'',assetText?`一致性资产：${assetText}`:'',stateText,baseImage?`补充：${baseImage}`:''].filter(Boolean).join('。')+'。';s.videoPrompt=[`镜头画面：${s.action}`,s.cameraMovement?`运镜：${s.cameraMovement}`:'',s.dialogue?`对白/旁白：${s.dialogue}`:'',s.sound?`音效：${s.sound}`:'',assetText?`保持主体/场景/道具：${assets.map(a=>'@'+a.name).join('、')}`:'',style?`视觉风格：${style}`:'',stateText,baseVideo||'动作自然，镜头调度符合叙事',`目标时长约 ${Number(s.duration||3)} 秒`].filter(Boolean).join('。')+'。';s.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,s));globalThis.FuietScriptWorkflowCore?.markShotReady?.(s)||(()=>{s.promptDirty=false;s.promptStatus='ready';s.dirtyReason=''})();});d.finalized=true;d.finalizedAt=new Date().toISOString();d.workflow=d.workflow||{};d.workflow.stage='ready';d.workflow.promptsReady=true;d.workflow.updatedAt=new Date().toISOString();saveState();showToast('最终图像 / 视频提示词已按资产引用重新合成');
  }'''
app=replace_function(app,'synthesizeScriptPrompts',synth)

# Production nodes carry immutable creation snapshots, explicit asset edges and ShotOutput links.
helpers=r'''  function scriptGenerationAssets(d,shot){const cat=scriptAssetCatalog(d);return (shot.assetRefs||matchShotAssets(shot,d)).map(id=>cat.find(a=>a.id===id)).filter(Boolean)}
  function scriptGenerationSnapshot(scriptNode,d,shot,type,config){return globalThis.FuietScriptWorkflowCore?.createGenerationSnapshot?.({scriptNodeId:scriptNode.id,shot,type,prompt:type==='image'?shot.imagePrompt:shot.videoPrompt,globalStyle:d.globalStyle||{text:d.style||'',revision:0},assets:scriptGenerationAssets(d,shot),providerId:config.providerId,modelId:config.modelId,parameters:{aspectRatio:config.aspectRatio||'16:9',duration:Number(shot.duration||3),priority:Number(config.priority||50)}})||null}
  function connectScriptShotAssetNodes(scriptNode,d,shot,node){const roleByType={character:'character_reference',scene:'scene_reference',prop:'image_reference'};for(const asset of scriptGenerationAssets(d,shot)){const source=[...(asset.nodeIds||[])].reverse().map(id=>state.nodes.find(n=>n.id===id&&n.type==='image')).find(Boolean);if(!source)continue;if(!state.edges.some(e=>e.source===source.id&&e.target===node.id))createEdge(source.id,node.id,{type:'asset',role:roleByType[asset.assetType||asset.type]||'image_reference',silent:true})}}
  function registerScriptShotOutput(shot,type,nodeId){globalThis.FuietScriptWorkflowCore?.registerShotOutput?.(shot,type,nodeId,{select:true})}
'''
anchor='  function scriptProductionConfig(scriptNode,d,type){'
pos=app.find(anchor)
if pos<0: raise SystemExit('missing production config anchor')
app=app[:pos]+helpers+'\n'+app[pos:]

create_node=r'''  function createScriptShotProductionNode(scriptNode,d,shot,type,config,index=0){
    const node={id:uid('n'),type,x:scriptNode.x+560+(index%4)*380,y:scriptNode.y+Math.floor(index/4)*320,w:340,title:`Shot ${shot.no} · ${type==='image'?'分镜图':'视频'}`,content:'',prompt:type==='image'?shot.imagePrompt:shot.videoPrompt,providerId:config.providerId,modelId:config.modelId,modelName:config.modelName,aspectRatio:config.aspectRatio||'16:9',duration:shot.duration,queuePriority:config.priority,toolParams:{operation:type==='image'?'script_batch_image':'script_batch_video',shotId:shot.id,scriptNodeId:scriptNode.id,autoFlow:false}};node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,config);state.nodes.push(node);createEdge(scriptNode.id,node.id,{type:'script',role:'script_context',silent:true});connectScriptShotAssetNodes(scriptNode,d,shot,node);if(type==='video'){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}registerScriptShotOutput(shot,type,node.id);return node;
  }'''
app=replace_function(app,'createScriptShotProductionNode',create_node)

# Batch creation uses the single production-node constructor and never auto-runs.
batch_create=r'''  async function batchCreateFromScript(n,d,type,{autoRun=false}={}){if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(n);const ids=$$('[data-batch-shot]:checked',featureModal).map(x=>x.dataset.batchShot),pid=$('#batchProvider').value,mid=$('#batchModel').value;if(!pid||!mid){showToast('请选择第三方 API 供应商与模型');return}const priority=Math.max(0,Math.min(100,Number($('#batchPriority')?.value??n.batchPriority??50))),model=providerById(pid)?.models?.find(m=>m.id===mid),config={providerId:pid,modelId:mid,modelName:model?.name||mid,aspectRatio:$('#batchRatio').value,priority};n.batchPriority=priority;n.batchProviderId=pid;n.batchModelId=mid;n.scriptAutoFlow=false;snapshot('脚本创建生成器组');const created=[],shotNodeMap={};ids.forEach((id,i)=>{const shot=d.shots.find(x=>x.id===id);if(!shot)return;const node=createScriptShotProductionNode(n,d,shot,type,config,i);created.push(node.id);shotNodeMap[shot.id]=node.id});const group=createGroup(created,type==='image'?'脚本分镜组':'分镜视频生成组',type==='image'?'storyboard':'workflow',{grid:created.length<=4?'2x2':created.length<=9?'3x3':'4x4',ratio:$('#batchRatio').value,scriptNodeId:n.id,shotNodeMap,autoFlow:false});d.production=d.production||{};d.production[type]={groupId:group?.id||'',nodeIds:created,createdAt:new Date().toISOString(),priority,providerId:pid,modelId:mid,aspectRatio:$('#batchRatio').value};saveState();render();if(type==='image')autoLayoutNodes(created,{direction:'LR',mode:'compact',fit:true});closeFeatureModal();showToast(`已创建 ${created.length} 个${type==='image'?'分镜图':'视频'}生成器，请检查后点击组上的“整组执行”`);return created}
'''
app=replace_function(app,'batchCreateFromScript',batch_create)

# Regeneration refreshes explicit references and snapshot for the intentional rerun.
app=replace_once(app,"if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}}ids.push(node.id)","connectScriptShotAssetNodes(scriptNode,d,shot,node);node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,{providerId:node.providerId,modelId:node.modelId,modelName:node.modelName,aspectRatio:node.aspectRatio||config.aspectRatio,priority:node.queuePriority??config.priority});registerScriptShotOutput(shot,type,node.id);if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}}ids.push(node.id)",'regenerate snapshot')

APP.write_text(app,encoding='utf-8')

# Load the shared contract before app.js and bust browser caches.
boot=ROOT/'browser-bootstrap.js'
b=boot.read_text(encoding='utf-8')
b=re.sub(r"const v='[^']+';","const v='20260901-script-workflow-v1';",b,count=1)
if '`./script-workflow-core.js?v=${v}`' not in b:
    b=b.replace("  `./app.js?v=${v}`,","  `./script-workflow-core.js?v=${v}`,\n  `./app.js?v=${v}`,",1)
boot.write_text(b,encoding='utf-8')

# Add the core file to syntax checks.
pkg_path=ROOT/'package.json';pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
check=pkg['scripts']['check']
if 'script-workflow-core.js' not in check:
    check=check.replace('node --check app.js','node --check script-workflow-core.js && node --check app.js',1)
pkg['scripts']['check']=check
pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Regression tests: data migration + production contract + UI safety.
test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const Core=require('../script-workflow-core.js');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('new Script Workflow V1 data is blank and production-safe',()=>{
  const d=Core.createScriptData();
  assert.equal(d.schemaVersion,1);assert.deepEqual(d.assets,{characters:[],scenes:[],props:[]});assert.deepEqual(d.shots,[]);assert.equal(d.globalStyle.text,'');
});

test('legacy script data migrates without losing content',()=>{
  const old={style:'电影感写实',assets:{characters:[{name:'林栀',prompt:'固定脸'}]},shots:[{scene:'工作室',characters:'林栀',action:'抬头',imagePrompt:'旧图词',videoPrompt:'旧视频词'}]};
  const d=Core.normalizeScriptData(old,{idFactory:p=>p+'_1'});const s=d.shots[0];
  assert.equal(d.globalStyle.text,'电影感写实');assert.equal(d.assets.characters[0].name,'林栀');assert.equal(s.action,'抬头');assert.equal(s.imagePrompt,'旧图词');assert.equal(s.videoPrompt,'旧视频词');assert.ok(s.id);assert.deepEqual(s.outputs.imageNodeIds,[]);
});

test('shot dirty state and output relationships are explicit',()=>{
  const d=Core.createScriptData();d.shots=[Core.normalizeShot({id:'shot_1',action:'A'},0)];const s=d.shots[0];Core.markShotDirty(s,'资产变化');assert.equal(s.promptStatus,'dirty');Core.markShotReady(s);assert.equal(s.promptStatus,'ready');Core.registerShotOutput(s,'image','node_1');Core.registerShotOutput(s,'video','node_2');assert.deepEqual(s.outputs.imageNodeIds,['node_1']);assert.equal(s.outputs.selectedVideoNodeId,'node_2');
});

test('generation snapshots freeze style asset and provider context',()=>{
  const snap=Core.createGenerationSnapshot({scriptNodeId:'script_1',shot:{id:'shot_1',no:1},type:'video',prompt:'move',globalStyle:{text:'写实',revision:2},assets:[{id:'a1',type:'character',name:'林栀',revision:3,mediaUrl:'/a.png',prompt:'固定脸'}],providerId:'p1',modelId:'m1',parameters:{duration:5}});assert.equal(snap.shotId,'shot_1');assert.equal(snap.globalStyle.revision,2);assert.equal(snap.assets[0].revision,3);assert.equal(snap.parameters.duration,5);
});

test('script editor exposes complete shot fields and batch creation stops before paid execution',()=>{
  for(const label of ['光影氛围','音效','运镜'])assert.match(app,new RegExp(label));
  assert.match(app,/generationSnapshot=scriptGenerationSnapshot/);assert.match(app,/connectScriptShotAssetNodes/);assert.match(app,/registerScriptShotOutput/);assert.match(app,/确认并创建生成器组/);assert.doesNotMatch(app,/id="batchAutoRun"/);assert.match(app,/autoFlow:false/);
});
'''
(ROOT/'tests/script-workflow-v1.test.mjs').write_text(test,encoding='utf-8')

print('Script Workflow V1 foundation patch prepared')
