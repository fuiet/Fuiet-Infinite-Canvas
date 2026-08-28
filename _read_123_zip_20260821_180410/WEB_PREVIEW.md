# Fuiet Infinite Canvas — Web Preview

当前主版本是网页在线体验版，不再以 Windows EXE 为主要交付方式。

## 运行方式

### Node

```bash
npm start
```

默认 Web 模式监听 `0.0.0.0:$PORT`（默认 8080）。

### Docker

```bash
docker compose up -d --build
```

打开 `http://服务器IP:8080`。生产环境建议由 Nginx/Caddy 反向代理到 8080 并启用 HTTPS。

## 数据

容器内数据目录为 `/data`，必须挂载持久卷。保存内容包括：

- `providers.json`：供应商配置（API Key 为加密形式）
- `secret.key`：供应商 API Key 本机/服务器加密主密钥
- `canvas.sqlite`：项目、任务、版本等数据
- `media/`：上传和生成的媒体文件

**不要删除或更换已有 `secret.key`，否则旧的供应商 API Key 将无法解密。**

## 在线体验安全

默认仍然不强制登录，适合私人、不可猜测的预览地址。若地址会公开，可设置环境变量：

```text
CANVAS_ADMIN_PASSWORD=你自己的访问密码
CANVAS_TRUST_PROXY=1   # 仅在可信反向代理后使用
```

供应商 API Key 不会返回给浏览器。

## 媒体工具

Docker 镜像直接安装 FFmpeg / FFprobe / ImageMagick，因此网页服务器可以继续执行现有媒体处理功能，不依赖访问者电脑安装任何工具。
