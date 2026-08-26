from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
app_path = root / 'app.js'
index_path = root / 'index.html'
test_path = root / 'tests' / 'image-node-libtv.test.mjs'
app = app_path.read_text(encoding='utf-8')
index = index_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


# 1) Load the dedicated image-node surface after base node rules and before composer rules.
if './styles/image-node.css' not in index:
    index = replace_once(
        index,
        '  <link rel="stylesheet" href="./styles/text-node.css" />\n  <link rel="stylesheet" href="./styles/composer.css" />',
        '  <link rel="stylesheet" href="./styles/text-node.css" />\n  <link rel="stylesheet" href="./styles/image-node.css" />\n  <link rel="stylesheet" href="./styles/composer.css" />',
        'image node stylesheet link',
    )

# 2) Rebuild the image render branch to match the supplied LibTV empty/result node behavior.
rs = app.index('  function renderNode(n){')
render_end = app.index('\n\n  function nodePortWorldPoint', rs)
render_segment = app[rs:render_end]
image_pattern = re.compile(r"    else if\(n\.type==='image'\)\{.*?\n    \} else if\(n\.type==='video'\)\{", re.S)
image_matches = list(image_pattern.finditer(render_segment))
if len(image_matches) != 1:
    raise SystemExit(f'image render branch: expected 1 match, got {len(image_matches)}')
image_render = r'''    else if(n.type==='image'){
      const ratioStyle=n.cropRatio&&!n.h?`aspect-ratio:${escapeAttr(n.cropRatio.replace(':','/'))};height:auto;min-height:130px;`:'';
      const emptyImage=contentState==='empty';
      const quick=emptyImage?`<div class="image-node-try"><div class="image-node-try-label">尝试：</div><button type="button" data-image-quick="repaint"><span class="image-quick-icon">↥</span><b>图生图</b></button><button type="button" data-image-quick="upscale"><span class="image-quick-icon">HD</span><b>图片高清</b></button></div>`:'';
      const uploadAction=emptyImage&&interactionState==='selected'?`<button type="button" class="image-node-upload" data-image-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const media=n.outputUrl?`<div class="media-clip image-node-stage" style="${ratioStyle}"><img class="node-media-img" loading="lazy" decoding="async" style="${mediaTransformStyle(n)}" src="${escapeAttr(n.outputUrl)}" alt="${escapeAttr(n.title||'图片')}"/></div>`:n.content?`<div class="node-content-img image-node-stage" style="background:${themeBg(n.content)};${mediaTransformStyle(n)}"><div class="job-badge">image</div></div>`:`<div class="image-node-placeholder image-node-stage"><div class="big-icon">▧</div></div>`;
      body=`<div class="image-node-shell ${emptyImage?'is-empty':'has-output'}">${uploadAction}${media}${quick}</div>`;
    } else if(n.type==='video'){'''
render_segment = image_pattern.sub(image_render, render_segment, count=1)
app = app[:rs] + render_segment + app[render_end:]

