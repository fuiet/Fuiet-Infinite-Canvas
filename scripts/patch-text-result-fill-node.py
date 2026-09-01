from pathlib import Path

root=Path('_read_123_zip_20260821_180410')
css_path=root/'styles'/'text-node.css'
index_path=root/'index.html'
test_path=root/'tests'/'text-editor-single-surface.test.mjs'

css=css_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')
test=test_path.read_text(encoding='utf-8')

old_body='''.node.node-text[data-content-state="result"]>.node-body{\n  height:258px;\n  min-height:258px;\n  overflow:hidden;\n  background:var(--ui-surface-1);\n}\n'''
new_body='''.node.node-text[data-content-state="result"]>.node-body{\n  height:100%;\n  min-height:0;\n  max-height:none;\n  overflow:hidden;\n  background:transparent;\n}\n'''
if old_body not in css:
    raise SystemExit('result body fixed-height block missing')
css=css.replace(old_body,new_body,1)

old_shell='''.text-node-shell.has-text{\n  height:258px;\n  min-height:258px;\n  overflow:hidden;\n  padding:18px 20px 22px;\n  background:var(--ui-surface-1);\n}\n'''
new_shell='''.text-node-shell.has-text{\n  height:100%;\n  min-height:0;\n  max-height:none;\n  overflow:hidden;\n  padding:18px 20px 22px;\n  background:transparent;\n}\n'''
if old_shell not in css:
    raise SystemExit('result shell fixed-height block missing')
css=css.replace(old_shell,new_shell,1)

old_href='./styles/text-node.css?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1&edit=single-surface-1'
new_href=old_href+'&result=fill-node-1'
if new_href not in index:
    if old_href not in index:
        raise SystemExit('text-node stylesheet cache anchor missing')
    index=index.replace(old_href,new_href,1)

marker="test('normal text result fills the resized node without a nested surface'"
if marker not in test:
    test += '''\n\ntest('normal text result fills the resized node without a nested surface',()=>{\n  assert.match(css,/data-content-state="result"\\]>.node-body\\{[\\s\\S]*?height:100%;[\\s\\S]*?min-height:0;[\\s\\S]*?background:transparent;/);\n  assert.match(css,/\\.text-node-shell\\.has-text\\{[\\s\\S]*?height:100%;[\\s\\S]*?min-height:0;[\\s\\S]*?background:transparent;/);\n  assert.match(index,/text-node\\.css\\?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1&edit=single-surface-1&result=fill-node-1/);\n});\n'''

css_path.write_text(css,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
test_path.write_text(test,encoding='utf-8')
print('patched normal text result to fill node')
