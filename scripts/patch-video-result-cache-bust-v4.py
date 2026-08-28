from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'_read_123_zip_20260821_180410'
VERSION='20260828-video-result-reconciliation-1'

index=ROOT/'index.html'
text=index.read_text(encoding='utf-8')
text=text.replace('./browser-runtime.js?v=20260828-video-error-reporting-1',f'./browser-runtime.js?v={VERSION}')
text=text.replace('./browser-bootstrap.js?v=20260828-video-error-reporting-1',f'./browser-bootstrap.js?v={VERSION}')
index.write_text(text,encoding='utf-8')

models=ROOT/'models.html'
text=models.read_text(encoding='utf-8')
text=text.replace('./browser-runtime.js?v=20260828-video-runtime-1',f'./browser-runtime.js?v={VERSION}')
text=text.replace('./browser-bootstrap.js?v=20260828-video-runtime-1',f'./browser-bootstrap.js?v={VERSION}')
models.write_text(text,encoding='utf-8')

bootstrap=ROOT/'browser-bootstrap.js'
text=bootstrap.read_text(encoding='utf-8')
text=text.replace("const v='20260828-video-error-reporting-1';",f"const v='{VERSION}';")
bootstrap.write_text(text,encoding='utf-8')
print(VERSION)
