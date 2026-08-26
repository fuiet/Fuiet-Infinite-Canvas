from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
css_path = root / 'styles' / 'text-node.css'
test_path = root / 'tests' / 'text-node-v23.test.mjs'
app = app_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')
tests = test_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# 1) Text result transformation helpers. Result actions branch into a new node;
# the source result remains intact and never turns into an editor implicitly.
if 'function branchTextResult' not in app:
    marker = "  function selectedToolbarNode(){const ids=currentSelectionIds();if(ids.length!==1)return null;return state.nodes.find(n=>n.id===ids[0])||null}\n"
    helpers = r'''  function textResultValue(n){return String(n?.text||n?.generatedText||'').trim()}
  function branchTextResult(n,{title='文本处理',instruction='',targetType='text',operation='text_transform'}={}){
    if(!n||n.type!=='text')return;
    const source=textResultValue(n);if(!source)return showToast('当前文本还没有可处理的结果');
    snapshot(title);
    const next=addNode(targetType,{x:Number(n.x||0)+Number(n.w||320)+84,y:Number(n.y||0)},true);
    next.title=title;
    next.prompt=`${instruction}\n\n原文：\n${source}`.trim();
    next.toolParams={...(next.toolParams||{}),operation,sourceNodeId:n.id};
    if(targetType==='text'){next.text='';next.generatedText='';next.textInputMode='ai'}
    if(targetType==='video')next.videoMode='text2video';
    try{createEdge(n.id,next.id,{type:'asset',role:'prompt_context',silent:true})}catch{}
    selectedId=next.id;state.selectedIds=[next.id];state.nodes.forEach(x=>x.selected=x.id===next.id);expandedNodeId=next.id;
    saveState();render();setTimeout(()=>$('#promptInput')?.focus(),0);
  }
  function openTextTranslateMenu(n,anchor){
    const r=anchor?.getBoundingClientRect?.()||{left:80,bottom:80};
    contextMenu.style.left=Math.max(12,Math.min(window.innerWidth-190,r.left))+'px';
    contextMenu.style.top=Math.min(window.innerHeight-220,r.bottom+6)+'px';
    const languages=[['中文','zh'],['英文','en'],['日文','ja'],['韩文','ko']];
    contextMenu.innerHTML=`<div class="context-title">翻译为</div>${languages.map(([label,key])=>`<button data-text-translate="${key}" data-text-language="${label}"><span>${label}</span></button>`).join('')}`;
    contextMenu.classList.remove('hidden');
    $$('[data-text-translate]',contextMenu).forEach(b=>b.onclick=()=>{contextMenu.classList.add('hidden');const lang=b.dataset.textLanguage;branchTextResult(n,{title:`翻译为${lang}`,instruction:`把下面文本翻译为自然、准确的${lang}，保留原意、语气、段落结构和专有名词；不要添加原文没有的信息。`,operation:`translate_${b.dataset.textTranslate}`})});
  }

'''
    app = replace_once(app, marker, helpers + marker, 'text helper insertion')

# 2) Type-specific result toolbar. This replaces the generic copy/edit/rerun set for text.
if "if(n.type==='text')return[{label:'改写'" not in app:
    marker = "    if(n.type==='script')return[{label:'编辑脚本',tool:'打开脚本',primary:true},{label:'看板',tool:'整集看板'},{label:'批量生成',action:'script-batch'},{label:'改生成提示',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];"
    text_actions = "    if(n.type==='text')return[{label:'改写',action:'text-rewrite',primary:true},{label:'扩写',action:'text-expand'},{label:'精简',action:'text-simplify'},{label:'翻译',action:'text-translate'},{label:'文生图',action:'text-image'},{label:'文生视频',action:'text-video'}];\n"
    app = replace_once(app, marker, text_actions + marker, 'text toolbar actions')

