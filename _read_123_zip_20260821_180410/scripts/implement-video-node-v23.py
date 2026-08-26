from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
html_path = root / 'index.html'
ui_test_path = root / 'tests' / 'ui-design-system.test.mjs'

app = app_path.read_text(encoding='utf-8')
html = html_path.read_text(encoding='utf-8')
ui_test = ui_test_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)


# 1) Video helpers: local upload, result actions, toolbar glyphs.
if 'function applyLocalVideoToNode' not in app:
    marker = "  function selectedToolbarNode(){const ids=currentSelectionIds();if(ids.length!==1)return null;return state.nodes.find(n=>n.id===ids[0])||null}\n"
    helpers = r'''  async function applyLocalVideoToNode(n,file){
    if(!n||n.type!=='video'||!file||!String(file.type||'').startsWith('video/'))return;
    snapshot('上传视频到节点');
    const localUrl=URL.createObjectURL(file);
    n.outputUrl=localUrl;
    n.localFileName=file.name||'video';
    n.localMime=file.type||'video/mp4';
    n.content='';
    n.uploading=Boolean(backendOnline);
    n.taskStatus='succeeded';
    n.taskProgress=100;
    n.w=Math.max(Number(n.w)||0,620);
    if(file.name)n.title=file.name;
    const version=recordNodeResultVersion(n,{outputUrl:localUrl,providerId:'',modelId:'',modelName:'本地上传'});
    selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=null;
    saveState();render();
    if(!backendOnline)return;
    try{
      const up=await uploadBlob(file,file.name||`video-${Date.now()}.mp4`);
      n.outputUrl=up.url;n.serverMedia=true;n.uploading=false;
      if(version){version.outputUrl=up.url;version.modelName='本地上传'}
      try{URL.revokeObjectURL(localUrl)}catch{}
      saveState();render();
    }catch(err){n.uploading=false;saveState();render();showToast('视频已放入节点，但服务器保存失败，当前素材仅本次会话可用')}
  }
  function openVideoNodeUpload(n){
    const input=document.createElement('input');input.type='file';input.accept='video/*';input.onchange=()=>{const f=input.files?.[0];if(f)applyLocalVideoToNode(n,f)};input.click();
  }
  function videoToolbarGlyph(action){
    return ({'video-hd':'HD','video-reshoot':'↺','video-frames':'▦','video-trim':'✂','video-audio':'♫','video-extend':'→','video-download':'↓','video-fullscreen':'↗'})[action]||'•';
  }
  function downloadVideoNode(n){
    if(!n?.outputUrl)return showToast('当前视频还没有可下载结果');
    const a=document.createElement('a');a.href=n.outputUrl;a.download=(n.localFileName||n.title||'video').replace(/[\\/:*?"<>|]+/g,'-');a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  }
  function fullscreenVideoNode(n){
    const el=$(`.node[data-id="${CSS.escape(String(n.id))}"] video`);if(!el)return showToast('当前视频还没有结果');if(el.requestFullscreen)el.requestFullscreen().catch(()=>showToast('浏览器未允许全屏'));else showToast('当前浏览器不支持全屏');
  }

'''
    app = replace_once(app, marker, helpers + marker, 'video helper insertion')

