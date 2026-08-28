# Fuiet Infinite Canvas · Local-first

当前开发阶段可以部署到 Cloudflare 做在线预览，但 **Cloudflare 不是产品运行依赖**。正式产品目标是 Windows 桌面单机版：核心任务、供应商、项目、媒体、API Key、队列和恢复机制全部在本机运行。

当前应用版本：`4.7.1`。

## 两种运行形态

### 1. Cloudflare 在线预览

Cloudflare Pages / Pages Functions 只负责：

- 托管网页预览；
- 提供无状态同源代理，解决浏览器直接调用部分上游 API 时的 CORS 问题。

Cloudflare **不保存** Provider、API Key、Project、Task、Queue 或 Media，也不是任务轮询和结果持久化的权威来源。浏览器预览数据保存在浏览器本地 IndexedDB。

### 2. Windows 桌面正式版

桌面版运行结构：

- 界面：Electron 桌面窗口；
- 本地服务：Electron 内置 Node 运行 `server.js`；
- 本地 API：每次启动自动选择一个空闲的 `127.0.0.1` 端口；
- 数据库：SQLite；
- 媒体：本地文件系统；
- 任务队列和轮询：本地持久化；
- API Key：本机 AES-256-GCM 加密；
- 登录 / 多租户 RLS：桌面单机模式不需要；
- Cloudflare：不参与桌面版核心运行路径。

## Windows 安装包

目标安装包：

```text
Fuiet-Infinite-Canvas-Setup-4.7.1-x64.exe
```

安装后从桌面快捷方式直接启动，用户不需要另外安装 Node.js、FFmpeg、FFprobe 或 ImageMagick。

Electron 自带 Node/Chromium。FFmpeg、FFprobe、ImageMagick 作为独立本地运行时放在安装目录：

```text
resources\tools\
```

安装版启动时会验证三个媒体工具确实存在且可以执行。如果安装内容损坏，应用直接报错，不会返回虚假的媒体处理成功。

当前固定媒体工具：

- FFmpeg / FFprobe：9.0，Gyan Windows x64 static release essentials build；
- ImageMagick：7.1.2-30 portable Q16 HDRI x64 static。

下载脚本对发行包执行 SHA-256 校验，并生成：

```text
runtime-tools\tool-manifest.json
runtime-tools\THIRD_PARTY_NOTICES.txt
```

Electron Builder 通过 `extraResources` 把整个 `runtime-tools` 放到安装包的 `resources/tools`，而不是塞进 `app.asar`。

## 桌面数据目录

```text
%APPDATA%\Fuiet Infinite Canvas\data
```

主要内容：

```text
secret.key
providers.json
canvas.sqlite
backups\
media\
```

卸载程序默认不会删除这些创作数据。不要单独删除 `secret.key`，否则已有供应商 API Key 密文无法解密。

## 升级与数据库迁移

桌面升级采用“安装新版本覆盖旧版本 + 保留 userData”的本地方案，不依赖在线升级服务器。

每次启动时：

1. 读取 `schema_migrations` 和 SQLite `user_version`；
2. 如果发现待执行迁移，先通过 SQLite `VACUUM INTO` 在 `data/backups/` 创建一致性备份；
3. 按版本顺序在事务中执行数据库迁移；
4. 迁移失败立即回滚并阻止错误版本继续运行；
5. 只保留最近若干份迁移前备份；
6. 任务表中的上游 task id 和 provider/result 状态继续保留，因此升级或重启不会重新提交已经创建的上游视频任务。

这套升级机制只依赖安装程序和本机数据目录，不依赖 Cloudflare、R2、D1、Supabase 或远程控制面。

## 安全边界

本地服务默认只监听 `127.0.0.1`。供应商请求由本地 gateway 做 URL、DNS、私网地址和重定向检查；认证 Header 不允许跟随跨域重定向泄露。前端不能把任意轮询 URL 直接交给本地后端执行。

Electron 渲染层配置：

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- `webSecurity: true`

外部网页使用系统浏览器打开，不在应用 WebView 中获得本地权限。

## 开发模式

本地 Node 预览：

```bash
npm run start:local
```

Electron 开发模式：

```bash
npm install
npm run desktop
```

开发机没有 `runtime-tools/` 时，可以使用系统 PATH 里的媒体工具；正式安装版强制使用安装包内置运行时。

## 构建 Windows 安装包

Windows 开发机：

```powershell
npm install
npm run dist:win
```

`dist:win` 会依次：

1. 下载并校验固定版本的 FFmpeg / FFprobe / ImageMagick；
2. 验证本地可执行文件能够运行；
3. 使用 Electron Builder 生成 Windows x64 NSIS 安装程序。

GitHub 也提供 `Desktop Windows Build` 工作流，可手动触发或在版本 tag 上构建安装包；它只是构建工具，不参与应用运行。

## 自动化测试

```bash
npm run check
npm test
```

测试覆盖供应商适配、视频异步轮询、本地队列恢复、成功状态不可逆、SQLite 迁移、Cloudflare 预览边界、桌面打包约束和媒体输出真实性检查。

更完整的不可破坏架构约束见 `LOCAL_FIRST_ARCHITECTURE.md`。
