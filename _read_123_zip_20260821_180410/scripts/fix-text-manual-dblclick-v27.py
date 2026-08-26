from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
app = app_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Manual nodes with existing text use the same stable viewing surface as empty manual nodes.
old_preview = r'''        body=`<div class="text-node-shell has-text"><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
'''
new_preview = r'''        body=`<div class="text-node-shell has-text" ${n.textInputMode==='manual'?'data-text-manual-view':''}><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
'''
if old_preview in app:
    app = replace_once(app, old_preview, new_preview, 'mark populated manual view')
elif "${n.textInputMode==='manual'?'data-text-manual-view':''}" not in app:
    raise SystemExit('mark populated manual view: current implementation not recognized')

# Bind double-click to the stable manual-view surface itself. The old node-level handler could lose
# its DOM element after the first click triggered node selection/rendering, so dblclick never arrived.
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

# Small source-level contract checks. Existing repository tests remain untouched.
required = [
    "const manualView=$('[data-text-manual-view]',el);",
    "manualView.addEventListener('pointerdown'",
    "manualView.addEventListener('dblclick'",
    "startManualTextEditing(n);",
    "${n.textInputMode==='manual'?'data-text-manual-view':''}",
]
for marker in required:
    if marker not in app:
        raise SystemExit(f'manual double-click contract missing: {marker}')

app_path.write_text(app, encoding='utf-8')
print('Applied stable manual text double-click interaction fix.')
