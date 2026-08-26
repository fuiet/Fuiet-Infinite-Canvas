import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../dist/server/pages-entry.js';

const ENV = {
  PROVIDER_SECRET_KEY: 'upload-stream-limit-key',
  CANVAS_MAX_UPLOAD_BYTES: String(1024 * 1024),
  CANVAS_ENFORCE_OWNER: '0'
};

test('upload byte limit is enforced even when Content-Length is absent', { concurrency: false }, async () => {
  const size = 1024 * 1024 + 1;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(700 * 1024));
      controller.enqueue(new Uint8Array(size - 700 * 1024));
      controller.close();
    }
  });
  const request = new Request('https://canvas.example.test/api/upload?name=too-large.bin', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body,
    duplex: 'half'
  });
  const response = await worker.fetch(request, ENV, { waitUntil() {} });
  const data = await response.json();
  assert.equal(response.status, 413);
  assert.match(data.error, /上传文件过大/);
});
