from pathlib import Path

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
html_path = root / 'index.html'
app = app_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# 1) Audio upload/download helpers.
if 'function applyLocalAudioToNode' not in app:
    marker = "  function selectedToolbarNode(){const ids=currentSelectionIds();if(ids.length!==1)return null;return state.nodes.find(n=>n.id===ids[0])||null}\n"
    helpers = r'''  async function applyLocalAudioToNode(n,file){
    if(!n||n.type!=='audio'||!file||!String(file.type||'').startsWith('audio/'))return;
    snapshot('上传音频到节点');
    const localUrl=URL.createObjectURL(file);
    n.outputUrl=localUrl;n.localFileName=file.name||'audio';n.localMime=file.type||'audio/mpeg';n.content='';
    n.uploading=Boolean(backendOnline);n.taskStatus='succeeded';n.taskProgress=100;n.w=Math.max(Number(n.w)||0,520);
    if(file.name)n.title=file.name;
    const version=recordNodeResultVersion(n,{outputUrl:localUrl,providerId:'',modelId:'',modelName:'本地上传'});
    selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=null;
    saveState();render();
    if(!backendOnline)return;
    try{
      const up=await uploadBlob(file,file.name||`audio-${Date.now()}.mp3`);
      n.outputUrl=up.url;n.serverMedia=true;n.uploading=false;if(version){version.outputUrl=up.url;version.modelName='本地上传'}
      try{URL.revokeObjectURL(localUrl)}catch{}
      saveState();render();
    }catch(err){n.uploading=false;saveState();render();showToast('音频已放入节点，但服务器保存失败，当前素材仅本次会话可用')}
  }
  function openAudioNodeUpload(n){
    const input=document.createElement('input');input.type='file';input.accept='audio/*';input.onchange=()=>{const f=input.files?.[0];if(f)applyLocalAudioToNode(n,f)};input.click();
  }
  function audioToolbarGlyph(action){return ({'audio-trim':'✂','audio-speed':'⏱','audio-split':'∥','audio-download':'↓'})[action]||'•'}
  function downloadAudioNode(n){
    if(!n?.outputUrl)return showToast('当前音频还没有可下载结果');
    const a=document.createElement('a');a.href=n.outputUrl;a.download=(n.localFileName||n.title||'audio').replace(/[\\/:*?"<>|]+/g,'-');a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  }

'''
    app = replace_once(app, marker, helpers + marker, 'audio helper insertion')

# 2) Result-first + empty guidance rendering.
old = r'''    } else if(n.type==='audio'){
      if(n.outputUrl) body=`<audio class="node-media-audio" src="${escapeAttr(n.outputUrl)}" controls></audio>`;
      else { const bars = Array.from({length:84},(_,i)=>`<i style="height:${14 + ((i*17)%52)}px"></i>`).join(''); body = `<div class="audio-wave">${bars}</div>`; }
'''
new = r'''    } else if(n.type==='audio'){
      const emptyAudio=contentState==='empty';
      const bars=Array.from({length:72},(_,i)=>`<i style="height:${10+((i*17)%42)}px"></i>`).join('');
      const quick=emptyAudio?`<div class="audio-node-try"><div class="audio-node-try-label">尝试：</div><button type="button" data-audio-quick="music"><span class="audio-quick-icon">♫</span><b>文字生音乐</b></button><button type="button" data-audio-quick="voice"><span class="audio-quick-icon">◖</span><b>生成旁白 / 配音</b></button></div>`:'';
      const uploadAction=emptyAudio&&interactionState==='selected'?`<button type="button" class="audio-node-upload" data-audio-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const media=n.outputUrl?`<div class="audio-result-stage"><div class="audio-wave audio-wave-result">${bars}</div><audio class="node-media-audio" src="${escapeAttr(n.outputUrl)}" controls preload="metadata"></audio></div>`:`<div class="audio-node-placeholder"><div class="audio-wave">${bars}</div><span>音频</span></div>`;
      body=`<div class="audio-node-shell ${emptyAudio?'is-empty':'has-output'}">${uploadAction}${media}${quick}</div>`;
'''
app = replace_once(app, old, new, 'audio render branch')