# 3) Execute text result transforms through real generation nodes rather than fake success states.
if "a.action==='text-rewrite'" not in app:
    marker = "    if(a.action==='audio-download'){downloadAudioNode(n);return}\n"
    handlers = r'''    if(a.action==='text-rewrite'){branchTextResult(n,{title:'文本改写',instruction:'在不改变核心事实和含义的前提下，重写下面文本，让表达更自然、清晰、有节奏，并避免机械复述。',operation:'text_rewrite'});return}
    if(a.action==='text-expand'){branchTextResult(n,{title:'文本扩写',instruction:'扩写下面文本，补足必要细节、逻辑衔接和可读性，但不要虚构未经原文支持的关键事实。',operation:'text_expand'});return}
    if(a.action==='text-simplify'){branchTextResult(n,{title:'文本精简',instruction:'精简下面文本，删除重复和冗余表达，保留核心信息、关键事实与原有语气。',operation:'text_simplify'});return}
    if(a.action==='text-translate'){openTextTranslateMenu(n,anchor);return}
    if(a.action==='text-image'){branchTextResult(n,{title:'文生图',targetType:'image',instruction:'把下面文本转化为可直接生成图片的视觉提示词：明确主体、场景、构图、镜头、光线、色彩、材质和风格，并忠于文本内容。',operation:'text_to_image'});return}
    if(a.action==='text-video'){branchTextResult(n,{title:'文生视频',targetType:'video',instruction:'把下面文本转化为可直接生成视频的提示词：明确主体动作、场景、镜头、运镜、节奏、光线和声音氛围，并忠于文本内容。',operation:'text_to_video'});return}
'''
    app = replace_once(app, marker, marker + handlers, 'text toolbar handlers')

# 4) Every node generator always stays below its node. No generator may flip
# above the node or be moved upward because viewport space is insufficient.
all_fixed_below = "      generator.style.top=(r.bottom+gap)+'px';\n      return;"
if all_fixed_below not in app:
    old_fixed_positioning = """      let top=r.bottom+gap;
      if(isText){
        generator.style.top=top+'px';
        return;
      }
      if(top+height>bottomLimit)top=r.top-gap-height;
      top=Math.max(48,Math.min(bottomLimit-height,top));
      generator.style.top=top+'px';
      return;"""
    new_fixed_positioning = """      generator.style.top=(r.bottom+gap)+'px';
      return;"""
    app = replace_once(app, old_fixed_positioning, new_fixed_positioning, 'all fixed generator below-node positioning')

old_generic_positioning = """    const available=Math.max(96,window.innerHeight-r.bottom-gap-edge),safeTop=Math.max(54,window.innerHeight-dockReserve-available);
    generator.style.top=Math.min(r.bottom+gap,safeTop)+'px';
    generator.style.maxHeight=available+'px';"""
new_generic_positioning = """    const available=Math.max(96,window.innerHeight-r.bottom-gap-edge);
    generator.style.top=(r.bottom+gap)+'px';
    generator.style.maxHeight=available+'px';"""
if old_generic_positioning in app:
    app = replace_once(app, old_generic_positioning, new_generic_positioning, 'generic generator below-node positioning')

# 5) The text node empty state has exactly three quick actions. Text-to-music belongs
# to the audio node, not the text-node launcher.
audio_quick = '<button type="button" data-text-quick="audio"><span>${uiIcon(\'audio\')}</span><b>文字生音乐</b></button>'
if audio_quick in app:
    app = replace_once(app, audio_quick, '', 'remove text-to-music quick action')

audio_quick_handler = """      if(action==='audio'){
        const next=addNode('audio',{x:n.x+380,y:n.y},true);next.title='文字生音乐';next.prompt=String(n.text||n.prompt||'').trim()||'根据文字内容生成音乐';
        selectNode(next.id);expandedNodeId=next.id;saveState();render();setTimeout(()=>$('#promptInput')?.focus(),0);return;
      }
"""
if audio_quick_handler in app:
    app = replace_once(app, audio_quick_handler, '', 'remove text-to-music quick handler')

