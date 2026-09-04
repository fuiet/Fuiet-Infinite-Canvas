/* Fuiet Script Node · Built-in Short Drama Skill Pack v3 safe runtime
 *
 * Keeps the proven single script_breakdown task lifecycle while strengthening
 * story / asset / storyboard contracts. Asset descriptions stay concise for
 * humans; asset prompts become production-grade visual design specifications.
 *
 * Inspired by:
 * - zenstory-ai/drama-skills (MIT)
 * - eternityspring/shuohao-skills (Apache-2.0)
 *
 * No media is generated here.
 */
(()=>{
'use strict';
if(globalThis.FuietScriptNodeSkillPack?.installed)return;

const VERSION='20260904-script-skill-pack-detailed-assets-3';
const SKILLS=Object.freeze([
  'short-drama-write',
  'short-drama-assets',
  'short-drama-storyboard',
  'short-drama-image-prompts',
  'short-drama-video-prompts',
  'short-drama-review',
  'character-visual-asset-prompt',
  'scene-visual-asset-prompt',
  'prop-visual-asset-prompt'
]);
const baseFetch=globalThis.fetch?.bind(globalThis);
if(typeof baseFetch!=='function')return;

const trackedBreakdownTasks=new Set();
const text=v=>String(v??'').trim();
const arr=v=>Array.isArray(v)?v:[];

function requestUrl(input){return typeof input==='string'?input:String(input?.url||'')}
function methodOf(input,init={}){return String(init.method||input?.method||'GET').toUpperCase()}
function pathnameOf(input){try{return new URL(requestUrl(input),location.href).pathname}catch{return requestUrl(input).split('?')[0]}}
async function requestBodyJson(input,init={}){
  const raw=init.body;
  if(typeof raw==='string'){try{return JSON.parse(raw)}catch{return null}}
  if(raw&&typeof raw==='object'&&!(typeof FormData!=='undefined'&&raw instanceof FormData))return raw;
  if(typeof Request!=='undefined'&&input instanceof Request){try{return await input.clone().json()}catch{}}
  return null;
}
function withJsonBody(init={},body){
  const headers=new Headers(init.headers||{});
  if(!headers.has('content-type'))headers.set('content-type','application/json');
  return{...init,headers,body:JSON.stringify(body)};
}
function responseWithJson(res,body){
  const headers=new Headers(res.headers);headers.set('content-type','application/json; charset=utf-8');headers.set('cache-control','no-store');
  return new Response(JSON.stringify(body),{status:res.status,statusText:res.statusText,headers});
}

const ASSET_PROMPT_RULES=`
六、专业资产生成提示词（强制执行）
资产的 description 和 prompt 职责完全不同：
- description：给用户快速阅读的简洁资料，只写身份、剧情已知事实和最关键视觉识别点，建议 40–120 个中文字符。
- prompt：给图像模型使用的完整视觉生产规范，必须明显比 description 详细，不得只是 description 的改写或扩写一两句。

A. 角色 characters[].prompt（建议 350–700 个中文字符）
每个主要角色都要形成“可直接生成角色设定图”的完整提示词，至少覆盖：
1) 角色身份：姓名、性别、年龄段、职业/社会身份、时代与地域语境；
2) 身材比例：身高感、体型、肩颈、四肢比例、体态；
3) 面部：脸型、眉眼、鼻唇、下颌、肤色、辨识特征；
4) 发型：长度、颜色、质感、刘海/分缝/束发方式；
5) 表情与气质：默认中性表情、眼神、角色气质；
6) 服装：上装、下装/裙装、外套、颜色、面料、剪裁、层次、职业/时代合理性；
7) 鞋袜与配饰：鞋型、袜子、眼镜、首饰、手表、发饰等；没有剧情依据时保持克制，不加夸张标志物；
8) 角色设定图构图：专业 character sheet，优先包含正面头部特写 + 全身正面 + 全身侧面 + 全身背面（版面允许时可增加 3/4 视角），各视图五官、发型、身材、服装完全一致，完整露出头、手、脚，不裁切，不重叠；
9) 背景与摄影：纯净中性背景，柔和棚拍光/均匀轮廓光，清楚展示服装材质、皮肤和轮廓，不使用剧情场景；
10) 禁止项：禁止文字、水印、标签、Logo、边框、额外人物、重复肢体、服装随机变化、发型随机变化、不同视图身份漂移。
如果剧本没有给出纯视觉细节，可根据职业、年龄、时代、地域和全局风格做保守且自洽的美术设计选择；这些只能是“视觉设计补全”，不能新增剧情关系、伤势、身份、道具或故事事实。

B. 场景 scenes[].prompt（建议 280–600 个中文字符）
必须形成“可直接生成场景设定图/空间母版”的完整提示词，至少覆盖：
1) 场景身份与时代地域；2) 空间尺度与建筑/室内结构；3) 前中后景区域布局与人物活动动线；4) 固定家具、门窗、柜台、墙面等关键锚点；5) 材质、颜色、磨损/新旧程度；6) 时间、天气、主光方向、色温、环境光；7) 推荐母版机位与透视；8) 画面默认不出现主要角色，除非场景资产本身必须有人群；9) 后续不同镜头必须保持门窗、家具、柜台和关键物件位置一致；10) 禁止文字、水印、随机换布局、随机改变建筑结构。

C. 道具 props[].prompt（建议 220–450 个中文字符）
必须形成“可直接生成道具设定图”的完整提示词，至少覆盖：
1) 道具名称、用途、归属/使用者（若剧情明确）；2) 大小与比例；3) 形状与结构；4) 主辅材质与表面质感；5) 主色、辅色、磨损/使用痕迹；6) 剧情关键可识别细节；7) 正面/侧面/背面/关键细节视图或产品设定图构图；8) 中性背景与均匀产品光；9) 多视图结构、颜色和细节保持一致；10) 禁止额外物体、文字水印、结构随机变化。

资产 Prompt 总原则：
- 全局视觉风格必须融入每个资产 prompt，但不要把剧情镜头动作、运镜、对白写入资产 prompt。
- 对已明确的外形/服装/材质绝不能擅改；对于未明确的纯美术细节，可以做与人物身份和时代相符的合理补全。
- prompt 需要具体、可视化、可执行，避免“好看、精致、高级、有氛围”等空泛形容词单独出现。
- 角色、场景、道具的 prompt 不得复用同一模板后只替换名称；必须体现各自独有的视觉身份。
`;

const BREAKDOWN_RULES=`
[Fuiet 脚本节点内置 Short Drama Skill Pack]
你必须在一次结构化输出中依次完成以下职责，但不要暴露分析过程：
short-drama-write → short-drama-assets → character/scene/prop visual asset prompt → short-drama-storyboard → short-drama-review。

一、剧情事实层（short-drama-write）
- 原剧本事实、人物关系、事件顺序、对白含义、观众知情时机不可擅改。
- 禁止为了“更有戏”“更电影感”补造原文没有的重要动作、冲突、证据、关系、动机、反转或结局。
- 含混指代不要猜；采用最保守且不新增事实的表达。

二、资产拆解（short-drama-assets）
- 身份 ≠ 变体 ≠ 镜头瞬态。
- 换衣、受伤、湿污、昼夜等通常是同一身份的状态/变体，不得新建成另一个人物。
- 姿势、视线、左右手、站位、相机角度属于镜头瞬态，不得写进角色资产身份。
- 只有需要跨镜/跨场保持辨识一致性的主要角色和重要配角进入 characters。
- 匿名路人、顾客群、一次性服务员、背景人群默认不要建立角色资产，除非后续必须再次识别或承担关键剧情。
- 场景按“同一空间身份”复用，不要把每个机位拆成新场景。
- 道具只保留剧情关键、跨镜持续、会发生状态变化或需要辨识一致性的物件；普通桌椅杯盘和背景装饰不要滥建。

${ASSET_PROMPT_RULES}

三、分镜（short-drama-storyboard）
- 你只能决定“怎么拍”，不能决定“发生什么”。
- 原剧本关键动作、对白、声音和画面文字必须被镜头覆盖，不能漏、不能重复发生。
- 每镜只承担一个主要叙事职责和一条主要可见状态链。
- action 必须写成精确结构：起点：……；主要动作：……；终点：……。
- 下一镜起点必须能承接上一镜终点。人物位置、朝向、视线、双手、持物、伤势和道具状态不能镜外瞬移。
- 拿起/递交/放下/交接必须写清人物、接触方式和最终落点。
- dialogue 忠实原剧本；可以按镜头拆分原文台词，但不得改写、补写或让同一句重复。
- shotSize、lighting、cameraMovement 只服务叙事可读性，不为了炫技破坏剧情。
- duration 必须是数字秒；按动作与对白真实容量分配，单镜 0.5–15 秒。

四、镜头生成提示词边界
- imagePrompt 只写“本镜起始静态画面”的额外信息，不写终点才发生的动作。
- videoPrompt 只写本镜从起点到终点的动作、表演、声音和运镜，不改变剧本事实。
- 不重复改写已经属于资产的稳定脸、服装、场景结构。

五、最终审查（short-drama-review）
输出前自行删除/修复：
- 原文没有的重要人物、动作、关系、物证、结果或对白；
- 漏掉或重复的关键剧情；
- 同一人物/场景/道具被误拆成多个身份；
- 功能路人被错误升级为主要资产；
- 资产 description 与 prompt 内容几乎相同，或者角色 prompt 明显少于专业角色设定所需信息；
- 角色 prompt 缺少服装/发型/表情/构图/一致性限制，场景 prompt 缺少空间布局/材质/光线/一致性限制，道具 prompt 缺少结构/材质/比例/多视图要求；
- action 没有“起点/主要动作/终点”；
- 相邻镜头人物/持物/道具状态跳变；
- characters/props 使用不存在的资产名称；
- imagePrompt 写了终点动作；videoPrompt 改写剧情；
- 时长装不下对白/动作。
修复只能通过删错、补漏、调整资产视觉设计、分镜边界和表达完成，不能新编剧情。

重要输出要求：
- 只返回调用方指定的合法 JSON 对象；不要 Markdown、不要代码围栏、不要解释、不要前后缀。
- 必须保留调用方 schema 的字段名和层级。
`;

const PROMPT_RULES=`
[Fuiet 内置 Skill：short-drama-image-prompts + short-drama-video-prompts]
只把已确认镜头翻译为生成提示词，不重写镜头或剧情。
- imagePrompt = 静态起始帧：构图、景别、可见人物、场景、光线、起始姿态；禁止写终点才发生的动作。
- videoPrompt = 静态锚点 → 起点 → 唯一主要动作 → 次级反应 → 运镜 → 声音 → 终点。
- 对白/旁白保持原文并在本镜只出现一次；不添加台词、字幕、角色、道具或剧情动作。
- 资产引用只使用输入中已有的精确 @资产名，不新造近义名。
- 人物、双手、持物、伤势和道具状态必须与镜头 action 的起终状态一致。
- 只返回调用方要求的合法 JSON，不要 Markdown。
`;

function deterministicCheck(result){
  const issues=[];
  if(!arr(result?.shots).length)issues.push('没有有效镜头');
  arr(result?.shots).forEach((s,i)=>{
    if(!text(s.action))issues.push(`镜头${i+1}缺少可视化动作`);
    if(!text(s.scene))issues.push(`镜头${i+1}缺少场景`);
    const d=Number(s.duration);if(!(d>0&&d<=15))issues.push(`镜头${i+1}时长异常`);
  });
  return{ok:issues.length===0,issues};
}

function assetText(a){return text(typeof a==='string'?a:(a?.description||a?.desc||a?.prompt||''))}
function assetName(a){return text(typeof a==='string'?a:(a?.name||a?.title||'未命名'))}
function assetPrompt(a){return text(typeof a==='object'?a?.prompt:'')}
function promptKeywordScore(value,words){const s=text(value);return words.reduce((n,w)=>n+(s.includes(w)?1:0),0)}
function detailedEnough(kind,prompt){
  const p=text(prompt);
  if(kind==='character')return p.length>=260&&promptKeywordScore(p,['发型','服装','表情','鞋','配饰','构图','背景','光','一致'])>=5;
  if(kind==='scene')return p.length>=210&&promptKeywordScore(p,['空间','布局','材质','光','机位','一致','门','背景'])>=4;
  return p.length>=170&&promptKeywordScore(p,['比例','结构','材质','颜色','视图','背景','光','一致'])>=4;
}
function baseKnown(a){return [assetText(a),assetPrompt(a)].filter(Boolean).join('；')||'仅依据剧本中已知身份与用途进行视觉设计';}
function fallbackCharacterPrompt(a,style=''){
  return `专业影视角色设定图，角色：${assetName(a)}。已知设定：${baseKnown(a)}。${style?`全局视觉风格：${style}。`:''}角色身份与剧情事实保持不变；在剧本未明确的纯视觉部分，根据年龄、职业、时代与地域做克制且自洽的美术设计补全。完整定义身高感与体型比例、肩颈与四肢体态；明确脸型、眉形、眼型与眼神、鼻唇、下颌、肤色和可重复识别的面部特征；明确发型长度、发色、发质、刘海或分缝方式；默认表情自然中性，体现角色气质但不过度表演。服装必须写清上装、下装或裙装、外套层次、主辅颜色、面料、剪裁和职业时代合理性，并补充鞋袜、眼镜、首饰、手表或必要配饰。构图采用高质量 character sheet：正面头部特写 + 全身正面 + 全身侧面 + 全身背面，版面允许可增加 3/4 视角；所有视图五官、发型、身材比例、服装、鞋和配饰完全一致，完整露出头、手、脚，各视图互不遮挡。纯净中性背景，柔和均匀棚拍光和清晰轮廓光，真实表现肤色、发丝和布料材质。禁止文字、水印、标签、Logo、边框、额外人物、裁切、重复肢体、不同视图身份漂移、随机换装、随机换发型。`;
}
function fallbackScenePrompt(a,style=''){
  return `专业影视场景设定图 / 空间母版，场景：${assetName(a)}。已知设定：${baseKnown(a)}。${style?`全局视觉风格：${style}。`:''}保持剧本确定的时代、地域与空间身份不变；对未明确的纯美术细节做克制、可拍摄、可持续复用的设计。清楚定义空间尺度、建筑或室内结构、前景/中景/后景层级、人物主要活动动线、入口出口、门窗、柜台、固定家具和关键陈设的相对位置；明确墙面、地面、木材、金属、玻璃、织物等材质与新旧磨损程度；明确主色与辅色、时间段、天气、主光方向、色温、环境反射光和阴影软硬。使用能看清整体布局的广角母版机位与自然透视，画面默认不出现主要角色，避免无关人群抢占空间信息。后续所有镜头必须保持建筑结构、门窗、柜台、家具和关键陈设位置一致。禁止文字、水印、随机更换布局、随机改变建筑结构、不可解释的家具增减和与剧情无关的装饰堆砌。`;
}
function fallbackPropPrompt(a,style=''){
  return `专业影视道具设定图，物件：${assetName(a)}。已知设定：${baseKnown(a)}。${style?`全局视觉风格：${style}。`:''}严格保持剧情确定的用途、归属和关键识别信息；对未明确的纯造型细节做符合时代、场景和使用者身份的克制设计。明确物体真实大小与人体/桌面比例、整体轮廓、分件结构、连接方式、边角形态；明确主材质与辅材质、表面粗糙度或光泽、主色辅色、磨损、折痕、污渍或使用痕迹，并突出剧情需要持续识别的关键细节。采用产品设定图构图，包含正面、侧面、背面和关键细节近景，多视图比例、结构、颜色、纹理完全一致；中性纯色背景，均匀产品摄影光，轮廓和材质清晰。禁止额外无关物体、文字水印、结构随机变化、颜色漂移、不同视图比例不一致。`;
}
function normalizeAssetList(list,kind,style){
  return arr(list).map(item=>{
    if(typeof item==='string')return item;
    if(!item||typeof item!=='object')return item;
    const next={...item},p=assetPrompt(next);
    if(!detailedEnough(kind,p))next.prompt=kind==='character'?fallbackCharacterPrompt(next,style):kind==='scene'?fallbackScenePrompt(next,style):fallbackPropPrompt(next,style);
    return next;
  });
}
function ensureDetailedAssetPrompts(input){
  if(!input||typeof input!=='object')return input;
  const obj=JSON.parse(JSON.stringify(input)),assets=obj.assets;if(!assets||typeof assets!=='object')return obj;
  const style=text(obj.style||obj.globalStyle||'');
  if(Array.isArray(assets.characters))assets.characters=normalizeAssetList(assets.characters,'character',style);
  else if(Array.isArray(assets.roles))assets.roles=normalizeAssetList(assets.roles,'character',style);
  if(Array.isArray(assets.scenes))assets.scenes=normalizeAssetList(assets.scenes,'scene',style);
  if(Array.isArray(assets.props))assets.props=normalizeAssetList(assets.props,'prop',style);
  else if(Array.isArray(assets.objects))assets.objects=normalizeAssetList(assets.objects,'prop',style);
  return obj;
}
function extractJson(raw){
  const s=text(raw);if(!s)return null;
  const fenced=[...s.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1]);
  for(const candidate of [...fenced,s]){
    try{return JSON.parse(candidate)}catch{}
    const a=candidate.indexOf('{'),b=candidate.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(candidate.slice(a,b+1))}catch{}}
  }
  return null;
}
function rewriteTaskOutput(task){
  if(!task||task.status!=='succeeded'||!task.output)return false;
  for(const key of ['value','text','url']){
    if(typeof task.output[key]!=='string')continue;
    const parsed=extractJson(task.output[key]);if(!parsed||!parsed.assets)continue;
    task.output[key]=JSON.stringify(ensureDetailedAssetPrompts(parsed));
    return true;
  }
  return false;
}