# 3) Empty quick actions and direct node drop.
marker = r'''    if(n.type==='video'&&contentState==='empty'){
      el.addEventListener('dragover',e=>{const hasVideo=[...(e.dataTransfer?.items||[])].some(it=>it.kind==='file'&&String(it.type||'').startsWith('video/'));if(!hasVideo)return;e.preventDefault();e.stopPropagation();el.classList.add('video-file-drop-target')});
      el.addEventListener('dragleave',()=>el.classList.remove('video-file-drop-target'));
      el.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('video/'));if(!file)return;e.preventDefault();e.stopPropagation();el.classList.remove('video-file-drop-target');applyLocalVideoToNode(n,file)});
    }
'''
insert = marker + r'''    $$('[data-audio-quick]',el).forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();if(contentState!=='empty')return;
      selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=n.id;
      if(b.dataset.audioQuick==='music')n.prompt=n.prompt||'生成一段完整、有明确情绪和节奏的音乐，描述曲风、速度、乐器、氛围与结构。';
      if(b.dataset.audioQuick==='voice')n.prompt=n.prompt||'生成自然清晰的旁白 / 配音，语气自然，节奏适中，情绪与文本内容一致。';
      saveState();render();setTimeout(()=>$('#promptInput')?.focus(),0);
    }));
    $('[data-audio-node-upload]',el)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openAudioNodeUpload(n)});
    if(n.type==='audio'&&contentState==='empty'){
      el.addEventListener('dragover',e=>{const hasAudio=[...(e.dataTransfer?.items||[])].some(it=>it.kind==='file'&&String(it.type||'').startsWith('audio/'));if(!hasAudio)return;e.preventDefault();e.stopPropagation();el.classList.add('audio-file-drop-target')});
      el.addEventListener('dragleave',()=>el.classList.remove('audio-file-drop-target'));
      el.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('audio/'));if(!file)return;e.preventDefault();e.stopPropagation();el.classList.remove('audio-file-drop-target');applyLocalAudioToNode(n,file)});
    }
'''
app = replace_once(app, marker, insert, 'audio bindings')

# 4) Keep only existing real audio transform paths + download.
old = "    if(n.type==='audio')return[{label:'截取',tool:'截取',primary:true},{label:'变速',tool:'变速'},{label:'切分',tool:'切分'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];"
new = "    if(n.type==='audio')return[{label:'截取',tool:'截取',action:'audio-trim',primary:true},{label:'变速',tool:'变速',action:'audio-speed'},{label:'切分',tool:'切分',action:'audio-split'},{label:'下载',action:'audio-download',iconOnly:true}];"
app = replace_once(app, old, new, 'audio toolbar actions')
app = replace_once(app, "    if(a.action==='video-fullscreen'){fullscreenVideoNode(n);return}\n", "    if(a.action==='video-fullscreen'){fullscreenVideoNode(n);return}\n    if(a.action==='audio-download'){downloadAudioNode(n);return}\n", 'audio toolbar handler')

# 5) Audio joins compact media result toolbar.
app = replace_once(app, "    if(n.type==='image'||n.type==='video'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(n.type==='image'?760:620,actions.length*68));", "    if(n.type==='image'||n.type==='video'||n.type==='audio'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(n.type==='image'?760:n.type==='video'?620:360,actions.length*68));", 'audio compact toolbar condition')
app = replace_once(app, "${n.type==='image'?imageToolbarGlyph(a.action||''):videoToolbarGlyph(a.action||'')}", "${n.type==='image'?imageToolbarGlyph(a.action||''):n.type==='video'?videoToolbarGlyph(a.action||''):audioToolbarGlyph(a.action||'')}", 'audio toolbar glyph')

