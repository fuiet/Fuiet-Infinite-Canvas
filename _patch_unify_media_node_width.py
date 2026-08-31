from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'
OLD='20260831-video-result-autofit-1'
BUILD='20260831-media-width-unified-1'

s=APP.read_text(encoding='utf-8')

# One shared canvas presentation width for image/video nodes. Intrinsic media
# resolution remains metadata; aspect ratio determines rendered height.
anchor="  const WORKSPACE_NAME_KEY='canvas-studio-workspace-name-v1';\n"
insert="  const MEDIA_NODE_DISPLAY_WIDTH=620;\n\n"
if 'const MEDIA_NODE_DISPLAY_WIDTH=620;' not in s:
    if anchor not in s: raise SystemExit('workspace anchor not found')
    s=s.replace(anchor,insert+anchor,1)

# Migrate legacy video nodes that used the old 320/470-ish presentation scale.
old="if(x.type==='script'&&(!x.w||x.w===470||x.w===500))x.w=310;if(!x.resultVersions.length"
new="if(x.type==='script'&&(!x.w||x.w===470||x.w===500))x.w=310;if(['image','video'].includes(x.type)){const mediaW=Number(x.w||0);if(!mediaW||(x.type==='video'&&mediaW<=520))x.w=MEDIA_NODE_DISPLAY_WIDTH;x.mediaDisplayScaleVersion=1}if(!x.resultVersions.length"
if new not in s:
    if old not in s: raise SystemExit('migration anchor not found')
    s=s.replace(old,new,1)

# New image and video nodes must start at the same visual width.
old="w:type==='image'?620:type==='script'?310:type==='director'?420:320"
new="w:(type==='image'||type==='video')?MEDIA_NODE_DISPLAY_WIDTH:type==='script'?310:type==='director'?420:320"
if new not in s:
    if old not in s: raise SystemExit('addNode width anchor not found')
    s=s.replace(old,new,1)

# Keep the built-in sample workflow on the same media scale too.
s=s.replace("type:'image',x:baseX,y:baseY,w:300", "type:'image',x:baseX,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH")
s=s.replace("type:'image',x:baseX+380,y:baseY,w:320", "type:'image',x:baseX+380,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH")
s=s.replace("type:'video',x:baseX+780,y:baseY,w:320", "type:'video',x:baseX+780,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH")

s=s.replace(OLD,BUILD)
APP.write_text(s,encoding='utf-8')

# Cache version invariants.
for name in ['browser-bootstrap.js','browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(text,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    if OLD in text: fp.write_text(text.replace(OLD,BUILD),encoding='utf-8')

# Regression coverage.
t=(ROOT/'tests'/'media-node-display-width.test.mjs')
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('image and video nodes share one canvas presentation width',()=>{
  assert.match(app,/const MEDIA_NODE_DISPLAY_WIDTH=620/);
  assert.match(app,/w:\(type==='image'\|\|type==='video'\)\?MEDIA_NODE_DISPLAY_WIDTH/);
});

test('legacy small video nodes migrate to the shared media width',()=>{
  assert.match(app,/x\.type==='video'&&mediaW<=520/);
  assert.match(app,/x\.w=MEDIA_NODE_DISPLAY_WIDTH/);
  assert.match(app,/x\.mediaDisplayScaleVersion=1/);
});

test('browser cache key is bumped for unified media sizing',()=>{
  assert.match(boot,/20260831-media-width-unified-1/);
});
''',encoding='utf-8')
print('patched unified image/video node width',BUILD)
