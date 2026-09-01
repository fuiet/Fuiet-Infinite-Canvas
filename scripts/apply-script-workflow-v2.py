from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'
BOOT=ROOT/'browser-bootstrap.js'


def fn_bounds(text,name):
    markers=[f'  function {name}(',f'  async function {name}(']
    found=[(text.find(m),m) for m in markers if text.find(m)>=0]
    if not found: raise SystemExit(f'missing function {name}')
    start,marker=min(found,key=lambda x:x[0])
    candidates=[x for x in (text.find('\n  function ',start+len(marker)),text.find('\n  async function ',start+len(marker))) if x>=0]
    if not candidates: raise SystemExit(f'missing next function after {name}')
    return start,min(candidates)

def replace_fn(text,name,new):
    a,b=fn_bounds(text,name)
    return text[:a]+new.rstrip()+text[b:]

def replace_once(text,old,new,label):
    if old not in text: raise SystemExit(f'missing target: {label}')
    return text.replace(old,new,1)

def replace_section_in_fn(text,fn_name,start_marker,end_marker,new_section):
    a,b=fn_bounds(text,fn_name); body=text[a:b]
    s=body.find(start_marker)
    if s<0: raise SystemExit(f'missing section start {start_marker} in {fn_name}')
    e=body.find(end_marker,s+len(start_marker))
    if e<0: raise SystemExit(f'missing section end {end_marker} in {fn_name}')
    body=body[:s]+new_section.rstrip()+'\n    '+body[e:]
    return text[:a]+body+text[b:]

app=APP.read_text(encoding='utf-8')

