from pathlib import Path
import re, json

ROOT=Path('_read_123_zip_20260821_180410')

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing patch target: {label}')
    return text.replace(old,new,1)

def re_sub_once(text, pattern, repl, label):
    out,n=re.subn(pattern,repl,text,count=1,flags=re.S)
    if n!=1:
        raise SystemExit(f'patch count {n} for {label}')
    return out

spec=r'''# Fuiet Script Workflow V1 — 产品需求、数据结构与开发顺序

> 状态：正式基线需求  
> 基线代码：`main` / `fafffedfc4dfd4dbe5ea03017e2824b1ba767733`  
> 目标：把已完善的文本、图片、视频节点串成面向短剧、漫剧、动画短片与 AI 影视的端到端故事生产线。

## 1. 产品定位

脚本节点不是单纯的“剧本拆分器”，而是整个故事生产流程的编排中枢：

**剧本 / 想法 / 参考图 → 结构化 Shot → 角色/场景/道具资产 → 全局风格 → 最终图片/视频提示词 → 批量分镜图 → 批量分镜视频 → 合成成片。**

脚本节点负责生产逻辑、关系和标准方案；普通图片节点、视频节点负责真实生成结果；任务系统负责队列、并发、重试、取消和持久化。

## 2. 核心产品原则

1. **资产一致性**：角色、场景、道具是可独立编辑、替换、复用的项目资产，不是每个 Prompt 里重复粘贴的文字。
2. **全局风格一致性**：角色、场景、道具、分镜图、分镜视频继承同一套 Global Style；Shot 可有局部覆盖，但默认继承项目风格。
3. **AI 初稿 + 人工校准 + 批量生产**：禁止把“一键到底”作为主流程。先拆解、检查、修正，再批量创建生成器组，最后由用户明确执行。
4. **单向数据流**：脚本标准方案 → 生成节点快照。用户在下游图片/视频节点里的临时修改默认不反写脚本。
5. **付费安全**：资产、Shot、全局风格变化只标记受影响结果，不自动重新调用付费模型。
6. **组不是数据容器**：解组只删除画布 Group，节点自己的 Prompt、模型、参数、资产引用和 Shot 关系必须完整保留。
7. **稳定 ID，不靠名称绑定**：资产、Shot、输出节点全部使用稳定 ID。重命名角色不能破坏引用关系。
8. **多 Shot / 多资产 / 多任务 / 多版本优先**：产品从一开始按整集生产设计，不以“单图/单视频”作为脚本节点的数据模型。

## 3. 用户工作流

### 3.1 创建脚本节点

支持：
- 双击画布或底部 “+” → 脚本；
- 文本节点拉线 → 脚本；
- 文本 + 角色图 / 场景图 / 风格图等参考素材同时连接到脚本。

新脚本必须为空白，不预置虚假的示例 Shot/资产。

### 3.2 开始生成

用户选择脚本拆解文本模型并点击生成。系统输出：
- 结构化 Shot；
- 角色、场景、道具；
- 全局视觉风格；
- 每个 Shot 的基础图片 Prompt / 视频 Motion Prompt。

### 3.3 编辑脚本节点

顶部固定三阶段：

1. **确认镜头**
   - 所有单元格直接编辑；
   - 字段至少包括：镜号、时长、画面描述、景别、光影氛围、对白/旁白、音效、运镜、颜色标记；
   - Shot 支持新增、删除、排序；
   - 文本中可 `@角色 / @场景 / @道具`，底层保存 assetId。

2. **准备资产**
   - 分类：角色、场景、道具；
   - 每个资产包含稳定 assetId、名称、描述、生成 Prompt、参考图、版本、引用 Shot 数；
   - 参考图来源：AI 生成、用户上传、从画布选择；
   - 支持新增资产和“一键创建所有缺失资产生成器”；
   - 资产变化自动把相关 Shot 标记为“提示词待同步”，但不自动重新生图/视频。

3. **合成最终提示词**
   - 输入：Shot 内容 + 资产 + Global Style + 剧情状态；
   - 每个 Shot 输出独立的 `imagePrompt` 与 `videoPrompt`；
   - 支持单个、多选、全部合成；
   - 支持人工修改；
   - Shot/资产/风格变更后提示词状态变为 dirty。

### 3.4 生产就绪

关键项完成后进入 ready。非关键资产缺失可警告后继续，不强制“一刀切”阻断。

### 3.5 批量生分镜图

1. 选择 Shot；
2. 选择图片模型、比例、质量/分辨率等参数；
3. 点击 **确认并创建生成器组**；
4. 系统只创建普通图片节点 + 普通 Group，**不立即执行**；
5. 每个图片节点自动带入：
   - Shot 标准图片 Prompt；
   - Global Style；
   - 对应角色/场景/道具参考节点；
   - 模型和参数；
   - generationSnapshot；
6. 用户可单独补参考图、改 Prompt、换模型或参数；
7. 点击组上的“整组执行”后才进入现有图片任务队列。

### 3.6 批量生视频

流程与分镜图相同。额外规则：
- 若同 Shot 已有分镜图，自动连接为视频 `first_frame`；
- 同时继承角色、场景、道具引用；
- 没有分镜图时允许文生视频；
- 后续可扩展首尾帧；
- 用户明确“整组执行”后进入现有视频任务队列。

### 3.7 合成成片

多个 Shot 视频按脚本顺序连接到合成节点。第一版目标：稳定按顺序合成为 MP4；后续逐步加入转场、字幕、旁白、BGM、音效、裁剪、片头片尾和时间线。

## 4. 核心数据结构

### 4.1 ScriptData

```js
{
  schemaVersion: 1,
  style: 'legacy alias',
  globalStyle: {
    text: '现代都市·真人写实电影…',
    referenceNodeIds: [],
    referenceMediaUrls: [],
    revision: 0,
    updatedAt: ''
  },
  assets: { characters: [], scenes: [], props: [] },
  shots: [],
  workflow: {
    stage: 'draft|shots|assets|prompts|ready',
    shotsConfirmed: false,
    assetsReady: false,
    promptsReady: false,
    updatedAt: ''
  },
  production: { image: {}, video: {} },
  quality: { shots: {}, baseline: null },
  finalized: false
}
```

`style` 暂时保留为旧代码兼容字段；新逻辑以 `globalStyle.text` 为正式字段。

### 4.2 Asset

```js
{
  id: 'asset_xxx',
  type: 'character|scene|prop',
  name: '苏宁',
  description: '结构化资产描述',
  prompt: '用于资产生成与一致性引用的视觉 Prompt',
  mediaUrl: '',
  nodeIds: [],
  versions: [],
  revision: 0,
  updatedAt: ''
}
```

名称是显示字段，不是关系主键。

### 4.3 Shot

```js
{
  id: 'shot_xxx',
  no: 1,
  color: '#55616b',
  scene: '',
  characters: '',
  props: '',
  shotSize: '中景',
  lighting: '',
  action: '',
  dialogue: '',
  sound: '',
  cameraMovement: '',
  duration: 5,
  assetRefs: [],
  baseImagePrompt: '',
  baseVideoPrompt: '',
  imagePrompt: '',
  videoPrompt: '',
  promptStatus: 'empty|dirty|ready|failed',
  promptDirty: false,
  dirtyReason: '',
  promptRevision: 0,
  outputs: {
    imageNodeIds: [],
    videoNodeIds: [],
    selectedImageNodeId: '',
    selectedVideoNodeId: ''
  }
}
```

### 4.4 GenerationSnapshot

创建下游图片/视频节点时保存“创建当时”的不可变生产快照：

```js
{
  schemaVersion: 1,
  createdAt: '',
  scriptNodeId: '',
  shotId: '',
  shotNo: 1,
  type: 'image|video',
  prompt: '',
  globalStyle: { text: '', revision: 0 },
  assets: [{ id, type, name, revision, mediaUrl, prompt }],
  providerId: '',
  modelId: '',
  parameters: { aspectRatio, duration, priority }
}
```

下游修改只改节点自身，不修改这个 Shot 的标准方案；如果需要“同步回脚本”，未来必须是显式操作。

### 4.5 ShotOutput

Shot 明确记录对应生产节点，而不是只靠标题或画布位置推断：

```js
outputs: {
  imageNodeIds: ['node_1', 'node_2'],
  videoNodeIds: ['node_8'],
  selectedImageNodeId: 'node_2',
  selectedVideoNodeId: 'node_8'
}
```

现有 `toolParams.scriptNodeId / shotId` 继续保留，形成双向可恢复关系。

## 5. 数据变更规则

- 修改 Shot → Shot promptDirty=true；不自动生成。
- 修改资产 → 所有引用该 assetId 的 Shot dirty；不自动生成。
- 修改 Global Style → 全部受影响 Shot dirty；不自动生成。
- 删除 Shot → 默认只删除脚本关系，不自动删除已经付费生成的图片/视频。
- 解组 → 不删除节点数据。
- 下游节点改 Prompt/模型/参数 → 不回写上游 Script。
- 已有结果允许多版本；Shot 可选择一个“当前采用版本”。

## 6. 当前代码现状（基线审查）

已存在并应复用：
- `ensureScriptData`、结构化 AI 拆解；
- 角色/场景/道具资产；
- assetRefs 与 Prompt dirty 影响传播；
- 图片 Prompt / 视频 Prompt 合成；
- 图片/视频批量节点与 Group；
- 视频自动连接同 Shot 分镜图为 first_frame；
- 任务队列、成本预估、重试/取消；
- 跨集资产一致性、剧情状态机、连续性检查、质检与生产看板。

第一批缺口：
- 新脚本仍预置假 Shot/假资产；
- Shot 表缺光影/音效/运镜；
- 批量界面仍鼓励创建后自动执行；
- 资产引用未统一显式连到每个 Shot 生产节点；
- 缺正式 GenerationSnapshot；
- Shot 输出关系主要依赖反查节点，缺明确 outputs 契约；
- Global Style 仍主要是单字符串，没有正式结构化版本字段。

## 7. 开发顺序

### Phase 0 — 数据契约与兼容迁移（现在）
- 新增 `script-workflow-core.js`；
- ScriptData schemaVersion；
- GlobalStyle / ShotOutput / GenerationSnapshot；
- 老项目无损 normalize；
- 新脚本改为空白；
- 回归测试。

### Phase 1 — Shot 编辑工作台
- 增加光影氛围、音效、运镜；
- 完善 promptStatus；
- 三阶段进度条；
- 单元格编辑与 dirty 传播。

### Phase 2 — 资产抽屉
- 卡片总览 + 右侧抽屉；
- AI 生成 / 上传 / 从画布选择；
- 稳定 assetId；
- 缺失资产批量创建；
- Global Style 引用图。

### Phase 3 — @资产编辑器
- `@` 唤起资产菜单；
- 文本显示名称，底层保存 assetId；
- 资产重命名不破坏 Shot；
- 自动建立生产依赖边。

### Phase 4 — 最终提示词工作台
- 单 Shot / 多选 / 全部合成；
- imagePrompt / videoPrompt；
- 标准 Prompt 与任务临时 Prompt 分层；
- 风格/资产版本影响提示。

### Phase 5 — 分镜图生成器组
- 只创建不自动跑；
- 自动连角色/场景/道具；
- GenerationSnapshot；
- Group 检查后整组执行；
- ShotOutput 多版本。

### Phase 6 — 分镜视频生成器组
- 对应分镜图自动 first_frame；
- 资产继承；
- 文生/图生/首尾帧策略；
- 多版本与采用版本。

### Phase 7 — 合成节点
- Shot 顺序拼接 MP4；
- 后续转场、声音、字幕、时间线。

## 8. 第一阶段验收标准

- 新建脚本没有示例 Shot/示例资产；
- 旧项目打开后数据不丢；
- Shot 有 lighting / sound / cameraMovement；
- Global Style 有 revision；
- 批量创建默认不立即扣费执行；
- 图片/视频生成器节点记录 generationSnapshot；
- 对应资产节点自动连到 Shot 生成器；
- Shot 明确登记 image/video node IDs；
- 解组后所有节点配置仍在；
- `npm run check` 和 `npm test` 全绿。
'''
(ROOT/'SCRIPT_WORKFLOW_PRODUCT_REQUIREMENTS.md').write_text(spec,encoding='utf-8')

