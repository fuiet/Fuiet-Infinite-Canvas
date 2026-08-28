import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const start = fs.readFileSync(path.join(ROOT, 'web-start.cjs'), 'utf8');
const dockerfile = fs.readFileSync(path.join(ROOT, 'Dockerfile'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('web preview is the primary runtime while local mode remains loopback-only', () => {
  assert.equal(pkg.name, 'fuiet-infinite-canvas-web');
  assert.equal(pkg.scripts.start, 'node web-start.cjs');
  assert.match(start, /CANVAS_RUNTIME[\s\S]*web/);
  assert.match(server, /IS_WEB_RUNTIME[\s\S]*0\.0\.0\.0/);
  assert.match(server, /: '127\.0\.0\.1'/);
});

test('web container includes server-side media tooling and persistent data mount', () => {
  assert.match(dockerfile, /ffmpeg imagemagick/);
  assert.match(dockerfile, /FFPROBE_PATH=\/usr\/bin\/ffprobe/);
  assert.match(dockerfile, /MAGICK_PATH=\/usr\/bin\/convert/);
  assert.match(dockerfile, /CANVAS_DATA_DIR=\/data/);
  assert.match(dockerfile, /VOLUME \["\/data"\]/);
});

test('desktop packaging is no longer part of the primary package', () => {
  assert.equal(pkg.main, undefined);
  assert.equal(pkg.build, undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.scripts.desktop, undefined);
  assert.equal(pkg.scripts['dist:win'], undefined);
});

test('web runtime keeps API-key encryption and cloud/serverless code stays absent', () => {
  assert.match(server, /secret\.key/);
  assert.match(server, /aes-256-gcm/i);
  assert.equal(fs.existsSync(path.resolve(ROOT, 'dist', 'server')), false);
});