# Shared visible workflow helpers + asset drawer helpers.
helpers=r'''  function scriptWorkflowStats(d){
    const shots=d.shots||[],assets=scriptAssetCatalog(d),promptReady=shots.filter(s=>String(s.imagePrompt||'').trim()&&String(s.videoPrompt||'').trim()&&!s.promptDirty).length,assetReady=assets.filter(a=>String(a.mediaUrl||'').trim()).length,w=d.workflow||{};
    return{shotsTotal:shots.length,shotsConfirmed:Boolean(w.shotsConfirmed),assetsTotal:assets.length,assetsVisualReady:assetReady,assetsMissing:Math.max(0,assets.length-assetReady),assetsReady:Boolean(w.assetsReady),promptsReadyCount:promptReady,promptsReady:Boolean(w.promptsReady)&&promptReady===shots.length&&shots.length>0};
  }
  function scriptWorkflowMark(d,stage,changes={}){d.workflow=d.workflow||{};Object.assign(d.workflow,changes,{stage,updatedAt:new Date().toISOString()});}
  function scriptWorkflowInvalidate(d,from='shots'){
    d.workflow=d.workflow||{};
    if(from==='shots'){d.workflow.shotsConfirmed=false;d.workflow.promptsReady=false;d.workflow.stage='shots'}
    else if(from==='assets'){d.workflow.assetsReady=false;d.workflow.promptsReady=false;d.workflow.stage='assets'}
    else if(from==='prompts'){d.workflow.promptsReady=false;d.workflow.stage='prompts'}
    d.workflow.updatedAt=new Date().toISOString();d.finalized=false;
  }
  function scriptWorkflowRequire(n,d,target='batch'){
    const s=scriptWorkflowStats(d);if(!s.shotsTotal){showToast('请先生成或添加镜头');openScriptEditor(n,'shots');return false}
    if(!s.shotsConfirmed){showToast('请先完成第 1 步：确认镜头');openScriptEditor(n,'shots');return false}
    if(target==='prompts')return true;
    if(!s.assetsReady){showToast('请先完成第 2 步：准备并确认资产');openScriptEditor(n,'assets');return false}
    if(target==='assets')return true;
    if(!s.promptsReady){showToast('请先完成第 3 步：合成最终提示词');openScriptEditor(n,'prompts');return false}
    return true;
  }
  function scriptWorkflowStepsHtml(d,tab){
    const s=scriptWorkflowStats(d),steps=[
      {tab:'shots',no:1,title:'确认镜头',done:s.shotsConfirmed,meta:s.shotsTotal?(s.shotsConfirmed?`${s.shotsTotal} 个镜头已确认`:`${s.shotsTotal} 个镜头待核对`):'等待拆解剧本'},
      {tab:'assets',no:2,title:'准备资产',done:s.assetsReady,meta:s.assetsTotal?`${s.assetsVisualReady}/${s.assetsTotal} 已有参考图${s.assetsReady?' · 已确认':''}`:'暂无资产'},
      {tab:'prompts',no:3,title:'合成提示词',done:s.promptsReady,meta:s.shotsTotal?`${s.promptsReadyCount}/${s.shotsTotal} 已合成`:'等待镜头'}
    ];
    return `<div class="script-workflow-head"><div class="script-workflow-steps">${steps.map(x=>`<button data-script-tab="${x.tab}" class="script-step ${tab===x.tab?'active':''} ${x.done?'done':''}"><i>${x.done?'✓':x.no}</i><span><b>${x.title}</b><small>${x.meta}</small></span></button>`).join('<em></em>')}</div><div class="script-workflow-progress">${s.promptsReady?'3/3 完成，可进入批量生产':s.assetsReady?'2/3 已完成':s.shotsConfirmed?'1/3 已完成':'请从确认镜头开始'}</div></div>`;
  }
  function scriptAssetLookup(d,id){for(const key of ['characters','scenes','props']){const asset=(d.assets?.[key]||[]).find(a=>a.id===id);if(asset)return{key,asset}}return null}
  function scriptAssetMeta(key){return key==='characters'?{label:'角色',type:'character'}:key==='scenes'?{label:'场景',type:'scene'}:{label:'道具',type:'prop'}}
  function bindScriptAssetToNode(scriptNode,d,key,a,img,{source='canvas'}={}){
    if(!img?.outputUrl)return false;a.mediaUrl=img.outputUrl;a.nodeIds=[...new Set([...(a.nodeIds||[]),img.id])];a.versions=[{id:uid('ver'),url:img.outputUrl,createdAt:new Date().toISOString(),source,nodeId:img.id},...(a.versions||[])].slice(0,20);a.revision=Number(a.revision||0)+1;a.updatedAt=new Date().toISOString();markScriptImpactedByAsset(d,a.id,'资产参考图已更新');scriptWorkflowInvalidate(d,'assets');d.ui=d.ui||{};d.ui.activeAssetId=a.id;saveState();return true;
  }
  function createUploadedScriptAssetNode(scriptNode,a,key,url){const img={id:uid('n'),type:'image',x:scriptNode.x+520+(a.nodeIds?.length||0)*24,y:scriptNode.y+(key==='characters'?0:key==='scenes'?300:600),w:320,title:`${a.name||'脚本资产'} · 参考`,content:'',outputUrl:url,prompt:'',providerId:'',modelId:'',modelName:'',toolParams:{operation:'script_asset_reference',assetType:key,assetId:a.id,scriptNodeId:scriptNode.id}};state.nodes.push(img);createEdge(scriptNode.id,img.id,{type:'script-asset',role:key==='characters'?'character_reference':key==='scenes'?'scene_reference':'image_reference',silent:true});return img}
  function scriptAssetDrawerHtml(n,d){
    const hit=scriptAssetLookup(d,d.ui?.activeAssetId);if(!hit)return'';const {key,asset:a}=hit,meta=scriptAssetMeta(key),lock=meta.type!=='prop'?projectAssetLockInfo(meta.type,a.name):null,locked=Boolean(lock),imgs=state.nodes.filter(x=>x.type==='image'&&x.outputUrl&&x.id!==a.nodeIds?.at(-1));
    return `<aside class="script-asset-drawer"><header><div><b>编辑${meta.label}</b><small>稳定资产 ID · ${escapeHtml(a.id)}</small></div><button id="closeScriptAssetDrawer">×</button></header><div class="script-asset-drawer-scroll"><div class="script-asset-hero ${a.mediaUrl?'has-media':''}" style="${a.mediaUrl?`background-image:url('${escapeAttr(a.mediaUrl)}')`:''}"><span>${a.mediaUrl?'':'尚未设置参考图'}</span></div>${locked?`<div class="script-asset-lock-note">🔒 该资产由全剧一致性标准锁定</div>`:''}<label>资产名称<input id="drawerAssetName" value="${escapeAttr(a.name||'')}" ${locked?'disabled':''}></label><label>资产描述<textarea id="drawerAssetDescription" rows="5" ${locked?'disabled':''}>${escapeHtml(a.description||'')}</textarea></label><label>生成 / 一致性提示词<textarea id="drawerAssetPrompt" rows="9" ${locked?'disabled':''}>${escapeHtml(a.prompt||'')}</textarea></label><div class="script-asset-drawer-meta"><span>引用 ${scriptAssetImpactCount(d,a.id)} 个镜头</span><span>版本 ${(a.versions||[]).length}</span><span>Revision ${Number(a.revision||0)}</span></div><div class="script-asset-ref-actions"><button id="drawerAssetGenerate" ${locked?'disabled':''}>AI 生成参考图</button><button id="drawerAssetUpload" ${locked?'disabled':''}>上传参考图</button><input id="drawerAssetFile" type="file" accept="image/*" hidden><div class="script-canvas-pick"><select id="drawerAssetCanvas" ${locked?'disabled':''}><option value="">从画布选择图片</option>${imgs.map(img=>`<option value="${img.id}">${escapeHtml(img.title||'图片节点')}</option>`).join('')}</select><button id="drawerAssetBindCanvas" ${locked?'disabled':''}>设为参考</button></div></div><div class="script-asset-drawer-actions">${lock?`<button id="drawerAssetOpenGlobal">查看全剧标准</button>`:`<button id="drawerAssetDelete" class="danger">删除资产</button><button id="drawerAssetSave" class="primary">保存修改</button>`}</div></div></aside>`;
  }
'''
anchor='  function scriptAssetsHtml(n,d){'
pos=app.find(anchor)
if pos<0: raise SystemExit('scriptAssetsHtml anchor missing')
app=app[:pos]+helpers+'\n'+app[pos:]