# 6) Manual writing becomes a real rich-text editing mode with the reference toolbar.
if 'function sanitizeManualTextHtml' not in app:
    marker = "  function beginManualTextEdit(n){\n"
    editor_helpers = r'''  function sanitizeManualTextHtml(html){
    const template=document.createElement('template');template.innerHTML=String(html||'');
    const allowed=new Set(['P','DIV','BR','H1','H2','H3','B','STRONG','I','EM','UL','OL','LI','BLOCKQUOTE','HR']);
    const clean=node=>{
      if(node.nodeType===3)return document.createTextNode(node.nodeValue||'');
      if(node.nodeType!==1)return document.createDocumentFragment();
      const tag=String(node.tagName||'').toUpperCase();
      if(!allowed.has(tag)){
        const frag=document.createDocumentFragment();[...node.childNodes].forEach(child=>frag.append(clean(child)));return frag;
      }
      const out=document.createElement(tag==='DIV'?'p':tag.toLowerCase());
      [...node.childNodes].forEach(child=>out.append(clean(child)));return out;
    };
    const holder=document.createElement('div');[...template.content.childNodes].forEach(child=>holder.append(clean(child)));
    return holder.innerHTML;
  }
  function plainTextToManualHtml(text){return escapeHtml(String(text||'')).replace(/\n/g,'<br>')}
  function manualTextPlainValue(editor){return String(editor?.innerText||'').replace(/\u00a0/g,' ')}
  function syncManualTextEditor(n,editor){
    if(!n||!editor)return;
    n.text=manualTextPlainValue(editor);n.generatedText='';n.textInputMode='manual';n.textHtml=sanitizeManualTextHtml(editor.innerHTML);
    saveState();renderEdges();
  }
  function runManualTextFormat(n,action){
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);if(!editor)return;
    if(action==='expand'){
      if(!n.textEditorExpanded){
        n.textEditorExpanded=true;n.textEditorExpandedBackup={w:n.w||700,h:n.h||400};n.w=Math.max(Number(n.w||700),980);n.h=Math.max(Number(n.h||400),620);
      }else{
        const backup=n.textEditorExpandedBackup||{};n.w=Number(backup.w||700);n.h=Number(backup.h||400);n.textEditorExpanded=false;delete n.textEditorExpandedBackup;
      }
      saveState();render();setTimeout(()=>$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`)?.focus(),0);return;
    }
    if(action==='copy'){
      const selected=String(window.getSelection?.()?.toString?.()||'').trim(),value=selected||manualTextPlainValue(editor);
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>showToast('已复制文本')).catch(()=>showToast('复制失败'));
      else showToast('当前浏览器不支持剪贴板复制');
      return;
    }
    editor.focus();
    if(action==='clear'){document.execCommand('removeFormat',false,null);document.execCommand('formatBlock',false,'P')}
    if(action==='h1')document.execCommand('formatBlock',false,'H1');
    if(action==='h2')document.execCommand('formatBlock',false,'H2');
    if(action==='h3')document.execCommand('formatBlock',false,'H3');
    if(action==='p')document.execCommand('formatBlock',false,'P');
    if(action==='bold')document.execCommand('bold',false,null);
    if(action==='italic')document.execCommand('italic',false,null);
    if(action==='bullet')document.execCommand('insertUnorderedList',false,null);
    if(action==='number')document.execCommand('insertOrderedList',false,null);
    if(action==='rule')document.execCommand('insertHorizontalRule',false,null);
    syncManualTextEditor(n,editor);
  }
  function renderManualTextToolbar(n,nodeEl){
    const r=nodeEl.getBoundingClientRect(),width=536;
    toolbar.classList.remove('node-toolbar-media','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');
    toolbar.classList.add('node-toolbar-text','node-toolbar-text-editor');toolbar.dataset.mediaType='text';
    toolbar.style.left=Math.max(16,Math.min(window.innerWidth-width-16,r.left+r.width/2-width/2))+'px';
    toolbar.style.top=Math.max(16,r.top-60)+'px';
    toolbar.innerHTML=`<button class="text-format-btn text-format-clear" data-text-format="clear" title="清除格式"><span>∅</span></button><span class="text-format-separator"></span><button class="text-format-btn" data-text-format="h1" title="一级标题">H1</button><button class="text-format-btn" data-text-format="h2" title="二级标题">H2</button><button class="text-format-btn" data-text-format="h3" title="三级标题">H3</button><button class="text-format-btn text-format-paragraph" data-text-format="p" title="正文">¶</button><span class="text-format-separator"></span><button class="text-format-btn text-format-bold" data-text-format="bold" title="加粗">B</button><button class="text-format-btn text-format-italic" data-text-format="italic" title="斜体">I</button><span class="text-format-separator"></span><button class="text-format-btn text-format-list" data-text-format="bullet" title="无序列表"><span>•</span><i>≡</i></button><button class="text-format-btn text-format-list" data-text-format="number" title="有序列表"><span>1</span><i>≡</i></button><span class="text-format-separator"></span><button class="text-format-btn text-format-rule" data-text-format="rule" title="分割线">—</button><span class="text-format-separator"></span><button class="text-format-btn" data-text-format="copy" title="复制">▣</button><button class="text-format-btn text-format-expand" data-text-format="expand" title="展开 / 收起">↗</button>`;
    toolbar.classList.remove('hidden');
    $$('[data-text-format]',toolbar).forEach(btn=>{btn.onpointerdown=e=>e.preventDefault();btn.onclick=e=>{e.preventDefault();e.stopPropagation();runManualTextFormat(n,btn.dataset.textFormat)}});
  }

'''
    app = replace_once(app, marker, editor_helpers + marker, 'rich text editor helper insertion')

