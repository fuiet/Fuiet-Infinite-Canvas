from pathlib import Path
import re

ROOT=Path('_read_123_zip_20260821_180410')
app=ROOT/'app.js'
boot=ROOT/'browser-bootstrap.js'

def sub_once(text, pattern, repl, label, flags=0):
    new, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 replacement, got {count}')
    return new

s=app.read_text()

# 1) Model switching: image nodes stay in the inline generator instead of opening Image Studio.
s=sub_once(
    s,
    r"const reopenActiveEditor=\(\)=>\{if\(expandedNodeId!==n\.id\)return render\(\);if\(n\.type==='video'\)openVideoStudio\(n\);else if\(n\.type==='image'\)openImageStudio\(n\);else if\(n\.type==='script'\)renderGenerator\(\);else renderGenerator\(\)\};",
    "const reopenActiveEditor=()=>{if(expandedNodeId!==n.id)return render();if(n.type==='video')openVideoStudio(n);else render()};",
    'model switch inline image generator'
)

# 2) Remove the expand-to-studio button from the normal image generator.
s=s.replace('<button type="button" class="image-gen-expand" id="imageGenExpand" title="打开图像工作台">↗</button>','')
s=s.replace("      $('#imageGenExpand')?.addEventListener('click',()=>openImageStudio(n));\n",'')

# 3) Remove toolbar / context-menu Image Studio actions while keeping normal image tools.
s=s.replace("    if(tool==='图像工作台'){openImageStudio(n);return;}\n",'')
s=s.replace('<button class="menu-item strong" data-act="image-studio">打开 Image Studio</button>','')
s=s.replace("if(act==='image-studio'){contextMenu.classList.add('hidden');openImageStudio(n);return}",'')

# 4) Character-three-view helpers now land in the normal image generator, not Studio.
s=s.replace("image.aspectRatio='16:9';expandedNodeId=image.id;selectedId=image.id;state.selectedIds=[image.id];saveState();render();setTimeout(()=>openImageStudio(image,'compose'),0);return;",
            "image.aspectRatio='16:9';expandedNodeId=image.id;selectedId=image.id;state.selectedIds=[image.id];saveState();render();return;")
s=s.replace("saveState();render();focusNode(node.id);setTimeout(()=>openImageStudio(node),0);\n      return;",
            "saveState();render();focusNode(node.id);setTimeout(()=>{expandedNodeId=node.id;render()},0);\n      return;")

# 5) Delete the legacy full-screen Image Studio implementation, preserving shared video-studio helpers.
s=sub_once(
    s,
    r"\n  function openImageStudio\(n\)\{.*?\n  \}\n  function openVideoStudio\(n\)\{",
    "\n  function openVideoStudio(n){",
    'legacy Image Studio implementation',
    re.S
)

# 6) Delete Canvas/Image Studio v3.5.x shell itself. Keep the later mask/image-tool functions,
#    because they are also used directly from normal image-node tools.
s=sub_once(
    s,
    r"\n  function openImageStudio\(n,initialTool\)\{.*?\n\n  function openMaskEditor\(n,tool,opts=\{\}\)\{",
    "\n\n  function openMaskEditor(n,tool,opts={}){",
    'Canvas Studio v3.5 shell',
    re.S
)

# 7) A direct inpaint flow used to jump back to Image Studio. Return to the normal generator instead.
s=s.replace("openImageStudio(n,opts.returnTool||'inpaint');showToast('蒙版已创建为新的工作版本')",
            "expandedNodeId=n.id;render();showToast('蒙版已创建为新的图片版本')")
s=s.replace("openImageStudio(n,opts.returnTool||'inpaint');showToast('蒙版已保存为当前图片的新版本')",
            "expandedNodeId=n.id;render();showToast('蒙版已保存为当前图片的新版本')")

# The feature must be fully unreachable after this patch.
for token in ['openImageStudio(', 'imageGenExpand', 'data-act="image-studio"', "tool==='图像工作台'", 'Image Studio · 图像工作台']:
    if token in s:
        raise SystemExit(f'Image Studio removal incomplete; still found: {token}')

app.write_text(s)

# Force browsers to load the new app runtime without invalidating unrelated shared assets.
b=boot.read_text()
needle='&resultimagegen=1`'
if needle in b and '&imageStudio=removed-1' not in b:
    b=b.replace(needle,'&resultimagegen=1&imageStudio=removed-1`',1)
elif '&imageStudio=removed-1' not in b:
    raise SystemExit('browser bootstrap app cache marker not found')
boot.write_text(b)

# Focused regression coverage.
t=ROOT/'tests'/'remove-image-studio.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='_read_123_zip_20260821_180410';
const app=fs.readFileSync(`${root}/app.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('Image Studio / Canvas Studio entry points are removed',()=>{
  for(const token of ['openImageStudio(','imageGenExpand','data-act="image-studio"',"tool==='图像工作台'",'Image Studio · 图像工作台']){
    assert.equal(app.includes(token),false,`still contains ${token}`);
  }
});

test('image model selection returns directly to inline generator',()=>{
  assert.match(app,/const reopenActiveEditor=\(\)=>\{if\(expandedNodeId!==n\.id\)return render\(\);if\(n\.type==='video'\)openVideoStudio\(n\);else render\(\)\};/);
  assert.match(app,/\$\$\('\[data-model-pick\]'[^\n]+setNodeModel\(n,item\)[^\n]+reopenActiveEditor\(\)/);
});

test('normal image generator model and prompt controls remain intact',()=>{
  assert.match(app,/class=\"lib-gen-main image-generator-main\"/);
  assert.match(app,/id=\"modelPickerBtn\"/);
  assert.match(app,/id=\"promptInput\"/);
  assert.match(app,/id=\"ratioSelect\"/);
  assert.match(app,/id=\"resolutionSelect\"/);
  assert.match(app,/id=\"generateBtn\"/);
});

test('image context menu keeps useful direct actions without Studio',()=>{
  assert.match(app,/data-act=\"image-storyboard\"/);
  assert.match(app,/data-act=\"image-video\"/);
  assert.doesNotMatch(app,/data-act=\"image-studio\"/);
});

test('generated image click behavior remains enabled',()=>{
  assert.match(app,/clicked\.type==='image'&&clickedState==='result'/);
});

test('browser cache explicitly invalidates old Image Studio runtime',()=>{
  assert.match(boot,/&imageStudio=removed-1/);
});
''')

print('Removed Image Studio shell and made image model switching stay inline.')