# Main editor: 3-stage workflow is primary; advanced tools become secondary.
open_editor=r'''  function openScriptEditor(n,initialTab='shots',focusShotId=''){
    const d=ensureScriptData(n);let tab=initialTab.startsWith('batch')?'batch':initialTab;
    const renderEditor=()=>{
      const batchType=initialTab==='batch-video'?'video':'image';
      modalShell('Script Studio · 分镜故事板',`<div class="script-editor-shell">${scriptWorkflowStepsHtml(d,tab)}<div class="script-secondary-tabs"><button data-script-tab="state" class="${tab==='state'?'active':''}">剧情状态</button><button data-script-tab="batch" class="${tab==='batch'?'active':''}">批量生产</button><button id="scriptDashboardBtn" class="script-dashboard-tab">整集生产看板</button><button id="scriptContinuityTop">连续性检查</button></div><div id="scriptEditorContent" class="script-editor-content"></div></div>`,{full:true});
      const c=$('#scriptEditorContent');
      if(tab==='shots') c.innerHTML=scriptShotsHtml(n,d);
      if(tab==='assets') c.innerHTML=scriptAssetsHtml(n,d);
      if(tab==='state') c.innerHTML=scriptNarrativeHtml(n,d);
      if(tab==='prompts') c.innerHTML=scriptPromptsHtml(n,d);
      if(tab==='batch') c.innerHTML=scriptBatchHtml(n,d,batchType);
      $$('[data-script-tab]',featureModal).forEach(b=>b.onclick=()=>{const next=b.dataset.scriptTab;if(next==='batch'&&!scriptWorkflowRequire(n,d,'batch'))return;tab=next;renderEditor()});
      bindScriptTab(n,d,tab,renderEditor,batchType);$('#scriptDashboardBtn')?.addEventListener('click',()=>openEpisodeDashboard(n));$('#scriptContinuityTop')?.addEventListener('click',()=>openContinuityAudit(n));if(tab==='shots'&&focusShotId)requestAnimationFrame(()=>{const row=featureModal.querySelector(`[data-shot-row="${CSS.escape(String(focusShotId))}"]`);if(row){row.classList.add('shot-focused');row.scrollIntoView({block:'center',behavior:'smooth'})}});if(tab==='state'&&focusShotId)requestAnimationFrame(()=>{const row=featureModal.querySelector(`[data-state-shot="${CSS.escape(String(focusShotId))}"]`);if(row){row.classList.add('shot-focused');row.scrollIntoView({block:'center',behavior:'smooth'})}});
    };renderEditor();
  }'''
app=replace_fn(app,'openScriptEditor',open_editor)

# Shot page: explicit confirm -> assets.
shots=r'''  function scriptShotsHtml(n,d){const stats=scriptWorkflowStats(d);return `<div class="script-stage-intro"><div><b>第 1 步 · 确认镜头</b><span>先把分镜拆分、动作、景别、光影、对白、音效和运镜调整准确。后续资产与提示词都会基于这里继续生产。</span></div><i class="${stats.shotsConfirmed?'done':''}">${stats.shotsConfirmed?'已确认':'待确认'}</i></div><div class="script-top-actions"><div class="script-source">${field('剧本 / 故事',`<textarea id="scriptSource" rows="3" placeholder="输入完整剧本或故事梗概…">${escapeHtml(n.sourceText||'')}</textarea>`,true)}</div><div class="script-ai-config">${providerModelSelectHtml('text',n.scriptProviderId||'',n.scriptModelId||'','script')}</div><button id="aiBreakdownScript" class="primary">AI 拆解</button></div><div class="script-table-wrap"><table class="script-editor-table"><thead><tr><th>序号</th><th>标记</th><th>场景</th><th>角色</th><th>道具</th><th>景别</th><th>画面描述</th><th>光影氛围</th><th>对白 / 旁白</th><th>音效</th><th>运镜</th><th>时长</th><th>生产</th><th>顺序</th><th></th></tr></thead><tbody>${d.shots.map((s,i)=>`<tr data-shot-row="${s.id}"><td><span class="shot-drag">≡</span>${i+1}</td><td><input data-shot="color" type="color" value="${s.color||'#55616b'}"></td><td><input data-shot="scene" value="${escapeAttr(s.scene||'')}"></td><td><input data-shot="characters" value="${escapeAttr(s.characters||'')}"></td><td><input data-shot="props" value="${escapeAttr(s.props||'')}"></td><td><select data-shot="shotSize">${['大全景','全景','中景','近景','特写','极特写'].map(x=>`<option ${x===s.shotSize?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea data-shot="action">${escapeHtml(s.action||'')}</textarea></td><td><textarea data-shot="lighting">${escapeHtml(s.lighting||'')}</textarea></td><td><textarea data-shot="dialogue">${escapeHtml(s.dialogue||'')}</textarea></td><td><textarea data-shot="sound">${escapeHtml(s.sound||'')}</textarea></td><td><textarea data-shot="cameraMovement">${escapeHtml(s.cameraMovement||'')}</textarea></td><td><input data-shot="duration" type="number" min=".5" step=".5" value="${Number(s.duration||3)}"></td><td>${shotProductionCellHtml(n,s)}</td><td><button data-move-shot="up" data-shot-id="${s.id}">↑</button><button data-move-shot="down" data-shot-id="${s.id}">↓</button></td><td><button data-delete-shot="${s.id}">×</button></td></tr>`).join('')}</tbody></table></div><div class="script-bottom-actions"><button id="addShot">＋ 新增 shot</button><button id="scriptProductionDashboard">整集看板</button><button id="scriptContinuityAudit">连续性检查</button><span class="spacer"></span><button id="downloadScript">导出 JSON</button><button id="confirmScriptShots" class="primary">${stats.shotsConfirmed?'镜头已确认 · 进入资产':'确认镜头 → 准备资产'}</button></div>`}'''
app=replace_fn(app,'scriptShotsHtml',shots)

