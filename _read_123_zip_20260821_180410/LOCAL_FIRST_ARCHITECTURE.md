# Fuiet Infinite Canvas — Local-first architecture invariants

These rules are product constraints, not deployment preferences.

1. **The shipping product must run as a desktop standalone application.** Core generation, task state, provider configuration, project data, media, logs and recovery must not require Cloudflare or any other hosted control plane.
2. **Cloudflare is preview transport only.** Pages/Functions may host the current browser preview and a stateless same-origin proxy, but must not become the authoritative database, queue, provider registry or media store.
3. **There is one provider/runtime contract.** Browser preview and desktop/local runtimes share `provider-adapter-contract.js` and `provider-runtime-core.js`; platform wrappers must not fork provider state machines.
4. **Local persistence is authoritative in desktop mode.** SQLite stores projects/tasks and the local filesystem stores generated media. Provider task IDs are persisted before polling so an application restart resumes instead of regenerating.
5. **Provider success is irreversible.** Once a provider reports success, later download, decoding, disk or persistence problems are result-processing failures. They must never be rewritten as provider generation failures.
6. **No client-supplied arbitrary polling URL.** Polling routes come from the selected provider/model adapter and are resolved against the configured Base URL. The local gateway validates outbound HTTP(S), private addresses and redirects before attaching credentials.
7. **Provider secrets stay local in desktop mode.** API keys are encrypted at rest using the local master key and sensitive headers are filtered from user-defined headers and cross-origin redirects.
8. **The queue is restart-safe.** Active tasks are persisted in SQLite. Restart recovers polling/result-processing tasks from their stored upstream task ID; cancellation survives restart and must not regenerate work.
9. **Media processing must be real.** An operation only returns success when the expected local output actually exists. There are no placeholder or fake-success media responses.
10. **Desktop packaging is the release target.** Cloudflare preview configuration can remain, but release work is defined by Electron/Tauri packaging, local database migrations, local media tools, upgrade/migration safety and automated regression tests.

## Runtime ownership

```text
Shared pure core
  provider-adapter-contract.js
  provider-runtime-core.js
           |
     +-----+-------------------+
     |                         |
Desktop/local Node        Browser preview
server.js + SQLite        IndexedDB/local runtime
local filesystem          Cloudflare stateless proxy only
```

Cloudflare is deliberately outside the authoritative runtime path.
