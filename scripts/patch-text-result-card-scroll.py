from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
app_path=ROOT/'app.js'
css_path=ROOT/'styles'/'text-node.css'
index_path=ROOT/'index.html'
test_path=ROOT/'tests'/'text-result-card-scroll.test.mjs'

app=app_path.read_text(encoding='utf-8')

helper="""  function ensureGeneratedTextNodeLayout(n){
    if(!n||n.type!=='text'||n.textInputMode==='manual')return false;
    const text=String(n.text||n.generatedText||'').trim();
    if(!text)return false;
    let changed=false;
    const width=Number(n.w||0),height=Number(n.h||0);
    if(!Number.isFinite(width)||width<520){n.w=560;changed=true}
    if(!Number.isFinite(height)||height<=0){n.h=260;changed=true}
    return changed;
  }
"""
anchor="  function nodeDefaultHeight(n){"
if helper not in app:
    if anchor not in app: raise SystemExit('node size anchor missing')
    app=app.replace(anchor,helper+anchor,1)

old_migrate="else{x.textEditorExpanded=false;delete x.textEditorExpandedBackup}}if(x.type==='script'"
new_migrate="else{x.textEditorExpanded=false;delete x.textEditorExpandedBackup;ensureGeneratedTextNodeLayout(x)}}if(x.type==='script'"
if new_migrate not in app:
    if old_migrate not in app: raise SystemExit('text migrate anchor missing')
    app=app.replace(old_migrate,new_migrate,1)

old_selector="button,input,select,textarea,.node-port,.node-menu-btn"
new_selector="button,input,select,textarea,.text-node-preview,.node-port,.node-menu-btn"
if new_selector not in app:
    count=app.count(old_selector)
    if count<3: raise SystemExit(f'pointer selector count too small: {count}')
    app=app.replace(old_selector,new_selector)

old_output="else if(out.type!=='url'&&out.value!==undefined)n.generatedResult=out.value;"
new_output="else if(out.type!=='url'&&out.value!==undefined)n.generatedResult=out.value;\n        if(n.type==='text')ensureGeneratedTextNodeLayout(n);"
if new_output not in app:
    count=app.count(old_output)
    if count<2: raise SystemExit(f'text output anchor count too small: {count}')
    app=app.replace(old_output,new_output)

old_wheel="viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect();if(!e.ctrlKey&&!e.metaKey&&Math.abs(e.deltaX)+Math.abs(e.deltaY)<140){state.viewport.x-=e.deltaX;state.viewport.y-=e.deltaY;scheduleViewportTransform();scheduleVirtualizationRefresh();queueViewportSave();return}const old=state.viewport.zoom,next=Math.max(.1,Math.min(8,old*Math.exp(-e.deltaY*.0014))),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wx=(sx-state.viewport.x)/old,wy=(sy-state.viewport.y)/old;state.viewport.zoom=next;state.viewport.x=sx-wx*next;state.viewport.y=sy-wy*next;scheduleViewportTransform();scheduleVirtualizationRefresh(true);queueViewportSave()}, {passive:false});"
new_wheel="""viewport.addEventListener('wheel',e=>{
    const textPreview=e.target.closest?.('.text-node-preview[data-text-result]');
    if(textPreview&&document.activeElement===textPreview)return;
    e.preventDefault();const rect=viewport.getBoundingClientRect();if(!e.ctrlKey&&!e.metaKey&&Math.abs(e.deltaX)+Math.abs(e.deltaY)<140){state.viewport.x-=e.deltaX;state.viewport.y-=e.deltaY;scheduleViewportTransform();scheduleVirtualizationRefresh();queueViewportSave();return}const old=state.viewport.zoom,next=Math.max(.1,Math.min(8,old*Math.exp(-e.deltaY*.0014))),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wx=(sx-state.viewport.x)/old,wy=(sy-state.viewport.y)/old;state.viewport.zoom=next;state.viewport.x=sx-wx*next;state.viewport.y=sy-wy*next;scheduleViewportTransform();scheduleVirtualizationRefresh(true);queueViewportSave()
  }, {passive:false});"""
if new_wheel not in app:
    if old_wheel not in app: raise SystemExit('viewport wheel anchor missing')
    app=app.replace(old_wheel,new_wheel,1)

app_path.write_text(app,encoding='utf-8')

css=css_path.read_text(encoding='utf-8')
css=css.replace(".node.node-text[data-content-state=\"result\"]{\n  min-height:260px;", ".node.node-text[data-content-state=\"result\"]{\n  height:260px;\n  min-height:260px;",1)
css=css.replace(".node.node-text[data-content-state=\"result\"]>.node-body{\n  min-height:258px;", ".node.node-text[data-content-state=\"result\"]>.node-body{\n  height:258px;\n  min-height:258px;\n  overflow:hidden;",1)
css=css.replace(".text-node-shell.has-text{\n  min-height:258px;", ".text-node-shell.has-text{\n  height:258px;\n  min-height:258px;\n  overflow:hidden;",1)
old_preview=""".text-node-preview{
  width:100%;
  min-height:216px;
  max-height:520px;
  overflow:auto;"""
new_preview=""".text-node-preview{
  width:100%;
  height:100%;
  min-height:0;
  max-height:none;
  flex:1 1 auto;
  overflow:auto;"""
if new_preview not in css:
    if old_preview not in css: raise SystemExit('text preview css anchor missing')
    css=css.replace(old_preview,new_preview,1)
if '.text-node-preview:focus{outline:none}' not in css:
    css=css.replace('.text-node-preview::-webkit-scrollbar{width:6px}', '.text-node-preview:focus{outline:none}\n.text-node-preview::-webkit-scrollbar{width:6px}',1)
css_path.write_text(css,encoding='utf-8')

index=index_path.read_text(encoding='utf-8')
old_link='<link rel="stylesheet" href="./styles/text-node.css" />'
new_link='<link rel="stylesheet" href="./styles/text-node.css?v=20260901-text-result-card-scroll-1" />'
if old_link in index:index=index.replace(old_link,new_link,1)
elif new_link not in index:raise SystemExit('text-node css link anchor missing')
index_path.write_text(index,encoding='utf-8')

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('generated AI text nodes use a horizontal result card',()=>{
  assert.match(app,/function ensureGeneratedTextNodeLayout\(n\)/);
  assert.match(app,/n\.w=560/);
  assert.match(app,/n\.h=260/);
  assert.match(css,/data-content-state="result"\]\{\s*height:260px;/);
});

test('text result body stays fixed and scrolls internally',()=>{
  assert.match(css,/\.text-node-preview\{[\s\S]*?height:100%;[\s\S]*?min-height:0;[\s\S]*?max-height:none;[\s\S]*?overflow:auto;/);
});

test('clicking a text result does not start node dragging and wheel stays in the result',()=>{
  assert.match(app,/textarea,\.text-node-preview,\.node-port/);
  assert.match(app,/textPreview=e\.target\.closest\?\.\('\.text-node-preview\[data-text-result\]'\)/);
  assert.match(app,/if\(textPreview&&document\.activeElement===textPreview\)return;/);
});

test('text result stylesheet is cache busted',()=>{
  assert.match(index,/text-node\.css\?v=20260901-text-result-card-scroll-1/);
});
""",encoding='utf-8')
print('text result card and scroll repair applied')
