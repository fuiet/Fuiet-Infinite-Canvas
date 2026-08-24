# Canvas 主界面 UI Redesign v1

本轮是严格 **UI-only** 改造。

## 设计目标

- 让 Canvas 本身成为视觉主角，工具栏和面板退居二级。
- 统一顶部导航、左侧工具栏、抽屉、节点、上下文菜单和底部 Dock 的层级语言。
- 降低旧版高频边框、点阵背景和孤立小按钮造成的视觉噪音。
- 保留现有深色创作工具定位，继续使用薄荷绿作为选择/连接反馈色。
- 不新增功能，不删功能，不改变交互入口。

## 实现方式

- 原 `styles.css` 保留。
- 新增 `canvas-ui-v1.css` 作为最后加载的视觉覆盖层。
- `index.html` 只新增一条 CSS `<link>`。
- 所有 JS、后端、API、状态与模型逻辑保持原样。

## 功能冻结文件

以下文件在改造前后 SHA-256 完全一致：

- `app.js`
- `server.js`
- `models.js`
- `store.js`
- `three-runtime.js`
- `ui-zh.js`

## Codex UI-only Skill

项目内附带：`.codex/skills/frontend-design/`

Codex 用户级安装：

- macOS / Linux / WSL: `./tools/install-frontend-design-skill.sh`
- Windows PowerShell: `.\tools\install-frontend-design-skill.ps1`

安装后可在 Codex 中使用 `$frontend-design`，本地版本默认执行“功能冻结，只改 UI”。

## 设计评审文件

`.frontend-design/canvas-main/2026-08-21-canvas-main-v1.html`

这是静态 UI 评审面，不依赖服务端，也不会执行真实生成任务。
