from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
app = app_path.read_text(encoding='utf-8')


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

app_path.write_text(app, encoding='utf-8')
print('Applied UI 2.3 text node migration.')
