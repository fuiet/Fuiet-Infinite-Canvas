from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-video-hover-player-1'
BUILD='20260831-video-clean-result-1'

def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

# 1) Video result nodes no longer render the generic resize handle at all.
app=ROOT/'app.js'
s=app.read_text(encoding='utf-8')
old="const resizeHtml=contentState==='result'?`<div class=\"node-resize-handle ui-v23-resize-handle\" data-node-resize=\"${n.id}\" title=\"调整大小\" aria-label=\"调整节点大小\"></div>`:'';"
new="const resizeHtml=contentState==='result'&&n.type!=='video'?`<div class=\"node-resize-handle ui-v23-resize-handle\" data-node-resize=\"${n.id}\" title=\"调整大小\" aria-label=\"调整节点大小\"></div>`:'';"
s=replace_once(s,old,new,'video resize markup')
s=s.replace(OLD,BUILD)
app.write_text(s,encoding='utf-8')

# 2) ui-v2 must not inject the expand/lightbox trigger into canvas video result nodes.
ui=ROOT/'ui-v2.js'
s=ui.read_text(encoding='utf-8')
old="""      const host=mediaHost(media);if(!host)return;host.classList.add('ui-media-preview-host');\n      const compact=host.matches('button,[data-inline-version]')||Boolean(host.closest('.quality-version-strip,.node-candidate-rail,.v36-ver,.v35-version'));\n      let trigger=[...host.children].find(x=>x.classList?.contains('ui-media-preview-trigger'));\n      if(!compact&&!trigger){trigger=document.createElement('span');trigger.className='ui-media-preview-trigger';trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('title','点击放大预览');trigger.innerHTML=icon('expand');host.appendChild(trigger)}\n"""
new="""      const host=mediaHost(media);if(!host)return;host.classList.add('ui-media-preview-host');\n      const canvasVideoResult=media.tagName==='VIDEO'&&Boolean(media.closest('.node.node-video[data-content-state=\"result\"]'));\n      const compact=host.matches('button,[data-inline-version]')||Boolean(host.closest('.quality-version-strip,.node-candidate-rail,.v36-ver,.v35-version'));\n      let trigger=[...host.children].find(x=>x.classList?.contains('ui-media-preview-trigger'));\n      if(canvasVideoResult){if(trigger)trigger.remove();return}\n      if(!compact&&!trigger){trigger=document.createElement('span');trigger.className='ui-media-preview-trigger';trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('title','点击放大预览');trigger.innerHTML=icon('expand');host.appendChild(trigger)}\n"""
s=replace_once(s,old,new,'video preview trigger injection')
ui.write_text(s,encoding='utf-8')

# 3) CSS fallback guarantees neither control can appear on a video result, including stale DOM.
css=ROOT/'styles'/'video-node.css'
s=css.read_text(encoding='utf-8')
block='''\n/* Video results are media-only: no expand/lightbox trigger and no resize corner. */\n.node.node-video[data-content-state="result"] .ui-media-preview-trigger,\n.node.node-video.ui-v23-media-result[data-content-state="result"] .ui-media-preview-trigger,\n.node.node-video[data-content-state="result"] .node-resize-handle,\n.node.node-video[data-content-state="result"] .ui-v23-resize-handle{\n  display:none!important;\n  opacity:0!important;\n  pointer-events:none!important;\n}\n'''
if 'Video results are media-only: no expand/lightbox trigger' not in s:s+=block
css.write_text(s,encoding='utf-8')

# 4) Fresh cache version for the production page and tests that pin it.
for name in ['browser-bootstrap.js','browser-runtime.js','index.html','models.html']:
    fp=ROOT/name
    text=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(text,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    text=fp.read_text(encoding='utf-8')
    if OLD in text:fp.write_text(text.replace(OLD,BUILD),encoding='utf-8')

# 5) Regression coverage.
test=ROOT/'tests'/'video-result-controls-cleanup.test.mjs'
test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../ui-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('video result nodes do not render the generic resize handle',()=>{
  assert.match(app,/contentState==='result'&&n\.type!=='video'/);
});

test('canvas video results do not receive the expand lightbox trigger',()=>{
  assert.match(ui,/const canvasVideoResult=media\.tagName==='VIDEO'/);
  assert.match(ui,/if\(canvasVideoResult\)\{if\(trigger\)trigger\.remove\(\);return\}/);
});

test('video result CSS hard-hides stale expand and resize controls',()=>{
  assert.match(css,/\.node\.node-video\[data-content-state="result"\] \.ui-media-preview-trigger/);
  assert.match(css,/\.node\.node-video\[data-content-state="result"\] \.node-resize-handle/);
  assert.match(css,/display:none!important/);
});

test('production browser build is cache-busted for video control cleanup',()=>{
  assert.match(boot,/20260831-video-clean-result-1/);
});
''',encoding='utf-8')

print('patched video result controls',BUILD)