# 3) Image-specific helpers: fill an empty image node, semantic reference slots, result actions.
helpers = r'''
  async function applyLocalImageToNode(n,file){
    if(!n||n.type!=='image'||!file||!String(file.type||'').startsWith('image/'))return;
    snapshot('上传图片到节点');
    const localUrl=URL.createObjectURL(file);
    n.outputUrl=localUrl;
    n.localFileName=file.name||'image';
    n.localMime=file.type||'image/png';
    n.content='';
    n.uploading=Boolean(backendOnline);
    n.taskStatus='succeeded';
    n.taskProgress=100;
    if(file.name)n.title=file.name;
    const version=recordNodeResultVersion(n,{outputUrl:localUrl,providerId:'',modelId:'',modelName:'本地上传'});
    selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=null;
    saveState();render();
    if(!backendOnline)return;
    try{
      const up=await uploadBlob(file,file.name||`image-${Date.now()}.png`);
      n.outputUrl=up.url;
      n.serverMedia=true;
      n.uploading=false;
      if(version){version.outputUrl=up.url;version.modelName='本地上传'}
      try{URL.revokeObjectURL(localUrl)}catch{}
      saveState();render();
    }catch(err){
      n.uploading=false;saveState();render();showToast('图片已放入节点，但服务器保存失败，当前素材仅本次会话可用');
    }
  }
  function openImageNodeUpload(n){
    const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const f=input.files?.[0];if(f)applyLocalImageToNode(n,f)};input.click();
  }
  function imageReferenceEdge(n,role){
    return state.edges.find(e=>{if(e.target!==n.id)return false;const source=state.nodes.find(x=>x.id===e.source);return (e.role||inferEdgeRole(source,n))===role});
  }
  function openImageReferenceSlotPicker(n,role='image_reference',title='选择参考图'){
    if(!n||n.type!=='image')return;
    const images=state.nodes.filter(x=>x.id!==n.id&&x.type==='image'&&uiV23NodeContentState(x)==='result');
    const current=imageReferenceEdge(n,role)?.source||'';
    let chosen=current;
    modalShell(title,`<div class="image-ref-picker-grid">${images.map(x=>`<button type="button" data-image-ref-source="${x.id}" class="${x.id===current?'active':''}"><span class="thumb" ${x.outputUrl?`style="background-image:url('${escapeAttr(x.outputUrl)}')"`:`style="background:${themeBg(x.content||'portrait')}"`}></span><b>${escapeHtml(x.title||'图片')}</b></button>`).join('')||'<div class="feature-empty">画布里还没有可用图片。可以先把本地图片拖进画布，再回来选择。</div>'}</div><div class="feature-actions"><button id="imageRefClear">清除该参考</button><button id="imageRefCancel">取消</button><button id="imageRefApply" class="primary">应用</button></div>`,{wide:true});
    $$('[data-image-ref-source]',featureModal).forEach(b=>b.onclick=()=>{chosen=b.dataset.imageRefSource;$$('[data-image-ref-source]',featureModal).forEach(x=>x.classList.toggle('active',x===b))});
    $('#imageRefClear').onclick=()=>{chosen='';$$('[data-image-ref-source]',featureModal).forEach(x=>x.classList.remove('active'))};
    $('#imageRefCancel').onclick=closeFeatureModal;
    $('#imageRefApply').onclick=()=>{
      snapshot('设置图片参考');
      state.edges=state.edges.filter(e=>{if(e.target!==n.id)return true;const source=state.nodes.find(x=>x.id===e.source);return (e.role||inferEdgeRole(source,n))!==role});
      if(chosen)state.edges.push(makeSemanticEdge(chosen,n.id,'image-generator-ref',role));
      expandedNodeId=n.id;selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);
      saveState();closeFeatureModal();render();renderGenerator();
    };
  }
  function imageToolbarGlyph(action){
    return ({'image-portrait':'◉','image-panorama':'◌','image-angle':'⌖','image-light':'☼','image-grid':'▦','image-hd':'HD','image-element':'✎','image-layers':'◇','image-split':'⌗','image-brush':'⌁','image-download':'↓','image-fullscreen':'↗'})[action]||'•';
  }
  function openImagePortraitMenu(n,anchor){
    const r=anchor.getBoundingClientRect();
    contextMenu.style.left=Math.max(12,Math.min(window.innerWidth-190,r.left))+'px';
    contextMenu.style.top=Math.min(window.innerHeight-150,r.bottom+6)+'px';
    contextMenu.innerHTML='<button data-image-portrait-tool="人像调节"><span>人像调节</span></button><button data-image-portrait-tool="情绪调节"><span>情绪调节</span></button>';
    contextMenu.classList.remove('hidden');
    $$('[data-image-portrait-tool]',contextMenu).forEach(b=>b.onclick=()=>{contextMenu.classList.add('hidden');sendToolToGenerator(n,b.dataset.imagePortraitTool,b.dataset.imagePortraitTool==='情绪调节'?'保持人物身份与构图，仅调整自然表情与情绪':'降低 AI 感，优化皮肤、毛发、五官、手部、人景融合和光影',{operation:b.dataset.imagePortraitTool},'image')});
  }
  function sendImageLayerSeparation(n){
    sendToolToGenerator(n,'图层分离','将当前图片按主体、前景、中景、背景进行语义分层，保持原始构图，并输出适合后续独立编辑的分层结果',{operation:'layer_separation',layers:['subject','foreground','midground','background']},'image');
  }
  function downloadImageNode(n){
    if(!n?.outputUrl)return showToast('当前图片还没有可下载结果');
    const a=document.createElement('a');a.href=n.outputUrl;a.download=(n.localFileName||n.title||'image').replace(/[\\/:*?"<>|]+/g,'-');a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
  }
  function fullscreenImageNode(n){
    const el=$(`.node[data-id="${CSS.escape(String(n.id))}"] .media-clip,.node[data-id="${CSS.escape(String(n.id))}"] .node-content-img`);if(!el)return showToast('当前图片还没有结果');if(el.requestFullscreen)el.requestFullscreen().catch(()=>showToast('浏览器未允许全屏'));else showToast('当前浏览器不支持全屏');
  }

'''
marker = '  function selectedToolbarNode(){'
if 'function applyLocalImageToNode(n,file)' not in app:
    app = replace_once(app, marker, helpers + marker, 'image helpers')

