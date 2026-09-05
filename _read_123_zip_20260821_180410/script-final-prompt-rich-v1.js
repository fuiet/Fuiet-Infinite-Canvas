/* Fuiet Script · Production-grade Final Prompt Upgrade
 * Upgrades final prompts from short summaries to director-level storyboard specs
 * and time-segmented video motion specs while reusing the existing prompt UI/state.
 */
(()=>{
'use strict';
const base=globalThis.FuietFinalPromptWorkflowV2;
const manager=globalThis.CanvasBrowserStorageManager;
const featureModal=document.querySelector('#featureModal');
if(!base||!manager||!featureModal)return;

const text=v=>String(v??'');
const esc=v=>text(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x).trim()).filter(Boolean))];
let overlay=null,bulkRunning=false;
const running=new Set();

function groups(assets=[]){const g={characters:[],scenes:[],props:[]};for(const a of assets){const t=text(a.assetType||a.type).toLowerCase();if(t.includes('char')||t.includes('character'))g.characters.push(a);else if(t.includes('scene'))g.scenes.push(a);else g.props.push(a)}return g}
function assetText(a){return `@${a.name}：${text(a.prompt||a.description||'保持已确认资产的身份、结构、比例、材质与外观一致')}`}
function bullets(xs,empty='无'){return xs?.length?xs.map(x=>`- ${x}`).join('\n'):empty}
function numbered(xs){return uniq(xs).map((x,i)=>`${i+1}. ${x}`).join('\n')}
function continuity(s){if(!s)return'无（边界镜头）';return [s.shotSize,s.action,s.cameraMovement?`运镜：${s.cameraMovement}`:''].filter(Boolean).join('；')||'无'}
function time(v){const n=Math.round(Number(v||0)*10)/10;return Number.isInteger(n)?String(n):n.toFixed(1)}
function refRules(ctx){const g=groups(ctx.assets),out=[];if(g.characters.length)out.push('角色：参考已确认角色资产的身份、脸型、发型、体型、服装和关键配饰；参考形象，不机械复制参考图姿势；三视图/多视图禁止把同一姿势重复到画面。');if(g.scenes.length)out.push('场景：参考已确认场景资产的空间结构、装修、陈设、材质和位置关系；不照搬参考图构图；禁止镜像复制造成左右结构颠倒。');if(g.props.length)out.push('道具：参考已确认道具的大小、结构、材质、颜色和正反面逻辑；不照搬参考图位置；握持、摆放、屏幕朝向和遮挡关系必须符合动作逻辑。');return out}
function defaultConstraints(ctx){const g=groups(ctx.assets),s=ctx.shot,out=[];if(g.characters.length)out.push('角色身份、脸型、发型、体型、服装、配饰保持一致，不变脸、不换装。');if(g.scenes.length||s.scene)out.push('场景结构、门窗、桌椅、前后景位置和主光方向稳定，不漂移、不镜像翻转。');if(g.props.length)out.push('关键道具数量、尺寸、正反面、持有者和空间位置连续，不复制、不消失、不突然换手。');out.push('人物手部与肢体结构真实，禁止多指、缺指、关节畸变、穿模、悬空和错误接触。');if(text(s.dialogue).trim())out.push('口型、说话人、视线对象和情绪节奏与对白一致，非说话角色不得错误张口。');out.push('轴线、视线方向、人物站位和尺度连续，禁止跳轴、瞬移、无动机位移和景别突变。');return out}
function defaultForbidden(ctx){const out=['禁止新增未设定人物、道具、文字、水印、Logo 或无关背景事件','禁止主体变形、身份漂移、服装突变、物体融化、穿模、悬空、突然消失'];if(text(ctx.shot.dialogue).trim())out.push('禁止口型错位、抢台词、说话对象错误');return out}
function normalizeBeats(beats,duration,fallback){const total=Math.max(.5,Number(duration||3)),src=Array.isArray(beats)?beats.filter(Boolean).slice(0,4):[];if(!src.length)return[{start:0,end:total,summary:'完成当前镜头动作',visual:fallback||'',action:fallback||'',expression:'',blocking:'',camera:'',audio:'',constraints:[],forbidden:[]}];let cursor=0;const out=src.map((b,i)=>{const remain=src.length-i,start=Number.isFinite(Number(b.start))?Math.max(cursor,Number(b.start)):cursor;let end=Number.isFinite(Number(b.end))?Number(b.end):start+(total-start)/remain;end=Math.min(total,Math.max(start+.1,end));cursor=end;return{start,end,summary:text(b.summary||b.brief),visual:text(b.visual||b.frame),action:text(b.action),expression:text(b.expression),blocking:text(b.blocking||b.positioning),camera:text(b.camera),audio:text(b.audio||b.sound),constraints:uniq(b.constraints),forbidden:uniq(b.forbidden)}});out[0].start=0;out[out.length-1].end=total;for(let i=1;i<out.length;i++)out[i].start=out[i-1].end;return out}

