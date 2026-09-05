/* Script Studio · Final Prompt Composer V1
 * Step 3 enhancement: compact shot table, per-shot prompt modal, AI synthesis,
 * rule-based fallback, source fingerprint invalidation and batch progress.
 * The existing app.js remains the persistence authority for prompt text; this
 * module binds to its native textarea/change handlers instead of duplicating
 * script state writes.
 */
(()=>{
'use strict';
const featureModal=document.querySelector('#featureModal');
if(!featureModal)return;

const STORAGE_KEY='libtv-clone-state';
const PROVIDERS_KEY='canvas-studio-providers-v1';
const META_KEY='canvas-script-final-prompt-meta-v1';
const COMPOSER_ID='scriptFinalPromptComposerV1';
const MODAL_ID='scriptFinalPromptModalV1';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const storage=()=>globalThis.CanvasBrowserStorageManager||globalThis.localStorage||null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v??null));

function readJson(key,fallback){try{const raw=storage()?.getItem?.(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeJson(key,value){try{storage()?.setItem?.(key,JSON.stringify(value))}catch{}}
function toast(message){const el=document.querySelector('#toast');if(!el)return;el.textContent=String(message||'');el.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.add('hidden'),3600)}
function now(){return new Date().toISOString()}
function text(v){return String(v??'').trim()}
function list(v){if(Array.isArray(v))return v.map(text).filter(Boolean);return text(v).split(/[、,，]/).map(text).filter(Boolean)}

function nativePromptArticles(){return [...featureModal.querySelectorAll('[data-final-shot]')]}
function isPromptStage(){return Boolean(featureModal.querySelector('.final-prompt-list')&&featureModal.querySelector('[data-final-shot]'))}
function currentState(){return readJson(STORAGE_KEY,{nodes:[],workflowSettings:{}})||{nodes:[],workflowSettings:{}}}
function currentScriptContext(){
  const shotIds=nativePromptArticles().map(x=>String(x.dataset.finalShot||'')).filter(Boolean);
  if(!shotIds.length)return null;
  const state=currentState(),nodes=Array.isArray(state.nodes)?state.nodes:[];
  const selectedIds=new Set(Array.isArray(state.selectedIds)?state.selectedIds:[]);
  const candidates=nodes.filter(n=>n?.type==='script'&&Array.isArray(n?.scriptData?.shots)&&n.scriptData.shots.some(s=>shotIds.includes(String(s.id||''))));
  const node=candidates.find(n=>n.selected||selectedIds.has(n.id))||candidates[0];
  return node?{state,node,data:node.scriptData,shotIds}:null;
}
function catalog(data){return [...(data?.assets?.characters||[]),...(data?.assets?.scenes||[]),...(data?.assets?.props||[])].filter(Boolean)}
function shotAssets(data,shot){
  const cat=catalog(data),refs=new Set(Array.isArray(shot?.assetRefs)?shot.assetRefs:[]),names=new Set([...list(shot?.characters),...list(shot?.scene),...list(shot?.props)]);
  return cat.filter(a=>refs.has(a.id)||names.has(text(a.name)));
}
function shotNeighbor(data,shot,offset){const shots=data?.shots||[],i=shots.findIndex(x=>String(x.id)===String(shot?.id));return i<0?null:shots[i+offset]||null}
function sourceObject(ctx,shot){
  const d=ctx.data,assets=shotAssets(d,shot);
  const serializeShot=s=>s?{id:s.id,no:s.no,scene:s.scene,characters:s.characters,props:s.props,shotSize:s.shotSize,lighting:s.lighting,action:s.action,dialogue:s.dialogue,sound:s.sound,cameraMovement:s.cameraMovement,duration:s.duration}:null;
  return{
    shot:serializeShot(shot),
    previous:serializeShot(shotNeighbor(d,shot,-1)),
    next:serializeShot(shotNeighbor(d,shot,1)),
    assets:assets.map(a=>({id:a.id,type:a.type,name:a.name,description:a.description,prompt:a.prompt,revision:Number(a.revision||0),mediaUrl:a.mediaUrl||''})),
    style:{text:d?.globalStyle?.text??d?.style??'',revision:Number(d?.globalStyle?.revision||0)}
  };
}
function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
}
function hash(value){let h=2166136261,s=stableStringify(value);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
function sourceFingerprint(ctx,shot){return hash(sourceObject(ctx,shot))}

function metaMap(){const value=readJson(META_KEY,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function metaKey(ctx,shot){return `${ctx.node.id}:${shot.id}`}
function shotMeta(ctx,shot){return metaMap()[metaKey(ctx,shot)]||{}}
function setShotMeta(ctx,shot,patch){const map=metaMap(),key=metaKey(ctx,shot);map[key]={...(map[key]||{}),...patch,updatedAt:now()};writeJson(META_KEY,map);return map[key]}

function nativeArticle(shotId){return featureModal.querySelector(`[data-final-shot="${CSS.escape(String(shotId||''))}"]`)}
function nativeValue(shotId,type){const article=nativeArticle(shotId),sel=type==='video'?'[data-final-video]':'[data-final-image]';return String(article?.querySelector(sel)?.value||'')}
function setNativeValue(shotId,type,value){
  const article=nativeArticle(shotId),sel=type==='video'?'[data-final-video]':'[data-final-image]',el=article?.querySelector(sel);if(!el)return false;
  el.value=String(value||'');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;
}
function statusFor(ctx,shot){
  const meta=shotMeta(ctx,shot),image=nativeValue(shot.id,'image')||text(shot.imagePrompt),video=nativeValue(shot.id,'video')||text(shot.videoPrompt),fp=sourceFingerprint(ctx,shot);
  if(meta.status==='generating')return{key:'generating',label:'合成中…'};
  if(meta.status==='failed')return{key:'failed',label:'合成失败'};
  if((image||video)&&(shot.promptDirty||meta.fingerprint&&meta.fingerprint!==fp))return{key:'outdated',label:'需要重新合成'};
  if(image&&video)return{key:'ready',label:'查看提示词'};
  return{key:'pending',label:'待生成提示词'};
}
function completedCount(ctx){return (ctx.data.shots||[]).filter(s=>statusFor(ctx,s).key==='ready').length}

function providerContext(ctx){
  const pid=text(ctx.node.scriptProviderId),mid=text(ctx.node.scriptModelId),providers=readJson(PROVIDERS_KEY,[]),provider=(Array.isArray(providers)?providers:[]).find(p=>String(p?.id||'')===pid),model=provider?.models?.find(m=>String(m?.id||'')===mid);
  return{pid,mid,provider,model};
}
function safeProviderSnapshot(provider){
  if(!provider)return undefined;const out=clone(provider);delete out.apiKey;delete out.apiKeyEncrypted;return out;
}
async function apiJson(path,options={}){
  const res=await fetch(path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});let data=null;try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data?.error||data?.message||`HTTP ${res.status}`);return data||{};
}
async function waitTask(taskId,loops=420){
  let info=null;for(let i=0;i<loops;i++){await sleep(700);const result=await apiJson('/api/tasks/'+encodeURIComponent(taskId),{method:'GET'});info=result.task||result;if(['succeeded','failed','canceled'].includes(String(info?.status||'')))return info}return info;
}
function extractJson(raw){
  const value=String(raw||'').trim(),candidates=[...value.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1]);candidates.push(value);
  for(const x of candidates){try{return JSON.parse(x)}catch{}const a=x.indexOf('{'),b=x.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(x.slice(a,b+1))}catch{}}
  return null;
}
function aiInstruction(ctx,shot){
  const source=sourceObject(ctx,shot);
  return `你是专业 AI 影视最终提示词编译器。只为当前 shot 生成两份互相分工、可直接用于生成器的中文提示词。\n\n必须只返回合法 JSON：{"imagePrompt":"...","videoPrompt":"..."}，不要 Markdown，不要解释。\n\n规则：\n1. imagePrompt 只回答“这一帧长什么样”：主体身份与外观、当前动作瞬间、场景与道具、构图、景别、摄影机位置、光影、氛围、整体视觉风格和一致性约束。不要把对白、音效、连续运动步骤当成画面主体描述。\n2. videoPrompt 只回答“这一帧接下来怎么动”：明确 ${Number(shot.duration||3)} 秒时长，主体动作的时间顺序、摄影机运动、环境动态、节奏与稳定性/连续性约束；必要时可保留对白或声音信息，但不要大段重复 imagePrompt 的静态美术描述。\n3. 当前 shot 关联资产必须使用其详细设定保持角色、场景、道具一致；涉及资产时保留 @资产名。\n4. 使用上一镜和下一镜只帮助理解指代、动作承接和空间连续性，绝不能把相邻镜头的事件塞进当前镜头。\n5. 不增加剧本没有的重要人物、道具、剧情或镜头事实。\n6. 若素材信息冲突，以当前 shot 明确信息优先，其次资产设定，再其次全局风格。\n\n输入数据：${JSON.stringify(source)}`;
}
async function smartSynthesize(ctx,shot){
  const pc=providerContext(ctx);if(!pc.pid||!pc.mid)throw new Error('请先在「确认镜头」中选择文本 API 供应商和模型');
  setShotMeta(ctx,shot,{status:'generating',error:'',mode:'smart',fingerprint:sourceFingerprint(ctx,shot)});refreshComposer();syncOpenModal();
  try{
    const body={providerId:pc.pid,modelId:pc.mid,nodeType:'text',prompt:aiInstruction(ctx,shot),references:[],maxRetries:Number(ctx.state?.workflowSettings?.maxRetries??2),parameters:{operation:'final_prompt_synthesis',responseFormat:'json_object'}};
    if(pc.provider)body.providerSnapshot=safeProviderSnapshot(pc.provider);if(pc.model)body.modelSnapshot=clone(pc.model);
    const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify(body)}),taskId=created?.task?.id||created?.id;if(!taskId)throw new Error('提示词任务未返回 task id');
    const info=await waitTask(taskId);if(String(info?.status)!=='succeeded')throw new Error(info?.error||'提示词合成失败');
    const parsed=extractJson(info?.output?.value??info?.output?.text??info?.output??'');if(!text(parsed?.imagePrompt)||!text(parsed?.videoPrompt))throw new Error('模型没有返回完整 imagePrompt / videoPrompt');
    setNativeValue(shot.id,'image',parsed.imagePrompt);setNativeValue(shot.id,'video',parsed.videoPrompt);
    const latest=currentScriptContext()||ctx,latestShot=latest.data.shots.find(s=>String(s.id)===String(shot.id))||shot;
    setShotMeta(latest,latestShot,{status:'ready',mode:'smart',fingerprint:sourceFingerprint(latest,latestShot),generatedAt:now(),error:''});
    return true;
  }catch(error){setShotMeta(ctx,shot,{status:'failed',error:String(error?.message||error),failedAt:now()});throw error}
  finally{refreshComposer();syncOpenModal()}
}
function autoCompose(ctx,shot){
  const fp=sourceFingerprint(ctx,shot),button=nativeArticle(shot.id)?.querySelector('[data-synthesize-shot]');if(!button)throw new Error('自动拼接入口不可用');
  setShotMeta(ctx,shot,{status:'generating',error:'',mode:'auto',fingerprint:fp});button.click();
  setTimeout(()=>{const fresh=currentScriptContext()||ctx,freshShot=fresh.data.shots.find(s=>String(s.id)===String(shot.id))||shot;setShotMeta(fresh,freshShot,{status:'ready',mode:'auto',fingerprint:sourceFingerprint(fresh,freshShot),generatedAt:now(),error:''});refreshComposer();syncOpenModal()},80);
}

