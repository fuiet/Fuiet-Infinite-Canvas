from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'
OLD_BUILD='20260831-context-toolbar-clear-1'
NEW_BUILD='20260831-media-canvas-scale-350-1'

s=APP.read_text(encoding='utf-8')
old='const MEDIA_NODE_DISPLAY_WIDTH=620;'
new='const MEDIA_NODE_DISPLAY_WIDTH=350;'
if old not in s:
    raise SystemExit('media width constant not found')
s=s.replace(old,new,1)

old_m="if(['image','video'].includes(x.type)){const mediaW=Number(x.w||0);if(!mediaW||(x.type==='video'&&mediaW<=520))x.w=MEDIA_NODE_DISPLAY_WIDTH;x.mediaDisplayScaleVersion=1}"
new_m="if(['image','video'].includes(x.type)){const mediaW=Number(x.w||0),scaleVersion=Number(x.mediaDisplayScaleVersion||0);if(scaleVersion<2||!mediaW||(x.type==='video'&&mediaW<=520))x.w=MEDIA_NODE_DISPLAY_WIDTH;x.mediaDisplayScaleVersion=2}"
if old_m not in s:
    raise SystemExit('media scale migration block not found')
s=s.replace(old_m,new_m,1)
APP.write_text(s,encoding='utf-8')

for name in ['browser-bootstrap.js','browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8')
    if OLD_BUILD in text:
        fp.write_text(text.replace(OLD_BUILD,NEW_BUILD),encoding='utf-8')

# Align any pre-existing regression assertions with the new canvas scale before
# adding the new dedicated regression file. This avoids relying on a test filename.
for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    changed=text.replace(OLD_BUILD,NEW_BUILD)
    changed=changed.replace('MEDIA_NODE_DISPLAY_WIDTH=620','MEDIA_NODE_DISPLAY_WIDTH=350')
    changed=changed.replace('mediaDisplayScaleVersion=1','mediaDisplayScaleVersion=2')
    if changed!=text:
        fp.write_text(changed,encoding='utf-8')

(ROOT/'tests'/'media-canvas-scale-350.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('100 percent canvas media scale matches the compact reference proportion',()=>{
  assert.match(app,/const MEDIA_NODE_DISPLAY_WIDTH=350/);
  assert.doesNotMatch(app,/const MEDIA_NODE_DISPLAY_WIDTH=620/);
});

test('legacy image and video nodes migrate once to compact media scale',()=>{
  assert.match(app,/scaleVersion=Number\(x\.mediaDisplayScaleVersion\|\|0\)/);
  assert.match(app,/scaleVersion<2/);
  assert.match(app,/x\.mediaDisplayScaleVersion=2/);
});

test('canvas cache key advances for compact media scale',()=>{
  assert.match(boot,/20260831-media-canvas-scale-350-1/);
});
''',encoding='utf-8')
print('patched media canvas display width to 350px')
