from pathlib import Path

root=Path('_read_123_zip_20260821_180410')
app_path=root/'app.js'
css_path=root/'styles'/'edge-reference-cards-v1.css'
test_path=root/'tests'/'edge-reference-card-ui.test.mjs'
bootstrap_path=root/'browser-bootstrap.js'

app=app_path.read_text(encoding='utf-8')
bootstrap=bootstrap_path.read_text(encoding='utf-8')

# 1) Keep the upstream-edge model, but render it in the generator instead of the canvas node card.
media_start=app.find('  function nodeReferenceMediaHtml(source,detail=false){')
old_node_helper=app.find('  function nodeIncomingReferenceHtml(target){', media_start)
if media_start<0 or old_node_helper<0:
    if 'function generatorIncomingReferenceHtml(target)' not in app:
        raise SystemExit('reference helper anchors missing')
else:
    media_fn=r'''  function nodeReferenceMediaHtml(source,detail=false){
    const url=String(source?.outputUrl||'').trim(),type=source?.type||'';
    if(url&&type==='image')return`<img src="${escapeAttr(url)}" alt="${escapeAttr(source.title||'参考图片')}" loading="lazy">`;
    if(url&&type==='video')return`<video src="${escapeAttr(url)}" muted playsinline preload="metadata" ${detail?'controls':''}></video>`;
    if(url&&type==='audio')return detail?`<audio src="${escapeAttr(url)}" controls preload="none"></audio>`:`<span class="generator-reference-fallback">音</span>`;
    if(type==='text'&&!detail)return`<span class="generator-reference-text-icon" aria-hidden="true"><i></i><i></i><i></i></span>`;
    const glyph=type==='text'?'文':type==='image'?'图':type==='video'?'视':type==='audio'?'音':'参';
    return`<span class="generator-reference-fallback">${glyph}</span>`;
  }
'''
    app=app[:media_start]+media_fn+app[old_node_helper:]

old_node_helper=app.find('  function nodeIncomingReferenceHtml(target){')
render_node_start=app.find('  function renderNode(n){', old_node_helper if old_node_helper>=0 else 0)
if old_node_helper>=0 and render_node_start>old_node_helper:
    generator_helper=r'''  function generatorIncomingReferenceHtml(target){
    const refs=incomingEdgeReferences(target);
    if(!refs.length)return'';
    return`<div class="generator-reference-strip" data-generator-reference-strip aria-label="上游节点参考">${refs.map(({source,role},index)=>{
      const title=source.title||labelForType(source.type),text=nodeReferenceCurrentText(source),detailText=text?`<p>${escapeHtml(text.slice(0,900))}</p>`:'';
      return`<div class="generator-reference-chip" data-reference-source="${escapeAttr(source.id)}" data-reference-order="${index+1}" tabindex="0" aria-label="参考 ${index+1}：${escapeAttr(title)}"><span class="generator-reference-index">${index+1}</span><div class="generator-reference-thumb">${nodeReferenceMediaHtml(source,false)}</div><div class="generator-reference-popover" role="tooltip"><div class="generator-reference-preview">${nodeReferenceMediaHtml(source,true)}</div><div class="generator-reference-detail"><b>${escapeHtml(title)}</b><small>${escapeHtml(labelForType(source.type))} · ${escapeHtml(edgeRoleLabel(role||'reference'))}</small>${detailText}</div></div></div>`;
    }).join('')}</div>`;
  }
'''
    app=app[:old_node_helper]+generator_helper+app[render_node_start:]
elif 'function generatorIncomingReferenceHtml(target)' not in app:
    raise SystemExit('node reference helper missing')

# Remove the previous visual reference cards from renderNode().
app=app.replace("    const incomingReferenceHtml=nodeIncomingReferenceHtml(n);if(incomingReferenceHtml)el.dataset.hasReferences='1';\n",'',1)
app=app.replace('      ${incomingReferenceHtml}\n      <div class="node-body">${body}</div>\n','      <div class="node-body">${body}</div>\n',1)
if 'nodeIncomingReferenceHtml(n)' in app:
    raise SystemExit('node-card reference rendering still present')

# 2) Build the live reference strip once per active generator.
anchor="    const desiredWidth=Math.min(660,window.innerWidth-64);\n\n    if(n.type==='script'){"
replacement="    const desiredWidth=Math.min(660,window.innerWidth-64);\n    const incomingReferenceHtml=generatorIncomingReferenceHtml(n);\n\n    if(n.type==='script'){"
if replacement not in app:
    if anchor not in app: raise SystemExit('renderGenerator reference anchor missing')
    app=app.replace(anchor,replacement,1)

# Script generator: refs are the first content row.
old='''      generator.innerHTML=`<div class="lib-gen-main script-detail-main">\n        <div class="script-detail-mode">'''
new='''      generator.innerHTML=`<div class="lib-gen-main script-detail-main">\n        ${incomingReferenceHtml}\n        <div class="script-detail-mode">'''
if new not in app:
    if old not in app: raise SystemExit('script generator anchor missing')
    app=app.replace(old,new,1)