# 4) Bind empty-node upload/drop and make quick actions actually build image-generation flows.
old_image_bind = "    $$('[data-image-quick]',el).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();if(b.dataset.imageQuick==='repaint')openImageTool('重绘',n);if(b.dataset.imageQuick==='upscale')openImageTool('高清',n)}));"
new_image_bind = r'''    $$('[data-image-quick]',el).forEach(b=>b.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      if(contentState!=='empty')return;
      selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);expandedNodeId=n.id;
      if(b.dataset.imageQuick==='repaint'){
        n.prompt=n.prompt||'基于参考图片生成新的画面，保持需要保留的主体身份、材质、构图与风格连续。';
        saveState();render();openImageReferenceSlotPicker(n,'image_reference','选择图生图参考');return;
      }
      if(b.dataset.imageQuick==='upscale'){
        n.prompt='对参考图片进行高清增强与细节修复，保持人物身份、文字、产品结构和原始构图不变。';n.toolParams={...(n.toolParams||{}),operation:'高清放大'};
        saveState();render();openImageReferenceSlotPicker(n,'image_reference','选择需要高清处理的图片');
      }
    }));
    $('[data-image-node-upload]',el)?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openImageNodeUpload(n)});
    if(n.type==='image'&&contentState==='empty'){
      el.addEventListener('dragover',e=>{const hasImage=[...(e.dataTransfer?.items||[])].some(it=>it.kind==='file'&&String(it.type||'').startsWith('image/'));if(!hasImage)return;e.preventDefault();e.stopPropagation();el.classList.add('image-file-drop-target')});
      el.addEventListener('dragleave',()=>el.classList.remove('image-file-drop-target'));
      el.addEventListener('drop',e=>{const file=[...(e.dataTransfer?.files||[])].find(f=>String(f.type||'').startsWith('image/'));if(!file)return;e.preventDefault();e.stopPropagation();el.classList.remove('image-file-drop-target');applyLocalImageToNode(n,file)});
    }'''
app = replace_once(app, old_image_bind, new_image_bind, 'image quick bindings')

# 5) Make images imported on blank canvas use the same mature image-node width.
app = replace_once(
    app,
    "const n={id:uid('n'),type:t,x:p.x,y:p.y,w:320,title:f.name,prompt:'',providerId:'',modelId:'',modelName:'',selected:false,outputUrl:blobUrl",
    "const n={id:uid('n'),type:t,x:p.x,y:p.y,w:t==='image'?620:320,title:f.name,prompt:'',providerId:'',modelId:'',modelName:'',selected:false,outputUrl:blobUrl",
    'local image node width',
)

