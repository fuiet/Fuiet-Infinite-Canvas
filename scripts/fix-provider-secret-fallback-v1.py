from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    ROOT / '_read_123_zip_20260821_180410' / 'dist' / 'server' / 'secure-index.js',
    ROOT / '_read_123_zip_20260821_180410' / 'dist' / 'server' / 'secure-entry.js',
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
    else:
        print(f'no exact match in {path.relative_to(ROOT)}')

if changed < 2:
    raise SystemExit(f'expected to patch both Worker encryption layers, patched {changed} occurrence(s)')

print(f'total patched occurrences: {changed}')
