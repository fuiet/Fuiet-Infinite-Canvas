/* Fuiet Script · Final Prompt Production V3
 * Director-grade prompt compiler.
 * Guarantees complete storyboard + video motion specs even when the text model
 * returns sparse fields. Keeps the existing persistence bridge and workbench UI.
 */
(()=>{
'use strict';
const base=globalThis.FuietFinalPromptWorkflowV2;
const legacy=globalThis.FuietFinalPromptProduction;
const manager=globalThis.CanvasBrowserStorageManager;
const featureModal=document.querySelector('#featureModal');
if(!base||!legacy||!manager||!featureModal)return;

const text=v=>String(v??'').trim();
const uniq=v=>[...new Set((Array.isArray(v)?v:[]).map(text).filter(Boolean))];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let bulkRunning=false;

function assetType(a){const t=text(a?.assetType||a?.type).toLowerCase();return t.includes('char')||t.includes('character')?'角色':t.includes('scene')?'场景':'道具'}
function groups(assets=[]){const out={characters:[],scenes:[],props:[]};for(const a of assets){const k=assetType(a);if(k==='角色')out.characters.push(a);else if(k==='场景')out.scenes.push(a);else out.props.push(a)}return out}
function compact(v,max=260){const s=text(v).replace(/\s+/g,' ');return s.length>max?s.slice(0,max-1)+'…':s}
function assetLine(a){const detail=compact(a?.prompt||a?.description||'保持已确认资产的外观、结构、比例、材质和关键识别特征一致');return `@${text(a?.name)||'未命名'}（${assetType(a)}）：${detail}`}
function lines(xs,empty='无'){const a=uniq(xs);return a.length?a.map(x=>`- ${x}`).join('\n'):empty}
function numbered(xs){const a=uniq(xs);return a.length?a.map((x,i)=>`${i+1}. ${x}`).join('\n'):'无'}
function time(v){const n=Math.round(Number(v||0)*10)/10;return Number.isInteger(n)?String(n):n.toFixed(1)}
function val(v,fallback=''){return text(v)||text(fallback)}
function listValue(v){return Array.isArray(v)?v.map(text).filter(Boolean):text(v)?[text(v)]:[]}

function lensFor(size){const s=text(size);if(/特写|大特写/.test(s))return '中长焦近距离观察，浅景深，焦点稳定落在眼睛、关键表情或核心道具上';if(/近景/.test(s))return '约 70–85mm 等效视角，浅到中等景深，主体从背景中清晰分离';if(/中景|中近景/.test(s))return '约 50mm 等效自然透视，中等景深，人物动作与环境关系同时可读';if(/全景|远景|大全景/.test(s))return '约 24–35mm 等效广角视角，保留空间纵深与人物位置关系，避免夸张畸变';return '自然电影镜头透视，中等景深，主体清晰、空间关系稳定'}
function cameraFor(s){const c=text(s.cameraMovement);return c?`${c}；运动速度平稳、方向明确，只执行一次主要运镜，不做无动机漂移或突然加速`:'固定机位或极轻微呼吸感稳定镜头，不做无动机平移、缩放或旋转'}
function continuityShot(s){if(!s)return'边界镜头，无额外前后镜约束';return [s.shotSize&&`景别 ${s.shotSize}`,s.scene&&`场景 ${s.scene}`,s.action&&`状态 ${compact(s.action,140)}`,s.cameraMovement&&`运镜 ${s.cameraMovement}`].filter(Boolean).join('；')||'保持相邻镜头人物、场景、道具和空间关系连续'}
function soundFor(s){return [text(s.dialogue)&&`对白/旁白：${text(s.dialogue)}`,text(s.sound)&&`环境音/音效：${text(s.sound)}`].filter(Boolean).join('；')||'保留符合当前场景的自然环境底噪，不新增抢戏音效'}
function styleFor(ctx,spec){return val(spec?.visualStyle||spec?.style,ctx.style||'写实电影摄影风格；真实材质、自然肤质、稳定曝光、电影级层次与清晰细节')}
function baseConstraints(ctx){const s=ctx.shot,g=groups(ctx.assets),out=[];if(g.characters.length)out.push('角色身份、脸型、发型、体型、服装、配饰与已确认角色资产一致；不变脸、不换装、不改变年龄与身份特征。');if(g.scenes.length||s.scene)out.push('场景结构、门窗、家具、道路、前后景位置与主光方向保持稳定；不镜像翻转、不随机改造空间。');if(g.props.length||text(s.props))out.push('关键道具的数量、形状、尺寸、材质、颜色、正反面、持有者和空间位置连续；不复制、不消失、不突然换手。');out.push('人物手部、四肢和关节结构自然；接触关系真实；禁止多指、缺指、穿模、悬空、融化、形体漂移。');out.push('轴线、人物左右位置、视线方向、比例尺度和运动方向保持连续；禁止跳轴、瞬移、无动机转身和突然景别突变。');if(text(s.dialogue))out.push('说话人与对白一致；口型、视线对象、表情节奏与台词同步；非说话角色不得错误张口。');return out}
function forbidden(ctx){const out=['禁止新增剧本未设定的重要人物、关键道具、文字、水印、Logo、字幕或无关背景事件。','禁止主体身份漂移、服装突变、场景重构、道具变形、物体穿插、突然消失或凭空出现。','禁止无动机的镜头抖动、自动变焦、旋转、快速甩镜、焦点乱跳和不符合物理规律的运动。'];if(text(ctx.shot.dialogue))out.push('禁止抢台词、口型错位、错误说话对象和与情绪不符的夸张表演。');return out}

function schema(){return{
  imageSpec:{
    intent:'当前镜头在剧情中的目的与情绪重点',
    visual:'完整静态画面，写清前景/主体/后景以及谁在什么位置做什么',
    performance:'人物姿态、动作瞬间、表情、视线、手部、身体重心和道具交互',
    environment:'场景空间、背景陈设、天气/时间、可见环境细节',
    composition:'构图、主体位置、机位高度、拍摄方向、层次、留白、视线关系',
    lensDepth:'焦段感、透视、景深、焦点落点',
    lighting:'主光/辅光/轮廓光方向、软硬、亮暗、色温、阴影、反射',
    colorMaterial:'色彩基调、材质表现、皮肤/布料/金属/玻璃等质感',
    atmosphere:'情绪氛围与环境空气感',
    soundReference:'用于理解画面的对白/环境声/音效',
    continuity:'和前后镜头必须保持的连续状态',
    constraints:['本镜头额外约束'],
    forbidden:['本镜头额外禁止']
  },
  videoSpec:{
    goal:'整个镜头要完成的动作与叙事目标',
    startState:'0 秒时人物、表情、视线、手、道具、站位、镜头的精确状态',
    beats:[{start:0,end:2,visual:'该时段画面变化',subjectAction:'人物动作顺序与速度',expressionGaze:'表情和视线变化',propInteraction:'手与道具怎么接触/移动',environmentMotion:'头发衣摆纸张车辆光影等环境运动',camera:'机位、运镜方向、速度和稳定性',focusDepth:'焦点、景深或跟焦变化',audio:'对白/旁白/环境声/音效及发生时机'}],
    endState:'最后一帧人物、表情、视线、手、道具、站位和镜头状态',
    continuity:'前后镜衔接要求',
    outputConstraints:['全镜头约束'],
    forbidden:['全镜头禁止']
  }
}}

function normalizedBeats(spec,duration,s){
  const total=Math.max(.5,Number(duration||3));
  const raw=Array.isArray(spec?.beats)?spec.beats.filter(Boolean).slice(0,5):[];
  const wanted=total>=9?4:total>=5?3:total>=2.5?2:1;
  const source=raw.length?raw:Array.from({length:wanted},(_,i)=>({start:total*i/wanted,end:total*(i+1)/wanted}));
  let cursor=0;
  const out=source.map((b,i)=>{
    const remain=source.length-i;
    const start=i===0?0:cursor;
    const rawEnd=Number(b.end);
    const end=i===source.length-1?total:clamp(Number.isFinite(rawEnd)?rawEnd:start+(total-start)/remain,start+.1,total);
    cursor=end;
    return{
      start,end,
      visual:val(b.visual,b.frame||s.action||'保持当前镜头画面连续'),
      subjectAction:val(b.subjectAction,b.action||s.action||'按剧情自然完成当前动作'),
      expressionGaze:val(b.expressionGaze,b.expression||'表情和视线随动作自然变化，保持角色当前情绪，不做无动机夸张表演'),
      propInteraction:val(b.propInteraction,'手部与当前关键道具按剧情逻辑自然接触、持握或移动；没有道具时保持手部动作自然'),
      environmentMotion:val(b.environmentMotion,'仅保留场景中合理的轻微环境运动，所有背景运动服从当前空间与风向/光线逻辑'),
      camera:val(b.camera,cameraFor(s)),
      focusDepth:val(b.focusDepth,lensFor(s.shotSize)),
      audio:val(b.audio,soundFor(s))
    }
  });
  out[0].start=0;out[out.length-1].end=total;for(let i=1;i<out.length;i++)out[i].start=out[i-1].end;return out;
}

function compileImage(ctx,spec={}){
  const s=ctx.shot,g=groups(ctx.assets);
  const roles=g.characters.map(assetLine),scenes=g.scenes.map(assetLine),props=g.props.map(assetLine);
  const intent=val(spec.intent,`清晰完成当前 Shot 的叙事信息：${compact(s.action||'呈现当前剧情状态',180)}`);
  const visual=val(spec.visual,s.action||'严格按照当前 Shot 画面描述呈现主体、动作与空间关系');
  const performance=val(spec.performance,`${text(s.characters)||g.characters.map(a=>'@'+a.name).join('、')||'画面主体'}处在动作最有辨识度的瞬间；身体重心、手部接触、表情和视线与剧情目的相符`);
  const environment=val(spec.environment,s.scene||g.scenes.map(a=>'@'+a.name).join('、')||'保持已确认场景的真实空间结构和背景陈设');
  const composition=val(spec.composition,`${s.shotSize||'中景'}；主体位置清晰，前景/主体/后景层次分明；遵守当前轴线与视线方向；画面重点一眼可读`);
  const lensDepth=val(spec.lensDepth,lensFor(s.shotSize));
  const lighting=val(spec.lighting,s.lighting||'主光方向明确，人物与环境有自然明暗层次，曝光稳定，阴影方向和色温在镜头内保持一致');
  const colorMaterial=val(spec.colorMaterial,'色彩服务剧情情绪；肤质、布料、木材、金属、玻璃、纸张等材质保持真实微表面与合理反射，不塑料化、不油腻过锐');
  const atmosphere=val(spec.atmosphere,'保持当前剧情应有的真实生活气息与电影感，不额外制造与剧情无关的戏剧事件');
  const continuity=val(spec.continuity,`承接上一镜：${continuityShot(ctx.previous)}；为下一镜保留：${continuityShot(ctx.next)}`);
  const constraints=uniq([...(spec.constraints||[]),...baseConstraints(ctx)]);
  const bans=uniq([...(spec.forbidden||[]),...forbidden(ctx)]);
  return [
    '【分镜图提示词】',
    `镜头规格：${s.shotSize||'中景'}，${Number(s.duration||3)} 秒。`,
    `镜头目的：${intent}`,
    `画面内容：${visual}`,
    `角色与表演：${performance}`,
    `角色资产：\n${lines(roles)}`,
    `场景：${environment}\n${lines(scenes)}`,
    `道具：${text(s.props)||g.props.map(a=>'@'+a.name).join('、')||'无额外关键道具'}\n${lines(props)}`,
    `构图与机位：${composition}`,
    `镜头语言：${cameraFor(s)}`,
    `焦段与景深：${lensDepth}`,
    `光影氛围：${lighting}；${atmosphere}`,
    `色彩与材质：${colorMaterial}`,
    `声音参考：${val(spec.soundReference,soundFor(s))}`,
    `视觉风格：${styleFor(ctx,spec)}`,
    `连续性：${continuity}`,
    `资产使用规则：角色参考身份与外观，不照抄参考姿势；场景参考空间结构与材质，不照搬参考图构图；道具参考形态、尺寸、材质、正反面和握持逻辑。`,
    `当前镜头约束：\n${numbered(constraints)}`,
    `禁止事项：\n${lines(bans)}`
  ].join('\n\n');
}

function compileVideo(ctx,spec={}){
  const s=ctx.shot,g=groups(ctx.assets),beats=normalizedBeats(spec,s.duration,s);
  const roles=g.characters.map(assetLine),scenes=g.scenes.map(assetLine),props=g.props.map(assetLine);
  const constraints=uniq([...(spec.outputConstraints||spec.constraints||[]),...baseConstraints(ctx)]);
  const bans=uniq([...(spec.forbidden||[]),...forbidden(ctx)]);
  const beatText=beats.map((b,i)=>[
    `【${time(b.start)}–${time(b.end)} 秒｜阶段 ${i+1}】`,
    `画面变化：${b.visual}`,
    `主体动作：${b.subjectAction}`,
    `表情与视线：${b.expressionGaze}`,
    `手部 / 道具交互：${b.propInteraction}`,
    `环境运动：${b.environmentMotion}`,
    `运镜：${b.camera}`,
    `焦点与景深：${b.focusDepth}`,
    `声音：${b.audio}`
  ].join('\n')).join('\n\n');
  return [
    '【视频运动提示词】',
    `时序规格：${Number(s.duration||3)} 秒。`,
    `镜头目标：${val(spec.goal,s.action||'在当前时长内自然完成当前 Shot 的动作与叙事信息')}`,
    `初始状态：${val(spec.startState,`0 秒严格承接分镜首帧：${compact(s.action||'人物、道具和场景处于当前 Shot 起始状态',220)}；人物站位、视线、手部、道具和光线方向已稳定`)}`,
    `景别与镜头：${s.shotSize||'中景'}；${cameraFor(s)}`,
    `角色资产：\n${lines(roles)}`,
    `场景：${text(s.scene)||g.scenes.map(a=>'@'+a.name).join('、')||'保持已确认场景'}\n${lines(scenes)}`,
    `关键道具：${text(s.props)||g.props.map(a=>'@'+a.name).join('、')||'无额外关键道具'}\n${lines(props)}`,
    `光影：${s.lighting||'保持首帧既定主光方向、色温、曝光和阴影稳定；只允许符合动作和机位变化的自然明暗变化'}`,
    `声音总则：${soundFor(s)}`,
    `视觉风格：${styleFor(ctx,spec)}`,
    `当前分镜的分段运动：\n\n${beatText}`,
    `结束状态：${val(spec.endState,`最后一帧动作自然收束；人物身份、站位、朝向、视线、手部、道具持有关系、场景结构和光线状态稳定，能够无缝衔接下一镜：${continuityShot(ctx.next)}`)}`,
    `连续性：${val(spec.continuity,`上一镜：${continuityShot(ctx.previous)}；下一镜：${continuityShot(ctx.next)}`)}`,
    `资产使用规则：角色只参考身份与外观，不复制参考图动作；场景保持结构与左右关系，不镜像；道具保持数量、正反面、尺寸和持有关系。`,
    `输出约束：\n${numbered(constraints)}`,
    `全局禁止：\n${lines(bans)}`
  ].join('\n\n');
}

function fallbackSpec(ctx){const s=ctx.shot;return{
  imageSpec:{intent:s.action,visual:s.action,performance:'人物表演围绕当前剧情动作展开，明确表情、视线、手部和身体重心；重要道具交互必须可读',environment:s.scene,composition:`${s.shotSize||'中景'}，主体明确，前中后景层次清晰，人物与环境比例自然`,lighting:s.lighting,soundReference:soundFor(s)},
  videoSpec:{goal:s.action,startState:s.action,beats:[],endState:'动作自然完成并停在可衔接下一镜的稳定状态'}
}}
function compile(ctx,raw={}){const f=fallbackSpec(ctx);return{imagePrompt:compileImage(ctx,{...f.imageSpec,...(raw.imageSpec||{})}),videoPrompt:compileVideo(ctx,{...f.videoSpec,...(raw.videoSpec||{})})}}

function instruction(payload,duration){return `你是电影分镜导演、摄影指导、表演指导和 AI 视频生成提示词编译器。你的任务不是“总结 Shot”，而是把 Shot 编译成可以直接控制高质量图像/视频模型的生产规格。\n\n最重要原则：信息要具体、可执行、可观察。不要写空泛词，不要只重复原句，不要堆砌形容词。你可以做摄影和表演层面的合理导演决策，但不得创造剧本不存在的重要人物、事件、道具或剧情结果。\n\n必须：\n1. 完整理解 scriptSource，判断当前镜头的剧情目的、人物关系、情绪和前后因果。\n2. associatedAssets 是已经确认的角色/场景/道具资产。必须利用其 description/prompt 补足外观、空间、材质、服装、关键识别特征和道具逻辑。\n3. imageSpec 必须回答：这一帧里谁在哪里、正在做什么、表情视线如何、手和道具如何接触、前景/主体/后景是什么、机位在哪里、构图如何、焦点在哪里、光从哪里来、色彩和材质如何、与前后镜头怎么连续。\n4. videoSpec 必须回答：从 0 秒到 ${duration} 秒每一段具体怎么演、怎么动、镜头怎么走、焦点怎么变、环境里什么会动、声音何时出现。时间段连续覆盖整个时长，不重叠、不留空；${duration} 秒以上优先拆成 3 段，9 秒以上可拆 4 段。\n5. 主体动作要写成可观察的动作链，例如“右手抬起→指尖捏住纸角→纸张被风掀起→目光跟随纸张”，不要只写“自然动作”。\n6. 表情与视线要与剧情一致；写清视线对象、表情变化和动作节奏。\n7. 运镜写清方向、速度、起止对象和稳定性；不要同时安排多个互相冲突的运镜。\n8. 明确 startState 和 endState，以保证图生视频和镜头衔接稳定。\n9. 不要把“超清、电影感”当作主要内容；先把主体、动作、空间、时序、机位和光影写清楚。\n10. 只返回合法 JSON，不要 Markdown，不要解释。\n\nJSON 结构：${JSON.stringify(schema())}\n\n输入：${JSON.stringify(payload)}`}

async function apiJson(url,options={}){const res=await fetch(url,{headers:{'content-type':'application/json',...(options.headers||{})},...options}),body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(text(body.error||body.message||`HTTP ${res.status}`));return body}
function extractJson(v){const raw=text(v),candidates=[raw,...[...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1])];for(const x of candidates){try{return JSON.parse(x)}catch{}const a=x.indexOf('{'),b=x.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(x.slice(a,b+1))}catch{}}}return null}
async function runtimeFor(node){const pid=text(node?.scriptProviderId),mid=text(node?.scriptModelId);if(!pid||!mid)throw new Error('请先在脚本节点选择文本 API 供应商和模型');const ps=(await apiJson('/api/providers')).providers||[],p=ps.find(x=>String(x.id)===pid);if(!p)throw new Error('当前文本 API 供应商不存在');const m=(p.models||[]).find(x=>String(x.id)===mid);if(!m)throw new Error('当前文本模型不存在');return{pid,mid,p,m}}
async function waitTask(id,onProgress){let info;for(let i=0;i<420;i++){await sleep(700);info=(await apiJson('/api/tasks/'+encodeURIComponent(id))).task;onProgress?.(info);if(['succeeded','failed','canceled'].includes(text(info?.status)))break}if(info?.status!=='succeeded')throw new Error(text(info?.error||info?.lastError||'提示词合成失败'));return info}
async function runModel(runtime,prompt,ctx,onProgress,operation){const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:runtime.pid,modelId:runtime.mid,providerSnapshot:runtime.p,modelSnapshot:runtime.m,nodeType:'text',prompt,references:[],maxRetries:Number(ctx?.state?.workflowSettings?.maxRetries??1),parameters:{operation,responseFormat:'json_object'}})});const info=created.task?.status==='succeeded'?created.task:await waitTask(created.task.id,onProgress);const parsed=extractJson(info.output?.value??info.output?.text??'');if(!parsed)throw new Error('模型没有返回合法 JSON');return parsed}

