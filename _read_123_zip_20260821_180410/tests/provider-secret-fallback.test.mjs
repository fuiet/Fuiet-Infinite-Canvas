import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secureIndex = fs.readFileSync(path.join(ROOT, 'dist/server/secure-index.js'), 'utf8');
const secureEntry = fs.readFileSync(path.join(ROOT, 'dist/server/secure-entry.js'), 'utf8');
const fallback = /PROVIDER_SECRET_KEY[\s\S]{0,160}SUPABASE_SERVICE_ROLE_KEY/;

test('Worker provider encryption falls back to the existing Supabase service-role secret', () => {
  assert.match(secureIndex, fallback);
  assert.match(secureEntry, fallback);
});
