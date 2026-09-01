from pathlib import Path

root = Path('_read_123_zip_20260821_180410')
app_path = root / 'app.js'
bootstrap_path = root / 'browser-bootstrap.js'
test_path = root / 'tests' / 'text-result-card-scroll.test.mjs'

app = app_path.read_text(encoding='utf-8')
bootstrap = bootstrap_path.read_text(encoding='utf-8')
test = test_path.read_text(encoding='utf-8')

old_wheel = """  viewport.addEventListener('wheel',e=>{\n    const textPreview=e.target.closest?.('.text-node-preview[data-text-result]');\n    if(textPreview&&document.activeElement===textPreview)return;\n    e.preventDefault();const rect=viewport.getBoundingClientRect();if(!e.ctrlKey&&!e.metaKey&&Math.abs(e.deltaX)+Math.abs(e.deltaY)<140){state.viewport.x-=e.deltaX;state.viewport.y-=e.deltaY;scheduleViewportTransform();scheduleVirtualizationRefresh();queueViewportSave();return}const old=state.viewport.zoom,next=Math.max(.1,Math.min(8,old*Math.exp(-e.deltaY*.0014))),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wx=(sx-state.viewport.x)/old,wy=(sy-state.viewport.y)/old;state.viewport.zoom=next;state.viewport.x=sx-wx*next;state.viewport.y=sy-wy*next;scheduleViewportTransform();scheduleVirtualizationRefresh(true);queueViewportSave()\n  }, {passive:false});\n"""
new_wheel = """  viewport.addEventListener('wheel',e=>{\n    const textEditor=e.target.closest?.('[data-text-manual]');\n    if(textEditor)return;\n    const textPreview=e.target.closest?.('.text-node-preview[data-text-result]');\n    if(textPreview&&document.activeElement===textPreview)return;\n    e.preventDefault();const rect=viewport.getBoundingClientRect();if(!e.ctrlKey&&!e.metaKey&&Math.abs(e.deltaX)+Math.abs(e.deltaY)<140){state.viewport.x-=e.deltaX;state.viewport.y-=e.deltaY;scheduleViewportTransform();scheduleVirtualizationRefresh();queueViewportSave();return}const old=state.viewport.zoom,next=Math.max(.1,Math.min(8,old*Math.exp(-e.deltaY*.0014))),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wx=(sx-state.viewport.x)/old,wy=(sy-state.viewport.y)/old;state.viewport.zoom=next;state.viewport.x=sx-wx*next;state.viewport.y=sy-wy*next;scheduleViewportTransform();scheduleVirtualizationRefresh(true);queueViewportSave()\n  }, {passive:false});\n"""
if old_wheel not in app:
    raise SystemExit('viewport wheel anchor missing')
app = app.replace(old_wheel, new_wheel, 1)

old_bootstrap = "`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1`,"
new_bootstrap = "`./app.js?v=${v}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1`,"
if old_bootstrap not in bootstrap:
    raise SystemExit('app cache-bust anchor missing')
bootstrap = bootstrap.replace(old_bootstrap, new_bootstrap, 1)

old_test = """test('clicking a text result does not start node dragging and wheel stays in the result',()=>{\n  assert.match(app,/textarea,\\.text-node-preview,\\.node-port/);\n  assert.match(app,/textPreview=e\\.target\\.closest\\?\\.\\('\\.text-node-preview\\[data-text-result\\]'\\)/);\n  assert.match(app,/if\\(textPreview&&document\\.activeElement===textPreview\\)return;/);\n});\n"""
new_test = """test('clicking a text result does not start node dragging and wheel stays in the result',()=>{\n  assert.match(app,/textarea,\\.text-node-preview,\\.node-port/);\n  assert.match(app,/textPreview=e\\.target\\.closest\\?\\.\\('\\.text-node-preview\\[data-text-result\\]'\\)/);\n  assert.match(app,/if\\(textPreview&&document\\.activeElement===textPreview\\)return;/);\n});\n\ntest('wheel inside expanded text editing scrolls text instead of zooming the canvas',()=>{\n  assert.match(app,/textEditor=e\\.target\\.closest\\?\\.\\('\\[data-text-manual\\]'\\)/);\n  assert.match(app,/if\\(textEditor\\)return;/);\n  const guard=app.indexOf("const textEditor=e.target.closest?.('[data-text-manual]')");\n  const canvasPrevent=app.indexOf('e.preventDefault();const rect=viewport.getBoundingClientRect()',guard);\n  assert.ok(guard>=0&&canvasPrevent>guard,'text editor wheel guard must run before canvas zoom prevention');\n});\n"""
if old_test not in test:
    raise SystemExit('text result wheel test anchor missing')
test = test.replace(old_test, new_test, 1)

app_path.write_text(app, encoding='utf-8')
bootstrap_path.write_text(bootstrap, encoding='utf-8')
test_path.write_text(test, encoding='utf-8')
print('patched text editor wheel ownership')