function payloadFor(ctx){return{scriptSource:text(ctx.node?.sourceText||''),globalStyle:ctx.style,currentShot:ctx.shot,associatedAssets:(ctx.assets||[]).map(a=>({id:a.id,type:a.assetType||a.type,name:a.name,description:a.description,prompt:a.prompt,revision:a.revision})),previousShot:ctx.previous,nextShot:ctx.next}}
async function aiOne(ctx,onProgress){const runtime=await runtimeFor(ctx.node),raw=await runModel(runtime,instruction(payloadFor(ctx),Number(ctx.shot.duration||3)),ctx,onProgress,'prompt_synthesis_single_director_v3');return compile(ctx,raw)}

function cssEscape(v){return globalThis.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&')}
async function waitFor(sel,timeout=2500){const start=Date.now();while(Date.now()-start<timeout){const el=featureModal.querySelector(sel);if(el)return el;await sleep(30)}return null}
async function commit(results){const active=featureModal.querySelector('[data-script-tab].active')?.dataset.scriptTab||'';if(active!=='prompts')featureModal.querySelector('[data-script-tab="prompts"]')?.click();await waitFor('.final-prompt-list',3000);for(const x of results){const card=await waitFor(`[data-final-shot="${cssEscape(String(x.id))}"]`,2000);if(!card)continue;for(const [sel,val] of [['[data-final-image]',x.imagePrompt],['[data-final-video]',x.videoPrompt]]){const el=card.querySelector(sel);if(!el)continue;el.readOnly=false;el.value=val;el.dispatchEvent(new Event('change',{bubbles:true}))}}if(active&&active!=='prompts'){await sleep(20);featureModal.querySelector(`[data-script-tab="${cssEscape(active)}"]`)?.click()}}
function toast(msg,error=false){const el=document.querySelector('#toast');if(!el)return;el.textContent=msg;el.classList.remove('hidden');el.classList.toggle('error',error);clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add('hidden'),3500)}

