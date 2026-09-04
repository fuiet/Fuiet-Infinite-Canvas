# Script Node Built-in Skill Pack

脚本节点默认内置以下创作 owner，不需要用户安装外部 Skill：

1. `short-drama-write`：冻结原剧本事实、场景进入/退出状态、人物目标与冲突，不擅自改写剧情。
2. `short-drama-assets`：拆人物/场景/道具，严格区分身份、变体、镜头瞬态和功能路人。
3. `short-drama-storyboard`：只决定“怎么拍”，每镜按 `起点 → 唯一动作 → 终点` 建立镜头边界与连续性。
4. `short-drama-image-prompts` / `short-drama-video-prompts`：把已确认镜头翻译成静态起始帧与动态提示词，不改变剧本事实。
5. `short-drama-review`：最终对照原剧本做保守审查和修复。

运行实现位于 `script-node-skill-pack-v1.js`。它拦截脚本节点现有的 `script_breakdown` 文本任务，在同一个用户选择的文本供应商/模型上依次运行“剧情事实 → 资产 → 分镜 → 审查”，最后仍返回当前 `app.js` 能直接消费的 `{ style, assets, shots }` JSON。任何主阶段失败时，会退回一轮整合式 Skill Prompt，而不是退回旧的宽泛拆解 Prompt。

`prompt_synthesis` 也会自动附加图片/视频提示词阶段边界，因此“合成提示词”只能翻译已确认镜头，不允许重新编剧情。

## 质量原则

- 原文事实、事件顺序、对白含义和观众知情时机优先。
- 匿名路人/一次性功能人物默认不建立角色资产。
- 同一人物换衣、受伤等是变体，不复制成新身份。
- 姿势、视线、左右手、站位和相机角度属于镜头，不进入资产。
- 同一空间按身份复用，不把每个机位拆成新场景。
- 普通背景物件不滥建道具；剧情关键、跨镜持续或有状态变化的物件才建立资产。
- 每镜有唯一职责，切镜必须带来信息、权力、情绪、空间或节奏变化。
- 镜头间人物位置、朝向、双手、持物、伤势和道具状态不可镜外瞬移。
- 对白不续写、不润色、不重复发生。
- 图像提示词只描述起始静态画面；视频提示词只描述已经确认的动态状态链。

## 来源与许可证

本内置工作流是针对 Fuiet 数据结构重新实现的运行时适配，并参考了以下公开项目的方法论：

- `zenstory-ai/drama-skills` — MIT License，参考 `short-drama-write`、`short-drama-assets`、`short-drama-storyboard`、`short-drama-video-prompts`、`short-drama-review` 的 owner 边界与连续性方法。
- `eternityspring/shuohao-skills` — Apache-2.0，参考 `novel-script` / `novel-storyboard` 的确定性质量门思想。

本文件只记录来源与设计映射；运行时不依赖外部 GitHub 仓库，也不会在脚本节点内执行图片生成。