core=r'''/* Fuiet Infinite Canvas · Script Workflow Core V1
 * Stable data contract for Script → Shot → Asset → Image → Video production.
 */
(()=>{
'use strict';
const root=globalThis;
const SCHEMA_VERSION=1;
const DEFAULT_STYLE='电影感写实';
const isoNow=()=>new Date().toISOString();
const arr=v=>Array.isArray(v)?v:[];
const text=v=>String(v??'');
const unique=v=>[...new Set(arr(v).map(x=>String(x||'').trim()).filter(Boolean))];
function makeId(prefix,uid){if(typeof uid==='function')return uid(prefix);return `${prefix}_${Math.random().toString(36).slice(2,10)}`}
function normalizeAsset(raw,type,uid){const a=raw&&typeof raw==='object'?raw:{name:raw};a.id=a.id||makeId(type==='character'?'char':type==='scene'?'scene':'prop',uid);a.type=type;a.name=text(a.name||a.title||'未命名资产');a.description=text(a.description||'');a.prompt=text(a.prompt||a.description||'');a.mediaUrl=text(a.mediaUrl||a.referenceUrl||'');a.nodeIds=unique(a.nodeIds);a.versions=arr(a.versions);a.revision=Math.max(0,Number(a.revision||0));a.updatedAt=text(a.updatedAt||'');return a}
function normalizeShot(raw,index,uid){const s=raw&&typeof raw==='object'?raw:{};s.id=s.id||makeId('shot',uid);s.no=Math.max(1,Number(s.no||index+1));s.color=text(s.color||'#55616b');s.scene=text(s.scene||'');s.characters=Array.isArray(s.characters)?s.characters.join('、'):text(s.characters||'');s.props=Array.isArray(s.props)?s.props.join('、'):text(s.props||'');s.shotSize=text(s.shotSize||s.shot_size||'中景');s.lighting=text(s.lighting||s.atmosphere||s.light||'');s.action=text(s.action||s.visual||s.description||'');s.dialogue=text(s.dialogue||s.voice||'');s.sound=text(s.sound||s.sfx||s.audio||'');s.cameraMovement=text(s.cameraMovement||s.camera_movement||s.movement||s.camera||'');s.duration=Math.max(.5,Number(s.duration||3));s.assetRefs=unique(s.assetRefs);s.baseImagePrompt=text(s.baseImagePrompt||s.imagePrompt||s.image_prompt||'');s.baseVideoPrompt=text(s.baseVideoPrompt||s.videoPrompt||s.video_prompt||'');s.imagePrompt=text(s.imagePrompt||s.image_prompt||'');s.videoPrompt=text(s.videoPrompt||s.video_prompt||'');s.promptDirty=Boolean(s.promptDirty);s.dirtyReason=text(s.dirtyReason||'');s.promptRevision=Math.max(0,Number(s.promptRevision||0));s.promptStatus=s.promptDirty?'dirty':(s.imagePrompt||s.videoPrompt?'ready':'empty');const outputs=s.outputs&&typeof s.outputs==='object'?s.outputs:{};s.outputs={imageNodeIds:unique(outputs.imageNodeIds||s.imageNodeIds),videoNodeIds:unique(outputs.videoNodeIds||s.videoNodeIds),selectedImageNodeId:text(outputs.selectedImageNodeId||''),selectedVideoNodeId:text(outputs.selectedVideoNodeId||'')};return s}
function normalizeScriptData(raw,options={}){const uid=options.uid,d=raw&&typeof raw==='object'?raw:{};d.schemaVersion=SCHEMA_VERSION;const legacyStyle=text(d.style||'').trim(),existingStyle=text(d.globalStyle?.text||'').trim(),styleText=existingStyle||legacyStyle||DEFAULT_STYLE;d.style=styleText;d.globalStyle={...(d.globalStyle&&typeof d.globalStyle==='object'?d.globalStyle:{}),text:styleText,referenceNodeIds:unique(d.globalStyle?.referenceNodeIds),referenceMediaUrls:unique(d.globalStyle?.referenceMediaUrls),revision:Math.max(0,Number(d.globalStyle?.revision||0)),updatedAt:text(d.globalStyle?.updatedAt||'')};const assets=d.assets&&typeof d.assets==='object'?d.assets:{};d.assets={characters:arr(assets.characters).map(a=>normalizeAsset(a,'character',uid)),scenes:arr(assets.scenes).map(a=>normalizeAsset(a,'scene',uid)),props:arr(assets.props).map(a=>normalizeAsset(a,'prop',uid))};d.shots=arr(d.shots).map((s,i)=>normalizeShot(s,i,uid));d.shots.forEach((s,i)=>s.no=i+1);const wf=d.workflow&&typeof d.workflow==='object'?d.workflow:{};const promptReady=d.shots.length>0&&d.shots.every(s=>!s.promptDirty&&Boolean(s.imagePrompt||s.videoPrompt));d.workflow={stage:text(wf.stage||(!d.shots.length?'draft':d.finalized&&promptReady?'ready':'shots')),shotsConfirmed:Boolean(wf.shotsConfirmed),assetsReady:Boolean(wf.assetsReady),promptsReady:Boolean(wf.promptsReady||d.finalized&&promptReady),updatedAt:text(wf.updatedAt||'')};d.production=d.production&&typeof d.production==='object'?d.production:{image:{},video:{}};d.production.image=d.production.image&&typeof d.production.image==='object'?d.production.image:{};d.production.video=d.production.video&&typeof d.production.video==='object'?d.production.video:{};d.quality=d.quality&&typeof d.quality==='object'?d.quality:{shots:{},baseline:null};d.quality.shots=d.quality.shots&&typeof d.quality.shots==='object'?d.quality.shots:{};if(!('baseline'in d.quality))d.quality.baseline=null;d.finalized=Boolean(d.finalized);return d}
function createDefaultScriptData(options={}){return normalizeScriptData({schemaVersion:SCHEMA_VERSION,style:DEFAULT_STYLE,globalStyle:{text:DEFAULT_STYLE,referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},assets:{characters:[],scenes:[],props:[]},shots:[],workflow:{stage:'draft',shotsConfirmed:false,assetsReady:false,promptsReady:false,updatedAt:''},production:{image:{},video:{}},quality:{shots:{},baseline:null},finalized:false},options)}
function setGlobalStyle(d,value){normalizeScriptData(d);const next=text(value).trim()||DEFAULT_STYLE;if(d.globalStyle.text!==next){d.globalStyle.text=next;d.style=next;d.globalStyle.revision=Math.max(0,Number(d.globalStyle.revision||0))+1;d.globalStyle.updatedAt=isoNow();for(const shot of d.shots)markShotDirty(shot,'全局风格已修改');d.finalized=false;d.workflow.promptsReady=false;d.workflow.stage=d.shots.length?'prompts':'draft';d.workflow.updatedAt=isoNow()}return d.globalStyle}
function markShotDirty(shot,reason='内容已修改'){if(!shot)return shot;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=isoNow();return shot}
function markShotPromptReady(shot){if(!shot)return shot;shot.promptDirty=false;shot.promptStatus=(shot.imagePrompt||shot.videoPrompt)?'ready':'empty';shot.dirtyReason='';shot.promptRevision=Math.max(0,Number(shot.promptRevision||0))+1;shot.promptUpdatedAt=isoNow();return shot}
function createGenerationSnapshot({scriptNodeId='',shot,type='image',globalStyle={},assets=[],providerId='',modelId='',parameters={}}={}){const ids=new Set(unique(shot?.assetRefs));const selected=arr(assets).filter(a=>ids.has(a.id)).map(a=>({id:a.id,type:a.assetType||a.type||'',name:text(a.name),revision:Math.max(0,Number(a.revision||0)),mediaUrl:text(a.mediaUrl),prompt:text(a.prompt)}));return{schemaVersion:1,createdAt:isoNow(),scriptNodeId:text(scriptNodeId),shotId:text(shot?.id),shotNo:Number(shot?.no||0),type:type==='video'?'video':'image',prompt:text(type==='video'?shot?.videoPrompt:shot?.imagePrompt),globalStyle:{text:text(globalStyle?.text||globalStyle||''),revision:Math.max(0,Number(globalStyle?.revision||0))},assets:selected,providerId:text(providerId),modelId:text(modelId),parameters:JSON.parse(JSON.stringify(parameters||{}))}}
function registerShotOutput(shot,type,nodeId){if(!shot||!nodeId)return shot;normalizeShot(shot,Math.max(0,Number(shot.no||1)-1));const key=type==='video'?'videoNodeIds':'imageNodeIds';shot.outputs[key]=unique([...shot.outputs[key],nodeId]);if(type==='video'&&!shot.outputs.selectedVideoNodeId)shot.outputs.selectedVideoNodeId=nodeId;if(type!=='video'&&!shot.outputs.selectedImageNodeId)shot.outputs.selectedImageNodeId=nodeId;return shot}
root.CanvasScriptWorkflowCore=Object.freeze({SCHEMA_VERSION,DEFAULT_STYLE,normalizeScriptData,createDefaultScriptData,setGlobalStyle,markShotDirty,markShotPromptReady,createGenerationSnapshot,registerShotOutput});
})();
'''
(ROOT/'script-workflow-core.js').write_text(core,encoding='utf-8')

