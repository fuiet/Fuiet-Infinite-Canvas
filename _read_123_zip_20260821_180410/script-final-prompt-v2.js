/* Fuiet Script · Final Prompt Workflow V2
 * Adds the production-facing final-prompt layer without duplicating script state.
 * Prompt results are committed through the existing script editor controls so the
 * in-memory state, IndexedDB persistence, dirty tracking and batch generator stay
 * on the same source of truth.
 */
(()=>{
'use strict';

const manager=globalThis.CanvasBrowserStorageManager;
const Core=globalThis.FuietScriptWorkflowCore;
const featureModal=document.querySelector('#featureModal');
if(!manager||!featureModal)return;

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const text=v=>String(v??'');
const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const runningShots=new Set();
let bulkRunning=false;
let decorating=false;
let promptOverlay=null;

function stateSnapshot(){
  try{return JSON.parse(manager.getItem('libtv-clone-state')||'{}')||{}}
  catch{return{}}
}
function allVisibleShotIds(){return [...featureModal.querySelectorAll('[data-shot-row],[data-final-shot]')].map(el=>el.dataset.shotRow||el.dataset.finalShot).filter(Boolean)}
function findScriptNodeByShot(shotId){
  const state=stateSnapshot();
  const node=(state.nodes||[]).find(n=>n?.type==='script'&&(n.scriptData?.shots||[]).some(s=>String(s.id)===String(shotId)));
  return node?{state,node}:null;
}
function findCurrentScriptNode(){
  const ids=allVisibleShotIds();
  for(const id of ids){const hit=findScriptNodeByShot(id);if(hit)return hit}
  return null;
}
function assetCatalog(data){
  return[
    ...(data?.assets?.characters||[]).map(a=>({...a,assetType:'character'})),
    ...(data?.assets?.scenes||[]).map(a=>({...a,assetType:'scene'})),
    ...(data?.assets?.props||[]).map(a=>({...a,assetType:'prop'}))
  ];
}
function matchedAssets(data,shot){
  const cat=assetCatalog(data),blob=[shot?.characters,shot?.scene,shot?.props,shot?.action,shot?.dialogue].filter(Boolean).join(' '),ids=new Set(Array.isArray(shot?.assetRefs)?shot.assetRefs:[]);
  cat.forEach(a=>{if(a?.id&&a?.name&&blob.includes(a.name))ids.add(a.id)});
  return [...ids].map(id=>cat.find(a=>String(a.id)===String(id))).filter(Boolean);
}
function shotSummary(shot){
  if(!shot)return null;
  return{id:shot.id,no:shot.no,shotSize:shot.shotSize,duration:Number(shot.duration||0),scene:shot.scene,action:shot.action,dialogue:shot.dialogue,cameraMovement:shot.cameraMovement};
}
function shotContext(shotId){
  const hit=findScriptNodeByShot(shotId);if(!hit)return null;
  const data=clone(hit.node.scriptData||{});try{Core?.normalizeScriptData?.(data)}catch{}
  const index=(data.shots||[]).findIndex(s=>String(s.id)===String(shotId));if(index<0)return null;
  const shot=data.shots[index],assets=matchedAssets(data,shot);
  return{
    state:hit.state,node:hit.node,data,shot,index,assets,
    previous:shotSummary(data.shots[index-1]),
    next:shotSummary(data.shots[index+1]),
    style:text(data.globalStyle?.text||data.style)
  };
}
function promptStatus(shot){
  if(!shot)return{key:'pending',label:'待生成提示词'};
  if(runningShots.has(String(shot.id)))return{key:'generating',label:'合成中…'};
  if(shot.promptStatus==='error')return{key:'error',label:'合成失败'};
  if(shot.promptDirty||shot.promptStatus==='dirty')return{key:'dirty',label:'需要重新合成'};
  if(text(shot.imagePrompt).trim()&&text(shot.videoPrompt).trim())return{key:'ready',label:'查看提示词'};
  return{key:'pending',label:'待生成提示词'};
}
function readyCount(data){return(data?.shots||[]).filter(s=>promptStatus(s).key==='ready').length}

function ruleCompose(ctx){
  const {shot,assets,style}=ctx;
  const assetDetail=assets.map(a=>`@${a.name}（${text(a.prompt||a.description||'保持既定资产外观与身份一致')}）`).join('；');
  const image=[
    `${shot.shotSize||'中景'}，${Number(shot.duration||3)}秒镜头对应的关键画面`,
    shot.action&&`画面主体与动作瞬间：${shot.action}`,
    shot.scene&&`场景：${shot.scene}`,
    assetDetail&&`一致性资产：${assetDetail}`,
    shot.lighting&&`光影氛围：${shot.lighting}`,
    style&&`整体视觉风格：${style}`,
    '保持人物身份、服装、场景结构与道具外观和已确认资产一致；只描述当前画面可见信息，不凭空增加人物或物体'
  ].filter(Boolean).join('。')+'。';
  const video=[
    `时长约 ${Number(shot.duration||3)} 秒`,
    shot.action&&`主体动作：${shot.action}`,
    shot.cameraMovement&&`摄影机运动：${shot.cameraMovement}`,
    shot.lighting&&`环境与光影保持：${shot.lighting}`,
    shot.sound&&`声音节奏参考：${shot.sound}`,
    shot.dialogue&&`对白节奏参考：${shot.dialogue}`,
    assets.length&&`全程保持 ${assets.map(a=>'@'+a.name).join('、')} 的外观、比例和空间连续性`,
    style&&`视觉风格保持：${style}`,
    '动作连续自然，运动幅度符合镜头叙事，不改变既定剧情事实，不新增主体或突发动作'
  ].filter(Boolean).join('。')+'。';
  return{imagePrompt:image,videoPrompt:video};
}

async function apiJson(url,options={}){
  const res=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(text(body?.error||body?.message||`HTTP ${res.status}`));
  return body;
}
function extractJson(value){
  const raw=text(value).trim();
  for(const candidate of [raw,...[...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1])]){
    try{return JSON.parse(candidate)}catch{}
    const a=candidate.indexOf('{'),b=candidate.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(candidate.slice(a,b+1))}catch{}
  }
  return null;
}
async function waitTask(id,onProgress){
  let info=null;
  for(let i=0;i<420;i++){
    await sleep(700);
    info=(await apiJson('/api/tasks/'+encodeURIComponent(id))).task||null;
    try{onProgress?.(info)}catch{}
    if(['succeeded','failed','canceled'].includes(text(info?.status)))break;
  }
  if(!info)throw new Error('未获取到提示词合成任务状态');
  if(info.status!=='succeeded')throw new Error(text(info.error||info.lastError||'提示词合成失败'));
  return info;
}
async function selectedTextRuntime(node){
  const pid=text(node?.scriptProviderId),mid=text(node?.scriptModelId);
  if(!pid||!mid)throw new Error('请先在脚本节点选择文本 API 供应商和模型');
  const providers=(await apiJson('/api/providers')).providers||[];
  const provider=providers.find(p=>String(p.id)===pid);if(!provider)throw new Error('当前文本 API 供应商不存在，请重新选择');
  const model=(provider.models||[]).find(m=>String(m.id)===mid);if(!model)throw new Error('当前文本模型不存在，请重新选择');
  return{provider,model,pid,mid};
}
function singleAiPrompt(ctx){
  const payload={
    globalStyle:ctx.style,
    currentShot:{
      id:ctx.shot.id,no:ctx.shot.no,duration:ctx.shot.duration,shotSize:ctx.shot.shotSize,
      scene:ctx.shot.scene,characters:ctx.shot.characters,props:ctx.shot.props,
      action:ctx.shot.action,lighting:ctx.shot.lighting,dialogue:ctx.shot.dialogue,
      sound:ctx.shot.sound,cameraMovement:ctx.shot.cameraMovement
    },
    associatedAssets:ctx.assets.map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),
    continuityContext:{previousShot:ctx.previous,nextShot:ctx.next}
  };
  return `你是专业 AI 影视最终提示词编译器。请只为 currentShot 生成两份彼此职责明确的最终提示词，并严格依据输入，不得改写剧情事实、人物身份、资产外观或凭空增加主体。\n\nimagePrompt 用于分镜图/首帧生成，回答“这一帧长什么样”：重点写可见主体、外观与资产一致性、动作瞬间、场景和道具、构图、景别、摄影机位置、光影氛围、材质和整体视觉风格。不要把对白、音效、连续运动过程当成主要内容。\n\nvideoPrompt 用于视频运动生成，回答“这一帧接下来怎么动”：重点写时长、主体动作的时间顺序、摄影机运动、环境动态、动作节奏、连续性和稳定性约束。对白/音效只能作为节奏参考，不要重复堆砌静态画面形容词。\n\n资产名称需要时使用 @资产名。previousShot / nextShot 只用于理解上下文与指代，最终只描述 currentShot。\n\n必须只返回合法 JSON，不要 Markdown，不要解释：{"imagePrompt":"...","videoPrompt":"..."}\n\n输入：${JSON.stringify(payload)}`;
}
async function aiComposeSingle(ctx,onProgress){
  const runtime=await selectedTextRuntime(ctx.node),prompt=singleAiPrompt(ctx);
  const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({
    providerId:runtime.pid,modelId:runtime.mid,providerSnapshot:runtime.provider,modelSnapshot:runtime.model,nodeType:'text',prompt,references:[],
    maxRetries:Number(ctx.state?.workflowSettings?.maxRetries??1),
    parameters:{operation:'prompt_synthesis_single',responseFormat:'json_object'}
  })});
  const info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,onProgress);
  const parsed=extractJson(info.output?.value??info.output?.text??info.output?.url??'');
  if(!text(parsed?.imagePrompt).trim()||!text(parsed?.videoPrompt).trim())throw new Error('模型没有返回完整的 imagePrompt / videoPrompt JSON');
  return{imagePrompt:text(parsed.imagePrompt).trim(),videoPrompt:text(parsed.videoPrompt).trim()};
}
function batchAiPrompt(node,data){
  const cat=assetCatalog(data);
  const shots=(data.shots||[]).map((shot,index)=>{
    const assets=matchedAssets(data,shot);
    return{
      id:shot.id,no:shot.no,duration:shot.duration,shotSize:shot.shotSize,scene:shot.scene,characters:shot.characters,props:shot.props,
      action:shot.action,lighting:shot.lighting,dialogue:shot.dialogue,sound:shot.sound,cameraMovement:shot.cameraMovement,
      associatedAssets:assets.map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),
      previousShot:shotSummary(data.shots[index-1]),nextShot:shotSummary(data.shots[index+1])
    };
  });
  const payload={globalStyle:text(data.globalStyle?.text||data.style),assets:cat.map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),shots};
  return `你是专业 AI 影视最终提示词编译器。为输入中的每个 shot 分别生成 imagePrompt 和 videoPrompt。\nimagePrompt 只负责“这一帧长什么样”：主体外观与资产一致性、动作瞬间、场景道具、构图景别、机位、光影和整体风格。\nvideoPrompt 只负责“接下来怎么动”：时长、动作时间顺序、运镜、环境运动、节奏、连续性和稳定性。\n不得改变剧本事实，不得新增人物/道具；前后镜头只用于上下文理解；引用资产时使用 @资产名。\n必须只返回合法 JSON，不要 Markdown：{"shots":[{"id":"原 shot id","imagePrompt":"...","videoPrompt":"..."}]}\n输入：${JSON.stringify(payload)}`;
}
async function aiComposeAll(context,onProgress){
  const runtime=await selectedTextRuntime(context.node),prompt=batchAiPrompt(context.node,context.data);
  const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({
    providerId:runtime.pid,modelId:runtime.mid,providerSnapshot:runtime.provider,modelSnapshot:runtime.model,nodeType:'text',prompt,references:[],
    maxRetries:Number(context.state?.workflowSettings?.maxRetries??1),
    parameters:{operation:'prompt_synthesis_batch',responseFormat:'json_object'}
  })});
  const info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,onProgress),parsed=extractJson(info.output?.value??info.output?.text??'');
  if(!Array.isArray(parsed?.shots))throw new Error('模型没有返回 shots JSON');
  return parsed.shots.filter(x=>x?.id&&text(x.imagePrompt).trim()&&text(x.videoPrompt).trim()).map(x=>({id:String(x.id),imagePrompt:text(x.imagePrompt).trim(),videoPrompt:text(x.videoPrompt).trim()}));
}

