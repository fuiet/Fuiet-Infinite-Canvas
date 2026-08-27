# Provider Runtime Hardening

This file records the production contract for provider execution after the 2026-08 hardening work.

## Zero-config provider behavior

For common compatible providers, the normal setup path is **API Base URL + API Key**, followed by model discovery. The shared `provider-adapter-contract.js` is used by both Node and Cloudflare Worker runtimes to infer standard text, image, audio, video, and ComfyUI adapters.

The current OpenAI-compatible video default is:

- create: `POST /v1/videos`
- status: `GET /v1/videos/{{taskId}}`
- completed content: `GET /v1/videos/{{taskId}}/content`

Old automatically generated `/v1/video/generations` defaults are migrated to the current contract. A genuinely custom route/template remains untouched.

A provider with a proprietary or undocumented API cannot be made universally compatible from only two strings. Such providers remain supported through the developer adapter overrides (paths, request template, task-id/status/output fields, polling method/body).

## Shared Node / Worker business core

Provider behavior is split into portable pure logic and platform-specific I/O:

- `provider-adapter-contract.js` is the shared adapter/route contract: protocol inference, zero-config defaults, legacy-route migration, reference transport, and model finalization.
- `provider-runtime-core.js` is the shared asynchronous runtime state core: common task-id/status/progress/output extraction, success/failure/pending classification, failure formatting, and bounded polling backoff.
- `server.js` keeps Node-specific networking, SQLite, filesystem, FFmpeg/FFprobe/ImageMagick, and local media storage.
- `dist/server/secure-index.js` keeps Worker-specific fetch, Supabase/R2-style persistence, request-driven scheduling, and Cloudflare restrictions.

Node and Worker therefore no longer maintain separate copies of the provider protocol/state interpretation. Environment-specific I/O remains separate intentionally because those platforms have different capabilities.

## Secret and SSRF rules

- API keys are encrypted at rest.
- Provider responses never expose plaintext keys or sensitive authentication headers.
- Browser-supplied polling URLs are not accepted; polling uses the server-stored provider route and upstream task id.
- Credentialed provider requests must remain on the API Base URL origin.
- Cross-origin redirects are blocked while credentials are present.
- Result/content redirects may cross origin only after authentication headers have been stripped.
- Private/reserved/metadata network targets are blocked in production unless an explicitly permitted local-development mode applies.

## Hosted security defaults

Public Cloudflare Pages deployment is owner-isolated by default:

- `CANVAS_DESKTOP_SINGLE_USER=0`
- `CANVAS_ENFORCE_OWNER=1`
- `CANVAS_CLAIM_UNOWNED=0`
- `CANVAS_ALLOW_UNAUTHENTICATED_OWNER=0`
- `CANVAS_ALLOW_PRIVATE_PROVIDER_HOSTS=0`

The account-free desktop/single-user mode still exists for a genuinely local or packaged build, but it must be enabled explicitly and is not a safe public-hosting default.

## Task lifecycle

Tasks are persisted and support queue priority, concurrency, retry, cancellation, and logs.

The browser monitors only the Canvas task resource (`GET /api/tasks/{taskId}`). It no longer posts task snapshots, `_upstream` state, poll paths, or provider task metadata back to `/api/tasks/poll`. Node keeps its local task runner, while Cloudflare task reads wake the persisted server-owned queue/poller. This keeps browser input out of upstream routing decisions and works consistently in both runtimes.

For asynchronous paid jobs, the creation request is sent once and the returned upstream `taskId` is persisted before polling. After a Worker restart:

- `polling` tasks with a persisted `taskId` resume polling without re-creating the upstream job.
- interrupted `running` tasks with a persisted `taskId` recover into polling.
- interrupted `running` or `polling` tasks without a trustworthy upstream id fail closed instead of being automatically resubmitted, because automatic resubmission can cause duplicate generation charges.
- transient poll failures use bounded backoff and do not re-run the creation request.

Cloudflare Worker execution remains request-driven: persisted work is resumed when the application/API is active. A continuously autonomous background dispatcher would require a platform primitive such as Cloudflare Queues, Durable Objects alarms, or Cron Triggers.

## Media persistence

Generated media is not reported as complete merely because an upstream status says success. The runtime requires a real output URL or retrieves the completed video content endpoint, then persists the result to application storage when configured. Unsupported server-side media transforms must return an explicit unsupported response rather than a fake success.

Reference media uses the normalized reference transport selected for the environment: data URL, public URL, or provider upload adapter.

## Ownership

Production Supabase migrations define owner relationships and RLS for provider/project/task/media data. Server-side owner checks and database constraints are both expected to remain enabled; service-role credentials must never be exposed to the browser.
