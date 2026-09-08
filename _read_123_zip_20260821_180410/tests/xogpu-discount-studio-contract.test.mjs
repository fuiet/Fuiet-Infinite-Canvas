import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const upstream=fs.readFileSync(new URL('../upstream-generation-inputs-v1.js',import.meta.url),'utf8');

test('browser multipart carries all documented XOGPU media fields',()=>{for(const field of ['input_reference','end_reference','reference_images','reference_videos','reference_audios'])assert.ok(preview.includes(`form,'${field}'`)||preview.includes(`form.append('${field}'`));assert.match(preview,/metadata.*JSON\.stringify\(\{mode,ratio\}\)/);assert.match(preview,/route\.noJsonFallback\|\|route\.strictMediaTransport/)});
test('server uses FormData and strips JSON content-type for XOGPU studio',()=>{assert.match(server,/buildServerXogpuForm/);assert.match(server,/new FormData\(\)/);assert.match(server,/key\.toLowerCase\(\)==='content-type'/);assert.match(server,/reference_videos/);assert.match(server,/reference_audios/)});
test('upstream references are hydrated from source nodes and prefer persisted outputUrl',()=>{assert.match(upstream,/function hydrateConnectedReference/);const posLocal=upstream.indexOf('node.outputUrl||node.mediaUrl'),posSource=upstream.indexOf('node.outputSourceUrl',posLocal);assert.ok(posLocal>=0&&posSource>posLocal);assert.match(upstream,/upstreamInputContract:\{version:6/)});