# Asset page: card overview + right drawer; no dense inline form.
assets=r'''  function scriptAssetsHtml(n,d){
    const stats=scriptWorkflowStats(d),style=d.globalStyle?.text??d.style??'';
    const typeBlock=(key,label)=>`<section class="asset-block"><div class="asset-block-head"><b>${label}</b><small>${(d.assets[key]||[]).filter(a=>a.mediaUrl).length}/${(d.assets[key]||[]).length} 已有参考图</small><button data-add-script-asset="${key}">＋ 新增</button></div><div class="script-asset-grid cards">${(d.assets[key]||[]).map(a=>{const impact=scriptAssetImpactCount(d,a.id),dirty=(d.shots||[]).some(s=>s.promptDirty&&matchShotAssets(s,d).includes(a.id)),ctype=key==='characters'?'character':key==='scenes'?'scene':'',locked=Boolean(ctype&&projectAssetLockInfo(ctype,a.name));return `<button class="script-asset-card ${dirty?'asset-dirty ':''}${locked?'asset-project-locked':''}${d.ui?.activeAssetId===a.id?'active':''}" data-open-script-asset="${a.id}"><div class="asset-preview" style="${a.mediaUrl?`background-image:url('${escapeAttr(a.mediaUrl)}');background-size:cover;background-position:center`:`background:${themeBg(key==='characters'?'portrait':key==='scenes'?'city':'forest')}`}">${locked?'<span class="asset-global-lock">🔒 全剧标准</span>':a.mediaUrl?'':'<span class="asset-missing">待设置参考图</span>'}</div><div class="asset-card-copy"><b>${escapeHtml(a.name||'未命名资产')}</b><p>${escapeHtml((a.description||a.prompt||'等待补充资产描述').slice(0,100))}</p><span>引用 ${impact} 个镜头 · ${(a.versions||[]).length} 个版本${dirty?' · 待同步':''}</span></div></button>`}).join('')||'<div class="feature-empty">暂无资产</div>'}</div></section>`;
    return `<div class="script-assets-layout"><main><div class="script-stage-intro"><div><b>第 2 步 · 准备资产</b><span>角色、场景、道具是整个故事的稳定视觉资产。可以 AI 生成、上传已有参考图，或直接选择画布中的图片。</span></div><i class="${stats.assetsReady?'done':''}">${stats.assetsReady?'已确认':'待确认'}</i></div><div class="script-asset-toolbar v2"><label class="script-global-style"><span>全局风格</span><input id="scriptAssetGlobalStyle" value="${escapeAttr(style)}" placeholder="真人写实 / 二次元 / 3D / 水彩…"></label><div class="asset-provider-pick">${providerModelSelectHtml('image',n.assetProviderId||'',n.assetModelId||'','assetGen')}</div><button id="openProjectConsistencyFromAssets">全剧一致性</button><button id="generateAllAssets">一键创建缺失资产生成器</button></div>${typeBlock('characters','角色')}${typeBlock('scenes','场景')}${typeBlock('props','道具')}<div class="script-bottom-actions"><span class="script-asset-warning">${stats.assetsMissing?`${stats.assetsMissing} 个资产尚无参考图，可确认后继续，但一致性可能降低。`:'所有资产均已设置参考图。'}</span><span class="spacer"></span><button id="confirmScriptAssets" class="primary">${stats.assetsReady?'资产已确认 · 进入提示词':'确认资产 → 合成提示词'}</button></div></main>${scriptAssetDrawerHtml(n,d)}</div>`;
  }'''
app=replace_fn(app,'scriptAssetsHtml',assets)

# Prompt page: stage intro + clear route to batch.
prompts=r'''  function scriptPromptsHtml(n,d){const dirtyCount=(d.shots||[]).filter(s=>s.promptDirty).length,style=d.globalStyle?.text??d.style??'',stats=scriptWorkflowStats(d);return `<div class="script-stage-intro"><div><b>第 3 步 · 合成最终提示词</b><span>把已确认的镜头、角色 / 场景 / 道具资产和全局风格合成为图片提示词与视频运动提示词。</span></div><i class="${stats.promptsReady?'done':''}">${stats.promptsReady?'已完成':'待合成'}</i></div><div class="prompt-compose-head"><div><b>最终提示词</b><span>${dirtyCount?`<span class="script-impact-note">${dirtyCount} 个镜头需要重新合成</span>`:'<span class="script-impact-note clean">当前提示词已同步</span>'}</span></div><label>全局风格 <input id="scriptStyle" value="${escapeAttr(style)}"></label><button id="synthesizeAgain">规则合成</button><button id="aiSynthesizePrompts" class="primary">AI 专业合成</button></div><div class="final-prompt-list">${d.shots.map(s=>`<article class="${s.promptDirty?'dirty':''}" data-final-shot="${s.id}"><header><b>Shot ${s.no}</b><span>${escapeHtml(s.shotSize)} · ${Number(s.duration)}s${s.promptDirty?`<i class="dirty-badge">${escapeHtml(s.dirtyReason||'待同步')}</i>`:''}</span></header><label>分镜图片提示词<textarea data-final-image rows="4">${escapeHtml(s.imagePrompt||'')}</textarea></label><label>视频运动提示词<textarea data-final-video rows="4">${escapeHtml(s.videoPrompt||'')}</textarea></label></article>`).join('')}</div><div class="script-bottom-actions"><span>${stats.promptsReadyCount}/${stats.shotsTotal} 个镜头生产提示词已就绪</span><span class="spacer"></span><button id="scriptPromptsToBatch" class="primary">进入批量生产 →</button></div>`}'''
app=replace_fn(app,'scriptPromptsHtml',prompts)

