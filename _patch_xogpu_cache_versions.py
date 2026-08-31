from pathlib import Path
ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-xogpu-minimax-h3-1'
NEW='20260831-xogpu-strict-request-1'
changed=[]
for path in ROOT.rglob('*'):
    if not path.is_file() or path.suffix.lower() not in {'.js','.mjs','.html','.css'}:
        continue
    text=path.read_text(encoding='utf-8')
    if OLD not in text:
        continue
    path.write_text(text.replace(OLD,NEW),encoding='utf-8')
    changed.append(str(path))
print('synchronized cache version in',len(changed),'files')
