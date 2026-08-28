# Fuiet Infinite Canvas · Windows 单机桌面版 v4.2

这是纯本机版本，不再使用 Cloudflare Pages / Workers，也不依赖 Supabase。

## Windows 安装版

当前正式桌面安装包目标：

```text
Fuiet-Infinite-Canvas-Setup-4.2.0-x64.exe
```

安装后从桌面快捷方式直接启动，不需要命令行，也不需要用户另外安装：

- Node.js
- FFmpeg
- FFprobe
- ImageMagick

Electron 自带 Node/Chromium；FFmpeg、FFprobe、ImageMagick 会作为独立可执行运行时放在安装目录的 `resources/tools/` 中，而不是依赖 Windows PATH。

桌面程序每次启动时会先验证内置的三个媒体工具能够实际执行，然后才启动本地服务。如果安装内容损坏，会明确提示缺少或无法运行的工具，而不会偷偷改用系统里其他版本。

内置版本：

- FFmpeg / FFprobe：9.0，Gyan Windows x64 static release essentials build
- ImageMagick：7.1.2-30 portable Q16 HDRI x64 static

构建时会保存 `resources/tools/tool-manifest.json` 和 `THIRD_PARTY_NOTICES.txt`，并保留第三方发行包中的相关许可证/配置文件。

## 运行架构

- 界面：Electron 桌面窗口
- 服务：内置 Node 运行 `server.js`
- 本地 API：每次启动自动选择一个空闲的 `127.0.0.1` 端口
- 供应商：只需要 API Base URL + API Key
- API Key：首次启动自动生成 `secret.key`，使用 AES-256-GCM 加密后保存
- 登录：无
- owner / RLS：无
- 云端环境变量：无

## 桌面数据目录

```text
%APPDATA%\Fuiet Infinite Canvas\data
```

其中包含：

```text
secret.key
providers.json
canvas.sqlite
media\
```

卸载程序默认不会删除这些创作数据。尤其不要单独丢失 `secret.key`，否则原有供应商 API Key 密文无法解密。

## 安全边界

本地服务默认只监听 `127.0.0.1`，不会默认暴露到局域网或公网。Electron 渲染层不开启 Node 权限，外部网页导航会交给系统浏览器处理。

## 开发模式

源码开发仍可使用：

```bash
npm install
npm run desktop
```

开发机如果没有生成 `runtime-tools/`，桌面开发模式可以继续使用系统 PATH 中的媒体工具；正式安装版不会这样做，安装版强制使用内置运行时。

## 构建 Windows 安装包

Windows Runner / Windows 开发机：

```powershell
npm install
powershell -ExecutionPolicy Bypass -File scripts/fetch-windows-media-tools.ps1
npm test
npm run dist:win
```

构建流程会在打包前和打包后分别执行 `ffmpeg -version`、`ffprobe -version`、`magick -version`，并检查它们确实存在于 `release\win-unpacked\resources\tools\`。