async function waitFor(selector,root=featureModal,timeout=2500){
  const start=Date.now();while(Date.now()-start<timeout){const el=root.querySelector(selector);if(el)return el;await sleep(30)}return null;
}
async function switchToPromptTab(){
  const active=featureModal.querySelector('[data-script-tab].active')?.dataset.scriptTab||'';
  if(active!=='prompts')featureModal.querySelector('[data-script-tab="prompts"]')?.click();
  await waitFor('.final-prompt-list',featureModal,3000);
  return active;
}
async function commitPromptResults(results,{restoreTab=''}={}){
  if(!results?.length)return;
  const previous=restoreTab||await switchToPromptTab();
  if(previous==='prompts')await waitFor('.final-prompt-list',featureModal,2500);
  for(const result of results){
    const card=await waitFor(`[data-final-shot="${CSS.escape(String(result.id))}"]`,featureModal,2500);if(!card)continue;
    const image=card.querySelector('[data-final-image]'),video=card.querySelector('[data-final-video]');
    if(image){image.value=result.imagePrompt;image.dispatchEvent(new Event('change',{bubbles:true}))}
    if(video){video.value=result.videoPrompt;video.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  if(previous&&previous!=='prompts'){
    await sleep(30);featureModal.querySelector(`[data-script-tab="${CSS.escape(previous)}"]`)?.click();
  }
}

function toast(message,error=false){
  const host=document.querySelector('#toast');if(!host)return;
  host.textContent=message;host.classList.remove('hidden');host.classList.toggle('error',Boolean(error));
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>host.classList.add('hidden'),3200);
}
function closePromptOverlay(){promptOverlay?.remove();promptOverlay=null}
function promptArea(label,value,generated){
  return `<section class="fpv2-section"><header><b>${esc(label)}</b>${generated?'<span class="fpv2-ready">✓ 已生成</span>':'<span>自动保存</span>'}</header><textarea readonly placeholder="点击立即合成提示词，AI 将根据当前镜头、关联资产与整体风格生成。">${esc(value||'')}</textarea></section>`;
}
function openPromptOverlay(shotId){
  closePromptOverlay();const ctx=shotContext(shotId);if(!ctx)return toast('没有找到这个镜头的数据',true);
  const status=promptStatus(ctx.shot),generated=status.key==='ready',needsAction=!generated||status.key==='dirty'||status.key==='error';
  const overlay=document.createElement('div');overlay.className='fpv2-overlay';overlay.innerHTML=`<div class="fpv2-dialog" role="dialog" aria-modal="true"><header class="fpv2-title"><b>第 ${Number(ctx.shot.no||ctx.index+1)} 镜：最终提示词</b><button type="button" data-fpv2-close aria-label="关闭">×</button></header><div class="fpv2-body">${promptArea('分镜提示词',ctx.shot.imagePrompt,Boolean(ctx.shot.imagePrompt))}${promptArea('视频运动提示词',ctx.shot.videoPrompt,Boolean(ctx.shot.videoPrompt))}</div><footer><div class="fpv2-modes"><label><input type="radio" name="fpv2-mode" value="ai" checked> 智能合成</label><label><input type="radio" name="fpv2-mode" value="rule"> 自动拼接</label></div><span class="fpv2-progress"></span><button type="button" class="primary fpv2-run">${generated?'重新合成提示词':'立即合成提示词'}</button></footer></div>`;
  document.body.appendChild(overlay);promptOverlay=overlay;
  overlay.querySelector('[data-fpv2-close]').onclick=closePromptOverlay;overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)closePromptOverlay()});
  const run=overlay.querySelector('.fpv2-run'),progress=overlay.querySelector('.fpv2-progress');
  run.onclick=async()=>{
    const mode=overlay.querySelector('input[name="fpv2-mode"]:checked')?.value||'ai';run.disabled=true;progress.textContent=mode==='ai'?'正在综合镜头、资产和整体风格…':'正在按规则合成…';runningShots.add(String(shotId));decorateSoon();
    try{
      const fresh=shotContext(shotId);if(!fresh)throw new Error('镜头数据已变化，请重新打开');
      const result=mode==='ai'?await aiComposeSingle(fresh,info=>{progress.textContent=`AI 合成中 · ${Math.max(1,Math.round(Number(info?.progress||0)))}%`}):ruleCompose(fresh);
      await commitPromptResults([{id:shotId,...result}]);runningShots.delete(String(shotId));toast(`第 ${fresh.shot.no} 镜最终提示词已合成`);closePromptOverlay();decorateSoon();
    }catch(error){runningShots.delete(String(shotId));progress.textContent=text(error.message||error);run.disabled=false;toast('提示词合成失败：'+text(error.message||error),true);decorateSoon()}
  };
}

