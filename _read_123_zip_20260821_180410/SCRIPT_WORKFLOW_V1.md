# Fuiet Script Workflow V1 — 产品需求、数据结构与开发顺序

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
