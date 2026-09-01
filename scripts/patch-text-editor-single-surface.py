from pathlib import Path

root=Path('_read_123_zip_20260821_180410')
css_path=root/'styles'/'text-node.css'
index_path=root/'index.html'
test_path=root/'tests'/'text-editor-single-surface.test.mjs'

css=css_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')

marker='/* Text edit single-surface v2.8: editor fills the node without a nested card. */'
block=r'''

/* Text edit single-surface v2.8: editor fills the node without a nested card. */
.node.node-text.text-node-editing[data-content-state="result"]>.node-body{
  height:100%!important;
  min-height:0!important;
  max-height:none!important;
  border-radius:inherit!important;
  background:transparent!important;
}
.node.node-text.text-node-editing[data-content-state="result"] .text-node-shell.is-manual-editing{
  height:100%!important;
  min-height:0!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  box-shadow:none!important;
  background:transparent!important;
}
.node.node-text.text-node-editing[data-content-state="result"] .text-node-editor{
  height:100%!important;
  min-height:0!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  box-shadow:none!important;
  background:transparent!important;
}
'''
if marker not in css:
    css=css.rstrip()+block+'\n'

old='./styles/text-node.css?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1'
new='./styles/text-node.css?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1&edit=single-surface-1'
if old not in index and new not in index:
    raise SystemExit('text-node css cache anchor missing')
index=index.replace(old,new,1)

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('expanded text editing uses one visual surface and fills the node',()=>{
  assert.match(css,/text-node-editing\\[data-content-state=\"result\"\\]>.node-body\\{[\\s\\S]*?height:100%!important;[\\s\\S]*?min-height:0!important;[\\s\\S]*?background:transparent!important;/);
  assert.match(css,/text-node-editing\\[data-content-state=\"result\"\\] \\.text-node-shell\\.is-manual-editing\\{[\\s\\S]*?height:100%!important;[\\s\\S]*?border:0!important;[\\s\\S]*?border-radius:0!important;[\\s\\S]*?background:transparent!important;/);
  assert.match(css,/text-node-editing\\[data-content-state=\"result\"\\] \\.text-node-editor\\{[\\s\\S]*?height:100%!important;[\\s\\S]*?border:0!important;[\\s\\S]*?background:transparent!important;/);
});

test('single-surface text editor stylesheet is cache busted',()=>{
  assert.match(index,/text-node\\.css\\?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1&edit=single-surface-1/);
});
""",encoding='utf-8')

css_path.write_text(css,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
print('patched text editor single surface')