function renderTable(ctx){
  const shots=ctx.data.shots||[],done=completedCount(ctx),total=shots.length;
  return `<section id="${COMPOSER_ID}" class="final-prompt-composer-v1">
    <div class="final-prompt-progress"><div><b>合成最终提示词</b><span>镜头信息 + 关联资产 + 整体风格 → 分镜画面提示词 / 视频运动提示词</span></div><strong>${done}/${total} 提示词已完成</strong></div>
    <div class="final-prompt-table-wrap"><table class="final-prompt-table"><thead><tr><th>镜号</th><th>时长</th><th class="wide">画面描述</th><th>景别</th><th>光影氛围</th><th class="medium">对白/旁白</th><th>音效</th><th>运镜</th><th>最终提示词</th><th>操作</th></tr></thead><tbody>${shots.map(shot=>{const st=statusFor(ctx,shot);return `<tr data-final-prompt-row="${esc(shot.id)}"><td>${Number(shot.no||0)}</td><td>${Number(shot.duration||0)}s</td><td class="wide">${esc(shot.action||'')}</td><td>${esc(shot.shotSize||'')}</td><td>${esc(shot.lighting||'')}</td><td class="medium">${esc(shot.dialogue||'')}</td><td>${esc(shot.sound||'')}</td><td>${esc(shot.cameraMovement||'')}</td><td><button type="button" class="final-prompt-open ${st.key}" data-open-final-prompt="${esc(shot.id)}" ${st.key==='generating'?'disabled':''}>${esc(st.label)}</button></td><td><button type="button" class="final-prompt-more" data-open-final-prompt="${esc(shot.id)}" aria-label="查看第 ${Number(shot.no||0)} 镜提示词">•••</button></td></tr>`}).join('')}</tbody></table></div>
    <div class="final-prompt-footer"><button type="button" id="finalPromptComposeDirty">合成待更新</button><span class="spacer"></span><span>${done}/${total} 个镜头生产提示词已就绪</span><button type="button" id="finalPromptComposeAll" class="primary">一键合成全部提示词</button></div>
  </section>`;
}
function enhanceStage(){
  if(!isPromptStage())return;
  const ctx=currentScriptContext();if(!ctx)return;
  featureModal.querySelector('.prompt-compose-head')?.classList.add('final-prompt-native-hidden');
  featureModal.querySelector('.final-prompt-list')?.classList.add('final-prompt-native-hidden');
  featureModal.querySelector('.script-bottom-actions')?.classList.add('final-prompt-native-hidden');
  let root=featureModal.querySelector('#'+COMPOSER_ID);
  if(!root){const host=featureModal.querySelector('.final-prompt-list');host?.insertAdjacentHTML('beforebegin',renderTable(ctx));root=featureModal.querySelector('#'+COMPOSER_ID)}
  bindComposer();
}
function refreshComposer(){if(!isPromptStage())return;const ctx=currentScriptContext(),old=featureModal.querySelector('#'+COMPOSER_ID);if(!ctx||!old)return;old.outerHTML=renderTable(ctx);bindComposer()}
function bindComposer(){
  const root=featureModal.querySelector('#'+COMPOSER_ID);if(!root)return;
  root.querySelectorAll('[data-open-final-prompt]').forEach(b=>b.addEventListener('click',()=>openPromptModal(b.dataset.openFinalPrompt)));
  root.querySelector('#finalPromptComposeAll')?.addEventListener('click',()=>batchSmart(false));
  root.querySelector('#finalPromptComposeDirty')?.addEventListener('click',()=>batchSmart(true));
}