function compileImage(ctx,spec={}){const s=ctx.shot,g=groups(ctx.assets),constraints=uniq([...(spec.constraints||[]),...defaultConstraints(ctx)]),forbidden=uniq([...(spec.forbidden||[]),...defaultForbidden(ctx)]),roles=g.characters.map(assetText),scenes=g.scenes.map(assetText),props=g.props.map(assetText);const visible=text(spec.visualDescription||spec.visual||s.action||'严格按照当前 Shot 画面描述呈现'),performance=text(spec.performance||spec.characterPerformance),composition=text(spec.composition||spec.cameraComposition||`${s.shotSize||'中景'}，遵循当前 Shot 的既定机位、轴线和空间关系`),lighting=text(spec.lighting||s.lighting),mood=text(spec.mood),camera=text(spec.camera||s.cameraMovement||'固定镜头'),sound=text(spec.soundReference||[s.dialogue,s.sound].filter(Boolean).join('；'));return[
`镜头规格：${s.shotSize||'中景'}，${Number(s.duration||3)} 秒。`,
`画面内容：${visible}`,
performance&&`主体与表演：${performance}`,
`出场角色：\n${bullets(roles)}`,
`背景场景：\n${bullets(scenes.length?scenes:(s.scene?[s.scene]:[]))}`,
`关键道具：\n${bullets(props)}`,
`构图与机位：${composition}`,
`运镜状态：${camera}`,
lighting&&`光影氛围：${lighting}${mood?`；情绪氛围：${mood}`:''}`,
sound&&`声音参考：${sound}`,
`参考图使用规则：\n${bullets(refRules(ctx))}`,
`前一个分镜描述：\n${continuity(ctx.previous)}`,
`下一个分镜衔接：\n${continuity(ctx.next)}`,
`当前镜头连续性约束：\n${numbered(constraints)}`,
`禁止事项：\n${bullets(forbidden)}`,
ctx.style&&`[视觉风格：${ctx.style}]`
].filter(Boolean).join('\n\n')}

