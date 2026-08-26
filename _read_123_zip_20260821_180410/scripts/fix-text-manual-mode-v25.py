from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
app = app_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# Manual writing is a persistent text-node mode, not a temporary edit session.
old_enter = r'''  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    snapshot('手动编辑文本');
    const current=String(n.text||n.generatedText||'');
    n.textEditBackup=current;
    n.textEditBackupHtml=String(n.textHtml||'');
    n.textEditBackupMode=n.textInputMode||'';
    n.textEditSizeBackup={w:n.w||320,h:n.h||null};
    n.text=current;
    n.generatedText='';
    n.textHtml=n.textHtml||plainTextToManualHtml(current);
    n.textEditing=true;
    n.textInputMode='manual';
    n.w=700;
    n.h=400;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    toolbar.classList.add('hidden');
    saveState();
    render();
    setTimeout(()=>{
      const field=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
    },0);
  }
'''
new_enter = r'''  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    if(n.textInputMode!=='manual')snapshot('切换手动文本模式');
    const current=String(n.text||n.generatedText||'');
    n.text=current;
    n.generatedText='';
    n.textHtml=n.textHtml||plainTextToManualHtml(current);
    n.textInputMode='manual';
    // Legacy compatibility flag mirrors the persistent mode; it is never used to exit the mode.
    n.textEditing=true;
    n.w=700;
    n.h=400;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    toolbar.classList.add('hidden');
    saveState();
    render();
    setTimeout(()=>{
      const field=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
    },0);
  }
'''
if old_enter in app:
    app = replace_once(app, old_enter, new_enter, 'persistent manual mode entry')
elif "snapshot('切换手动文本模式')" not in app:
    raise SystemExit('persistent manual mode entry: current implementation not recognized')

old_finish = r'''  function finishManualTextEdit(n,{cancel=false}={}){
    if(!n||n.type!=='text')return;
    const before=String(n.textEditBackup??'');
    const beforeHtml=String(n.textEditBackupHtml??'');
    const after=cancel?before:String(n.text||'');
    n.text=after;
    n.textHtml=cancel?beforeHtml:sanitizeManualTextHtml(String(n.textHtml||''));
    n.generatedText='';
    n.textEditing=false;
    n.textInputMode=cancel?(n.textEditBackupMode||'manual'):'manual';
    if(cancel&&n.textEditSizeBackup){n.w=Number(n.textEditSizeBackup.w||320);if(n.textEditSizeBackup.h==null)delete n.h;else n.h=Number(n.textEditSizeBackup.h)}
    n.textEditorExpanded=false;delete n.textEditorExpandedBackup;
    delete n.textEditBackup;delete n.textEditBackupHtml;delete n.textEditBackupMode;delete n.textEditSizeBackup;
    if(!cancel&&after.trim()&&after!==before){
      recordNodeResultVersion(n,{text:after,providerId:'',modelId:'',modelName:'手动输入'});
    }
    saveState();
    render();
  }
'''
new_finish = r'''  function finishManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
    if(editor)syncManualTextEditor(n,editor);
    n.textInputMode='manual';
    n.textEditing=true;
    n.textHtml=sanitizeManualTextHtml(String(n.textHtml||plainTextToManualHtml(n.text||'')));
    saveState();
    renderToolbar();
  }
'''
if old_finish in app:
    app = replace_once(app, old_finish, new_finish, 'remove temporary manual edit finish/cancel')
elif "function finishManualTextEdit(n){" not in app:
    raise SystemExit('persistent manual mode finish: current implementation not recognized')

# Any stored manual node is normalized back into the permanent manual canvas on render.
normalize_marker = "    const mediaResult=contentState==='result'&&['image','video','audio'].includes(n.type);\n"
normalize_line = "    const mediaResult=contentState==='result'&&['image','video','audio'].includes(n.type);\n    if(n.type==='text'&&n.textInputMode==='manual')n.textEditing=true;\n"
if normalize_line not in app:
    app = replace_once(app, normalize_marker, normalize_line, 'normalize persistent manual mode on render')

