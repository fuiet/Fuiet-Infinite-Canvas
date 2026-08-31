from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-video-clean-result-1'
BUILD='20260831-video-result-autofit-1'

# Dedicated result auto-fit stylesheet: generated video owns the node height.
css=ROOT/'styles'/'video-result-autofit-v1.css'
css.write_text('''/* Video result auto-fit v1\n * Generated/uploaded videos own the node silhouette. A stale pre-generation n.h\n * must never vertically center the video away from its header. */\n.node.node-video[data-content-state="result"],\n.node.node-video.ui-v23-media-result[data-content-state="result"]{\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  padding:0!important;\n  background:transparent!important;\n  overflow:visible!important;\n}\n.node.node-video[data-content-state="result"]>.node-body,\n.node.node-video.ui-v23-media-result[data-content-state="result"]>.node-body{\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  padding:0!important;\n  margin:0!important;\n  align-items:flex-start!important;\n  justify-content:flex-start!important;\n  background:transparent!important;\n  overflow:visible!important;\n}\n.node.node-video[data-content-state="result"] .video-node-shell.has-output,\n.node.node-video.ui-v23-media-result[data-content-state="result"] .video-node-shell.has-output{\n  display:block!important;\n  width:100%!important;\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  padding:0!important;\n  margin:0!important;\n  background:transparent!important;\n  line-height:0!important;\n}\n.node.node-video[data-content-state="result"] .media-clip.video-node-stage,\n.node.node-video.ui-v23-media-result[data-content-state="result"] .media-clip.video-node-stage{\n  display:block!important;\n  width:100%!important;\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  margin:0!important;\n  padding:0!important;\n}\n.node.node-video[data-content-state="result"] video.node-media-video,\n.node.node-video.ui-v23-media-result[data-content-state="result"] video.node-media-video{\n  display:block!important;\n  width:100%!important;\n  height:auto!important;\n  min-height:0!important;\n  max-height:none!important;\n  margin:0!important;\n  padding:0!important;\n  vertical-align:top!important;\n}\n/* Keep the result header immediately above the media. */\n.node.node-video[data-content-state="result"] .node-header{\n  top:-25px!important;\n  height:21px!important;\n  margin:0!important;\n}\n''',encoding='utf-8')

# Load video auto-fit together with the existing image auto-fit and bump cache key.
boot=ROOT/'browser-bootstrap.js'
s=boot.read_text(encoding='utf-8')
s=s.replace("if(isCanvas)await loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`);","if(isCanvas)await Promise.all([loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`),loadStyle(`./styles/video-result-autofit-v1.css?v=${v}`)]);")
s=s.replace(OLD,BUILD)
boot.write_text(s,encoding='utf-8')

# Keep cache-version invariants synchronized.
for name in ['browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(text,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    if OLD in text: fp.write_text(text.replace(OLD,BUILD),encoding='utf-8')

(ROOT/'tests'/'video-result-autofit.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../styles/video-result-autofit-v1.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('video results ignore stale node height and hug intrinsic media height',()=>{
  assert.match(css,/\.node\.node-video\[data-content-state="result"\][\s\S]*height:auto!important/);
  assert.match(css,/>\.node-body[\s\S]*align-items:flex-start!important/);
  assert.match(css,/\.video-node-shell\.has-output[\s\S]*height:auto!important/);
  assert.match(css,/video\.node-media-video[\s\S]*height:auto!important/);
});

test('video result autofit stylesheet is loaded on canvas bootstrap',()=>{
  assert.match(boot,/video-result-autofit-v1\.css\?v=\$\{v\}/);
  assert.match(boot,/20260831-video-result-autofit-1/);
});
''',encoding='utf-8')
print('patched video result autofit',BUILD)