async function composeOne(shotId,onProgress){const ctx=base.shotContext(shotId);if(!ctx)throw new Error('找不到当前镜头');let result;try{result=await aiOne(ctx,onProgress)}catch(error){console.warn('[FinalPromptV3] AI synthesis failed, using complete deterministic compiler',error);result=compile(ctx,{})}await commit([{id:String(shotId),...result}]);return result}

async function bulk(){if(bulkRunning)return;const ids=[...featureModal.querySelectorAll('.final-prompt-list [data-final-shot]')].map(x=>String(x.dataset.finalShot||'')).filter(Boolean);if(!ids.length)return toast('当前没有镜头',true);bulkRunning=true;try{for(let i=0;i<ids.length;i++){const id=ids[i],btn=featureModal.querySelector('#fpv4Bulk');if(btn)btn.textContent=`AI 合成 ${i+1}/${ids.length}`;await composeOne(id,t=>{if(btn&&Number(t?.progress)>0)btn.textContent=`第 ${i+1}/${ids.length} 镜 · ${Math.round(Number(t.progress))}%`})}toast(`已合成 ${ids.length} 个导演级完整提示词`)}finally{bulkRunning=false}}

function openRich(id){return typeof legacy.openRich==='function'?legacy.openRich(id):undefined}

globalThis.FuietFinalPromptProduction=Object.freeze({version:3,compileImage,compileVideo,compile,composeOne,bulk,openRich});
})();