app=(ROOT/'app.js').read_text(encoding='utf-8')

app=re_sub_once(app,r"  function ensureScriptData\(n\)\{.*?\n  \}\n\n  function openScriptEditor",r'''  function ensureScriptData(n){
    const Core=globalThis.CanvasScriptWorkflowCore;
    if(Core?.normalizeScriptData){
      if(!n.scriptData)n.scriptData=Core.createDefaultScriptData({uid});
      else Core.normalizeScriptData(n.scriptData,{uid});
      return n.scriptData;
    }
    if(n.scriptData)return n.scriptData;
    n.scriptData={style:'电影感写实',assets:{characters:[],scenes:[],props:[]},shots:[],production:{image:{},video:{}},finalized:false};
    return n.scriptData;
  }

  function openScriptEditor''','ensureScriptData')

app=re_sub_once(app,r"  function scriptShotsHtml\(n,d\)\{.*?\n  function scriptAssetsHtml",r'''  function scriptShotsHtml(n,d){return `<div class="script-top-actions"><div class="script-source">${field('剧本 / 故事',`<textarea id="scriptSource" rows="3" placeholder="输入完整剧本或故事梗概…">${escapeHtml(n.sourceText||'')}</textarea>`,true)}</div><div class="script-ai-config">${providerModelSelectHtml('text',n.scriptProviderId||'',n.scriptModelId||'','script')}</div><button id="aiBreakdownScript" class="primary">AI 拆解</button></div><div class="script-table-wrap"><table class="script-editor-table"><thead><tr><th>序号</th><th>标记</th><th>场景</th><th>角色</th><th>景别</th><th>光影氛围</th><th>动作 / 画面</th><th>对白 / 旁白</th><th>音效</th><th>运镜</th><th>时长</th><th>生产</th><th>顺序</th><th></th></tr></thead><tbody>${d.shots.map((s,i)=>`<tr data-shot-row="${s.id}"><td><span class="shot-drag">≡</span>${i+1}</td><td><input data-shot="color" type="color" value="${s.color||'#55616b'}"></td><td><input data-shot="scene" value="${escapeAttr(s.scene||'')}"></td><td><input data-shot="characters" value="${escapeAttr(s.characters||'')}"></td><td><select data-shot="shotSize">${['大全景','全景','中景','近景','特写','极特写'].map(x=>`<option ${x===s.shotSize?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea data-shot="lighting">${escapeHtml(s.lighting||'')}</textarea></td><td><textarea data-shot="action">${escapeHtml(s.action||'')}</textarea></td><td><textarea data-shot="dialogue">${escapeHtml(s.dialogue||'')}</textarea></td><td><textarea data-shot="sound">${escapeHtml(s.sound||'')}</textarea></td><td><textarea data-shot="cameraMovement">${escapeHtml(s.cameraMovement||'')}</textarea></td><td><input data-shot="duration" type="number" min=".5" step=".5" value="${Number(s.duration||3)}"></td><td>${shotProductionCellHtml(n,s)}</td><td><button data-move-shot="up" data-shot-id="${s.id}">↑</button><button data-move-shot="down" data-shot-id="${s.id}">↓</button></td><td><button data-delete-shot="${s.id}">×</button></td></tr>`).join('')}</tbody></table></div><div class="script-bottom-actions"><button id="addShot">＋ 新增 shot</button><button id="synthesizePrompts">合成最终提示词</button><button id="scriptGoProduction" class="primary">进入分镜生产线 →</button><button id="scriptProductionDashboard">整集看板</button><button id="scriptContinuityAudit">连续性检查</button><span class="spacer"></span><button id="downloadScript">导出 JSON</button></div>`}
  function scriptAssetsHtml''','scriptShotsHtml')

