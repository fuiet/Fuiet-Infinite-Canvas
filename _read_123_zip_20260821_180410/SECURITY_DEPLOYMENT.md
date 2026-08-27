# Cloudflare 安全部署说明

生产 Pages Functions 的入口链路为：

`functions/* -> dist/server/pages-entry.js -> auth-entry.js -> final-entry.js -> production/reference/security gateways`

`server.js` 继续用于本地 Node / FFmpeg 运行环境；Cloudflare 生产 API 使用 Worker 安全入口，不直接依赖本地 Node 媒体能力。

## 1. 公网部署默认必须安全

`wrangler.toml` 的托管默认值现在是：

- `CANVAS_DESKTOP_SINGLE_USER=0`
- `CANVAS_ENFORCE_OWNER=1`
- `CANVAS_CLAIM_UNOWNED=0`
- `CANVAS_ALLOW_UNAUTHENTICATED_OWNER=0`
- `CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS=0`

也就是说，公开 Cloudflare Pages 不再默认进入“无账号桌面模式”。Provider、Project、Task、Media 都要求可验证 owner。

只有真正的本地/打包单用户版本才可以显式设置 `CANVAS_DESKTOP_SINGLE_USER=1`。该模式会关闭网页登录和 owner 隔离，并允许桌面专用的 provider-secret fallback，因此**不能作为公网托管的安全配置**。

## 2. Cloudflare Secrets / Variables

真实 secret 禁止提交到 Git。生产环境至少配置：

- `PROVIDER_SECRET_KEY`：供应商 API Key 的 AES-GCM 主密钥，使用长随机值，部署后不要随意更换。
- `SUPABASE_URL`：Supabase 项目 URL。
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务器端使用，绝不能进入浏览器代码。
- `CANVAS_PUBLIC_BASE_URL`：生产站点地址。

如果使用管理员模式，还配置：

- `CANVAS_ADMIN_PASSWORD`
- `CANVAS_OWNER_ID`：对应真实 `auth.users.id` UUID。
- `CANVAS_SESSION_SECRET`：建议单独配置；未配置时会回退到 provider secret 做会话签名。

建议配置：

- `SUPABASE_ANON_KEY`：验证 Supabase Auth Bearer Token。
- `SUPABASE_STORAGE_BUCKET=canvas-media`
- `CANVAS_TASK_CONCURRENCY=2`
- `CANVAS_MAX_UPLOAD_BYTES=52428800`
- `CANVAS_LOGIN_ATTEMPTS_PER_10M=10`

## 3. API Key 与 Header 安全

生产网关执行以下规则：

1. Provider API Key 使用 AES-GCM 加密保存，不以明文持久化。
2. 旧明文 Key 会迁移成密文；托管模式缺少加密 secret 时拒绝继续明文运行。
3. Provider 的公开响应不返回 `apiKey` / `apiKeyEncrypted`。
4. `Authorization`、`Proxy-Authorization`、`x-api-key`、`api-key`、cookie、token、secret 类 Header 会从可持久化/公开配置中剔除。
5. 带认证信息的 provider 请求必须与 API Base URL 同源；跨域 30x 重定向会被阻止，避免 API Key 被带到其他域名。
6. 本机、私网、保留地址、云元数据地址默认被 SSRF 规则阻止。
7. 浏览器不能提交任意上游轮询 URL；`/api/tasks/poll` 只接受 `{ "taskId": "..." }`。

最终媒体下载允许在**不携带 provider 认证 Header**后跟随合法 CDN 地址，以兼容供应商把结果放在独立 CDN 的情况。

## 4. Owner / RLS

按顺序执行：

1. `supabase/migrations/20260825_owner_rls.sql`
2. `supabase/migrations/20260825_owner_relationships.sql`

第一份迁移会：

- 创建/维护 `canvas_users`；
- 给 `providers / projects / tasks / media_assets` 添加 `owner_id`；
- 为上述表开启 RLS；
- 为 select / insert / update / delete 建立 `owner_id = auth.uid()` 的 owner-only policy；
- 创建必要 owner 索引。

第二份迁移会：

- 为 task 建立与 provider/project 主键同类型的 `provider_ref` / `project_ref`；
- 建立 task -> provider、task -> project 外键；
- 校验 task owner 必须与关联 provider/project owner 一致；
- 让 media 根据 `task_id` 继承 task owner；
- 只回填能够证明归属的历史数据，不把未知 owner 数据随意归给某个用户。

Service Role 可以绕过数据库 RLS，因此 HTTP 网关还会再次做 owner 校验；两层都必须保留。

如果确定历史 `owner_id = null` 数据全部属于同一管理员，可以短暂设置 `CANVAS_CLAIM_UNOWNED=1` 完成明确认领，随后立即恢复为 `0`。多用户开放后不要开启自动认领。

