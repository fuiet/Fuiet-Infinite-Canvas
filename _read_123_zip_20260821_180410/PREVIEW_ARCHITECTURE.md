# Online preview architecture

Cloudflare is preview transport only; it is not the application database.

Browser Runtime owns provider configuration (including API keys), projects, task history and queue state. Existing data API calls are intercepted before network access and backed by browser-local storage.

`provider-adapter-contract.js` and `provider-runtime-core.js` remain platform-neutral. Model discovery, authentication candidates, request routing, asynchronous task IDs, polling, terminal-state classification and output extraction do not depend on Cloudflare.

The browser tries the provider directly first. Only a browser CORS/network failure uses `/api/proxy`. That Pages Function forwards one upstream request and writes nothing. `/api/health` is the only other Cloudflare API route.

FFmpeg/ImageMagick processing and Blender live bridge are desktop-local capabilities and intentionally do not fake success in the online preview.

## IndexedDB persistence

Browser preview persistence uses IndexedDB as the primary store for providers, projects, tasks, queue settings and media blobs. Legacy browser-runtime localStorage records are imported once and removed. Provider API keys are encrypted with a non-extractable AES-GCM WebCrypto key stored in IndexedDB. Uploaded media is stored as Blob data in IndexedDB and served through a same-origin Service Worker route (`/__browser_media/<id>`), including byte-range responses for video/audio seeking. Cloudflare stores none of this data.

## Browser Storage Manager

`browser-storage-manager.js` is the only persistence facade used by canvas/model/UI code. It hydrates the IndexedDB `settings` store before `browser-bootstrap.js` starts application scripts, migrates legacy app-owned Web Storage keys once, removes the old copies, batches frequent canvas snapshot writes, and exposes synchronous cache-backed `getItem/setItem` compatibility plus JSON/diagnostic helpers. Provider configuration is not duplicated into this settings layer; provider data remains in the dedicated encrypted IndexedDB provider store owned by Browser Runtime.