app=re_sub_once(app,r"  function scriptBatchHtml\(n,d,defaultType\)\{.*?\n\n  function bindScriptTab",r'''  function scriptBatchHtml(n,d,defaultType){const type=defaultType||'image';return `<div class="batch-panel"><div class="batch-flow-banner"><div><b>脚本 → 生成器组 → 人工检查 → 整组执行</b><span>确认后只在画布创建已装配 Prompt、资产引用和模型参数的生成器组，不会立即提交付费任务。</span></div></div><div class="batch-config"><label>生成类型<select id="batchType"><option value="image" ${type==='image'?'selected':''}>批量生分镜图</option><option value="video" ${type==='video'?'selected':''}>批量生视频</option></select></label><div id="batchProviderModels">${providerModelSelectHtml(type,n.batchProviderId||'',n.batchModelId||'','batch')}</div><label>画幅比<select id="batchRatio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option></select></label><label>队列优先级<select id="batchPriority"><option value="90">高 · 90</option><option value="50" selected>普通 · 50</option><option value="10">低 · 10</option></select></label><label>范围<select id="batchRange"><option>全部镜头</option><option>已勾选镜头</option></select></label></div><div class="batch-shot-list">${d.shots.map(s=>`<label><input type="checkbox" data-batch-shot="${s.id}" checked><span>Shot ${s.no}</span><b>${escapeHtml(s.action)}</b><small>${escapeHtml((type==='image'?s.imagePrompt:s.videoPrompt)||'尚未合成提示词')}</small></label>`).join('')}</div><div id="batchCostPreview" class="batch-cost-preview"></div><div class="feature-actions"><button id="batchCreateGroup" class="primary">确认并创建生成器组</button></div></div>`}

  function bindScriptTab''','scriptBatchHtml')

