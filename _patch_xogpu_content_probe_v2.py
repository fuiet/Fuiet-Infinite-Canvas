from pathlib import Path
import runpy

# Apply the functional patch first.
runpy.run_path('_patch_xogpu_content_probe.py', run_name='__main__')

path=Path('_read_123_zip_20260821_180410/tests/xogpu-poll-fallback.test.mjs')
s=path.read_text(encoding='utf-8')
old="""test('browser treats XOGPU 501 as poll-route fallback rather than generation failure',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoRoute\\(route=\\{\\}\\)/);
  assert.match(src,/isXogpuVideoRoute\\(route\\)&&status===501/);
  assert.match(src,/if\\(shouldFallbackVideoPollError\\(error,route\\)\\)continue/);
});
"""
new="""test('browser treats XOGPU 501 as recoverable poll failure and probes video content',()=>{
  const src=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
  assert.match(src,/function isXogpuVideoRoute\\(route=\\{\\}\\)/);
  assert.match(src,/function isXogpuNotImplementedError\\(error,route=\\{\\}\\)/);
  assert.match(src,/function probeXogpuVideoContent\\(provider,createdRaw,taskId,route\\)/);
  assert.match(src,/pollFallback:'content-probe'/);
});
"""
if old not in s:
    raise SystemExit('stale XOGPU fallback assertion block not found')
path.write_text(s.replace(old,new,1),encoding='utf-8')
print('stale XOGPU fallback test updated')