# 6) Fixed screen-space audio composer.
old = "    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video';\n    generator.dataset.nodeType=n?.type||'';\n    generator.classList.toggle('text-generator',isText);\n    generator.classList.toggle('image-generator',isImage);\n    generator.classList.toggle('video-generator',isVideo);\n    if(isText||isImage||isVideo){\n      const width=isImage||isVideo?820:594,height=isImage?246:isVideo?258:142,bottomLimit=window.innerHeight-dockReserve-edge;"
new = "    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video',isAudio=n?.type==='audio';\n    generator.dataset.nodeType=n?.type||'';\n    generator.classList.toggle('text-generator',isText);\n    generator.classList.toggle('image-generator',isImage);\n    generator.classList.toggle('video-generator',isVideo);\n    generator.classList.toggle('audio-generator',isAudio);\n    if(isText||isImage||isVideo||isAudio){\n      const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:142,bottomLimit=window.innerHeight-dockReserve-edge;"
app = replace_once(app, old, new, 'audio composer positioning')
app = replace_once(app, "generator.style.maxHeight=isImage||isVideo?height+'px':'none';", "generator.style.maxHeight=isImage||isVideo||isAudio?height+'px':'none';", 'audio composer max height')

# 7) Dedicated audio composer before generic path.
marker = "    generator.innerHTML=`\n      <div class=\"lib-gen-main ${n.type==='text'?'text-generator-main':''}\">"
composer = r'''    if(n.type==='audio'){
      generator.innerHTML=`<div class="lib-gen-main audio-generator-main">
        <div class="audio-gen-head"><span>音频生成</span><button type="button" id="audioReferenceBtn">${uiIcon('plus')}<span>参考${refs.length?` ${refs.length}`:''}</span></button><div class="audio-gen-spacer"></div></div>
        <div class="prompt-box audio-prompt-box"><textarea id="promptInput" placeholder="描述音乐 / 声音 / 旁白内容、情绪、节奏、风格与声音质感，按 / 呼出指令，@引用素材" ${frozen?'disabled':''}>${escapeHtml(n.prompt||'')}</textarea></div>
        <div class="audio-gen-controls"><button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}"><span class="model-dot"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button><button type="button" id="audioContextBtn" class="audio-gen-action">${uiIcon('context')}<span>Context</span></button><div class="audio-gen-spacer"></div>${costBadgeHtml(n)}<button type="button" class="audio-generate-btn" id="generateBtn" ${noModel||frozen?'disabled':''} title="生成">${uiIcon('next')}</button></div>
        ${noModel?`<button class="inline-setup-model" id="inlineSetupModel">还没有音频模型，点击添加</button>`:''}
      </div>`;
      generator.classList.remove('hidden');positionGeneratorBelowNode(n,el,desiredWidth);
      $('#promptInput')?.addEventListener('input',e=>{n.prompt=e.target.value;saveState()});
      $('#modelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget));
      $('#audioReferenceBtn')?.addEventListener('click',()=>openReferencePicker(n));
      $('#audioContextBtn')?.addEventListener('click',()=>openCreativeContextComposer(n));
      $('#inlineSetupModel')?.addEventListener('click',()=>{if(providers.some(p=>(p.models||[]).length))window.location.href='./models.html';else openProviderModal()});
      $('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));
      $('#generateBtn').onclick=()=>{expandedNodeId=null;generator.classList.add('hidden');renderToolbar();generateForNode(n).catch(()=>{})};
      return;
    }
'''
app = replace_once(app, marker, composer + marker, 'audio composer insertion')

# 8) Component stylesheet.
if './styles/audio-node.css' not in html:
    html = replace_once(html, '  <link rel="stylesheet" href="./styles/video-node.css" />\n', '  <link rel="stylesheet" href="./styles/video-node.css" />\n  <link rel="stylesheet" href="./styles/audio-node.css" />\n', 'audio stylesheet link')

app_path.write_text(app, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
print('Applied UI 2.3 audio node migration.')