app=replace_once(app,"function markScriptShotDirty(shot,reason='内容已修改'){if(!shot)return;shot.promptDirty=true;shot.dirtyReason=reason;shot.dirtyAt=new Date().toISOString()}","function markScriptShotDirty(shot,reason='内容已修改'){const Core=globalThis.CanvasScriptWorkflowCore;if(Core?.markShotDirty)return Core.markShotDirty(shot,reason);if(!shot)return;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=new Date().toISOString()}",'markScriptShotDirty')

old_synth="function synthesizeScriptPrompts(n){\n    const d=ensureScriptData(n),cat=scriptAssetCatalog(d);(d.shots||[]).forEach(s=>{s.assetRefs=matchShotAssets(s,d);const assets=s.assetRefs.map(id=>cat.find(a=>a.id===id)).filter(Boolean);const assetText=assets.map(a=>`@${a.name}（${a.prompt||'保持资产一致'}）`).join('；'),stateText=narrativeStatePrompt(n,s);const baseImage=s.baseImagePrompt||s.imagePrompt||'',baseVideo=s.baseVideoPrompt||s.videoPrompt||'';s.baseImagePrompt=s.baseImagePrompt||baseImage;s.baseVideoPrompt=s.baseVideoPrompt||baseVideo;s.imagePrompt=[`整体风格：${d.style}`,`景别：${s.shotSize}`,`画面：${s.action}`,s.scene?`场景：${s.scene}`:'',assetText?`一致性资产：${assetText}`:'',stateText,baseImage?`补充：${baseImage}`:''].filter(Boolean).join('。')+'。';s.videoPrompt=[`镜头画面：${s.action}`,s.dialogue?`对白/旁白：${s.dialogue}`:'',assetText?`保持主体/场景/道具：${assets.map(a=>'@'+a.name).join('、')}`:'',stateText,baseVideo||'动作自然，镜头调度符合叙事',`目标时长约 ${Number(s.duration||3)} 秒`].filter(Boolean).join('。')+'。';s.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,s));s.promptDirty=false;s.dirtyReason='';});d.finalized=true;d.finalizedAt=new Date().toISOString();saveState();showToast('最终图像 / 视频提示词已按资产引用重新合成');\n  }"
new_synth="function synthesizeScriptPrompts(n){\n    const d=ensureScriptData(n),cat=scriptAssetCatalog(d),Core=globalThis.CanvasScriptWorkflowCore;(d.shots||[]).forEach(s=>{s.assetRefs=matchShotAssets(s,d);const assets=s.assetRefs.map(id=>cat.find(a=>a.id===id)).filter(Boolean);const assetText=assets.map(a=>`@${a.name}（${a.prompt||'保持资产一致'}）`).join('；'),stateText=narrativeStatePrompt(n,s);const baseImage=s.baseImagePrompt||s.imagePrompt||'',baseVideo=s.baseVideoPrompt||s.videoPrompt||'';s.baseImagePrompt=s.baseImagePrompt||baseImage;s.baseVideoPrompt=s.baseVideoPrompt||baseVideo;s.imagePrompt=[`整体风格：${d.globalStyle?.text||d.style}`,`景别：${s.shotSize}`,s.lighting?`光影氛围：${s.lighting}`:'',`画面：${s.action}`,s.scene?`场景：${s.scene}`:'',assetText?`一致性资产：${assetText}`:'',stateText,baseImage?`补充：${baseImage}`:''].filter(Boolean).join('。')+'。';s.videoPrompt=[`镜头画面：${s.action}`,s.cameraMovement?`运镜：${s.cameraMovement}`:'',s.dialogue?`对白/旁白：${s.dialogue}`:'',s.sound?`音效：${s.sound}`:'',s.lighting?`光影氛围：${s.lighting}`:'',assetText?`保持主体/场景/道具：${assets.map(a=>'@'+a.name).join('、')}`:'',stateText,baseVideo||'动作自然，镜头调度符合叙事',`目标时长约 ${Number(s.duration||3)} 秒`].filter(Boolean).join('。')+'。';s.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,s));if(Core?.markShotPromptReady)Core.markShotPromptReady(s);else{s.promptDirty=false;s.promptStatus='ready';s.dirtyReason=''}});d.finalized=true;d.finalizedAt=new Date().toISOString();d.workflow=d.workflow||{};d.workflow.promptsReady=true;d.workflow.stage='ready';d.workflow.updatedAt=d.finalizedAt;saveState();showToast('最终图像 / 视频提示词已按资产引用重新合成');\n  }"
app=replace_once(app,old_synth,new_synth,'synthesizeScriptPrompts')

app=replace_once(app,"d.shots.push({id:uid('shot'),no:d.shots.length+1,color:'#4e6570',scene:'',characters:'',shotSize:'中景',action:'新增镜头',dialogue:'',duration:3,imagePrompt:'',videoPrompt:''})","d.shots.push({id:uid('shot'),no:d.shots.length+1,color:'#4e6570',scene:'',characters:'',props:'',shotSize:'中景',lighting:'',action:'新增镜头',dialogue:'',sound:'',cameraMovement:'',duration:3,assetRefs:[],baseImagePrompt:'',baseVideoPrompt:'',imagePrompt:'',videoPrompt:'',promptStatus:'empty',promptDirty:false,outputs:{imageNodeIds:[],videoNodeIds:[],selectedImageNodeId:'',selectedVideoNodeId:''}})",'add shot')

