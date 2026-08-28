# Fuiet Infinite Canvas · 单机版 v4.0

这是纯本机版本，不再使用 Cloudflare Pages / Workers，也不依赖 Supabase。

## 运行架构

- 界面：浏览器打开 `http://127.0.0.1:8080`
- 服务：本机 `server.js`
- 供应商：只需要 API Base URL + API Key
- API Key：首次启动自动生成 `.data/secret.key`，使用 AES-256-GCM 加密后保存
- 供应商配置：`.data/providers.json`
- 项目 / 任务：`.data/canvas.sqlite`
- 图片 / 视频 / 音频：`.data/media/`
- 登录：无
- owner / RLS：无
- 云端环境变量：无

## 启动

Windows 可以直接双击：

```text
start-local.bat
```

也可以命令行启动：

```bash
npm start
```

程序默认只监听 `127.0.0.1:8080`，不会默认暴露到局域网或公网。

## 依赖

- Node.js 22+
- 需要本地媒体处理时：FFmpeg / FFprobe / ImageMagick

## 数据备份

关闭程序后，备份整个 `.data/` 目录即可。尤其不要单独丢失 `.data/secret.key`，否则原有供应商 API Key 密文无法解密。

## 开发检查

```bash
npm run check
npm test
```

## Windows 桌面安装版

仓库现在支持生成真正的 Windows x64 安装程序：

```text
Fuiet-Infinite-Canvas-Setup-4.1.0-x64.exe
```

安装后从桌面快捷方式直接启动，不需要单独安装 Node.js，也不需要打开命令行。Electron 自带运行所需的 Node/Chromium。

桌面版数据目录：

```text
%APPDATA%\Fuiet Infinite Canvas\data
```

其中包含 `secret.key`、`providers.json`、`canvas.sqlite` 和 `media/`。卸载程序默认不会删除这些创作数据。

本地 API 每次启动自动选择一个空闲的 `127.0.0.1` 端口，只允许本机访问。

开发模式：

```bash
npm install
npm run desktop
```

构建 Windows 安装包：

```bash
npm install
npm run dist:win
```
