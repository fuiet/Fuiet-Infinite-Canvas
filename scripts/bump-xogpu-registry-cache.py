from pathlib import Path
p=Path('_read_123_zip_20260821_180410/index.html')
s=p.read_text(encoding='utf-8')
old='./video-protocol-registry.js?v=20260902-xogpu-official-contract-1'
new='./video-protocol-registry.js?v=20260902-xogpu-working-envelope-1'
if s.count(old)!=1:
    raise SystemExit(f'expected 1 cache key, found {s.count(old)}')
p.write_text(s.replace(old,new,1),encoding='utf-8')