app=replace_once(app,"$('#scriptStyle').onchange=()=>{d.style=$('#scriptStyle').value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));d.finalized=false;saveState()}","$('#scriptStyle').onchange=()=>{const value=$('#scriptStyle').value,Core=globalThis.CanvasScriptWorkflowCore;if(Core?.setGlobalStyle)Core.setGlobalStyle(d,value);else{d.style=value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));d.finalized=false}saveState()}",'global style change')
app=replace_once(app,"$('#synthesizeAgain').onclick=()=>{d.style=$('#scriptStyle').value;synthesizeScriptPrompts(n);rerender()};$('#aiSynthesizePrompts').onclick=()=>{d.style=$('#scriptStyle').value;aiSynthesizeScriptPrompts(n)}","$('#synthesizeAgain').onclick=()=>{const Core=globalThis.CanvasScriptWorkflowCore;if(Core?.setGlobalStyle)Core.setGlobalStyle(d,$('#scriptStyle').value);else d.style=$('#scriptStyle').value;synthesizeScriptPrompts(n);rerender()};$('#aiSynthesizePrompts').onclick=()=>{const Core=globalThis.CanvasScriptWorkflowCore;if(Core?.setGlobalStyle)Core.setGlobalStyle(d,$('#scriptStyle').value);else d.style=$('#scriptStyle').value;aiSynthesizeScriptPrompts(n)}",'global style synth')

app=re_sub_once(app,r"    if\(tab==='batch'\)\{.*?\n    \}\n  \}\n\n  function extractStructuredJson",r'''    if(tab==='batch'){
      $('#batchType').onchange=()=>{initialTab=$('#batchType').value==='video'?'batch-video':'batch-image';openScriptEditor(n,initialTab)};
      $('#batchProvider').onchange=()=>{n.batchProviderId=$('#batchProvider').value;n.batchModelId='';saveState();openScriptEditor(n,$('#batchType').value==='video'?'batch-video':'batch-image')};$('#batchModel').onchange=()=>{n.batchModelId=$('#batchModel').value;saveState();refreshCost()};
      const refreshCost=()=>{const type=$('#batchType').value,pid=$('#batchProvider').value,mid=$('#batchModel').value,model=providerById(pid)?.models?.find(m=>m.id===mid),pricing=model?.pricing||model?.capabilities?.pricing,shots=$$('[data-batch-shot]:checked',featureModal).map(x=>d.shots.find(s=>s.id===x.dataset.batchShot)).filter(Boolean);let total=0,known=Boolean(pricing);if(known){for(const shot of shots){total+=Number(pricing.perRequest||0);if(type==='image')total+=Number(pricing.perImage||0);else total+=Number(pricing.perSecond||0)*Number(shot.duration||3)}}$('#batchCostPreview').innerHTML=known?`预计费用：<b>${escapeHtml(pricing.currency||'USD')} ${total.toFixed(total<1?4:2)}</b> · ${shots.length} 个镜头 <small>这里只创建生成器组；真正整组执行时再产生供应商费用。</small>`:`${shots.length} 个镜头 · <b>模型未配置价格，无法预估费用</b> <small>这里只创建生成器组，不会立即执行。</small>`};$$('[data-batch-shot]',featureModal).forEach(x=>x.onchange=refreshCost);$('#batchPriority').value=String(n.batchPriority??state.workflowSettings?.defaultPriority??50);$('#batchPriority').onchange=()=>{n.batchPriority=Number($('#batchPriority').value);saveState()};$('#batchCreateGroup').onclick=()=>batchCreateFromScript(n,d,$('#batchType').value,{autoRun:false});refreshCost();
    }
  }

  function extractStructuredJson''','batch binding')

app=replace_once(app,"const schema={style:'统一视觉风格',assets:{characters:[{name:'角色名',description:'身份外形服装',prompt:'用于一致性生成的视觉提示词'}],scenes:[{name:'场景名',description:'空间布局和光线',prompt:'场景一致性提示词'}],props:[{name:'道具名',description:'外观归属',prompt:'道具一致性提示词'}]},shots:[{scene:'场景名',characters:['角色名'],props:['道具名'],shotSize:'全景/中景/近景/特写',action:'可视化动作与调度',dialogue:'对白或旁白',duration:3,imagePrompt:'只写本镜头额外图像信息',videoPrompt:'运镜、动作、声音额外信息'}]};","const schema={style:'统一视觉风格',assets:{characters:[{name:'角色名',description:'身份外形服装',prompt:'用于一致性生成的视觉提示词'}],scenes:[{name:'场景名',description:'空间布局和光线',prompt:'场景一致性提示词'}],props:[{name:'道具名',description:'外观归属',prompt:'道具一致性提示词'}]},shots:[{scene:'场景名',characters:['角色名'],props:['道具名'],shotSize:'全景/中景/近景/特写',lighting:'光影氛围',action:'可视化动作与调度',dialogue:'对白或旁白',sound:'环境音/音效',cameraMovement:'运镜方式',duration:3,imagePrompt:'只写本镜头额外图像信息',videoPrompt:'运镜、动作、声音额外信息'}]};",'AI breakdown schema')

app=replace_once(app,"if(obj.style)d.style=String(obj.style);const assets=obj.assets||{};","if(obj.style){d.style=String(obj.style);d.globalStyle=d.globalStyle||{};d.globalStyle.text=d.style;d.globalStyle.revision=Math.max(0,Number(d.globalStyle.revision||0))+1;d.globalStyle.updatedAt=new Date().toISOString()}const assets=obj.assets||{};",'apply style')

old_shot_return="return{id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:String(x.scene||''),characters:Array.isArray(x.characters)?x.characters.join('、'):String(x.characters||''),props:Array.isArray(x.props)?x.props.join('、'):String(x.props||''),shotSize:String(x.shotSize||x.shot_size||'中景'),action:String(x.action||x.visual||x.description||''),dialogue:String(x.dialogue||x.voice||''),duration:Math.max(.5,Number(x.duration||3)),baseImagePrompt:String(x.imagePrompt||x.image_prompt||''),baseVideoPrompt:String(x.videoPrompt||x.video_prompt||''),imagePrompt:String(x.imagePrompt||x.image_prompt||''),videoPrompt:String(x.videoPrompt||x.video_prompt||''),assetRefs:names.map(v=>nameMap.get(v)).filter(Boolean)};"
new_shot_return="return{id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:String(x.scene||''),characters:Array.isArray(x.characters)?x.characters.join('、'):String(x.characters||''),props:Array.isArray(x.props)?x.props.join('、'):String(x.props||''),shotSize:String(x.shotSize||x.shot_size||'中景'),lighting:String(x.lighting||x.atmosphere||''),action:String(x.action||x.visual||x.description||''),dialogue:String(x.dialogue||x.voice||''),sound:String(x.sound||x.sfx||''),cameraMovement:String(x.cameraMovement||x.camera_movement||x.movement||''),duration:Math.max(.5,Number(x.duration||3)),baseImagePrompt:String(x.imagePrompt||x.image_prompt||''),baseVideoPrompt:String(x.videoPrompt||x.video_prompt||''),imagePrompt:String(x.imagePrompt||x.image_prompt||''),videoPrompt:String(x.videoPrompt||x.video_prompt||''),promptStatus:'empty',promptDirty:false,assetRefs:names.map(v=>nameMap.get(v)).filter(Boolean),outputs:{imageNodeIds:[],videoNodeIds:[],selectedImageNodeId:'',selectedVideoNodeId:''}};"
app=replace_once(app,old_shot_return,new_shot_return,'breakdown shot fields')

