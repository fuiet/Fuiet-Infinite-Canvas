from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
APP=ROOT/'app.js'
OLD_BUILD='20260831-media-canvas-scale-350-1'
NEW_BUILD='20260831-low-zoom-media-visible-1'

s=APP.read_text(encoding='utf-8')
old="""    const lowDetail=state.viewport.zoom<.34&&n.id!==selectedId&&n.id!==expandedNodeId;\n    if(lowDetail&&['image','video'].includes(n.type)){body=`<div class=\"node-low-detail ${n.type}\"><i>${n.type==='video'?'▶':'▧'}</i><span>${escapeHtml(nodeTitleBase(n))}</span></div>`;}\n    else if(n.type==='image'){"""
new="""    if(n.type==='image'){"""
if old not in s:
    raise SystemExit('low-detail media branch not found')
s=s.replace(old,new,1)
APP.write_text(s,encoding='utf-8')

for name in ['browser-bootstrap.js','browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8')
    if OLD_BUILD in text:
        fp.write_text(text.replace(OLD_BUILD,NEW_BUILD),encoding='utf-8')

for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    changed=text.replace(OLD_BUILD,NEW_BUILD)
    if changed!=text:
        fp.write_text(changed,encoding='utf-8')

(ROOT/'tests'/'low-zoom-media-visibility.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('image and video results remain real media below 34 percent canvas zoom',()=>{
  assert.doesNotMatch(app,/state\.viewport\.zoom<\.34&&n\.id!==selectedId&&n\.id!==expandedNodeId/);
  assert.doesNotMatch(app,/node-low-detail \$\{n\.type\}/);
  assert.match(app,/const media=n\.outputUrl\?`<div class="media-clip image-node-stage"/);
  assert.match(app,/const media=n\.outputUrl\?`<div class="media-clip video-node-stage"><video class="node-media-video"/);
});

test('virtualization remains enabled while low-zoom media stays visible',()=>{
  assert.match(app,/function refreshVirtualizedContent\(/);
  assert.match(app,/function scheduleVirtualizationRefresh\(/);
});

test('browser cache key advances for low zoom media visibility fix',()=>{
  assert.match(boot,/20260831-low-zoom-media-visible-1/);
});
''',encoding='utf-8')
print('removed low zoom media replacement branch')
