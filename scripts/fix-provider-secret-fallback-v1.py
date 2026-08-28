from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'
FILES = [
    APP / 'dist' / 'server' / 'secure-index.js',
    APP / 'dist' / 'server' / 'secure-entry.js',
]

OLD = "env?.PROVIDER_SECRET_KEY || env?.CANVAS_SECRET_KEY || env?.API_KEY_ENCRYPTION_KEY || ''"
NEW = "env?.PROVIDER_SECRET_KEY || env?.CANVAS_SECRET_KEY || env?.API_KEY_ENCRYPTION_KEY || env?.SUPABASE_SERVICE_ROLE_KEY || ''"

changed = 0
for path in FILES:
    text = path.read_text(encoding='utf-8')
    count = text.count(OLD)
    if count:
        text = text.replace(OLD, NEW)
        path.write_text(text, encoding='utf-8')
        changed += count
        print(f'patched {path.relative_to(ROOT)}: {count}')
    elif NEW in text:
        print(f'already patched {path.relative_to(ROOT)}')
    else:
        raise SystemExit(f'could not find provider encryption key expression in {path.relative_to(ROOT)}')

TEST = APP / 'tests' / 'provider-secret-fallback.test.mjs'
TEST.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const secureIndex = fs.readFileSync(path.join(ROOT, 'dist/server/secure-index.js'), 'utf8');
const secureEntry = fs.readFileSync(path.join(ROOT, 'dist/server/secure-entry.js'), 'utf8');
const fallback = /PROVIDER_SECRET_KEY[\\s\\S]{0,160}SUPABASE_SERVICE_ROLE_KEY/;

test('Worker provider encryption falls back to the existing Supabase service-role secret', () => {
  assert.match(secureIndex, fallback);
  assert.match(secureEntry, fallback);
});
""", encoding='utf-8')
print(f'wrote {TEST.relative_to(ROOT)}')
print(f'total patched occurrences: {changed}')