# Insert the strip immediately before each media prompt, below the generator's own top controls.
def insert_before_in_branch(text, branch_marker, marker, payload):
    b=text.find(branch_marker)
    if b<0: raise SystemExit(f'branch missing: {branch_marker}')
    m=text.find(marker,b)
    if m<0: raise SystemExit(f'marker missing after {branch_marker}: {marker}')
    if text[max(b,m-len(payload)-12):m].endswith(payload):
        return text
    return text[:m]+payload+text[m:]

payload='        ${incomingReferenceHtml}\n'
app=insert_before_in_branch(app,"    if(n.type==='image'){",'        <div class="prompt-box image-prompt-box">',payload)
app=insert_before_in_branch(app,"    if(n.type==='video'){",'        <div class="prompt-box video-prompt-box">',payload)
app=insert_before_in_branch(app,"    if(n.type==='audio'){",'        <div class="prompt-box audio-prompt-box">',payload)

# Text generator: refs sit above the prompt field.
text_anchor='''      <div class="lib-gen-main ${n.type==='text'?'text-generator-main':''}">\n        <div class="prompt-box libtv-prompt">'''
text_replacement='''      <div class="lib-gen-main ${n.type==='text'?'text-generator-main':''}">\n        ${incomingReferenceHtml}\n        <div class="prompt-box libtv-prompt">'''
if text_replacement not in app:
    if text_anchor not in app: raise SystemExit('text generator anchor missing')
    app=app.replace(text_anchor,text_replacement,1)

# 3) Grow fixed generator shells only when connected upstream references are present.
pos_old="""    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video',isAudio=n?.type==='audio';\n"""
pos_new="""    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video',isAudio=n?.type==='audio',incomingRefCount=incomingEdgeReferences(n).length;\n"""
if pos_new not in app:
    if pos_old not in app: raise SystemExit('position generator header anchor missing')
    app=app.replace(pos_old,pos_new,1)
height_old="""      const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:226,bottomLimit=window.innerHeight-dockReserve-edge;\n"""
height_new="""      const width=isImage||isVideo?820:isAudio?660:594,baseHeight=isImage?246:isVideo?258:isAudio?210:226,refsPerRow=isImage||isVideo?13:isAudio?10:8,referenceRows=incomingRefCount?Math.ceil(incomingRefCount/refsPerRow):0,height=baseHeight+Math.min(3,referenceRows)*52,bottomLimit=window.innerHeight-dockReserve-edge;\n"""
if height_new not in app:
    if height_old not in app: raise SystemExit('position generator height anchor missing')
    app=app.replace(height_old,height_new,1)

# 4) Generator-only visual styling. Popover opens upward like the supplied reference UI.
css=r'''.generator-reference-strip{
  position:relative;
  z-index:35;
  display:flex;
  flex-wrap:wrap;
  align-items:flex-start;
  gap:7px;
  min-height:44px;
  padding:2px 0 5px;
  overflow:visible;
}
.generator-reference-chip{
  position:relative;
  width:44px;
  height:44px;
  flex:0 0 44px;
  border:1px solid rgba(255,255,255,.18);
  border-radius:9px;
  background:rgba(255,255,255,.075);
  box-shadow:0 2px 8px rgba(0,0,0,.18);
  outline:none;
  cursor:default;
}
.generator-reference-thumb{
  width:100%;height:100%;overflow:hidden;border-radius:8px;
  display:grid;place-items:center;background:rgba(255,255,255,.055);
}
.generator-reference-thumb img,.generator-reference-thumb video{
  width:100%;height:100%;display:block;object-fit:cover;border-radius:8px;
}
.generator-reference-index{
  position:absolute;z-index:4;left:-4px;top:-5px;min-width:15px;height:15px;padding:0 3px;
  display:grid;place-items:center;border-radius:8px;background:#1b1b1b;border:1px solid rgba(255,255,255,.22);
  color:#f2f2f2;font-size:9px;font-weight:700;line-height:1;
}
.generator-reference-text-icon{
  width:21px;height:20px;display:flex;flex-direction:column;justify-content:center;gap:3px;
}
.generator-reference-text-icon i{display:block;height:2px;border-radius:2px;background:rgba(255,255,255,.72)}
.generator-reference-text-icon i:nth-child(1){width:18px}.generator-reference-text-icon i:nth-child(2){width:18px}.generator-reference-text-icon i:nth-child(3){width:12px}
.generator-reference-fallback{
  display:grid;place-items:center;width:100%;height:100%;font-size:13px;
  font-weight:700;color:rgba(255,255,255,.78);letter-spacing:.04em;
}
.generator-reference-chip:hover,.generator-reference-chip:focus-visible{
  border-color:rgba(255,255,255,.52);
  background:rgba(255,255,255,.11);
  box-shadow:0 4px 16px rgba(0,0,0,.30);
}
.generator-reference-popover{
  position:absolute;
  bottom:calc(100% + 10px);
  left:0;
  z-index:180;
  width:250px;
  max-width:min(340px,72vw);
  padding:7px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:11px;
  background:rgba(16,16,16,.985);
  box-shadow:0 15px 36px rgba(0,0,0,.42);
  opacity:0;
  visibility:hidden;
  transform:translateY(5px);
  transition:opacity .12s ease,transform .12s ease,visibility .12s;
  pointer-events:none;
}
.generator-reference-chip:hover .generator-reference-popover,
.generator-reference-chip:focus-within .generator-reference-popover{
  opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto;
}
.generator-reference-preview{
  width:100%;max-height:220px;border-radius:8px;overflow:hidden;
  display:grid;place-items:center;background:#090909;
}
.generator-reference-preview img,.generator-reference-preview video{
  width:100%;max-height:220px;display:block;object-fit:contain;
}
.generator-reference-preview audio{width:100%;min-height:38px;}
.generator-reference-preview>.generator-reference-fallback{min-height:76px;}
.generator-reference-detail{padding:8px 4px 3px;display:grid;gap:3px;min-width:0;}
.generator-reference-detail b{font-size:12px;color:#f4f4f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.generator-reference-detail small{font-size:10px;color:rgba(255,255,255,.5);}
.generator-reference-detail p{
  margin:4px 0 0;max-height:118px;overflow:auto;font-size:11px;line-height:1.55;
  color:rgba(255,255,255,.74);white-space:pre-wrap;word-break:break-word;
}
'''

