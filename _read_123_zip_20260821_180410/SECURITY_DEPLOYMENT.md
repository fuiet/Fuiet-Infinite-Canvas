# Cloudflare 安全部署说明

本文件对应生产安全入口 `dist/server/secure-entry.js` / `dist/server/secure-index.js`。

## 必须配置的 Cloudflare Secrets

在 Cloudflare Pages 项目的 **Settings → Variables and Secrets** 中配置，禁止提交到 Git：

- `PROVIDER_SECRET_KEY`：供应商 API Key 的 AES-GCM 主密钥。建议使用至少 32 字节随机值。**部署后不要随意更换**，否则已有密文无法解密。
- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务器端使用。绝不能暴露给浏览器。
- `CANVAS_ADMIN_PASSWORD`：当前单管理员模式的访问密码。生产环境强烈要求配置；未配置时 Blender Bridge Token 获取接口会被禁用。
- `CANVAS_PUBLIC_BASE_URL`：生产公开地址，例如 `https://fuiet-infinite-canvas.pages.dev`。

建议配置：

- `SUPABASE_STORAGE_BUCKET=canvas-media`
- `CANVAS_TASK_CONCURRENCY=2`
- `CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS=0`
- `CANVAS_MAX_UPLOAD_BYTES=52428800`
- `CANVAS_LOGIN_ATTEMPTS_PER_10M=10`

## API Key 迁移

安全入口启动后会检查现有 provider：

1. 如果存在旧的明文 `apiKey`，且已配置 `PROVIDER_SECRET_KEY`，会自动改存为 `apiKeyEncrypted`。
2. 会删除 `defaultHeaders` / model `extraHeaders` 中的 `Authorization`、`x-api-key`、`api-key`、cookie、token/secret 类 Header。
3. 新增或更新供应商时，如果没有 `PROVIDER_SECRET_KEY`，服务器拒绝明文保存 API Key。

在确认迁移成功前不要删除旧数据库备份。不要在日志、截图、Issue 或前端状态中输出 API Key。

## Supabase 迁移

迁移文件：

`supabase/migrations/20260825_owner_rls.sql`

该迁移会添加 `owner_id`、索引和 RLS policy，但**不会自动完成用户认证接入**。

当前应用仍以共享 `CANVAS_ADMIN_PASSWORD` 为主要登录方式，并使用服务端 `SUPABASE_SERVICE_ROLE_KEY`。Service Role 会绕过 RLS，所以在完成 Supabase Auth / 用户身份传播之前：

- 不要宣称已经实现真正的多用户隔离；
- 不要把 Supabase 表直接开放给浏览器；
- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 放进任何前端代码；
- 不要把 `owner_id IS NULL` 的存量数据直接暴露给新注册用户。

## 视频协议

安全 Worker 的默认异步视频协议：

- 创建：`POST /v1/video/generations`
- 查询：`GET /v1/video/generations/{{taskId}}`

如果供应商不同，必须在服务器保存的 `provider.videoProtocolConfig` 或 model route 中明确配置。浏览器不能提交 `pollPath` 或绝对轮询 URL。

创建视频任务只发送一次 POST。上游创建返回 4xx/5xx 时直接显示真实错误，不通过换路径重复 POST，以避免重复计费。

## 媒体处理

Cloudflare Worker 不能执行本地 FFmpeg/FFprobe。`POST /api/media/process` 在 Worker 环境明确返回 `501`，不会再返回伪造的 duration 或原 URL 作为“处理成功”。

如果需要转码、裁剪、探测等功能，应使用：

- 独立 Node/容器媒体服务；或
- 专用外部媒体处理服务。

## 上线前检查

运行：

```bash
npm run check
npm test
```

上线前至少验证：

1. `/api/providers` 响应中没有 API Key 或认证 Header。
2. `/api/tasks/poll` 只接受 `{ "taskId": "..." }`。
3. `127.0.0.1`、localhost、私有/保留 IP 被供应商 URL 安全策略阻止。
4. 视频创建只发生一次 POST。
5. 视频轮询路径来自服务端 provider/model 配置。
6. 终态成功前不接受视频 URL 作为最终结果。
7. 远程图片/音频/视频结果按配置持久化到 Supabase Storage。
8. HTTPS 登录 Cookie 带 `Secure`。
9. 未配置管理员密码时无法获取 Blender Bridge Token。
10. `/api/media/process` 不返回虚假成功。