# 2) Render video with the same universal four-state contract as image/text nodes.
old_video_render = r'''    } else if(n.type==='video'){
      body = n.outputUrl ? `<video class="node-media-video" src="${escapeAttr(n.outputUrl)}" controls preload="${n.id===selectedId||n.id===expandedNodeId?'metadata':'none'}" ${n.muted?'muted':''}></video>` : n.content ? `<div class="node-content-video" style="background:${themeBg(n.content)}"><div class="play-icon">▶</div><div class="job-badge">video</div></div>` : `<div class="node-empty"><div class="big-icon">▷</div><div>拖入视频或点击生成</div></div>`;
'''
new_video_render = r'''    } else if(n.type==='video'){
      const emptyVideo=contentState==='empty';
      const quick=emptyVideo?`<div class="video-node-try"><div class="video-node-try-label">尝试：</div><button type="button" data-video-quick="text"><span class="video-quick-icon">T</span><b>文生视频</b></button><button type="button" data-video-quick="image"><span class="video-quick-icon">▧</span><b>图生视频</b></button><button type="button" data-video-quick="frame"><span class="video-quick-icon">↔</span><b>首尾帧生视频</b></button></div>`:'';
      const uploadAction=emptyVideo&&interactionState==='selected'?`<button type="button" class="video-node-upload" data-video-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const media=n.outputUrl?`<div class="media-clip video-node-stage"><video class="node-media-video" src="${escapeAttr(n.outputUrl)}" controls playsinline preload="${n.id===selectedId||n.id===expandedNodeId?'metadata':'none'}" ${n.muted?'muted':''}></video></div>`:n.content?`<div class="node-content-video video-node-stage" style="background:${themeBg(n.content)}"><div class="play-icon">▶</div><div class="job-badge">video</div></div>`:`<div class="video-node-placeholder video-node-stage"><div class="big-icon">▷</div></div>`;
      body=`<div class="video-node-shell ${emptyVideo?'is-empty':'has-output'}">${uploadAction}${media}${quick}</div>`;
'''
app = replace_once(app, old_video_render, new_video_render, 'video render branch')

# 3) Bind video quick-start/upload/drop interactions.
video_bind_marker = r'''    if(n.type==='image'&&contentState==='empty'){
      el.addEventListener('dragover',e=>{const hasImage=[...(e.dataTransfer?.items||[])].some(it=>it.kind==='file'&&String(it.type||'').startsWith('image/'));if(!hasImage)return;e.preventDefault();e.stopPropagation();el.classList.add('image-file-drop-target')});
      el.addEventListener('dragleave',()=>el.classList.remove('image-file-drop-target'));
      el.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(!file)return;e.preventDefault();e.stopPropagation();el.classList.remove('image-file-drop-target');applyLocalImageToNode(n,file)});
    }
'''
video_bind_new = video_bind_marker + r'''    $$('[data-video-quick]',el).forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();if(contentState!=='empty')return;
      selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=n.id;
      const mode=b.dataset.videoQuick;
      if(mode==='text'){n.videoMode='text2video';n.prompt=n.prompt||'描述主体动作、镜头运动、节奏、环境和声音。';saveState();render();setTimeout(()=>$('#promptInput')?.focus(),0);return}
      if(mode==='image'){n.videoMode='image2video';n.prompt=n.prompt||'基于参考图片生成连续自然的视频，保持主体身份、服装、场景和构图连续。';saveState();render();setTimeout(()=>openReferencePicker(n),0);return}
      if(mode==='frame'){n.videoMode='frame2video';n.prompt=n.prompt||'根据首帧与尾帧生成连贯自然的镜头运动和主体动作。';saveState();render();setTimeout(()=>openVideoGeneratorTool('首尾帧',n),0)}
    }));
    $('[data-video-node-upload]',el)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openVideoNodeUpload(n)});
    if(n.type==='video'&&contentState==='empty'){
      el.addEventListener('dragover',e=>{const hasVideo=[...(e.dataTransfer?.items||[])].some(it=>it.kind==='file'&&String(it.type||'').startsWith('video/'));if(!hasVideo)return;e.preventDefault();e.stopPropagation();el.classList.add('video-file-drop-target')});
      el.addEventListener('dragleave',()=>el.classList.remove('video-file-drop-target'));
      el.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('video/'));if(!file)return;e.preventDefault();e.stopPropagation();el.classList.remove('video-file-drop-target');applyLocalVideoToNode(n,file)});
    }
'''
app = replace_once(app, video_bind_marker, video_bind_new, 'video quick bindings')

# 4) Result toolbar uses creator-facing transforms, not generic edit/rerun chrome.
old_video_actions = "    if(n.type==='video')return[{label:'编辑视频',tool:'视频工作台',primary:true},{label:'续写',tool:'智能续写'},{label:'合成',tool:'视频合成'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];"
new_video_actions = "    if(n.type==='video')return[{label:'高清',tool:'高清',action:'video-hd',primary:true},{label:'片段重拍',tool:'片段重拍',action:'video-reshoot'},{label:'提帧',tool:'逐帧拉片',action:'video-frames'},{label:'剪辑',tool:'剪辑',action:'video-trim'},{label:'音频分离',tool:'分离音视频',action:'video-audio'},{label:'续写',tool:'智能续写',action:'video-extend'},{label:'下载',action:'video-download',iconOnly:true},{label:'全屏',action:'video-fullscreen',iconOnly:true}];"
app = replace_once(app, old_video_actions, new_video_actions, 'video toolbar actions')