# 5) Regression tests pin the product terminology: references live in generators, not node cards.
test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/edge-reference-cards-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('incoming edges remain real generation references',()=>{
  assert.match(app,/state\.edges\.filter\(e=>e\.target===nodeId\)[\s\S]*?addRef\(/);
  assert.match(app,/function incomingEdgeReferences\(target\)[\s\S]*?state\.edges\.filter\(e=>e\.target===target\.id\)/);
  assert.match(app,/text:x\.generatedText\|\|x\.text\|\|x\.prompt\|\|''/);
});

test('upstream references render in the generator, never in the canvas node card',()=>{
  assert.doesNotMatch(app,/nodeIncomingReferenceHtml\(n\)/);
  assert.doesNotMatch(app,/data-has-references/);
  assert.match(app,/const incomingReferenceHtml=generatorIncomingReferenceHtml\(n\)/);
  assert.match(app,/function generatorIncomingReferenceHtml\(target\)[\s\S]*?incomingEdgeReferences\(target\)/);
  const uses=(app.match(/\$\{incomingReferenceHtml\}/g)||[]).length;
  assert.ok(uses>=5,`expected generator reference strip in script, image, video, audio and text generators; got ${uses}`);
});

test('every incoming edge becomes one visible reference chip',()=>{
  assert.match(app,/refs\.map\(\(\{source,role\},index\)=>/);
  assert.match(app,/data-reference-source="\$\{escapeAttr\(source\.id\)\}"/);
  assert.match(app,/data-reference-order="\$\{index\+1\}"/);
  assert.doesNotMatch(app,/generatorIncomingReferenceHtml\(target\)[\s\S]{0,1000}?\.slice\(/);
});

test('generator reference chips support text, media and upward hover detail',()=>{
  assert.match(app,/source\?\.generatedText\|\|source\?\.text\|\|source\?\.prompt/);
  assert.match(app,/source\?\.outputUrl/);
  assert.match(app,/class="generator-reference-popover" role="tooltip"/);
  assert.match(css,/\.generator-reference-strip\{/);
  assert.match(css,/\.generator-reference-chip:hover \.generator-reference-popover/);
  assert.match(css,/bottom:calc\(100% \+ 10px\)/);
  assert.doesNotMatch(css,/\.node-reference-stack/);
});

test('fixed generator shells expand to contain connected-reference rows',()=>{
  assert.match(app,/incomingRefCount=incomingEdgeReferences\(n\)\.length/);
  assert.match(app,/referenceRows=incomingRefCount\?Math\.ceil\(incomingRefCount\/refsPerRow\):0/);
  assert.match(app,/height=baseHeight\+Math\.min\(3,referenceRows\)\*52/);
});

test('generator reference assets are explicitly cache busted',()=>{
  assert.match(bootstrap,/edge-reference-cards-v1\.css\?v=\$\{v\}&ui=generator-reference-strip-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1/);
});
'''

bootstrap=bootstrap.replace('&refs=edge-reference-card-1','&refs=generator-reference-strip-1')
bootstrap=bootstrap.replace('&ui=edge-reference-card-1','&ui=generator-reference-strip-1')
if 'generator-reference-strip-1' not in bootstrap:
    raise SystemExit('bootstrap cache marker repair failed')

app_path.write_text(app,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
test_path.write_text(test,encoding='utf-8')
bootstrap_path.write_text(bootstrap,encoding='utf-8')
print('moved connected upstream references from node cards into generators')