production=r'''  function scriptProductionConfig(scriptNode,d,type){
    const prod=d.production?.[type]||{},pid=prod.providerId||scriptNode.batchProviderId||'',mid=prod.modelId||scriptNode.batchModelId||'',model=providerById(pid)?.models?.find(m=>m.id===mid);return{providerId:pid,modelId:mid,modelName:model?.name||mid,aspectRatio:prod.aspectRatio||'16:9',priority:Number(prod.priority??scriptNode.batchPriority??state.workflowSettings?.defaultPriority??50)};
  }
  function scriptGenerationSnapshot(scriptNode,d,shot,type,config={}){
    const Core=globalThis.CanvasScriptWorkflowCore;if(!Core?.createGenerationSnapshot)return null;return Core.createGenerationSnapshot({scriptNodeId:scriptNode.id,shot,type,globalStyle:d.globalStyle||{text:d.style||''},assets:scriptAssetCatalog(d),providerId:config.providerId||'',modelId:config.modelId||'',parameters:{aspectRatio:config.aspectRatio||'16:9',duration:Number(shot.duration||3),priority:Number(config.priority??50)}});
  }
  function connectShotAssetReferences(scriptNode,d,shot,targetNode){
    const catalog=scriptAssetCatalog(d),ids=matchShotAssets(shot,d);shot.assetRefs=ids;for(const assetId of ids){const asset=catalog.find(a=>a.id===assetId);if(!asset)continue;const role=asset.assetType==='character'?'character_reference':asset.assetType==='scene'?'scene_reference':'image_reference';for(const sourceId of (asset.nodeIds||[])){if(sourceId===targetNode.id||!state.nodes.some(x=>x.id===sourceId))continue;if(state.edges.some(e=>e.source===sourceId&&e.target===targetNode.id&&e.role===role))continue;state.edges.push(makeSemanticEdge(sourceId,targetNode.id,'asset',role))}}
  }
  function registerShotProductionNode(shot,type,nodeId){globalThis.CanvasScriptWorkflowCore?.registerShotOutput?.(shot,type,nodeId)}
  function createScriptShotProductionNode(scriptNode,d,shot,type,config,index=0){
    const node={id:uid('n'),type,x:scriptNode.x+560+(index%4)*380,y:scriptNode.y+Math.floor(index/4)*320,w:340,title:`Shot ${shot.no} · ${type==='image'?'分镜图':'视频'}`,content:'',prompt:type==='image'?shot.imagePrompt:shot.videoPrompt,providerId:config.providerId,modelId:config.modelId,modelName:config.modelName,aspectRatio:config.aspectRatio||'16:9',duration:shot.duration,queuePriority:config.priority,toolParams:{operation:type==='image'?'script_batch_image':'script_batch_video',shotId:shot.id,scriptNodeId:scriptNode.id,autoFlow:false,generationSnapshot:scriptGenerationSnapshot(scriptNode,d,shot,type,config)}};state.nodes.push(node);createEdge(scriptNode.id,node.id,{type:'script',role:'script_context',silent:true});connectShotAssetReferences(scriptNode,d,shot,node);if(type==='video'){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}registerShotProductionNode(shot,type,node.id);return node;
  }
  async function regenerateScriptShots(scriptNode,shotIds,type){
    const d=ensureScriptData(scriptNode);if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(scriptNode);const config=scriptProductionConfig(scriptNode,d,type);if(!config.providerId||!config.modelId){showToast(`还没有保存${type==='video'?'视频':'图片'}生产模型，请先进入批量生成设置一次`);openScriptEditor(scriptNode,type==='video'?'batch-video':'batch-image');return []}snapshot(`重新生成部分 ${type==='video'?'视频':'分镜图'}`);const ids=[];for(const [i,shotId] of shotIds.entries()){const shot=d.shots.find(s=>s.id===shotId);if(!shot)continue;let node=latestShotProductionNode(scriptNode.id,shot.id,type);if(!node){node=createScriptShotProductionNode(scriptNode,d,shot,type,config,i);const prod=d.production?.[type];if(prod){prod.nodeIds=[...new Set([...(prod.nodeIds||[]),node.id])];const g=state.groups.find(x=>x.id===prod.groupId);if(g&&!g.nodeIds.includes(node.id))g.nodeIds.push(node.id)}}else{if(node.frozen){const ok=confirm(`Shot ${shot.no} 的${type==='video'?'视频':'分镜图'}已冻结。是否解除冻结并重新生成？`);if(!ok)continue;node.frozen=false}node.prompt=type==='image'?shot.imagePrompt:shot.videoPrompt;node.runCacheKey='';node.taskError='';node.taskStatus='';if(!node.providerId||!node.modelId){node.providerId=config.providerId;node.modelId=config.modelId;node.modelName=config.modelName}connectShotAssetReferences(scriptNode,d,shot,node);node.toolParams=node.toolParams||{};node.toolParams.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,{...config,providerId:node.providerId,modelId:node.modelId,modelName:node.modelName,aspectRatio:node.aspectRatio||config.aspectRatio});registerShotProductionNode(shot,type,node.id);if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}}ids.push(node.id)}saveState();render();if(!ids.length)return[];showToast(`正在重新生成 ${ids.length} 个 ${type==='video'?'视频':'分镜图'}镜头`);await executeWorkflowIds(ids,{title:`部分 Shot 重新生成 · ${type==='video'?'视频':'分镜图'}`,force:true});return ids;
  }

  async function batchCreateFromScript(n,d,type,{autoRun=false}={}){
    if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(n);const ids=$$('[data-batch-shot]:checked',featureModal).map(x=>x.dataset.batchShot),pid=$('#batchProvider').value,mid=$('#batchModel').value;if(!pid||!mid){showToast('请选择第三方 API 供应商与模型');return}const priority=Math.max(0,Math.min(100,Number($('#batchPriority')?.value??n.batchPriority??50))),ratio=$('#batchRatio').value,modelName=providerById(pid)?.models?.find(m=>m.id===mid)?.name||mid;n.batchPriority=priority;n.batchProviderId=pid;n.batchModelId=mid;n.scriptAutoFlow=false;snapshot('脚本创建生成器组');const created=[],shotNodeMap={},config={providerId:pid,modelId:mid,modelName,aspectRatio:ratio,priority};ids.forEach((id,i)=>{const shot=d.shots.find(x=>x.id===id);if(!shot)return;const node=createScriptShotProductionNode(n,d,shot,type,config,i);created.push(node.id);shotNodeMap[shot.id]=node.id});const group=createGroup(created,type==='image'?'脚本分镜组':'分镜视频生成组',type==='image'?'storyboard':'workflow',{grid:created.length<=4?'2x2':created.length<=9?'3x3':'4x4',ratio,scriptNodeId:n.id,shotNodeMap,autoFlow:false});d.production=d.production||{};d.production[type]={groupId:group?.id||'',nodeIds:created,createdAt:new Date().toISOString(),priority,providerId:pid,modelId:mid,aspectRatio:ratio};saveState();render();if(type==='image')autoLayoutNodes(created,{direction:'LR',mode:'compact',fit:true});closeFeatureModal();showToast(`已创建 ${created.length} 个${type==='image'?'分镜图':'视频'}生成器 · 请检查后使用组工具栏“整组执行”`);return created;
  }

'''
app=re_sub_once(app,r"  function scriptProductionConfig\(scriptNode,d,type\)\{.*?\n\n  function downloadJson",production+"  function downloadJson",'production pipeline')