run_marker = "    if(a.action==='image-fullscreen'){fullscreenImageNode(n);return}\n"
run_insert = run_marker + "    if(a.action==='video-download'){downloadVideoNode(n);return}\n    if(a.action==='video-fullscreen'){fullscreenVideoNode(n);return}\n"
app = replace_once(app, run_marker, run_insert, 'video toolbar handlers')

# 5) Image and video result toolbars share the compact contextual placement while keeping type-specific glyphs.
old_toolbar_condition = "    if(n.type==='image'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(760,actions.length*68));"
new_toolbar_condition = "    if(n.type==='image'||n.type==='video'){\n      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(n.type==='image'?760:620,actions.length*68));"
app = replace_once(app, old_toolbar_condition, new_toolbar_condition, 'media toolbar condition')
old_toolbar_html = "      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''} ${a.iconOnly?'icon-only':''}\" data-top-action=\"${i}\" title=\"${escapeAttr(a.label)}\"><span class=\"tool-glyph\">${imageToolbarGlyph(a.action||'')}</span>${a.iconOnly?'':`<span>${escapeHtml(a.label)}</span>`}${a.action==='image-portrait'?'<span class=\"tool-arrow\">⌄</span>':''}</button>`).join('');"
new_toolbar_html = "      toolbar.innerHTML=actions.map((a,i)=>`<button class=\"tool-btn ${a.primary?'primary':''} ${a.iconOnly?'icon-only':''}\" data-top-action=\"${i}\" title=\"${escapeAttr(a.label)}\"><span class=\"tool-glyph\">${n.type==='image'?imageToolbarGlyph(a.action||''):videoToolbarGlyph(a.action||'')}</span>${a.iconOnly?'':`<span>${escapeHtml(a.label)}</span>`}${a.action==='image-portrait'?'<span class=\"tool-arrow\">⌄</span>':''}</button>`).join('');"
app = replace_once(app, old_toolbar_html, new_toolbar_html, 'media toolbar glyphs')

# 6) Video composer is fixed in screen space, just like image/text composers.
old_position_head = "    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image';\n    generator.dataset.nodeType=n?.type||'';\n    generator.classList.toggle('text-generator',isText);\n    generator.classList.toggle('image-generator',isImage);\n    if(isText||isImage){\n      const width=isImage?820:594,height=isImage?246:142,bottomLimit=window.innerHeight-dockReserve-edge;"
new_position_head = "    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video';\n    generator.dataset.nodeType=n?.type||'';\n    generator.classList.toggle('text-generator',isText);\n    generator.classList.toggle('image-generator',isImage);\n    generator.classList.toggle('video-generator',isVideo);\n    if(isText||isImage||isVideo){\n      const width=isImage||isVideo?820:594,height=isImage?246:isVideo?258:142,bottomLimit=window.innerHeight-dockReserve-edge;"
app = replace_once(app, old_position_head, new_position_head, 'video composer positioning')
app = replace_once(app, "      generator.style.maxHeight=isImage?height+'px':'none';", "      generator.style.maxHeight=isImage||isVideo?height+'px':'none';", 'video composer max height')

