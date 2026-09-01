from pathlib import Path

root=Path('_read_123_zip_20260821_180410')
app_path=root/'app.js'
bootstrap_path=root/'browser-bootstrap.js'
css_path=root/'styles'/'edge-reference-cards-v1.css'
test_path=root/'tests'/'edge-reference-card-ui.test.mjs'

app=app_path.read_text(encoding='utf-8')
bootstrap=bootstrap_path.read_text(encoding='utf-8')

# Keep text-node references aligned with the latest visible/generated text.
app=app.replace("text:x.text||x.prompt||''", "text:x.generatedText||x.text||x.prompt||''")

helper_marker='function nodeIncomingReferenceHtml(target){'
if helper_marker not in app:
    anchor='  function renderNode(n){\n'
    if anchor not in app:
        raise SystemExit('renderNode anchor missing')
    helper=r'''  function incomingEdgeReferences(target){
    if(!target)return[];
    return state.edges.filter(e=>e.target===target.id).map(edge=>{
      const source=state.nodes.find(n=>n.id===edge.source);
      if(!source)return null;
      return{edge,source,role:edge.role||inferEdgeRole(source,target)};
    }).filter(Boolean);
  }
  function nodeReferenceCurrentText(source){
    return String(source?.generatedText||source?.text||source?.prompt||'').trim();
  }
  function nodeReferenceMediaHtml(source,detail=false){
    const url=String(source?.outputUrl||'').trim(),type=source?.type||'';
    if(url&&type==='image')return`<img src="${escapeAttr(url)}" alt="${escapeAttr(source.title||'参考图片')}" loading="lazy">`;
    if(url&&type==='video')return`<video src="${escapeAttr(url)}" muted playsinline preload="metadata" ${detail?'controls':''}></video>`;
    if(url&&type==='audio')return detail?`<audio src="${escapeAttr(url)}" controls preload="none"></audio>`:`<span class="node-reference-fallback">音</span>`;
    const glyph=type==='text'?'文':type==='image'?'图':type==='video'?'视':type==='audio'?'音':'参';
    return`<span class="node-reference-fallback">${glyph}</span>`;
  }
  function nodeIncomingReferenceHtml(target){
    const refs=incomingEdgeReferences(target);
    if(!refs.length)return'';
    return`<div class="node-reference-stack" data-node-reference-stack aria-label="已连接参考">${refs.map(({source,role})=>{
      const title=source.title||labelForType(source.type),text=nodeReferenceCurrentText(source),detailText=text?`<p>${escapeHtml(text.slice(0,600))}</p>`:'';
      return`<div class="node-reference-chip" data-reference-source="${escapeAttr(source.id)}" tabindex="0" aria-label="参考：${escapeAttr(title)}"><div class="node-reference-thumb">${nodeReferenceMediaHtml(source,false)}</div><div class="node-reference-popover" role="tooltip"><div class="node-reference-preview">${nodeReferenceMediaHtml(source,true)}</div><div class="node-reference-detail"><b>${escapeHtml(title)}</b><small>${escapeHtml(labelForType(source.type))} · ${escapeHtml(edgeRoleLabel(role||'reference'))}</small>${detailText}</div></div></div>`;
    }).join('')}</div>`;
  }
'''
    app=app.replace(anchor,helper+anchor,1)

# Render the live edge-driven reference cards inside the target node.
if '${incomingReferenceHtml}' not in app:
    anchor="    const resultMetaHtml=mediaResult?'<span class=\"ui-v23-result-meta\" data-node-result-meta hidden></span>':'';\n"
    if anchor not in app:
        raise SystemExit('resultMetaHtml anchor missing')
    replacement=anchor+"    const incomingReferenceHtml=nodeIncomingReferenceHtml(n);if(incomingReferenceHtml)el.dataset.hasReferences='1';\n"
    app=app.replace(anchor,replacement,1)
    body_anchor='      <div class="node-body">${body}</div>\n'
    if body_anchor not in app:
        raise SystemExit('node-body render anchor missing')
    app=app.replace(body_anchor,'      ${incomingReferenceHtml}\n'+body_anchor,1)

# Cache-bust and load the dedicated reference-card stylesheet.
old_app='`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1`,'
new_app='`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=edge-reference-card-1`,'
if new_app not in bootstrap:
    if old_app not in bootstrap:
        raise SystemExit('app bootstrap cache anchor missing')
    bootstrap=bootstrap.replace(old_app,new_app,1)
old_styles="if(isCanvas)await Promise.all([loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`),loadStyle(`./styles/video-result-autofit-v1.css?v=${v}`),loadStyle(`./styles/script-workflow-v2.css?v=${v}`)]);"
new_styles="if(isCanvas)await Promise.all([loadStyle(`./styles/image-result-autofit-v1.css?v=${v}`),loadStyle(`./styles/video-result-autofit-v1.css?v=${v}`),loadStyle(`./styles/script-workflow-v2.css?v=${v}`),loadStyle(`./styles/edge-reference-cards-v1.css?v=${v}&ui=edge-reference-card-1`)]);"
if new_styles not in bootstrap:
    if old_styles not in bootstrap:
        raise SystemExit('canvas style bootstrap anchor missing')
    bootstrap=bootstrap.replace(old_styles,new_styles,1)