# 6) Replace the selected image-result toolbar with the supplied LibTV action set.
old_image_actions = "    if(n.type==='image')return[{label:'编辑图片',tool:'图像工作台',primary:true},{label:'转视频',action:'image-video'},{label:'高清',tool:'高清'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];"
new_image_actions = "    if(n.type==='image')return[{label:'人像后期调节',action:'image-portrait',primary:true},{label:'全景',tool:'全景',action:'image-panorama'},{label:'多角度',tool:'多角度',action:'image-angle'},{label:'打光',tool:'打光',action:'image-light'},{label:'九宫格',tool:'九宫格',action:'image-grid'},{label:'高清',tool:'高清',action:'image-hd'},{label:'元素编辑',action:'image-element'},{label:'图层分离',action:'image-layers'},{label:'宫格切分',tool:'宫格切分',action:'image-split'},{label:'画笔',action:'image-brush',iconOnly:true},{label:'下载',action:'image-download',iconOnly:true},{label:'全屏',action:'image-fullscreen',iconOnly:true}];"
app = replace_once(app, old_image_actions, new_image_actions, 'image toolbar actions')

run_marker = "    if(a.action==='script-batch'){openScriptEditor(n,'batch-image');return}\n"
run_insert = run_marker + r'''    if(a.action==='image-portrait'){openImagePortraitMenu(n,anchor);return}
    if(a.action==='image-element'||a.action==='image-brush'){openImageTool('重绘',n);return}
    if(a.action==='image-layers'){sendImageLayerSeparation(n);return}
    if(a.action==='image-download'){downloadImageNode(n);return}
    if(a.action==='image-fullscreen'){fullscreenImageNode(n);return}
'''
app = replace_once(app, run_marker, run_insert, 'image toolbar action handlers')

# 7) Image toolbar sits centered above the selected result and has no redundant label.
old_toolbar_block = r'''    const r=nodeEl.getBoundingClientRect(),actions=nodeTopBarActions(n);
    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(45,r.top-40)+'px';
    toolbar.classList.remove('node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');toolbar.classList.add('node-toolbar-media','node-toolbar-'+n.type);toolbar.dataset.mediaType=n.type;
    toolbar.innerHTML=`<span class="selection-toolbar-label">${escapeHtml(labelForType(n.type))}结果</span>`+actions.map((a,i)=>`<button class="tool-btn ${a.primary?'primary':''}" data-top-action="${i}">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');
    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));'''
new_toolbar_block = r'''    const r=nodeEl.getBoundingClientRect(),actions=nodeTopBarActions(n);
    toolbar.classList.remove('node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');toolbar.classList.add('node-toolbar-media','node-toolbar-'+n.type);toolbar.dataset.mediaType=n.type;
    if(n.type==='image'){
      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(760,actions.length*68));
      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-estimatedWidth-16,r.left+r.width/2-estimatedWidth/2))+'px';
      toolbar.style.top=Math.max(16,r.top-58)+'px';
      toolbar.innerHTML=actions.map((a,i)=>`<button class="tool-btn ${a.primary?'primary':''} ${a.iconOnly?'icon-only':''}" data-top-action="${i}" title="${escapeAttr(a.label)}"><span class="tool-glyph">${imageToolbarGlyph(a.action||'')}</span>${a.iconOnly?'':`<span>${escapeHtml(a.label)}</span>`}${a.action==='image-portrait'?'<span class="tool-arrow">⌄</span>':''}</button>`).join('');
      toolbar.classList.remove('hidden');
      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;
    }
    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(45,r.top-40)+'px';
    toolbar.innerHTML=`<span class="selection-toolbar-label">${escapeHtml(labelForType(n.type))}结果</span>`+actions.map((a,i)=>`<button class="tool-btn ${a.primary?'primary':''}" data-top-action="${i}">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');
    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));'''
app = replace_once(app, old_toolbar_block, new_toolbar_block, 'image toolbar placement')

# 8) Both text and image composers are fixed in screen space, independent of canvas zoom/node size.
pos_pattern = re.compile(r"  function positionGeneratorBelowNode\(n,el,desiredWidth\)\{.*?\n  \}\n\n  function renderGenerator\(\)\{", re.S)
pos_matches = list(pos_pattern.finditer(app))
if len(pos_matches) != 1:
    raise SystemExit(f'position generator function: expected 1 match, got {len(pos_matches)}')