# 7) Add a dedicated compact video composer before the legacy generic generator path.
video_composer_marker = "    generator.innerHTML=`\n      <div class=\"lib-gen-main ${n.type==='text'?'text-generator-main':''}\">"
video_composer = r'''    if(n.type==='video'){
      const modes=videoModes;
      generator.innerHTML=`<div class="lib-gen-main video-generator-main">
        <div class="video-gen-top">
          <button type="button" class="video-ref-slot" id="videoReferenceBtn"><span class="slot-icon">＋</span><span>参考${refs.length?` ${refs.length}`:''}</span></button>
          <button type="button" class="video-ref-slot" id="videoFramesBtn"><span class="slot-icon">↔</span><span>首尾帧</span></button>
          <button type="button" class="video-gen-action" id="videoMotionBtn">${uiIcon('reframe')}<span>运镜</span></button>
          <div class="video-gen-spacer"></div>
          <span class="video-mode-label">${escapeHtml(videoModeLabel(n.videoMode||modes[0]?.key))}</span>
        </div>
        <div class="prompt-box video-prompt-box"><textarea id="promptInput" placeholder="描述动作、机位、运镜、节奏、环境和声音，按 / 呼出指令，@引用素材" ${frozen?'disabled':''}>${escapeHtml(n.prompt||'')}</textarea></div>
        <div class="video-gen-controls">
          <button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}"><span class="model-dot"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button>
          <select id="videoModeSelect" class="video-gen-select" title="生成方式">${modes.map(v=>`<option value="${escapeAttr(v.key)}" ${normalizeVideoModeKey(n.videoMode||modes[0]?.key)===v.key?'selected':''}>${escapeHtml(v.label)}</option>`).join('')}</select>
          <select id="ratioSelect" class="video-gen-select" title="画幅比">${optionList(ratios,n.aspectRatio||ratios[0])}</select>
          <select id="durationSelect" class="video-gen-select" title="时长">${durations.map(x=>`<option value="${x}" ${Number(n.duration||durations[0])===Number(x)?'selected':''}>${x}s</option>`).join('')}</select>
          <select id="resolutionSelect" class="video-gen-select" title="分辨率">${optionList(resolutions,n.resolution||resolutions[0])}</select>
          <div class="video-gen-spacer"></div>${costBadgeHtml(n)}
          <button type="button" class="video-generate-btn" id="generateBtn" ${noModel||frozen?'disabled':''} title="生成">${uiIcon('next')}</button>
        </div>
        ${noModel?`<button class="inline-setup-model" id="inlineSetupModel">还没有视频模型，点击添加</button>`:''}
      </div>`;
      generator.classList.remove('hidden');
      positionGeneratorBelowNode(n,el,desiredWidth);
      const input=$('#promptInput');
      input?.addEventListener('input',e=>{n.prompt=e.target.value;saveState()});
      $('#modelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget));
      $('#inlineSetupModel')?.addEventListener('click',()=>{if(providers.some(p=>(p.models||[]).length))window.location.href='./models.html';else openProviderModal()});
      $('#videoModeSelect')?.addEventListener('change',e=>{n.videoMode=normalizeVideoModeKey(e.target.value);saveState();renderGenerator()});
      $('#ratioSelect')?.addEventListener('change',e=>{n.aspectRatio=e.target.value;saveState()});
      $('#durationSelect')?.addEventListener('change',e=>{n.duration=Number(e.target.value);saveState()});
      $('#resolutionSelect')?.addEventListener('change',e=>{n.resolution=e.target.value;saveState()});
      $('#videoReferenceBtn')?.addEventListener('click',()=>openReferencePicker(n));
      $('#videoFramesBtn')?.addEventListener('click',()=>openVideoGeneratorTool('首尾帧',n));
      $('#videoMotionBtn')?.addEventListener('click',()=>openVideoGeneratorTool('运镜预设',n));
      $('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));
      $('#generateBtn').onclick=()=>{expandedNodeId=null;generator.classList.add('hidden');renderToolbar();generateForNode(n).catch(()=>{})};
      return;
    }
'''
app = replace_once(app, video_composer_marker, video_composer + video_composer_marker, 'video composer insertion')

# 8) Load the component stylesheet after image/text node component styles.
if './styles/video-node.css' not in html:
    html = replace_once(html, '  <link rel="stylesheet" href="./styles/image-node.css" />\n', '  <link rel="stylesheet" href="./styles/image-node.css" />\n  <link rel="stylesheet" href="./styles/video-node.css" />\n', 'video stylesheet link')

# 9) Keep the design-system regression contract aligned with the video result toolbar.
ui_test = ui_test.replace("  assert.match(app, /label:'编辑视频'/);\n", "  assert.match(app, /label:'片段重拍'/);\n  assert.match(app, /label:'提帧'/);\n  assert.match(app, /label:'音频分离'/);\n")

app_path.write_text(app, encoding='utf-8')
html_path.write_text(html, encoding='utf-8')
ui_test_path.write_text(ui_test, encoding='utf-8')
print('Applied UI 2.3 video node migration.')
