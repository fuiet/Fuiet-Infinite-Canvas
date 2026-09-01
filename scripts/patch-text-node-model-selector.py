from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')

app_path=ROOT/'app.js'
app=app_path.read_text(encoding='utf-8')
old="""    const footerHtml=contentState==='empty'?`<div class=\"node-footer\"><span>${n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':'')}</span><span style=\"margin-left:auto\">${taskState==='queued'?'排队中':taskState==='running'?'生成中':''}</span></div>`:'';
"""
new="""    const footerModelHtml=n.type==='text'?`<button type=\"button\" class=\"node-model-selector ${n.modelId?'':'needs-model'}\" data-node-model-selector title=\"选择文本模型\" aria-label=\"选择文本模型\"><span>${escapeHtml(n.modelName||'选择模型')}</span>${uiIcon('chevronDown')}</button>`:`<span>${n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':'')}</span>`;
    const footerHtml=contentState==='empty'?`<div class=\"node-footer\">${footerModelHtml}<span style=\"margin-left:auto\">${taskState==='queued'?'排队中':taskState==='running'?'生成中':''}</span></div>`:'';
"""
if old not in app:
    raise SystemExit('footer anchor missing')
app=app.replace(old,new,1)
old="""    uiV23BindMediaMetadata(n,el);
    el.addEventListener('pointerdown',e=>{
"""
new="""    uiV23BindMediaMetadata(n,el);
    el.querySelector('[data-node-model-selector]')?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(n.type!=='text')return;
      openModelPickerForNode(n,e.currentTarget,'text');
    });
    el.addEventListener('pointerdown',e=>{
"""
if old not in app:
    raise SystemExit('model selector bind anchor missing')
app=app.replace(old,new,1)
app_path.write_text(app,encoding='utf-8')

css_path=ROOT/'styles'/'text-node.css'
css=css_path.read_text(encoding='utf-8')
anchor=""".node.node-text .node-menu-btn{display:none}

"""
addition=""".node.node-text .node-menu-btn{display:none}
.node.node-text .node-footer .node-model-selector{
  max-width:210px;
  min-width:0;
  height:26px;
  display:inline-flex;
  align-items:center;
  gap:5px;
  padding:0 6px;
  border:0;
  border-radius:6px;
  background:transparent;
  color:var(--ui-text-3);
  font:500 11px/16px var(--ui-font-sans);
  cursor:pointer;
}
.node.node-text .node-footer .node-model-selector>span{
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.node.node-text .node-footer .node-model-selector .ui-icon{width:12px;height:12px;flex:0 0 12px}
.node.node-text .node-footer .node-model-selector:hover,
.node.node-text .node-footer .node-model-selector:focus-visible{
  background:var(--ui-surface-3);
  color:var(--ui-text-1);
  outline:none;
}
.node.node-text .node-footer .node-model-selector.needs-model{color:var(--ui-selected)}

"""
if anchor not in css:
    raise SystemExit('text css anchor missing')
css=css.replace(anchor,addition,1)
css_path.write_text(css,encoding='utf-8')

test_path=ROOT/'tests'/'text-node-v23.test.mjs'
test=test_path.read_text(encoding='utf-8')
addition=r'''

test('empty text node exposes a real model selector wired to text-only models', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /data-node-model-selector/);
  assert.match(app, /title=\"选择文本模型\"/);
  assert.match(app, /openModelPickerForNode\(n,e\.currentTarget,'text'\)/);
  assert.match(app, /const modality=modalityOverride\|\|n\.type/);
  assert.match(app, /allModelsForType\(modality\)/);
  assert.match(app, /else setNodeModel\(n,item\)/);
  assert.match(css, /\.node\.node-text \.node-footer \.node-model-selector/);
});
'''
if "empty text node exposes a real model selector wired to text-only models" not in test:
    test=test.rstrip()+addition+'\n'
test_path.write_text(test,encoding='utf-8')
print('patched text node model selector')