# Preserve the original text/html and switch the node into the large writing canvas.
manual_state_old = """    n.textEditBackup=current;
    n.text=current;
    n.generatedText='';
    n.textEditing=true;
    n.textInputMode='manual';
"""
manual_state_new = """    n.textEditBackup=current;
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
"""
if manual_state_old in app:
    app = replace_once(app, manual_state_old, manual_state_new, 'manual editor state and size')

focus_old = """      const field=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`);
      field?.focus();
      if(field&&field.value)field.setSelectionRange(field.value.length,field.value.length);
"""
focus_new = """      const field=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
"""
if focus_old in app:
    app = replace_once(app, focus_old, focus_new, 'contenteditable focus placement')

# Finish/cancel keeps formatting safe; cancel restores the original node size and content.
finish_old = """    const before=String(n.textEditBackup??'');
    const after=cancel?before:String(n.text||'');
    n.text=after;
    n.generatedText='';
    n.textEditing=false;
    n.textInputMode='manual';
    delete n.textEditBackup;
"""
finish_new = """    const before=String(n.textEditBackup??'');
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
"""
if finish_old in app:
    app = replace_once(app, finish_old, finish_new, 'manual editor finish state')

# Render the edit node as a contenteditable rich-text canvas, and keep formatted output visible.
render_old = """    } else if(n.type==='text'){
      const textValue=String(n.text||n.generatedText||'');
      if(n.textEditing){
        body=`<div class=\"text-node-shell is-manual-editing\"><textarea class=\"text-node-editor\" data-text-manual spellcheck=\"true\" placeholder=\"输入或粘贴文本内容…\">${escapeHtml(textValue)}</textarea><div class=\"text-node-edit-hint\"><span>直接输入或粘贴文本</span><span>⌘/Ctrl + Enter 完成 · Esc 取消</span></div></div>`;
      }else if(textValue.trim()){
        body=`<div class=\"text-node-shell has-text\"><div class=\"text-node-preview\" data-text-result tabindex=\"0\">${escapeHtml(textValue)}</div></div>`;
"""
render_new = """    } else if(n.type==='text'){
      const textValue=String(n.text||n.generatedText||'');
      const richTextHtml=n.textInputMode==='manual'&&n.textHtml?sanitizeManualTextHtml(n.textHtml):'';
      if(n.textEditing){
        const editorHtml=richTextHtml||plainTextToManualHtml(textValue);
        body=`<div class=\"text-node-shell is-manual-editing\"><div class=\"text-node-editor\" data-text-manual contenteditable=\"true\" role=\"textbox\" aria-multiline=\"true\" spellcheck=\"true\" data-placeholder=\"输入内容...\">${editorHtml}</div></div>`;
      }else if(textValue.trim()){
        body=`<div class=\"text-node-shell has-text\"><div class=\"text-node-preview ${richTextHtml?'is-rich-text':''}\" data-text-result tabindex=\"0\">${richTextHtml||escapeHtml(textValue)}</div></div>`;
"""
if render_old in app:
    app = replace_once(app, render_old, render_new, 'render rich text editor')

# Keep editing in-place while typing; paste is forced to plain text so only supported
# formatting commands can create HTML.
events_old = """    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>e.stopPropagation());
      ta.addEventListener('click',e=>e.stopPropagation());
      ta.addEventListener('input',e=>{n.text=e.target.value;n.generatedText='';n.textInputMode='manual';saveState();renderEdges()});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();finishManualTextEdit(n);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finishManualTextEdit(n,{cancel:true})}
      });
      ta.addEventListener('blur',()=>setTimeout(()=>{if(n.textEditing)finishManualTextEdit(n)},0));
    }
"""
events_new = """    const ta=$('[data-text-manual]',el);
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
"""
if events_old in app:
    app = replace_once(app, events_old, events_new, 'rich editor event wiring')