async function runBulkAi(){
  if(bulkRunning)return;const hit=findCurrentScriptNode();if(!hit)return toast('没有找到当前脚本节点',true);
  const data=clone(hit.node.scriptData||{});try{Core?.normalizeScriptData?.(data)}catch{}
  if(!(data.shots||[]).length)return toast('当前没有镜头',true);
  bulkRunning=true;(data.shots||[]).forEach(s=>runningShots.add(String(s.id)));decorateSoon();
  const btn=featureModal.querySelector('#fpv2BulkCompose');if(btn){btn.disabled=true;btn.textContent='正在合成 0/'+data.shots.length}
  try{
    const results=await aiComposeAll({state:hit.state,node:hit.node,data},info=>{const b=featureModal.querySelector('#fpv2BulkCompose');if(b)b.textContent=`AI 合成中 ${Math.max(1,Math.round(Number(info?.progress||0)))}%`});
    if(results.length!==data.shots.length)throw new Error(`模型只返回了 ${results.length}/${data.shots.length} 个完整镜头结果`);
    await commitPromptResults(results);
    toast(`已合成 ${results.length} 个镜头的最终提示词`);
  }catch(error){toast('批量合成失败：'+text(error.message||error),true)}finally{
    (data.shots||[]).forEach(s=>runningShots.delete(String(s.id)));bulkRunning=false;decorateSoon();
  }
}