# Shot binding: any structural edit invalidates confirmation; explicit confirm advances.
a,b=fn_bounds(app,'bindScriptTab'); body=app[a:b]
old="$$('[data-shot-row] input,[data-shot-row] textarea,[data-shot-row] select',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');d.finalized=false;saveRows()});"
new="$$('[data-shot-row] input,[data-shot-row] textarea,[data-shot-row] select',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');scriptWorkflowInvalidate(d,'shots');saveRows()});"
if old not in body: raise SystemExit('shot edit binding changed')
body=body.replace(old,new,1)
body=body.replace("$('#addShot').onclick=()=>{saveRows();d.shots.push(","$('#addShot').onclick=()=>{saveRows();scriptWorkflowInvalidate(d,'shots');d.shots.push(",1)
body=body.replace("$$('[data-delete-shot]',featureModal).forEach(b=>b.onclick=()=>{saveRows();d.shots=d.shots.filter", "$$('[data-delete-shot]',featureModal).forEach(b=>b.onclick=()=>{saveRows();scriptWorkflowInvalidate(d,'shots');d.shots=d.shots.filter",1)
body=body.replace("if(j>=0&&j<d.shots.length){[d.shots[i],d.shots[j]]", "if(j>=0&&j<d.shots.length){scriptWorkflowInvalidate(d,'shots');[d.shots[i],d.shots[j]]",1)
# Replace old synth/go-production cluster with staged actions.
cluster=re.compile(r"\$\('#synthesizePrompts'\)\.onclick=.*?\$\('#scriptProductionDashboard'\)\.onclick=",re.S)
m=cluster.search(body)
if not m: raise SystemExit('shot action cluster not found')
replacement="$('#confirmScriptShots').onclick=()=>{saveRows();if(!d.shots.length)return showToast('至少需要一个镜头');scriptWorkflowMark(d,'assets',{shotsConfirmed:true,promptsReady:false});saveState();openScriptEditor(n,'assets')};$('#scriptProductionDashboard').onclick="
body=body[:m.start()]+replacement+body[m.end():]
app=app[:a]+body+app[b:]

# Replace asset-tab binding entirely.
asset_bind=r'''if(tab==='assets'){
      const active=()=>scriptAssetLookup(d,d.ui?.activeAssetId);
      const invalidate=()=>{scriptWorkflowInvalidate(d,'assets');saveState()};
      const saveDrawer=()=>{const hit=active();if(!hit)return false;const {key,asset:a}=hit,meta=scriptAssetMeta(key),locked=meta.type!=='prop'&&projectAssetLockInfo(meta.type,a.name);if(locked)return false;const name=$('#drawerAssetName')?.value??a.name,description=$('#drawerAssetDescription')?.value??a.description,prompt=$('#drawerAssetPrompt')?.value??a.prompt,changed=name!==a.name||description!==a.description||prompt!==a.prompt;if(changed){a.name=name;a.description=description;a.prompt=prompt;a.revision=Number(a.revision||0)+1;a.updatedAt=new Date().toISOString();markScriptImpactedByAsset(d,a.id,'资产描述已修改');invalidate()}return true};
      $$('[data-open-script-asset]',featureModal).forEach(card=>card.onclick=()=>{d.ui=d.ui||{};d.ui.activeAssetId=card.dataset.openScriptAsset;saveState();rerender()});
      $('#closeScriptAssetDrawer')?.addEventListener('click',()=>{d.ui=d.ui||{};d.ui.activeAssetId='';saveState();rerender()});
      $$('[data-add-script-asset]',featureModal).forEach(b=>b.onclick=()=>{d.assets[b.dataset.addScriptAsset].push({id:uid('asset'),type:scriptAssetMeta(b.dataset.addScriptAsset).type,name:'新'+scriptAssetMeta(b.dataset.addScriptAsset).label,description:'',prompt:'',mediaUrl:'',nodeIds:[],versions:[],revision:0});d.ui=d.ui||{};d.ui.activeAssetId=d.assets[b.dataset.addScriptAsset].at(-1).id;invalidate();rerender()});
      $('#scriptAssetGlobalStyle')?.addEventListener('change',e=>{const value=e.target.value;d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};if(value!==d.globalStyle.text){d.globalStyle.text=value;d.globalStyle.revision=Number(d.globalStyle.revision||0)+1;d.globalStyle.updatedAt=new Date().toISOString();d.style=value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));scriptWorkflowInvalidate(d,'assets');saveState();rerender()}});
      $('#drawerAssetSave')?.addEventListener('click',()=>{if(saveDrawer()){showToast('资产已保存，相关镜头已标记待同步');rerender()}});
      $('#drawerAssetDelete')?.addEventListener('click',()=>{const hit=active();if(!hit)return;const {key,asset:a}=hit;if(!confirm(`删除资产“${a.name||'未命名资产'}”？已生成的画布图片不会删除。`))return;(d.shots||[]).forEach(s=>{if((s.assetRefs||[]).includes(a.id))markScriptShotDirty(s,'引用资产已删除')});d.assets[key]=d.assets[key].filter(x=>x.id!==a.id);d.ui.activeAssetId='';invalidate();rerender()});
      $('#drawerAssetOpenGlobal')?.addEventListener('click',()=>openProjectConsistencyCenter('all'));
      $('#drawerAssetUpload')?.addEventListener('click',()=>$('#drawerAssetFile')?.click());
      $('#drawerAssetFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0],hit=active();if(!file||!hit)return;try{saveDrawer();showToast('正在上传资产参考图…');const out=await uploadBlob(file,file.name||'script-asset.png');const img=createUploadedScriptAssetNode(n,hit.asset,hit.key,out.url);bindScriptAssetToNode(n,d,hit.key,hit.asset,img,{source:'upload'});render();showToast('参考图已上传并绑定');rerender()}catch(err){showToast('上传失败：'+errorText(err))}});
      $('#drawerAssetBindCanvas')?.addEventListener('click',()=>{const hit=active(),id=$('#drawerAssetCanvas')?.value,img=state.nodes.find(x=>x.id===id&&x.type==='image'&&x.outputUrl);if(!hit||!img)return showToast('请选择一张已有画布图片');saveDrawer();bindScriptAssetToNode(n,d,hit.key,hit.asset,img,{source:'canvas'});showToast('已绑定画布图片为资产参考');rerender()});
      $('#drawerAssetGenerate')?.addEventListener('click',async()=>{const hit=active();if(!hit)return;saveDrawer();n.assetProviderId=$('#assetGenProvider')?.value||n.assetProviderId;n.assetModelId=$('#assetGenModel')?.value||n.assetModelId;if(!n.assetProviderId||!n.assetModelId)return showToast('请先在资产页选择图片供应商和模型');const img=createScriptAssetNode(n,hit.asset,hit.key,0,true);try{showToast(`正在生成${scriptAssetMeta(hit.key).label}参考图…`);await generateForNode(img,{silent:true});showToast('资产参考图生成完成');d.ui.activeAssetId=hit.asset.id;saveState();openScriptEditor(n,'assets')}catch(err){showToast('资产图生成失败：'+errorText(err))}});
      $('#openProjectConsistencyFromAssets')?.addEventListener('click',()=>openProjectConsistencyCenter('all'));
      $('#assetGenProvider').onchange=()=>{n.assetProviderId=$('#assetGenProvider').value;n.assetModelId='';saveState();rerender()};$('#assetGenModel').onchange=()=>{n.assetModelId=$('#assetGenModel').value;saveState()};
      $('#generateAllAssets').onclick=()=>{n.assetProviderId=$('#assetGenProvider').value;n.assetModelId=$('#assetGenModel').value;if(!n.assetProviderId||!n.assetModelId)return showToast('请先选择图片供应商和模型');const all=[...d.assets.characters.map(a=>[a,'characters']),...d.assets.scenes.map(a=>[a,'scenes']),...d.assets.props.map(a=>[a,'props'])].filter(([a])=>!a.mediaUrl);if(!all.length)return showToast('所有资产都已经有参考图');const ids=all.map(([a,t],i)=>createScriptAssetNode(n,a,t,i*34,false).id);createGroup(ids,'缺失脚本资产生成器组','workflow');saveState();render();showToast(`已创建 ${ids.length} 个缺失资产生成器，请检查后整组执行`)};
      $('#confirmScriptAssets').onclick=()=>{saveDrawer();const stats=scriptWorkflowStats(d);scriptWorkflowMark(d,'prompts',{assetsReady:true,promptsReady:false});saveState();showToast(stats.assetsMissing?`资产已确认；仍有 ${stats.assetsMissing} 个资产没有参考图，可继续但一致性可能降低`:'资产已确认');openScriptEditor(n,'prompts')};
    }'''
