import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('standalone runtime has no cloud/serverless entrypoints', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'wrangler.toml')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'functions')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'dist/server')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'supabase')), false);
});

test('standalone server is local-only and self-encrypts provider keys', () => {
  assert.match(server, /const HOST = '127\.0\.0\.1'/);
  assert.match(server, /const ADMIN_PASSWORD = ''/);
  assert.match(server, /SECRET_FILE = path\.join\(DATA_DIR, 'secret\.key'\)/);
  assert.match(server, /createCipheriv\('aes-256-gcm', MASTER_KEY, iv\)/);
  assert.doesNotMatch(server, /PROVIDER_SECRET_KEY/);
  assert.doesNotMatch(server, /SUPABASE_/);
});

test('package scripts no longer validate a Worker build', () => {
  assert.equal(pkg.name, 'fuiet-infinite-canvas-local');
  assert.doesNotMatch(pkg.scripts.check, /dist\/server/);
  assert.equal(pkg.scripts.start, 'node server.js');
});
