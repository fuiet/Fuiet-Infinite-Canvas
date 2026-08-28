import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const coreSource = fs.readFileSync(new URL('../provider-runtime-core.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(coreSource, context);
const Core = context.globalThis.CanvasProviderRuntimeCore;

const route = { outputPath: 'data.0.url', successValues: ['succeeded','completed'] };

test('image result parser accepts common URL response shapes', () => {
  assert.equal(Core.extractOutput({data:[{image_url:'https://cdn.example/a.png'}]}, route, 'image'), 'https://cdn.example/a.png');
  assert.equal(Core.extractOutput({images:[{url:'https://cdn.example/b.png'}]}, route, 'image'), 'https://cdn.example/b.png');
  assert.equal(Core.extractOutput({result:{images:[{url:'https://cdn.example/c.png'}]}}, route, 'image'), 'https://cdn.example/c.png');
  assert.equal(Core.extractOutput({output:[{url:'https://cdn.example/d.png'}]}, route, 'image'), 'https://cdn.example/d.png');
});

test('image result parser converts b64_json to browser-renderable data URL', () => {
  const out = Core.extractOutput({data:[{b64_json:'YWJjZGVmZ2hpamtsbW5vcA=='}]}, route, 'image');
  assert.equal(out, 'data:image/png;base64,YWJjZGVmZ2hpamtsbW5vcA==');
});

test('async successful image response with base64 is classified as success with output', () => {
  const result = Core.classifyAsyncPoll({status:'completed',data:[{b64_json:'YWJjZGVmZ2hpamtsbW5vcA=='}]}, route, 'image');
  assert.equal(result.state, 'success');
  assert.equal(result.output, 'data:image/png;base64,YWJjZGVmZ2hpamtsbW5vcA==');
});

test('browser runtime persists inline generated images instead of treating JSON as a URL', () => {
  const src = fs.readFileSync(new URL('../browser-runtime.js', import.meta.url), 'utf8');
  assert.match(src, /normalizeGeneratedOutput/);
  assert.match(src, /generated-image/);
  assert.match(src, /上游已返回成功响应，但未识别到图片结果字段/);
  assert.doesNotMatch(src, /raw\?\.url\?\?raw\?\.data\?\.url\?\?JSON\.stringify\(raw\)/);
});

test('canvas accepts IndexedDB media URLs as generated output', () => {
  const src = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(src, /\\\/__browser_media\\\//);
});
