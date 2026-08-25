# Cloudflare 安全部署说明

生产 Pages Functions 当前统一经过：

`functions/* -> dist/server/final-entry.js -> production-entry.js -> secure-entry.js -> secure-index.js`

`server.js` 仍保留本地 Node / FFmpeg 能力，但 Cloudflare 生产 API 不再直接使用旧的 `dist/server/index.js`。

## 必须配置的 Cloudflare Secrets / Variables

在 Cloudflare Pages 项目的 **Settings → Variables and Secrets** 中配置，禁止提交真实值到 Git。

必须：

- `PROVIDER_SECRET_KEY`：供应商 API Key 的 AES-GCM 主密钥。建议使用至少 32 字节随机值。部署后不要随意更换，否则已有密文无法解密。
- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务器端使用，绝不能进入浏览器代码。
- `CANVAS_ADMIN_PASSWORD`：当前管理员网页登录密码。未配置时 Blender Bridge Token 获取接口会被禁用。
- `CANVAS_PUBLIC_BASE_URL`：生产公开地址，例如 `https://fuiet-infinite-canvas.pages.dev`。
- `CANVAS_OWNER_ID`：当前管理员模式映射到的 Supabase `auth.users.id` UUID。

建议：

- `SUPABASE_ANON_KEY`：当浏览器以后接入 Supabase Auth Bearer Token 时，用于服务端验证用户；未配置时服务端会使用 Service Role 作为 `apikey`，但仍不会把 Service Role 返回浏览器。
- `SUPABASE_STORAGE_BUCKET=canvas-media`
- `CANVAS_TASK_CONCURRENCY=2`
- `CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS=0`
- `CANVAS_MAX_UPLOAD_BYTES=52428800`
- `CANVAS_LOGIN_ATTEMPTS_PER_10M=10`
- `CANVAS_ENFORCE_OWNER=1`
- `CANVAS_CLAIM_UNOWNED=0`
- `CANVAS_ALLOW_UNAUTHENTICATED_OWNER=0`

`wrangler.toml` 已把 owner 隔离默认打开。没有有效 owner 时，providers / tasks / projects / media 会拒绝访问，而不是退回到全局共享数据。

## API Key 安全

安全入口会执行以下规则：

1. 新增或更新 provider 时，API Key 必须使用 `PROVIDER_SECRET_KEY` 进行 AES-GCM 加密后保存为 `apiKeyEncrypted`。
2. 旧 provider 如果还存在明文 `apiKey`，会在启动时自动迁移为密文。
3. 如果检测到旧明文 Key，但服务器没有配置加密主密钥，owner-aware 生产网关会返回 `503`，不再允许继续使用明文 Key。
4. `defaultHeaders`、model `extraHeaders` 中的 `Authorization`、`x-api-key`、`api-key`、cookie、token/secret 类 Header 会被剔除。
5. provider / task 的公开响应会深度过滤密钥和认证 Header。

不要把 API Key 写进日志、截图、Issue、前端 localStorage 或任务 payload。

## Owner / RLS 迁移

按顺序执行：

1. `supabase/migrations/20260825_owner_rls.sql`
2. `supabase/migrations/20260825_owner_relationships.sql`

第一份迁移：

- 给 `providers / projects / tasks / media_assets` 增加 `owner_id`；
- 增加 owner 索引；
- 开启 RLS；
- 创建只允许 `owner_id = auth.uid()` 的 select / insert / update / delete policy。

第二份迁移：

- 从 provider/project/task JSON 中的服务端 owner marker 自动传播 `owner_id`；
- tasks 增加与 provider / project 主键同类型的 `provider_ref` / `project_ref`；
- 建立 tasks -> providers、tasks -> projects 外键；
- media_assets 根据 `task_id` 自动继承 task owner；
- 回填能够安全识别的存量关系。

### 当前管理员模式

当前 UI 仍以 `CANVAS_ADMIN_PASSWORD` 为主。生产网关会把该管理员会话映射到 `CANVAS_OWNER_ID`，并在 Service Role 网关层再次做 owner 校验，因此即使 Service Role 本身可以绕过 RLS，HTTP API 也不会直接返回其他 owner 的 provider、task、project 或 media。

`CANVAS_OWNER_ID` 必须是真实存在的 Supabase `auth.users.id`，因为 owner 外键指向 `auth.users`。

### 后续 Supabase Auth 用户

`production-entry.js` 已支持接收浏览器的 Supabase `Authorization: Bearer <access_token>`，并通过 `/auth/v1/user` 验证后使用返回的 `user.id` 作为 owner。接入注册/登录 UI 后，不需要再让所有用户共用 `CANVAS_OWNER_ID`。

### 存量 owner_id = null

默认不会自动把无 owner 数据认领给当前用户。

如果明确确认当前数据库里所有无 owner 数据都属于同一个管理员，可临时设置：

`CANVAS_CLAIM_UNOWNED=1`

完成认领后立即恢复：

`CANVAS_CLAIM_UNOWNED=0`

不要在多用户已经开放后启用自动认领。

## Provider SSRF / URL 安全