function compactPromptTable(node,data){
  const rows=(data.shots||[]).map(shot=>{const st=promptStatus(shot),assets=matchedAssets(data,shot).map(a=>'@'+a.name).join('、')||'无显式资产';return `<tr><td>${Number(shot.no||0)}</td><td>${Number(shot.duration||0)}s</td><td><div class="fpv2-shot-copy">${esc(shot.action||'未填写画面描述')}</div><small>${esc(assets)}</small></td><td><button type="button" class="fpv2-status ${st.key}" data-fpv2-shot="${esc(shot.id)}">${esc(st.label)}</button></td></tr>`}).join('');
  return `<div class="fpv2-compose-summary"><div><b>最终提示词</b><span>${readyCount(data)}/${data.shots.length} 提示词已完成</span></div><button type="button" id="fpv2BulkCompose" class="primary" ${bulkRunning?'disabled':''}>${bulkRunning?'正在合成…':'一键合成全部提示词'}</button></div><div class="fpv2-table-wrap"><table class="fpv2-table"><thead><tr><th>镜号</th><th>时长</th><th>镜头与关联资产</th><th>最终提示词</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function decorateShotTable(){
  const rows=[...featureModal.querySelectorAll('tr[data-shot-row]')];if(!rows.length)return;
  const hit=findCurrentScriptNode();if(!hit)return;const data=hit.node.scriptData||{};
  rows.forEach(row=>{
    const id=row.dataset.shotRow,shot=(data.shots||[]).find(s=>String(s.id)===String(id)),cell=row.querySelector('.shot-final-prompt-column');if(!shot||!cell)return;
    const st=promptStatus(shot);cell.innerHTML=`<button type="button" class="fpv2-status ${st.key}" data-fpv2-shot="${esc(id)}">${esc(st.label)}</button>`;
  });
}
function decoratePromptTab(){
  const source=featureModal.querySelector('.final-prompt-list');if(!source)return;
  const hit=findCurrentScriptNode();if(!hit)return;const data=hit.node.scriptData||{};
  source.classList.add('fpv2-source-list');source.querySelectorAll('textarea').forEach(x=>x.readOnly=true);
  let shell=featureModal.querySelector('.fpv2-prompt-tab');if(!shell){shell=document.createElement('div');shell.className='fpv2-prompt-tab';source.before(shell)}
  shell.innerHTML=compactPromptTable(hit.node,data);
  const oldHead=featureModal.querySelector('.prompt-compose-head');oldHead?.classList.add('fpv2-old-compose-head');
  shell.querySelector('#fpv2BulkCompose')?.addEventListener('click',runBulkAi);
}
function bindStatusButtons(){featureModal.querySelectorAll('[data-fpv2-shot]').forEach(btn=>{if(btn.dataset.fpv2Bound)return;btn.dataset.fpv2Bound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPromptOverlay(btn.dataset.fpv2Shot)})})}
function decorate(){
  if(decorating||featureModal.classList.contains('hidden'))return;decorating=true;
  try{decorateShotTable();decoratePromptTab();bindStatusButtons()}finally{decorating=false}
}
let decorateTimer=0;function decorateSoon(){clearTimeout(decorateTimer);decorateTimer=setTimeout(decorate,20)}
const observer=new MutationObserver(decorateSoon);observer.observe(featureModal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
featureModal.addEventListener('click',e=>{if(e.target.closest('[data-script-tab]'))setTimeout(decorate,30)},true);
decorateSoon();

globalThis.FuietFinalPromptWorkflowV2=Object.freeze({version:2,openPrompt:openPromptOverlay,ruleCompose,shotContext,runBulkAi});
})();
