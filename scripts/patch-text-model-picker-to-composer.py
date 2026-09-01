from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')

# 1) app.js: remove the model picker from the text node chrome and keep model selection in composer.
app_path = ROOT / 'app.js'
app = app_path.read_text(encoding='utf-8')

old_footer = '''    const footerModelHtml=n.type==='text'?`<button type="button" class="node-model-selector ${n.modelId?'':'needs-model'}" data-node-model-selector title="选择文本模型" aria-label="选择文本模型"><span>${escapeHtml(n.modelName||'选择模型')}</span>${uiIcon('chevronDown')}</button>`:`<span>${n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':'')}</span>`;
    const footerHtml=contentState==='empty'?`<div class="node-footer">${footerModelHtml}<span style="margin-left:auto">${taskState==='queued'?'排队中':taskState==='running'?'生成中':''}</span></div>`:'';
'''
new_footer = '''    const footerStatus=taskState==='queued'?'排队中':taskState==='running'?'生成中':'';
    const footerLabel=n.type==='text'?'':(n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':''));
    const footerHtml=contentState==='empty'&&(footerLabel||footerStatus)?`<div class="node-footer"><span>${footerLabel}</span><span style="margin-left:auto">${footerStatus}</span></div>`:'';
'''
if old_footer not in app:
    raise SystemExit('text-node footer model selector anchor missing')
app = app.replace(old_footer, new_footer, 1)

old_bind = '''    uiV23BindMediaMetadata(n,el);
    el.querySelector('[data-node-model-selector]')?.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(n.type!=='text')return;
      openModelPickerForNode(n,e.currentTarget,'text');
    });
    el.addEventListener('pointerdown',e=>{
'''
new_bind = '''    uiV23BindMediaMetadata(n,el);
    el.addEventListener('pointerdown',e=>{
'''
if old_bind not in app:
    raise SystemExit('text-node model selector binding anchor missing')
app = app.replace(old_bind, new_bind, 1)

# Ensure the text composer still exposes the shared, real model picker.
required = [
    '''<button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}">''',
    "$('#modelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget));",
    "const modality=modalityOverride||n.type;",
    "const allItems=allModelsForType(modality)"
]
for needle in required:
    if needle not in app:
        raise SystemExit(f'text composer model picker requirement missing: {needle}')

app_path.write_text(app, encoding='utf-8')

# 2) CSS: remove node-footer selector styling and strengthen the composer placement to match reference.
css_path = ROOT / 'styles' / 'text-node.css'
css = css_path.read_text(encoding='utf-8')

node_selector_css = '''.node.node-text .node-footer .node-model-selector{
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

'''
if node_selector_css not in css:
    raise SystemExit('node selector css anchor missing')
css = css.replace(node_selector_css, '', 1)

anchor = '''.generator-panel.text-generator .model-pill b{font-size:11px;line-height:15px;font-weight:600}
'''
replacement = '''.generator-panel.text-generator .model-pill{
  max-width:220px;
  padding:0 8px;
  justify-content:flex-start;
  gap:6px;
  border-radius:7px;
  cursor:pointer;
}
.generator-panel.text-generator .model-pill b{
  max-width:176px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  font-size:11px;
  line-height:15px;
  font-weight:600;
}
.generator-panel.text-generator .model-pill>i{
  width:12px;
  height:12px;
  display:grid;
  place-items:center;
  flex:0 0 12px;
}
.generator-panel.text-generator .model-pill.needs-model{color:var(--ui-selected)}
'''
if anchor not in css:
    raise SystemExit('composer model pill css anchor missing')
css = css.replace(anchor, replacement, 1)
css_path.write_text(css, encoding='utf-8')

# 3) Tests: enforce that model selection belongs to the text composer, not the node frame.
test_path = ROOT / 'tests' / 'text-node-v23.test.mjs'
test = test_path.read_text(encoding='utf-8')
old_test = '''test('empty text node exposes a real model selector wired to text-only models', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /data-node-model-selector/);
  assert.match(app, /title=\\"选择文本模型\\"/);
  assert.match(app, /openModelPickerForNode\\(n,e\\.currentTarget,'text'\\)/);
  assert.match(app, /const modality=modalityOverride\\|\\|n\\.type/);
  assert.match(app, /allModelsForType\\(modality\\)/);
  assert.match(app, /else setNodeModel\\(n,item\\)/);
  assert.match(css, /\\.node\\.node-text \\.node-footer \\.node-model-selector/);
});
'''
new_test = '''test('text model selection lives in the composer instead of the text node frame', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.doesNotMatch(app, /data-node-model-selector/);
  assert.doesNotMatch(css, /node-model-selector/);
  assert.match(app, /id=\\"modelPickerBtn\\" class=\\"model-pill/);
  assert.match(app, /\\$\\('#modelPickerBtn'\\)\\?\\.addEventListener\\('click',e=>openModelPickerForNode\\(n,e\\.currentTarget\\)\\)/);
  assert.match(app, /const modality=modalityOverride\\|\\|n\\.type/);
  assert.match(app, /allModelsForType\\(modality\\)/);
  assert.match(app, /else setNodeModel\\(n,item\\)/);
  assert.match(css, /\\.generator-panel\\.text-generator \\.model-pill/);
  assert.match(app, /const footerLabel=n\\.type==='text'\\?'':/);
});
'''
if old_test not in test:
    raise SystemExit('old text model selector test anchor missing')
test = test.replace(old_test, new_test, 1)
test_path.write_text(test, encoding='utf-8')

print('moved text model selection to composer')
