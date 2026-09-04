/* Fuiet Script Node · Built-in Short Drama Skill Pack v2 safe runtime
 *
 * Uses the existing, proven script_breakdown task lifecycle and only strengthens
 * the prompt contract. This avoids client-side virtual task orchestration, which
 * could make the Script node report “剧本解析失败” when one nested pass failed.
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

const VERSION='20260904-script-skill-pack-safe-2';
const SKILLS=Object.freeze([
  'short-drama-write',
  'short-drama-assets',
  'short-drama-storyboard',
  'short-drama-image-prompts',
  'short-drama-video-prompts',
  'short-drama-review'
]);
const baseFetch=globalThis.fetch?.bind(globalThis);
if(typeof baseFetch!=='function')return;

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

const BREAKDOWN_RULES=`
[Fuiet 脚本节点内置 Short Drama Skill Pack]
你必须在一次结构化输出中依次完成以下职责，但不要暴露分析过程：
short-drama-write → short-drama-assets → short-drama-storyboard → short-drama-review。

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
- 资产 prompt 只描述资产本身的稳定视觉锚点，不写剧情动作和运镜。

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

四、生成提示词边界
- imagePrompt 只写“本镜起始静态画面”的额外信息，不写终点才发生的动作。
- videoPrompt 只写本镜从起点到终点的动作、表演、声音和运镜，不改变剧本事实。
- 不重复改写已经属于资产的稳定脸、服装、场景结构。

五、最终审查（short-drama-review）
输出前自行删除/修复：
- 原文没有的重要人物、动作、关系、物证、结果或对白；
- 漏掉或重复的关键剧情；
- 同一人物/场景/道具被误拆成多个身份；
- 功能路人被错误升级为主要资产；
- action 没有“起点/主要动作/终点”；
- 相邻镜头人物/持物/道具状态跳变；
- characters/props 使用不存在的资产名称；
- imagePrompt 写了终点动作；videoPrompt 改写剧情；
- 时长装不下对白/动作。
修复只能通过删错、补漏、调整分镜边界和表达完成，不能新编剧情。

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
        skillStages:['short-drama-write','short-drama-assets','short-drama-storyboard','short-drama-review']
      };
      return baseFetch(input,withJsonBody(init,body));
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
  return baseFetch(input,init);
}

globalThis.fetch=intercept;
globalThis.FuietScriptNodeSkillPack=Object.freeze({
  installed:true,
  version:VERSION,
  mode:'single-task-safe',
  skills:SKILLS,
  breakdownRules:BREAKDOWN_RULES,
  promptRules:PROMPT_RULES,
  deterministicCheck
});
})();
