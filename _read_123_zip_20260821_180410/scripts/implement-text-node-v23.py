from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
index_path = root / 'index.html'
app = app_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')


def sub_once(text, pattern, replacement, label, flags=0):
    rx = re.compile(pattern, flags)
    matches = list(rx.finditer(text))
    if len(matches) != 1:
        raise SystemExit(f'{label}: expected 1 match, got {len(matches)}')
    return rx.sub(lambda _: replacement, text, count=1)


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


helpers = r'''
  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    snapshot('手动编辑文本');
    const current=String(n.text||n.generatedText||'');
    n.textEditBackup=current;
    n.text=current;
    n.generatedText='';
    n.textEditing=true;
    n.textInputMode='manual';
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
      if(field&&field.value)field.setSelectionRange(field.value.length,field.value.length);
    },0);
  }
  function finishManualTextEdit(n,{cancel=false}={}){
    if(!n||n.type!=='text')return;
    const before=String(n.textEditBackup??'');
    const after=cancel?before:String(n.text||'');
    n.text=after;
    n.generatedText='';
    n.textEditing=false;
    n.textInputMode='manual';
    delete n.textEditBackup;
    if(!cancel&&after.trim()&&after!==before){
      recordNodeResultVersion(n,{text:after,providerId:'',modelId:'',modelName:'手动输入'});
    }
    saveState();
    render();
  }

'''
if 'function beginManualTextEdit(n)' not in app:
    app = replace_once(app, '  function renderNode(n){\n', helpers + '  function renderNode(n){\n', 'manual text helpers')

text_render = r'''    } else if(n.type==='text'){
      const textValue=String(n.text||n.generatedText||'');
      if(n.textEditing){
        body=`<div class="text-node-shell is-manual-editing"><textarea class="text-node-editor" data-text-manual spellcheck="true" placeholder="输入或粘贴文本内容…">${escapeHtml(textValue)}</textarea><div class="text-node-edit-hint"><span>直接输入或粘贴文本</span><span>⌘/Ctrl + Enter 完成 · Esc 取消</span></div></div>`;
      }else if(textValue.trim()){
        body=`<div class="text-node-shell has-text"><div class="text-node-preview" data-text-result tabindex="0">${escapeHtml(textValue)}</div></div>`;
      }else{
        body=`<div class="text-node-shell is-empty"><div class="text-node-placeholder" aria-hidden="true"><span class="text-node-lines"><i></i><i></i><i></i><i></i></span></div><div class="text-node-try">尝试：</div><button type="button" data-text-quick="manual"><span>${uiIcon('subtitle')}</span><b>自己编写内容</b></button><button type="button" data-text-quick="video"><span>${uiIcon('video')}</span><b>文生视频</b></button><button type="button" data-text-quick="image"><span>${uiIcon('image')}</span><b>图片反推提示词</b></button><button type="button" data-text-quick="audio"><span>${uiIcon('audio')}</span><b>文字生音乐</b></button></div>`;
      }
    } else if(n.type==='audio'){'''
app = sub_once(
    app,
    r"    \} else if\(n\.type==='text'\)\{.*?\n    \} else if\(n\.type==='audio'\)\{",
    text_render,
    'text node render',
    re.S,
)

old_ta = "    const ta = $('textarea',el); if(ta) ta.addEventListener('input', e=>{ n.text=e.target.value; saveState(); renderEdges(); });"
new_ta = r'''    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>e.stopPropagation());
      ta.addEventListener('click',e=>e.stopPropagation());
      ta.addEventListener('input',e=>{n.text=e.target.value;n.generatedText='';n.textInputMode='manual';saveState();renderEdges()});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();finishManualTextEdit(n);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finishManualTextEdit(n,{cancel:true})}
      });
      ta.addEventListener('blur',()=>setTimeout(()=>{if(n.textEditing)finishManualTextEdit(n)},0));
    }'''