new_position = r'''  function positionGeneratorBelowNode(n,el,desiredWidth){
    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image';
    generator.dataset.nodeType=n?.type||'';
    generator.classList.toggle('text-generator',isText);
    generator.classList.toggle('image-generator',isImage);
    if(isText||isImage){
      const width=isImage?820:594,height=isImage?246:142,bottomLimit=window.innerHeight-dockReserve-edge;
      generator.style.width=width+'px';
      generator.style.minWidth=width+'px';
      generator.style.maxWidth=width+'px';
      generator.style.height=height+'px';
      generator.style.minHeight=height+'px';
      generator.style.maxHeight=isImage?height+'px':'none';
      generator.style.overflow='visible';
      const centered=r.left+r.width/2-width/2;
      generator.style.left=Math.max(edge,Math.min(window.innerWidth-width-edge,centered))+'px';
      let top=r.bottom+gap;
      if(top+height>bottomLimit)top=r.top-gap-height;
      top=Math.max(48,Math.min(bottomLimit-height,top));
      generator.style.top=top+'px';
      return;
    }
    generator.style.minWidth='';generator.style.maxWidth='';generator.style.height='';generator.style.minHeight='';
    generator.style.width=desiredWidth+'px';generator.style.overflow='auto';
    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,r.left-10))+'px';
    const available=Math.max(96,window.innerHeight-r.bottom-gap-edge),safeTop=Math.max(54,window.innerHeight-dockReserve-available);
    generator.style.top=Math.min(r.bottom+gap,safeTop)+'px';
    generator.style.maxHeight=available+'px';
  }

  function renderGenerator(){'''
app = pos_pattern.sub(new_position, app, count=1)

# 9) Dedicated image composer matching the supplied screenshot/video.
image_generator_marker = "    const frozen=Boolean(n.frozen);\n    generator.innerHTML=`\n"
if image_generator_marker not in app:
    raise SystemExit('image generator insertion marker not found')
image_generator_branch = r'''    const frozen=Boolean(n.frozen);
    if(n.type==='image'){
      const imageRefs=refs.filter(r=>r.type==='image');
      const refFor=role=>imageRefs.find(r=>r.role===role)||null;
      const slot=(role,label,glyph)=>{const ref=refFor(role);return `<button type="button" class="image-ref-slot ${ref?'has-ref':''}" data-image-ref-slot="${role}" title="${escapeAttr(ref?`${label} · ${ref.title}`:`添加${label}参考`)}">${ref?.url?`<img src="${escapeAttr(ref.url)}" alt="">`:`<span class="slot-icon">${glyph}</span><span>${label}</span>`}</button>`};
      const imageResolutions=caps.resolutions||['1K','2K','4K'];
      generator.innerHTML=`<div class="lib-gen-main image-generator-main">
        <div class="image-gen-top">${slot('style_reference','风格','◇')}${slot('character_reference','标记','⌾')}${slot('image_reference','聚焦','◎')}<button type="button" class="image-gen-expand" id="imageGenExpand" title="打开图像工作台">↗</button></div>
        <div class="prompt-box image-prompt-box"><textarea id="promptInput" placeholder="描述你想要生成的画面内容，按 / 呼出指令，@引用素材" ${frozen?'disabled':''}>${escapeHtml(n.prompt||'')}</textarea></div>
        <div class="image-gen-controls">
          <button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}"><span class="model-dot"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button>
          <select id="ratioSelect" class="image-gen-select" title="画幅比">${optionList(ratios,n.aspectRatio||ratios[0])}</select>
          <select id="resolutionSelect" class="image-gen-select" title="分辨率">${optionList(imageResolutions,n.resolution||imageResolutions[0])}</select>
          <button type="button" class="image-gen-action" id="imageCameraBtn">${uiIcon('reframe')}<span>摄像机控制</span></button>
          <div class="image-gen-spacer"></div>
          <select id="countSelect" class="image-gen-select" title="生成张数">${[1,2,3,4].map(x=>`<option value="${x}" ${Number(n.count||1)===x?'selected':''}>${x}张</option>`).join('')}</select>
          ${costBadgeHtml(n)}
          <button type="button" class="image-generate-btn" id="generateBtn" ${noModel||frozen?'disabled':''} title="生成">${uiIcon('next')}</button>
        </div>
        ${noModel?`<button class="inline-setup-model" id="inlineSetupModel">还没有图片模型，点击添加</button>`:''}
      </div>`;
      generator.classList.remove('hidden');
      positionGeneratorBelowNode(n,el,desiredWidth);
      const input=$('#promptInput');
      input?.addEventListener('input',e=>{n.prompt=e.target.value;saveState()});
      $('#modelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget));
      $('#inlineSetupModel')?.addEventListener('click',()=>{if(providers.some(p=>(p.models||[]).length))window.location.href='./models.html';else openProviderModal()});
      $('#ratioSelect')?.addEventListener('change',e=>{n.aspectRatio=e.target.value;saveState()});
      $('#resolutionSelect')?.addEventListener('change',e=>{n.resolution=e.target.value;saveState()});
      $('#countSelect')?.addEventListener('change',e=>{n.count=Number(e.target.value);saveState()});
      $$('[data-image-ref-slot]',generator).forEach(b=>b.onclick=()=>openImageReferenceSlotPicker(n,b.dataset.imageRefSlot,b.dataset.imageRefSlot==='style_reference'?'选择风格参考':b.dataset.imageRefSlot==='character_reference'?'选择人物 / 主体参考':'选择图像参考'));
      $('#imageCameraBtn')?.addEventListener('click',()=>openImageTool('多角度',n));
      $('#imageGenExpand')?.addEventListener('click',()=>openImageStudio(n));
      $('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));
      $('#generateBtn').onclick=()=>{expandedNodeId=null;generator.classList.add('hidden');renderToolbar();generateForNode(n).catch(()=>{})};
      return;
    }
    generator.innerHTML=`
'''
app = replace_once(app, image_generator_marker, image_generator_branch, 'image generator branch')