function modalHtml(ctx,shot){
  const status=statusFor(ctx,shot),meta=shotMeta(ctx,shot),image=nativeValue(shot.id,'image')||shot.imagePrompt||'',video=nativeValue(shot.id,'video')||shot.videoPrompt||'',has=Boolean(text(image)&&text(video)),actionLabel=has?'重新合成提示词':'立即合成提示词';
  return `<div id="${MODAL_ID}" class="final-prompt-modal-backdrop"><section class="final-prompt-modal" role="dialog" aria-modal="true" aria-label="第 ${Number(shot.no||0)} 镜最终提示词"><header><b>第 ${Number(shot.no||0)} 镜：最终提示词</b><button type="button" data-final-prompt-close>×</button></header><main>
    <div class="final-prompt-field-head"><b>分镜提示词</b>${text(image)?'<span class="ok">✓ 分镜图提示词已生成</span>':''}<small>自动保存</small></div><textarea data-modal-image placeholder="点击立即合成提示词，AI 将综合当前镜头、关联资产与整体风格生成。">${esc(image)}</textarea>
    <div class="final-prompt-field-head"><b>视频运动提示词</b>${text(video)?'<span class="ok">✓ 视频运动提示词已生成</span>':''}<small>自动保存</small></div><textarea data-modal-video placeholder="AI 将重点生成主体运动、摄影机运动、环境动态、动作节奏与时长约束。">${esc(video)}</textarea>
    ${status.key==='outdated'?'<div class="final-prompt-warning">镜头、资产或整体风格已变化，当前提示词需要重新合成。</div>':''}${status.key==='failed'?`<div class="final-prompt-error">${esc(meta.error||'合成失败，请重试')}</div>`:''}
  </main><footer><div class="final-prompt-mode"><label><input type="radio" name="finalPromptMode" value="smart" checked> 智能合成</label><label><input type="radio" name="finalPromptMode" value="auto"> 自动拼接</label></div><button type="button" class="primary" data-final-prompt-run ${status.key==='generating'?'disabled':''}>${status.key==='generating'?'正在合成…':actionLabel}</button></footer></section></div>`;
}
function bindModal(root,ctx,shot,{debouncedSave=true}={}){
  root.dataset.shotId=shot.id;root.querySelector('[data-final-prompt-close]').onclick=closePromptModal;root.addEventListener('mousedown',e=>{if(e.target===root)closePromptModal()});
  let timer=0;const save=(type,el)=>{const commit=()=>{setNativeValue(shot.id,type,el.value);const fresh=currentScriptContext()||ctx,freshShot=fresh.data.shots.find(s=>String(s.id)===String(shot.id))||shot;setShotMeta(fresh,freshShot,{status:'ready',mode:'manual',fingerprint:sourceFingerprint(fresh,freshShot),generatedAt:shotMeta(fresh,freshShot).generatedAt||now(),manualEditedAt:now(),error:''});refreshComposer()};if(!debouncedSave)return commit();clearTimeout(timer);timer=setTimeout(commit,450)};
  root.querySelector('[data-modal-image]').addEventListener(debouncedSave?'input':'change',e=>save('image',e.target));root.querySelector('[data-modal-video]').addEventListener(debouncedSave?'input':'change',e=>save('video',e.target));
  root.querySelector('[data-final-prompt-run]').onclick=async()=>{const fresh=currentScriptContext()||ctx,current=fresh.data.shots.find(s=>String(s.id)===String(shot.id))||shot,mode=root.querySelector('input[name="finalPromptMode"]:checked')?.value||'smart';try{if(mode==='auto'){autoCompose(fresh,current);toast(`第 ${current.no} 镜已自动拼接提示词`)}else{await smartSynthesize(fresh,current);toast(`第 ${current.no} 镜最终提示词已合成`)}}catch(error){toast('提示词合成失败：'+String(error?.message||error))}};
}
function openPromptModal(shotId){
  closePromptModal();const ctx=currentScriptContext(),shot=ctx?.data?.shots?.find(s=>String(s.id)===String(shotId));if(!ctx||!shot)return;
  document.body.insertAdjacentHTML('beforeend',modalHtml(ctx,shot));bindModal(document.querySelector('#'+MODAL_ID),ctx,shot,{debouncedSave:true});
}
function closePromptModal(){document.querySelector('#'+MODAL_ID)?.remove()}
function syncOpenModal(){
  const old=document.querySelector('#'+MODAL_ID);if(!old)return;const shotId=old.dataset.shotId,mode=old.querySelector('input[name="finalPromptMode"]:checked')?.value||'smart',ctx=currentScriptContext(),shot=ctx?.data?.shots?.find(s=>String(s.id)===String(shotId));if(!ctx||!shot)return closePromptModal();old.outerHTML=modalHtml(ctx,shot);const root=document.querySelector('#'+MODAL_ID),radio=root.querySelector(`input[name="finalPromptMode"][value="${CSS.escape(mode)}"]`);if(radio)radio.checked=true;bindModal(root,ctx,shot,{debouncedSave:false});
}