- 浏览器不能决定上游 `pollPath` 或绝对轮询 URL。
- Provider 路由必须与 `API Base URL` 同源。
- 阻止 localhost、常见私有/保留 IP、`.local`、`.internal`、云元数据地址等。
- 上游重定向使用 `redirect: manual`，跨域重定向会被拒绝，防止携带 API Key 跳转到其他域名。
- 默认 `CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS=0`。

Cloudflare Worker 无法像 Node 一样直接使用系统 DNS + socket 固定解析结果，因此不要把 `allowPrivateHosts` 作为普通用户可控字段开放。

## 视频协议

默认异步视频协议：

- 创建：`POST /v1/video/generations`
- 查询：`GET /v1/video/generations/{{taskId}}`

如果供应商协议不同，必须在服务器保存的 `provider.videoProtocolConfig` 或 model route 中明确配置。

重要规则：

- `/api/tasks/poll` 只接受 `{ "taskId": "..." }`；
- 创建视频只发一次 POST；
- 上游 4xx / 5xx 直接显示真实错误；
- 不再通过切换多个 POST 路径做自动 fallback，避免重复扣费；
- 查询使用指数退避；
- `pending / queued / processing` 等非终态不会当成功；
- 只有终态成功且识别到最终媒体 URL 才写入 succeeded。

没有供应商文档时，系统只能做常见协议默认值和模型识别，不能保证任意中转站只凭 Base URL + Key 就能自动推断全部视频协议。

## 队列 / 重试 / 取消

`POST /api/tasks` 现在先持久化 queued task，再通过 Cloudflare `ctx.waitUntil(...)` 启动处理。

支持：

- `CANVAS_TASK_CONCURRENCY`；
- priority；
- retry；
- cancelRequested / canceled；
- 异步 video polling。

Cloudflare isolate 内存不能当作唯一可靠队列，因此 Supabase task 行是持久化状态来源。后续如果任务规模明显增大，建议把执行层进一步迁移到 Cloudflare Queues / Durable Objects，而不是依赖单 isolate 的运行计数器。

## 结果持久化和参考媒体

图片 / 音频 / 视频成功结果在 `downloadOutputs !== false` 时会下载并写入 Supabase Storage，再返回 `/media/...`。

owner 网关会：

- 对 `/media/...` 做 owner 校验；
- 把响应缓存策略改为 `private, no-store`；
- 防止另一个 owner 直接读取已知 media path。

本地 `/media/...` 参考素材支持：

- `referenceTransport = data-url`；
- `referenceTransport = upload` + provider upload endpoint；
- `referenceTransport = url`。

在严格私有 media 模式下，第三方供应商通常无法带你的浏览器 Cookie 访问 `/media/...`，因此需要外部供应商拉取参考图时优先使用 `data-url` 或 provider upload；不要假设私有 `/media/...` 地址一定可被供应商访问。

## 媒体处理

Cloudflare Worker 不能执行本地 FFmpeg / FFprobe。

`POST /api/media/process` 在 Worker 环境明确返回 `501`：

`当前 Cloudflare Worker 环境不支持本地 FFmpeg/FFprobe 媒体处理...`

不会再返回假的 duration、假的 probe 或原 URL 伪装成处理成功。

需要转码、裁剪、探测时使用独立 Node/容器媒体服务或专用媒体处理服务。

## Blender Bridge

- `/api/blender/bridge/token` 必须先通过管理员登录；未配置 `CANVAS_ADMIN_PASSWORD` 时直接禁用。
- `/api/blender/bridge/push` 和 `/poll` 继续只使用专用 Bridge Token 鉴权，不要求 Blender 插件携带浏览器 owner session。

## 测试与 CI

本地：

```bash
npm run check
npm test
```

GitHub Actions 会在 push / PR 上执行 Node 22 syntax check 和测试。

测试覆盖至少包括：

1. provider 响应不泄露 API Key / auth headers；
2. 旧明文 Key 加密迁移；
3. `/api/tasks/poll` 只接受 taskId；
4. 私有地址 SSRF 阻断；
5. `/api/media/process` 不假成功；
6. videoProtocolConfig 路由和只 POST 一次；
7. Secure Cookie / 登录限速；
8. Blender Token 保护；
9. 上传大小限制；
10. provider / task / project / media owner 隔离；
11. Blender push/poll 不被网页登录 owner 机制误伤。

## 上线顺序

1. 先备份 Supabase。
2. 执行两份 migration。
3. 在 Supabase 创建/确认管理员 auth user，取得其 UUID。
4. 配置 `CANVAS_OWNER_ID`、`PROVIDER_SECRET_KEY`、Supabase secrets、`CANVAS_ADMIN_PASSWORD`。
5. 对存量无 owner 数据做明确 backfill；只有确认全部属于管理员时才临时开启 `CANVAS_CLAIM_UNOWNED=1`。
6. 确认 CI 全绿。
7. 部署 Cloudflare Pages 分支预览。
8. 验证 provider、图片生成、视频提交/轮询、media 读取、Blender Bridge。
9. 再合并到 `main`。