app=replace_section_in_fn(app,'bindScriptTab',"if(tab==='assets'){","if(tab==='state'){",asset_bind)

# Prompt tab: enforce stages, keep readiness synced and route to batch.
a,b=fn_bounds(app,'bindScriptTab');body=app[a:b]
body=replace_once(body,"$('#scriptStyle').onchange=()=>{const value=$('#scriptStyle').value;","$('#scriptStyle').onchange=()=>{const value=$('#scriptStyle').value;",'prompt style marker')
body=body.replace("d.finalized=false;saveState()}}", "scriptWorkflowInvalidate(d,'prompts');saveState()}}",1)
body=body.replace("$('#synthesizeAgain').onclick=()=>{d.globalStyle", "$('#synthesizeAgain').onclick=()=>{if(!scriptWorkflowRequire(n,d,'batch')&&!d.workflow?.assetsReady)return;d.globalStyle",1)
# Above guard is intentionally corrected below to explicit shots/assets check.
body=body.replace("if(!scriptWorkflowRequire(n,d,'batch')&&!d.workflow?.assetsReady)return;", "if(!d.workflow?.shotsConfirmed)return showToast('请先完成第 1 步：确认镜头');if(!d.workflow?.assetsReady)return showToast('请先完成第 2 步：准备资产');",1)
body=body.replace("$('#aiSynthesizePrompts').onclick=()=>{d.globalStyle", "$('#aiSynthesizePrompts').onclick=()=>{if(!d.workflow?.shotsConfirmed)return showToast('请先完成第 1 步：确认镜头');if(!d.workflow?.assetsReady)return showToast('请先完成第 2 步：准备资产');d.globalStyle",1)
# Manual prompt changes recompute workflow readiness.
body=body.replace("s.imagePrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()", "s.imagePrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&String(x.videoPrompt||'').trim()&&!x.promptDirty);saveState()",1)
body=body.replace("s.videoPrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()", "s.videoPrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);d.workflow.promptsReady=(d.shots||[]).every(x=>String(x.imagePrompt||'').trim()&&String(x.videoPrompt||'').trim()&&!x.promptDirty);saveState()",1)
# Add route to batch after prompt card bindings.
needle="$$('[data-final-shot]',featureModal).forEach(card=>{const s=d.shots.find(x=>x.id===card.dataset.finalShot);"
if needle not in body: raise SystemExit('prompt card binding marker missing')
# add listener at end of prompt block, immediately before closing `}` followed by batch block.
end_marker="    }\n    if(tab==='batch'){"
pos=body.find(end_marker)
if pos<0: raise SystemExit('prompt block end missing')
insert="      $('#scriptPromptsToBatch')?.addEventListener('click',()=>{if(!scriptWorkflowRequire(n,d,'batch'))return;openScriptEditor(n,'batch-image')});\n"
body=body[:pos]+insert+body[pos:]
app=app[:a]+body+app[b:]