# Mark editing nodes so their body can match the larger rounded reference style.
node_dataset_marker = "    el.dataset.uiV23Native='true';\n"
node_dataset_insert = "    el.dataset.uiV23Native='true';\n    if(n.type==='text'){el.classList.toggle('text-node-editing',Boolean(n.textEditing));el.classList.toggle('text-node-editor-expanded',Boolean(n.textEditorExpanded))}\n"
if node_dataset_insert not in app:
    app = replace_once(app, node_dataset_marker, node_dataset_insert, 'text editing node classes')

# The formatting toolbar is a special editing toolbar and must be visible even when
# the text node has no result yet.
toolbar_old = """    const n=selectedToolbarNode(),contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
"""
toolbar_new = """    const n=selectedToolbarNode();
    if(n?.type==='text'&&n.textEditing){
      const editNode=$(`.node[data-id=\"${CSS.escape(String(n.id))}\"]`);if(!editNode){toolbar.classList.add('hidden');return}
      renderManualTextToolbar(n,editNode);return;
    }
    const contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
"""
if toolbar_old in app:
    app = replace_once(app, toolbar_old, toolbar_new, 'manual text formatting toolbar visibility')

# 7) Reference-matching text edit styling. Appended as an override so older UI 2.3
# rules stay intact for empty/result nodes.
editor_css_marker = '/* Text node manual editor v2.4 */'
if editor_css_marker not in css:
    css += r'''

/* Text node manual editor v2.4 */
.node.node-text.text-node-editing{
  min-height:400px;
  border:1px solid #8f928f;
  border-radius:20px;
  background:#151616;
  box-shadow:none;
}
.node.node-text.text-node-editing:hover,
.node.node-text.text-node-editing.selected,
.node.node-text.text-node-editing[data-interaction-state="selected"]{
  border-color:#a4a7a4;
  box-shadow:none;
}
.node.node-text.text-node-editing>.node-body{
  min-height:398px;
  height:100%;
  border-radius:inherit;
  background:#151616;
  overflow:hidden;
}
.node.node-text.text-node-editing .text-node-shell.is-manual-editing{
  min-height:398px;
  height:100%;
  padding:24px 30px 26px;
  background:#151616;
}
.node.node-text.text-node-editing .text-node-editor{
  width:100%;
  min-height:344px;
  height:100%;
  padding:0;
  border:0;
  outline:0;
  background:transparent;
  color:#e6e6e3;
  caret-color:#e6e6e3;
  font:400 18px/1.65 var(--ui-font-sans);
  white-space:normal;
  overflow:auto;
  overflow-wrap:anywhere;
  user-select:text;
  scrollbar-width:thin;
  scrollbar-color:#454846 transparent;
}
.node.node-text.text-node-editing .text-node-editor:empty::before{
  content:attr(data-placeholder);
  color:#46505a;
  pointer-events:none;
}
.node.node-text.text-node-editing .text-node-editor h1,
.text-node-preview.is-rich-text h1{margin:0 0 14px;font:700 30px/1.3 var(--ui-font-sans)}
.node.node-text.text-node-editing .text-node-editor h2,
.text-node-preview.is-rich-text h2{margin:0 0 12px;font:700 24px/1.35 var(--ui-font-sans)}
.node.node-text.text-node-editing .text-node-editor h3,
.text-node-preview.is-rich-text h3{margin:0 0 10px;font:650 20px/1.4 var(--ui-font-sans)}
.node.node-text.text-node-editing .text-node-editor p,
.text-node-preview.is-rich-text p{margin:0 0 10px}
.node.node-text.text-node-editing .text-node-editor ul,
.node.node-text.text-node-editing .text-node-editor ol,
.text-node-preview.is-rich-text ul,
.text-node-preview.is-rich-text ol{margin:8px 0 10px;padding-left:24px}
.node.node-text.text-node-editing .text-node-editor blockquote,
.text-node-preview.is-rich-text blockquote{margin:10px 0;padding-left:14px;border-left:2px solid #4d514f;color:var(--ui-text-2)}
.node.node-text.text-node-editing .text-node-editor hr,
.text-node-preview.is-rich-text hr{margin:14px 0;border:0;border-top:1px solid #464946}
.text-node-preview.is-rich-text{white-space:normal}

.node-toolbar.node-toolbar-text-editor{
  width:536px;
  min-width:536px;
  height:50px;
  min-height:50px;
  display:flex;
  align-items:center;
  gap:2px;
  padding:7px 10px;
  border:1px solid #343735;
  border-radius:12px;
  background:#262827;
  box-shadow:0 12px 34px rgba(0,0,0,.3);
}
.node-toolbar.node-toolbar-text-editor .text-format-btn{
  width:34px;
  min-width:34px;
  height:34px;
  min-height:34px;
  display:grid;
  place-items:center;
  padding:0;
  border:0;
  border-radius:7px;
  background:transparent;
  color:#a8aaa7;
  font:600 13px/1 var(--ui-font-sans);
  cursor:pointer;
}
.node-toolbar.node-toolbar-text-editor .text-format-btn:hover,
.node-toolbar.node-toolbar-text-editor .text-format-btn:focus-visible{
  background:#323533;
  color:#e3e5e2;
  outline:none;
}
.node-toolbar.node-toolbar-text-editor .text-format-clear{color:#646865}
.node-toolbar.node-toolbar-text-editor .text-format-clear>span{
  width:14px;height:14px;display:grid;place-items:center;border:1px solid #626663;border-radius:50%;font-size:9px;transform:rotate(-22deg)
}
.node-toolbar.node-toolbar-text-editor .text-format-paragraph{font-size:17px}
.node-toolbar.node-toolbar-text-editor .text-format-bold{font-size:18px;font-weight:800}
.node-toolbar.node-toolbar-text-editor .text-format-italic{font-size:18px;font-style:italic;font-family:Georgia,serif}
.node-toolbar.node-toolbar-text-editor .text-format-list{display:flex;align-items:center;justify-content:center;gap:2px;font-size:11px}
.node-toolbar.node-toolbar-text-editor .text-format-list i{font:400 15px/1 var(--ui-font-sans);font-style:normal;transform:scaleX(.72)}
.node-toolbar.node-toolbar-text-editor .text-format-rule{font-size:19px;font-weight:400}
.node-toolbar.node-toolbar-text-editor .text-format-expand{font-size:17px}
.node-toolbar.node-toolbar-text-editor .text-format-separator{
  width:1px;
  height:22px;
  flex:0 0 1px;
  margin:0 3px;
  background:#3a3d3b;
}
'''

