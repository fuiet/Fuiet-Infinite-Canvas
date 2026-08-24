(()=>{
  'use strict';

  // UI-only localization. Internal IDs, model names, provider payloads and user-entered content are never rewritten.
  const EXACT = new Map(Object.entries({
    'Canvas Studio':'画布工作室',
    'Canvas Studio · LibTV-like UX':'画布工作室 · 类 LibTV 交互体验',
    'Creative Context / AutoLink':'创作上下文 / 智能关联',
    'Creative Context':'创作上下文',
    'AutoLink':'智能关联',
    'Storyboard Studio':'分镜工作室',
    'Image Studio':'图像工作室',
    'Video Studio':'视频工作室',
    'Script Studio':'脚本工作室',
    'Command Palette':'命令面板',
    'My Toolbox':'我的工具箱',
    'Prompt Composer':'提示词合成器',
    'Context Packet':'上下文包',
    'Confirm-before-bind':'确认后绑定',
    'Structured Prompt':'结构化提示词',
    'Original Prompt':'原始提示词',
    'Final Prompt':'最终提示词',
    'Apply references + Final Prompt':'应用参考 + 最终提示词',

    'Edge Inspector':'连线检查器',
    'Batch Connect · 批量连接':'批量连接',
    'Batch Connect':'批量连接',
    'Inspect Data':'查看数据',
    'Source':'来源',
    'Target':'目标',
    'Semantic Role':'语义角色',
    'Edge ID':'连线 ID',
    'Raw Data':'原始数据',
    'Disconnect':'断开连接',

    'Version Tree':'版本树',
    'Versions':'版本',
    'Video Versions':'视频版本',
    'Original':'原始版本',
    'Original Version':'原始版本',
    'New Version':'新版本',
    'Candidate':'候选',
    'Approved':'已通过',
    'Needs Review':'待审核',
    'Rejected':'已拒绝',
    'Base':'基础',
    'Canvas':'画布',
    'Working':'工作版本',
    'Apply to Node':'应用到节点',
    'Send Version':'发送版本',
    'Create Branch':'创建分支',
    'Back':'返回',
    'Compare':'对比',
    'Version Compare':'版本对比',

    'References':'参考素材',
    'Reference':'参考',
    'No references yet':'暂无参考素材',
    'No references yet.':'暂无参考素材。',
    'Connect assets or use AutoLink.':'连接素材或使用智能关联。',
    '+ Add':'＋ 添加',
    '＋ Add':'＋ 添加',
    'View':'查看',
    'Tools':'工具',
    'Adjust':'调整',
    'Info':'信息',
    'Context':'上下文',
    'More':'更多',
    'Fit':'适应窗口',
    'AI':'智能',
    'Auto':'自动',
    'Prompt':'提示词',
    'API':'接口',
    'FOV':'视野角度',
    'REST API':'REST 接口',
    'ComfyUI API':'ComfyUI 接口',

    'Crop':'裁剪',
    'Inpaint':'局部重绘',
    'Extend':'扩展',
    'Relight':'重新打光',
    'Upscale':'高清放大',
    'Angle':'视角',
    'Focus':'聚焦',
    'Reference Compose':'参考合成',
    'Reset':'重置',
    'Aspect Ratio':'画幅比例',
    'Guide':'辅助线',
    'Safe Area':'安全区域',
    'Reset Working':'重置工作版本',
    'Apply Crop':'应用裁剪',
    'Target Ratio':'目标画幅',
    'Anchor':'锚点',
    'Outpaint Prompt':'扩图提示词',
    'Generate Extended Version':'生成扩展版本',
    'Region Prompt':'区域提示词',
    'Open Mask Editor':'打开蒙版编辑器',
    'Before':'之前',
    'After':'之后',
    'Light Color':'灯光颜色',
    'Create Relight Version':'创建打光版本',
    'Camera Intent':'镜头意图',
    'Generate New View':'生成新视角',
    'Focus Strength':'聚焦强度',
    'Depth Separation':'景深分离',
    'Focus Intent':'聚焦意图',
    'Generate Focus Version':'生成聚焦版本',
    'Composition Prompt':'合成提示词',
    'Global Blend':'全局融合',
    'Composition Priority':'构图优先级',
    'Style Lock':'风格锁定',
    'Subject Preservation':'主体保留',
    'Preserve':'保留项目',
    'Reference Policy':'参考策略',
    'Normalize enabled weights':'归一化已启用权重',
    'Reference Weights':'参考权重',
    'Generate Composed Version':'生成合成版本',
    'Mode':'模式',
    'Scale':'倍数',
    'Upscale Current Version':'放大当前版本',
    'Divider / Overlay':'分隔线 / 叠加度',
    'Flip A/B':'交换 A/B',
    'Reset View':'重置视图',
    'Reject Right':'拒绝右侧版本',
    'Approve Right':'通过右侧版本',
    'Flicker A/B':'A/B 闪切',
    'Difference':'差异',
    'Left':'左侧',
    'Right':'右侧',
    'Image Preview':'图像预览',
    'Brush':'画笔',
    'Erase':'擦除',
    'Lasso':'套索',
    'Subject Draft':'主体草稿',
    'Background':'背景',
    'Center Object':'居中主体',
    'Invert':'反选',
    'Grow':'扩张',
    'Shrink':'收缩',
    'Clear':'清空',
    'Save Mask Draft':'保存蒙版草稿',
    'Discard Draft':'丢弃草稿',
    'Create Inpaint Version':'创建重绘版本',
    'Identity':'身份',
    'Pose':'姿势',
    'Composition':'构图',
    'Clothing':'服装',
    'Product geometry':'产品形态',
    'Logo / text':'标志 / 文字',

    'Trim':'片段裁剪',
    'Extract Frame':'抽取画面帧',
    'Segment Remake':'局部重拍',
    'Auto Reframe':'智能重构图',
    'Speed':'变速',
    'Freeze Frame':'画面定格',
    'Audio Split':'音视频分离',
    'Review Markers':'审片标记',
    'Markers':'标记',
    'Marker':'标记',
    'Selected duration:':'已选时长：',
    'In Point':'入点',
    'Out Point':'出点',
    'Create Trim Version':'创建裁剪版本',
    'Timecode':'时间码',
    'Extract Current Frame':'抽取当前帧',
    'Direction':'方向',
    'After End':'向后延长',
    'Before Start':'向前延长',
    'Extend Duration':'延长时长',
    'Continuation Prompt':'续写提示词',
    'Create Extend Version':'创建延长版本',
    'Range':'区间',
    'Remake Prompt':'重拍提示词',
    'Remake Selected Segment':'重拍选中片段',
    'Subject Tracking':'主体跟随',
    'Auto / continuity subject':'自动 / 连续性主体',
    'Center':'居中',
    'Bias Left':'偏左',
    'Bias Right':'偏右',
    'Manual focus point':'手动焦点',
    'Horizontal Focus':'水平焦点',
    'Vertical Focus':'垂直焦点',
    'Safe Margin':'安全边距',
    'Create Reframe Version':'创建重构图版本',
    'Playback Speed':'播放速度',
    'Preserve audio pitch':'保持音高',
    'Output':'输出',
    'Create Speed Version':'创建变速版本',
    'Freeze At':'定格时间点',
    'Hold Duration':'定格时长',
    'Audio During Hold':'定格期间音频',
    'Insert silence':'插入静音',
    'Create Freeze Version':'创建定格版本',
    'Working Video':'工作视频',
    'Muted Video':'无声视频',
    'Audio Node':'音频节点',
    'Keep muted video as a new Video Version':'将无声视频保留为新视频版本',
    'Separate Audio to Canvas':'分离音频并发送到画布',
    'Label':'标签',
    'Note':'备注',
    'Shortcut:':'快捷键：',
    'Left Version':'左侧版本',
    'Right Version':'右侧版本',
    '2-Up':'双栏',
    'Split':'分屏',
    'Work from Left':'从左侧版本继续',
    'Work from Right':'从右侧版本继续',
    'Hold A / Toggle':'按住查看 A / 切换',
    'Context / References':'上下文 / 参考素材',
    'Loop':'循环',
    'Video Preview':'视频预览',
    'Set In':'设置入点',
    'Set Out':'设置出点',
    'Model Capability':'模型能力',
    'Remake':'重拍',
    'First/Last':'首帧/尾帧',

    'Unified aspect presets and safe guides.':'统一画幅预设与安全辅助线。',
    'Crop uses the same ratios as Storyboard and Video Studio. The source version is never deleted.':'裁剪与分镜、视频工作室使用同一套画幅比例；源版本永远不会被删除。',
    'Generative outpaint with context.':'结合上下文进行生成式扩图。',
    'Confirmed references and Continuity State are carried into this edit.':'已确认的参考素材与连续性状态会一起带入本次编辑。',
    'Mask-first local editing.':'以蒙版为核心的局部编辑。',
    'Brush, erase, lasso, quick subject/background masks, invert, grow/shrink, feather and undo/redo.':'支持画笔、擦除、套索、主体/背景草稿蒙版、反选、扩张/收缩、羽化和撤销/重做。',
    'Relighting with controllable intent.':'可控意图的重新打光。',
    'Change viewpoint, preserve identity.':'改变观察视角，同时保持主体身份一致。',
    'Depth and subject emphasis.':'调整景深与主体强调。',
    'Weighted references with preservation locks.':'带保留锁定的加权参考素材。',
    'Enhance resolution and recover detail.':'提升分辨率并恢复细节。',
    'Split, overlay, flicker, 2-Up and difference comparison.':'支持分屏、叠加、闪切、双栏与差异对比。',
    'Review state and working state stay independent from the version applied to the Canvas node.':'审核状态与工作状态相互独立，也不会影响已应用到画布节点的版本。',
    'White = editable region. Draft masks are editable starting points; Brush/Lasso can refine them before generation.':'白色表示可编辑区域。草稿蒙版只是起点，可在生成前继续用画笔或套索精修。',
    'No markers yet. Press M while reviewing.':'暂无标记。审片时按 M 可快速添加。',
    'Non-destructive range trim.':'非破坏式区间裁剪。',
    'Local media is trimmed by FFmpeg; remote media is sent as an edit task.':'本地媒体由 FFmpeg 直接裁剪；远程媒体会作为编辑任务提交。',
    '. Local media is trimmed by FFmpeg; remote media is sent as an edit task.':'. 本地媒体由 FFmpeg 直接裁剪；远程媒体会作为编辑任务提交。',
    'Create an Image Node from the exact playhead.':'从当前精确播放头位置创建图片节点。',
    'For local media, the exact frame is extracted with FFmpeg and sent to Canvas as an Image Node.':'本地媒体会用 FFmpeg 精确抽帧，并作为图片节点发送到画布。',
    'Continue before or after the working version.':'在当前工作版本之前或之后续写。',
    'Regenerate only the selected time range.':'只重新生成选中的时间区间。',
    'Continuity context, connected references, source version and selected range are sent with the generation task.':'连续性上下文、已连接参考、源版本和所选区间都会随生成任务提交。',
    'Adapt one video to another delivery ratio.':'把同一视频适配到不同发布画幅。',
    'Local processing uses a real FFmpeg crop around the chosen focus. “Auto” is a continuity-aware focal heuristic in this phase; provider-backed semantic tracking can override it.':'本地处理会使用 FFmpeg 围绕所选焦点进行真实裁切。本阶段“自动”采用连续性感知的焦点启发式；当供应商支持语义跟踪时可由其覆盖。',
    'Create a retimed video version.':'创建调整播放速度后的视频版本。',
    'Hold one frame without destroying the source.':'在不破坏源视频的前提下定格一帧。',
    'The working video is split at the timecode, the selected frame is cloned for the hold duration, then the remaining video is rejoined.':'工作视频会在指定时间码处分段，将当前帧保持指定时长，再接回剩余视频。',
    'Separate picture and original audio.':'将画面与原始音频分离。',
    'For uploaded/local media this is a real FFmpeg demux. The extracted audio is sent to Canvas as a connected Audio Node.':'对已上传/本地媒体会执行真实 FFmpeg 分离；提取出的音频会作为已连接的音频节点发送到画布。',
    'Persistent issue notes attached to this Video Node.':'绑定在当前视频节点上的持久问题记录。',
    'Synchronized playback and playhead.':'同步播放与播放头位置。',
    'Shortcut: M creates a quick marker at the current playhead. The ↻ action creates a ±0.6s remake range around a marker.':'快捷键：按 M 可在当前播放头快速添加标记；点击 ↻ 可围绕标记创建 ±0.6 秒重拍区间。',
    'M creates a quick marker at the current playhead. The ↻ action creates a ±0.6s remake range around a marker.':'按 M 可在当前播放头快速添加标记；点击 ↻ 可围绕标记创建 ±0.6 秒重拍区间。',
    'Add':'添加','Upload':'上传','Search':'搜索','Settings':'设置','Help':'帮助','History':'历史记录','Assets':'资产','Asset':'资产',
    'Project':'项目','Projects':'项目','Share':'分享','Save':'保存','Cancel':'取消','Close':'关闭','Delete':'删除','Duplicate':'创建副本','Copy':'复制','Paste':'粘贴',
    'Run':'运行','Retry':'重试','Stop':'停止','Start':'开始','Create':'创建','Generate':'生成','Edit':'编辑','Open':'打开','Done':'完成','Confirm':'确认',
    'Text':'文本','Image':'图片','Video':'视频','Audio':'音频','Script':'脚本','Group':'分组','Workflow':'工作流','Workflows':'工作流','Status':'状态',
    'Name':'名称','Type':'类型','Role':'角色','Action':'操作','Actions':'操作','Description':'描述','Duration':'时长','Resolution':'分辨率','Quality':'质量',
    'Width':'宽度','Height':'高度','Position':'位置','Size':'尺寸','Color':'颜色','Opacity':'不透明度','Strength':'强度','Intensity':'强度','Softness':'柔和度',
    'Enabled':'已启用','Disabled':'已禁用','Default':'默认','Custom':'自定义','None':'无','All':'全部','Selected':'已选择','Current':'当前',
    'Success':'成功','Succeeded':'成功','Failed':'失败','Pending':'等待中','Running':'运行中','Queued':'队列中','Canceled':'已取消','Cancelled':'已取消',
    'Preview':'预览','Player':'播放器','Timeline':'时间线','Track':'轨道','Tracks':'轨道','Frame':'帧','Frames':'帧','Scene':'场景','Sequence':'序列',
    'Provider':'供应商','Providers':'供应商','Model':'模型','Models':'模型','Capability':'能力','Capabilities':'能力','Cost':'成本','Estimate':'预估',
    'Loading...':'加载中…','Processing...':'处理中…','No results':'无结果','Empty':'空','Unknown':'未知','Ready':'就绪',
    'Balanced':'均衡','balanced':'均衡','Identity':'身份','identity':'身份','Product':'产品','product':'产品','Scene':'场景','scene':'场景','Foreground':'前景','foreground':'前景','background':'背景',
    'free':'自由','thirds':'三分法','center':'中心','none':'无','left':'左侧','right':'右侧','top':'顶部','bottom':'底部',
    'Light Direction':'光照方向','Color Temperature':'色温','Rim Light':'轮廓光','Shadow Softness':'阴影柔和度',
    'UltraSharp':'超清锐化','Natural':'自然','Animation':'动画','Text & UI':'文字与界面','Detail Boost':'细节增强','Texture Recovery':'纹理恢复','Face Fidelity':'面部保真',
    'Yaw':'水平旋转','Pitch':'俯仰','Roll':'滚转','Lens':'镜头','Overlay':'叠加','Flicker':'闪切',
    'Synchronized view':'同步视图','Pan':'平移',

    'Canonical Identity → Base State → Plot Event → Derived Shot State':'身份基准 → 基础状态 → 剧情事件 → 推导镜头状态',
    'v3.2 Narrative State Layer · 身份固定，但状态可以按剧情合理演进':'v3.2 剧情状态层 · 身份固定，但状态可以按剧情合理演进',
    'Shot / Sequence':'镜头 / 序列',
    'Tab 确认 · Shift+Tab 全部':'制表键确认 · 上档键+制表键全部确认',
    'Space 播放 · ←/→ 逐帧 · S 分割 · M 标记 · Delete 删除 · Shift 精确到 0.01s':'空格键播放 · ←/→ 逐帧 · S 分割 · M 标记 · 删除键删除 · 上档键精确到 0.01 秒',
    'SUB':'字幕',
    'IMG':'图片',
    'VID':'视频',
    'AUD':'音频',
    'TXT':'文本',
    'REF':'参考',
    'BGM':'背景音乐',
    'T Pose':'T 姿势',
    'Animation Clip':'动画片段',
    'Public URL':'公网地址',
    'Public Base URL':'公网基础地址',
    'Base URL':'基础地址',
    'Base64 Data URL':'Base64 数据地址',
    'API Provider':'接口供应商',
    'API Providers':'接口供应商',
    'API supplier':'接口供应商',
    'API suppliers':'接口供应商',
    'Raw JSON':'原始 JSON',
    'Schema JSON':'结构 JSON',
    'Headers (JSON)':'请求头（JSON）',
    'HTTP':'网络请求',
    'USD':'美元',

    'Copy':'复制',
    'Paste':'粘贴',
    'Delete':'删除',
    'Search':'搜索',
    'Save':'保存',
    'Cancel':'取消',
    'Close':'关闭',
    'History':'历史',
    'Asset':'资产',
    'Workflow':'工作流',
    'Performance':'性能',
    'Source':'来源',
    'Target':'目标'
  }));

  const ATTRS=['title','placeholder','aria-label'];
  const SKIP_SELECTOR='script,style,code,pre,textarea,input,[contenteditable="true"],.model-name,.model-meta,.model-provider,.discovered-model-main,.discovered-owner,.node-body,.node-content,.generated-text,.raw-data';

  function normalize(s){ return String(s??'').replace(/\u00a0/g,' ').trim(); }

  function dynamicTranslate(s){
    const original=s;
    const lead=(s.match(/^\s*/)||[''])[0], tail=(s.match(/\s*$/)||[''])[0];
    let core=normalize(s);
    if(!core) return s;
    if(EXACT.has(core)) core=EXACT.get(core);

    // Structured dynamic labels used by the canvas/editor chrome.
    core=core
      .replace(/\bWorking v(\d+)\b/g,'工作版本 v$1')
      .replace(/\bCanvas v(\d+)\b/g,'画布版本 v$1')
      .replace(/\bVersion (\d+)\b/g,'版本 $1')
      .replace(/\bShot (\d+)\b/g,'镜头 $1')
      .replace(/\bEP (\d+)\b/g,'第 $1 集')
      .replace(/\bFrame (\d+(?:\.\d+)?)\b/g,'帧 $1')
      .replace(/^(\d+) versions$/,'$1 个版本')
      .replace(/^branch depth (\d+)$/,'分支层级 $1')
      .replace(/^(\d+) children?$/,'$1 个子版本')
      .replace(/^root$/,'根版本')
      .replace(/^leaf$/,'末端版本')
      .replace(/^Auto Reframe\s+(.+)$/,'智能重构图 $1')
      .replace(/^Speed\s+([\d.]+)x$/,'变速 $1×')
      .replace(/^Freeze\s+([\d.]+)s$/,'定格 $1 秒')
      .replace(/^Freeze Frame\s+([\d.]+)s$/,'画面定格 $1 秒')
      .replace(/^Extend Before$/,'向前延长')
      .replace(/^Extend After$/,'向后延长')
      .replace(/^Left ·\s*(.+)$/,'左侧 · $1')
      .replace(/^Right ·\s*(.+)$/,'右侧 · $1')
      .replace(/^A\/B · Left$/,'A/B · 左侧')
      .replace(/^A\/B · Right$/,'A/B · 右侧')
      .replace(/^([\d.]+)s → ([\d.]+)s · ([\d.]+)s selected$/,'$1 秒 → $2 秒 · 已选择 $3 秒')
      .replace(/^Selected duration:\s*([\d.]+)s$/,'已选时长：$1 秒')
      .replace(/^Current Working Version$/,'当前工作版本')
      .replace(/^Video Node$/,'视频节点')
      .replace(/^Image Node$/,'图片节点')
      .replace(/^Extracted Audio$/,'提取音频')
      .replace(/^Muted Video$/,'无声视频')
      .replace(/^Review issue$/i,'审片问题')
      .replace(/^Add Marker at ([\d.]+)s$/,'在 $1 秒添加标记')
      .replace(/^Last separated (.+)$/,'上次分离：$1')
      .replace(/^(\d+) linked items · Continuity Ready$/,'已连接 $1 项 · 连续性就绪')
      .replace(/^([\d.]+) \/ ([\d.]+)s$/,'$1 / $2 秒')
      .replace(/^(\d+) enabled$/,'已启用 $1 项')
      .replace(/(\d+(?:\.\d+)?)ms\b/g,'$1 毫秒')
      .replace(/(\d+(?:\.\d+)?)s\b/g,'$1 秒')
      .replace(/(\d+(?:\.\d+)?)px\b/g,'$1 像素')
      .replace(/(\d+(?:\.\d+)?)mm\b/g,'$1 毫米')
      .replace(/^Synchronized view · (.+) · Pan (.+)$/,'同步视图 · $1 · 平移 $2');

    // Phrases sometimes rendered together with Chinese text.
    const inline=[
      ['Canvas Studio','画布工作室'],['Video Studio','视频工作室'],['Image Studio','图像工作室'],['Storyboard Studio','分镜工作室'],['Script Studio','脚本工作室'],
      ['Creative Context','创作上下文'],['AutoLink','智能关联'],['Context Packet','上下文包'],['Prompt Composer','提示词合成器'],
      ['Version Compare','版本对比'],['Segment Remake','局部重拍'],['Extract Frame','抽取画面帧'],['Auto Reframe','智能重构图'],['Freeze Frame','画面定格'],['Audio Split','音视频分离'],['Review Markers','审片标记'],
      ['My Toolbox','我的工具箱'],['Command Palette','命令面板'],['Edge Inspector','连线检查器'],
      ['Base URL','基础地址'],['API Key','接口密钥'],['API 供应商','接口供应商'],['API供应商','接口供应商'],
      ['Shot 上下文','镜头上下文'],['Shot','镜头'],['Frame Prompt','帧提示词'],['Frame 节点','帧节点'],['Prompt 语义','提示词语义'],['Prompt 中','提示词中'],['Prompt 修改','提示词修改'],
      ['AI 语义匹配','智能语义匹配'],['AI 拆解','智能拆解'],['AI 专业合成','智能专业合成'],['开始 AI 分析','开始智能分析'],
      ['Space + 拖动画布','空格键 + 拖动画布'],
      [' safe frame',' 安全框'],['Safe Frame','安全框'],['Model Capability','模型能力'],
      ['First/Last','首帧/尾帧'],['Extend ','扩展 '],['Remake ','重拍 '],
      ['Source ','来源 '],['Output ','输出 '],['Last separated ','上次分离：'],
      ['Review issue','审片问题'],['Markers','标记'],['Marker','标记'],
      ['M creates a quick marker at the current playhead.','按 M 可在当前播放头快速添加标记。'],
      ['The ↻ action creates a ±0.6 秒 remake range around a marker.','点击 ↻ 可围绕标记创建 ±0.6 秒重拍区间。'],
      ['creates a quick marker at the current playhead','可在当前播放头快速添加标记'],['remake range around a marker','围绕标记的重拍区间'],
      ['发送到 Canvas','发送到画布'],['应用到 Canvas','应用到画布'],['回写 Canvas','回写画布'],
      ['Canvas Video Node','画布视频节点'],['Canvas Image Node','画布图片节点'],['Video Node','视频节点'],['Image Node','图片节点'],['Audio Node','音频节点'],
      ['第三方 API','第三方接口'],['REST API','REST 接口'],['ComfyUI API','ComfyUI 接口'],['Prompt','提示词'],
      ['Working Video','工作视频'],['Video Version Branch','视频版本分支'],['Video Version','视频版本'],['Image Version','图片版本'],
      ['Reference Image','参考图片'],['Reference Video','参考视频'],['Reference Audio','参考音频'],['First Frame','首帧'],['Last Frame','尾帧'],
      ['Source Video','源视频'],['Source Image','源图片'],['Source Audio','源音频'],['Output Video','输出视频'],['Output Image','输出图片'],
      ['Quick Create','快速创建'],['Create Workflow','创建工作流'],['Run Group','运行分组'],['Retry Failed','重试失败项'],['Auto Layout','自动整理'],
      ['Duplicate Branch','复制分支'],['Duplicate with Inputs','保留输入创建副本'],['Cross-Canvas','跨画布'],['Clipboard','剪贴板'],
      ['Safe Area','安全区域'],['Aspect Ratio','画幅比例'],['Playback','播放'],['Playhead','播放头'],['Timecode','时间码'],
      ['Reference','参考'],['Version','版本'],['version','版本'],['Original','原始版本'],['Auto','自动'],['Working','工作版本'],['Selected','已选择'],['Current','当前'],['Output','输出'],['Source','来源'],['Target','目标'],
      ['Upload','上传'],['Search','搜索'],['Settings','设置'],['History','历史记录'],['Assets','资产'],['Asset','资产'],['Workflow','工作流'],['Project','项目'],
      ['Image','图片'],['Video','视频'],['Audio','音频'],['Text','文本'],['Script','脚本'],['Frame','帧'],['Scene','场景'],['Sequence','序列'],
      ['Preview','预览'],['Timeline','时间线'],['Compare','对比'],['Generate','生成'],['Create','创建'],['Apply','应用'],['Send','发送'],['Branch','分支'],['Back','返回'],
      ['Delete','删除'],['Copy','复制'],['Paste','粘贴'],['Duplicate','副本'],['Run','运行'],['Retry','重试'],['More','更多'],['View','查看'],['Tools','工具'],['Info','信息']
    ];
    for(const [a,b] of inline){
      if(!core.includes(a)) continue;
      if(/^[A-Za-z]+$/.test(a)) core=core.replace(new RegExp('\\b'+a+'\\b','g'),b);
      else core=core.split(a).join(b);
    }

    return core===normalize(original) ? original : lead+core+tail;
  }

  function translateTextNode(node){
    if(!node || node.nodeType!==Node.TEXT_NODE) return;
    const parent=node.parentElement;
    if(!parent || parent.closest(SKIP_SELECTOR)) return;
    const next=dynamicTranslate(node.nodeValue);
    if(next!==node.nodeValue) node.nodeValue=next;
  }

  function translateElement(el){
    if(!el || el.nodeType!==Node.ELEMENT_NODE) return;
    // Attributes such as title/placeholder are UI chrome even on form controls.
    for(const attr of ATTRS){
      if(el.hasAttribute(attr)){
        const old=el.getAttribute(attr), next=dynamicTranslate(old);
        if(next!==old) el.setAttribute(attr,next);
      }
    }
    // Never touch values/user-authored text inside editable controls.
    if(el.matches(SKIP_SELECTOR) || el.closest('textarea,input,[contenteditable="true"]')) return;
    for(const n of Array.from(el.childNodes)) if(n.nodeType===Node.TEXT_NODE) translateTextNode(n);
  }

  function walk(root=document.body){
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){ translateTextNode(root); return; }
    if(root.nodeType===Node.ELEMENT_NODE) translateElement(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let n;
    while((n=walker.nextNode())){
      if(n.nodeType===Node.TEXT_NODE) translateTextNode(n); else translateElement(n);
    }
    document.title=dynamicTranslate(document.title);
  }

  let scheduled=false;
  function schedule(root){
    if(scheduled) return;
    scheduled=true;
    requestAnimationFrame(()=>{ scheduled=false; walk(document.body); });
  }

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations){
      if(m.type==='characterData'){ translateTextNode(m.target); continue; }
      for(const n of m.addedNodes){
        if(n.nodeType===Node.TEXT_NODE) translateTextNode(n);
        else if(n.nodeType===Node.ELEMENT_NODE) schedule(n);
      }
      if(m.type==='attributes' && m.target?.nodeType===Node.ELEMENT_NODE) translateElement(m.target);
    }
  });

  const start=()=>{
    walk(document.body);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
    window.CanvasStudioZh={translate:dynamicTranslate,refresh:()=>walk(document.body)};
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