# AI prompt synthesis marks explicit workflow ready.
old="d.finalized=true;d.aiSynthesizedAt=new Date().toISOString();saveState();openScriptEditor(n,'prompts');showToast('AI 专业提示词已合成')"
new="d.finalized=true;d.aiSynthesizedAt=new Date().toISOString();scriptWorkflowMark(d,'ready',{promptsReady:true});saveState();openScriptEditor(n,'prompts');showToast('AI 专业提示词已合成')"
app=replace_once(app,old,new,'AI prompt workflow ready')

# AI breakdown stops at draft Shot confirmation; base prompts remain but final prompts are dirty.
old="d.finalized=false;synthesizeScriptPrompts(n);saveState();"
new="d.finalized=false;d.shots.forEach(s=>markScriptShotDirty(s,'AI 拆解完成，等待镜头与资产确认'));scriptWorkflowMark(d,'shots',{shotsConfirmed:false,assetsReady:false,promptsReady:false});saveState();"
# Scope to applyScriptBreakdownText only.
a,b=fn_bounds(app,'applyScriptBreakdownText');part=app[a:b]
if old not in part: raise SystemExit('breakdown final synthesis marker missing')
part=part.replace(old,new,1);app=app[:a]+part+app[b:]

# Generated asset result invalidates asset confirmation and prompt readiness.
a,b=fn_bounds(app,'syncGeneratedAssetResult');part=app[a:b]
old2="markScriptImpactedByAsset(sn.scriptData,a.id,'资产生成结果已更新');sn.scriptData.finalized=false"
new2="markScriptImpactedByAsset(sn.scriptData,a.id,'资产生成结果已更新');scriptWorkflowInvalidate(sn.scriptData,'assets')"
if old2 not in part: raise SystemExit('asset result impact marker missing')
part=part.replace(old2,new2,1);app=app[:a]+part+app[b:]

# Batch creation is hard-gated by 3 completed stages.
a,b=fn_bounds(app,'batchCreateFromScript');part=app[a:b]
marker="async function batchCreateFromScript(n,d,type,{autoRun=false}={}){"
if marker not in part: raise SystemExit('batch function marker missing')
part=part.replace(marker,marker+"if(!scriptWorkflowRequire(n,d,'batch'))return[];",1);app=app[:a]+part+app[b:]

APP.write_text(app,encoding='utf-8')

# Dedicated CSS, loaded separately to avoid destabilizing the giant legacy stylesheet.
css=r'''/* Script Workflow V2 · visible 3-stage production flow */
.script-workflow-head{min-height:72px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:18px;padding:10px 18px;border-bottom:1px solid #292e34;background:#111417}.script-workflow-steps{display:grid;grid-template-columns:auto 44px auto 44px auto;align-items:center;justify-content:center}.script-workflow-steps>em{width:44px;height:1px;background:#343a40}.script-step{min-width:190px;border:0;background:transparent;color:#777f88;display:flex;align-items:center;gap:10px;text-align:left;padding:7px 9px;border-radius:9px}.script-step:hover,.script-step.active{background:#202429;color:#eef1f4}.script-step i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;border:1px solid #4a5159;font-style:normal;font-size:10px}.script-step.done i{background:#eef1ef;color:#16191c;border-color:#eef1ef}.script-step span{display:flex;flex-direction:column;gap:3px}.script-step b{font-size:10px}.script-step small{font-size:8px;color:#747c85}.script-workflow-progress{font-size:8px;color:#89929b;white-space:nowrap}.script-secondary-tabs{height:38px;display:flex;align-items:center;justify-content:flex-end;gap:5px;padding:0 14px;border-bottom:1px solid #242a30;background:#14171a}.script-secondary-tabs button{height:26px;border:1px solid #30363e;background:#191d21;border-radius:6px;color:#858e98;padding:0 9px;font-size:8px}.script-secondary-tabs button.active,.script-secondary-tabs button:hover{color:#e8ecef;border-color:#4d565f;background:#22272c}.script-stage-intro{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 13px;margin-bottom:12px;border:1px solid #30363e;border-radius:9px;background:#171b1f}.script-stage-intro>div{display:flex;flex-direction:column;gap:4px}.script-stage-intro b{font-size:11px}.script-stage-intro span{font-size:8px;color:#7d858e}.script-stage-intro>i{font-style:normal;font-size:8px;color:#aab2ba;border:1px solid #363d45;border-radius:999px;padding:5px 9px}.script-stage-intro>i.done{color:#9ce2d2;border-color:#365b52;background:#172521}.script-assets-layout{display:grid;grid-template-columns:minmax(0,1fr);min-height:100%;position:relative}.script-assets-layout:has(.script-asset-drawer){grid-template-columns:minmax(0,1fr) 390px;gap:14px}.script-asset-toolbar.v2{display:grid;grid-template-columns:minmax(260px,1fr) 360px auto auto;gap:9px;align-items:end}.script-global-style{display:flex;flex-direction:column;gap:5px;color:#78818a}.script-global-style input{height:34px}.script-asset-grid.cards{grid-template-columns:repeat(4,minmax(0,1fr))}.script-asset-card{border:1px solid #30363e;background:#181c20;border-radius:10px;padding:8px;text-align:left;color:#d6dbe0;overflow:hidden}.script-asset-card:hover,.script-asset-card.active{border-color:#59666f;background:#1c2226}.script-asset-card .asset-preview{height:150px;position:relative;display:flex;align-items:center;justify-content:center;background-size:cover!important;background-position:center!important}.asset-missing{font-size:8px;color:#818b94;background:rgba(10,12,14,.65);padding:5px 7px;border-radius:5px}.asset-card-copy{padding:8px 2px 3px}.asset-card-copy b{display:block;font-size:10px;margin-bottom:5px}.asset-card-copy p{height:32px;margin:0 0 6px;color:#7d868f;font-size:8px;line-height:1.45;overflow:hidden}.asset-card-copy span{font-size:7px;color:#636d76}.script-asset-drawer{height:calc(96vh - 180px);position:sticky;top:0;border-left:1px solid #30363e;background:#15181c;box-shadow:-14px 0 28px rgba(0,0,0,.25);overflow:hidden}.script-asset-drawer>header{height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;border-bottom:1px solid #2a3036}.script-asset-drawer>header>div{display:flex;flex-direction:column;gap:2px}.script-asset-drawer header b{font-size:11px}.script-asset-drawer header small{font-size:7px;color:#68717a}.script-asset-drawer header button{width:28px;height:28px;border:1px solid #343b43;background:#20242a;border-radius:6px;color:#aeb5bd}.script-asset-drawer-scroll{height:calc(100% - 52px);overflow:auto;padding:12px}.script-asset-hero{height:230px;border:1px dashed #394149;border-radius:10px;background:#1b1f23 center/cover no-repeat;display:grid;place-items:center;color:#777f88;font-size:9px;margin-bottom:12px}.script-asset-hero.has-media{border-style:solid}.script-asset-drawer label{display:flex;flex-direction:column;gap:5px;margin-bottom:10px;color:#78818a;font-size:8px}.script-asset-drawer textarea{resize:vertical}.script-asset-drawer-meta{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 12px}.script-asset-drawer-meta span{border:1px solid #30363e;border-radius:999px;padding:4px 7px;color:#78818a;font-size:7px}.script-asset-ref-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.script-asset-ref-actions>button,.script-asset-drawer-actions button,.script-canvas-pick button{height:31px;border:1px solid #353b44;background:#20242a;border-radius:7px;color:#c7cdd5;font-size:8px}.script-canvas-pick{grid-column:1/-1;display:grid;grid-template-columns:1fr 92px;gap:7px}.script-canvas-pick select{height:31px}.script-asset-drawer-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px;padding-top:12px;border-top:1px solid #2a3036}.script-asset-drawer-actions button.primary{background:#e5ebe8;color:#111719;border-color:#e5ebe8}.script-asset-lock-note{padding:8px 9px;margin-bottom:10px;border:1px solid #5b4d2c;background:#241f14;border-radius:7px;color:#d8bc78;font-size:8px}.script-asset-warning{font-size:8px;color:#8b949d}.script-bottom-actions button.primary{background:#e5ebe8!important;color:#111719!important;border-color:#e5ebe8!important;font-weight:700}@media(max-width:1100px){.script-workflow-head{grid-template-columns:1fr}.script-workflow-progress{text-align:center}.script-workflow-steps{grid-template-columns:1fr}.script-workflow-steps>em{display:none}.script-step{min-width:0}.script-assets-layout:has(.script-asset-drawer){grid-template-columns:1fr}.script-asset-drawer{position:fixed;right:10px;top:80px;width:min(390px,92vw);height:calc(100vh - 100px);z-index:3;border:1px solid #363d45;border-radius:12px}.script-asset-toolbar.v2{grid-template-columns:1fr 1fr}.script-asset-grid.cards{grid-template-columns:repeat(2,1fr)}}
'''
style=ROOT/'styles/script-workflow-v2.css';style.write_text(css,encoding='utf-8')