async function intercept(input,init={}){
  const path=pathnameOf(input),method=methodOf(input,init);
  if(method==='POST'&&/\/api\/tasks\/?$/.test(path)){
    const body=await requestBodyJson(input,init);
    const op=String(body?.parameters?.operation||'');
    if(body&&op==='script_breakdown'){
      const original=String(body.prompt||'');
      body.prompt=`${BREAKDOWN_RULES}\n\n${original}`;
      body.parameters={
        ...(body.parameters||{}),
        operation:'script_breakdown',
        responseFormat:'json_object',
        skillPack:VERSION,
        skillMode:'single-task-safe',
        assetPromptDetail:'production-grade',
        skillStages:['short-drama-write','short-drama-assets','character-visual-asset-prompt','scene-visual-asset-prompt','prop-visual-asset-prompt','short-drama-storyboard','short-drama-review']
      };
      const res=await baseFetch(input,withJsonBody(init,body));
      try{const json=await res.clone().json(),id=String(json?.task?.id||json?.id||'');if(id)trackedBreakdownTasks.add(id)}catch{}
      return res;
    }
    if(body&&op==='prompt_synthesis'){
      body.prompt=`${PROMPT_RULES}\n\n${String(body.prompt||'')}`;
      body.parameters={
        ...(body.parameters||{}),
        operation:'prompt_synthesis',
        responseFormat:'json_object',
        skillPack:VERSION,
        skillMode:'single-task-safe',
        skillStages:['short-drama-image-prompts','short-drama-video-prompts']
      };
      return baseFetch(input,withJsonBody(init,body));
    }
  }

  const match=path.match(/\/api\/tasks\/([^/?]+)\/?$/);
  if(method==='GET'&&match&&trackedBreakdownTasks.has(decodeURIComponent(match[1]))){
    const res=await baseFetch(input,init);if(!res.ok)return res;
    try{
      const body=await res.clone().json(),task=body?.task||body;
      if(rewriteTaskOutput(task))return responseWithJson(res,body);
      return res;
    }catch{return res}
  }

  return baseFetch(input,init);
}

globalThis.fetch=intercept;
globalThis.FuietScriptNodeSkillPack=Object.freeze({
  installed:true,
  version:VERSION,
  mode:'single-task-safe',
  skills:SKILLS,
  breakdownRules:BREAKDOWN_RULES,
  assetPromptRules:ASSET_PROMPT_RULES,
  promptRules:PROMPT_RULES,
  deterministicCheck,
  ensureDetailedAssetPrompts,
  detailedEnough
});
})();