function compileVideo(ctx,spec={}){const s=ctx.shot,g=groups(ctx.assets),constraints=uniq([...(spec.outputConstraints||spec.constraints||[]),...defaultConstraints(ctx)]),forbidden=uniq([...(spec.forbidden||[]),...defaultForbidden(ctx)]),beats=normalizeBeats(spec.beats,s.duration,spec.motionSummary||s.action),roles=g.characters.map(assetText),props=g.props.map(assetText);const beatText=beats.map(b=>[
`${time(b.start)}-${time(b.end)} 秒`,
`画面：${b.visual||s.action||'保持当前分镜画面连续'}`,
`动作：${b.action||b.visual||s.action||'自然延续既定动作'}`,
b.expression&&`表情与视线：${b.expression}`,
b.blocking&&`站位与朝向：${b.blocking}`,
`运镜：${b.camera||s.cameraMovement||'固定'}`,
`音效/对白：${b.audio||[s.dialogue,s.sound].filter(Boolean).join('；')||'保持自然环境声'}`,
`约束：${uniq([...(b.constraints||[]),...constraints.slice(0,4)]).join('；')}`,
`禁止：${uniq([...(b.forbidden||[]),...forbidden.slice(0,4)]).join('；')}`,
b.summary&&`（简述：${b.summary}）`
].filter(Boolean).join('\n')).join('\n\n');return[
`时序规格：${Number(s.duration||3)} 秒。`,
`镜头目标：${text(spec.motionSummary||s.action||'按当前 Shot 完成动作和运镜')}`,
`初始画面：${text(spec.startingState||s.action||'保持与当前分镜首帧一致')}`,
`景别：${s.shotSize||'中景'}。`,
`场景：${s.scene||groups(ctx.assets).scenes.map(a=>'@'+a.name).join('、')||'保持已确认场景'}。`,
`出场角色：\n${bullets(roles)}`,
`关键道具：\n${bullets(props)}`,
`光影氛围：${s.lighting||'保持首帧既定光线、色温和阴影方向稳定'}。`,
`参考图使用规则：\n${bullets(refRules(ctx))}`,
`前一个分镜描述：\n${continuity(ctx.previous)}`,
`当前分镜的分段描述：\n\n${beatText}`,
`结束状态：${text(spec.endingState||'动作在镜头结尾自然收束，人物站位、视线、道具、场景和光线状态可无缝衔接下一镜头')}`,
`输出约束：\n${numbered(constraints)}`,
`全局禁止：\n${bullets(forbidden)}`,
ctx.style&&`[视觉风格：${ctx.style}]`
].filter(Boolean).join('\n\n')}
function compile(ctx,raw={}){return{imagePrompt:compileImage(ctx,raw.imageSpec||{visualDescription:raw.imagePrompt}),videoPrompt:compileVideo(ctx,raw.videoSpec||{motionSummary:raw.videoPrompt})}}
function ruleCompose(ctx){const s=ctx.shot,d=Number(s.duration||3),mid=Math.round(d*5)/10;return compile(ctx,{imageSpec:{visualDescription:s.action,performance:s.characters?`${s.characters} 按当前剧情完成动作，表情、视线、手部和道具交互清晰可见`:'',composition:`${s.shotSize||'中景'}；${s.cameraMovement||'固定机位'}；明确前景、主体、后景和视线关系`,lighting:s.lighting},videoSpec:{motionSummary:s.action,startingState:s.action,beats:d>=4?[{start:0,end:mid,summary:'动作建立',visual:s.action,action:'从首帧状态自然进入当前动作',camera:s.cameraMovement,audio:[s.dialogue,s.sound].filter(Boolean).join('；')},{start:mid,end:d,summary:'动作完成',visual:s.action,action:'完成当前动作并自然收束，为下一镜头保留连续状态',camera:s.cameraMovement,audio:[s.dialogue,s.sound].filter(Boolean).join('；')}]:[{start:0,end:d,summary:'完成当前动作',visual:s.action,action:s.action,camera:s.cameraMovement,audio:[s.dialogue,s.sound].filter(Boolean).join('；')}]}})}