app = replace_once(app, old_ta, new_ta, 'manual textarea binding')
app = replace_once(app, "    if(ta) ta.addEventListener('focus',()=>{expandedNodeId=n.id;selectedId=n.id;renderToolbar();renderGenerator();});\n", '', 'legacy textarea focus')

quick_binding = r'''    $$('[data-text-quick]',el).forEach(b=>b.addEventListener('click',e=>{
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
      if(action==='audio'){
        const next=addNode('audio',{x:n.x+380,y:n.y},true);next.title='文字生音乐';next.prompt=String(n.text||n.prompt||'').trim()||'根据文字内容生成音乐';
        selectNode(next.id);expandedNodeId=next.id;saveState();render();setTimeout(()=>$('#promptInput')?.focus(),0);return;
      }
    }));
    if(n.type==='text'&&contentState==='result'&&!n.textEditing){
      $('.node-body',el)?.addEventListener('dblclick',e=>{if(e.target.closest('button,textarea'))return;e.preventDefault();e.stopPropagation();beginManualTextEdit(n)});
    }'''
app = sub_once(
    app,
    r"^    \$\$\('\[data-text-quick\]',el\)\.forEach\(b=>b\.addEventListener\('click',e=>\{.*$",
    quick_binding,
    'text quick actions',
    re.M,
)

positioner = r'''  function positionGeneratorBelowNode(n,el,desiredWidth){
    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text';
    generator.dataset.nodeType=n?.type||'';
    generator.classList.toggle('text-generator',isText);
    if(isText){
      const width=594,height=142,bottomLimit=window.innerHeight-dockReserve-edge;
      generator.style.width=width+'px';
      generator.style.minWidth=width+'px';
      generator.style.maxWidth=width+'px';
      generator.style.height=height+'px';
      generator.style.maxHeight='none';
      generator.style.overflow='visible';
      const centered=r.left+r.width/2-width/2;
      generator.style.left=Math.max(edge,Math.min(window.innerWidth-width-edge,centered))+'px';
      let top=r.bottom+gap;
      if(top+height>bottomLimit)top=r.top-gap-height;
      top=Math.max(48,Math.min(bottomLimit-height,top));
      generator.style.top=top+'px';
      return;
    }
    generator.style.minWidth='';generator.style.maxWidth='';generator.style.height='';
    generator.style.width=desiredWidth+'px';generator.style.overflow='auto';
    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,r.left-10))+'px';
    const available=Math.max(96,window.innerHeight-r.bottom-gap-edge),safeTop=Math.max(54,window.innerHeight-dockReserve-available);
    generator.style.top=Math.min(r.bottom+gap,safeTop)+'px';
    generator.style.maxHeight=available+'px';
  }

  function renderGenerator'''
app = sub_once(
    app,
    r"  function positionGeneratorBelowNode\(n,el,desiredWidth\)\{.*?\n  \}\n\n  function renderGenerator",
    positioner,
    'fixed text generator positioning',
    re.S,
)

app = replace_once(
    app,
    '      <div class="lib-gen-main">\n        <div class="prompt-box libtv-prompt"><textarea id="promptInput" placeholder="描述你想生成的内容，输入 @ 引用画布素材…"',
    '      <div class="lib-gen-main ${n.type===\'text\'?\'text-generator-main\':\'\'}">\n        <div class="prompt-box libtv-prompt"><textarea id="promptInput" placeholder="${n.type===\'text\'?\'写下你想讲的故事、场景或角色设定。例如：一个来自未来的机器人，在城市屋顶看星星。\':\'描述你想生成的内容，输入 @ 引用画布素材…\'}"',
    'text generator class and placeholder',
)

if './styles/text-node.css' not in index:
    index = replace_once(
        index,
        '  <link rel="stylesheet" href="./styles/nodes.css" />\n',
        '  <link rel="stylesheet" href="./styles/nodes.css" />\n  <link rel="stylesheet" href="./styles/text-node.css" />\n',
        'text node stylesheet link',
    )

app_path.write_text(app, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')
print('Applied LibTV-aligned text node UI and fixed-size text generator.')