app_path.write_text(app, encoding='utf-8')
index_path.write_text(index, encoding='utf-8')

test_path.write_text(r'''import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/image-node.css', import.meta.url), 'utf8');

assert.match(index, /styles\/image-node\.css/, 'image-node.css must be loaded');
assert.match(app, /applyLocalImageToNode\(n,file\)/, 'empty image nodes must accept direct local upload');
assert.match(app, /image-file-drop-target/, 'empty image nodes must accept drag/drop directly');
assert.match(app, /w:t==='image'\?620:320/, 'blank-canvas image uploads should use the mature image width');
assert.match(app, /style_reference','风格'/, 'image composer should expose the style reference slot');
assert.match(app, /character_reference','标记'/, 'image composer should expose the subject marker slot');
assert.match(app, /image_reference','聚焦'/, 'image composer should expose the image/focus reference slot');
assert.match(app, /width=isImage\?820:594,height=isImage\?246:142/, 'image composer must use fixed screen-space dimensions');
assert.match(app, /人像后期调节/, 'image result toolbar must expose portrait post-processing');
assert.match(app, /label:'全景'/, 'image result toolbar must expose panorama');
assert.match(app, /label:'多角度'/, 'image result toolbar must expose multi-angle');
assert.match(app, /label:'打光'/, 'image result toolbar must expose relighting');
assert.match(app, /label:'九宫格'/, 'image result toolbar must expose nine-grid');
assert.match(app, /label:'高清'/, 'image result toolbar must expose HD');
assert.match(app, /label:'元素编辑'/, 'image result toolbar must expose element editing');
assert.match(app, /label:'图层分离'/, 'image result toolbar must expose layer separation');
assert.match(app, /label:'宫格切分'/, 'image result toolbar must expose grid splitting');
assert.match(app, /id:'upload'.*上传图片 \/ 视频 \/ 音频/s, 'blank-canvas upload action must remain available');
assert.match(app, /viewport\.addEventListener\('drop'/, 'external file drop on canvas must remain available');
assert.match(css, /\.generator-panel\.image-generator[\s\S]*width:820px!important/, 'image composer CSS should lock width');
assert.match(css, /height:246px!important/, 'image composer CSS should lock height');
assert.match(css, /node-toolbar\.node-toolbar-image/, 'image result toolbar must have a dedicated compact surface');

console.log('image node LibTV parity checks passed');
''', encoding='utf-8')