async function apiJson(url,options={}){const res=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options}),body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(text(body.error||body.message||`HTTP ${res.status}`));return body}
function extractJson(v){const raw=text(v).trim(),candidates=[raw,...[...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1])];for(const x of candidates){try{return JSON.parse(x)}catch{}const a=x.indexOf('{'),b=x.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(x.slice(a,b+1))}catch{}}return null}
async function runtimeFor(node){const pid=text(node?.scriptProviderId),mid=text(node?.scriptModelId);if(!pid||!mid)throw new Error('请先在脚本节点选择文本 API 供应商和模型');const ps=(await apiJson('/api/providers')).providers||[],p=ps.find(x=>String(x.id)===pid);if(!p)throw new Error('当前文本 API 供应商不存在');const m=(p.models||[]).find(x=>String(x.id)===mid);if(!m)throw new Error('当前文本模型不存在');return{pid,mid,p,m}}
async function waitTask(id,onProgress){let info;for(let i=0;i<420;i++){await sleep(700);info=(await apiJson('/api/tasks/'+encodeURIComponent(id))).task;onProgress?.(info);if(['succeeded','failed','canceled'].includes(text(info?.status)))break}if(info?.status!=='succeeded')throw new Error(text(info?.error||info?.lastError||'提示词合成失败'));return info}
function schema(){return{imageSpec:{visualDescription:'完整静态画面：前景/主体/后景、人物与道具关系',performance:'姿态、表情、视线、手部和道具交互',composition:'构图、机位高度、方向、主体位置、景深、层次',lighting:'光源方向、明暗、色温、材质反光',mood:'情绪',constraints:['本镜头特有约束'],forbidden:['本镜头特有禁止']},videoSpec:{motionSummary:'整个镜头动作目标',startingState:'0 秒精确状态',beats:[{start:0,end:3,summary:'简述',visual:'这一段看见什么',action:'动作按时间顺序',expression:'表情和视线',blocking:'站位、朝向、移动路径、道具持有',camera:'机位和运镜',audio:'对白/环境音/音效及发生时机',constraints:['本段约束'],forbidden:['本段禁止']}],endingState:'结束状态',outputConstraints:['全镜头约束'],forbidden:['全镜头禁止']}}}
function aiInstruction(payload,duration){return `你是专业影视分镜导演、摄影指导和 AI 视频提示词编译器。不要给短摘要，要把 Shot 编译成可直接送入高质量图像/视频生成模型的生产级规格。\n\n必须做到：\n1. 不只是复述原 Shot，要结合 associatedAssets 补全主体外观、空间关系、道具状态、人物表演、机位、构图、景深、光影和连续性，但不得创造剧本没有的重要事实。\n2. imageSpec 具体描述“这一帧到底长什么样”，必须有前景/主体/后景、表情视线、手部道具交互、构图机位、景深和具体光线。\n3. videoSpec 具体描述“这几秒怎么演、怎么动、镜头怎么走”。按照真实动作变化拆成 1-4 段，从 0 秒连续覆盖到 ${duration} 秒，最后一段必须精确结束在 ${duration} 秒。\n4. 每段 beats 都要写：画面、动作、表情与视线、站位与朝向、道具关系、运镜、对白/音效、约束、禁止。\n5. 角色资产参考身份外观不照抄姿势；场景资产参考空间结构不照抄构图；道具资产参考结构大小不照抄位置，必须保持正反面和握持逻辑。\n6. previousShot / nextShot 只用于连续性和指代理解，不得把相邻镜头内容混入当前镜头。\n7. 输入里只要出现手机屏幕、手部交互、餐具、门窗、说话口型、人物朝向等容易出错关系，就必须写成明确约束。\n8. 不要拿“电影感、高清、细节丰富”充数；系统会单独追加全局视觉风格。\n\n只返回合法 JSON，不要 Markdown，不要解释。结构：${JSON.stringify(schema())}\n\n输入：${JSON.stringify(payload)}`}
async function aiOne(ctx,onProgress){const r=await runtimeFor(ctx.node),payload={globalStyle:ctx.style,currentShot:ctx.shot,associatedAssets:ctx.assets.map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),previousShot:ctx.previous,nextShot:ctx.next},prompt=aiInstruction(payload,Number(ctx.shot.duration||3)),created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:r.pid,modelId:r.mid,providerSnapshot:r.p,modelSnapshot:r.m,nodeType:'text',prompt,references:[],maxRetries:Number(ctx.state?.workflowSettings?.maxRetries??1),parameters:{operation:'prompt_synthesis_single_production',responseFormat:'json_object'}})}),info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,onProgress),parsed=extractJson(info.output?.value??info.output?.text??'');if(!parsed)throw new Error('模型没有返回合法 JSON');return compile(ctx,parsed)}
async function aiBatch(hit,data,onProgress){const r=await runtimeFor(hit.node),shots=data.shots||[],out=[],size=3;for(let o=0;o<shots.length;o+=size){const chunk=shots.slice(o,o+size),payload={globalStyle:text(data.globalStyle?.text||data.style),shots:chunk.map(s=>{const ctx=base.shotContext(s.id);return{id:s.id,no:s.no,duration:s.duration,shotSize:s.shotSize,scene:s.scene,characters:s.characters,props:s.props,action:s.action,lighting:s.lighting,dialogue:s.dialogue,sound:s.sound,cameraMovement:s.cameraMovement,associatedAssets:(ctx?.assets||[]).map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),previousShot:ctx?.previous,nextShot:ctx?.next}})},prompt=`${aiInstruction({shots:payload.shots,globalStyle:payload.globalStyle},'每个 shot 自己的 duration')}\n\n批量返回结构必须是：${JSON.stringify({shots:[{id:'原 shot id',...schema()}]})}`,created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:r.pid,modelId:r.mid,providerSnapshot:r.p,modelSnapshot:r.m,nodeType:'text',prompt,references:[],maxRetries:Number(hit.state?.workflowSettings?.maxRetries??1),parameters:{operation:'prompt_synthesis_batch_production',responseFormat:'json_object'}})}),info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,t=>onProgress?.({done:o,total:shots.length,task:t})),parsed=extractJson(info.output?.value??info.output?.text??'');if(!Array.isArray(parsed?.shots))throw new Error(`第 ${o+1}-${o+chunk.length} 镜返回不完整`);for(const s of chunk){const raw=parsed.shots.find(x=>String(x?.id)===String(s.id)),ctx=base.shotContext(s.id);if(!raw||!ctx)throw new Error(`模型遗漏第 ${s.no} 镜`);out.push({id:String(s.id),...compile(ctx,raw)})}onProgress?.({done:Math.min(shots.length,o+chunk.length),total:shots.length,task:{progress:100}})}return out}

