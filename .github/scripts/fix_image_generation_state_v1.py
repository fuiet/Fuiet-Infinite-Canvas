from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')

def read(name): return (ROOT/name).read_text(encoding='utf-8')
def write(name,text): (ROOT/name).write_text(text,encoding='utf-8')

def replace_once(text,old,new,label):
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{label}: expected 1 occurrence, found {count}')
    return text.replace(old,new,1)

# 1) Make the image render branch expose a real generation skeleton that uses
# the selected generation aspect ratio for every supported ratio.
s=read('app.js')
old="""    else if(n.type==='image'){\n      const ratioStyle=n.cropRatio&&!n.h?`aspect-ratio:${escapeAttr(n.cropRatio.replace(':','/'))};height:auto;min-height:130px;`:'';\n      const emptyImage=contentState==='empty';\n      const quick=emptyImage?`<div class=\"image-node-try\"><div class=\"image-node-try-label\">尝试：</div><button type=\"button\" data-image-quick=\"repaint\"><span class=\"image-quick-icon\">↥</span><b>图生图</b></button><button type=\"button\" data-image-quick=\"upscale\"><span class=\"image-quick-icon\">HD</span><b>图片高清</b></button></div>`:'';\n      const uploadAction=emptyImage&&interactionState==='selected'?`<button type=\"button\" class=\"image-node-upload\" data-image-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';\n      const media=n.outputUrl?`<div class=\"media-clip image-node-stage\" style=\"${ratioStyle}\"><img class=\"node-media-img\" loading=\"lazy\" decoding=\"async\" style=\"${mediaTransformStyle(n)}\" src=\"${escapeAttr(n.outputUrl)}\" alt=\"${escapeAttr(n.title||'图片')}\"/></div>`:n.content?`<div class=\"node-content-img image-node-stage\" style=\"background:${themeBg(n.content)};${mediaTransformStyle(n)}\"><div class=\"job-badge\">image</div></div>`:`<div class=\"image-node-placeholder image-node-stage\"><div class=\"big-icon\">▧</div></div>`;\n      body=`<div class=\"image-node-shell ${emptyImage?'is-empty':'has-output'}\">${uploadAction}${media}${quick}</div>`;\n"""
new="""    else if(n.type==='image'){\n      const imageGenerating=['queued','running'].includes(String(n.taskStatus||''));\n      const targetRatio=String(n.aspectRatio||n.cropRatio||'1:1').trim()||'1:1';\n      const ratioCss=targetRatio.replace(':','/');\n      const ratioStyle=imageGenerating?`aspect-ratio:${escapeAttr(ratioCss)};height:auto;min-height:0;`:n.cropRatio&&!n.h?`aspect-ratio:${escapeAttr(n.cropRatio.replace(':','/'))};height:auto;min-height:130px;`:'';\n      const targetParams=globalThis.CanvasImageRequestParameters?.normalize?.({resolution:n.resolution||'1K',aspectRatio:targetRatio})||{};\n      const targetSize=targetParams.width&&targetParams.height?`${targetParams.width} × ${targetParams.height}`:'';\n      const emptyImage=contentState==='empty'&&!imageGenerating;\n      const quick=emptyImage?`<div class=\"image-node-try\"><div class=\"image-node-try-label\">尝试：</div><button type=\"button\" data-image-quick=\"repaint\"><span class=\"image-quick-icon\">↥</span><b>图生图</b></button><button type=\"button\" data-image-quick=\"upscale\"><span class=\"image-quick-icon\">HD</span><b>图片高清</b></button></div>`:'';\n      const uploadAction=emptyImage&&interactionState==='selected'?`<button type=\"button\" class=\"image-node-upload\" data-image-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';\n      const generatingMeta=imageGenerating&&targetSize?`<div class=\"image-node-generating-size\">${escapeHtml(targetSize)}</div>`:'';\n      const generatingOverlay=imageGenerating?`<div class=\"image-node-generating-overlay\"><span class=\"image-node-generating-spinner\" aria-hidden=\"true\"></span><b>${n.taskStatus==='queued'?'等待生成':'正在生成'}</b>${Number.isFinite(Number(n.taskProgress))&&Number(n.taskProgress)>0?`<small>${Math.max(0,Math.min(100,Math.round(Number(n.taskProgress))))}%</small>`:''}</div>`:'';\n      const media=n.outputUrl?`<div class=\"media-clip image-node-stage\" style=\"${ratioStyle}\"><img class=\"node-media-img\" loading=\"lazy\" decoding=\"async\" style=\"${mediaTransformStyle(n)}\" src=\"${escapeAttr(n.outputUrl)}\" alt=\"${escapeAttr(n.title||'图片')}\"/></div>`:n.content?`<div class=\"node-content-img image-node-stage\" style=\"background:${themeBg(n.content)};${mediaTransformStyle(n)}\"><div class=\"job-badge\">image</div></div>`:`<div class=\"image-node-placeholder image-node-stage\" style=\"${ratioStyle}\"><div class=\"big-icon\">▧</div></div>`;\n      body=`<div class=\"image-node-shell ${imageGenerating?'is-generating':emptyImage?'is-empty':'has-output'}\">${uploadAction}${generatingMeta}${media}${generatingOverlay}${quick}</div>`;\n"""
s=replace_once(s,old,new,'image render branch')
write('app.js',s)