(ROOT/'app.js').write_text(app,encoding='utf-8')

# Load the core before app.js and bump deployment cache key consistently.
boot=(ROOT/'browser-bootstrap.js').read_text(encoding='utf-8')
old_build='20260901-video-wait-progress-1'; new_build='20260901-script-workflow-v1-1'
boot=boot.replace(old_build,new_build)
boot=replace_once(boot,"const canvasScripts=[\n  `./provider-auto-config-v1.js?v=${v}`,\n  `./app.js?v=${v}`,","const canvasScripts=[\n  `./provider-auto-config-v1.js?v=${v}`,\n  `./script-workflow-core.js?v=${v}`,\n  `./app.js?v=${v}`,",'bootstrap core order')
(ROOT/'browser-bootstrap.js').write_text(boot,encoding='utf-8')
for fn in ['index.html','models.html']:
    p=ROOT/fn
    p.write_text(p.read_text(encoding='utf-8').replace(old_build,new_build),encoding='utf-8')
for p in (ROOT/'tests').glob('*.test.mjs'):
    t=p.read_text(encoding='utf-8')
    if old_build in t:p.write_text(t.replace(old_build,new_build),encoding='utf-8')

package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
check=package['scripts']['check']
if 'script-workflow-core.js' not in check:
    check=check.replace('node --check app.js','node --check script-workflow-core.js && node --check app.js')
    package['scripts']['check']=check
(ROOT/'package.json').write_text(json.dumps(package,ensure_ascii=False,indent=2)+"\n",encoding='utf-8')

test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

await import('../script-workflow-core.js');
const Core=globalThis.CanvasScriptWorkflowCore;
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

let i=0;const uid=p=>`${p}_${++i}`;

test('new Script Workflow V1 data starts empty and structured',()=>{
  const d=Core.createDefaultScriptData({uid});
  assert.equal(d.schemaVersion,1);
  assert.equal(d.shots.length,0);
  assert.deepEqual(d.assets,{characters:[],scenes:[],props:[]});
  assert.equal(d.globalStyle.text,'电影感写实');
  assert.equal(d.workflow.stage,'draft');
});

test('legacy script data migrates without losing shots or assets',()=>{
  const d={style:'旧电影风',assets:{characters:[{id:'c1',name:'阿宁',prompt:'白衣'}],scenes:[],props:[]},shots:[{id:'s1',no:1,scene:'',characters:'阿宁',shotSize:'近景',action:'抬头',dialogue:'',duration:4,imagePrompt:'图',videoPrompt:'视频'}],finalized:true};
  Core.normalizeScriptData(d,{uid});
  assert.equal(d.shots.length,1);
  assert.equal(d.assets.characters[0].id,'c1');
  assert.equal(d.globalStyle.text,'旧电影风');
  assert.equal(d.shots[0].lighting,'');
  assert.deepEqual(d.shots[0].outputs.imageNodeIds,[]);
});

test('generation snapshot freezes prompt, style and asset revisions',()=>{
  const shot={id:'s1',no:1,assetRefs:['a1'],imagePrompt:'原提示词',videoPrompt:'动作',duration:5};
  const assets=[{id:'a1',assetType:'character',name:'角色A',revision:3,mediaUrl:'/a.png',prompt:'固定脸'}];
  const snap=Core.createGenerationSnapshot({scriptNodeId:'script1',shot,type:'image',globalStyle:{text:'写实',revision:2},assets,providerId:'p',modelId:'m',parameters:{aspectRatio:'9:16'}});
  shot.imagePrompt='后来修改';assets[0].prompt='后来修改资产';
  assert.equal(snap.prompt,'原提示词');
  assert.equal(snap.globalStyle.revision,2);
  assert.equal(snap.assets[0].revision,3);
  assert.equal(snap.assets[0].prompt,'固定脸');
});

test('shot outputs support multiple image and video production nodes',()=>{
  const shot={id:'s1',no:1};
  Core.registerShotOutput(shot,'image','img1');
  Core.registerShotOutput(shot,'image','img2');
  Core.registerShotOutput(shot,'video','vid1');
  assert.deepEqual(shot.outputs.imageNodeIds,['img1','img2']);
  assert.deepEqual(shot.outputs.videoNodeIds,['vid1']);
});

test('app exposes full shot production fields and safe batch group behavior',()=>{
  for(const field of ['data-shot="lighting"','data-shot="sound"','data-shot="cameraMovement"'])assert.match(app,new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(app,/确认并创建生成器组/);
  assert.doesNotMatch(app,/id="batchAutoRun"/);
  assert.match(app,/connectShotAssetReferences\(scriptNode,d,shot,node\)/);
  assert.match(app,/generationSnapshot:scriptGenerationSnapshot/);
  assert.match(app,/registerShotProductionNode\(shot,type,node\.id\)/);
});

test('script workflow core loads before app and deployment cache is bumped',()=>{
  assert.ok(boot.indexOf('./script-workflow-core.js')<boot.indexOf('./app.js'));
  assert.match(boot,/20260901-script-workflow-v1-1/);
});
'''
(ROOT/'tests'/'script-workflow-v1.test.mjs').write_text(test,encoding='utf-8')

print('Script Workflow V1 patch applied')