async function batchSmart(onlyDirty){
  const ctx=currentScriptContext();if(!ctx)return;const shots=(ctx.data.shots||[]).filter(s=>!onlyDirty||['outdated','pending','failed'].includes(statusFor(ctx,s).key));if(!shots.length)return toast(onlyDirty?'没有需要更新的提示词':'没有可合成的镜头');
  const pc=providerContext(ctx);if(!pc.pid||!pc.mid)return toast('请先在「确认镜头」中选择文本 API 供应商和模型');
  const button=featureModal.querySelector('#'+(onlyDirty?'finalPromptComposeDirty':'finalPromptComposeAll'));if(button)button.disabled=true;let cursor=0,done=0,failed=0;
  const worker=async()=>{while(cursor<shots.length){const shot=shots[cursor++];try{await smartSynthesize(currentScriptContext()||ctx,shot);done++}catch{failed++}refreshComposer()}};
  await Promise.all(Array.from({length:Math.min(2,shots.length)},worker));refreshComposer();toast(failed?`已合成 ${done} 个镜头，${failed} 个失败，可单独重试`:`${done} 个镜头最终提示词已全部合成`);
}

let scheduled=0;const observer=new MutationObserver(()=>{clearTimeout(scheduled);scheduled=setTimeout(()=>{if(isPromptStage())enhanceStage();else closePromptModal()},60)});observer.observe(featureModal,{subtree:true,childList:true});
if(isPromptStage())enhanceStage();
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#'+MODAL_ID))closePromptModal()});
})();
