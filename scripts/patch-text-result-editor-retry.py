from pathlib import Path
import subprocess

subprocess.run(['python3','scripts/patch-text-result-editor.py'],check=True)

path=Path('_read_123_zip_20260821_180410/tests/text-node-v23.test.mjs')
text=path.read_text(encoding='utf-8')
old="""test('selected text results expose text-specific creator transforms', () => {
  const app = read('app.js');
  assert.match(app, /if\\(n\\.type==='text'\\)return\\[\\{label:'改写'.*text-rewrite/);
  assert.match(app, /label:'扩写'.*text-expand/);
  assert.match(app, /label:'精简'.*text-simplify/);
  assert.match(app, /label:'翻译'.*text-translate/);
  assert.match(app, /label:'文生图'.*text-image/);
  assert.match(app, /label:'文生视频'.*text-video/);
  assert.doesNotMatch(app, /if\\(n\\.type==='text'\\)return\\[\\{label:'复制'/);
});
"""
new="""test('selected text results keep the normal creator toolbar hidden', () => {
  const app = read('app.js');
  assert.match(app, /if\\(n\\.type==='text'\\)return\\[\\];/);
  assert.match(app, /if\\(n\\?\\.type==='text'\\)\\{toolbar\\.classList\\.add\\('hidden'\\);return\\}/);
  assert.doesNotMatch(app, /if\\(n\\.type==='text'\\)return\\[\\{label:'改写'/);
});
"""
if old not in text:
    raise SystemExit('outdated text toolbar test anchor missing')
path.write_text(text.replace(old,new,1),encoding='utf-8')
print('patched outdated text toolbar regression')