# 8) Update the focused text-node contract so CI checks the new three-action launcher
# and the real editing toolbar instead of the removed audio shortcut.
old_contract = """test('text node follows the universal four-state content contract', () => {
  const app = read('app.js');
  assert.match(app, /n\\.textEditing/);
  assert.match(app, /text-node-shell has-text/);
  assert.match(app, /text-node-shell is-empty/);
  assert.match(app, /data-text-quick=\"manual\"/);
  assert.match(app, /data-text-quick=\"video\"/);
  assert.match(app, /data-text-quick=\"image\"/);
  assert.match(app, /data-text-quick=\"audio\"/);
});
"""
new_contract = """test('text node empty state exposes exactly three quick actions', () => {
  const app = read('app.js');
  assert.match(app, /n\\.textEditing/);
  assert.match(app, /text-node-shell has-text/);
  assert.match(app, /text-node-shell is-empty/);
  assert.match(app, /data-text-quick=\"manual\"/);
  assert.match(app, /data-text-quick=\"video\"/);
  assert.match(app, /data-text-quick=\"image\"/);
  assert.doesNotMatch(app, /data-text-quick=\"audio\"/);
});

test('manual writing switches to a rich text editor with the reference toolbar', () => {
  const app = read('app.js');
  const css = read('styles/text-node.css');
  assert.match(app, /contenteditable=\\\"true\\\"/);
  assert.match(app, /function renderManualTextToolbar/);
  assert.match(app, /data-text-format=\\\"h1\\\"/);
  assert.match(app, /data-text-format=\\\"bold\\\"/);
  assert.match(app, /data-text-format=\\\"bullet\\\"/);
  assert.match(app, /data-text-format=\\\"copy\\\"/);
  assert.match(app, /n\\?\\.type==='text'&&n\\.textEditing/);
  assert.match(css, /node-toolbar-text-editor/);
  assert.match(css, /text-node-editing/);
});
"""
if old_contract in tests:
    tests = replace_once(tests, old_contract, new_contract, 'text node test contract')

app_path.write_text(app, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
test_path.write_text(tests, encoding='utf-8')
print('Applied UI 2.4 manual text editor redesign.')