## 5. 当前视频零配置协议

对常见 OpenAI-compatible 视频供应商，当前默认协议是：

- 创建：POST `/v1/videos`
- 查询：GET `/v1/videos/{{taskId}}`
- 完成内容：GET `/v1/videos/{{taskId}}/content`

旧版本自动生成的 `/v1/video/generations` 默认配置会自动迁移到当前协议；用户明确保存的自定义 route/template 不会被覆盖。

运行规则：

- 创建请求只发送一次。
- 创建成功后先持久化上游 `taskId`，再进入轮询。
- 支持自定义 `taskIdPath`、`statusPath`、`outputPath`、GET/POST polling 和 poll body。
- `queued / pending / processing` 不会被误判为成功。
- 只有真实终态成功并拿到结果 URL/内容后才进入 `succeeded`。
- 如果状态对象没有结果 URL，可以从 `/content` 取回真实视频并持久化。
- 不通过轮流尝试多个 POST 创建路径来“猜接口”，避免同一个付费任务被创建多次。

“只填 Base URL + API Key”可以覆盖常见兼容协议和能够从模型列表识别的供应商；完全私有、非标准、无协议元数据的 API 不可能仅凭两个字符串可靠推断请求格式，这类供应商继续使用开发者高级 adapter 覆盖。

## 6. 持久化任务队列、恢复、重试与取消

Task 先持久化，再执行。支持：

- priority；
- `CANVAS_TASK_CONCURRENCY`；
- retry / maxRetries；
- cancelRequested / canceled；
- 异步视频 polling；
- task logs；
- Worker 重启后的安全恢复。

Worker 重启后的策略以**避免重复提交和重复扣费**为优先：

- `polling` 且已有可信 `taskId`：直接恢复轮询，不重新 POST 创建任务。
- `running` 且已有 `taskId`：恢复为 polling。
- `running` / `polling` 但没有可信 `taskId`：fail closed，不自动重新创建付费任务；先确认上游后再人工 retry。
- 临时轮询错误使用有上限的指数退避，不触发新的 create POST。

Supabase task 行是 Cloudflare 环境的持久状态来源。当前调度仍然是 request-driven：应用/API 有请求时会继续推进持久任务。如果未来要求在完全没有任何请求时也持续自主执行，应接入 Cloudflare Queues、Durable Objects Alarm 或 Cron Trigger，而不是把 isolate 内存当作永久后台进程。

## 7. 结果持久化与参考媒体

成功结果不会因为“上游说成功”就伪造完成：系统必须识别真实媒体 URL/内容。

当 `downloadOutputs !== false` 且存储已配置时，图片/视频/音频结果会写入 Supabase Storage，并记录 media asset。Media 读取仍经过 owner 校验，并使用私有缓存策略。

参考媒体支持：

- `data-url`
- `url`
- `upload` + provider upload endpoint

严格私有 media 地址通常不能让第三方供应商直接拉取，因此公网供应商的参考图优先用 `data-url` 或 provider upload。

## 8. Cloudflare 媒体处理

Cloudflare Worker 无本地 FFmpeg / FFprobe。

`POST /api/media/process` 在 Worker 中明确返回 `501`，不会返回假的 duration、假的 probe、或者把原 URL 当“处理成功”。真正的转码、裁剪、探测继续由 Node/容器媒体服务或专用媒体处理服务完成。

## 9. 测试与 CI

本地执行：

```bash
npm run check
npm test
```

当前测试覆盖包括：

- API Key / Header 泄露防护；
- Node 与 Worker SSRF / 重定向安全；
- owner 隔离、RLS 相关 HTTP 行为、reference ownership；
- 当前视频零配置协议和旧配置迁移；
- 视频创建只 POST 一次；
- Worker 重启后只恢复轮询、不重复创建；
- 临时 poll 错误退避；
- 上传大小限制；
- Secure Cookie / 登录限速；
- 不允许假的媒体处理成功；
- UI / 节点回归测试。

## 10. 推荐上线顺序

1. 备份 Supabase。
2. 执行两份 migration。
3. 创建/确认管理员 Supabase auth user，记录 UUID。
4. 在 Cloudflare 配置 provider/Supabase/session secrets。
5. 保持 `CANVAS_DESKTOP_SINGLE_USER=0`、`CANVAS_ENFORCE_OWNER=1`。
6. 配置管理员登录或接入 Supabase Auth Bearer 用户。
7. 明确认领需要迁移的历史 ownerless 数据。
8. 确认 GitHub CI 全绿。
9. 先部署 Cloudflare Pages Preview，验证 provider、模型发现、图片生成、视频提交/恢复轮询、media owner 隔离。
10. 再发布到生产。