# 2) Add generation-state visuals. The skeleton itself owns the node silhouette;
# there is no empty-node footer/black strip while the task is queued/running.
s=read('styles/image-node.css')
marker='/* Generated/uploaded image: the media itself is the node. */'
block=r'''
/* Image generation skeleton: every selected aspect ratio is represented by the
   node itself before the result arrives, so there is no collapsed strip/jump. */
.node.node-image[data-task-state="queued"],
.node.node-image[data-task-state="running"]{
  height:auto!important;
  min-height:0!important;
  border:0!important;
  border-radius:8px!important;
  background:transparent!important;
  box-shadow:none!important;
  overflow:visible!important;
}
.node.node-image[data-task-state="queued"]>.node-body,
.node.node-image[data-task-state="running"]>.node-body{
  height:auto!important;
  min-height:0!important;
  padding:0!important;
  overflow:visible!important;
  border-radius:8px!important;
  background:transparent!important;
}
.node.node-image[data-task-state="queued"] .image-node-shell.is-generating,
.node.node-image[data-task-state="running"] .image-node-shell.is-generating{
  position:relative;
  height:auto!important;
  min-height:0!important;
  padding:0!important;
  overflow:visible!important;
  border-radius:8px!important;
  background:transparent!important;
}
.node.node-image[data-task-state="queued"] .image-node-placeholder.image-node-stage,
.node.node-image[data-task-state="running"] .image-node-placeholder.image-node-stage{
  position:relative;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  margin:0!important;
  overflow:hidden!important;
  border:1px solid #4a4a4a!important;
  border-radius:8px!important;
  background:linear-gradient(110deg,#202020 20%,#272727 38%,#202020 56%)!important;
  background-size:220% 100%!important;
  box-shadow:none!important;
  animation:imageNodeGeneratingShimmer 1.8s linear infinite;
}
.node.node-image[data-task-state="queued"] .image-node-placeholder .big-icon,
.node.node-image[data-task-state="running"] .image-node-placeholder .big-icon{display:none!important}
.node.node-image[data-task-state="queued"] .image-node-try,
.node.node-image[data-task-state="running"] .image-node-try,
.node.node-image[data-task-state="queued"] .image-node-upload,
.node.node-image[data-task-state="running"] .image-node-upload{display:none!important}
.image-node-generating-size{
  position:absolute;
  right:0;
  top:-24px;
  z-index:5;
  color:#666;
  font:400 11px/16px var(--ui-font-sans);
  letter-spacing:.01em;
  pointer-events:none;
}
.image-node-generating-overlay{
  position:absolute;
  inset:0;
  z-index:6;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  color:#a9a9a9;
  pointer-events:none;
}
.image-node-generating-overlay b{font:500 12px/16px var(--ui-font-sans);color:#aaa}
.image-node-generating-overlay small{font:400 11px/16px var(--ui-font-mono);color:#777}
.image-node-generating-spinner{
  width:13px;height:13px;
  border:1.5px solid #555;
  border-top-color:#aaa;
  border-radius:50%;
  animation:imageNodeGeneratingSpin .85s linear infinite;
}
.node.node-image[data-task-state="queued"] .ui-v23-result-progress,
.node.node-image[data-task-state="running"] .ui-v23-result-progress{display:none!important}
@keyframes imageNodeGeneratingSpin{to{transform:rotate(360deg)}}
@keyframes imageNodeGeneratingShimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
@media (prefers-reduced-motion:reduce){
  .node.node-image[data-task-state="queued"] .image-node-placeholder.image-node-stage,
  .node.node-image[data-task-state="running"] .image-node-placeholder.image-node-stage,
  .image-node-generating-spinner{animation:none}
}

'''
if block.strip() not in s:
    if marker not in s: raise SystemExit('image css insertion marker missing')
    s=s.replace(marker,block+marker,1)
write('styles/image-node.css',s)

# 3) Cache bust app.js after the render change.
s=read('browser-bootstrap.js')
s=re.sub(r"const v='[^']+';","const v='20260828-image-generation-state-1';",s,count=1)
write('browser-bootstrap.js',s)

# 4) Add regression coverage.
test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'styles/image-node.css'),'utf8');

test('image generation skeleton uses the selected aspect ratio for every ratio',()=>{
  assert.match(app,/imageGenerating=\['queued','running'\]/);
  assert.match(app,/targetRatio=String\(n\.aspectRatio\|\|n\.cropRatio\|\|'1:1'\)/);
  assert.match(app,/aspect-ratio:\$\{escapeAttr\(ratioCss\)\}/);
  assert.match(app,/image-node-placeholder image-node-stage\\" style=\\"\$\{ratioStyle\}/);
});

test('image generation skeleton shows requested pixel dimensions and hides empty controls',()=>{
  assert.match(app,/CanvasImageRequestParameters\?\.normalize/);
  assert.match(app,/image-node-generating-size/);
  assert.match(css,/\.image-node-generating-size/);
  assert.match(css,/\.image-node-try,[\s\S]*display:none!important/);
});

test('queued and running image nodes are auto-height with no black footer',()=>{
  assert.match(css,/data-task-state=\\"queued\\"[\s\S]*height:auto!important/);
  assert.match(css,/image-node-shell\.is-generating[\s\S]*background:transparent!important/);
  assert.match(css,/image-node-placeholder\.image-node-stage[\s\S]*animation:imageNodeGeneratingShimmer/);
});
'''
write('tests/image-generation-node-state.test.mjs',test)
print('patched image generation node skeleton')