boot=BOOT.read_text(encoding='utf-8')
old="loadStyle(`./styles/video-result-autofit-v1.css?v=${v}`)"
if old not in boot: raise SystemExit('bootstrap style marker missing')
boot=boot.replace(old,old+",loadStyle(`./styles/script-workflow-v2.css?v=${v}`)",1)
BOOT.write_text(boot,encoding='utf-8')

# Source-level regression tests for the visible product flow.
test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-workflow-v2.css',import.meta.url),'utf8');

test('script editor exposes the three required primary production stages',()=>{
  assert.match(app,/确认镜头/);assert.match(app,/准备资产/);assert.match(app,/合成提示词/);assert.match(app,/scriptWorkflowRequire/);assert.match(app,/shotsConfirmed/);assert.match(app,/assetsReady/);assert.match(app,/promptsReady/);
});

test('AI breakdown stops for human shot review instead of auto-finalizing production prompts',()=>{
  assert.match(app,/AI 拆解完成，等待镜头与资产确认/);assert.match(app,/scriptWorkflowMark\(d,'shots',\{shotsConfirmed:false,assetsReady:false,promptsReady:false\}\)/);
});

test('asset management uses a right drawer with AI upload and canvas reference sources',()=>{
  for(const text of ['script-asset-drawer','AI 生成参考图','上传参考图','从画布选择图片','设为参考'])assert.match(app,new RegExp(text));
  assert.match(css,/\.script-asset-drawer/);assert.match(app,/uploadBlob\(file/);assert.match(app,/bindScriptAssetToNode/);
});

test('batch asset creation only targets missing visual assets and paid batch remains gated',()=>{
  assert.match(app,/filter\(\(\[a\]\)=>!a\.mediaUrl\)/);assert.match(app,/缺失资产生成器/);assert.match(app,/if\(!scriptWorkflowRequire\(n,d,'batch'\)\)return\[\]/);
});

test('asset result updates invalidate approval but do not trigger paid media reruns',()=>{
  assert.match(app,/资产生成结果已更新/);assert.match(app,/scriptWorkflowInvalidate\(sn\.scriptData,'assets'\)/);assert.doesNotMatch(app,/资产生成结果已更新[^\n]{0,200}executeWorkflowIds/);
});
'''
(ROOT/'tests/script-workflow-v2.test.mjs').write_text(test,encoding='utf-8')
print('Script Workflow V2 patch prepared')