css=r'''.node-reference-stack{
  position:absolute;
  top:34px;
  left:10px;
  z-index:18;
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  max-width:calc(100% - 20px);
  pointer-events:auto;
}
.node-reference-chip{
  position:relative;
  width:42px;
  height:42px;
  flex:0 0 42px;
  border:1px solid rgba(255,255,255,.22);
  border-radius:9px;
  background:rgba(20,20,20,.92);
  box-shadow:0 3px 12px rgba(0,0,0,.2);
  outline:none;
}
.node-reference-thumb{
  width:100%;height:100%;overflow:hidden;border-radius:8px;
  display:grid;place-items:center;background:rgba(255,255,255,.06);
}
.node-reference-thumb img,.node-reference-thumb video{
  width:100%;height:100%;display:block;object-fit:cover;border-radius:8px;
}
.node-reference-fallback{
  display:grid;place-items:center;width:100%;height:100%;font-size:13px;
  font-weight:700;color:rgba(255,255,255,.8);letter-spacing:.04em;
}
.node-reference-chip:hover,.node-reference-chip:focus-visible{
  border-color:rgba(255,255,255,.58);
  box-shadow:0 4px 18px rgba(0,0,0,.32);
}
.node-reference-popover{
  position:absolute;
  top:calc(100% + 9px);
  left:0;
  z-index:120;
  width:240px;
  max-width:min(320px,70vw);
  padding:7px;
  border:1px solid rgba(255,255,255,.16);
  border-radius:11px;
  background:rgba(19,19,19,.97);
  box-shadow:0 14px 34px rgba(0,0,0,.38);
  opacity:0;
  visibility:hidden;
  transform:translateY(-4px);
  transition:opacity .12s ease,transform .12s ease,visibility .12s;
  pointer-events:none;
}
.node-reference-chip:hover .node-reference-popover,
.node-reference-chip:focus-within .node-reference-popover{
  opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto;
}
.node-reference-preview{
  width:100%;max-height:210px;border-radius:8px;overflow:hidden;
  display:grid;place-items:center;background:#0c0c0c;
}
.node-reference-preview img,.node-reference-preview video{
  width:100%;max-height:210px;display:block;object-fit:contain;
}
.node-reference-preview audio{width:100%;min-height:38px;}
.node-reference-preview>.node-reference-fallback{min-height:78px;}
.node-reference-detail{padding:8px 4px 3px;display:grid;gap:3px;min-width:0;}
.node-reference-detail b{font-size:12px;color:#f4f4f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.node-reference-detail small{font-size:10px;color:rgba(255,255,255,.5);}
.node-reference-detail p{
  margin:4px 0 0;max-height:96px;overflow:auto;font-size:11px;line-height:1.5;
  color:rgba(255,255,255,.72);white-space:pre-wrap;word-break:break-word;
}
.node[data-content-state="empty"][data-has-references="1"] .node-body{
  padding-top:62px;box-sizing:border-box;
}
'''

test=r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/edge-reference-cards-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('incoming edges are both generation references and visible live reference cards',()=>{
  assert.match(app,/state\.edges\.filter\(e=>e\.target===nodeId\)[\s\S]*?addRef\(/);
  assert.match(app,/function incomingEdgeReferences\(target\)[\s\S]*?state\.edges\.filter\(e=>e\.target===target\.id\)/);
  assert.match(app,/const source=state\.nodes\.find\(n=>n\.id===edge\.source\)/);
  assert.match(app,/const incomingReferenceHtml=nodeIncomingReferenceHtml\(n\)/);
  assert.match(app,/\$\{incomingReferenceHtml\}[\s\S]*?<div class="node-body">\$\{body\}<\/div>/);
});

test('reference cards show the current source result and hover detail',()=>{
  assert.match(app,/source\?\.generatedText\|\|source\?\.text\|\|source\?\.prompt/);
  assert.match(app,/source\?\.outputUrl/);
  assert.match(app,/class="node-reference-popover" role="tooltip"/);
  assert.match(css,/\.node-reference-chip:hover \.node-reference-popover/);
  assert.match(css,/\.node-reference-chip:focus-within \.node-reference-popover/);
});

test('text references send latest generated text instead of stale prompt when available',()=>{
  assert.match(app,/text:x\.generatedText\|\|x\.text\|\|x\.prompt\|\|''/);
});

test('reference card assets are loaded with an explicit cache marker',()=>{
  assert.match(bootstrap,/edge-reference-cards-v1\.css\?v=\$\{v\}&ui=edge-reference-card-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=edge-reference-card-1/);
});
'''

app_path.write_text(app,encoding='utf-8')
bootstrap_path.write_text(bootstrap,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
test_path.write_text(test,encoding='utf-8')
print('patched semantic edge reference cards')
