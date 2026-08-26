from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
test_path = root / 'tests' / 'text-node-v23.test.mjs'
app = app_path.read_text(encoding='utf-8')
tests = test_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Manual nodes with existing text need the same non-editing surface marker as empty manual nodes.
old_preview = r'''        body=`<div class="text-node-shell has-text"><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
'''
new_preview = r'''        body=`<div class="text-node-shell has-text" ${n.textInputMode==='manual'?'data-text-manual-view':''}><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
'''
if old_preview in app:
    app = replace_once(app, old_preview, new_preview, 'mark populated manual view')
elif "${n.textInputMode==='manual'?'data-text-manual-view':''}" not in app:
    raise SystemExit('mark populated manual view: current implementation not recognized')

# The old dblclick handler lived on the node element. The first click invokes node selection/drag logic,
# which can render a replacement DOM node before the browser can dispatch dblclick. Bind the manual
# viewing surface directly and keep the first click render-free, so the second click reaches the same DOM node.
old_dbl = r'''    if(n.type==='text'&&n.textInputMode==='manual'&&!n.textEditing){
      el.addEventListener('dblclick',e=>{
        if(e.target.closest('button,.node-port,.node-resize-handle'))return;
        e.preventDefault();e.stopPropagation();startManualTextEditing(n);
      });
    }
    const ta=$('[data-text-manual]',el);
'''
new_dbl = r'''    const manualView=$('[data-text-manual-view]',el);
    if(manualView){
      manualView.addEventListener('pointerdown',e=>{
        if(e.button!==0)return;
        e.stopPropagation();
        selectManualTextNode(n,el);
      });
      manualView.addEventListener('click',e=>{
        e.stopPropagation();
        selectManualTextNode(n,el);
      });
      manualView.addEventListener('dblclick',e=>{
        if(e.button!==0)return;
        e.preventDefault();e.stopPropagation();
        startManualTextEditing(n);
      });
    }
    const ta=$('[data-text-manual]',el);
'''
if old_dbl in app:
    app = replace_once(app, old_dbl, new_dbl, 'bind double click to stable manual view surface')
elif "const manualView=$('[data-text-manual-view]',el);" not in app:
    raise SystemExit('bind double click to stable manual view surface: current implementation not recognized')

# Contract: selection of the viewing surface must not call render(), while dblclick must open the editor.
if "manualView.addEventListener('dblclick'" not in app or 'startManualTextEditing(n);' not in app:
    raise SystemExit('manual dblclick contract missing')
if "manualView.addEventListener('pointerdown'" not in app or 'selectManualTextNode(n,el);' not in app:
    raise SystemExit('manual single-click selection contract missing')

extra_test = r'''

test('manual text view keeps the same DOM surface across clicks so double click enters editing', () => {
  const app = read('app.js');
  assert.ok(app.includes("const manualView=$('[data-text-manual-view]',el);"));
  assert.ok(app.includes("manualView.addEventListener('pointerdown'"));
  assert.ok(app.includes("manualView.addEventListener('dblclick'"));
  assert.ok(app.includes("startManualTextEditing(n);"));
  assert.ok(app.includes("${n.textInputMode==='manual'?'data-text-manual-view':''}"));
});
'''
if "manual text view keeps the same DOM surface across clicks" not in tests:
    tests += extra_test

app_path.write_text(app, encoding='utf-8')
test_path.write_text(tests, encoding='utf-8')
print('Applied stable manual text double-click interaction fix.')