async function waitFor(sel,timeout=2500){const start=Date.now();while(Date.now()-start<timeout){const el=featureModal.querySelector(sel);if(el)return el;await sleep(30)}return null}
async function commit(results){const active=featureModal.querySelector('[data-script-tab].active')?.dataset.scriptTab||'';if(active!=='prompts')featureModal.querySelector('[data-script-tab="prompts"]')?.click();await waitFor('.final-prompt-list',3000);for(const x of results){const card=await waitFor(`[data-final-shot="${CSS.escape(String(x.id))}"]`,2000);if(!card)continue;for(const [sel,val] of [['[data-final-image]',x.imagePrompt],['[data-final-video]',x.videoPrompt]]){const el=card.querySelector(sel);if(el){el.readOnly=false;el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}))}}}if(active&&active!=='prompts'){await sleep(20);featureModal.querySelector(`[data-script-tab="${CSS.escape(active)}"]`)?.click()}}
function toast(msg,error=false){const el=document.querySelector('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');el.classList.toggle('error',error);clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add('hidden'),3500)}
function close(){overlay?.remove();overlay=null}
function area(k,label,value){return `<section class="fpv2-section"><header><b>${label}</b><span>可编辑 · 自动保存</span></header><textarea data-rich-edit="${k}" placeholder="合成后会生成包含角色/场景/道具、构图、光影、连续性、参考图规则和分段时序的完整提示词。">${esc(value||'')}</textarea></section>`}
function openRich(shotId){close();const ctx=base.shotContext(shotId);if(!ctx)return toast('找不到当前镜头',true);const el=document.createElement('div');el.className='fpv2-overlay';el.innerHTML=`<div class="fpv2-dialog" role="dialog" aria-modal="true"><header class="fpv2-title"><b>第 ${Number(ctx.shot.no||ctx.index+1)} 镜：最终提示词 · 生产级详细模式</b><button data-rich-close>×</button></header><div class="fpv2-body">${area('image','分镜提示词',ctx.shot.imagePrompt)}${area('video','视频运动提示词',ctx.shot.videoPrompt)}</div><footer><div class="fpv2-modes"><label><input type="radio" name="rich-mode" value="ai" checked> 智能合成</label><label><input type="radio" name="rich-mode" value="rule"> 自动拼接</label></div><span class="fpv2-progress"></span><button class="primary" data-rich-run>${ctx.shot.imagePrompt&&ctx.shot.videoPrompt?'重新合成提示词':'立即合成提示词'}</button></footer></div>`;document.body.appendChild(el);overlay=el;el.querySelector('[data-rich-close]').onclick=close;el.addEventListener('pointerdown',e=>{if(e.target===el)close()});let timer=0;el.querySelectorAll('[data-rich-edit]').forEach(t=>t.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{const image=el.querySelector('[data-rich-edit="image"]')?.value||'',video=el.querySelector('[data-rich-edit="video"]')?.value||'';if(image.trim()&&video.trim())commit([{id:shotId,imagePrompt:image,videoPrompt:video}]).catch(()=>{})},600)}));const btn=el.querySelector('[data-rich-run]'),progress=el.querySelector('.fpv2-progress');btn.onclick=async()=>{btn.disabled=true;running.add(String(shotId));try{const fresh=base.shotContext(shotId);if(!fresh)throw new Error('镜头数据已变化');const mode=el.querySelector('input[name="rich-mode"]:checked')?.value||'ai';progress.textContent=mode==='ai'?'正在编译角色、场景、道具、构图、光影、连续性和分段时序…':'正在按完整规则拼接…';const result=mode==='ai'?await aiOne(fresh,t=>progress.textContent=`AI 合成中 · ${Math.max(1,Math.round(Number(t?.progress||0)))}%`):ruleCompose(fresh);await commit([{id:shotId,...result}]);toast(`第 ${fresh.shot.no} 镜生产级提示词已合成`);close()}catch(e){progress.textContent=text(e.message||e);btn.disabled=false;toast('提示词合成失败：'+text(e.message||e),true)}finally{running.delete(String(shotId))}}}
async function bulk(){if(bulkRunning)return;const first=featureModal.querySelector('[data-fpv2-shot]')?.dataset.fpv2Shot;if(!first)return toast('当前没有镜头',true);const firstCtx=base.shotContext(first);if(!firstCtx)return toast('找不到当前脚本',true);const state=(()=>{try{return JSON.parse(manager.getItem('libtv-clone-state')||'{}')}catch{return{}}})(),node=(state.nodes||[]).find(n=>n?.type==='script'&&(n.scriptData?.shots||[]).some(s=>String(s.id)===String(first))),data=node?.scriptData;if(!node||!data)return toast('找不到当前脚本节点',true);bulkRunning=true;try{const out=await aiBatch({state,node},data,m=>{const b=featureModal.querySelector('#fpv2BulkCompose');if(b)b.textContent=m.done?`正在合成 ${m.done}/${m.total}`:`AI 合成中 ${Math.round(Number(m.task?.progress||0))}%`});await commit(out);toast(`已合成 ${out.length} 个镜头的生产级最终提示词`)}catch(e){toast('批量合成失败：'+text(e.message||e),true)}finally{bulkRunning=false;setTimeout(()=>{const b=featureModal.querySelector('#fpv2BulkCompose');if(b)b.textContent='一键合成全部提示词'},30)}}

featureModal.addEventListener('click',e=>{const shot=e.target.closest('[data-fpv2-shot]');if(shot){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openRich(shot.dataset.fpv2Shot);return}const batch=e.target.closest('#fpv2BulkCompose');if(batch){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();bulk();}},true);
const observer=new MutationObserver(()=>{const summary=featureModal.querySelector('.fpv2-compose-summary span');if(summary&&!summary.textContent.includes('生产级详细模式'))summary.textContent+=' · 生产级详细模式'});observer.observe(featureModal,{childList:true,subtree:true});

globalThis.FuietFinalPromptProduction=Object.freeze({version:1,compileImage,compileVideo,ruleCompose,openRich,bulk});
})();
