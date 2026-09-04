/* Fuiet Script Node · Built-in Short Drama Skill Pack v1
 *
 * Runtime adaptation inspired by:
 * - zenstory-ai/drama-skills (MIT): short-drama-write/assets/storyboard/video-prompts/review
 * - eternityspring/shuohao-skills (Apache-2.0): deterministic production-QA ideas
 *
 * This file does not generate media. It upgrades the existing script node's text-task
 * orchestration by splitting script_breakdown into owner-style passes and by strengthening
 * prompt_synthesis. Existing provider/model selection and /api/tasks execution remain intact.
 */
(()=>{
'use strict';
if(globalThis.FuietScriptNodeSkillPack?.installed)return;

const VERSION='20260904-script-skill-pack-1';
const SKILLS=Object.freeze([
  'short-drama-write',
  'short-drama-assets',
  'short-drama-storyboard',
  'short-drama-video-prompts',
  'short-drama-review'
]);
const baseFetch=globalThis.fetch?.bind(globalThis);
if(typeof baseFetch!=='function')return;

const virtualTasks=new Map();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const now=()=>new Date().toISOString();
const makeId=()=>`script_skill_${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
const text=v=>String(v??'').trim();
const arr=v=>Array.isArray(v)?v:[];

function jsonResponse(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}
function requestUrl(input){return typeof input==='string'?input:String(input?.url||'')}
function methodOf(input,init={}){return String(init.method||input?.method||'GET').toUpperCase()}
function pathnameOf(input){try{return new URL(requestUrl(input),location.href).pathname}catch{return requestUrl(input).split('?')[0]}}
async function requestBodyJson(input,init={}){
  const raw=init.body;
  if(typeof raw==='string'){try{return JSON.parse(raw)}catch{return null}}
  if(raw&&typeof raw==='object'&&!(raw instanceof FormData)){try{return JSON.parse(String(raw))}catch{}}
  if(typeof Request!=='undefined'&&input instanceof Request){try{return await input.clone().json()}catch{}}
  return null;
}
function headersFor(init={}){
  const h=new Headers(init.headers||{});if(!h.has('content-type'))h.set('content-type','application/json');return h;
}
function passInit(init={},body,method='POST'){
  return{...init,method,headers:headersFor(init),body:body==null?undefined:JSON.stringify(body),cache:'no-store'};
}
function publicTask(v){
  return{id:v.id,status:v.status,progress:Math.max(0,Math.min(100,Math.round(v.progress||0))),providerProgress:Math.max(0,Math.min(100,Math.round(v.providerProgress||0))),output:v.output||null,error:v.error||'',createdAt:v.createdAt,updatedAt:v.updatedAt,skillPack:VERSION,skillStage:v.stage||'',skillStages:SKILLS};
}
function parseStructured(raw){
  const s=text(raw);if(!s)return null;
  const fenced=[...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1]);
  for(const candidate of [...fenced,s]){
    try{return JSON.parse(candidate)}catch{}
    const a=candidate.indexOf('{'),b=candidate.lastIndexOf('}');if(a>=0&&b>a)try{return JSON.parse(candidate.slice(a,b+1))}catch{}
    const c=candidate.indexOf('['),d=candidate.lastIndexOf(']');if(c>=0&&d>c)try{return JSON.parse(candidate.slice(c,d+1))}catch{}
  }
  return null;
}
function sourceFromPrompt(prompt=''){
  const s=String(prompt||''),marker='用户剧本：',idx=s.lastIndexOf(marker);
  return text(idx>=0?s.slice(idx+marker.length):s);
}
function dedupeAssets(items=[]){
  const seen=new Set(),out=[];
  for(const raw of arr(items)){
    const item=typeof raw==='string'?{name:raw}:raw||{},name=text(item.name||item.title);if(!name)continue;
    const key=name.toLocaleLowerCase();if(seen.has(key))continue;seen.add(key);
    out.push({name,description:text(item.description),prompt:text(item.prompt||item.description)});
  }
  return out;
}
function normalizeNames(v){
  if(Array.isArray(v))return v.map(text).filter(Boolean);
  return text(v).split(/[、,，;；]/).map(text).filter(Boolean);
}
function sanitizeFinal(finalObj,assetsFallback,storyFallback){
  const f=finalObj&&typeof finalObj==='object'?finalObj:{};
  const fallbackAssets=assetsFallback?.assets||assetsFallback||{};
  const a=f.assets&&typeof f.assets==='object'?f.assets:fallbackAssets;
  const assets={characters:dedupeAssets(a.characters||a.roles),scenes:dedupeAssets(a.scenes),props:dedupeAssets(a.props||a.objects)};
  const shots=arr(f.shots).map((raw,i)=>{
    const s=raw&&typeof raw==='object'?raw:{};
    let duration=Number(s.duration);if(!Number.isFinite(duration))duration=3;duration=Math.max(.5,Math.min(15,duration));
    return{
      scene:text(s.scene||s.location||'场景'),
      characters:normalizeNames(s.characters),
      props:normalizeNames(s.props),
      shotSize:text(s.shotSize||s.shot_size||'中景'),
      lighting:text(s.lighting||s.atmosphere),
      action:text(s.action||s.visual||s.description),
      dialogue:text(s.dialogue||s.voice),
      sound:text(s.sound||s.sfx||s.audio),
      cameraMovement:text(s.cameraMovement||s.camera_movement||s.camera||'固定机位'),
      duration,
      imagePrompt:text(s.imagePrompt||s.image_prompt),
      videoPrompt:text(s.videoPrompt||s.video_prompt),
      _order:i+1
    };
  }).filter(s=>s.action||s.dialogue||s.scene);
  const style=text(f.style||storyFallback?.story?.globalStyle||storyFallback?.globalStyle||'');
  return{style,assets,shots};
}
function deterministicCheck(result){
  const issues=[];
  if(!arr(result?.shots).length)issues.push('没有有效镜头');
  arr(result?.shots).forEach((s,i)=>{
    if(!text(s.action))issues.push(`镜头${i+1}缺少可视化动作`);
    if(!text(s.scene))issues.push(`镜头${i+1}缺少场景`);
    if(!(Number(s.duration)>0&&Number(s.duration)<=15))issues.push(`镜头${i+1}时长异常`);
  });
  const dup=[];for(const bucket of ['characters','scenes','props']){
    const names=arr(result?.assets?.[bucket]).map(x=>text(x.name).toLocaleLowerCase()).filter(Boolean),seen=new Set();
    names.forEach(n=>{if(seen.has(n))dup.push(n);seen.add(n)});
  }
  if(dup.length)issues.push(`资产重名：${[...new Set(dup)].join('、')}`);
  return{ok:issues.length===0,issues};
}

function storyPrompt(source){return `你正在执行 Fuiet 脚本节点内置 Skill：short-drama-write。\n\n任务不是改编原剧本，而是建立“不可越界的剧情事实层”，供后续资产和分镜使用。\n必须遵守：\n1. 原剧本事实、人物关系、事件顺序、对白含义、观众知情时机优先，禁止为了电影感补造动作、冲突、证据、关系或结局。\n2. 每个场景只总结：进入状态、人物当下目标/阻力、可见或可听事实、发生的状态变化、退出状态。\n3. 区分主要角色、重要配角、功能角色/路人。路人和一次性环境人物不要升级成主要角色。\n4. 含混指代不能猜，写入 unresolved。\n5. 对白只记录原文事实，不润色、不续写。\n6. 只返回合法 JSON，不要 Markdown。\n\n输出：\n{"story":{"summary":"一句话剧情","globalStyle":"仅从原文/用户要求能确认的视觉方向；没有就空字符串","characters":[{"name":"姓名或称谓","importance":"major|support|functional","sourceFacts":["原文可证明事实"],"goal":"本集可证明目标或空","visibleTraits":["原文可见特征"],"continuityFacts":["跨场必须延续的事实"]}],"scenes":[{"name":"场景标准名","dramaticFunction":"这一场改变了什么","startState":"进入状态","endState":"退出状态","characters":["人物"],"props":["关键道具"],"sourceFacts":["动作/对白/声音/画面文字事实"]}],"continuity":["跨场状态"],"unresolved":["真实含混项"]}}\n\n原剧本：\n${source}`}
function assetsPrompt(source,story){return `你正在执行 Fuiet 脚本节点内置 Skill：short-drama-assets。\n\n从原剧本和已锁定剧情事实中拆人物、场景、道具。不要写镜头，不要改剧情。\n核心规则：\n1. 身份≠变体≠镜头瞬态。换衣、受伤、湿污、昼夜、开合状态通常是同一资产的变体；姿势、视线、左右手、站位、相机角度属于镜头瞬态，不能变成资产。\n2. 只有需要跨镜/跨场保持可辨识一致性的 major/support 人物进入角色资产。匿名路人、顾客群、一次性服务员等 functional 人物默认不建角色资产，除非原剧本让其承担关键剧情或必须再次识别。\n3. 场景资产按“同一空间身份”复用；同一火锅店门口/店内/后厨若地理明显不同可拆视图，但不要把每个机位变成新场景。\n4. 道具只收剧情关键、跨镜持续、状态变化或需要识别一致性的物件。普通杯子、桌椅、背景装饰不要滥建。\n5. description 写可见事实与连续性；prompt 只写资产本身的生成锚点，不写剧情动作、运镜、临时姿势。\n6. 角色 prompt 包含年龄段、体态、脸部/发型、服装和唯一识别锚点；场景 prompt 包含空间结构、固定锚点、材质和基础光态且默认无人；道具 prompt 包含材质、形状、尺度、状态且默认无手。\n7. 只返回合法 JSON。\n\n输出：{"assets":{"characters":[{"name":"","description":"","prompt":""}],"scenes":[{"name":"","description":"","prompt":""}],"props":[{"name":"","description":"","prompt":""}]}}\n\n原剧本：\n${source}\n\n剧情事实层：\n${JSON.stringify(story)}`}
function storyboardPrompt(source,story,assets){return `你正在执行 Fuiet 脚本节点内置 Skill：short-drama-storyboard。\n\n把原剧本转换为可拍、可生成的镜头。你只能决定“怎么拍”，不能决定“发生什么”。\n必须遵守：\n1. 原剧本动作、对白、声音、画面文字与事件顺序必须覆盖，禁止新增重要动作、反转、人物动机、物证、关系或结果。\n2. 每镜必须有唯一叙事职责；切镜必须带来信息、权力、情绪、空间或节奏变化，同义重复镜头删掉。\n3. action 必须使用固定结构：起点：…；主要动作：…；终点：…。起点承接上一镜终点；人物位置、朝向、视线、双手、持物和道具状态不能镜外瞬移。\n4. 一个镜头只承担一条主要可见状态链。交接/拿起/放下/递交时必须写清接触者、方式和最终落点。\n5. dialogue 必须忠实原文；需要拆镜时可以把不同原文台词分配给不同镜头，但不能改写台词或让同一句重复发生。\n6. characters/props 使用资产标准名；功能路人可出现在 action 里但不要为了引用而新造资产。\n7. shotSize、lighting、cameraMovement 服务信息和表演可读性，不要为了炫技破坏叙事。\n8. duration 为数字秒，按真实动作与对白容量分配；默认短镜头优先，但不得为了凑秒切断一个不可分的状态变化；单镜不要超过15秒。\n9. imagePrompt 只补充“本镜起始静态画面”特有的信息，不重复资产外观，不写终点动作。videoPrompt 只补充本镜动态、表演、声音与运镜，不改变剧本事实。\n10. 只返回合法 JSON。\n\n输出：{"style":"统一视觉风格","shots":[{"scene":"场景标准名","characters":["角色资产名"],"props":["道具资产名"],"shotSize":"全景/中景/近景/特写等","lighting":"光影与氛围","action":"起点：…；主要动作：…；终点：…","dialogue":"原文对白/旁白，保留说话人；没有则空","sound":"环境音/音效/音乐事实","cameraMovement":"机位与运动","duration":3,"imagePrompt":"本镜起始帧额外信息","videoPrompt":"本镜动态额外信息"}]}\n\n原剧本：\n${source}\n\n剧情事实层：\n${JSON.stringify(story)}\n\n已接受资产：\n${JSON.stringify(assets)}`}
function reviewPrompt(source,story,assets,storyboard){return `你正在执行 Fuiet 脚本节点内置 Skill：short-drama-review。\n\n这是最终“审查+保守修复”步骤。请逐项对照原剧本，把候选结果修成可直接进入 Fuiet 三阶段脚本编辑器的最终 JSON。\n审查链：原剧本事实 → 剧情事实层 → 资产 → 镜头职责/边界 → 起点/唯一动作/终点 → 下一镜状态。\n\n必须修复：\n- 候选镜头新增了原文没有的重要人物、动作、关系、物证、结果或对白；\n- 原文关键动作/对白/声音/画面文字漏掉或重复；\n- 同一人物/场景/道具被误拆成多个身份，或路人被错误升级为主要角色资产；\n- 镜头 action 没有“起点/主要动作/终点”，或相邻镜头存在站位、持物、伤势、道具状态瞬移；\n- 镜头 characters/props 与资产标准名不一致；\n- imagePrompt 写入终点才发生的动作；videoPrompt 改写剧本事实；\n- 时长明显装不下对白/动作，或单镜超过15秒。\n\n修复原则：只删错、补漏、重分镜、调整镜头表达；绝不通过新增剧情来让结果“更精彩”。真实含混保持保守，不猜。\n只返回合法 JSON，严格使用：\n{"style":"","assets":{"characters":[{"name":"","description":"","prompt":""}],"scenes":[{"name":"","description":"","prompt":""}],"props":[{"name":"","description":"","prompt":""}]},"shots":[{"scene":"","characters":[""],"props":[""],"shotSize":"","lighting":"","action":"起点：…；主要动作：…；终点：…","dialogue":"","sound":"","cameraMovement":"","duration":3,"imagePrompt":"","videoPrompt":""}]}\n\n原剧本：\n${source}\n\n剧情事实层：\n${JSON.stringify(story)}\n\n资产候选：\n${JSON.stringify(assets)}\n\n分镜候选：\n${JSON.stringify(storyboard)}`}
function consolidatedPrompt(source){return `你是 Fuiet 脚本节点内置短剧 Skill Pack。一次请求内依次执行 short-drama-write → short-drama-assets → short-drama-storyboard → short-drama-review。\n规则：严格保留原剧本事实与对白；区分主要角色/重要配角/功能路人；身份与变体/镜头瞬态分离；只为跨镜一致性建立资产；分镜只决定怎么拍、不改剧情；每镜写“起点：…；主要动作：…；终点：…”；相邻镜头人物位置、朝向、双手、持物、道具状态连续；镜头覆盖原文关键动作/对白/声音/画面文字且不重复；提示词只补本镜生成信息。\n只返回合法 JSON：{"style":"","assets":{"characters":[{"name":"","description":"","prompt":""}],"scenes":[{"name":"","description":"","prompt":""}],"props":[{"name":"","description":"","prompt":""}]},"shots":[{"scene":"","characters":[""],"props":[""],"shotSize":"","lighting":"","action":"起点：…；主要动作：…；终点：…","dialogue":"","sound":"","cameraMovement":"","duration":3,"imagePrompt":"","videoPrompt":""}]}\n\n原剧本：\n${source}`}
const PROMPT_SYNTHESIS_RULES=`\n[Fuiet 内置 Skill：short-drama-image-prompts + short-drama-video-prompts]\n你只能把已确认镜头翻译成生成提示词，不能重写镜头或剧情。\n- imagePrompt 是静态起始帧：构图/景别/可见人物/场景/光线/起始姿态；不得写终点才发生的动作。\n- videoPrompt 必须从已确认起点走到已确认终点：静态锚点 → 起点 → 唯一动作 → 次级反应 → 运镜 → 声音 → 终点。\n- 对白/旁白保持原文且在本镜只出现一次；不要额外添加台词、字幕、角色、道具或动作。\n- 引用资产时必须使用输入中现有的精确 @资产名，不能新造近义名。\n- 资产外观由参考资产控制，正文不要反复重写脸、服装、空间固定事实；只写本镜需要的状态。\n- 人物、双手、持物、伤势和道具状态必须和镜头 action 的起终状态一致。\n- 输出仍严格遵循调用方要求的 JSON schema，不要 Markdown。\n`;

async function realJson(url,init){
  const res=await baseFetch(url,init);let data=null;try{data=await res.clone().json()}catch{}
  if(!res.ok)throw new Error(text(data?.error?.message||data?.error||data?.message)||`HTTP ${res.status}`);
  return data;
}
async function runRealTask(v,collectionUrl,originalBody,originalInit,prompt,operation,progressFrom,progressTo){
  if(v.cancelled)throw new Error('任务已取消');
  v.stage=operation;v.progress=progressFrom;v.updatedAt=now();
  const body={...originalBody,prompt,parameters:{...(originalBody.parameters||{}),operation,responseFormat:'json_object',skillPack:VERSION,skillStages:SKILLS}};
  const created=await realJson(collectionUrl,passInit(originalInit,body,'POST'));
  const realId=created?.task?.id;if(!realId)throw new Error(`${operation} 未返回任务 ID`);v.activeRealTaskId=realId;
  const itemUrl=`${String(collectionUrl).replace(/\/$/,'')}/${encodeURIComponent(realId)}`;
  let info=null;
  for(let i=0;i<420;i++){
    if(v.cancelled){try{await baseFetch(itemUrl,passInit(originalInit,null,'DELETE'))}catch{}throw new Error('任务已取消')}
    await sleep(700);
    const got=await realJson(itemUrl,{...originalInit,method:'GET',headers:headersFor(originalInit),body:undefined,cache:'no-store'});info=got?.task||got;
    const p=Number(info?.providerProgress||info?.progress||0),ratio=Number.isFinite(p)&&p>0?Math.min(1,p/100):Math.min(.92,(i+1)/45);
    v.progress=progressFrom+(progressTo-progressFrom)*ratio;v.providerProgress=Number.isFinite(p)?p:0;v.updatedAt=now();
    if(['succeeded','failed','canceled'].includes(info?.status))break;
  }
  v.activeRealTaskId='';
  if(info?.status!=='succeeded')throw new Error(text(info?.error)||`${operation} 失败`);
  const out=String(info?.output?.value??info?.output?.text??info?.output?.url??'');
  if(!out)throw new Error(`${operation} 返回为空`);return out;
}
async function runPipeline(v,collectionUrl,body,init){
  const source=sourceFromPrompt(body.prompt);if(!source)throw new Error('没有检测到剧本文本');
  try{
    v.stage='short-drama-write';
    const storyRaw=await runRealTask(v,collectionUrl,body,init,storyPrompt(source),'script_skill_write',4,24),story=parseStructured(storyRaw);
    if(!story?.story)throw new Error('剧情事实层不是合法 JSON');

    const assetsRaw=await runRealTask(v,collectionUrl,body,init,assetsPrompt(source,story),'script_skill_assets',25,45),assets=parseStructured(assetsRaw);
    if(!assets?.assets)throw new Error('资产拆解不是合法 JSON');

    const boardRaw=await runRealTask(v,collectionUrl,body,init,storyboardPrompt(source,story,assets),'script_skill_storyboard',46,76),board=parseStructured(boardRaw);
    if(!Array.isArray(board?.shots))throw new Error('分镜结果不是合法 JSON');

    let finalCandidate=null;
    try{
      const reviewRaw=await runRealTask(v,collectionUrl,body,init,reviewPrompt(source,story,assets,board),'script_skill_review',77,96);
      finalCandidate=parseStructured(reviewRaw);
    }catch(reviewError){
      console.warn('[script-skill-pack] review pass failed; keeping storyboard candidate',reviewError);
      finalCandidate={style:board.style,assets:assets.assets,shots:board.shots};
    }
    const final=sanitizeFinal(finalCandidate,assets,story),qa=deterministicCheck(final);
    if(!qa.ok)throw new Error(`最终结果未通过本地质量门：${qa.issues.slice(0,5).join('；')}`);
    v.status='succeeded';v.progress=100;v.providerProgress=100;v.stage='complete';v.output={value:JSON.stringify({...final,quality:{skillPack:VERSION,checks:'passed'}})};v.updatedAt=now();
  }catch(error){
    if(v.cancelled){v.status='canceled';v.error='任务已取消';v.updatedAt=now();return}
    console.warn('[script-skill-pack] multi-pass failed; using consolidated fallback',error);
    try{
      const raw=await runRealTask(v,collectionUrl,body,init,consolidatedPrompt(source),'script_skill_fallback',8,96),parsed=parseStructured(raw),final=sanitizeFinal(parsed,null,null),qa=deterministicCheck(final);
      if(!qa.ok)throw new Error(qa.issues.join('；'));
      v.status='succeeded';v.progress=100;v.providerProgress=100;v.stage='complete-fallback';v.output={value:JSON.stringify({...final,quality:{skillPack:VERSION,checks:'fallback-passed'}})};v.updatedAt=now();
    }catch(fallbackError){v.status='failed';v.error=text(fallbackError?.message||fallbackError||error?.message||error)||'脚本 Skill Pipeline 失败';v.progress=0;v.updatedAt=now()}
  }
}

async function intercept(input,init={}){
  const path=pathnameOf(input),method=methodOf(input,init);
  if(method==='POST'&&/\/api\/tasks\/?$/.test(path)){
    const body=await requestBodyJson(input,init),op=String(body?.parameters?.operation||'');
    if(op==='script_breakdown'){
      const id=makeId(),v={id,status:'queued',progress:1,providerProgress:0,stage:'short-drama-write',output:null,error:'',createdAt:now(),updatedAt:now(),cancelled:false,activeRealTaskId:''};virtualTasks.set(id,v);
      const collectionUrl=requestUrl(input);queueMicrotask(()=>{v.status='running';v.updatedAt=now();runPipeline(v,collectionUrl,body,init).catch(err=>{v.status='failed';v.error=text(err?.message||err);v.updatedAt=now()})});
      return jsonResponse({task:publicTask(v)});
    }
    if(op==='prompt_synthesis'&&body){
      body.prompt=`${PROMPT_SYNTHESIS_RULES}\n\n${String(body.prompt||'')}`;
      body.parameters={...(body.parameters||{}),skillPack:VERSION,skillStages:['short-drama-image-prompts','short-drama-video-prompts']};
      return baseFetch(input,passInit(init,body,'POST'));
    }
  }
  const match=path.match(/\/api\/tasks\/([^/]+)\/?$/),id=match?decodeURIComponent(match[1]):'';
  if(id&&virtualTasks.has(id)){
    const v=virtualTasks.get(id);
    if(method==='GET')return jsonResponse({task:publicTask(v)});
    if(method==='DELETE'){
      v.cancelled=true;v.status='canceled';v.error='任务已取消';v.updatedAt=now();
      if(v.activeRealTaskId){try{const collection=requestUrl(input).replace(/\/[^/]+\/?$/,'');await baseFetch(`${collection}/${encodeURIComponent(v.activeRealTaskId)}`,passInit(init,null,'DELETE'))}catch{}}
      return jsonResponse({task:publicTask(v)});
    }
  }
  return baseFetch(input,init);
}

globalThis.fetch=intercept;
globalThis.FuietScriptNodeSkillPack=Object.freeze({installed:true,version:VERSION,skills:SKILLS,buildConsolidatedPrompt:consolidatedPrompt,deterministicCheck,sanitizeFinal});
})();