# Leaving the field, pressing Escape, or pressing Ctrl/Cmd+Enter must never switch the node back.
old_events = r'''    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>e.stopPropagation());
      ta.addEventListener('click',e=>e.stopPropagation());
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);finishManualTextEdit(n);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finishManualTextEdit(n,{cancel:true})}
      });
      ta.addEventListener('blur',()=>setTimeout(()=>{if(n.textEditing&&!toolbar.matches(':hover'))finishManualTextEdit(n)},0));
    }
'''
new_events = r'''    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>e.stopPropagation());
      ta.addEventListener('click',e=>e.stopPropagation());
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();syncManualTextEditor(n,e.currentTarget)}
      });
      ta.addEventListener('blur',e=>syncManualTextEditor(n,e.currentTarget));
    }
'''
if old_events in app:
    app = replace_once(app, old_events, new_events, 'persistent manual mode events')
elif "ta.addEventListener('blur',e=>syncManualTextEditor(n,e.currentTarget));" not in app:
    raise SystemExit('persistent manual mode events: current implementation not recognized')

# Fix the intermittent click: text-node quick actions belong to renderNode, not renderGenerator.
quick_block = r'''    $$('[data-text-quick]',el).forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      const action=b.dataset.textQuick;
      if(action==='manual'){beginManualTextEdit(n);return}
      if(action==='video'){
        const next=addNode('video',{x:n.x+380,y:n.y},true);next.title='文生视频';next.prompt=String(n.text||n.prompt||'').trim()||'根据文本内容生成视频';next.videoMode='text2video';
        saveState();render();setTimeout(()=>openVideoStudio(next),0);return;
      }
      if(action==='image'){
        snapshot('图片反推提示词');
        n.textEditing=false;n.textInputMode='ai';
        n.prompt='请分析我提供的参考图片，准确描述主体、场景、构图、镜头、光线、色彩、材质与风格，并反推一份可以复现该画面的详细生成提示词。';
        selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=n.id;
        saveState();render();setTimeout(()=>openReferencePicker(n),0);return;
      }
    }));
'''
quick_count = app.count(quick_block)
if quick_count != 1:
    raise SystemExit(f'text quick action wiring: expected one existing block, got {quick_count}')
app = app.replace(quick_block, '', 1)
node_event_marker = "    $('[data-node-rerun]',el)?.addEventListener('click',e=>{e.stopPropagation();rerunFailedDownstream(n.id)});\n    const ta=$('[data-text-manual]',el);\n"
node_quick_insert = "    $('[data-node-rerun]',el)?.addEventListener('click',e=>{e.stopPropagation();rerunFailedDownstream(n.id)});\n" + quick_block + "    const ta=$('[data-text-manual]',el);\n"
app = replace_once(app, node_event_marker, node_quick_insert, 'wire text quick actions directly on text node')

# Contract checks for the two reported bugs.
if app.count("$$('[data-text-quick]',el).forEach") != 1:
    raise SystemExit('text quick actions must have exactly one event binding')
render_node_pos = app.index('  function renderNode(n){')
quick_pos = app.index("    $$('[data-text-quick]',el).forEach")
node_end_pos = app.index('  function nodePortWorldPoint', render_node_pos)
if not (render_node_pos < quick_pos < node_end_pos):
    raise SystemExit('text quick actions are not wired inside renderNode')
if "if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);finishManualTextEdit" in app:
    raise SystemExit('Ctrl/Cmd+Enter still exits manual mode')
if "finishManualTextEdit(n,{cancel:true})" in app:
    raise SystemExit('Escape still cancels manual mode')
if "if(n.textEditing&&!toolbar.matches(':hover'))finishManualTextEdit" in app:
    raise SystemExit('blur still exits manual mode')
if "if(n.type==='text'&&n.textInputMode==='manual')n.textEditing=true;" not in app:
    raise SystemExit('manual mode normalization is missing')

app_path.write_text(app, encoding='utf-8')
print('Applied persistent manual text-node mode fix.')
