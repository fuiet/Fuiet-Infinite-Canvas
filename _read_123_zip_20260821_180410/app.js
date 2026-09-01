(() => {
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => [...el.querySelectorAll(s)];
  const viewport = $('#canvasViewport');
  const world = $('#canvasWorld');
  const nodeLayer = $('#nodeLayer');
  const edgeLayer = $('#edgeLayer');
  const drawer = $('#drawer');
  const toolbar = $('#nodeToolbar');
  const generator = $('#generatorPanel');
  const contextMenu = $('#contextMenu');
  const projectMenu = $('#projectMenu');
  const providerModal = $('#providerModal');
  const modelPicker = $('#modelPicker');
  const featureModal = $('#featureModal');
  const timelinePanel = $('#timelinePanel');
  const groupLayer = $('#groupLayer');
  const selectionRect = $('#selectionRect');
  const minimap = $('#minimap');
  const minimapNodes = $('#minimapNodes');
  const minimapView = $('#minimapView');
  const toast = $('#toast');
  const loginModal = $('#loginModal');
  const agentBtn = $('#agentBtn');
  const agentPanel = $('#agentPanel');
  const emptyQuickBar = $('#emptyQuickBar');
  const bottomDock = $('#bottomDock');
  const PROVIDERS_STORAGE_KEY = 'canvas-studio-providers-v1';
  let quickAddMenuOpen = false;
  const storyboardBtn = $('#storyboardBtn');
  const workflowViewBtn = $('#workflowViewBtn');
  const storyboardViewBtn = $('#storyboardViewBtn');
  const storyboardView = $('#storyboardView');
  const workspaceNameEl = $('#workspaceName');
  const AGENT_STATE_KEY='canvas-studio-agent-state-v1';
  const AGENT_SKILLS=[
    {id:'story-script',title:'故事脚本生成',badge:'NEW',icon:'story',tone:'story',summary:'把剧情整理成可拍脚本，并拆出人物、场景、道具和分镜。',action:'创建脚本节点',type:'script',prompt:'根据当前素材生成一版短剧故事脚本，并拆出人物、场景、道具和分镜。'},
    {id:'character-three-view',title:'角色三视图',badge:'Image',icon:'image',tone:'image',summary:'用角色图生成正面、侧面、背面三视图，保持身份一致。',action:'创建图像节点',type:'image',prompt:'基于角色参考图生成正面、侧面、背面三视图，保持服装、发型、身份一致。'},
    {id:'reference-video',title:'全能参考生视频',badge:'Video',icon:'video',tone:'video',summary:'由首帧 / 参考图驱动视频生成，适合剧情镜头和动作段落。',action:'创建视频节点',type:'video',prompt:'使用参考图与首帧生成完整视频，保持人物、动作和镜头连续。'},
    {id:'audio-video',title:'音频生视频',badge:'Audio',icon:'audio',tone:'audio',summary:'用音频节奏和图片主体驱动视频生成，适合口播和节奏短片。',action:'创建视频节点',type:'video',prompt:'根据音频节奏和参考图片生成视频，保持视觉主体和声音节奏统一。'},
    {id:'smart-edit',title:'智能剪辑',badge:'Beta',icon:'edit',tone:'edit',summary:'把多个视频按顺序拼接、重排或做智能混剪。',action:'创建剪辑节点',type:'video',prompt:'把多个视频按顺序剪辑为完整成片，保持节奏紧凑并保留重点镜头。'}
  ];
  const UI_ICONS = {
    story:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h7v2H5v-2Zm0 4.5h11v2H5v-2Zm0 4.5h7v2H5v-2Zm9.2-8.2 3.3-1.9 2.5 1.4v4.5l-2.5 1.4-3.3-1.9v-3.5Zm1.5 1v1.4l1.8 1V7.8l-1.8 1ZM14.2 14.3l3.3 1.9 2.5-1.4v-4.5l-2.5-1.4-3.3 1.9v3.5Zm1.5-1v-1.4l1.8-1v3.4l-1.8-1Z"/></svg>`,
    image:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14A2.5 2.5 0 0 1 21.5 7v10A2.5 2.5 0 0 1 19 19.5H5A2.5 2.5 0 0 1 2.5 17V7A2.5 2.5 0 0 1 5 4.5Zm0 2A.5.5 0 0 0 4.5 7v10a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V7a.5.5 0 0 0-.5-.5H5Zm2 1.5 3.2 2.6 2.9-2.7 2.7 2.3 3.6-1.9V16H5V8Z"/><circle cx="16.5" cy="8.5" r="1.4"/></svg>`,
    video:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11A2 2 0 0 1 19.5 6.5v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11Zm2 0v11h11v-11h-11Zm3.5 2.4 5.5 3.1-5.5 3.1V8.9Z"/></svg>`,
    audio:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h2v8H5V8Zm4-2h2v12H9V6Zm4 3h2v6h-2V9Zm4-1h2v8h-2V8Zm4 2h2v4h-2v-4Z"/></svg>`,
    edit:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 17.5 16.8 5.2a1.8 1.8 0 0 1 2.6 0l-1.5 1.5 1.6 1.6 1.5-1.5a1.8 1.8 0 0 1 0 2.6L8.8 21.3H4.5v-3.8Z"/><path d="M14.3 7.7 16.8 10.2"/></svg>`,
    plus:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
    history:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5A8.5 8.5 0 1 1 6.7 18"/><path d="M4.5 4.5v4h4"/><path d="M12 7v5l3.5 2"/></svg>`,
    share:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6.5 19 10.5l-4 4"/><path d="M19 10.5H10a5 5 0 0 0-5 5v2"/></svg>`,
    settings:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8v3.1"/><path d="M12 18.1v3.1"/><path d="M5.2 5.2l2.2 2.2"/><path d="M16.6 16.6l2.2 2.2"/><path d="M2.8 12h3.1"/><path d="M18.1 12h3.1"/><path d="M5.2 18.8l2.2-2.2"/><path d="M16.6 7.4l2.2-2.2"/><circle cx="12" cy="12" r="3.6"/></svg>`,
    context:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.8 14.2a3.6 3.6 0 1 1 0-4.4"/><path d="M13.4 12h4.1"/><path d="M11.5 3.5h5A3 3 0 0 1 19.5 6.5v11a3 3 0 0 1-3 3h-5"/><path d="M8.5 20.5h-1a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3h1"/></svg>`,
    link:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 14.8 6.8 17a3.5 3.5 0 1 1-4.9-4.9l2.2-2.2"/><path d="M14.8 9.2 17 7a3.5 3.5 0 1 1 4.9 4.9l-2.2 2.2"/><path d="M8.5 15.5 15.5 8.5"/></svg>`,
    close:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`,
    select:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 4.8 17.9 11 12.4 12.3 10.2 19 5.2 4.8Z"/></svg>`,
    move:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 4.8 17.9 11 12.4 12.3 10.2 19 5.2 4.8Z"/></svg>`,
    hand:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 11V7.7a1.2 1.2 0 0 1 2.4 0V11"/><path d="M10.6 10.8V6.9a1.2 1.2 0 0 1 2.4 0v3.9"/><path d="M13 10.8V7.5a1.2 1.2 0 0 1 2.4 0v3.3"/><path d="M15.4 11V8.8a1.2 1.2 0 0 1 2.4 0v5c0 2.7-2.2 4.9-4.9 4.9h-2.5c-2.2 0-4.2-1.4-4.9-3.5L5 12.5"/></svg>`,
    layout:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16"/><path d="M16 4v16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>`,
    workflow:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8.1 7.1 10.9 15M15.9 7.1 13.1 15M8.3 6h7.4"/></svg>`,
    asset:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6 4.5 8.2 12 12.8l7.5-4.6L12 3.6Z"/><path d="M4.5 15.2 12 19.8l7.5-4.6"/><path d="M4.5 11.1 12 15.7l7.5-4.6"/></svg>`,
    shortcuts:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10"/><path d="M6 18h12"/></svg>`,
    help:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.2 9a3 3 0 1 1 4.6 2.5c-.7.5-1.3 1-1.3 2.5"/><path d="M12 17.5h.01"/><circle cx="12" cy="12" r="8.5"/></svg>`,
    trim:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16"/><path d="M17 4v16"/><path d="M4 7h6"/><path d="M14 17h6"/></svg>`,
    extract:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="2.5"/><path d="M9 9h6v6H9z"/><path d="M8 16l8-8"/></svg>`,
    extend:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/><path d="M11 6l-6 6 6 6"/></svg>`,
    remake:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7a7 7 0 1 1 0 10"/><path d="M6 7v4h4"/><path d="M18 17v-4h-4"/></svg>`,
    reframe:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5V4h3.5"/><path d="M16.5 4H20v3.5"/><path d="M20 16.5V20h-3.5"/><path d="M7.5 20H4v-3.5"/><path d="M8 12h8"/></svg>`,
    speed:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15a7 7 0 1 1 14 0"/><path d="M12 12l4-2"/><path d="M12 12V7"/></svg>`,
    freeze:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4v16"/><path d="M16 4v16"/><path d="M4 8h16"/><path d="M4 16h16"/></svg>`,
    markers:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 14.4 9l4.9.7-3.5 3.4.8 4.8L12 15.8 7.4 17.9l.8-4.8L4.7 9.7 9.6 9z"/></svg>`,
    compare:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h6v14H4z"/><path d="M14 5h6v14h-6z"/><path d="M10 5v14"/></svg>`,
    play:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7Z"/></svg>`,
    prev:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6v12"/><path d="M19 6 9 12l10 6"/></svg>`,
    next:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6v12"/><path d="M5 6l10 6-10 6"/></svg>`,
    pause:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14"/><path d="M17 5v14"/></svg>`,
    shuffle:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4.5c1.7 0 2.6.7 3.7 2l1.1 1.2"/><path d="M4 17h4.5c1.7 0 2.6-.7 3.7-2l4.9-5.4"/><path d="M15 4h5v5"/><path d="M15 20h5v-5"/><path d="M18.5 8.5 20 7l1.5 1.5"/><path d="M18.5 15.5 20 17l1.5-1.5"/></svg>`,
    refresh:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7.5V4h-3.5"/><path d="M18.4 8.8A8 8 0 1 0 20.5 12"/><path d="M14 8.5h4.5v-4"/></svg>`,
    repeat:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h9a3 3 0 0 1 3 3v1"/><path d="M17 17H8a3 3 0 0 1-3-3v-1"/><path d="M5 10 8 7l3 3"/><path d="M19 14l-3 3-3-3"/></svg>`,
    trash:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"/><path d="M8 7.5V19h8V7.5"/><path d="M10 10.5v5"/><path d="M14 10.5v5"/></svg>`,
    chevronDown:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
    chevronUp:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>`,
    copy:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 16V6a2 2 0 0 1 2-2h8"/></svg>`,
    split:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14"/><path d="M17 5v14"/><path d="M4 12h6"/><path d="M14 12h6"/></svg>`,
    subtitle:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6" width="15" height="12" rx="2"/><path d="M7 10h3"/><path d="M7 14h10"/></svg>`,
    grade:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><path d="M12 4.5v15"/><path d="M4.5 12h15"/></svg>`,
    automation:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h4"/><path d="M15 12h4"/><path d="M9 8l2 4-2 4"/><path d="M15 8l-2 4 2 4"/></svg>`,
    snap:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v4"/><path d="M17 4v4"/><path d="M7 16v4"/><path d="M17 16v4"/><path d="M4 7h4"/><path d="M16 7h4"/><path d="M4 17h4"/><path d="M16 17h4"/><path d="M8 12h8"/></svg>`,
    zoomOut:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M7.5 11h7"/><path d="M15.8 15.8 20 20"/></svg>`,
    zoomIn:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M7.5 11h7"/><path d="M11 7.5v7"/><path d="M15.8 15.8 20 20"/></svg>`,
    close:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>`,
    mute:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10v4h3l5 4V6L8 10H5Z"/><path d="M16 9l4 6"/><path d="M20 9l-4 6"/></svg>`,
    more:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/></svg>`,
    camera:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 7.5h3L10 5.8h4L15.5 7.5h3A2.5 2.5 0 0 1 21 10v6.5A2.5 2.5 0 0 1 18.5 19H5.5A2.5 2.5 0 0 1 3 16.5V10A2.5 2.5 0 0 1 5.5 7.5Z"/><circle cx="12" cy="13" r="3.2"/></svg>`,
    target:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 4.5v3"/><path d="M19.5 12h-3"/><path d="M12 16.5v3"/><path d="M7.5 12h-3"/></svg>`,
    lock:`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="2"/><path d="M8 10.5V8a4 4 0 1 1 8 0v2.5"/></svg>`,
    fallback:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h10"/><path d="M12 7l5 5-5 5"/></svg>`,
    dotMenu:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>`
  };
  const uiIcon = name=>UI_ICONS[name] ? UI_ICONS[name].replace('<svg ','<svg class="ui-icon" ') : '';
  const EMPTY_WORKFLOW_STARTERS=[
    {
      id:'story-script',
      title:'故事脚本生成',
      badge:'NEW',
      tone:'story',
      svg:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h6.5v2H4v-2Zm0 5h9v2H4v-2Zm0 5h6.5v2H4v-2Zm10-8.8 3.5-2 2.5 1.4v4.7l-2.5 1.4-3.5-2v-3.5Zm1.5 1v1.5l2 1.1v-3.7l-2 1.1Zm-1.5 4.8 3.5 2 2.5-1.4v-4.7l-2.5-1.4-3.5 2v3.5Zm1.5-1v-1.5l2-1.1v3.7l-2-1.1Z"/></svg>`
    },
    {
      id:'character-three-view',
      title:'角色三视图',
      badge:'',
      tone:'image',
      svg:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v3.2l2.1-1.8 3 2.4 3.3-3.6 5.6 4.2V6H5Zm14 8.3-5.2-3.9-3.4 3.7-3.1-2.5L5 13.4V18h14v-3.7Z"/></svg>`
    },
    {
      id:'reference-video',
      title:'全能参考生视频',
      badge:'',
      tone:'video',
      svg:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2.5-.5a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11Zm3.5 3.4 5.2 2.9-5.2 2.9V9.4Z"/></svg>`
    },
    {
      id:'audio-video',
      title:'音频生视频',
      badge:'',
      tone:'audio',
      svg:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7.5h2v9H5v-9Zm4-2h2v13H9v-13Zm4 3h2v7h-2v-7Zm4-1h2v9h-2v-9Zm4 2h2v5h-2v-5Z"/></svg>`
    }
  ];
  function loadAgentState(){
    try{
      const raw=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(AGENT_STATE_KEY));
      if(raw&&typeof raw==='object'){
        return {
          open:Boolean(raw.open),
          selectedSkillId:AGENT_SKILLS.some(s=>s.id===raw.selectedSkillId)?raw.selectedSkillId:'story-script',
          draft:String(raw.draft||''),
          chatTitle:String(raw.chatTitle||'新对话'),
          messages:Array.isArray(raw.messages)&&raw.messages.length?raw.messages.map(m=>({
            id:String(m?.id||uid('agent')),
            role:m?.role==='user'?'user':'assistant',
            label:String(m?.label||(m?.role==='user'?'你':'Agent')),
            text:String(m?.text||''),
            meta:String(m?.meta||'')
          })).slice(-80):[]
        };
      }
    }catch{}
    return {
      open:false,
      selectedSkillId:'story-script',
      draft:'',
      chatTitle:'新对话',
      messages:[
        {id:'welcome',role:'assistant',label:'Agent',text:'我可以帮你把脚本、三视图、参考生视频、音频生视频和智能剪辑串起来。'},
        {id:'hint',role:'assistant',label:'Agent',text:'选择一个 Skill，或者直接输入 `@ 节点名` / 你的创作需求。'}
      ]
    };
  }
  let agentState=loadAgentState();

  const defaultState = () => ({
    projectId: '',
    projectName: '画布 1',
    projectUpdatedAt: '',
    viewport: { x: 210, y: 105, zoom: 0.92 },
    nodes: [],
    edges: [],
    assets: [],
    history: [],
    workflows:[{id:'w1',title:'参考生图 → 图转视频',desc:'3 个节点 · 2 条连线'}],
    groups:[], subjects:[], selectedIds:[],
    assetFolders:[], historyScroll:0,
    workflowSettings:{concurrency:2,maxRetries:1,failPolicy:'stop',cache:true,defaultPriority:50,costConfirmThreshold:0,autoFallback:true},
    workflowRuns:[],
    projectConsistency:{registry:{},lastScanAt:'',lastScanSummary:null},
    projectNarrative:{characterTracks:{},sceneTracks:{},events:[],lastAuditAt:'',lastAuditSummary:null},
    creativeContext:{autoSuggest:true,includeProjectAssets:true,includeNarrativeState:true,nearbyRadius:1200,lastNodeId:'',lastScanAt:''},
    shortcutOverrides:{}
  });

  const MEDIA_NODE_DISPLAY_WIDTH=350;
  const CONTEXT_TOOLBAR_SAFE_TOP=58;

  const WORKSPACE_NAME_KEY='canvas-studio-workspace-name-v1';
  let workspaceName='未命名工作区';
  try{workspaceName=globalThis.CanvasBrowserStorageManager.getItem(WORKSPACE_NAME_KEY)||workspaceName}catch{}
  let state = migrateState(loadState());
  let selectedId = state.nodes.find(n=>n.selected)?.id || null;
  let expandedNodeId = null; // LibTV-style: only a deliberate click expands details/tools
  let connectingFrom = null;
  let connectingPointerId = null;
  let connectingStartScreen = null;
  let connectingHoverTarget = null;
  let selectedEdgeId = null;
  let edgeReconnect = null;
  let clipboard = loadCanvasClipboard();
  let userToolbox = loadUserToolbox();
  let dragging = null;
  let groupDragging = null;
  let resizingNode = null;
  let panning = null;
  let marquee = null;
  let selectedGroupId = null;
  let viewportFrame = 0;
  let viewportSaveTimer = null;
  let virtualizationTimer=null;
  let lastVirtualizedViewport={x:0,y:0,zoom:1};
  let minimapMap = null;
  let alignmentGuideLayer = null;
  const undoStack = [];
  const redoStack = [];
  let transactionDepth=0;
  let transactionLabel='';
  let transactionCaptured=false;
  let providers = [];
  let backendOnline = false;
  let activeProviderId = null;
  let providerEditorDraft = null;
  let discoveredModels = [];
  let discoveredEndpoint = '';
  let projectSaveTimer = null;
  let authEnabled = false;
  let authenticated = true;
  let taskManagerTimer = null;
  let marqueePreviewFrame = 0;
  let workflowVisualFrame = 0;
  let minimapFrame = 0;
  let stressBenchmarking = false;

  function loadState(){
    try { return JSON.parse(globalThis.CanvasBrowserStorageManager.getItem('libtv-clone-state')) || defaultState(); }
    catch { return defaultState(); }
  }

  function sanitizeProviderForBrowser(provider){
    const safe=JSON.parse(JSON.stringify(provider||{}));
    delete safe.apiKey;
    delete safe.apiKeyEncrypted;
    return safe;
  }
  function loadLocalProviders(){
    try{
      const raw=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(PROVIDERS_STORAGE_KEY));
      const safe=Array.isArray(raw)?raw.map(sanitizeProviderForBrowser):[];
      globalThis.CanvasBrowserStorageManager.setItem(PROVIDERS_STORAGE_KEY,JSON.stringify(safe));
      return safe;
    }catch{return[]}
  }
  function saveLocalProviders(list){
    try{globalThis.CanvasBrowserStorageManager.setItem(PROVIDERS_STORAGE_KEY,JSON.stringify((Array.isArray(list)?list:[]).map(sanitizeProviderForBrowser)))}catch{}
  }
  async function restoreProvidersToServer(list){
    if(!Array.isArray(list)||!list.length)return [];
    for(const p of list){
      const payload=clone(p);
      if(!String(payload.apiKey||'').trim())delete payload.apiKey;
      delete payload.hasApiKey;
      await apiJson('/api/providers',{method:'POST',body:JSON.stringify(payload)});
    }
    const fresh=await apiJson('/api/providers');
    const remote=Array.isArray(fresh.providers)?fresh.providers:[];
    if(remote.length)saveLocalProviders(remote);
    return remote;
  }
  function migrateState(input){
    const next=input||defaultState();
    next.nodes=(next.nodes||[]).map(n=>({providerId:'',modelId:'',modelName:'',...n,providerId:n.providerId||'',modelId:n.modelId||'',modelName:n.modelName||''}));
    next.history=next.history||[]; next.assets=next.assets||[]; next.workflows=next.workflows||[]; next.edges=(next.edges||[]).map(normalizeSemanticEdge); next.groups=(next.groups||[]).map(g=>{const meta={...(g.meta||{})};if(g.kind==='storyboard'){meta.storyboard={version:1,mode:'cinematic',concept:'',frameOrder:[...(g.nodeIds||[])],updatedAt:'',...(meta.storyboard||{})};meta.storyboard.frameOrder=(meta.storyboard.frameOrder||[]).filter(id=>(g.nodeIds||[]).includes(id));for(const id of (g.nodeIds||[]))if(!meta.storyboard.frameOrder.includes(id))meta.storyboard.frameOrder.push(id)}return({...g,meta,collapsed:Boolean(g.collapsed),collapsedPos:g.collapsedPos||null,locked:Boolean(g.locked),frozen:Boolean(g.frozen)})}); next.subjects=next.subjects||[]; next.selectedIds=next.selectedIds||[];
    next.projectId=next.projectId||'';next.projectUpdatedAt=next.projectUpdatedAt||'';next.assetFolders=next.assetFolders||[];next.historyScroll=next.historyScroll||0;next.projectConsistency={registry:{},lastScanAt:'',lastScanSummary:null,...(next.projectConsistency||{}),registry:{...((next.projectConsistency||{}).registry||{})}};const pn=next.projectNarrative||{};next.projectNarrative={characterTracks:{...(pn.characterTracks||{})},sceneTracks:{...(pn.sceneTracks||{})},events:Array.isArray(pn.events)?pn.events:[],lastAuditAt:pn.lastAuditAt||'',lastAuditSummary:pn.lastAuditSummary||null};next.creativeContext={autoSuggest:true,includeProjectAssets:true,includeNarrativeState:true,nearbyRadius:1200,lastNodeId:'',lastScanAt:'',...(next.creativeContext||{})};next.shortcutOverrides={...(next.shortcutOverrides||{})};next.workflowSettings={concurrency:2,maxRetries:1,failPolicy:'stop',cache:true,defaultPriority:50,costConfirmThreshold:0,autoFallback:true,...(next.workflowSettings||{})};next.workflowRuns=(next.workflowRuns||[]).map(r=>{const run={checkpointAt:r?.checkpointAt||r?.startedAt||'',...r,statuses:{...(r?.statuses||{})}};if(run.status==='running'){run.status='interrupted';run.interruptedAt=new Date().toISOString();Object.keys(run.statuses).forEach(id=>{if(['running','pending'].includes(run.statuses[id]))run.statuses[id]='pending'})}return run});next.canvasSettings={snap:true,grid:12,autoLayoutDirection:'LR',autoLayoutMode:'branches',viewMode:'workflow',storyboardGroupId:'',interactionMode:'move',...((next.canvasSettings)||{})};
    next.nodes=next.nodes.map(n=>{const x={rotation:0,mirrorX:false,mirrorY:false,cropRatio:'',toolParams:{},scriptData:null,directorData:null,resultVersions:[],activeResultVersionId:'',h:null,locked:false,frozen:false,queuePriority:null,fallbackModels:[],lastUsedProviderId:'',lastUsedModelId:'',lastUsedModelName:'',...n,toolParams:n.toolParams||{},resultVersions:Array.isArray(n.resultVersions)?n.resultVersions:[],fallbackModels:Array.isArray(n.fallbackModels)?n.fallbackModels:[]};if(x.type==='text'){x.textInputMode=x.textInputMode==='manual'?'manual':(x.textInputMode||'ai');x.textEditing=false;if(x.textInputMode==='manual'){if(!x.w||Number(x.w)===700)x.w=560;if(!x.h||Number(x.h)===400)x.h=320}else{x.textEditorExpanded=false;delete x.textEditorExpandedBackup}}if(x.type==='script'&&(!x.w||x.w===470||x.w===500))x.w=310;if(['image','video'].includes(x.type)){const mediaW=Number(x.w||0),scaleVersion=Number(x.mediaDisplayScaleVersion||0);if(scaleVersion<2||!mediaW||(x.type==='video'&&mediaW<=520))x.w=MEDIA_NODE_DISPLAY_WIDTH;x.mediaDisplayScaleVersion=2}if(!x.resultVersions.length&&x.taskStatus==='succeeded'&&(x.outputUrl||x.generatedText||x.generatedResult)){x.resultVersions=[{id:`legacy_${x.id}`,outputUrl:x.outputUrl||'',text:x.type==='text'?(x.text||x.generatedText||''):(x.generatedText||''),generatedResult:x.generatedResult??null,prompt:x.prompt||'',modelName:x.modelName||'',createdAt:x.updatedAt||new Date(0).toISOString()}];x.activeResultVersionId=x.resultVersions[0].id}return x;});
    return next;
  }
  function errorText(value,depth=0){
    if(value==null||depth>8)return'';
    if(typeof value==='string'){const text=value.trim();return text==='[object Object]'?'':text}
    if(value instanceof Error){return errorText(value.message,depth+1)||errorText(value.cause,depth+1)||String(value.name||'Error')}
    if(Array.isArray(value))return value.map(item=>errorText(item,depth+1)).filter(Boolean).join('；');
    if(typeof value==='object'){
      for(const key of ['message','error','detail','reason','msg','title','body','response','data']){const text=errorText(value[key],depth+1);if(text)return text}
      try{return JSON.stringify(value)}catch{return''}
    }
    return String(value);
  }
  function taskFailureText(task){
    if(!task)return'';
    const base=errorText(task.error)||errorText(task.errorDetail)||errorText(task.detail);
    const request=task.videoRequestDiagnostics||{},protocol=task.videoProtocolDiagnostics||{};
    let stage='';
    const pollStageUrl=protocol.lastPollErrorUrl||protocol.lastPollRequestUrl||protocol.pollUrl;
    if(pollStageUrl){try{stage=`轮询 ${new URL(pollStageUrl,location.href).pathname}`}catch{stage='轮询视频任务'}}
    else if(request.createPath)stage=`创建 ${request.createPath}${request.transport?` · ${request.transport}`:''}`;
    return base&&stage?`${base} [${stage}]`:(base||stage);
  }
  async function apiJson(url,options={}){
    const res=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},credentials:'same-origin',...options});
    let body={}; try{body=await res.json()}catch{}
    if(res.status===401){authenticated=false;openLoginModal();throw new Error(errorText(body.error)||'需要访问密码');}
    if(!res.ok) throw new Error(errorText(body.error)||`请求失败 ${res.status}`);
    return body;
  }
  async function checkAuth(){
    try{const data=await apiJson('/api/auth/status');authEnabled=Boolean(data.enabled);authenticated=Boolean(data.authenticated);if(authEnabled&&!authenticated)openLoginModal();return authenticated}catch{return false}
  }
  function openLoginModal(){
    if(!loginModal)return;loginModal.innerHTML=`<div class="login-dialog"><div class="login-logo">${uiIcon('workflow')}</div><h2>Canvas Studio</h2><p>此部署启用了管理员访问密码。它不是会员系统，只用于保护供应商密钥、项目和生成任务。</p><input id="loginPassword" type="password" placeholder="访问密码" autocomplete="current-password"><button id="loginSubmit">进入工作台</button><div id="loginError"></div></div>`;loginModal.classList.remove('hidden');
    $('#loginSubmit',loginModal).onclick=async()=>{const btn=$('#loginSubmit',loginModal),pwd=$('#loginPassword',loginModal).value;btn.disabled=true;try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({password:pwd})});const b=await r.json();if(!r.ok)throw new Error(errorText(b.error)||'登录失败');authenticated=true;loginModal.classList.add('hidden');await loadProviders();await ensureServerProject();render();}catch(e){$('#loginError',loginModal).textContent=errorText(e)}finally{btn.disabled=false}};
    $('#loginPassword',loginModal)?.addEventListener('keydown',e=>{if(e.key==='Enter')$('#loginSubmit',loginModal).click()});
  }
  async function loadProviders(){
    const local=loadLocalProviders();
    try{
      const data=await apiJson('/api/providers');
      const remote=Array.isArray(data.providers)?data.providers:[];
      if(remote.length){
        providers=remote.map(sanitizeProviderForBrowser).filter(Boolean);
        saveLocalProviders(providers);
      }
      else if(local.length){
        providers=local;
        try{
          const restored=await restoreProvidersToServer(local);
          if(restored.length){
            providers=restored.map(sanitizeProviderForBrowser).filter(Boolean);
            saveLocalProviders(providers);
          }
        }catch{}
      }
      else providers=[];
      backendOnline=true;
    }catch(e){
      providers=local;
      backendOnline=e.message.includes('访问密码');
    }
  }

  function providerById(id){
    return providers.find(x=>x.id===id)||null;
  }
  function snapshotProviderForTask(provider){
    return provider?sanitizeProviderForBrowser(provider):null;
  }
  function normalizeClientModality(value){
    const v=String(value||'').trim().toLowerCase();
    if(['text','文本','chat','llm','language','script'].includes(v))return 'text';
    if(['image','图片','图像','vision-image'].includes(v))return 'image';
    if(['video','视频','movie'].includes(v))return 'video';
    if(['audio','音频','speech','tts','music'].includes(v))return 'audio';
    return v;
  }
  function providerHasApiKey(p){
    return Boolean(String(p?.apiKey||p?.apiKeyEncrypted||'').trim()) || p?.hasApiKey===true;
  }
  function modelForNode(n){const p=providerById(n.providerId);return p?.models?.find(m=>m.id===n.modelId&&normalizeClientModality(m.modality)===n.type)||null}
  function modelRuntimeReady(p,m){
    if(!m||m.enabled===false||!String(m.id||'').trim())return false;
    const modality=normalizeClientModality(m.modality);
    try{
      const Contract=globalThis.CanvasProviderAdapters;
      if(Contract?.resolveRoute){
        const route=Contract.resolveRoute(p||{},m,modality,'generate');
        if(route?.adapterKey&&route.adapterKey!=='auto'&&String(route.createPath||'').trim())return true;
      }
    }catch{}
    // adapterResolved is cached diagnostic metadata. A historical ready=false must
    // not hide a model that the current Provider Core can execute successfully.
    if(m.adapterResolved?.ready===true)return true;
    if(p?.protocol==='comfyui')return true;
    if(p?.protocol==='openai-compatible'&&['text','image','audio'].includes(modality))return true;
    if(modality==='video'&&p?.protocol!=='comfyui'&&(p?.videoProtocol==='standard-video-async-v1'||providerHasApiKey(p)))return true;
    return Boolean(String(m.createPath||'').trim()) || modality==='text';
  }
  function allModelsForType(type){
    const wanted=normalizeClientModality(type);
    return providers.flatMap(p=>(p.models||[]).filter(m=>m.enabled!==false&&normalizeClientModality(m.modality)===wanted).map(m=>({...m,modality:wanted,providerId:p.id,providerName:p.name||'API',runtimeReady:modelRuntimeReady(p,m)})));
  }
  function availableModels(type){ return allModelsForType(type).filter(m=>m.runtimeReady!==false); }
  function imageCapabilitiesFor(provider,model){
    try{return globalThis.CanvasModelImageCapabilities?.resolve?.(provider||{},model||{})||null}catch{return null}
  }
  function syncImageNodeCapabilities(n,cap,{reset=false}={}){
    if(!n||n.type!=='image'||!cap)return;
    const ratios=cap.aspectRatios?.length?cap.aspectRatios:['1:1'],resolutions=cap.resolutions?.length?cap.resolutions:['1K'],qualities=cap.qualityLabels?.length?cap.qualityLabels:['模型默认'];
    if(reset||!ratios.includes(String(n.aspectRatio||'')))n.aspectRatio=ratios[0];
    if(reset||!resolutions.includes(String(n.resolution||'')))n.resolution=resolutions[0];
    if(reset||!qualities.includes(String(n.imageQuality||'')))n.imageQuality=qualities[0];
    const max=Math.max(1,Number(cap.maxImages||1));n.count=Math.max(1,Math.min(max,Number(n.count||1)));
    n.imageCapabilityFamily=cap.family||'';n.imageCapabilitySource=cap.source||'';n.imageCapabilityConfidence=Number(cap.confidence||0);
  }
  function setNodeModel(n,item){
    if(!n||!item)return;
    n.providerId=item.providerId;n.modelId=item.id;n.modelName=item.name||item.id;
    const c={...defaultCapabilities(n.type,item.id,item.name),...(item.capabilities||{})};
    if(n.type==='video'){n.duration=n.duration||c.durations?.[0]||5;n.resolution=n.resolution||c.resolutions?.[0]||'720p';n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'16:9';syncVideoNodeCapabilities(n,c)}
    if(n.type==='image'){const cap=imageCapabilitiesFor(providerById(item.providerId),item);if(cap)syncImageNodeCapabilities(n,cap,{reset:true});else n.aspectRatio=n.aspectRatio||c.aspectRatios?.[0]||'1:1'}
  }
  function ensureDefaultModel(n){
    if(!n||!['image','video','audio','text'].includes(n.type))return null;
    const current=modelForNode(n),p=providerById(n.providerId);if(current&&modelRuntimeReady(p,current))return {...current,providerId:n.providerId,providerName:p?.name||'',runtimeReady:true};
    const first=availableModels(n.type)[0];if(first){setNodeModel(n,first);return first}return null;
  }
  function deepClone(v){return JSON.parse(JSON.stringify(v))}
  const TOOLBOX_STORAGE_KEY='canvas-studio-user-toolbox-v1';
  function loadUserToolbox(){try{const x=JSON.parse(globalThis.CanvasBrowserStorageManager.getItem(TOOLBOX_STORAGE_KEY));return Array.isArray(x)?x:[]}catch{return[]}}
  function persistUserToolbox(){try{globalThis.CanvasBrowserStorageManager.setItem(TOOLBOX_STORAGE_KEY,JSON.stringify(userToolbox.slice(0,120)))}catch{}}
  function toolboxWorkflows(){const out=[],seen=new Set();for(const w of [...userToolbox,...(state.workflows||[])]){if(!w?.id||seen.has(w.id))continue;seen.add(w.id);out.push(w)}return out}
  function upsertToolboxWorkflow(wf){const item={...deepClone(wf),scope:'user',updatedAt:new Date().toISOString()};const i=userToolbox.findIndex(x=>x.id===item.id);if(i>=0)userToolbox[i]=item;else userToolbox.unshift(item);persistUserToolbox();return item}
  function deleteToolboxWorkflow(id){userToolbox=userToolbox.filter(w=>w.id!==id);persistUserToolbox();state.workflows=(state.workflows||[]).filter(w=>w.id!==id);saveState();renderDrawer('workflow')}
  function remapDeepIds(value,map){if(value==null)return value;if(typeof value==='string')return map.get(value)||value;if(Array.isArray(value))return value.map(v=>remapDeepIds(v,map));if(typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=remapDeepIds(v,map);return out}return value}
  function clipboardAssetDependencies(nodes=[],edges=[],groups=[]){const blob=JSON.stringify({nodes,edges,groups});return (state.assets||[]).filter(a=>a?.id&&blob.includes(String(a.id))).map(deepClone)}
  function loadCanvasClipboard(){try{return JSON.parse(globalThis.CanvasBrowserStorageManager.getItem('canvas-studio-clipboard-v3'))||JSON.parse(globalThis.CanvasBrowserStorageManager.getItem('canvas-studio-clipboard-v2'))||null}catch{return null}}
  function persistCanvasClipboard(value){clipboard=value;try{if(value){globalThis.CanvasBrowserStorageManager.setItem('canvas-studio-clipboard-v3',JSON.stringify(value));globalThis.CanvasBrowserStorageManager.removeItem('canvas-studio-clipboard-v2')}else{globalThis.CanvasBrowserStorageManager.removeItem('canvas-studio-clipboard-v3');globalThis.CanvasBrowserStorageManager.removeItem('canvas-studio-clipboard-v2')}}catch{}}
  function localPersist(){try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{}}
  async function saveProjectPayload(projectId,payload,forceSnapshot=false){
    if(!backendOnline||!authenticated||!projectId)return null;
    return apiJson('/api/projects/'+encodeURIComponent(projectId),{method:'PUT',body:JSON.stringify({name:payload.projectName||'未命名画布',data:payload,forceSnapshot})});
  }
  function scheduleProjectSave(){
    if(!backendOnline||!authenticated||!state.projectId)return;
    clearTimeout(projectSaveTimer);
    const projectId=state.projectId,payload=deepClone(state);
    projectSaveTimer=setTimeout(async()=>{projectSaveTimer=null;try{const r=await saveProjectPayload(projectId,payload,false);if(state.projectId===projectId&&r?.project){state.projectUpdatedAt=r.project.updatedAt;localPersist()}}catch{}},700);
  }
  function saveState(){localPersist();scheduleProjectSave()}
  async function flushProjectSave(forceSnapshot=false){
    if(projectSaveTimer){clearTimeout(projectSaveTimer);projectSaveTimer=null}
    if(!backendOnline||!authenticated||!state.projectId)return;
    const projectId=state.projectId,payload=deepClone(state);
    const r=await saveProjectPayload(projectId,payload,forceSnapshot);
    if(state.projectId===projectId&&r?.project){state.projectUpdatedAt=r.project.updatedAt;localPersist()}
  }
  function queueViewportSave(){clearTimeout(viewportSaveTimer);viewportSaveTimer=setTimeout(()=>{localPersist();scheduleProjectSave()},220)}
  async function ensureServerProject(){
    if(!backendOnline||!authenticated)return;
    if(state.projectId){
      try{const r=await apiJson('/api/projects/'+encodeURIComponent(state.projectId));if(r.project?.data){const serverData=migrateState(r.project.data);serverData.projectId=r.project.id;serverData.projectUpdatedAt=r.project.updatedAt;state=serverData;selectedId=state.nodes.find(n=>n.selected)?.id||null;try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{};return}}catch{}
    }
    const r=await apiJson('/api/projects',{method:'POST',body:JSON.stringify({name:state.projectName,data:state})});state.projectId=r.project.id;state.projectUpdatedAt=r.project.updatedAt;try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{}
  }
  async function saveProjectToServer(forceSnapshot=false){return flushProjectSave(forceSnapshot)}
  function snapshot(label='编辑'){
    const serialized=JSON.stringify(state);
    if(transactionDepth>0){
      if(transactionCaptured)return;
      transactionCaptured=true;
      label=transactionLabel||label;
    }
    if(undoStack.at(-1)?.data===serialized)return;
    undoStack.push({label,data:serialized,at:Date.now()});
    if(undoStack.length>100) undoStack.shift();
    redoStack.length=0;
  }
  function beginTransaction(label='编辑'){if(transactionDepth===0){transactionLabel=label;transactionCaptured=false;transactionDepth=1;snapshot(label);return}transactionDepth++}
  function endTransaction(){transactionDepth=Math.max(0,transactionDepth-1);if(transactionDepth===0){transactionLabel='';transactionCaptured=false}}
  function runTransaction(label,fn){beginTransaction(label);try{return fn()}finally{endTransaction()}}
  async function runTransactionAsync(label,fn){beginTransaction(label);try{return await fn()}finally{endTransaction()}}
  function restore(entry){const serialized=typeof entry==='string'?entry:entry?.data;if(!serialized)return;state=migrateState(JSON.parse(serialized));selectedId=(state.selectedIds||[])[0]||state.nodes.find(n=>n.selected)?.id||null;selectedGroupId=null;expandedNodeId=null;render();saveState()}
  function undo(){if(!undoStack.length)return;redoStack.push({label:'redo',data:JSON.stringify(state)});restore(undoStack.pop())}
  function redo(){if(!redoStack.length)return;undoStack.push({label:'undo',data:JSON.stringify(state)});restore(redoStack.pop())}
  function uid(prefix){ return prefix + Math.random().toString(36).slice(2,9); }

  const EDGE_ROLE_LABELS={
    reference:'参考素材',prompt_context:'文本提示',script_context:'脚本上下文',character_reference:'角色参考',scene_reference:'场景参考',style_reference:'风格参考',
    image_reference:'图像参考',first_frame:'首帧',last_frame:'尾帧',motion_reference:'运镜参考',video_reference:'视频参考',audio_reference:'音频参考',voice_reference:'音色参考'
  };
  function normalizeSemanticEdge(e={}){return {...e,role:e.role||e.semanticRole||'',semanticRole:e.role||e.semanticRole||'',targetSlot:e.targetSlot||''}}
  function edgeRoleLabel(role){return EDGE_ROLE_LABELS[role]||role||'参考'}
  function edgeRoleOptions(source,target){
    const all=[];const add=(r)=>{if(!all.includes(r))all.push(r)};
    if(source?.type==='text'){add('prompt_context');add('script_context')}
    if(source?.type==='script')add('script_context');
    if(source?.type==='image'){
      if(target?.type==='video'){add('first_frame');add('last_frame');add('character_reference');add('scene_reference');add('style_reference');add('image_reference')}
      else {add('character_reference');add('scene_reference');add('style_reference');add('image_reference')}
    }
    if(source?.type==='video'){add(target?.type==='video'?'motion_reference':'video_reference');add('video_reference')}
    if(source?.type==='audio'){add('audio_reference');add('voice_reference')}
    add('reference');return all;
  }
  function inferEdgeRole(source,target){
    const title=String(source?.title||'').toLowerCase();
    if(/首帧|first.?frame/.test(title))return 'first_frame';
    if(/尾帧|last.?frame/.test(title))return 'last_frame';
    if(/角色|人物|主体|character|person|subject/.test(title))return 'character_reference';
    if(/场景|环境|scene|background/.test(title))return 'scene_reference';
    if(/风格|style|参考风格/.test(title))return 'style_reference';
    if(/运镜|镜头|motion|camera/.test(title)&&source?.type==='video')return 'motion_reference';
    if(/音色|voice/.test(title)&&source?.type==='audio')return 'voice_reference';
    if(source?.type==='text')return target?.type==='script'?'script_context':'prompt_context';
    if(source?.type==='script')return 'script_context';
    if(source?.type==='audio')return 'audio_reference';
    if(source?.type==='video')return target?.type==='video'?'motion_reference':'video_reference';
    if(source?.type==='image'&&target?.type==='video'){
      const incoming=state.edges.filter(e=>e.target===target.id&&state.nodes.find(n=>n.id===e.source)?.type==='image');
      if(!incoming.length)return 'first_frame';
      if(incoming.length===1)return 'last_frame';
      return 'image_reference';
    }
    if(source?.type==='image')return 'style_reference';
    return 'reference';
  }
  function makeSemanticEdge(sourceId,targetId,type='asset',role=''){
    const source=state.nodes.find(n=>n.id===sourceId),target=state.nodes.find(n=>n.id===targetId);const semanticRole=role||inferEdgeRole(source,target);
    return {id:uid('e'),source:sourceId,target:targetId,type,role:semanticRole,semanticRole,targetSlot:semanticRole,createdAt:Date.now()};
  }
  function edgeCompatibility(source,target,role='',ignoreEdgeId=''){
    if(!source||!target)return{ok:false,reason:'节点不存在'};
    if(source.id===target.id)return{ok:false,reason:'不能连接节点自身'};
    const r=role||inferEdgeRole(source,target);
    if(state.edges.some(e=>e.id!==ignoreEdgeId&&e.source===source.id&&e.target===target.id&&(!role||e.role===r)))return{ok:false,reason:'这两个节点已经连接'};
    const allowed=edgeRoleOptions(source,target);if(role&&!allowed.includes(r))return{ok:false,reason:`${labelForType(source.type)}不能作为${edgeRoleLabel(r)}`};
    if(['first_frame','last_frame'].includes(r)){const used=state.edges.find(e=>e.id!==ignoreEdgeId&&e.target===target.id&&e.role===r&&e.source!==source.id);if(used)return{ok:false,reason:`目标已经有${edgeRoleLabel(r)}`}}
    if(target.type==='audio'&&!['audio','text'].includes(source.type))return{ok:false,reason:'音频节点只接受音频或文本输入'};
    return{ok:true,role:r};
  }
  function createEdge(sourceId,targetId,{type='asset',role='',snapshotBefore=false,silent=false}={}){
    const source=state.nodes.find(n=>n.id===sourceId),target=state.nodes.find(n=>n.id===targetId),check=edgeCompatibility(source,target,role);
    if(!check.ok){if(!silent)showToast(check.reason);return null}
    if(snapshotBefore)snapshot('创建连线');
    const edge=makeSemanticEdge(sourceId,targetId,type,check.role);state.edges.push(edge);return edge;
  }
  function compatibleDownstreamTypes(source){
    if(!source)return['text','image','video','audio','script','director'];
    if(source.type==='text')return['image','video','audio','script'];
    if(source.type==='image')return['image','video','script'];
    if(source.type==='video')return['video','script','audio'];
    if(source.type==='audio')return['audio','video','script'];
    if(source.type==='script')return['image','video'];
    if(source.type==='director')return['image','video'];
    return['text','image','video','audio','script'];
  }

  function themeBg(theme){
    const map = {
      forest:'linear-gradient(135deg,#253b38 0%,#536446 45%,#d9af6c 100%)',
      girls:'linear-gradient(135deg,#6f8f63 0%,#d5b989 42%,#6988a4 100%)',
      girls2:'linear-gradient(135deg,#314e54 0%,#c9b17c 45%,#779868 100%)',
      city:'linear-gradient(135deg,#29364e,#8b6971 50%,#d5a866)',
      portrait:'linear-gradient(135deg,#34323b,#b47f78 55%,#80614f)'
    };
    return map[theme] || map.city;
  }

  function viewportWorldRect(marginPx=650){const z=Math.max(.01,state.viewport.zoom),m=marginPx/z;return{left:-state.viewport.x/z-m,top:-state.viewport.y/z-m,right:(viewport.clientWidth-state.viewport.x)/z+m,bottom:(viewport.clientHeight-state.viewport.y)/z+m}}
  function rectIntersects(a,b){return a.right>=b.left&&a.left<=b.right&&a.bottom>=b.top&&a.top<=b.bottom}
  function nodeRect(n){return{left:n.x,top:n.y,right:n.x+(n.w||320),bottom:n.y+nodeHeight(n)}}
  function collapsedGroupForNode(nodeId){return (state.groups||[]).find(g=>g.collapsed&&(g.nodeIds||[]).includes(nodeId))||null}
  function nodeHiddenByCollapsedGroup(nodeId){return Boolean(collapsedGroupForNode(nodeId))}
  function sceneBounds(ids=null){
    const set=ids?new Set(ids):null,rects=[],collapsedSeen=new Set();
    state.nodes.forEach(n=>{if(set&&!set.has(n.id))return;const cg=collapsedGroupForNode(n.id);if(cg){if(!collapsedSeen.has(cg.id)){collapsedSeen.add(cg.id);const b=groupBounds(cg);if(b)rects.push({left:b.left,top:b.top,right:b.right,bottom:b.bottom})}return}rects.push(nodeRect(n))});
    if(!ids)(state.groups||[]).filter(g=>g.collapsed).forEach(g=>{if(collapsedSeen.has(g.id))return;const b=groupBounds(g);if(b)rects.push({left:b.left,top:b.top,right:b.right,bottom:b.bottom})});
    if(!rects.length)return{left:-400,top:-250,right:400,bottom:250,width:800,height:500};const left=Math.min(...rects.map(r=>r.left)),top=Math.min(...rects.map(r=>r.top)),right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));return{left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top)}
  }
  function renderedNodeIds(){const vr=viewportWorldRect(),selected=new Set([...(state.selectedIds||[]),expandedNodeId,connectingFrom].filter(Boolean));return new Set(state.nodes.filter(n=>!nodeHiddenByCollapsedGroup(n.id)&&(selected.has(n.id)||rectIntersects(nodeRect(n),vr))).map(n=>n.id))}
  function latestWorkflowRunForNode(nodeId){
    return (state.workflowRuns||[]).find(r=>r?.statuses&&Object.prototype.hasOwnProperty.call(r.statuses,nodeId))||null;
  }
  function workflowNodeStatus(nodeId){const r=latestWorkflowRunForNode(nodeId);return r?{run:r,status:r.statuses?.[nodeId]||'pending'}:{run:null,status:''}}
  function workflowStatusLabel(st){return({pending:'等待',running:'运行中',fallback:'切备用',succeeded:'完成',cached:'缓存',frozen:'冻结',failed:'失败',canceled:'取消',skipped:'跳过',interrupted:'已中断'})[st]||st||''}
  function workflowStatusClass(st){return ['pending','running','succeeded','cached','frozen','failed','canceled','skipped'].includes(st)?st:''}
  function runProgress(run){const vals=Object.values(run?.statuses||{}),total=vals.length,done=vals.filter(x=>['succeeded','cached','frozen','failed','canceled','skipped'].includes(x)).length,running=vals.filter(x=>x==='running').length,failed=vals.filter(x=>x==='failed').length;return{total,done,running,failed,pct:total?Math.round(done/total*100):0}}
  function scheduleWorkflowVisualUpdate(){if(workflowVisualFrame)return;workflowVisualFrame=requestAnimationFrame(()=>{workflowVisualFrame=0;updateWorkflowVisuals()})}
  function updateWorkflowVisuals(){
    $$('.node',nodeLayer).forEach(el=>{const id=el.dataset.id,n=state.nodes.find(x=>x.id===id),wf=workflowNodeStatus(id).status,status=wf||nodeTaskVisualState(n);el.classList.remove('wf-pending','wf-running','wf-succeeded','wf-cached','wf-frozen','wf-failed','wf-canceled','wf-skipped','task-pending','task-running','task-succeeded','task-frozen','task-failed','task-canceled');if(wf)el.classList.add('wf-'+workflowStatusClass(wf));if(status)el.classList.add('task-'+workflowStatusClass(status));let badge=$('.node-run-status',el);if(status){if(!badge){badge=document.createElement('span');badge.className='node-run-status';(()=>{const headerRight=$('.node-header-right',el),menu=headerRight?$('.node-menu-btn',headerRight):null;if(headerRight)headerRight.insertBefore(badge,menu||null);else $('.node-header',el)?.appendChild(badge)})()}badge.className='node-run-status '+workflowStatusClass(status);badge.textContent=workflowStatusLabel(status)+(status==='running'&&Number(n?.taskProgress)>0?' '+Math.round(n.taskProgress)+'%':'')}else badge?.remove();let bar=$('.node-task-progress',el);if(['pending','running'].includes(status)){if(!bar){bar=document.createElement('div');bar.className='node-task-progress';bar.innerHTML='<i></i>';el.appendChild(bar)}const pct=status==='pending'?4:Math.max(8,Math.min(100,Number(n?.taskProgress||0)));$('i',bar).style.width=pct+'%'}else bar?.remove();const diag=$('[data-video-task-diagnostics]',el);if(diag&&n?.type==='video')diag.innerHTML=videoTaskDiagnosticsHtml(n)});
    renderEdges();renderGroups(renderedNodeIds());renderWorkflowRunHud();
  }
  function ensureWorkflowRunHud(){let hud=$('#workflowRunHud');if(hud)return hud;hud=document.createElement('div');hud.id='workflowRunHud';hud.className='workflow-run-hud hidden';document.querySelector('#app')?.appendChild(hud);return hud}
  function renderWorkflowRunHud(){const hud=ensureWorkflowRunHud(),run=(state.workflowRuns||[])[0];if(!run){hud.classList.add('hidden');return}const p=runProgress(run),active=Object.entries(run.statuses||{}).filter(([,st])=>st==='running').slice(0,4);hud.classList.remove('hidden');hud.innerHTML=`<div class="wf-hud-head"><div><b>${escapeHtml(run.title||'工作流')}</b><span>${run.status==='running'?'运行中':workflowStatusLabel(run.status)}</span></div><strong>${p.done}/${p.total}</strong></div><div class="wf-hud-progress"><i style="width:${p.pct}%"></i></div><div class="wf-hud-meta"><span>${p.pct}%</span><span>${p.running} 运行</span><span>${p.failed} 失败</span></div>${active.length?`<div class="wf-hud-active">${active.map(([id])=>`<button data-wf-focus="${id}">${escapeHtml(state.nodes.find(n=>n.id===id)?.title||id)}</button>`).join('')}</div>`:''}<div class="wf-hud-actions"><button data-wf-center>运行中心</button>${run.status==='running'?`<button class="danger" data-wf-cancel="${run.id}">取消</button>`:''}</div>`;$$('[data-wf-focus]',hud).forEach(b=>b.onclick=()=>focusNode(b.dataset.wfFocus));$('[data-wf-center]',hud).onclick=openTaskManager;const cancel=$('[data-wf-cancel]',hud);if(cancel)cancel.onclick=()=>{run.cancelRequested=true;workflowLog(run,'用户从画布运行浮层请求取消','warn');scheduleWorkflowVisualUpdate()}}
  function applyViewportTransform({minimap:trueMinimap=true,overlays=true}={}){
    world.style.transform=`translate(${state.viewport.x}px,${state.viewport.y}px) scale(${state.viewport.zoom})`;
    const grid=Math.max(6,24*state.viewport.zoom);viewport.style.backgroundSize=`${grid}px ${grid}px`;viewport.style.backgroundPosition=`${state.viewport.x%grid}px ${state.viewport.y%grid}px`;
    $('#zoomBtn').textContent=Math.round(state.viewport.zoom*100)+'%';edgeLayer.classList.toggle('hide-labels',state.viewport.zoom<=.55);
    if(trueMinimap)updateMinimapViewport();
    if(overlays)repositionExpandedSurfaces();
  }
  function scheduleViewportTransform(){if(viewportFrame)return;viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;applyViewportTransform()})}
  function refreshVirtualizedContent(){const visible=renderedNodeIds();nodeLayer.innerHTML='';renderGroups(visible);state.nodes.forEach(n=>{if(visible.has(n.id))nodeLayer.appendChild(renderNode(n))});renderEdges();renderToolbar();renderGenerator();lastVirtualizedViewport={...state.viewport}}
  function scheduleVirtualizationRefresh(force=false){const dx=Math.abs(state.viewport.x-lastVirtualizedViewport.x),dy=Math.abs(state.viewport.y-lastVirtualizedViewport.y),dz=Math.abs(state.viewport.zoom-lastVirtualizedViewport.zoom),threshold=Math.max(140,Math.min(viewport.clientWidth,viewport.clientHeight)*.28);if(!force&&dx<threshold&&dy<threshold&&dz<.07)return;clearTimeout(virtualizationTimer);virtualizationTimer=setTimeout(()=>{virtualizationTimer=null;refreshVirtualizedContent()},72)}
  function repositionExpandedSurfaces(){if(!expandedNodeId)return;const n=state.nodes.find(x=>x.id===expandedNodeId),el=n&&document.querySelector(`.node[data-id="${CSS.escape(String(n.id))}"]`);if(!el)return;const r=el.getBoundingClientRect();if(!toolbar.classList.contains('hidden')){toolbar.style.left=Math.max(68,Math.min(window.innerWidth-760,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px'}if(!generator.classList.contains('hidden'))positionGeneratorBelowNode(n,el,n.type==='script'?Math.min(360,window.innerWidth-96):Math.max(420,Math.min(560,r.width+60)))}
  function render(){
    $('#projectName').textContent=state.projectName;if(workspaceNameEl)workspaceNameEl.textContent=workspaceName;applyViewportTransform({minimap:false,overlays:false});
    const visible=renderedNodeIds();nodeLayer.innerHTML='';renderGroups(visible);state.nodes.forEach(n=>{if(visible.has(n.id))nodeLayer.appendChild(renderNode(n))});
    renderEdges();renderToolbar();renderGenerator();lastVirtualizedViewport={...state.viewport};renderMinimap();renderWorkflowRunHud();renderEmptyQuickBar();renderAgentPanel();$('#emptyCanvasHint')?.classList.toggle('hidden',state.nodes.length>0);renderCanvasViewMode();
    syncDockModeButton();
    document.querySelector('#app')?.classList.toggle('agent-open',Boolean(agentState?.open));
    agentBtn?.classList.toggle('active',Boolean(agentState?.open));
  }

  function renderEmptyQuickBar(){
    if(!emptyQuickBar)return;
    const show=state.nodes.length===0;
    emptyQuickBar.classList.toggle('hidden',!show);
    if(!show)return;
    const cards=EMPTY_WORKFLOW_STARTERS.map(w=>{
      const badge=w.badge?`<span class="empty-workflow-badge">${escapeHtml(w.badge)}</span>`:'';
      return `<button type="button" class="empty-workflow-card tone-${escapeAttr(w.tone)}" data-workflow-starter="${w.id}"><span class="empty-workflow-icon" aria-hidden="true">${w.svg}</span><span class="empty-workflow-copy"><span class="empty-workflow-title-row"><b>${escapeHtml(w.title)}</b>${badge}</span></span></button>`;
    }).join('');
    emptyQuickBar.innerHTML=`<div class="empty-workflow-head"><span class="empty-workflow-kicker"><i aria-hidden="true">☝</i><b>双击画布 自由生成节点</b></span></div><div class="empty-workflow-grid">${cards}</div>`;
    if(!emptyQuickBar.__workflowBound){
      emptyQuickBar.__workflowBound=true;
      $$('[data-workflow-starter]',emptyQuickBar).forEach(b=>b.onclick=()=>launchEmptyWorkflow(b.dataset.workflowStarter));
      emptyQuickBar.addEventListener('click',e=>{
        const starter=e.target.closest?.('[data-workflow-starter]');
        if(starter){launchEmptyWorkflow(starter.dataset.workflowStarter);return}
      });
    }
  }
  function launchEmptyWorkflow(id){
    const rect=viewport.getBoundingClientRect(),center=screenToWorld(rect.left+viewport.clientWidth/2-220,rect.top+viewport.clientHeight/2-10);
    runTransaction(`启动 ${id} 工作流`,()=>{
      if(id==='story-script'){
        const script=addNode('script',{x:center.x,y:center.y},true);
        script.scriptMode='breakdown';script.sourceText='';script.prompt='';script.title='故事脚本生成';expandedNodeId=script.id;selectedId=script.id;state.selectedIds=[script.id];saveState();render();setTimeout(()=>openScriptEditor(script,'shots'),0);return;
      }
      if(id==='character-three-view'){
        const image=addNode('image',{x:center.x,y:center.y},true);
        image.title='角色三视图';image.prompt='生成角色三视图，包含正面、侧面、背面，保持角色身份与服装一致。';image.aspectRatio='16:9';expandedNodeId=image.id;selectedId=image.id;state.selectedIds=[image.id];saveState();render();setTimeout(()=>openImageStudio(image,'compose'),0);return;
      }
        if(id==='reference-video'){
          const image=addNode('image',{x:center.x,y:center.y},true);
          image.title='首帧参考';image.prompt='作为参考生视频的首帧或参考图，保持主体清晰、构图明确。';image.aspectRatio='16:9';
          const video=addNode('video',{x:center.x+420,y:center.y},true);
          video.title='全能参考生视频';video.prompt='使用首帧参考图和剧情描述生成完整视频，保持动作和镜头连续。';
          video.videoMode='frame2video';
          state.edges.push(makeSemanticEdge(image.id,video.id,'asset','first_frame'));
          expandedNodeId=video.id;selectedId=video.id;state.selectedIds=[video.id];saveState();render();setTimeout(()=>openVideoStudio(video),0);return;
        }
        if(id==='audio-video'){
          const audio=addNode('audio',{x:center.x,y:center.y-10},true);
          audio.title='音频参考';audio.prompt='节奏、口播或配音参考音频。';
          const image=addNode('image',{x:center.x,y:center.y+170},true);
          image.title='画面参考';image.prompt='与音频一起驱动视频生成的主体参考图。';
          const video=addNode('video',{x:center.x+430,y:center.y+70},true);
          video.title='音频生视频';video.prompt='根据音频节奏和参考图生成视频，保持主体和节奏统一。';
          video.videoMode='audio2video';
          state.edges.push(makeSemanticEdge(audio.id,video.id,'asset','audio_reference'),makeSemanticEdge(image.id,video.id,'asset','first_frame'));
          expandedNodeId=video.id;selectedId=video.id;state.selectedIds=[video.id];saveState();render();setTimeout(()=>openVideoStudio(video),0);return;
        }
      if(id==='smart-edit'){
        const video=addNode('video',{x:center.x,y:center.y},true);
        video.title='智能剪辑';video.prompt='把多个视频按顺序剪辑、重排或做智能混剪。';expandedNodeId=video.id;selectedId=video.id;state.selectedIds=[video.id];saveState();render();setTimeout(()=>openVideoTool('智能剪辑',video),0);return;
      }
    });
  }
  window.launchEmptyWorkflow = launchEmptyWorkflow;

  function ensureScriptData(n){
    const Core=globalThis.FuietScriptWorkflowCore;
    if(!n.scriptData)n.scriptData=Core?.createScriptData?Core.createScriptData():{schemaVersion:1,style:'',globalStyle:{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''},assets:{characters:[],scenes:[],props:[]},shots:[],workflow:{stage:'draft'},production:{image:{},video:{}},quality:{shots:{},baseline:null},finalized:false};
    if(Core?.normalizeScriptData)Core.normalizeScriptData(n.scriptData,{idFactory:prefix=>uid(prefix)});
    return n.scriptData;
  }
  function scriptNodeForProductionNode(node){
    const sid=node?.toolParams?.scriptNodeId;return sid?state.nodes.find(x=>x.id===sid&&x.type==='script')||null:null;
  }
  function scriptShotForProductionNode(node){
    const script=scriptNodeForProductionNode(node),shotId=node?.toolParams?.shotId;if(!script||!shotId)return null;return ensureScriptData(script).shots.find(s=>s.id===shotId)||null;
  }
  function shotProductionNodes(scriptNodeId,shotId,type=''){
    return state.nodes.filter(x=>x.toolParams?.scriptNodeId===scriptNodeId&&x.toolParams?.shotId===shotId&&(!type||x.type===type));
  }
  function latestShotProductionNode(scriptNodeId,shotId,type=''){
    const nodes=shotProductionNodes(scriptNodeId,shotId,type);return nodes.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))||state.nodes.indexOf(b)-state.nodes.indexOf(a))[0]||null;
  }
  function productionStatusMeta(node){
    if(!node)return{key:'missing',label:'未创建'};if(node.frozen&&nodeHasReusableResult(node))return{key:'frozen',label:'已冻结'};const s=nodeTaskVisualState(node)||node.taskStatus||'';if(['pending','queued'].includes(s))return{key:'pending',label:'排队'};if(['running','polling','retrying','fallback'].includes(s))return{key:'running',label:s==='fallback'?'切备用':'生成中'};if(s==='failed')return{key:'failed',label:'失败'};if(s==='canceled')return{key:'canceled',label:'已取消'};if(s==='succeeded'||nodeHasReusableResult(node))return{key:'succeeded',label:'完成'};return{key:'idle',label:'待生成'};
  }
  function shotProductionCellHtml(scriptNode,shot){
    const img=latestShotProductionNode(scriptNode.id,shot.id,'image'),vid=latestShotProductionNode(scriptNode.id,shot.id,'video'),im=productionStatusMeta(img),vm=productionStatusMeta(vid);return `<div class="shot-production-cell"><button data-shot-locate="${shot.id}" data-shot-type="image" class="${im.key}" ${img?'':'disabled'}>${uiIcon('image')}<span>图 · ${im.label}${img&&nodeResultVersions(img).length>1?` ${nodeResultVersions(img).length}版`:''}</span></button><button data-shot-locate="${shot.id}" data-shot-type="video" class="${vm.key}" ${vid?'':'disabled'}>${uiIcon('video')}<span>视频 · ${vm.label}${vid&&nodeResultVersions(vid).length>1?` ${nodeResultVersions(vid).length}版`:''}</span></button><span><button data-shot-regenerate="${shot.id}" data-shot-type="image" title="重新生成分镜图">${uiIcon('refresh')}</button><button data-shot-regenerate="${shot.id}" data-shot-type="video" title="重新生成视频">${uiIcon('refresh')}</button></span></div>`;
  }
  function focusShotProductionNode(scriptNode,shotId,type){
    const node=latestShotProductionNode(scriptNode.id,shotId,type);if(!node)return showToast(`这个 Shot 还没有${type==='video'?'视频':'分镜图'}节点`);closeFeatureModal();focusNode(node.id);setTimeout(()=>{expandedNodeId=node.id;selectedId=node.id;state.selectedIds=[node.id];render()},120);
  }
  function openScriptShotFromProductionNode(node){const script=scriptNodeForProductionNode(node),shot=scriptShotForProductionNode(node);if(!script||!shot)return;openScriptEditor(script,'shots',shot.id)}
  function nodeInlineCandidateHtml(n){
    const vs=nodeResultVersions(n);if(vs.length<2||!['image','video'].includes(n.type))return'';const active=Math.max(0,activeNodeResultIndex(n)),start=Math.max(0,Math.min(vs.length-5,active-2)),slice=vs.slice(start,start+5);return `<div class="node-candidate-rail"><span>${vs.length} 个候选</span><div>${slice.map((v,i)=>{const idx=start+i,selected=idx===active;const preview=n.type==='image'?(v.outputUrl?`<img src="${escapeAttr(v.outputUrl)}" alt="候选 ${idx+1}">`:'<i>图</i>'):(v.outputUrl?`<video src="${escapeAttr(v.outputUrl)}" muted preload="metadata"></video>`:'<i>视频</i>');return `<button class="${selected?'active':''}" data-inline-version="${v.id}" title="结果 ${idx+1}">${preview}<b>${idx+1}</b></button>`}).join('')}</div></div>`;
  }
  function ensureShotQuality(scriptNode,shot){
    const d=ensureScriptData(scriptNode);d.quality=d.quality||{shots:{},baseline:null};d.quality.shots=d.quality.shots||{};
    if(!d.quality.shots[shot.id])d.quality.shots[shot.id]={image:'pending',video:'pending',note:'',updatedAt:'',approvedVersionIds:{image:'',video:''}};
    const q=d.quality.shots[shot.id];q.approvedVersionIds=q.approvedVersionIds||{image:'',video:''};return q;
  }
  function qualityStatusLabel(v){return({pass:'通过',rework:'需重做',pending:'未审核'})[v]||'未审核'}
  function activeResultVersionId(n){const vs=nodeResultVersions(n);return n?.activeResultVersionId||vs[activeNodeResultIndex(n)]?.id||vs.at(-1)?.id||''}
  function shotContinuityIssues(scriptNode,shot){
    const d=ensureScriptData(scriptNode),issues=[],q=ensureShotQuality(scriptNode,shot),catalog=scriptAssetCatalog(d),refs=new Set(matchShotAssets(shot,d));
    const add=(level,title,detail,type='shot')=>issues.push({level,title,detail,type});
    if(shot.promptDirty)add('error','提示词已过期',shot.dirtyReason||'镜头或一致性资产修改后尚未重新合成','prompt');
    if(!String(shot.imagePrompt||'').trim())add('error','缺少图像提示词','该 Shot 还没有最终图像提示词','prompt');
    if(!String(shot.videoPrompt||'').trim())add('error','缺少视频提示词','该 Shot 还没有最终视频提示词','prompt');
    if(Number(shot.duration||0)<=0)add('error','镜头时长异常','时长必须大于 0 秒','timing');
    else if(Number(shot.duration||0)>15)add('warn','镜头时长较长',`${Number(shot.duration)} 秒，部分视频模型可能需要拆分`,'timing');
    const sceneNames=(d.assets?.scenes||[]).map(a=>String(a.name||'').trim()).filter(Boolean);
    if(shot.scene&&sceneNames.length&&!sceneNames.includes(String(shot.scene).trim())&&![...refs].some(id=>(d.assets.scenes||[]).some(a=>a.id===id)))add('warn','场景未绑定一致性资产',`“${shot.scene}”未命中当前场景资产`,'asset');
    const charNames=(d.assets?.characters||[]).map(a=>String(a.name||'').trim()).filter(Boolean),chars=String(shot.characters||'').split(/[、,，/；;]/).map(x=>x.trim()).filter(Boolean);
    chars.filter(name=>charNames.length&&!charNames.includes(name)&&![...refs].some(id=>(d.assets.characters||[]).some(a=>a.id===id&&String(a.name||'')===name))).forEach(name=>add('warn','角色未绑定一致性资产',`“${name}”未命中当前角色资产`,'asset'));
    const image=latestShotProductionNode(scriptNode.id,shot.id,'image'),video=latestShotProductionNode(scriptNode.id,shot.id,'video');
    if(image&&video&&nodeHasReusableResult(image)&&!state.edges.some(e=>e.source===image.id&&e.target===video.id&&(e.role==='first_frame'||e.semanticRole==='first_frame'||e.targetSlot==='first_frame'))&&video.toolParams?.firstFrame!==image.id)add('warn','视频未绑定当前分镜为首帧','可能导致人物、构图或场景连续性漂移','production');
    ['image','video'].forEach(type=>{const node=type==='image'?image:video,approved=q.approvedVersionIds?.[type],active=activeResultVersionId(node);if(q[type]==='pass'&&node&&approved&&approved!==active)add('error',`${type==='image'?'分镜图':'视频'}通过版本已变更`,'当前候选与质检通过时的版本不同，需要重新确认','quality');const baseline=(d.quality?.baseline?.shots||[]).find(x=>x.shotId===shot.id),baselineVersion=baseline?.[`${type}VersionId`];if(baselineVersion&&node&&active&&baselineVersion!==active)add('warn',`${type==='image'?'分镜图':'视频'}已偏离生产基线`,'当前激活结果与基线版本不同；确认新版本后可更新生产基线','baseline')});
    if(typeof narrativeIssuesForShot==='function')narrativeIssuesForShot(scriptNode,shot).forEach(i=>add(i.level,i.title,i.detail,'narrative'));
    return issues;
  }
  // v3.1 · Project-wide character / scene consistency registry
  function consistencyTypeLabel(type){return type==='character'?'角色':type==='scene'?'场景':type==='style'?'风格':'资产'}
  function consistencyBucket(type){return type==='character'?'characters':type==='scene'?'scenes':''}
  function normalizeConsistencyName(value){return String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,'')}
  function consistencyKey(type,name){return `${type}:${normalizeConsistencyName(name)}`}
  function projectConsistencyData(){state.projectConsistency=state.projectConsistency||{registry:{},lastScanAt:'',lastScanSummary:null};state.projectConsistency.registry=state.projectConsistency.registry||{};return state.projectConsistency}
  function projectScriptNodes(){return state.nodes.filter(n=>n.type==='script')}
  function projectEpisodeNumber(scriptNode){const scripts=projectScriptNodes();return Math.max(1,scripts.indexOf(scriptNode)+1)}
  function projectAssetOccurrences(){
    const out=[];projectScriptNodes().forEach((scriptNode,index)=>{const d=ensureScriptData(scriptNode);[['character','characters'],['scene','scenes']].forEach(([type,bucket])=>{(d.assets?.[bucket]||[]).forEach(asset=>{const name=String(asset.name||'').trim();if(!name)return;out.push({key:consistencyKey(type,name),type,bucket,name,asset,scriptNode,episodeIndex:index,episodeNo:index+1})})})});return out;
  }
  function projectAssetGroups(){const map=new Map();projectAssetOccurrences().forEach(o=>{if(!map.has(o.key))map.set(o.key,{key:o.key,type:o.type,name:o.name,occurrences:[]});map.get(o.key).occurrences.push(o)});return [...map.values()].sort((a,b)=>a.type.localeCompare(b.type)||a.name.localeCompare(b.name,'zh-CN'))}
  function consistencyRegistryRecord(key){return projectConsistencyData().registry[key]||null}
  function occurrenceSnapshot(o){return{name:o.asset.name||o.name,prompt:String(o.asset.prompt||''),mediaUrl:String(o.asset.mediaUrl||''),revision:Number(o.asset.revision||0),scriptNodeId:o.scriptNode.id,assetId:o.asset.id,episodeNo:o.episodeNo}}
  function resolveCanonicalOccurrence(group,record=null){record=record||consistencyRegistryRecord(group.key);return group.occurrences.find(o=>o.scriptNode.id===record?.sourceScriptId&&o.asset.id===record?.sourceAssetId)||group.occurrences[0]||null}
  function projectAssetLockInfo(type,name){const key=consistencyKey(type,name),record=consistencyRegistryRecord(key);return record?.locked?{key,record}:null}
  function markOccurrenceImpact(o,reason='全剧一致性资产已同步'){const d=ensureScriptData(o.scriptNode);return markScriptImpactedByAsset(d,o.asset.id,reason)}
  function setProjectAssetCanonical(key,scriptNodeId,assetId){
    const group=projectAssetGroups().find(g=>g.key===key),source=group?.occurrences.find(o=>o.scriptNode.id===scriptNodeId&&o.asset.id===assetId);if(!group||!source)return false;const pc=projectConsistencyData(),prev=pc.registry[key]||{};pc.registry[key]={id:prev.id||uid('canon'),key,type:group.type,name:source.asset.name||group.name,locked:Boolean(prev.locked),sourceScriptId:source.scriptNode.id,sourceAssetId:source.asset.id,canonical:occurrenceSnapshot(source),updatedAt:new Date().toISOString(),lockedAt:prev.lockedAt||''};saveState();return true;
  }
  function syncLockedProjectAsset(key,{silent=false}={}){
    const group=projectAssetGroups().find(g=>g.key===key),record=consistencyRegistryRecord(key);if(!group||!record?.locked)return{changed:0,shots:0};const source=resolveCanonicalOccurrence(group,record);if(!source)return{changed:0,shots:0};record.sourceScriptId=source.scriptNode.id;record.sourceAssetId=source.asset.id;const canonical=record.canonical||occurrenceSnapshot(source);record.canonical=canonical;record.name=canonical.name||group.name;record.updatedAt=new Date().toISOString();let changed=0,shots=0;
    group.occurrences.forEach(o=>{const a=o.asset,nextName=canonical.name,nextPrompt=canonical.prompt,nextMedia=canonical.mediaUrl;const differs=String(a.name||'')!==String(nextName||'')||String(a.prompt||'')!==String(nextPrompt||'')||String(a.mediaUrl||'')!==String(nextMedia||'');if(!differs)return;a.name=nextName;a.prompt=nextPrompt;a.mediaUrl=nextMedia;if(nextMedia&&!Array.isArray(a.versions))a.versions=[];a.revision=Number(a.revision||0)+1;a.updatedAt=new Date().toISOString();shots+=markOccurrenceImpact(o,`全剧${consistencyTypeLabel(group.type)}标准资产已同步`);ensureScriptData(o.scriptNode).finalized=false;changed++});saveState();if(!silent)showToast(changed?`已同步 ${changed} 个跨集资产 · ${shots} 个 Shot 待更新`:'各集已与全剧标准一致');return{changed,shots};
  }
  function lockProjectAsset(key){
    const group=projectAssetGroups().find(g=>g.key===key);if(!group)return;const pc=projectConsistencyData(),prev=pc.registry[key]||{},source=resolveCanonicalOccurrence(group,prev);if(!source)return;pc.registry[key]={id:prev.id||uid('canon'),key,type:group.type,name:source.asset.name||group.name,locked:true,sourceScriptId:source.scriptNode.id,sourceAssetId:source.asset.id,canonical:occurrenceSnapshot(source),updatedAt:new Date().toISOString(),lockedAt:new Date().toISOString()};syncLockedProjectAsset(key,{silent:true});saveState();showToast(`已锁定全剧${consistencyTypeLabel(group.type)}「${source.asset.name||group.name}」`);
  }
  function unlockProjectAsset(key){const r=consistencyRegistryRecord(key);if(!r)return;r.locked=false;r.updatedAt=new Date().toISOString();saveState();showToast(`已解除「${r.name||'资产'}」全剧锁定`)}
  function projectAssetDriftIssues(){
    const groups=projectAssetGroups(),issues=[];groups.forEach(group=>{const record=consistencyRegistryRecord(group.key),canonical=resolveCanonicalOccurrence(group,record),base=record?.locked&&record.canonical?record.canonical:(canonical?occurrenceSnapshot(canonical):null);if(!base)return;group.occurrences.forEach(o=>{const snap=occurrenceSnapshot(o);if(String(snap.prompt).trim()!==String(base.prompt).trim())issues.push({level:record?.locked?'error':'warn',kind:'prompt',key:group.key,type:group.type,name:group.name,episodeNo:o.episodeNo,scriptNodeId:o.scriptNode.id,assetId:o.asset.id,title:`${consistencyTypeLabel(group.type)}描述漂移`,detail:`EP ${String(o.episodeNo).padStart(2,'0')} 的描述与${record?.locked?'全剧锁定标准':'当前标准集'}不同`});if((snap.mediaUrl||base.mediaUrl)&&snap.mediaUrl!==base.mediaUrl)issues.push({level:record?.locked?'error':'warn',kind:'media',key:group.key,type:group.type,name:group.name,episodeNo:o.episodeNo,scriptNodeId:o.scriptNode.id,assetId:o.asset.id,title:`${consistencyTypeLabel(group.type)}参考图漂移`,detail:`EP ${String(o.episodeNo).padStart(2,'0')} 绑定了不同的参考图`})});});
    const scripts=projectScriptNodes(),styles=scripts.map((n,i)=>({n,i,style:String(ensureScriptData(n).style||'').trim()})).filter(x=>x.style);if(styles.length>1){const base=styles[0].style;styles.slice(1).filter(x=>x.style!==base).forEach(x=>issues.push({level:'warn',kind:'style',key:'style:project',type:'style',name:'全局风格',episodeNo:x.i+1,scriptNodeId:x.n.id,assetId:'',title:'跨集视觉风格漂移',detail:`EP ${String(x.i+1).padStart(2,'0')} 的整体风格与 EP 01 不一致`}))}
    return issues;
  }
  function projectConsistencyStats(){const groups=projectAssetGroups(),registry=projectConsistencyData().registry,issues=projectAssetDriftIssues();return{groups,characters:groups.filter(g=>g.type==='character').length,scenes:groups.filter(g=>g.type==='scene').length,locked:groups.filter(g=>registry[g.key]?.locked).length,issues,errors:issues.filter(i=>i.level==='error').length,warns:issues.filter(i=>i.level==='warn').length}}
  function scanProjectAssetDrift(){const pc=projectConsistencyData(),stats=projectConsistencyStats();pc.lastScanAt=new Date().toISOString();pc.lastScanSummary={issues:stats.issues.length,errors:stats.errors,warns:stats.warns};saveState();return stats}
  function projectConsistencyBadgeHtml(){const s=projectConsistencyStats();return `<span class="project-consistency-badge ${s.errors?'bad':s.issues.length?'warn':'good'}">跨集一致性 ${s.errors?`${s.errors} 阻断`:s.issues.length?`${s.issues.length} 漂移`:'通过'}</span>`}
  function projectAssetGroupCardHtml(group){
    const record=consistencyRegistryRecord(group.key),locked=Boolean(record?.locked),source=resolveCanonicalOccurrence(group,record),issues=projectAssetDriftIssues().filter(i=>i.key===group.key),coverage=group.occurrences.length;return `<section class="consistency-asset-card ${locked?'locked':''} ${issues.length?'drift':''}"><header><div><i>${group.type==='character'?'人':'景'}</i><span><b>${escapeHtml(group.name)}</b><small>${coverage} 集出现 · ${issues.length?`${issues.length} 项漂移`:'跨集一致'}</small></span></div><em class="${locked?'locked':'open'}">${locked?`${uiIcon('lock')}<span>全剧锁定</span>`:'未锁定'}</em></header><div class="consistency-standard"><label>全剧标准来源<select data-consistency-source="${escapeAttr(group.key)}" ${locked?'disabled':''}>${group.occurrences.map(o=>`<option value="${escapeAttr(o.scriptNode.id)}|${escapeAttr(o.asset.id)}" ${source===o?'selected':''}>EP ${String(o.episodeNo).padStart(2,'0')} · ${escapeHtml(o.scriptNode.title||`第 ${o.episodeNo} 集`)}</option>`).join('')}</select></label><div class="consistency-standard-copy"><b>${escapeHtml((source?.asset.prompt||'未填写资产描述').slice(0,150))}</b><span>${source?.asset.mediaUrl?'已绑定标准参考图':'尚未绑定参考图'}</span></div><button data-consistency-lock="${escapeAttr(group.key)}" class="${locked?'danger':''}">${locked?`${uiIcon('lock')}<span>解除锁定</span>`:`${uiIcon('lock')}<span>锁定全剧</span>`}</button></div><div class="consistency-occurrences">${group.occurrences.map(o=>{const os=occurrenceSnapshot(o),base=record?.locked&&record.canonical?record.canonical:(source?occurrenceSnapshot(source):os),promptDrift=os.prompt!==base.prompt,mediaDrift=(os.mediaUrl||base.mediaUrl)&&os.mediaUrl!==base.mediaUrl,ok=!promptDrift&&!mediaDrift;return `<article class="${ok?'ok':'drift'}"><div><b>EP ${String(o.episodeNo).padStart(2,'0')}</b><span>${escapeHtml(o.scriptNode.title||`第 ${o.episodeNo} 集`)}</span></div><small>${ok?'与标准一致':[promptDrift?'描述不同':'',mediaDrift?'参考图不同':''].filter(Boolean).join(' · ')}</small><button data-consistency-episode="${escapeAttr(o.scriptNode.id)}">打开</button></article>`}).join('')}</div></section>`;
  }
  function openProjectConsistencyCenter(filter='all'){
    const stats=scanProjectAssetDrift(),groups=stats.groups.filter(g=>filter==='all'||g.type===filter),pc=projectConsistencyData();modalShell('跨集角色 / 场景一致性中心',`<div class="project-consistency"><div class="consistency-head"><div><b>${escapeHtml(state.projectName)}</b><span>${projectScriptNodes().length} 集 · Canonical Asset Registry · ${pc.lastScanAt?`最近扫描 ${new Date(pc.lastScanAt).toLocaleTimeString()}`:'尚未扫描'}</span></div><div><button id="consistencyBack">← 项目总控</button><button id="consistencyNarrative">剧情状态时间线</button><button id="consistencyScan">重新扫描漂移</button></div></div><div class="consistency-kpis"><article><span>全剧角色</span><b>${stats.characters}</b><small>按名称跨集归并</small></article><article><span>全剧场景</span><b>${stats.scenes}</b><small>按名称跨集归并</small></article><article><span>已锁定资产</span><b>${stats.locked}/${stats.characters+stats.scenes}</b><small>单集不可私自修改</small></article><article class="${stats.errors?'danger':stats.warns?'warn':''}"><span>跨集漂移</span><b>${stats.issues.length}</b><small>${stats.errors} 阻断 · ${stats.warns} 提醒</small></article></div><div class="consistency-toolbar"><div class="seg-buttons"><button data-consistency-filter="all" class="${filter==='all'?'active':''}">全部</button><button data-consistency-filter="character" class="${filter==='character'?'active':''}">角色</button><button data-consistency-filter="scene" class="${filter==='scene'?'active':''}">场景</button></div><button id="consistencyLockClean" ${stats.groups.some(g=>!consistencyRegistryRecord(g.key)?.locked)?'':'disabled'}>锁定全部当前标准</button><button id="consistencySyncLocked" ${stats.locked?'':'disabled'}>同步全部锁定资产</button><button id="consistencyDriftReport">漂移报告 · ${stats.issues.length}</button></div><div class="consistency-asset-list">${groups.map(projectAssetGroupCardHtml).join('')||'<div class="project-empty"><b>暂无跨集一致性资产</b><span>在各集脚本的「资产」页添加角色或场景后，这里会自动归并。</span></div>'}</div></div>`,{full:true});
    $('#consistencyBack').onclick=openProjectProductionDashboard;$('#consistencyNarrative').onclick=()=>openNarrativeContinuityCenter('characters');$('#consistencyScan').onclick=()=>openProjectConsistencyCenter(filter);$$('[data-consistency-filter]',featureModal).forEach(b=>b.onclick=()=>openProjectConsistencyCenter(b.dataset.consistencyFilter));$$('[data-consistency-source]',featureModal).forEach(sel=>sel.onchange=()=>{const [sid,aid]=sel.value.split('|');setProjectAssetCanonical(sel.dataset.consistencySource,sid,aid);openProjectConsistencyCenter(filter)});$$('[data-consistency-lock]',featureModal).forEach(b=>b.onclick=()=>{const key=b.dataset.consistencyLock;if(consistencyRegistryRecord(key)?.locked)unlockProjectAsset(key);else lockProjectAsset(key);openProjectConsistencyCenter(filter)});$$('[data-consistency-episode]',featureModal).forEach(b=>b.onclick=()=>{const n=state.nodes.find(x=>x.id===b.dataset.consistencyEpisode);if(n)openScriptEditor(n,'assets')});$('#consistencyLockClean').onclick=()=>{projectAssetGroups().forEach(g=>{if(!consistencyRegistryRecord(g.key)?.locked)lockProjectAsset(g.key)});openProjectConsistencyCenter(filter)};$('#consistencySyncLocked').onclick=()=>{Object.values(projectConsistencyData().registry).filter(r=>r.locked).forEach(r=>syncLockedProjectAsset(r.key,{silent:true}));saveState();showToast('已同步全部锁定资产到各集');openProjectConsistencyCenter(filter)};$('#consistencyDriftReport').onclick=openProjectDriftReport;
  }
  function openProjectDriftReport(){
    const stats=scanProjectAssetDrift(),issues=stats.issues;modalShell('跨集漂移检测报告',`<div class="drift-report"><div class="continuity-summary"><article><span>扫描剧集</span><b>${projectScriptNodes().length}</b></article><article><span>资产组</span><b>${stats.groups.length}</b></article><article><span>阻断漂移</span><b>${stats.errors}</b></article><article><span>提醒</span><b>${stats.warns}</b></article></div><div class="drift-report-actions"><button id="driftBack">← 一致性中心</button><button id="driftSyncLocked" ${stats.locked?'':'disabled'}>同步锁定资产修复漂移</button></div><div class="drift-list">${issues.map(i=>`<section class="${i.level}"><i>${i.level==='error'?'!':'·'}</i><div><b>${escapeHtml(i.title)} · ${escapeHtml(i.name)}</b><span>${escapeHtml(i.detail)}</span><small>${i.type==='style'?'全局风格':`${consistencyTypeLabel(i.type)} · EP ${String(i.episodeNo||0).padStart(2,'0')}`}</small></div>${i.scriptNodeId?`<button data-drift-open="${escapeAttr(i.scriptNodeId)}">打开剧集</button>`:''}</section>`).join('')||'<div class="drift-clean"><b>✓ 跨集漂移检查通过</b><span>角色、场景与项目风格没有发现结构性漂移。</span></div>'}</div></div>`,{full:true});$('#driftBack').onclick=()=>openProjectConsistencyCenter('all');$('#driftSyncLocked').onclick=()=>{Object.values(projectConsistencyData().registry).filter(r=>r.locked).forEach(r=>syncLockedProjectAsset(r.key,{silent:true}));saveState();openProjectDriftReport();showToast('已按全剧锁定标准同步')};$$('[data-drift-open]',featureModal).forEach(b=>b.onclick=()=>{const n=state.nodes.find(x=>x.id===b.dataset.driftOpen);if(n)openScriptEditor(n,'assets')});
  }
  // v3.2 · Narrative continuity state machine: identity stays canonical, story state evolves through explicit events.
  function projectNarrativeData(){
    state.projectNarrative=state.projectNarrative||{characterTracks:{},sceneTracks:{},events:[],lastAuditAt:'',lastAuditSummary:null};
    state.projectNarrative.characterTracks=state.projectNarrative.characterTracks||{};state.projectNarrative.sceneTracks=state.projectNarrative.sceneTracks||{};state.projectNarrative.events=Array.isArray(state.projectNarrative.events)?state.projectNarrative.events:[];return state.projectNarrative;
  }
  function narrativeKindLabel(kind){return kind==='character'?'角色':'场景'}
  function narrativeTrackBucket(kind){return kind==='character'?'characterTracks':'sceneTracks'}
  function narrativeDefaultBase(kind){return kind==='character'?{wardrobe:'基础服装',hair:'基础发型',age:'基础年龄'}:{timeOfDay:'日景',weather:'默认天气',lighting:'沿用标准场景光线'}}
  function narrativeFieldLabels(kind){return kind==='character'?{wardrobe:'服装',hair:'发型',age:'年龄状态'}:{timeOfDay:'昼夜',weather:'天气',lighting:'光线'}}
  function narrativeProjectPosition(episodeNo,shotNo=0){return Math.max(1,Number(episodeNo)||1)*10000+Math.max(0,Number(shotNo)||0)}
  function narrativeShotPosition(scriptNode,shot){return narrativeProjectPosition(projectEpisodeNumber(scriptNode),Number(shot?.no)||0)}
  function narrativeTrack(kind,key,name=''){
    const pn=projectNarrativeData(),bucket=pn[narrativeTrackBucket(kind)],group=projectAssetGroups().find(g=>g.key===key),label=name||group?.name||key.split(':').slice(1).join(':')||'未命名';
    if(!bucket[key])bucket[key]={key,kind,name:label,base:narrativeDefaultBase(kind),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    bucket[key].name=bucket[key].name||label;bucket[key].base={...narrativeDefaultBase(kind),...(bucket[key].base||{})};return bucket[key];
  }
  function ensureNarrativeTracks(){const groups=projectAssetGroups();groups.forEach(g=>narrativeTrack(g.type,g.key,g.name));return groups}
  function narrativeEventsFor(kind,key){return projectNarrativeData().events.filter(e=>e.kind===kind&&e.key===key).sort((a,b)=>narrativeProjectPosition(a.episodeNo,a.shotNo)-narrativeProjectPosition(b.episodeNo,b.shotNo)||String(a.createdAt||'').localeCompare(String(b.createdAt||'')))}
  function narrativeStateAt(kind,key,episodeNo,shotNo){
    const track=narrativeTrack(kind,key),pos=narrativeProjectPosition(episodeNo,shotNo);let value={...track.base},lastEvent=null;
    narrativeEventsFor(kind,key).forEach(e=>{const ep=narrativeProjectPosition(e.episodeNo,e.shotNo);if(ep>pos)return;if(e.persist===false&&ep!==pos)return;value={...value,...(e.changes||{})};lastEvent=e});return{...value,_lastEvent:lastEvent};
  }
  function shotCharacterNames(shot){return String(shot?.characters||'').split(/[、,，/；;]/).map(x=>x.trim()).filter(Boolean)}
  function narrativeExpectedForShot(scriptNode,shot){
    const ep=projectEpisodeNumber(scriptNode),no=Number(shot?.no)||0,characters={};shotCharacterNames(shot).forEach(name=>{const key=consistencyKey('character',name);characters[name]={key,...narrativeStateAt('character',key,ep,no)}});let scene=null;if(String(shot?.scene||'').trim()){const name=String(shot.scene).trim(),key=consistencyKey('scene',name);scene={name,key,...narrativeStateAt('scene',key,ep,no)}}return{episodeNo:ep,shotNo:no,characters,scene};
  }
  function narrativeStateFingerprint(expected){const clean={characters:{},scene:null};Object.entries(expected?.characters||{}).forEach(([name,v])=>clean.characters[name]={wardrobe:v.wardrobe||'',hair:v.hair||'',age:v.age||''});if(expected?.scene)clean.scene={name:expected.scene.name||'',timeOfDay:expected.scene.timeOfDay||'',weather:expected.scene.weather||'',lighting:expected.scene.lighting||''};return JSON.stringify(clean)}
  function narrativeStatePrompt(scriptNode,shot){
    const ex=narrativeExpectedForShot(scriptNode,shot),parts=[];Object.entries(ex.characters).forEach(([name,v])=>parts.push(`@${name} 当前剧情状态：服装=${v.wardrobe}；发型=${v.hair}；年龄状态=${v.age}`));if(ex.scene)parts.push(`@${ex.scene.name} 当前场景状态：${ex.scene.timeOfDay}；天气=${ex.scene.weather}；光线=${ex.scene.lighting}`);return parts.length?`剧情连续性状态：${parts.join('；')}`:'';
  }
  function narrativeTrackSummary(kind,key,episodeNo,shotNo){const s=narrativeStateAt(kind,key,episodeNo,shotNo),labels=narrativeFieldLabels(kind);return Object.keys(labels).map(k=>`${labels[k]}：${s[k]||'—'}`).join(' · ')}
  function markNarrativeImpact(kind,key,event,reason='剧情状态发生变化'){
    let count=0;const eventPos=narrativeProjectPosition(event.episodeNo,event.shotNo);projectScriptNodes().forEach(scriptNode=>{const d=ensureScriptData(scriptNode),ep=projectEpisodeNumber(scriptNode);(d.shots||[]).forEach(shot=>{const pos=narrativeProjectPosition(ep,shot.no);if(event.persist===false?pos!==eventPos:pos<eventPos)return;const match=kind==='character'?shotCharacterNames(shot).some(name=>consistencyKey('character',name)===key):consistencyKey('scene',shot.scene)===key;if(match){markScriptShotDirty(shot,reason);count++}});if(count)d.finalized=false});return count;
  }
  function saveNarrativeBase(kind,key,changes){const track=narrativeTrack(kind,key);track.base={...track.base,...changes};track.updatedAt=new Date().toISOString();let count=0;projectScriptNodes().forEach(scriptNode=>{const d=ensureScriptData(scriptNode);(d.shots||[]).forEach(shot=>{const match=kind==='character'?shotCharacterNames(shot).some(name=>consistencyKey('character',name)===key):consistencyKey('scene',shot.scene)===key;if(match){markScriptShotDirty(shot,`全剧${narrativeKindLabel(kind)}基础状态已修改`);count++}});if(count)d.finalized=false});saveState();return count}
  function upsertNarrativeEvent(kind,key,data,eventId=''){
    const pn=projectNarrativeData(),track=narrativeTrack(kind,key),labels=narrativeFieldLabels(kind),changes={};Object.keys(labels).forEach(k=>{const v=String(data.changes?.[k]??'').trim();if(v)changes[k]=v});if(!Object.keys(changes).length)return{ok:false,error:'至少填写一个状态变化'};if(!String(data.reason||'').trim())return{ok:false,error:'剧情状态变化必须填写剧情原因'};const event=eventId?pn.events.find(e=>e.id===eventId):null,prev=event?{...event,changes:{...(event.changes||{})}}:null,target=event||{id:uid('state'),createdAt:new Date().toISOString()};Object.assign(target,{kind,key,name:track.name,episodeNo:Math.max(1,Number(data.episodeNo)||1),shotNo:Math.max(0,Number(data.shotNo)||0),reason:String(data.reason).trim(),persist:data.persist!==false,changes,updatedAt:new Date().toISOString()});if(!event)pn.events.push(target);if(prev)markNarrativeImpact(kind,key,prev,'剧情状态事件已调整');const affected=markNarrativeImpact(kind,key,target,`剧情状态变化：${target.reason}`);saveState();return{ok:true,event:target,affected}}
  function deleteNarrativeEvent(id){const pn=projectNarrativeData(),event=pn.events.find(e=>e.id===id);if(!event)return;pn.events=pn.events.filter(e=>e.id!==id);markNarrativeImpact(event.kind,event.key,event,'剧情状态事件已删除');saveState()}
  function manualNarrativeDiff(scriptNode,shot){
    const expected=narrativeExpectedForShot(scriptNode,shot),manual=shot?.narrativeOverride;if(!manual)return[];const out=[];Object.entries(manual.characters||{}).forEach(([name,v])=>{const ex=expected.characters?.[name]||{},labels=narrativeFieldLabels('character');Object.keys(labels).forEach(k=>{if(String(v?.[k]||'').trim()&&String(v[k]).trim()!==String(ex[k]||'').trim())out.push({kind:'character',key:consistencyKey('character',name),name,field:k,label:labels[k],expected:ex[k]||'—',actual:v[k]})})});if(manual.scene&&expected.scene){const labels=narrativeFieldLabels('scene');Object.keys(labels).forEach(k=>{if(String(manual.scene?.[k]||'').trim()&&String(manual.scene[k]).trim()!==String(expected.scene[k]||'').trim())out.push({kind:'scene',key:expected.scene.key,name:expected.scene.name,field:k,label:labels[k],expected:expected.scene[k]||'—',actual:manual.scene[k]})})}return out;
  }
  function narrativeIssuesForShot(scriptNode,shot){
    const issues=[],diffs=manualNarrativeDiff(scriptNode,shot),expected=narrativeExpectedForShot(scriptNode,shot),fp=narrativeStateFingerprint(expected);diffs.forEach(d=>issues.push({level:'error',type:'narrative',title:`随机${d.label}漂移 · ${d.name}`,detail:`镜头记录为“${d.actual}”，状态机预期“${d.expected}”。请登记剧情事件后再改变状态。`}));if(shot?.narrativeFingerprint&&shot.narrativeFingerprint!==fp)issues.push({level:'warn',type:'narrative',title:'剧情状态已变化但提示词未同步',detail:'上游状态时间线发生变化，请重新合成该镜头提示词。'});return issues;
  }
  function projectNarrativeIssues(){
    ensureNarrativeTracks();const pn=projectNarrativeData(),issues=[];const scripts=projectScriptNodes();pn.events.forEach(e=>{const track=(pn[narrativeTrackBucket(e.kind)]||{})[e.key];if(!track)issues.push({level:'error',kind:e.kind,key:e.key,eventId:e.id,title:'状态事件失去资产绑定',detail:`${e.name||e.key} 的剧情状态事件无法找到对应资产`});if(!String(e.reason||'').trim())issues.push({level:'error',kind:e.kind,key:e.key,eventId:e.id,title:'状态变化缺少剧情原因',detail:`EP ${String(e.episodeNo).padStart(2,'0')} 的变化没有说明剧情触发原因`});const script=scripts[Math.max(0,Number(e.episodeNo)-1)];if(!script)issues.push({level:'error',kind:e.kind,key:e.key,eventId:e.id,title:'状态事件超出剧集范围',detail:`EP ${String(e.episodeNo).padStart(2,'0')} 不存在`});else if(Number(e.shotNo||0)>ensureScriptData(script).shots.length)issues.push({level:'error',kind:e.kind,key:e.key,eventId:e.id,title:'状态事件 Shot 不存在',detail:`EP ${String(e.episodeNo).padStart(2,'0')} 没有 Shot ${e.shotNo}`})});
    const buckets=[['character',pn.characterTracks],['scene',pn.sceneTracks]];buckets.forEach(([kind,tracks])=>Object.values(tracks).forEach(track=>{const seen=new Map();narrativeEventsFor(kind,track.key).forEach(e=>{const pos=narrativeProjectPosition(e.episodeNo,e.shotNo);Object.keys(e.changes||{}).forEach(field=>{const k=`${pos}:${field}`;if(seen.has(k)&&seen.get(k)!==e.changes[field])issues.push({level:'error',kind,key:track.key,eventId:e.id,title:'同一剧情点存在冲突状态',detail:`${track.name} 在 EP ${String(e.episodeNo).padStart(2,'0')} Shot ${e.shotNo||'起始'} 的${narrativeFieldLabels(kind)[field]}被设置成多个值`});else seen.set(k,e.changes[field])})})}));
    scripts.forEach(scriptNode=>(ensureScriptData(scriptNode).shots||[]).forEach(shot=>narrativeIssuesForShot(scriptNode,shot).forEach(i=>issues.push({...i,scriptNodeId:scriptNode.id,shotId:shot.id,episodeNo:projectEpisodeNumber(scriptNode),shotNo:shot.no}))));return issues;
  }
  function projectNarrativeStats(){ensureNarrativeTracks();const pn=projectNarrativeData(),issues=projectNarrativeIssues();return{characterTracks:Object.keys(pn.characterTracks).length,sceneTracks:Object.keys(pn.sceneTracks).length,events:pn.events.length,issues,errors:issues.filter(i=>i.level==='error').length,warns:issues.filter(i=>i.level==='warn').length}}
  function scanProjectNarrative(){const pn=projectNarrativeData(),stats=projectNarrativeStats();pn.lastAuditAt=new Date().toISOString();pn.lastAuditSummary={events:stats.events,issues:stats.issues.length,errors:stats.errors,warns:stats.warns};saveState();return stats}
  function projectNarrativeBadgeHtml(){const s=projectNarrativeStats();return `<span class="project-narrative-badge ${s.errors?'bad':s.issues.length?'warn':'good'}">剧情状态 ${s.errors?`${s.errors} 阻断`:s.issues.length?`${s.issues.length} 提醒`:`${s.events} 事件`}</span>`}
  function narrativeEventLabel(event){const labels=narrativeFieldLabels(event.kind);return Object.entries(event.changes||{}).map(([k,v])=>`${labels[k]||k} → ${v}`).join(' · ')}
  function narrativeTimelineCardHtml(kind,track){
    const events=narrativeEventsFor(kind,track.key),groups=projectAssetGroups(),group=groups.find(g=>g.key===track.key),coverage=group?.occurrences.length||0,labels=narrativeFieldLabels(kind),base=track.base||{};return `<section class="narrative-track-card ${events.length?'active':''}"><header><div><i>${kind==='character'?'人':'景'}</i><span><b>${escapeHtml(track.name)}</b><small>${coverage} 集出现 · ${events.length} 次剧情状态变化</small></span></div><button data-narrative-base="${escapeAttr(track.key)}" data-narrative-kind="${kind}">编辑基础状态</button></header><div class="narrative-base-row">${Object.keys(labels).map(k=>`<span><small>${labels[k]}</small><b>${escapeHtml(base[k]||'—')}</b></span>`).join('')}</div><div class="narrative-event-rail"><article class="base"><i></i><div><b>故事起始</b><span>沿用全剧身份标准 + 基础剧情状态</span></div></article>${events.map(e=>`<article><i></i><div><b>EP ${String(e.episodeNo).padStart(2,'0')}${e.shotNo?` · Shot ${e.shotNo}`:' · 本集起始'}</b><span>${escapeHtml(narrativeEventLabel(e))}</span><small>${escapeHtml(e.reason)}${e.persist===false?' · 仅当前 Shot':' · 持续生效'}</small></div><div><button data-narrative-edit="${e.id}">编辑</button><button data-narrative-delete="${e.id}" class="danger">删除</button></div></article>`).join('')}</div><button class="narrative-add-event" data-narrative-add="${escapeAttr(track.key)}" data-narrative-kind="${kind}">＋ 登记剧情状态变化</button></section>`;
  }
  function narrativeMachineRows(){const pn=projectNarrativeData();return [...pn.events].sort((a,b)=>narrativeProjectPosition(a.episodeNo,a.shotNo)-narrativeProjectPosition(b.episodeNo,b.shotNo)).map((e,i)=>`<section class="state-machine-row"><div class="state-machine-index">${i+1}</div><div><b>EP ${String(e.episodeNo).padStart(2,'0')}${e.shotNo?` · Shot ${e.shotNo}`:''} · ${escapeHtml(e.name||narrativeTrack(e.kind,e.key).name)}</b><span>${escapeHtml(narrativeEventLabel(e))}</span><small>触发：${escapeHtml(e.reason)} · ${e.persist===false?'一次性状态':'保持到下一次合法变化'}</small></div><em>${e.kind==='character'?'角色状态':'场景状态'}</em></section>`).join('')}
  function openNarrativeBaseEditor(kind,key){const track=narrativeTrack(kind,key),labels=narrativeFieldLabels(kind);modalShell(`编辑${narrativeKindLabel(kind)}基础状态 · ${escapeHtml(track.name)}`,`<div class="narrative-editor"><p>基础状态不会修改 v3.1 的身份资产，只定义故事开始时的可变外观 / 环境。</p>${Object.keys(labels).map(k=>field(labels[k],`<input data-narrative-base-field="${k}" value="${escapeAttr(track.base?.[k]||'')}">`)).join('')}<div class="feature-actions"><button id="narrativeBaseCancel">取消</button><button id="narrativeBaseSave" class="primary">保存并标记受影响 Shot</button></div></div>`);$('#narrativeBaseCancel').onclick=()=>openNarrativeContinuityCenter(kind==='character'?'characters':'scenes');$('#narrativeBaseSave').onclick=()=>{const changes={};$$('[data-narrative-base-field]',featureModal).forEach(x=>changes[x.dataset.narrativeBaseField]=x.value.trim());const count=saveNarrativeBase(kind,key,changes);showToast(`基础状态已更新 · ${count} 个 Shot 待同步`);openNarrativeContinuityCenter(kind==='character'?'characters':'scenes')}}
  function openNarrativeEventEditor(kind,key,eventId=''){
    const track=narrativeTrack(kind,key),event=eventId?projectNarrativeData().events.find(e=>e.id===eventId):null,labels=narrativeFieldLabels(kind),ep=event?.episodeNo||1,shotNo=event?.shotNo||0;modalShell(`${event?'编辑':'登记'}剧情状态变化 · ${escapeHtml(track.name)}`,`<div class="narrative-editor event"><div class="narrative-event-grid">${field('发生剧集',`<input id="narrativeEventEpisode" type="number" min="1" value="${ep}">`)}${field('从 Shot 开始',`<input id="narrativeEventShot" type="number" min="0" value="${shotNo}" placeholder="0 = 本集起始">`)}</div><div class="narrative-change-grid">${Object.keys(labels).map(k=>field(labels[k],`<input data-narrative-change="${k}" value="${escapeAttr(event?.changes?.[k]||'')}" placeholder="不变化则留空">`)).join('')}</div>${field('剧情触发原因',`<textarea id="narrativeEventReason" rows="4" placeholder="例如：调查行动开始，她换上便于行动的黑色风衣">${escapeHtml(event?.reason||'')}</textarea>`,true)}<label class="toggle-row"><input id="narrativeEventPersist" type="checkbox" ${event?.persist===false?'':'checked'}>状态持续生效，直到下一次合法变化</label><div class="narrative-editor-hint">任何没有剧情事件支持的服装 / 发型 / 年龄 / 昼夜变化，都会被状态机判定为随机漂移。</div><div class="feature-actions"><button id="narrativeEventCancel">取消</button><button id="narrativeEventSave" class="primary">保存剧情事件</button></div></div>`,{wide:true});$('#narrativeEventCancel').onclick=()=>openNarrativeContinuityCenter(kind==='character'?'characters':'scenes');$('#narrativeEventSave').onclick=()=>{const changes={};$$('[data-narrative-change]',featureModal).forEach(x=>changes[x.dataset.narrativeChange]=x.value.trim());const result=upsertNarrativeEvent(kind,key,{episodeNo:Number($('#narrativeEventEpisode').value),shotNo:Number($('#narrativeEventShot').value),reason:$('#narrativeEventReason').value,persist:$('#narrativeEventPersist').checked,changes},eventId);if(!result.ok)return showToast(result.error);showToast(`剧情事件已保存 · ${result.affected} 个 Shot 待同步`);openNarrativeContinuityCenter(kind==='character'?'characters':'scenes')}}
  function openNarrativeAuditReport(){const stats=scanProjectNarrative(),issues=stats.issues;modalShell('剧情连续性状态机 · 检测报告',`<div class="narrative-audit"><div class="continuity-summary"><article><span>角色轨道</span><b>${stats.characterTracks}</b></article><article><span>场景轨道</span><b>${stats.sceneTracks}</b></article><article><span>剧情事件</span><b>${stats.events}</b></article><article class="${stats.errors?'danger':stats.warns?'warn':''}"><span>状态问题</span><b>${issues.length}</b></article></div><div class="narrative-audit-actions"><button id="narrativeAuditBack">← 状态中心</button><button id="narrativeAuditRescan">重新检测</button></div><div class="drift-list narrative">${issues.map(i=>`<section class="${i.level}"><i>${i.level==='error'?'!':'·'}</i><div><b>${escapeHtml(i.title)}</b><span>${escapeHtml(i.detail)}</span><small>${i.episodeNo?`EP ${String(i.episodeNo).padStart(2,'0')}${i.shotNo?` · Shot ${i.shotNo}`:''}`:'项目状态机'}</small></div>${i.scriptNodeId?`<button data-narrative-issue-shot="${escapeAttr(i.scriptNodeId)}|${escapeAttr(i.shotId||'')}">打开镜头</button>`:''}</section>`).join('')||'<div class="drift-clean"><b>✓ 剧情状态机检查通过</b><span>所有可变状态都有剧情依据，没有发现随机漂移。</span></div>'}</div></div>`,{full:true});$('#narrativeAuditBack').onclick=()=>openNarrativeContinuityCenter('machine');$('#narrativeAuditRescan').onclick=openNarrativeAuditReport;$$('[data-narrative-issue-shot]',featureModal).forEach(b=>b.onclick=()=>{const [sid,shotId]=b.dataset.narrativeIssueShot.split('|'),n=state.nodes.find(x=>x.id===sid);if(n)openScriptEditor(n,'state',shotId)})}
  function openNarrativeContinuityCenter(tab='characters'){
    ensureNarrativeTracks();const stats=projectNarrativeStats(),pn=projectNarrativeData(),characterTracks=Object.values(pn.characterTracks),sceneTracks=Object.values(pn.sceneTracks),content=tab==='characters'?characterTracks.map(t=>narrativeTimelineCardHtml('character',t)).join(''):tab==='scenes'?sceneTracks.map(t=>narrativeTimelineCardHtml('scene',t)).join(''):tab==='machine'?`<div class="state-machine-head"><div><b>剧情连续性状态机</b><span>Canonical Identity → Base State → Plot Event → Derived Shot State</span></div><button id="stateMachineAudit">运行状态机检测</button></div><div class="state-machine-flow"><span>身份资产锁定</span><i>→</i><span>基础状态</span><i>→</i><span>剧情事件</span><i>→</i><span>镜头期望状态</span><i>→</i><span>质检防漂移</span></div><div class="state-machine-list">${narrativeMachineRows()||'<div class="project-empty"><b>还没有剧情状态事件</b><span>角色换装、发型改变、时间跳跃、场景昼夜变化都应登记成事件。</span></div>'}</div>`:'';
    modalShell('角色 / 场景剧情状态时间线',`<div class="narrative-center"><div class="narrative-head"><div><b>${escapeHtml(state.projectName)}</b><span>v3.2 Narrative State Layer · 身份固定，但状态可以按剧情合理演进</span></div><div><button id="narrativeBackProject">← 项目总控</button><button id="narrativeOpenAssets">全剧身份资产</button></div></div><div class="narrative-kpis"><article><span>角色状态轨道</span><b>${stats.characterTracks}</b><small>服装 · 发型 · 年龄</small></article><article><span>场景状态轨道</span><b>${stats.sceneTracks}</b><small>昼夜 · 天气 · 光线</small></article><article><span>合法剧情变化</span><b>${stats.events}</b><small>均需记录剧情原因</small></article><article class="${stats.errors?'danger':stats.warns?'warn':''}"><span>随机漂移</span><b>${stats.errors}</b><small>${stats.warns} 个待同步提醒</small></article></div><div class="narrative-tabs"><button data-narrative-tab="characters" class="${tab==='characters'?'active':''}">角色状态时间线</button><button data-narrative-tab="scenes" class="${tab==='scenes'?'active':''}">场景昼夜状态</button><button data-narrative-tab="machine" class="${tab==='machine'?'active':''}">剧情连续性状态机</button><button id="narrativeAudit">检测报告 · ${stats.issues.length}</button></div><div class="narrative-track-list">${content||'<div class="project-empty"><b>暂无状态轨道</b><span>先在各集脚本中创建角色 / 场景资产。</span></div>'}</div></div>`,{full:true});
    $('#narrativeBackProject').onclick=openProjectProductionDashboard;$('#narrativeOpenAssets').onclick=()=>openProjectConsistencyCenter('all');$$('[data-narrative-tab]',featureModal).forEach(b=>b.onclick=()=>openNarrativeContinuityCenter(b.dataset.narrativeTab));$('#narrativeAudit').onclick=openNarrativeAuditReport;$('#stateMachineAudit')?.addEventListener('click',openNarrativeAuditReport);$$('[data-narrative-add]',featureModal).forEach(b=>b.onclick=()=>openNarrativeEventEditor(b.dataset.narrativeKind,b.dataset.narrativeAdd));$$('[data-narrative-edit]',featureModal).forEach(b=>b.onclick=()=>{const e=projectNarrativeData().events.find(x=>x.id===b.dataset.narrativeEdit);if(e)openNarrativeEventEditor(e.kind,e.key,e.id)});$$('[data-narrative-delete]',featureModal).forEach(b=>b.onclick=()=>{const e=projectNarrativeData().events.find(x=>x.id===b.dataset.narrativeDelete);if(e&&confirm(`删除“${e.reason}”状态事件？`)){deleteNarrativeEvent(e.id);openNarrativeContinuityCenter(e.kind==='character'?'characters':'scenes')}});$$('[data-narrative-base]',featureModal).forEach(b=>b.onclick=()=>openNarrativeBaseEditor(b.dataset.narrativeKind,b.dataset.narrativeBase));
  }
  function scriptNarrativeHtml(n,d){const ep=projectEpisodeNumber(n);return `<div class="script-state-toolbar"><div><b>EP ${String(ep).padStart(2,'0')} · 剧情状态</b><span>每个 Shot 的服装 / 发型 / 年龄 / 昼夜状态由全剧状态机推导。</span></div><button id="openNarrativeCenterFromScript">全剧状态时间线</button><button id="scriptNarrativeAudit">状态机检测</button></div><div class="script-state-list">${(d.shots||[]).map(shot=>{const ex=narrativeExpectedForShot(n,shot),issues=narrativeIssuesForShot(n,shot),chars=Object.entries(ex.characters).map(([name,v])=>`<span><b>${escapeHtml(name)}</b>${escapeHtml(v.wardrobe)} · ${escapeHtml(v.hair)} · ${escapeHtml(v.age)}</span>`).join(''),scene=ex.scene?`<span><b>${escapeHtml(ex.scene.name)}</b>${escapeHtml(ex.scene.timeOfDay)} · ${escapeHtml(ex.scene.weather)} · ${escapeHtml(ex.scene.lighting)}</span>`:'<span>未绑定场景状态</span>';return `<section class="script-state-shot ${issues.some(i=>i.level==='error')?'error':issues.length?'warn':''}" data-state-shot="${shot.id}"><header><b>Shot ${shot.no}</b><span>${escapeHtml(shot.action||'')}</span><button data-shot-state="${shot.id}">查看 / 校验状态</button></header><div class="script-state-columns"><div><small>角色期望状态</small>${chars||'<span>无角色</span>'}</div><div><small>场景期望状态</small>${scene}</div></div>${issues.map(i=>`<div class="state-inline-issue ${i.level}">${escapeHtml(i.title)} · ${escapeHtml(i.detail)}</div>`).join('')}</section>`}).join('')}</div>`}
  function openShotNarrativeState(scriptNode,shotId){const d=ensureScriptData(scriptNode),shot=d.shots.find(s=>s.id===shotId);if(!shot)return;const expected=narrativeExpectedForShot(scriptNode,shot),manual=shot.narrativeOverride||{characters:{},scene:{}},charRows=Object.entries(expected.characters).map(([name,v])=>`<section><b>${escapeHtml(name)}</b>${['wardrobe','hair','age'].map(k=>field(narrativeFieldLabels('character')[k],`<input data-shot-char="${escapeAttr(name)}" data-shot-state-field="${k}" value="${escapeAttr(manual.characters?.[name]?.[k]||'')}" placeholder="留空 = ${escapeAttr(v[k]||'')}">`)).join('')}</section>`).join(''),sceneRows=expected.scene?`<section><b>${escapeHtml(expected.scene.name)}</b>${['timeOfDay','weather','lighting'].map(k=>field(narrativeFieldLabels('scene')[k],`<input data-shot-scene="1" data-shot-state-field="${k}" value="${escapeAttr(manual.scene?.[k]||'')}" placeholder="留空 = ${escapeAttr(expected.scene[k]||'')}">`)).join('')}</section>`:'';modalShell(`Shot ${shot.no} · 剧情状态校验`,`<div class="shot-state-review"><div class="shot-state-expected"><h3>状态机期望</h3><pre>${escapeHtml(narrativeStatePrompt(scriptNode,shot)||'无状态约束')}</pre></div><div class="shot-state-observed"><h3>记录画面实际 / 人工状态</h3><p>仅当生成画面真的出现不同状态时填写。与状态机不同且没有剧情事件支持，会被判为随机漂移。</p>${charRows}${sceneRows}</div><div class="feature-actions"><button id="shotStateClear">清除人工状态</button><button id="shotStateAddEvent">从状态时间线登记合法变化</button><button id="shotStateSave" class="primary">保存并校验</button></div></div>`,{wide:true});$('#shotStateClear').onclick=()=>{shot.narrativeOverride=null;saveState();openScriptEditor(scriptNode,'state',shot.id)};$('#shotStateAddEvent').onclick=()=>{const first=Object.values(expected.characters)[0];if(first)openNarrativeEventEditor('character',first.key);else if(expected.scene)openNarrativeEventEditor('scene',expected.scene.key);else showToast('该 Shot 没有可登记状态的角色或场景')};$('#shotStateSave').onclick=()=>{const override={characters:{},scene:{}};$$('[data-shot-char]',featureModal).forEach(x=>{const name=x.dataset.shotChar;override.characters[name]=override.characters[name]||{};if(x.value.trim())override.characters[name][x.dataset.shotStateField]=x.value.trim()});$$('[data-shot-scene]',featureModal).forEach(x=>{if(x.value.trim())override.scene[x.dataset.shotStateField]=x.value.trim()});shot.narrativeOverride=(Object.keys(override.characters).length||Object.keys(override.scene).length)?override:null;saveState();const issues=narrativeIssuesForShot(scriptNode,shot);showToast(issues.some(i=>i.level==='error')?'检测到随机状态漂移，请登记剧情事件':'镜头状态与剧情状态机一致');openScriptEditor(scriptNode,'state',shot.id)}}

  function episodeQualityStats(scriptNode){
    const d=ensureScriptData(scriptNode),shots=d.shots||[],records=shots.map(shot=>({shot,q:ensureShotQuality(scriptNode,shot),issues:shotContinuityIssues(scriptNode,shot)}));
    const passedSlots=records.reduce((n,r)=>n+(r.q.image==='pass'?1:0)+(r.q.video==='pass'?1:0),0),reworkSlots=records.reduce((n,r)=>n+(r.q.image==='rework'?1:0)+(r.q.video==='rework'?1:0),0);
    return{records,totalSlots:shots.length*2,passedSlots,reworkSlots,approvedShots:records.filter(r=>r.q.image==='pass'&&r.q.video==='pass').length,issueCount:records.reduce((n,r)=>n+r.issues.length,0),errorCount:records.reduce((n,r)=>n+r.issues.filter(i=>i.level==='error').length,0),dirtyCount:shots.filter(x=>x.promptDirty).length};
  }
  function episodeProductionStats(scriptNode){
    const d=ensureScriptData(scriptNode),rows=d.shots.map(shot=>{const image=latestShotProductionNode(scriptNode.id,shot.id,'image'),video=latestShotProductionNode(scriptNode.id,shot.id,'video');return{shot,image,video,imageStatus:productionStatusMeta(image),videoStatus:productionStatusMeta(video),quality:ensureShotQuality(scriptNode,shot),issues:shotContinuityIssues(scriptNode,shot)}}),quality=episodeQualityStats(scriptNode);
    return{rows,total:rows.length,imageDone:rows.filter(r=>['succeeded','frozen'].includes(r.imageStatus.key)).length,videoDone:rows.filter(r=>['succeeded','frozen'].includes(r.videoStatus.key)).length,failed:rows.filter(r=>r.imageStatus.key==='failed'||r.videoStatus.key==='failed').length,running:rows.filter(r=>r.imageStatus.key==='running'||r.videoStatus.key==='running'||r.imageStatus.key==='pending'||r.videoStatus.key==='pending').length,quality};
  }
  function episodeQualityCellHtml(scriptNode,row){const s=row.shot,q=row.quality;const btn=(type)=>`<button data-ep-review="${s.id}" data-ep-review-type="${type}" class="quality-${q[type]}">${type==='image'?'图':'视频'} · ${qualityStatusLabel(q[type])}</button>`;return `<div class="episode-quality-cell">${btn('image')}${btn('video')}<small class="${row.issues.some(i=>i.level==='error')?'error':''}">${row.issues.length?`${row.issues.length} 个连续性提醒`:'连续性通过'}</small></div>`}
  function episodeDashboardRow(scriptNode,row){const s=row.shot,img=row.image,vid=row.video;const nodeCell=(node,meta,type)=>`<div class="episode-node-state ${meta.key}"><b>${meta.label}</b><span>${node?`${nodeResultVersions(node).length||0} 候选${node.frozen?' · 冻结':''}`:'尚未创建'}</span><div>${node?`<button data-ep-locate="${s.id}" data-ep-type="${type}">定位</button>`:''}<button data-ep-rerun="${s.id}" data-ep-type="${type}">重新生成</button>${node&&nodeResultVersions(node).length>1?`<button data-ep-candidates="${node.id}">候选</button>`:''}</div></div>`;return `<tr><td><b>Shot ${s.no}</b><small>${escapeHtml(s.shotSize||'')} · ${Number(s.duration||0)}s</small></td><td>${escapeHtml((s.action||'').slice(0,100))}</td><td>${nodeCell(img,row.imageStatus,'image')}</td><td>${nodeCell(vid,row.videoStatus,'video')}</td><td>${episodeQualityCellHtml(scriptNode,row)}</td></tr>`}
  function openShotQualityReview(scriptNode,shotId,type){
    const d=ensureScriptData(scriptNode),shot=d.shots.find(s=>s.id===shotId);if(!shot)return;const node=latestShotProductionNode(scriptNode.id,shot.id,type),q=ensureShotQuality(scriptNode,shot);if(!node||!nodeResultVersions(node).length)return showToast(`Shot ${shot.no} 还没有可审核的${type==='video'?'视频':'分镜图'}结果`);
    const versions=nodeResultVersions(node);let selected=activeResultVersionId(node)||versions.at(-1)?.id;const draw=()=>{const v=versions.find(x=>x.id===selected)||versions.at(-1),host=$('#qualityPreview',featureModal);if(host)host.innerHTML=resultVersionPreviewHtml(node,v);$$('[data-quality-version]',featureModal).forEach(b=>b.classList.toggle('selected',b.dataset.qualityVersion===selected));$('#qualityCurrentMeta',featureModal).textContent=`候选 ${Math.max(1,versions.findIndex(x=>x.id===selected)+1)}/${versions.length} · ${v?.modelName||node.modelName||''}`};
    modalShell(`Shot ${shot.no} · ${type==='video'?'视频':'分镜图'}质检`,`<div class="quality-review"><div class="quality-review-main"><div id="qualityPreview" class="quality-preview"></div><div id="qualityCurrentMeta" class="quality-meta"></div><div class="quality-version-strip">${versions.map((v,i)=>`<button data-quality-version="${v.id}" class="${v.id===selected?'selected':''}"><span>${i+1}</span>${node.type==='image'&&v.outputUrl?`<img src="${escapeAttr(v.outputUrl)}">`:node.type==='video'&&v.outputUrl?`<video src="${escapeAttr(v.outputUrl)}" muted></video>`:'<i>结果</i>'}</button>`).join('')}</div></div><aside class="quality-inspector"><h3>质检门禁</h3><div class="quality-state current-${q[type]}"><span>当前状态</span><b>${qualityStatusLabel(q[type])}</b></div><label>审核备注<textarea id="qualityNote" rows="7" placeholder="记录人物一致性、动作、构图、口型、运镜等问题">${escapeHtml(q.note||'')}</textarea></label><div class="continuity-mini">${shotContinuityIssues(scriptNode,shot).map(i=>`<div class="${i.level}"><b>${escapeHtml(i.title)}</b><span>${escapeHtml(i.detail)}</span></div>`).join('')||'<div class="ok"><b>连续性预检通过</b><span>没有发现结构性问题</span></div>'}</div><button id="qualityPending">设为未审核</button><button id="qualityRework" class="danger">标记需重做</button><button id="qualityPass" class="primary">通过并冻结此版本</button></aside></div>`,{full:true});
    $$('[data-quality-version]',featureModal).forEach(b=>b.onclick=()=>{selected=b.dataset.qualityVersion;applyNodeResultVersionRaw(node,selected);saveState();draw()});
    const saveStatus=(status,freeze=false)=>{snapshot('Shot 质检');q[type]=status;q.note=$('#qualityNote').value.trim();q.updatedAt=new Date().toISOString();q.approvedVersionIds[type]=status==='pass'?selected:'';if(freeze)node.frozen=true;else if(status==='rework')node.frozen=false;saveState();closeFeatureModal();showToast(status==='pass'?'已通过并冻结当前结果':status==='rework'?'已标记需重做':'已恢复为未审核');openEpisodeDashboard(scriptNode)};
    $('#qualityPending').onclick=()=>saveStatus('pending');$('#qualityRework').onclick=()=>saveStatus('rework');$('#qualityPass').onclick=()=>saveStatus('pass',true);draw();
  }
  function openContinuityAudit(scriptNode){
    const d=ensureScriptData(scriptNode),rows=d.shots.map(shot=>({shot,issues:shotContinuityIssues(scriptNode,shot)})),all=rows.flatMap(r=>r.issues),errors=all.filter(i=>i.level==='error').length,warns=all.filter(i=>i.level==='warn').length,dirty=rows.filter(r=>r.shot.promptDirty).map(r=>r.shot.id);
    modalShell('连续性与变更影响检查',`<div class="continuity-audit"><div class="continuity-summary"><article><span>镜头</span><b>${rows.length}</b></article><article><span>阻断问题</span><b>${errors}</b></article><article><span>提醒</span><b>${warns}</b></article><article><span>提示词待同步</span><b>${dirty.length}</b></article></div><div class="continuity-actions"><button id="continuitySync" ${dirty.length?'':'disabled'}>同步受影响提示词</button><button id="continuityRerunImages" ${dirty.length?'':'disabled'}>重跑受影响分镜图</button><button id="continuityRerunVideos" ${dirty.length?'':'disabled'}>重跑受影响视频</button></div><div class="continuity-list">${rows.map(r=>`<section class="${r.issues.length?'has-issues':'clean'}"><header><b>Shot ${r.shot.no}</b><span>${escapeHtml(r.shot.scene||'未写场景')} · ${escapeHtml(r.shot.characters||'未写角色')}</span><button data-continuity-shot="${r.shot.id}">打开镜头</button></header>${r.issues.map(i=>`<div class="continuity-issue ${i.level}"><i>${i.level==='error'?'!':'·'}</i><div><b>${escapeHtml(i.title)}</b><span>${escapeHtml(i.detail)}</span></div></div>`).join('')||'<div class="continuity-ok">结构检查通过</div>'}</section>`).join('')}</div></div>`,{full:true});
    $$('[data-continuity-shot]',featureModal).forEach(b=>b.onclick=()=>openScriptEditor(scriptNode,'shots',b.dataset.continuityShot));$('#continuitySync').onclick=()=>{synthesizeScriptPrompts(scriptNode);openContinuityAudit(scriptNode)};$('#continuityRerunImages').onclick=async()=>{if(!dirty.length)return;await regenerateScriptShots(scriptNode,dirty,'image');openContinuityAudit(scriptNode)};$('#continuityRerunVideos').onclick=async()=>{if(!dirty.length)return;await regenerateScriptShots(scriptNode,dirty,'video');openContinuityAudit(scriptNode)};
  }
  function captureProductionBaseline(scriptNode){
    const d=ensureScriptData(scriptNode),quality=episodeQualityStats(scriptNode);if(quality.errorCount)return showToast('仍有阻断级连续性问题，不能创建生产基线');if(quality.approvedShots<d.shots.length)return showToast('所有 Shot 的分镜图和视频都通过质检后才能创建基线');
    d.quality=d.quality||{shots:{}};d.quality.baseline={id:uid('baseline'),createdAt:new Date().toISOString(),shots:d.shots.map(shot=>{const img=latestShotProductionNode(scriptNode.id,shot.id,'image'),vid=latestShotProductionNode(scriptNode.id,shot.id,'video');return{shotId:shot.id,no:shot.no,imageVersionId:activeResultVersionId(img),videoVersionId:activeResultVersionId(vid)}})};saveState();showToast('已创建整集生产基线，后续版本变化会被连续性检查捕获');openEpisodeDashboard(scriptNode);
  }
  function openEpisodeDashboard(scriptNode){
    const stats=episodeProductionStats(scriptNode),q=stats.quality,pct=stats.total?Math.round((stats.imageDone+stats.videoDone)/(stats.total*2)*100):0,qualityPct=q.totalSlots?Math.round(q.passedSlots/q.totalSlots*100):0,baseline=ensureScriptData(scriptNode).quality?.baseline;
    modalShell('整集生产看板',`<div class="episode-dashboard"><div class="episode-summary six"><article><span>镜头</span><b>${stats.total}</b></article><article><span>分镜完成</span><b>${stats.imageDone}/${stats.total}</b></article><article><span>视频完成</span><b>${stats.videoDone}/${stats.total}</b></article><article><span>质检通过</span><b>${q.approvedShots}/${stats.total}</b></article><article><span>生成中</span><b>${stats.running}</b></article><article class="${stats.failed||q.errorCount?'danger':''}"><span>失败 / 阻断</span><b>${stats.failed} / ${q.errorCount}</b></article></div><div class="episode-progress dual"><i style="width:${pct}%"></i><span>整集生产 ${pct}% · 质检 ${qualityPct}%${baseline?' · 已建立基线':''}</span></div><div class="episode-dashboard-actions"><button id="episodeContinue">${uiIcon('play')}<span>继续未完成</span></button><button id="episodeRetryFailed" ${stats.failed?'':'disabled'}>${uiIcon('refresh')}<span>重跑失败</span></button><button id="episodeContinuity">单集连续性 · ${q.issueCount}</button><button id="episodeProjectConsistency">跨集一致性</button><button id="episodeNarrativeState">剧情状态机</button><button id="episodeBaseline" ${q.approvedShots===stats.total&&q.errorCount===0?'':'disabled'}>${baseline?'更新生产基线':'建立生产基线'}</button><button id="episodeOpenBatch">批量生产线</button><button id="episodeRefresh">刷新</button></div><div class="episode-table-wrap"><table class="episode-table v30"><thead><tr><th>镜头</th><th>画面</th><th>分镜图</th><th>视频</th><th>质检 / 连续性</th></tr></thead><tbody>${stats.rows.map(r=>episodeDashboardRow(scriptNode,r)).join('')}</tbody></table></div></div>`,{full:true});
    $$('[data-ep-locate]',featureModal).forEach(b=>b.onclick=()=>focusShotProductionNode(scriptNode,b.dataset.epLocate,b.dataset.epType));$$('[data-ep-rerun]',featureModal).forEach(b=>b.onclick=async()=>{await regenerateScriptShots(scriptNode,[b.dataset.epRerun],b.dataset.epType);openEpisodeDashboard(scriptNode)});$$('[data-ep-candidates]',featureModal).forEach(b=>b.onclick=()=>openBatchCandidateView([b.dataset.epCandidates]));$$('[data-ep-review]',featureModal).forEach(b=>b.onclick=()=>openShotQualityReview(scriptNode,b.dataset.epReview,b.dataset.epReviewType));
    $('#episodeRefresh').onclick=()=>openEpisodeDashboard(scriptNode);$('#episodeOpenBatch').onclick=()=>openScriptEditor(scriptNode,'batch-image');$('#episodeContinuity').onclick=()=>openContinuityAudit(scriptNode);$('#episodeProjectConsistency').onclick=()=>openProjectConsistencyCenter('all');$('#episodeNarrativeState').onclick=()=>openScriptEditor(scriptNode,'state');$('#episodeBaseline').onclick=()=>captureProductionBaseline(scriptNode);$('#episodeRetryFailed').onclick=async()=>{const ids=stats.rows.flatMap(r=>[r.image,r.video]).filter(n=>n&&productionStatusMeta(n).key==='failed').map(n=>n.id);if(ids.length)await executeWorkflowIds(ids,{title:'整集失败镜头重跑',force:true});openEpisodeDashboard(scriptNode)};$('#episodeContinue').onclick=async()=>{const imageShots=stats.rows.filter(r=>!r.image||!['succeeded','frozen'].includes(productionStatusMeta(r.image).key)).map(r=>r.shot.id);const videoShots=stats.rows.filter(r=>!r.video||!['succeeded','frozen'].includes(productionStatusMeta(r.video).key)).map(r=>r.shot.id);if(!imageShots.length&&!videoShots.length){showToast('当前已没有未完成镜头');return openEpisodeDashboard(scriptNode)}if(imageShots.length){showToast(`继续分镜图 · ${imageShots.length} 个 Shot`);await regenerateScriptShots(scriptNode,imageShots,'image')}if(videoShots.length){showToast(`继续分镜视频 · ${videoShots.length} 个 Shot`);await regenerateScriptShots(scriptNode,videoShots,'video')}openEpisodeDashboard(scriptNode)};
  }
  function projectEpisodeStats(scriptNode,index){const p=episodeProductionStats(scriptNode),q=p.quality,totalSlots=Math.max(1,p.total*2),productionPct=Math.round((p.imageDone+p.videoDone)/totalSlots*100),qualityPct=Math.round(q.passedSlots/totalSlots*100);return{scriptNode,index,p,q,productionPct,qualityPct,ready:p.total>0&&p.videoDone===p.total&&q.approvedShots===p.total&&q.errorCount===0}}
  function openProjectProductionDashboard(){
    const scripts=projectScriptNodes(),episodes=scripts.map(projectEpisodeStats),shots=episodes.reduce((a,x)=>a+x.p.total,0),videoDone=episodes.reduce((a,x)=>a+x.p.videoDone,0),approved=episodes.reduce((a,x)=>a+x.q.approvedShots,0),failed=episodes.reduce((a,x)=>a+x.p.failed,0),issues=episodes.reduce((a,x)=>a+x.q.issueCount,0),dirty=episodes.reduce((a,x)=>a+x.q.dirtyCount,0),ready=episodes.filter(x=>x.ready).length,consistency=projectConsistencyStats(),narrative=projectNarrativeStats();
    modalShell('项目生产总控',`<div class="project-production"><div class="project-production-head"><div><b>${escapeHtml(state.projectName)}</b><span>${scripts.length} 集 · ${shots} 个镜头 · 从脚本到质检的一站式生产状态</span>${projectConsistencyBadgeHtml()}${projectNarrativeBadgeHtml()}</div><div class="project-head-actions"><button id="projectNarrative" class="primary">剧情状态时间线</button><button id="projectConsistency">身份资产一致性</button><button id="projectRefresh">刷新状态</button></div></div><div class="project-kpis seven"><article><span>剧集</span><b>${scripts.length}</b><small>${ready} 集可交付</small></article><article><span>视频完成</span><b>${videoDone}/${shots}</b><small>跨全部剧集</small></article><article><span>质检通过镜头</span><b>${approved}/${shots}</b><small>图 + 视频均通过</small></article><article><span>资产锁定</span><b>${consistency.locked}</b><small>${consistency.characters} 角色 · ${consistency.scenes} 场景</small></article><article><span>剧情状态事件</span><b>${narrative.events}</b><small>${narrative.characterTracks} 角色轨 · ${narrative.sceneTracks} 场景轨</small></article><article class="${failed?'danger':''}"><span>生成失败</span><b>${failed}</b><small>可进入单集重跑</small></article><article class="${consistency.errors||narrative.errors?'danger':consistency.issues.length||narrative.issues.length||issues?'warn':''}"><span>一致性问题</span><b>${consistency.issues.length + narrative.issues.length + issues}</b><small>${consistency.errors+narrative.errors} 项目阻断 · ${dirty} 提示词受影响</small></article></div>${scripts.length?`<div class="project-episode-list">${episodes.map(x=>{const epDrift=consistency.issues.filter(i=>i.scriptNodeId===x.scriptNode.id).length,epNarrative=narrative.issues.filter(i=>i.scriptNodeId===x.scriptNode.id).length;return `<section class="project-episode-row ${x.ready?'ready':''}"><div class="episode-index">EP ${String(x.index+1).padStart(2,'0')}</div><div class="episode-title"><b>${escapeHtml(x.scriptNode.title||`第 ${x.index+1} 集`)}</b><span>${x.p.total} 镜头 · ${x.p.videoDone}/${x.p.total} 视频完成 · ${x.q.approvedShots}/${x.p.total} 质检通过</span></div><div class="episode-meter"><label><span>生产</span><b>${x.productionPct}%</b></label><div><i style="width:${x.productionPct}%"></i></div><label><span>质检</span><b>${x.qualityPct}%</b></label><div class="quality"><i style="width:${x.qualityPct}%"></i></div></div><div class="episode-health"><span class="${x.p.failed?'bad':'good'}">${x.p.failed?`${x.p.failed} 失败`:'生成正常'}</span><span class="${x.q.errorCount||epDrift||epNarrative?'bad':x.q.issueCount?'warn':'good'}">${epNarrative?`${epNarrative} 状态漂移`:epDrift?`${epDrift} 跨集漂移`:x.q.errorCount?`${x.q.errorCount} 阻断`:x.q.issueCount?`${x.q.issueCount} 提醒`:'连续性通过'}</span></div><div class="episode-actions"><button data-project-focus="${x.scriptNode.id}">定位脚本</button><button data-project-audit="${x.scriptNode.id}">单集连续性</button><button data-project-episode="${x.scriptNode.id}" class="primary">整集看板</button></div></section>`}).join('')}</div>`:'<div class="project-empty"><b>还没有脚本节点</b><span>创建脚本后，这里会自动汇总每一集的分镜、视频、质检与连续性状态。</span><button id="projectCreateScript">＋ 创建第一集脚本</button></div>'}</div>`,{full:true});
    $('#projectRefresh').onclick=openProjectProductionDashboard;$('#projectNarrative').onclick=()=>openNarrativeContinuityCenter('characters');$('#projectConsistency').onclick=()=>openProjectConsistencyCenter('all');$$('[data-project-focus]',featureModal).forEach(b=>b.onclick=()=>{closeFeatureModal();focusNode(b.dataset.projectFocus)});$$('[data-project-audit]',featureModal).forEach(b=>b.onclick=()=>{const n=state.nodes.find(x=>x.id===b.dataset.projectAudit);if(n)openContinuityAudit(n)});$$('[data-project-episode]',featureModal).forEach(b=>b.onclick=()=>{const n=state.nodes.find(x=>x.id===b.dataset.projectEpisode);if(n)openEpisodeDashboard(n)});$('#projectCreateScript')?.addEventListener('click',()=>{closeFeatureModal();const r=viewport.getBoundingClientRect(),p=screenToWorld(r.left+r.width/2,r.top+r.height/2);addNode('script',p)});
  }

  function ensureDirectorData(n){
    if(n.directorData) return n.directorData;
    n.directorData={
      view:'director', mode:'move', snap:false, camera:{x:0,y:2.2,z:7,fov:50,target:''}, panorama:'',
      objects:[
        {id:uid('obj'),type:'character',name:'角色 01',x:-1.3,y:0,z:0,rx:0,ry:15,rz:0,sx:1,sy:1,sz:1,color:'#b9c8d8',visible:true,pose:'站立'},
        {id:uid('obj'),type:'cube',name:'方块道具',x:1.4,y:0,z:-.5,rx:0,ry:0,rz:0,sx:1.4,sy:.7,sz:1,color:'#c6a97d',visible:true},
        {id:uid('obj'),type:'camera',name:'机位 A',x:0,y:2.2,z:7,rx:-8,ry:0,rz:0,sx:1,sy:1,sz:1,color:'#79d6c3',visible:true}
      ], selectedObjectId:null, screenshots:[], paths:[]
    };
    return n.directorData;
  }

  function mediaTransformStyle(n){
    const sx=n.mirrorX?-1:1, sy=n.mirrorY?-1:1;
    return `transform:rotate(${Number(n.rotation||0)}deg) scale(${sx},${sy});`;
  }

  function nodeResultVersions(n){return Array.isArray(n?.resultVersions)?n.resultVersions:[]}
  function activeNodeResultIndex(n){const vs=nodeResultVersions(n);if(!vs.length)return-1;const i=vs.findIndex(v=>v.id===n.activeResultVersionId);return i>=0?i:0}
  function applyNodeResultVersion(n,versionId,{quiet=false}={}){const vs=nodeResultVersions(n),v=vs.find(x=>x.id===versionId);if(!v)return false;snapshot('切换生成结果');applyNodeResultVersionRaw(n,versionId);saveState();render();if(!quiet)showToast(`已切换到结果 ${vs.indexOf(v)+1}/${vs.length}`);return true}
  function stepNodeResultVersion(n,delta){const vs=nodeResultVersions(n);if(vs.length<2)return;const i=activeNodeResultIndex(n),next=(i+delta+vs.length)%vs.length;applyNodeResultVersion(n,vs[next].id)}
  function resultVersionPreviewHtml(n,v){if(n.type==='image')return v.outputUrl?`<img src="${escapeAttr(v.outputUrl)}" alt="结果版本">`:`<div class="version-empty">无图片</div>`;if(n.type==='video')return v.outputUrl?`<video src="${escapeAttr(v.outputUrl)}" controls muted preload="metadata"></video>`:`<div class="version-empty">无视频</div>`;if(n.type==='audio')return v.outputUrl?`<audio src="${escapeAttr(v.outputUrl)}" controls></audio>`:`<div class="version-empty">无音频</div>`;const value=v.text||v.generatedText||(v.generatedResult&&typeof v.generatedResult==='object'?JSON.stringify(v.generatedResult,null,2):String(v.generatedResult??''));return `<pre>${escapeHtml(value)}</pre>`}
  function openNodeVersionCompare(n){const vs=nodeResultVersions(n);if(vs.length<2){showToast('至少生成两个结果版本后才能对比');return}const active=Math.max(0,activeNodeResultIndex(n));let leftId=vs[active]?.id||vs.at(-1)?.id||vs[0].id,rightId=vs[Math.max(0,active-1)]?.id||vs.find(v=>v.id!==leftId)?.id||vs[0].id;if(rightId===leftId)rightId=vs.find(v=>v.id!==leftId)?.id||leftId;const option=id=>vs.map((v,i)=>`<option value="${escapeAttr(v.id)}" ${v.id===id?'selected':''}>结果 ${i+1} · ${new Date(v.createdAt||Date.now()).toLocaleString()}${v.modelName?` · ${escapeHtml(v.modelName)}`:''}</option>`).join('');const draw=()=>{const a=vs.find(v=>v.id===leftId)||vs[0],b=vs.find(v=>v.id===rightId)||vs[1];$('#versionCompareLeft',featureModal).innerHTML=resultVersionPreviewHtml(n,a);$('#versionCompareRight',featureModal).innerHTML=resultVersionPreviewHtml(n,b);$('#versionCompareMetaLeft',featureModal).innerHTML=`<b>${escapeHtml(a.modelName||'')}</b><span>${escapeHtml((a.prompt||'').slice(0,160))}</span>`;$('#versionCompareMetaRight',featureModal).innerHTML=`<b>${escapeHtml(b.modelName||'')}</b><span>${escapeHtml((b.prompt||'').slice(0,160))}</span>`};modalShell('生成结果版本对比',`<div class="version-compare"><div class="version-compare-head"><label>左侧<select id="versionLeftSelect">${option(leftId)}</select></label><label>右侧<select id="versionRightSelect">${option(rightId)}</select></label></div><div class="version-compare-grid"><section><div id="versionCompareLeft" class="version-preview"></div><div id="versionCompareMetaLeft" class="version-meta"></div><button id="useVersionLeft">切换到左侧版本</button></section><section><div id="versionCompareRight" class="version-preview"></div><div id="versionCompareMetaRight" class="version-meta"></div><button id="useVersionRight">切换到右侧版本</button></section></div></div>`,{wide:true});draw();$('#versionLeftSelect',featureModal).onchange=e=>{leftId=e.target.value;draw()};$('#versionRightSelect',featureModal).onchange=e=>{rightId=e.target.value;draw()};$('#useVersionLeft',featureModal).onclick=()=>{closeFeatureModal();applyNodeResultVersion(n,leftId)};$('#useVersionRight',featureModal).onclick=()=>{closeFeatureModal();applyNodeResultVersion(n,rightId)}}
  function applyNodeResultVersionRaw(n,versionId){const vs=nodeResultVersions(n),v=vs.find(x=>x.id===versionId);if(!v)return false;n.activeResultVersionId=v.id;if(Object.prototype.hasOwnProperty.call(v,'outputUrl'))n.outputUrl=v.outputUrl||'';if(n.type==='text'&&Object.prototype.hasOwnProperty.call(v,'text'))n.text=v.text||'';if(Object.prototype.hasOwnProperty.call(v,'generatedText'))n.generatedText=v.generatedText||'';if(Object.prototype.hasOwnProperty.call(v,'generatedResult'))n.generatedResult=v.generatedResult;return true}
  function candidatePreviewHtml(n,v){if(!v)return'<div class="candidate-empty">没有结果</div>';if(n.type==='image')return v.outputUrl?`<img src="${escapeAttr(v.outputUrl)}" alt="候选结果">`:'<div class="candidate-empty">无图片</div>';if(n.type==='video')return v.outputUrl?`<video src="${escapeAttr(v.outputUrl)}" muted preload="metadata"></video>`:'<div class="candidate-empty">无视频</div>';if(n.type==='audio')return'<div class="candidate-audio">♫ 音频结果</div>';const t=v.text||v.generatedText||(typeof v.generatedResult==='string'?v.generatedResult:'');return`<div class="candidate-text">${escapeHtml(String(t||'').slice(0,180))}</div>`}
  function openBatchCandidateView(ids){ids=[...new Set(ids||[])].map(id=>state.nodes.find(n=>n.id===id)).filter(n=>n&&nodeResultVersions(n).length);if(!ids.length)return showToast('选中范围还没有生成结果');const picks=new Map(ids.map(n=>[n.id,n.activeResultVersionId||nodeResultVersions(n).at(-1)?.id]));const draw=()=>{const host=$('#batchCandidateGrid',featureModal);if(!host)return;host.innerHTML=ids.map(n=>{const vs=nodeResultVersions(n);return`<section class="candidate-node-card"><header><div><b>${escapeHtml(n.title||labelForType(n.type))}</b><span>${vs.length} 个候选</span></div><em>${escapeHtml(n.modelName||'')}</em></header><div class="candidate-version-grid">${vs.map((v,i)=>`<button class="candidate-version ${picks.get(n.id)===v.id?'selected':''}" data-candidate-node="${n.id}" data-candidate-version="${v.id}"><div>${candidatePreviewHtml(n,v)}</div><span>结果 ${i+1}<small>${new Date(v.createdAt||Date.now()).toLocaleTimeString()}</small></span></button>`).join('')}</div></section>`}).join('');$$('[data-candidate-version]',host).forEach(b=>b.onclick=()=>{picks.set(b.dataset.candidateNode,b.dataset.candidateVersion);draw()});$('#candidateCount',featureModal).textContent=`已选择 ${picks.size} / ${ids.length} 个节点`};modalShell('批量候选结果',`<div class="candidate-toolbar"><div><b>批量挑选生成结果</b><span id="candidateCount"></span></div><button id="candidateLatest">全部选择最新</button><button id="candidateCurrent">恢复当前选择</button><button id="candidateApply" class="primary">应用到画布</button></div><div id="batchCandidateGrid" class="batch-candidate-grid"></div>`,{full:true});const initial=new Map(picks);$('#candidateLatest',featureModal).onclick=()=>{ids.forEach(n=>picks.set(n.id,nodeResultVersions(n).at(-1)?.id));draw()};$('#candidateCurrent',featureModal).onclick=()=>{picks.clear();initial.forEach((v,k)=>picks.set(k,v));draw()};$('#candidateApply',featureModal).onclick=()=>{snapshot('批量切换生成结果');ids.forEach(n=>applyNodeResultVersionRaw(n,picks.get(n.id)));saveState();closeFeatureModal();render();showToast(`已应用 ${ids.length} 个节点的候选结果`)};draw()}
  function modelPricing(n){const m=modelForNode(n);return m?.pricing||m?.capabilities?.pricing||null}
  function estimateNodeCost(n,overrides={}){const pricing=modelPricing(n);if(!pricing)return{known:false,currency:'USD',amount:0,label:'价格未配置'};const currency=String(pricing.currency||'USD'),count=Math.max(1,Number(overrides.count??n.count??1)),duration=Math.max(.01,Number(overrides.duration??n.duration??1));let amount=Number(pricing.perRequest||0);if(n.type==='image')amount+=Number(pricing.perImage||0)*count;if(n.type==='video')amount+=Number(pricing.perSecond||0)*duration*count;if(n.type==='audio')amount+=Number(pricing.perSecond||0)*duration;if(n.type==='text'){const inTokens=Math.ceil(String(overrides.prompt??n.prompt??n.text??'').length/3.6),outTokens=Number(pricing.estimatedOutputTokens||800);amount+=Number(pricing.perMillionInputTokens||0)*inTokens/1e6+Number(pricing.perMillionOutputTokens||0)*outTokens/1e6}return{known:true,currency,amount,pricing,label:`${currency} ${amount.toFixed(amount<1?4:2)}`}}
  function estimateIdsCost(ids){const items=(ids||[]).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean).map(n=>({n,c:estimateNodeCost(n)})),known=items.filter(x=>x.c.known);if(!known.length)return{known:false,amount:0,currency:'USD',items};const currencies=[...new Set(known.map(x=>x.c.currency))];if(currencies.length>1)return{known:false,mixed:true,items};return{known:true,currency:currencies[0],amount:known.reduce((a,x)=>a+x.c.amount,0),items}}
  function costBadgeHtml(n){const c=estimateNodeCost(n);return`<button class="generation-cost ${c.known?'known':'unknown'}" id="generationCostBtn" title="生成前成本预估">${c.known?`≈ ${escapeHtml(c.label)}`:'费用 ?'}</button>`}
  function openCostDetails(ids,title='生成前成本预估'){const e=estimateIdsCost(ids),rows=e.items.map(({n,c})=>`<div class="cost-row"><span>${escapeHtml(n.title||labelForType(n.type))}</span><b>${escapeHtml(n.modelName||'未选模型')}</b><em>${c.known?escapeHtml(c.label):'未配置价格'}</em></div>`).join('');modalShell(title,`<div class="cost-summary ${e.known?'known':'unknown'}"><b>${e.known?`预计 ${escapeHtml(e.currency)} ${e.amount.toFixed(e.amount<1?4:2)}`:'无法计算完整金额'}</b><span>${e.known?'实际扣费由第三方供应商最终账单为准。':'至少一个模型没有配置价格；可在「全部模型」里填写价格 JSON。'}</span></div><div class="cost-list">${rows}</div><div class="feature-actions"><button id="costManageModels">管理模型价格</button><button id="costClose" class="primary">知道了</button></div>`,{wide:true});$('#costManageModels',featureModal).onclick=()=>location.href='./models.html';$('#costClose',featureModal).onclick=closeFeatureModal}
  function priorityLabel(v){v=Number(v??50);return v>=80?'高':v<=20?'低':'普通'}
  function nodePriority(n){return Math.max(0,Math.min(100,Number(n?.queuePriority??state.workflowSettings?.defaultPriority??50)))}
  function nodeTaskVisualState(n){const wf=workflowNodeStatus(n.id).status;if(wf)return wf;if(n.frozen)return'frozen';const s=String(n.taskStatus||'');if(['queued','polling','retrying','running','fallback','provider_succeeded','result_pending'].includes(s))return s==='queued'?'pending':'running';if(['succeeded','failed','canceled'].includes(s))return s;return''}
  function safeTaskDiagnosticText(value){let text=String(value??'');text=text.replace(/Bearer\s+[A-Za-z0-9._~+\/=-]+/gi,'Bearer [redacted]');text=text.replace(/((?:x-api-key|api-key|authorization)\s*[:=]\s*)[^\s,;&]+/gi,'$1[redacted]');text=text.replace(/((?:api[-_]?key|token|secret)\s*[:=]\s*)[^\s,;&]+/gi,'$1[redacted]');return text.slice(0,500)}
  function taskDiagnosticSnapshot(info={}){const rawProgress=info.providerProgress,p=rawProgress===null||rawProgress===undefined||rawProgress===''?NaN:Number(rawProgress);return{status:String(info.status||''),providerStatus:String(info.providerStatus||''),resultStatus:String(info.resultStatus||''),providerRawStatus:String(info.providerRawStatus||''),providerProgress:Number.isFinite(p)?p:null,upstreamTaskId:String(info.upstreamTaskId||''),providerVideoId:String(info.providerVideoId||''),providerTaskId:String(info.providerTaskId||''),lastPollAt:String(info.lastPollAt||''),retryReason:String(info.retryReason||''),nextRetryAt:String(info.nextRetryAt||info.rateLimitRetryAt||''),lastError:safeTaskDiagnosticText(info.lastError||'')}}
  function syncNodeTaskDiagnostics(n,info){if(n&&info)n.taskDiagnostics=taskDiagnosticSnapshot(info)}
  function taskDiagnosticSummary(info={}){const d=taskDiagnosticSnapshot(info),parts=[],raw=d.providerRawStatus||d.providerStatus||d.status;if(raw)parts.push(`上游:${raw}`);if(d.providerProgress!=null)parts.push(`上游进度:${Math.max(0,Math.min(100,Math.round(d.providerProgress)))}%`);if(d.providerVideoId)parts.push(`video_id:${d.providerVideoId}`);if(d.providerTaskId)parts.push(`task_id:${d.providerTaskId}`);else if(d.upstreamTaskId&&!d.providerVideoId)parts.push(`upstream_id:${d.upstreamTaskId}`);if(d.lastPollAt)parts.push(`轮询:${d.lastPollAt}`);if(d.retryReason==='rate_limit'&&d.nextRetryAt)parts.push(`限流重试:${d.nextRetryAt}`);if(d.lastError)parts.push(`错误:${d.lastError}`);return parts.join(' · ')}
  // Canvas waiting state stays user-facing; upstream details remain in Task Manager.
  function videoTaskDiagnosticsHtml(){return''}
  function defaultNodeName(type){return({text:'文本节点',image:'图片节点',video:'视频节点',audio:'音频节点',script:'脚本生成器',director:'导演台'})[type]||labelForType(type)}
  function nodeSequenceNumber(id){const idx=state.nodes.findIndex(n=>n.id===id);return idx>=0?idx+1:1}
  function nodeTitleBase(n){
    const raw=String(n?.title||'').trim();
    const seq=nodeSequenceNumber(n?.id);
    const base=defaultNodeName(n?.type);
    const legacy=labelForType(n?.type);
    if(!raw)return base;
    if(raw===`${base} ${seq}`||raw===`${legacy} ${seq}`)return base;
    if((raw.startsWith(`${base} `)||raw.startsWith(`${legacy} `))&&/\d+$/.test(raw))return base;
    if(/^(文本|图片|视频|音频|脚本|导演台)\s+\d+$/.test(raw))return base;
    return raw;
  }
  function nodeTypeIconName(type){return({text:'subtitle',image:'image',video:'video',audio:'audio',script:'story',director:'camera'})[type]||'fallback'}
  function uiV23NodeContentState(n){
    if(!n)return'empty';
    if(nodeResultVersions(n).length)return'result';
    if(n.type==='image'||n.type==='video')return(n.outputUrl||n.content)?'result':'empty';
    if(n.type==='audio')return n.outputUrl?'result':'empty';
    if(n.type==='text')return String(n.text||n.generatedText||'').trim()?'result':'empty';
    if(n.type==='script')return (ensureScriptData(n).shots||[]).length?'result':'empty';
    if(n.type==='director')return (n.directorData?.objects?.length||n.directorData?.screenshots?.length)?'result':'empty';
    return'empty';
  }
  function uiV23TaskState(visualStatus=''){
    return({pending:'queued',running:'running',failed:'failed',succeeded:'completed',canceled:'cancelled',frozen:'completed'})[visualStatus]||'idle';
  }
  function uiV23ProgressHtml(n,taskState){
    if(!['queued','running'].includes(taskState))return'';
    const value=Number(n.taskProgress),hasRealProgress=Number.isFinite(value)&&value>0&&value<=100;
    const label=taskState==='queued'?'排队中':'生成中';
    const percent=hasRealProgress?Math.round(value):null;
    return `<div class="ui-v23-result-progress${hasRealProgress?'':' indeterminate'}${taskState==='queued'?' queued':''}" data-ui-v23-result-progress role="status" aria-live="polite" aria-label="${label}${percent==null?'':` ${percent}%`}"><div class="ui-v23-result-progress-copy"><span>${label}</span><strong>${percent==null?'':`${percent}%`}</strong></div><div class="ui-v23-result-progress-track"><i${percent==null?'':` style="width:${percent}%"`}></i></div></div>`;
  }
  function uiV23FormatMediaDuration(seconds){
    const value=Number(seconds);if(!Number.isFinite(value)||value<=0)return'';const total=Math.round(value),hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),secs=total%60;return hours>0?`${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  }
  function uiV23BindMediaMetadata(n,el){
    const meta=$('[data-node-result-meta]',el);if(!meta)return;
    const apply=text=>{const value=String(text||'').trim();meta.textContent=value;meta.hidden=!value;};
    if(n.type==='image'){
      const image=$('img',el);if(!image)return apply('');
      const update=()=>apply(image.naturalWidth&&image.naturalHeight?`${image.naturalWidth} × ${image.naturalHeight}`:'');
      if(image.complete)update();else image.addEventListener('load',update,{once:true});return;
    }
    if(n.type==='video'){
      const video=$('video',el);if(!video)return apply('');
      const update=()=>{const resolution=video.videoWidth&&video.videoHeight?`${video.videoWidth} × ${video.videoHeight}`:'';const duration=uiV23FormatMediaDuration(video.duration);apply([resolution,duration].filter(Boolean).join(' · '));};
      if(video.readyState>=1)update();else video.addEventListener('loadedmetadata',update,{once:true});return;
    }
    if(n.type==='audio'){
      const audio=$('audio',el);if(!audio)return apply('');
      const update=()=>apply(uiV23FormatMediaDuration(audio.duration));if(audio.readyState>=1)update();else audio.addEventListener('loadedmetadata',update,{once:true});return;
    }
    apply('');
  }


  function sanitizeManualTextHtml(html){
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
  function selectManualTextNode(n,el){
    if(!n||n.type!=='text'||n.textInputMode!=='manual')return;
    selectedEdgeId=null;selectedGroupId=null;expandedNodeId=null;
    selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);
    $$('.node',nodeLayer).forEach(nodeEl=>{
      const active=nodeEl.dataset.id===n.id;
      nodeEl.classList.toggle('selected',active);
      nodeEl.classList.remove('multi-selected');
      nodeEl.dataset.interactionState=active?'selected':'idle';
    });
    generator.classList.add('hidden');
    renderToolbar();
  }
  function runManualTextFormat(n,action){
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);if(!editor)return;
    if(action==='expand'){
      if(!n.textEditorExpanded){
        n.textEditorExpanded=true;n.textEditorExpandedBackup={w:n.w||560,h:n.h||320};n.w=Math.max(Number(n.w||560),840);n.h=Math.max(Number(n.h||320),520);
      }else{
        const backup=n.textEditorExpandedBackup||{};n.w=Number(backup.w||560);n.h=Number(backup.h||320);n.textEditorExpanded=false;delete n.textEditorExpandedBackup;
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
    toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-60)+'px';
    toolbar.innerHTML=`<button class="text-format-btn text-format-clear" data-text-format="clear" title="清除格式"><span>∅</span></button><span class="text-format-separator"></span><button class="text-format-btn" data-text-format="h1" title="一级标题">H1</button><button class="text-format-btn" data-text-format="h2" title="二级标题">H2</button><button class="text-format-btn" data-text-format="h3" title="三级标题">H3</button><button class="text-format-btn text-format-paragraph" data-text-format="p" title="正文">¶</button><span class="text-format-separator"></span><button class="text-format-btn text-format-bold" data-text-format="bold" title="加粗">B</button><button class="text-format-btn text-format-italic" data-text-format="italic" title="斜体">I</button><span class="text-format-separator"></span><button class="text-format-btn text-format-list" data-text-format="bullet" title="无序列表"><span>•</span><i>≡</i></button><button class="text-format-btn text-format-list" data-text-format="number" title="有序列表"><span>1</span><i>≡</i></button><span class="text-format-separator"></span><button class="text-format-btn text-format-rule" data-text-format="rule" title="分割线">—</button><span class="text-format-separator"></span><button class="text-format-btn" data-text-format="copy" title="复制">▣</button><button class="text-format-btn text-format-expand" data-text-format="expand" title="展开 / 收起">↗</button>`;
    toolbar.classList.remove('hidden');
    $$('[data-text-format]',toolbar).forEach(btn=>{btn.onpointerdown=e=>e.preventDefault();btn.onclick=e=>{e.preventDefault();e.stopPropagation();runManualTextFormat(n,btn.dataset.textFormat)}});
  }

  function beginManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const current=String(n.text||n.generatedText||'');
    n.text=current;
    n.generatedText='';
    n.textHtml=n.textHtml||plainTextToManualHtml(current);
    n.textInputMode='manual';
    n.textEditing=false;
    n.w=560;
    n.h=320;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    toolbar.classList.add('hidden');
    saveState();
    render();
  }
  function startManualTextEditing(n){
    if(!n||n.type!=='text'||n.textInputMode!=='manual')return;
    selectedId=n.id;
    state.selectedIds=[n.id];
    state.nodes.forEach(x=>x.selected=x.id===n.id);
    expandedNodeId=null;
    generator.classList.add('hidden');
    n.textEditing=true;
    saveState();
    render();
    setTimeout(()=>{
      const field=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
      field?.focus();
      if(field){const range=document.createRange();range.selectNodeContents(field);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range)}
    },0);
  }
  function finishManualTextEdit(n){
    if(!n||n.type!=='text')return;
    const editor=$(`.node[data-id="${CSS.escape(String(n.id))}"] [data-text-manual]`);
    if(editor)syncManualTextEditor(n,editor);
    n.textInputMode='manual';
    n.textEditing=false;
    n.textHtml=sanitizeManualTextHtml(String(n.textHtml||plainTextToManualHtml(n.text||'')));
    saveState();
    render();
  }

  function renderNode(n){
    const el = document.createElement('article');
    const multiSelected=(state.selectedIds||[]).includes(n.id);
    const wfInfo=workflowNodeStatus(n.id),wfStatus=workflowStatusClass(wfInfo.status),visualStatus=nodeTaskVisualState(n);
    const versions=nodeResultVersions(n),activeVersionIndex=activeNodeResultIndex(n);
    const contentState=uiV23NodeContentState(n),interactionState=(n.id===selectedId||multiSelected)?'selected':'idle',taskState=uiV23TaskState(visualStatus);
    const mediaResult=contentState==='result'&&['image','video','audio'].includes(n.type);
    if(n.type==='text'&&n.textInputMode!=='manual')n.textEditing=false;
    el.className = 'node node-'+n.type + (n.id===selectedId ? ' selected':'') + (multiSelected?' multi-selected':'') + (wfStatus?' wf-'+wfStatus:'') + (n.h?' resized-node':'') + (visualStatus?' task-'+visualStatus:'') + (n.locked?' node-locked':'') + (n.frozen?' node-frozen':'') + (contentState==='result'?' ui-v23-result-shell':'') + (mediaResult?` ui-v23-media-result ui-v23-media-${n.type}`:'');
    el.dataset.id = n.id;
    el.dataset.nodeType=n.type;
    el.dataset.contentState=contentState;
    el.dataset.interactionState=interactionState;
    el.dataset.taskState=taskState;
    el.dataset.uiV23Native='true';
    if(n.type==='text'){el.classList.toggle('text-node-manual',n.textInputMode==='manual');el.classList.toggle('text-node-editing',Boolean(n.textEditing));el.classList.toggle('text-node-editor-expanded',Boolean(n.textEditorExpanded))}
    const bigImage=n.type==='image'&&contentState==='empty'&&(interactionState==='selected'||n.id===expandedNodeId);
    el.style.left = n.x+'px'; el.style.top=n.y+'px'; el.style.width=(n.w||320)+'px';if(n.h)el.style.height=nodeHeight(n)+'px';
    let body = '';
    if(n.type==='image'){
      const imageGenerating=['queued','running'].includes(String(n.taskStatus||''));
      const targetRatio=String(n.aspectRatio||n.cropRatio||'1:1').trim()||'1:1';
      const ratioCss=targetRatio.replace(':','/');
      const ratioStyle=imageGenerating?`aspect-ratio:${escapeAttr(ratioCss)};height:auto;min-height:0;`:n.cropRatio&&!n.h?`aspect-ratio:${escapeAttr(n.cropRatio.replace(':','/'))};height:auto;min-height:130px;`:'';
      const targetProvider=providerById(n.providerId),targetModel=modelForNode(n),targetParams=targetProvider&&targetModel&&globalThis.CanvasModelImageCapabilities?.normalizeSelection?globalThis.CanvasModelImageCapabilities.normalizeSelection(targetProvider,targetModel,{resolution:n.resolution||'1K',aspectRatio:targetRatio,imageQuality:n.imageQuality||''}):(globalThis.CanvasImageRequestParameters?.normalize?.({resolution:n.resolution||'1K',aspectRatio:targetRatio})||{});
      const targetSize=targetParams.width&&targetParams.height?`${targetParams.width} × ${targetParams.height}`:'';
      const emptyImage=contentState==='empty'&&!imageGenerating;
      const quick=emptyImage?`<div class="image-node-try"><div class="image-node-try-label">尝试：</div><button type="button" data-image-quick="repaint"><span class="image-quick-icon">↥</span><b>图生图</b></button><button type="button" data-image-quick="upscale"><span class="image-quick-icon">HD</span><b>图片高清</b></button></div>`:'';
      const uploadAction=emptyImage&&interactionState==='selected'?`<button type="button" class="image-node-upload" data-image-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const generatingMeta=imageGenerating&&targetSize?`<div class="image-node-generating-size">${escapeHtml(targetSize)}</div>`:'';
      const generatingOverlay=imageGenerating?`<div class="image-node-generating-overlay"><span class="image-node-generating-spinner" aria-hidden="true"></span><b>${n.taskStatus==='queued'?'等待生成':'正在生成'}</b>${Number.isFinite(Number(n.taskProgress))&&Number(n.taskProgress)>0?`<small>${Math.max(0,Math.min(100,Math.round(Number(n.taskProgress))))}%</small>`:''}</div>`:'';
      const media=n.outputUrl?`<div class="media-clip image-node-stage" style="${ratioStyle}"><img class="node-media-img" loading="lazy" decoding="async" style="${mediaTransformStyle(n)}" src="${escapeAttr(n.outputUrl)}" alt="${escapeAttr(n.title||'图片')}"/></div>`:n.content?`<div class="node-content-img image-node-stage" style="background:${themeBg(n.content)};${mediaTransformStyle(n)}"><div class="job-badge">image</div></div>`:`<div class="image-node-placeholder image-node-stage" style="${ratioStyle}"><div class="big-icon">▧</div></div>`;
      body=`<div class="image-node-shell ${imageGenerating?'is-generating':emptyImage?'is-empty':'has-output'}">${uploadAction}${generatingMeta}${media}${generatingOverlay}${quick}</div>`;
    } else if(n.type==='video'){
      const videoGenerating=['queued','running'].includes(taskState);
      const emptyVideo=contentState==='empty';
      const quick=emptyVideo&&!videoGenerating?`<div class="video-node-try"><div class="video-node-try-label">尝试：</div><button type="button" data-video-quick="text"><span class="video-quick-icon">T</span><b>文生视频</b></button><button type="button" data-video-quick="image"><span class="video-quick-icon">▧</span><b>图生视频</b></button><button type="button" data-video-quick="frame"><span class="video-quick-icon">↔</span><b>首尾帧生视频</b></button></div>`:'';
      const uploadAction=emptyVideo&&!videoGenerating&&interactionState==='selected'?`<button type="button" class="video-node-upload" data-video-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const media=n.outputUrl?`<div class="media-clip video-node-stage"><video class="node-media-video" src="${escapeAttr(n.outputUrl)}" playsinline muted preload="metadata" disablepictureinpicture disableremoteplayback></video></div>`:n.content?`<div class="node-content-video video-node-stage" style="background:${themeBg(n.content)}"><div class="play-icon">▶</div><div class="job-badge">video</div></div>`:`<div class="video-node-placeholder video-node-stage"><div class="big-icon">▷</div></div>`;
      body=`<div class="video-node-shell ${videoGenerating?'is-generating':emptyVideo?'is-empty':'has-output'}">${uploadAction}${media}<div class="video-task-diagnostics-slot" data-video-task-diagnostics>${videoTaskDiagnosticsHtml(n)}</div>${quick}</div>`;
    } else if(n.type==='text'){
      const textValue=String(n.text||n.generatedText||'');
      const richTextHtml=n.textInputMode==='manual'&&n.textHtml?sanitizeManualTextHtml(n.textHtml):'';
      if(n.textInputMode==='manual'&&n.textEditing){
        const editorHtml=richTextHtml||plainTextToManualHtml(textValue);
        body=`<div class="text-node-shell is-manual-editing"><div class="text-node-editor" data-text-manual contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true" data-placeholder="输入内容...">${editorHtml}</div></div>`;
      }else if(n.textInputMode==='manual'&&!textValue.trim()){
        body=`<div class="text-node-shell is-manual-empty" data-text-manual-view><div class="text-manual-empty-message">请编写内容，开始你的创作。</div><span class="text-manual-empty-lines" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>`;
      }else if(textValue.trim()){
        body=`<div class="text-node-shell has-text"><div class="text-node-preview ${richTextHtml?'is-rich-text':''}" data-text-result tabindex="0">${richTextHtml||escapeHtml(textValue)}</div></div>`;
      }else{
        body=`<div class="text-node-shell is-empty"><div class="text-node-placeholder" aria-hidden="true"><span class="text-node-lines"><i></i><i></i><i></i><i></i></span></div><div class="text-node-try">尝试：</div><button type="button" data-text-quick="manual"><span>${uiIcon('subtitle')}</span><b>自己编写内容</b></button><button type="button" data-text-quick="video"><span>${uiIcon('video')}</span><b>文生视频</b></button><button type="button" data-text-quick="image"><span>${uiIcon('image')}</span><b>图片反推提示词</b></button></div>`;
      }
    } else if(n.type==='audio'){
      const emptyAudio=contentState==='empty';
      const bars=Array.from({length:72},(_,i)=>`<i style="height:${10+((i*17)%42)}px"></i>`).join('');
      const quick=emptyAudio?`<div class="audio-node-try"><div class="audio-node-try-label">尝试：</div><button type="button" data-audio-quick="music"><span class="audio-quick-icon">♫</span><b>文字生音乐</b></button><button type="button" data-audio-quick="voice"><span class="audio-quick-icon">◖</span><b>生成旁白 / 配音</b></button></div>`:'';
      const uploadAction=emptyAudio&&interactionState==='selected'?`<button type="button" class="audio-node-upload" data-audio-node-upload>${uiIcon('plus')}<span>上传</span></button>`:'';
      const media=n.outputUrl?`<div class="audio-result-stage"><div class="audio-wave audio-wave-result">${bars}</div><audio class="node-media-audio" src="${escapeAttr(n.outputUrl)}" controls preload="metadata"></audio></div>`:`<div class="audio-node-placeholder"><div class="audio-wave">${bars}</div><span>音频</span></div>`;
      body=`<div class="audio-node-shell ${emptyAudio?'is-empty':'has-output'}">${uploadAction}${media}${quick}</div>`;
    } else if(n.type==='script'){
      const data=ensureScriptData(n); const shots=data.shots||[];
      body = `<div class="script-node-compact"><div class="script-compact-icon"><i></i><i></i><i></i><i></i></div><div class="script-try-label">尝试：</div><button data-script-preset="breakdown">☰ <b>脚本生成分镜脚本</b></button><button data-script-preset="character">♙ <b>角色生成分镜脚本</b></button><button data-script-preset="manual">▤ <b>自己编写分镜脚本</b></button>${shots.length?`<small>${shots.length} 个镜头 · 点击卡片查看/继续编辑</small>`:''}</div>`;
    } else if(n.type==='director'){
      const d=ensureDirectorData(n);
      body = `<div class="director-node-preview"><div class="director-mini-grid"><div class="director-mini-horizon"></div>${d.objects.filter(o=>o.visible!==false).slice(0,6).map((o,i)=>`<i class="director-mini-object ${o.type}" style="left:${40+o.x*16}%;top:${55-o.z*7-o.y*5}%;transform:scale(${Math.max(.6,Number(o.sx||1))})"></i>`).join('')}</div><div class="director-node-meta"><span>${d.objects.length} 个对象</span><span>FOV ${d.camera.fov}°</span></div><button class="director-open-btn" data-open-director="${n.id}">打开导演台</button></div>`;
    }
    const rawProgress=Number(n.taskProgress),hasRealProgress=Number.isFinite(rawProgress)&&rawProgress>0&&rawProgress<=100;
    const headerStatusLabel=taskState==='queued'?'排队中':taskState==='running'?'生成中':taskState==='failed'?'生成失败':'';
    const showHeaderStatus=contentState==='empty'&&Boolean(headerStatusLabel);
    const versionNav=versions.length?`<div class="node-result-nav ui-v23-version-nav ${versions.length<2?'single-version':''}" data-version-index="${activeVersionIndex+1}" data-version-count="${versions.length}" aria-label="生成版本" title="生成结果版本"><button data-result-prev="${n.id}" ${versions.length<2?'disabled':''}>‹</button><span>${activeVersionIndex+1}/${versions.length}</span><button data-result-next="${n.id}" ${versions.length<2?'disabled':''}>›</button>${versions.length>1?`<button class="compare" data-result-compare="${n.id}" title="对比版本">对比</button>`:''}</div>`:'';
    const failureHtml=taskState==='failed'?`<div class="node-failed-actions ui-v23-failure"><span>生成失败</span><button data-node-retry="${n.id}">重新生成</button></div>`:'';
    const footerHtml=contentState==='empty'?`<div class="node-footer"><span>${n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':'')}</span><span style="margin-left:auto">${taskState==='queued'?'排队中':taskState==='running'?'生成中':''}</span></div>`:'';
    const resizeHtml=contentState==='result'&&n.type!=='video'?`<div class="node-resize-handle ui-v23-resize-handle" data-node-resize="${n.id}" title="调整大小" aria-label="调整节点大小"></div>`:'';
    const resultMetaHtml=mediaResult?'<span class="ui-v23-result-meta" data-node-result-meta hidden></span>':'';
    el.innerHTML = `
      <div class="node-header"><div class="node-header-left"><span class="node-type-icon">${uiIcon(nodeTypeIconName(n.type))}</span><span class="node-title-stack"><b>${escapeHtml(nodeTitleBase(n))}</b><small>${nodeSequenceNumber(n.id)}</small></span></div><div class="node-header-right">${n.toolParams?.shotId?`<button class="node-shot-chip" data-shot-back="${n.id}">Shot ${scriptShotForProductionNode(n)?.no||''}</button>`:''}<div class="node-guard-badges">${n.locked?`<i title="位置已锁定">${uiIcon('lock')}</i>`:''}${n.frozen?`<i title="结果已冻结">${uiIcon('freeze')}</i>`:''}${Number(n.fallbackAttempt||0)>0?`<i title="本次使用备用模型">${uiIcon('fallback')}</i>`:''}</div>${showHeaderStatus?`<span class="node-run-status ${taskState}">${headerStatusLabel}${taskState==='running'&&hasRealProgress?` ${Math.round(rawProgress)}%`:''}</span>`:''}${resultMetaHtml}<button class="node-menu-btn" aria-label="更多">${uiIcon('dotMenu')}</button></div></div>
      <div class="node-body">${body}</div>
      ${nodeInlineCandidateHtml(n)}
      ${versionNav}
      ${failureHtml}
      ${uiV23ProgressHtml(n,taskState)}
      ${footerHtml}
      <div class="node-port in" title="输入"></div><div class="node-port out" title="输出"></div>
      ${resizeHtml}`;
    uiV23BindMediaMetadata(n,el);
    el.addEventListener('pointerdown',e=>{
      if(n.type==='text'&&n.textInputMode==='manual'&&!e.target.closest('[data-text-manual]')){
        const active=document.activeElement;if(active?.matches?.('[data-text-manual]'))active.blur();
      }
      onNodePointerDown(e,n,el);
    });
    el.addEventListener('contextmenu', e => {e.preventDefault();if(!(state.selectedIds||[]).includes(n.id))selectNode(n.id,e.shiftKey);showContextMenu(e.clientX,e.clientY,n.id)});
    $('.node-menu-btn',el).addEventListener('click', e=>{e.stopPropagation(); selectNode(n.id); const r=e.currentTarget.getBoundingClientRect(); showContextMenu(r.left,r.bottom+4,n.id);});
    $('.node-port.out',el).addEventListener('pointerdown',e=>beginConnectionDrag(e,n,e.currentTarget));
    $('.node-port.in',el).addEventListener('pointerup',e=>{if(!connectingFrom || connectingFrom===n.id) return;e.stopPropagation();completeConnection(n.id);});
    const resizeHandle=$('[data-node-resize]',el);if(resizeHandle){resizeHandle.addEventListener('pointerdown',e=>beginNodeResize(e,n,el));resizeHandle.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();resetNodeSize(n.id)})}
    $('[data-result-prev]',el)?.addEventListener('click',e=>{e.stopPropagation();stepNodeResultVersion(n,-1)});
    $('[data-result-next]',el)?.addEventListener('click',e=>{e.stopPropagation();stepNodeResultVersion(n,1)});
    $('[data-result-compare]',el)?.addEventListener('click',e=>{e.stopPropagation();openNodeVersionCompare(n)});
    $$('[data-inline-version]',el).forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();applyNodeResultVersion(n,b.dataset.inlineVersion)}));
    $('[data-shot-back]',el)?.addEventListener('click',e=>{e.stopPropagation();openScriptShotFromProductionNode(n)});
    $$('[data-image-quick]',el).forEach(b=>b.addEventListener('click',e=>{
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
    }
    $$('[data-video-quick]',el).forEach(b=>b.addEventListener('click',e=>{
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
    $$('[data-audio-quick]',el).forEach(b=>b.addEventListener('click',e=>{
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
    $('[data-node-retry]',el)?.addEventListener('click',e=>{e.stopPropagation();generateForNode(n).catch(()=>{})});
    $('[data-node-rerun]',el)?.addEventListener('click',e=>{e.stopPropagation();rerunFailedDownstream(n.id)});
    $$('[data-text-quick]',el).forEach(b=>b.addEventListener('click',e=>{
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
    if(n.type==='text'&&n.textInputMode==='manual'&&!n.textEditing){
      el.addEventListener('dblclick',e=>{
        if(e.target.closest('button,.node-port,.node-resize-handle'))return;
        e.preventDefault();e.stopPropagation();startManualTextEditing(n);
      });
    }
    const ta=$('[data-text-manual]',el);
    if(ta){
      ta.addEventListener('pointerdown',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('click',e=>{e.stopPropagation();selectManualTextNode(n,el)});
      ta.addEventListener('input',e=>syncManualTextEditor(n,e.currentTarget));
      ta.addEventListener('paste',e=>{e.preventDefault();const text=String(e.clipboardData?.getData('text/plain')||'');document.execCommand('insertText',false,text)});
      ta.addEventListener('keydown',e=>{
        if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();syncManualTextEditor(n,e.currentTarget);return}
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();syncManualTextEditor(n,e.currentTarget);e.currentTarget.blur()}
      });
      ta.addEventListener('blur',e=>{
        syncManualTextEditor(n,e.currentTarget);
        setTimeout(()=>{if(n.textEditing){n.textEditing=false;saveState();render()}},0);
      });
    }
    $('[data-open-script]',el)?.addEventListener('click',e=>{e.stopPropagation();openScriptEditor(n)});
    $('[data-open-director]',el)?.addEventListener('click',e=>{e.stopPropagation();openDirectorConsole(n)});
    $$('[data-script-preset]',el).forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();selectNode(n.id);expandedNodeId=n.id;n.scriptMode=b.dataset.scriptPreset;if(n.scriptMode==='manual'){render();setTimeout(()=>openScriptEditor(n,'shots'),0);return;}render();setTimeout(()=>$('#scriptDetailPrompt')?.focus(),0);}));
    return el;
  }


  function nodePortWorldPoint(nodeId,kind='out'){
    const cg=collapsedGroupForNode(nodeId);if(cg){const b=groupBounds(cg);if(b)return{x:kind==='out'?b.right:b.left,y:(b.top+b.bottom)/2}}
    const port=document.querySelector(`.node[data-id="${CSS.escape(String(nodeId))}"] .node-port.${kind}`);
    if(port){const r=port.getBoundingClientRect();return screenToWorld(r.left+r.width/2,r.top+r.height/2)}
    const n=state.nodes.find(x=>x.id===nodeId);if(!n)return{x:0,y:0};
    return{x:n.x+(kind==='out'?(n.w||320):0),y:n.y+nodeHeight(n)/2};
  }
  function beginConnectionDrag(e,n,port){
    if(e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    cleanupConnectionDrag(false);
    connectingFrom=n.id;connectingPointerId=e.pointerId;connectingStartScreen={x:e.clientX,y:e.clientY};
    port.classList.add('connecting');viewport.classList.add('connecting-mode');
    drawTempEdge(e.clientX,e.clientY);
  }
  function nearestVisiblePort(clientX,clientY,kind='in',excludeId=''){
    let best=null,bestDist=Infinity;
    $$(`.node-port.${kind}`,nodeLayer).forEach(port=>{const nodeEl=port.closest('.node'),id=nodeEl?.dataset.id;if(!id||id===excludeId)return;const r=port.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.hypot(clientX-cx,clientY-cy),hitRadius=Math.max(22,r.width*1.65);if(d<=hitRadius&&d<bestDist){bestDist=d;best={id,nodeEl,port,inPort:kind==='in'?port:null}}});
    return best;
  }
  function findConnectionTarget(clientX,clientY){
    const near=nearestVisiblePort(clientX,clientY,'in',connectingFrom);if(near)return near;
    const hit=document.elementFromPoint(clientX,clientY);if(!hit)return null;
    const inPort=hit.closest?.('.node-port.in');
    const nodeEl=(inPort||hit)?.closest?.('.node');
    if(!nodeEl)return null;
    const id=nodeEl.dataset.id;
    if(!id||id===connectingFrom)return null;
    return{id,nodeEl,inPort:inPort||nodeEl.querySelector('.node-port.in')};
  }
  function setConnectionHover(target){
    if(connectingHoverTarget?.nodeEl)connectingHoverTarget.nodeEl.classList.remove('connection-target','connection-invalid');
    if(connectingHoverTarget?.inPort)connectingHoverTarget.inPort.classList.remove('connection-target-port','connection-invalid-port');
    connectingHoverTarget=target;if(!target)return;const source=state.nodes.find(n=>n.id===connectingFrom),dest=state.nodes.find(n=>n.id===target.id),check=edgeCompatibility(source,dest);target.compatibility=check;
    if(target?.nodeEl)target.nodeEl.classList.add(check.ok?'connection-target':'connection-invalid');if(target?.inPort)target.inPort.classList.add(check.ok?'connection-target-port':'connection-invalid-port');
  }
  function drawTempEdge(clientX,clientY){
    if(!connectingFrom)return;
    const a=state.nodes.find(n=>n.id===connectingFrom);if(!a)return;
    let p=$('#tempEdge',edgeLayer);if(!p){p=document.createElementNS('http://www.w3.org/2000/svg','path');p.id='tempEdge';p.setAttribute('class','edge temp-edge');edgeLayer.appendChild(p)}
    const target=findConnectionTarget(clientX,clientY);setConnectionHover(target);
    const from=nodePortWorldPoint(a.id,'out');
    const to=target?nodePortWorldPoint(target.id,'in'):screenToWorld(clientX,clientY);
    const x1=from.x,y1=from.y,x2=to.x,y2=to.y,c=Math.max(70,Math.abs(x2-x1)*.42);
    p.setAttribute('d',`M ${x1} ${y1} C ${x1+c} ${y1}, ${x2-c} ${y2}, ${x2} ${y2}`);
    p.classList.toggle('snapped',Boolean(target?.compatibility?.ok));p.classList.toggle('invalid',Boolean(target&&!target?.compatibility?.ok));
  }
  function removeTempEdge(){try{$('#tempEdge',edgeLayer)?.remove()}catch{}}
  function cleanupConnectionDrag(shouldRender=true){
    setConnectionHover(null);removeTempEdge();
    $$('.node-port.out.connecting').forEach(x=>x.classList.remove('connecting'));
    viewport.classList.remove('connecting-mode');
    connectingFrom=null;connectingPointerId=null;connectingStartScreen=null;
    if(shouldRender)render();
  }
  function completeConnection(targetId){
    const sourceId=connectingFrom;if(!sourceId||!targetId){cleanupConnectionDrag();return false}
    const source=state.nodes.find(n=>n.id===sourceId),target=state.nodes.find(n=>n.id===targetId),check=edgeCompatibility(source,target);if(!check.ok){cleanupConnectionDrag(false);render();showToast(check.reason);return false}
    snapshot('创建连线');const edge=createEdge(sourceId,targetId,{type:'asset',role:check.role,silent:true});cleanupConnectionDrag(false);saveState();render();showToast(`已连接 · ${edgeRoleLabel(edge.role)}`);return true;
  }
  function finishConnectionPointerUp(e){
    if(!connectingFrom)return false;
    if(connectingPointerId!=null&&e.pointerId!==connectingPointerId)return false;
    const clientX=Number(e.clientX),clientY=Number(e.clientY),from=connectingFrom;
    const target=findConnectionTarget(clientX,clientY);
    if(target){completeConnection(target.id);return true}
    const vr=viewport.getBoundingClientRect();
    const moved=connectingStartScreen?Math.hypot(clientX-connectingStartScreen.x,clientY-connectingStartScreen.y):999;
    const onCanvas=clientX>=vr.left&&clientX<=vr.right&&clientY>=vr.top&&clientY<=vr.bottom;
    const hit=document.elementFromPoint(clientX,clientY);
    const shouldQuickAdd=onCanvas&&moved>10&&!hit?.closest?.('.node');
    const dropPoint=shouldQuickAdd?screenToWorld(clientX,clientY):null;
    // The connection gesture is already fully cleaned in-place here. Avoid a full
    // canvas render before opening the continuation palette: rebuilding every node in
    // the pointerup path can invalidate the just-finished gesture and make blank drops
    // appear to lock the canvas.
    cleanupConnectionDrag(false);
    if(shouldQuickAdd){
      window.__quickAddOpenedAt=Date.now();
      requestAnimationFrame(()=>showQuickAdd(clientX,clientY,dropPoint,from,{fullMenu:true}));
    }
    return true;
  }

  function edgePathData(e){const a=state.nodes.find(n=>n.id===e.source),b=state.nodes.find(n=>n.id===e.target);if(!a||!b)return null;const ga=collapsedGroupForNode(e.source),gb=collapsedGroupForNode(e.target);if(ga&&gb&&ga.id===gb.id)return null;const from=nodePortWorldPoint(e.source,'out'),to=nodePortWorldPoint(e.target,'in'),x1=from.x,y1=from.y,x2=to.x,y2=to.y,c=Math.max(80,Math.abs(x2-x1)*.45);return{x1,y1,x2,y2,d:`M ${x1} ${y1} C ${x1+c} ${y1}, ${x2-c} ${y2}, ${x2} ${y2}`}}
  function edgeWorkflowClass(e){const st=workflowNodeStatus(e.target).status;if(st==='running')return ' wf-running';if(st==='failed')return ' wf-failed';if(['succeeded','cached','frozen'].includes(st))return ' wf-succeeded';if(st==='skipped')return ' wf-skipped';return ''}
  function renderEdges(changedIds=null){
    edgeLayer.classList.toggle('editing-edge',Boolean(selectedEdgeId||edgeReconnect));
    const svgNS='http://www.w3.org/2000/svg',changed=changedIds?new Set(changedIds):null,vr=viewportWorldRect(850),visibleIds=new Set();
    state.edges.forEach(e=>{if(changed&&!changed.has(e.source)&&!changed.has(e.target))return;const a=state.nodes.find(n=>n.id===e.source),b=state.nodes.find(n=>n.id===e.target);if(!a||!b)return;if(!e.role){e.role=inferEdgeRole(a,b);e.semanticRole=e.role;e.targetSlot=e.role}const g=edgePathData(e);if(!g)return;const eb={left:Math.min(g.x1,g.x2)-150,top:Math.min(g.y1,g.y2)-80,right:Math.max(g.x1,g.x2)+150,bottom:Math.max(g.y1,g.y2)+80};if(!rectIntersects(eb,vr)&&!changed&&e.id!==selectedEdgeId)return;visibleIds.add(String(e.id));
      let path=edgeLayer.querySelector(`path.edge[data-edge-key="${CSS.escape(String(e.id))}"]`),hit=edgeLayer.querySelector(`path.edge-hit[data-edge-key="${CSS.escape(String(e.id))}"]`),label=edgeLayer.querySelector(`text.edge-label[data-edge-key="${CSS.escape(String(e.id))}"]`);
      if(!path){path=document.createElementNS(svgNS,'path');path.dataset.edgeKey=e.id;edgeLayer.appendChild(path)}path.setAttribute('d',g.d);path.setAttribute('class','edge'+((e.source===selectedId||e.target===selectedId||e.id===selectedEdgeId)?' active':'')+edgeWorkflowClass(e));
      if(!hit){hit=document.createElementNS(svgNS,'path');hit.dataset.edgeKey=e.id;hit.dataset.edgeId=e.id;hit.addEventListener('click',ev=>{ev.stopPropagation();selectedEdgeId=e.id;renderEdges();openEdgeRoleMenu(ev.clientX,ev.clientY,e.id)});hit.addEventListener('contextmenu',ev=>{ev.preventDefault();ev.stopPropagation();selectedEdgeId=e.id;renderEdges();openEdgeRoleMenu(ev.clientX,ev.clientY,e.id)});edgeLayer.appendChild(hit)}hit.setAttribute('d',g.d);hit.setAttribute('class','edge-hit');
      if(!label){label=document.createElementNS(svgNS,'text');label.dataset.edgeKey=e.id;label.setAttribute('class','edge-label');edgeLayer.appendChild(label)}label.setAttribute('x',String((g.x1+g.x2)/2));label.setAttribute('y',String((g.y1+g.y2)/2-7));label.textContent=edgeRoleLabel(e.role);
      ['source','target'].forEach(end=>{const key=`${e.id}:${end}`,want=e.id===selectedEdgeId;let h=edgeLayer.querySelector(`circle.edge-end-handle[data-edge-handle="${CSS.escape(key)}"]`);if(!want){h?.remove();return}if(!h){h=document.createElementNS(svgNS,'circle');h.dataset.edgeHandle=key;h.dataset.edgeId=e.id;h.dataset.edgeEnd=end;h.setAttribute('r','6');h.setAttribute('class','edge-end-handle '+end);h.addEventListener('pointerdown',ev=>beginEdgeReconnect(ev,e,end));edgeLayer.appendChild(h)}h.setAttribute('cx',String(end==='source'?g.x1:g.x2));h.setAttribute('cy',String(end==='source'?g.y1:g.y2))});
    });
    if(!changed){[...edgeLayer.querySelectorAll('[data-edge-key]')].forEach(el=>{if(!visibleIds.has(String(el.dataset.edgeKey)))el.remove()});[...edgeLayer.querySelectorAll('[data-edge-handle]')].forEach(el=>{const id=String(el.dataset.edgeId||'');if(!visibleIds.has(id)||id!==String(selectedEdgeId||''))el.remove()})}
  }
  function openEdgeDataInspector(edge){const source=state.nodes.find(n=>n.id===edge.source),target=state.nodes.find(n=>n.id===edge.target);modalShell('Edge Inspector',`<div class="edge-inspector-dialog"><div class="edge-inspector-flow"><article><span>Source</span><b>${escapeHtml(source?.title||edge.source)}</b><small>${escapeHtml(labelForType(source?.type||''))}</small></article><i>→</i><article><span>Target</span><b>${escapeHtml(target?.title||edge.target)}</b><small>${escapeHtml(labelForType(target?.type||''))}</small></article></div><div class="feature-grid">${field('Semantic Role',`<input value="${escapeAttr(edgeRoleLabel(edge.role))}" disabled>`)}${field('Edge ID',`<input value="${escapeAttr(edge.id)}" disabled>`)}${field('Raw Data',`<textarea rows="10" readonly>${escapeHtml(JSON.stringify(edge,null,2))}</textarea>`,true)}</div></div>`,{wide:true})}
  function openBatchConnectDialog(){
    const ids=currentSelectionIds(),nodes=ids.map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);if(nodes.length<2)return showToast('请至少选择两个节点');let sourceId=nodes[0].id;
    const draw=()=>{const source=state.nodes.find(n=>n.id===sourceId),targets=nodes.filter(n=>n.id!==sourceId),rows=targets.map(t=>{const c=edgeCompatibility(source,t);return`<label class="batch-connect-row ${c.ok?'':'disabled'}"><input type="checkbox" data-batch-target="${t.id}" ${c.ok?'checked':'disabled'}><span><b>${escapeHtml(t.title||labelForType(t.type))}</b><small>${c.ok?`自动用途：${escapeHtml(edgeRoleLabel(c.role))}`:escapeHtml(c.reason)}</small></span></label>`}).join('');featureModal.innerHTML=`<div class="feature-dialog wide"><div class="feature-head"><div><div class="feature-title">Batch Connect · 批量连接</div><div class="feature-subtitle">用一个来源节点一次连接多个目标，系统会为每条线推断语义角色</div></div><button class="feature-close">×</button></div><div class="feature-body"><div class="batch-connect-source"><label>来源节点<select id="batchConnectSource">${nodes.map(n=>`<option value="${n.id}" ${n.id===sourceId?'selected':''}>${escapeHtml(n.title||labelForType(n.type))}</option>`).join('')}</select></label></div><div class="batch-connect-list">${rows}</div><div class="feature-actions"><button class="feature-close-secondary">取消</button><button id="batchConnectRun" class="primary">连接选中目标</button></div></div></div>`;featureModal.classList.remove('hidden');$('.feature-close',featureModal).onclick=closeFeatureModal;$('.feature-close-secondary',featureModal).onclick=closeFeatureModal;$('#batchConnectSource').onchange=e=>{sourceId=e.target.value;draw()};$('#batchConnectRun').onclick=()=>{const targetIds=$$('[data-batch-target]:checked',featureModal).map(x=>x.dataset.batchTarget);if(!targetIds.length)return showToast('没有兼容目标');let made=0;runTransaction('批量连接',()=>{for(const id of targetIds){const e=createEdge(sourceId,id,{silent:true});if(e)made++}});saveState();closeFeatureModal();render();showToast(`已创建 ${made} 条语义连线`)}};draw();
  }
  function openEdgeRoleMenu(x,y,edgeId){
    const e=state.edges.find(x=>x.id===edgeId);if(!e)return;selectedEdgeId=e.id;renderEdges();const source=state.nodes.find(n=>n.id===e.source),target=state.nodes.find(n=>n.id===e.target),opts=edgeRoleOptions(source,target);
    contextMenu.innerHTML=`<div class="edge-inspector-head"><b>Edge Inspector</b><span>${escapeHtml(source?.title||'Source')} → ${escapeHtml(target?.title||'Target')}</span></div><div class="context-title">语义用途</div>${opts.map(r=>`<button data-edge-role="${r}" class="${e.role===r?'active':''}"><span>${escapeHtml(edgeRoleLabel(r))}</span>${e.role===r?'<b>✓</b>':''}</button>`).join('')}<div class="context-sep"></div><button data-edge-inspect><span>Inspect Data</span><b>JSON</b></button><button data-edge-reconnect="source"><span>重新连接起点</span><b>拖左端</b></button><button data-edge-reconnect="target"><span>重新连接终点</span><b>拖右端</b></button><div class="context-sep"></div><button data-edge-delete class="danger">Disconnect</button>`;
    contextMenu.style.left=Math.min(window.innerWidth-280,x)+'px';contextMenu.style.top=Math.min(window.innerHeight-500,y)+'px';contextMenu.classList.remove('hidden');
    $$('[data-edge-role]',contextMenu).forEach(b=>b.onclick=()=>{const role=b.dataset.edgeRole;if(['first_frame','last_frame'].includes(role)&&state.edges.some(x=>x.id!==e.id&&x.target===e.target&&x.role===role)){showToast(`目标已经有${edgeRoleLabel(role)}`);return}runTransaction('修改连线用途',()=>{e.role=role;e.semanticRole=role;e.targetSlot=role});contextMenu.classList.add('hidden');saveState();renderEdges();showToast(`已设为：${edgeRoleLabel(e.role)}`)});
    $('[data-edge-inspect]',contextMenu).onclick=()=>{contextMenu.classList.add('hidden');openEdgeDataInspector(e)};
    $$('[data-edge-reconnect]',contextMenu).forEach(b=>b.onclick=()=>{contextMenu.classList.add('hidden');showToast(`请拖动连线${b.dataset.edgeReconnect==='source'?'左端':'右端'}圆点重新接线`)});
    $('[data-edge-delete]',contextMenu).onclick=()=>{runTransaction('删除连线',()=>{state.edges=state.edges.filter(x=>x.id!==edgeId);selectedEdgeId=null});contextMenu.classList.add('hidden');saveState();renderEdges()};
  }

  function findReconnectTarget(clientX,clientY,end){const kind=end==='source'?'out':'in',near=nearestVisiblePort(clientX,clientY,kind);if(near)return{id:near.id,nodeEl:near.nodeEl,port:near.port};const hit=document.elementFromPoint(clientX,clientY);if(!hit)return null;const selector=end==='source'?'.node-port.out':'.node-port.in',port=hit.closest?.(selector),nodeEl=(port||hit)?.closest?.('.node');if(!nodeEl)return null;const id=nodeEl.dataset.id;if(!id)return null;return{id,nodeEl,port:port||nodeEl.querySelector(selector)}}
  function setReconnectHover(target){if(edgeReconnect?.hover?.nodeEl)edgeReconnect.hover.nodeEl.classList.remove('connection-target','connection-invalid');if(edgeReconnect?.hover?.port)edgeReconnect.hover.port.classList.remove('connection-target-port','connection-invalid-port');if(!edgeReconnect)return;edgeReconnect.hover=target;if(!target)return;const edge=state.edges.find(e=>e.id===edgeReconnect.edgeId);if(!edge)return;const sourceId=edgeReconnect.end==='source'?target.id:edge.source,targetId=edgeReconnect.end==='target'?target.id:edge.target,source=state.nodes.find(n=>n.id===sourceId),dest=state.nodes.find(n=>n.id===targetId);let check=edgeCompatibility(source,dest,edge.role,edge.id);if(!check.ok)check=edgeCompatibility(source,dest,'',edge.id);target.compatibility=check;target.nodeEl?.classList.add(check.ok?'connection-target':'connection-invalid');target.port?.classList.add(check.ok?'connection-target-port':'connection-invalid-port')}
  function beginEdgeReconnect(ev,e,end){if(ev.button!==0)return;ev.preventDefault();ev.stopPropagation();selectedEdgeId=e.id;edgeReconnect={edgeId:e.id,end,pointerId:ev.pointerId,hover:null};viewport.classList.add('connecting-mode');drawEdgeReconnect(ev.clientX,ev.clientY)}
  function drawEdgeReconnect(clientX,clientY){if(!edgeReconnect)return;const e=state.edges.find(x=>x.id===edgeReconnect.edgeId);if(!e)return;const target=findReconnectTarget(clientX,clientY,edgeReconnect.end);setReconnectHover(target);const fixedSource=edgeReconnect.end==='target'?nodePortWorldPoint(e.source,'out'):null,fixedTarget=edgeReconnect.end==='source'?nodePortWorldPoint(e.target,'in'):null,moving=target?nodePortWorldPoint(target.id,edgeReconnect.end==='source'?'out':'in'):screenToWorld(clientX,clientY),from=edgeReconnect.end==='source'?moving:fixedSource,to=edgeReconnect.end==='target'?moving:fixedTarget;let p=$('#edgeReconnectTemp',edgeLayer);if(!p){p=document.createElementNS('http://www.w3.org/2000/svg','path');p.id='edgeReconnectTemp';p.setAttribute('class','edge temp-edge reconnect-edge');edgeLayer.appendChild(p)}const c=Math.max(70,Math.abs(to.x-from.x)*.42);p.setAttribute('d',`M ${from.x} ${from.y} C ${from.x+c} ${from.y}, ${to.x-c} ${to.y}, ${to.x} ${to.y}`);p.classList.toggle('snapped',Boolean(target?.compatibility?.ok));p.classList.toggle('invalid',Boolean(target&&!target?.compatibility?.ok))}
  function cleanupEdgeReconnect(){setReconnectHover(null);$('#edgeReconnectTemp',edgeLayer)?.remove();viewport.classList.remove('connecting-mode');edgeReconnect=null;renderEdges()}
  function completeEdgeReconnect(nodeId){if(!edgeReconnect)return false;const e=state.edges.find(x=>x.id===edgeReconnect.edgeId);if(!e){cleanupEdgeReconnect();return false}const sourceId=edgeReconnect.end==='source'?nodeId:e.source,targetId=edgeReconnect.end==='target'?nodeId:e.target,source=state.nodes.find(n=>n.id===sourceId),target=state.nodes.find(n=>n.id===targetId);let check=edgeCompatibility(source,target,e.role,e.id);if(!check.ok)check=edgeCompatibility(source,target,'',e.id);if(!check.ok){showToast(check.reason);cleanupEdgeReconnect();return false}snapshot('重新连接连线');e.source=sourceId;e.target=targetId;e.role=check.role;e.semanticRole=check.role;e.targetSlot=check.role;saveState();showToast(`已重新连接 · ${edgeRoleLabel(e.role)}`);cleanupEdgeReconnect();return true}

  function nodeDefaultHeight(n){let base=n.type==='script'?300:n.type==='director'?270:['image','video'].includes(n.type)?280:260;if(['image','video'].includes(n.type)&&nodeResultVersions(n).length>1)base+=58;return base}
  function nodeMinSize(n){return{w:n.type==='script'?270:n.type==='director'?330:240,h:n.type==='script'?260:n.type==='director'?240:220}}
  function nodeHeight(n){const custom=Number(n?.h);return Number.isFinite(custom)&&custom>0?custom:nodeDefaultHeight(n)}

  function groupBoundsRaw(g){const nodes=(g.nodeIds||[]).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);if(!nodes.length)return null;const pad=24,left=Math.min(...nodes.map(n=>n.x))-pad,top=Math.min(...nodes.map(n=>n.y))-pad-24,right=Math.max(...nodes.map(n=>n.x+(n.w||320)))+pad,bottom=Math.max(...nodes.map(n=>n.y+nodeHeight(n)))+pad;return{nodes,left,top,right,bottom}}
  function groupBounds(g){const raw=groupBoundsRaw(g);if(!raw)return null;if(!g.collapsed)return raw;const pos=g.collapsedPos||{x:raw.left,y:raw.top};const width=Math.max(230,Math.min(320,Number(g.collapsedWidth||268))),height=86;return{...raw,left:pos.x,top:pos.y,right:pos.x+width,bottom:pos.y+height,collapsed:true}}
  function updateGroupGeometry(groupId){const g=state.groups.find(x=>x.id===groupId),b=g&&groupBounds(g),box=g&&groupLayer?.querySelector(`.canvas-group[data-group-id="${CSS.escape(String(g.id))}"]`);if(box&&b){box.style.left=b.left+'px';box.style.top=b.top+'px';box.style.width=(b.right-b.left)+'px';box.style.height=(b.bottom-b.top)+'px'}}
  function toggleGroupCollapsed(groupId,force=null){const g=state.groups.find(x=>x.id===groupId);if(!g)return false;snapshot(g.collapsed?'展开工作流组':'折叠工作流组');const raw=groupBoundsRaw(g);const next=force==null?!g.collapsed:Boolean(force);if(next&&!g.collapsed&&raw)g.collapsedPos={x:raw.left,y:raw.top};g.collapsed=next;if(next){if(g.nodeIds.includes(expandedNodeId))expandedNodeId=null;state.selectedIds=[];selectedId=null;selectedGroupId=g.id}else{state.selectedIds=[...g.nodeIds];selectedId=g.nodeIds[0]||null;selectedGroupId=g.id}saveState();render();showToast(next?'工作流组已折叠':'工作流组已展开');return true}
  function groupRunInfo(g){const run=(state.workflowRuns||[]).find(r=>g.nodeIds.some(id=>Object.prototype.hasOwnProperty.call(r.statuses||{},id)));if(!run)return null;const vals=g.nodeIds.map(id=>run.statuses?.[id]).filter(Boolean),total=vals.length,done=vals.filter(x=>['succeeded','cached','frozen','failed','canceled','skipped'].includes(x)).length,running=vals.filter(x=>x==='running').length,failed=vals.filter(x=>x==='failed').length;return{run,total,done,running,failed,pct:total?Math.round(done/total*100):0}}
  function renderGroups(visibleNodeSet=null){
    if(!groupLayer)return;
    groupLayer.innerHTML='';
    const vr=viewportWorldRect(900),frag=document.createDocumentFragment();
    (state.groups||[]).forEach(g=>{
      const b=groupBounds(g);if(!b)return;
      const intersects=rectIntersects({left:b.left,top:b.top,right:b.right,bottom:b.bottom},vr);if(!intersects&&g.id!==selectedGroupId)return;
      const info=groupRunInfo(g),taskFailedCount=g.nodeIds.filter(id=>state.nodes.find(n=>n.id===id)?.taskStatus==='failed').length,failedCount=Math.max(info?.failed||0,taskFailedCount),runClass=info?.run?.status==='running'?' run-active':failedCount?' run-failed':info&&info.done===info.total?' run-done':'';
      const div=document.createElement('div');
      div.className='canvas-group '+(g.kind==='storyboard'?'storyboard-group ':'')+(g.id===selectedGroupId?' selected-group ':'')+(g.collapsed?'collapsed-group ':'')+runClass;
      div.dataset.groupId=g.id;div.style.left=b.left+'px';div.style.top=b.top+'px';div.style.width=(b.right-b.left)+'px';div.style.height=(b.bottom-b.top)+'px';
      const typeCounts={};b.nodes.forEach(n=>typeCounts[n.type]=(typeCounts[n.type]||0)+1);
      const typeSummary=Object.entries(typeCounts).slice(0,4).map(([t,c])=>`${labelForType(t)} ${c}`).join(' · ');
      div.innerHTML=`<div class="group-label"><button class="group-collapse-btn ${g.collapsed?'collapsed':''}" data-group-collapse="${g.id}" title="${g.collapsed?'展开工作流组':'折叠工作流组'}">${uiIcon('chevronDown')}</button><span class="group-title">${escapeHtml(g.title||'工作流组')}</span>${g.locked?'<i class="group-guard">'+uiIcon('lock')+'</i>':''}${g.frozen?'<i class="group-guard">'+uiIcon('freeze')+'</i>':''}<span>${g.kind==='storyboard'?`${b.nodes.length}/${Number(g.meta?.capacity||b.nodes.length)} Frames`:`${b.nodes.length} 节点`}</span>${info?`<em>${info.run.status==='running'?`${info.done}/${info.total}`:workflowStatusLabel(info.run.status)}</em>`:''}${failedCount?`<button class="group-retry-btn" data-group-retry="${g.id}" title="重跑失败节点及下游">${uiIcon('refresh')} <span>${failedCount}</span></button>`:''}</div>${g.collapsed?`<div class="collapsed-group-summary"><b>${escapeHtml(typeSummary||'工作流')}</b><span>${info?`${info.pct}% · ${info.done}/${info.total} 完成`:'双击或点击箭头展开'}</span></div>`:''}${info?`<div class="group-run-progress"><i style="width:${info.pct}%"></i><span>${info.pct}%${info.running?` · ${info.running} 运行`:''}${info.failed?` · ${info.failed} 失败`:''}</span></div>`:''}`;
      const lab=$('.group-label',div);
      const collapseBtn=$('[data-group-collapse]',div);if(collapseBtn){collapseBtn.onpointerdown=e=>e.stopPropagation();collapseBtn.onclick=e=>{e.preventDefault();e.stopPropagation();toggleGroupCollapsed(g.id)}}
      const retryBtn=$('[data-group-retry]',div);if(retryBtn){retryBtn.onpointerdown=e=>e.stopPropagation();retryBtn.onclick=e=>{e.preventDefault();e.stopPropagation();rerunFailedGroupDownstream(g.id)}}
      lab.onpointerdown=e=>{if(e.target.closest('button'))return;if(g.locked){e.preventDefault();e.stopPropagation();selectedGroupId=g.id;showToast('工作流组已锁定');renderGroups(renderedNodeIds());return;}if(e.button!==0){e.stopPropagation();return}e.preventDefault();e.stopPropagation();groupDragging={groupId:g.id,pointerId:e.pointerId,startClient:{x:e.clientX,y:e.clientY},starts:Object.fromEntries(b.nodes.map(n=>[n.id,{x:n.x,y:n.y}])),collapsedStart:g.collapsed&&g.collapsedPos?{...g.collapsedPos}:null,moved:false,snapshotted:false};div.classList.add('dragging-group');try{lab.setPointerCapture(e.pointerId)}catch{}};
      lab.onclick=e=>{if(e.target.closest('button'))return;e.stopPropagation();if(g.__justDragged){g.__justDragged=false;return}selectedEdgeId=null;selectedGroupId=g.id;expandedNodeId=null;if(g.collapsed){state.selectedIds=[];selectedId=null}else{state.selectedIds=[...g.nodeIds];selectedId=g.nodeIds[0]||null}state.nodes.forEach(n=>n.selected=n.id===selectedId);render()};
      lab.ondblclick=e=>{if(e.target.closest('button'))return;e.preventDefault();e.stopPropagation();toggleGroupCollapsed(g.id)};
      lab.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();selectedGroupId=g.id;showGroupMenu(e.clientX,e.clientY,g.id)};
      frag.appendChild(div)
    });
    groupLayer.appendChild(frag)
  }



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

  async function applyLocalVideoToNode(n,file){
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

  async function applyLocalAudioToNode(n,file){
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

  function textResultValue(n){return String(n?.text||n?.generatedText||'').trim()}
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

  function selectedToolbarNode(){const ids=currentSelectionIds();if(ids.length!==1)return null;return state.nodes.find(n=>n.id===ids[0])||null}
  function nodeTopBarActions(n){
    if(!n)return[];
    if(n.type==='image')return[{label:'人像后期调节',action:'image-portrait',primary:true},{label:'全景',tool:'全景',action:'image-panorama'},{label:'多角度',tool:'多角度',action:'image-angle'},{label:'打光',tool:'打光',action:'image-light'},{label:'九宫格',tool:'九宫格',action:'image-grid'},{label:'高清',tool:'高清',action:'image-hd'},{label:'元素编辑',action:'image-element'},{label:'图层分离',action:'image-layers'},{label:'宫格切分',tool:'宫格切分',action:'image-split'},{label:'画笔',action:'image-brush',iconOnly:true},{label:'下载',action:'image-download',iconOnly:true},{label:'全屏',action:'image-fullscreen',iconOnly:true}];
    if(n.type==='video')return[{label:'高清',tool:'高清',action:'video-hd',primary:true},{label:'片段重拍',tool:'片段重拍',action:'video-reshoot'},{label:'提帧',tool:'逐帧拉片',action:'video-frames'},{label:'剪辑',tool:'剪辑',action:'video-trim'},{label:'音频分离',tool:'分离音视频',action:'video-audio'},{label:'续写',tool:'智能续写',action:'video-extend'},{label:'下载',action:'video-download',iconOnly:true},{label:'全屏',action:'video-fullscreen',iconOnly:true}];
    if(n.type==='audio')return[{label:'截取',tool:'截取',action:'audio-trim',primary:true},{label:'变速',tool:'变速',action:'audio-speed'},{label:'切分',tool:'切分',action:'audio-split'},{label:'下载',action:'audio-download',iconOnly:true}];
    if(n.type==='text')return[{label:'改写',action:'text-rewrite',primary:true},{label:'扩写',action:'text-expand'},{label:'精简',action:'text-simplify'},{label:'翻译',action:'text-translate'},{label:'文生图',action:'text-image'},{label:'文生视频',action:'text-video'}];
    if(n.type==='script')return[{label:'编辑脚本',tool:'打开脚本',primary:true},{label:'看板',tool:'整集看板'},{label:'批量生成',action:'script-batch'},{label:'改生成提示',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
    if(n.type==='director')return[{label:'打开导演台',tool:'打开导演台',primary:true},{label:'截图',tool:'截图'},{label:'更多',action:'more'}];
    return[{label:'复制',tool:'复制',primary:true},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
  }
  function openTopBarMore(n,anchor){const r=anchor.getBoundingClientRect();showContextMenu(Math.min(window.innerWidth-280,r.left),r.bottom+5,n.id)}
  function openNativeResultComposer(n,mode='edit'){
    if(!n||!['image','video','audio','text','script'].includes(n.type))return;
    expandedNodeId=n.id;selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);renderToolbar();renderGenerator();
    setTimeout(()=>$('#promptInput,#scriptDetailPrompt,textarea',generator)?.focus(),0);
    if(mode==='rerun')showToast('确认参数后重新生成');
  }
  function runTopBarAction(n,a,anchor){
    if(a.tool)return toolAction(a.tool,n);
    if(a.action==='image-video'){runTransaction('创建图转视频',()=>{createDerivedNode(n,'video','图转视频',n.prompt||'保持主体与构图连续，自然运动',{operation:'image_to_video'},430)});return}
    if(a.action==='script-batch'){openScriptEditor(n,'batch-image');return}
    if(a.action==='image-portrait'){openImagePortraitMenu(n,anchor);return}
    if(a.action==='image-element'||a.action==='image-brush'){openImageTool('重绘',n);return}
    if(a.action==='image-layers'){sendImageLayerSeparation(n);return}
    if(a.action==='image-download'){downloadImageNode(n);return}
    if(a.action==='image-fullscreen'){fullscreenImageNode(n);return}
    if(a.action==='video-download'){downloadVideoNode(n);return}
    if(a.action==='video-fullscreen'){fullscreenVideoNode(n);return}
    if(a.action==='audio-download'){downloadAudioNode(n);return}
    if(a.action==='text-rewrite'){branchTextResult(n,{title:'文本改写',instruction:'在不改变核心事实和含义的前提下，重写下面文本，让表达更自然、清晰、有节奏，并避免机械复述。',operation:'text_rewrite'});return}
    if(a.action==='text-expand'){branchTextResult(n,{title:'文本扩写',instruction:'扩写下面文本，补足必要细节、逻辑衔接和可读性，但不要虚构未经原文支持的关键事实。',operation:'text_expand'});return}
    if(a.action==='text-simplify'){branchTextResult(n,{title:'文本精简',instruction:'精简下面文本，删除重复和冗余表达，保留核心信息、关键事实与原有语气。',operation:'text_simplify'});return}
    if(a.action==='text-translate'){openTextTranslateMenu(n,anchor);return}
    if(a.action==='text-image'){branchTextResult(n,{title:'文生图',targetType:'image',instruction:'把下面文本转化为可直接生成图片的视觉提示词：明确主体、场景、构图、镜头、光线、色彩、材质和风格，并忠于文本内容。',operation:'text_to_image'});return}
    if(a.action==='text-video'){branchTextResult(n,{title:'文生视频',targetType:'video',instruction:'把下面文本转化为可直接生成视频的提示词：明确主体动作、场景、镜头、运镜、节奏、光线和声音氛围，并忠于文本内容。',operation:'text_to_video'});return}
    if(a.action==='edit-prompt'){openNativeResultComposer(n,'edit');return}
    if(a.action==='rerun'){openNativeResultComposer(n,'rerun');return}
    if(a.action==='duplicate'){duplicateSelection(n.id,false);return}
    if(a.action==='more')openTopBarMore(n,anchor);
  }
  function renderToolbar(){
    const ids=currentSelectionIds();
    if(ids.length>1){
      const r=viewport.getBoundingClientRect();
      toolbar.style.left=Math.max(76,Math.min(window.innerWidth-620,r.left+r.width/2-280))+'px';toolbar.style.top=CONTEXT_TOOLBAR_SAFE_TOP+'px';
      toolbar.removeAttribute('data-media-type');toolbar.classList.remove('node-toolbar-media','node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');
      toolbar.innerHTML=`<span class="selection-toolbar-label">已选 ${ids.length}</span><button class="tool-btn primary" data-multi-top="batch-connect">批量连接</button><button class="tool-btn" data-multi-top="group">打组</button><button class="tool-btn" data-multi-top="workflow">保存工作流</button><button class="tool-btn" data-multi-top="run">整组执行</button><button class="tool-btn" data-multi-top="layout">整理</button><button class="tool-btn danger" data-multi-top="delete">删除</button>`;
      toolbar.classList.remove('hidden');
      $$('[data-multi-top]',toolbar).forEach(b=>b.onclick=()=>{const a=b.dataset.multiTop;if(a==='batch-connect')openBatchConnectDialog();if(a==='group')createGroup(ids,'工作流组','workflow');if(a==='workflow')saveWorkflowFromSelection();if(a==='run')executeWorkflowIds(ids,{title:'选中节点执行'});if(a==='layout')openAutoLayoutMenu();if(a==='delete')deleteSelection();});return;
    }
    const n=selectedToolbarNode();
    if(n?.type==='text'&&n.textInputMode==='manual'&&n.textEditing){
      const editNode=$(`.node[data-id="${CSS.escape(String(n.id))}"]`);if(!editNode){toolbar.classList.add('hidden');return}
      renderManualTextToolbar(n,editNode);return;
    }
    const contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
    const el=`.node[data-id="${CSS.escape(String(n.id))}"]`;
    const nodeEl=$(el);if(!nodeEl){toolbar.classList.add('hidden');return}
    const r=nodeEl.getBoundingClientRect(),actions=nodeTopBarActions(n);
    toolbar.classList.remove('node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');toolbar.classList.add('node-toolbar-media','node-toolbar-'+n.type);toolbar.dataset.mediaType=n.type;
    if(n.type==='image'||n.type==='video'||n.type==='audio'){
      const estimatedWidth=Math.min(window.innerWidth-32,Math.max(n.type==='image'?760:n.type==='video'?620:360,actions.length*68));
      toolbar.style.left=Math.max(16,Math.min(window.innerWidth-estimatedWidth-16,r.left+r.width/2-estimatedWidth/2))+'px';
      toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-58)+'px';
      toolbar.innerHTML=actions.map((a,i)=>`<button class="tool-btn ${a.primary?'primary':''} ${a.iconOnly?'icon-only':''}" data-top-action="${i}" title="${escapeAttr(a.label)}"><span class="tool-glyph">${n.type==='image'?imageToolbarGlyph(a.action||''):n.type==='video'?videoToolbarGlyph(a.action||''):audioToolbarGlyph(a.action||'')}</span>${a.iconOnly?'':`<span>${escapeHtml(a.label)}</span>`}${a.action==='image-portrait'?'<span class="tool-arrow">⌄</span>':''}</button>`).join('');
      toolbar.classList.remove('hidden');
      $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));return;
    }
    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(CONTEXT_TOOLBAR_SAFE_TOP,r.top-40)+'px';
    toolbar.innerHTML=`<span class="selection-toolbar-label">${escapeHtml(labelForType(n.type))}结果</span>`+actions.map((a,i)=>`<button class="tool-btn ${a.primary?'primary':''}" data-top-action="${i}">${escapeHtml(a.label)}</button>`).join('');toolbar.classList.remove('hidden');
    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));
  }

  function defaultCapabilities(modality,id='',name=''){
    const t=`${id} ${name}`.toLowerCase();
    if(modality==='image')return{modality,aspectRatios:['1:1','16:9','9:16','4:3','3:4','21:9'],resolutions:['1K','2K','4K'],maxImages:/edit|reference|seedream|navo|qwen/.test(t)?4:1,supportsImageReference:true,supportsMask:/edit|inpaint|seedream|navo|qwen/.test(t),supportsOutpaint:true,supportsCamera:true,supportsStyle:true};
    if(modality==='video'){
      const frameCap=/seedance|h3|minimax|kling|vidu|wan|hailuo|pixverse|runway|sora|veo|luma/.test(t);
      const resolutions=/kling/.test(t)?['720p','1080p','2160p']:/h3|minimax/.test(t)?['768p','1440p']:/sora/.test(t)?['720p','1080p']:['480p','720p','1080p'];
      const supportsImageReference=true;
      const supportsAudioReference=/seedance|h3|minimax|kling|wan/.test(t);
      const supportsNativeAudio=/seedance|h3|minimax|kling.?3|wan|pixverse/.test(t);
      const supportsFirstFrame=frameCap;
      const supportsLastFrame=frameCap;
      const supportsTextToVideo=true;
      const generationModes=['text2video'];
      if(supportsImageReference)generationModes.push('image2video');
      if(supportsAudioReference||supportsNativeAudio)generationModes.push('audio2video');
      if(supportsFirstFrame||supportsLastFrame)generationModes.push('frame2video');
      return{modality,durations:/seedance.*2.5/.test(t)?[4,5,10,15,30]:/h3|minimax/.test(t)?[4,5,6,8,10,12,15]:/sora/.test(t)?[4,8,12]:[4,5,10],resolutions,aspectRatios:/sora/.test(t)?['16:9','9:16']:['16:9','9:16','1:1','4:3','3:4'],maxImages:/seedance.*2.5/.test(t)?30:/h3|minimax/.test(t)?9:7,maxVideos:/seedance.*2.5/.test(t)?10:/h3|minimax/.test(t)?3:1,maxAudios:/seedance.*2.5/.test(t)?10:/h3|minimax/.test(t)?3:1,maxReferences:/seedance.*2.5/.test(t)?50:/h3|minimax/.test(t)?12:12,supportsTextToVideo,supportsFirstFrame,supportsLastFrame,supportsImageReference,supportsVideoReference:/seedance|h3|minimax|kling|wan|vidu|edit/.test(t),supportsAudioReference,supportsNativeAudio,supportsVideoEdit:/seedance|h3|minimax|kling.?o|edit/.test(t),supportsExtend:/seedance|h3|minimax|extend/.test(t),supportsReshoot:/seedance|h3|minimax|edit/.test(t),supportsSubjects:/kling|vidu|subject/.test(t),generationModes};
    }
    if(modality==='text')return{modality,supportsVision:/vl|vision|cvlm|gvlm|multimodal/.test(t),supportsVideoUnderstanding:/vl|vision|gvlm/.test(t),supportsJson:true};
    return{modality,tts:/speech|tts|eleven|minimax/.test(t),music:/music|mureka|suno|udio/.test(t),voiceClone:/minimax|clone|speech/.test(t)};
  }
  function modelCapabilitiesFor(type,p,m){return {...defaultCapabilities(type,m?.id,m?.name),...(m?.capabilities||{})}}
  function modelCapabilities(n){const p=providerById(n.providerId),m=modelForNode(n);return modelCapabilitiesFor(n.type,p,m)}
  function normalizeVideoModeKey(value){
    const v=String(value||'').trim().toLowerCase();
    if(!v)return '';
    if(['text2video','text-video','text_video','文生视频','文生'].includes(v))return 'text2video';
    if(['image2video','image-video','image_video','图生视频','图生'].includes(v))return 'image2video';
    if(['audio2video','audio-video','audio_video','音频生视频','音频生'].includes(v))return 'audio2video';
    if(['frame2video','first_last','first-last','首帧 / 末帧','首帧末帧','首帧视频','末帧视频'].includes(v))return 'frame2video';
    return v;
  }
  function videoModeOptions(caps={}){
    const fromCaps=Array.isArray(caps.generationModes)?caps.generationModes.map(normalizeVideoModeKey).filter(Boolean):[];
    const options=[];
    const add=(key,label)=>{if(!options.some(x=>x.key===key))options.push({key,label})};
    if(fromCaps.length){
      for(const key of fromCaps){
        if(key==='text2video')add(key,'文生视频');
        else if(key==='image2video')add(key,'图生视频');
        else if(key==='audio2video')add(key,'音频生视频');
        else if(key==='frame2video')add(key,'首帧 / 末帧');
        else add(key,key);
      }
      return options;
    }
    add('text2video','文生视频');
    if(caps.supportsImageReference!==false)add('image2video','图生视频');
    if(caps.supportsAudioReference||caps.supportsNativeAudio)add('audio2video','音频生视频');
    if(caps.supportsFirstFrame||caps.supportsLastFrame)add('frame2video','首帧 / 末帧');
    return options;
  }
  function videoModeLabel(mode){
    const key=normalizeVideoModeKey(mode);
    return ({text2video:'文生视频',image2video:'图生视频',audio2video:'音频生视频',frame2video:'首帧 / 末帧'})[key]||'文生视频';
  }
  function syncVideoNodeCapabilities(n,caps){
    if(!n||n.type!=='video')return;
    const modes=videoModeOptions(caps);
    if(modes.length&&!modes.some(x=>x.key===normalizeVideoModeKey(n.videoMode)))n.videoMode=modes[0].key;
    const durations=(caps.durations||[]).map(Number).filter(Number.isFinite);
    if(durations.length&&!durations.includes(Number(n.duration)))n.duration=durations[0];
    const resolutions=(caps.resolutions||[]).map(String).filter(Boolean);
    if(resolutions.length&&!resolutions.includes(String(n.resolution||'')))n.resolution=resolutions[0];
    const aspectRatios=(caps.aspectRatios||[]).map(String).filter(Boolean);
    if(aspectRatios.length&&!aspectRatios.includes(String(n.aspectRatio||'')))n.aspectRatio=aspectRatios[0];
  }
  function defaultVideoModeForSource(source,params={},targetType='video'){
    if(targetType!=='video')return '';
    const explicit=normalizeVideoModeKey(params.generationMode||params.videoMode||'');
    if(explicit)return explicit;
    const op=String(params.operation||params.tool||'').toLowerCase();
    if(source?.type==='audio'||/audio|voice|speech/.test(op))return 'audio2video';
    if(source?.type==='image'||/image|reference|first_frame|last_frame|frame/.test(op))return 'image2video';
    return 'text2video';
  }
  function optionList(values,current){const arr=[...new Set((values||[]).map(String))];return arr.map(x=>`<option value="${escapeAttr(x)}" ${String(current)===x?'selected':''}>${escapeHtml(x)}</option>`).join('')}
  async function openModelPickerForNode(n,anchor,modalityOverride=''){
    if(!modelPicker||!n)return;
    await loadProviders();
    const modality=modalityOverride||n.type;
    const isScriptText=n.type==='script'&&modality==='text';
    const currentProviderId=isScriptText?(n.scriptProviderId||''):(n.providerId||'');
    const currentModelId=isScriptText?(n.scriptModelId||''):(n.modelId||'');
    const allItems=allModelsForType(modality),items=allItems.filter(x=>x.runtimeReady!==false),pending=allItems.filter(x=>x.runtimeReady===false);const r=anchor?.getBoundingClientRect?.();
    modelPicker.style.left=Math.max(76,Math.min(window.innerWidth-330,(r?.left||120)))+'px';
    modelPicker.style.top=Math.min(window.innerHeight-360,(r?.bottom||120)+6)+'px';
    const readyHtml=items.map((m,i)=>`<button data-model-pick="${i}" class="model-pick-row ${currentProviderId===m.providerId&&currentModelId===m.id?'active':''}"><span><b>${escapeHtml(m.name||m.id)}</b><small>${escapeHtml(m.providerName)} · 已就绪</small></span><i>${currentProviderId===m.providerId&&currentModelId===m.id?'✓':'›'}</i></button>`).join('');
    const pendingHtml=pending.length?`<div class="model-picker-section-title">待完成适配</div>${pending.map(m=>`<button class="model-pick-row pending" disabled><span><b>${escapeHtml(m.name||m.id)}</b><small>${escapeHtml(m.providerName)} · 到「全部模型」完成高级配置</small></span><i>!</i></button>`).join('')}`:'';
    modelPicker.innerHTML=`<div class="model-picker-head"><b>选择${labelForType(modality)}模型</b><span>${items.length} 个可用${pending.length?` · ${pending.length} 个待配置`:''}</span></div><div class="model-picker-list">${readyHtml||'<div class="model-picker-empty">还没有可用模型<br><button id="modelPickerSetup">添加 API 供应商</button></div>'}${pendingHtml}</div><div class="model-picker-foot"><button id="modelPickerManage">管理模型来源</button></div>`;
    modelPicker.classList.remove('hidden');
    const reopenActiveEditor=()=>{if(expandedNodeId!==n.id)return render();if(n.type==='video')openVideoStudio(n);else if(n.type==='image')openImageStudio(n);else if(n.type==='script')renderGenerator();else renderGenerator()};
    $$('[data-model-pick]',modelPicker).forEach(b=>b.onclick=()=>{const item=items[Number(b.dataset.modelPick)];if(!item)return;snapshot('切换模型');if(isScriptText){n.scriptProviderId=item.providerId;n.scriptModelId=item.id;n.scriptModelName=item.name||item.id}else setNodeModel(n,item);saveState();modelPicker.classList.add('hidden');reopenActiveEditor()});
    $('#modelPickerSetup',modelPicker)?.addEventListener('click',()=>{modelPicker.classList.add('hidden');openProviderModal()});
    $('#modelPickerManage',modelPicker)?.addEventListener('click',()=>{modelPicker.classList.add('hidden');window.location.href='./models.html'});
  }

  function positionGeneratorBelowNode(n,el,desiredWidth){
    const gap=12,edge=16,dockReserve=84,r=el.getBoundingClientRect(),isText=n?.type==='text',isImage=n?.type==='image',isVideo=n?.type==='video',isAudio=n?.type==='audio';
    generator.dataset.nodeType=n?.type||'';
    generator.classList.toggle('text-generator',isText);
    generator.classList.toggle('image-generator',isImage);
    generator.classList.toggle('video-generator',isVideo);
    generator.classList.toggle('audio-generator',isAudio);
    if(isText||isImage||isVideo||isAudio){
      const width=isImage||isVideo?820:isAudio?660:594,height=isImage?246:isVideo?258:isAudio?210:142,bottomLimit=window.innerHeight-dockReserve-edge;
      generator.style.width=width+'px';
      generator.style.minWidth=width+'px';
      generator.style.maxWidth=width+'px';
      generator.style.height=height+'px';
      generator.style.minHeight=height+'px';
      generator.style.maxHeight=isImage||isVideo||isAudio?height+'px':'none';
      generator.style.overflow='visible';
      const centered=r.left+r.width/2-width/2;
      generator.style.left=Math.max(edge,Math.min(window.innerWidth-width-edge,centered))+'px';
      generator.style.top=(r.bottom+gap)+'px';
      return;
    }
    generator.style.minWidth='';generator.style.maxWidth='';generator.style.height='';generator.style.minHeight='';
    generator.style.width=desiredWidth+'px';generator.style.overflow='auto';
    generator.style.left=Math.max(72,Math.min(window.innerWidth-desiredWidth-edge,r.left-10))+'px';
    const available=Math.max(96,window.innerHeight-r.bottom-gap-edge);
    generator.style.top=(r.bottom+gap)+'px';
    generator.style.maxHeight=available+'px';
  }

  function renderGenerator(){
    if(!expandedNodeId){generator.classList.add('hidden');return}
    const n=state.nodes.find(x=>x.id===expandedNodeId);if(!n||!['image','video','audio','text','script'].includes(n.type)){generator.classList.add('hidden');return}
    if(n.type==='text'&&n.textInputMode==='manual'){expandedNodeId=null;generator.classList.add('hidden');return}
    const el=$(`.node[data-id="${n.id}"]`);if(!el){generator.classList.add('hidden');return}
    const r=el.getBoundingClientRect();
    const desiredWidth=Math.min(660,window.innerWidth-64);

    if(n.type==='script'){
      const textModels=availableModels('text');
      if((!n.scriptProviderId||!n.scriptModelId)&&textModels.length){const first=textModels[0];n.scriptProviderId=first.providerId;n.scriptModelId=first.id;n.scriptModelName=first.name||first.id;}
      const model=textModels.find(x=>x.providerId===n.scriptProviderId&&x.id===n.scriptModelId);
      const label=model?.name||n.scriptModelName||'选择文本模型';
      const mode=n.scriptMode||'breakdown';
      const placeholder=mode==='character'?'连接角色参考图，并描述你想发生的剧情，为你生成分镜脚本':'描述剧情片段、故事，为你生成分镜脚本';
      generator.innerHTML=`<div class="lib-gen-main script-detail-main">
        <div class="script-detail-mode"><span>${mode==='character'?'角色生成分镜脚本':'脚本生成分镜脚本'}</span><button id="openFullScriptDetail">打开完整脚本</button></div>
        <div class="prompt-box libtv-prompt script-prompt-box"><textarea id="scriptDetailPrompt" placeholder="${placeholder}">${escapeHtml(n.sourceText||'')}</textarea><button class="generate-btn" id="scriptGenerateBtn" ${model?'':'disabled'}>${uiIcon('next')}</button></div>
        <div class="lib-gen-controls">
          <button id="scriptModelPickerBtn" class="model-pill ${model?'':'needs-model'}"><span class="model-dot"></span><b>${escapeHtml(label)}</b><i>${uiIcon('chevronDown')}</i></button>
          <button class="micro-icon" title="提示词优化">${uiIcon('edit')}</button><div class="gen-spacer"></div><span class="script-detail-cost">⚡ ${mode==='character'?8:6}</span>
        </div>
        ${model?'':`<button class="inline-setup-model" id="inlineSetupScriptModel">还没有文本模型，点击添加</button>`}
      </div>`;
      generator.classList.remove('hidden');
      positionGeneratorBelowNode(n,el,desiredWidth);
      $('#scriptDetailPrompt')?.addEventListener('input',e=>{n.sourceText=e.target.value;saveState()});
      $('#scriptModelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget,'text'));
      $('#inlineSetupScriptModel')?.addEventListener('click',()=>{if(providers.some(p=>(p.models||[]).length))window.location.href='./models.html';else openProviderModal()});
      $('#openFullScriptDetail')?.addEventListener('click',()=>openScriptEditor(n,'shots'));
      $('#scriptGenerateBtn')?.addEventListener('click',()=>{n.sourceText=$('#scriptDetailPrompt')?.value||n.sourceText||'';if(!String(n.sourceText||'').trim())return showToast('先描述剧情或粘贴剧本');saveState();expandedNodeId=null;generator.classList.add('hidden');renderToolbar();aiBreakdownScript(n)});
      return;
    }

    const m=ensureDefaultModel(n),baseCaps=modelCapabilities(n),imageCaps=n.type==='image'&&m?imageCapabilitiesFor(providerById(n.providerId),m):null,caps=imageCaps?{...baseCaps,aspectRatios:imageCaps.aspectRatios,resolutions:imageCaps.resolutions,imageQualities:imageCaps.qualityLabels,maxImages:imageCaps.maxImages}:baseCaps,hints=getAutoLinkHints(n.prompt||'',n.id),refs=collectReferences(n.id),contextCandidates=creativeContextCandidates(n),contextHigh=contextCandidates.filter(x=>x.score>=80).length;
    if(n.type==='image'&&imageCaps)syncImageNodeCapabilities(n,imageCaps);
    if(n.type==='video')syncVideoNodeCapabilities(n,caps);
    const ratios=caps.aspectRatios||['16:9','9:16','1:1'],durations=caps.durations||[4,5,10],resolutions=caps.resolutions||['720p'],videoModes=videoModeOptions(caps);
    const modelLabel=m?.name||m?.id||'选择模型';
    const noModel=!m;
    const frozen=Boolean(n.frozen);
    if(n.type==='image'){
      const imageRefs=refs.filter(r=>r.type==='image');
      const refFor=role=>imageRefs.find(r=>r.role===role)||null;
      const slot=(role,label,glyph)=>{const ref=refFor(role);return `<button type="button" class="image-ref-slot ${ref?'has-ref':''}" data-image-ref-slot="${role}" title="${escapeAttr(ref?`${label} · ${ref.title}`:`添加${label}参考`)}">${ref?.url?`<img src="${escapeAttr(ref.url)}" alt="">`:`<span class="slot-icon">${glyph}</span><span>${label}</span>`}</button>`};
      const imageResolutions=caps.resolutions||['1K'];
      const imageQualities=imageCaps?.qualityLabels||['模型默认'];
      const imageCountMax=Math.max(1,Math.min(4,Number(imageCaps?.maxImages||4)));
      generator.dataset.imageCapabilityManaged='1';generator.dataset.imageRatios=JSON.stringify(ratios);generator.dataset.imageResolutions=JSON.stringify(imageResolutions);generator.dataset.imageQualities=JSON.stringify(imageQualities);generator.dataset.imageQuality=n.imageQuality||imageQualities[0];generator.dataset.imageCapabilityFamily=imageCaps?.family||'';generator.dataset.imageCapabilitySource=imageCaps?.source||'';
      generator.innerHTML=`<div class="lib-gen-main image-generator-main">
        <div class="image-gen-top">${slot('style_reference','风格','◇')}${slot('character_reference','标记','⌾')}${slot('image_reference','聚焦','◎')}<button type="button" class="image-gen-expand" id="imageGenExpand" title="打开图像工作台">↗</button></div>
        <div class="prompt-box image-prompt-box"><textarea id="promptInput" placeholder="描述你想要生成的画面内容，按 / 呼出指令，@引用素材" ${frozen?'disabled':''}>${escapeHtml(n.prompt||'')}</textarea></div>
        <div class="image-gen-controls">
          <button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}"><span class="model-dot"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button>
          <select id="ratioSelect" class="image-gen-select" title="画幅比">${optionList(ratios,n.aspectRatio||ratios[0])}</select>
          <select id="resolutionSelect" class="image-gen-select" title="分辨率">${optionList(imageResolutions,n.resolution||imageResolutions[0])}</select>
          <button type="button" class="image-gen-action" id="imageCameraBtn">${uiIcon('reframe')}<span>摄像机控制</span></button>
          <div class="image-gen-spacer"></div>
          <select id="countSelect" class="image-gen-select" title="生成张数">${Array.from({length:imageCountMax},(_,i)=>i+1).map(x=>`<option value="${x}" ${Number(n.count||1)===x?'selected':''}>${x}张</option>`).join('')}</select>
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
    if(n.type==='video'){
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
    if(n.type==='audio'){
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
    generator.innerHTML=`
      <div class="lib-gen-main ${n.type==='text'?'text-generator-main':''}">
        <div class="prompt-box libtv-prompt"><textarea id="promptInput" placeholder="${n.type==='text'?'写下你想讲的故事、场景或角色设定。例如：一个来自未来的机器人，在城市屋顶看星星。':'描述你想生成的内容，输入 @ 引用画布素材…'}" ${frozen?'disabled':''}>${escapeHtml(n.prompt||'')}</textarea><button class="generate-btn" id="generateBtn" ${noModel||frozen?'disabled':''}>${uiIcon('next')}</button></div>${frozen?'<div class="frozen-generator-note">'+uiIcon('freeze')+'<span>当前节点结果已冻结。工作流会复用这个结果，不会再次扣费生成。</span></div>':''}
        ${hints.length?`<div class="autolink-bar smart"><span>AutoLink</span>${hints.map((h,i)=>`<button data-autolink="${i}" title="${escapeAttr((h.reason||'')+' · '+edgeRoleLabel(h.role||'reference'))}">@${escapeHtml(h.title)}<i>${escapeHtml(h.source||edgeRoleLabel(h.role||'reference'))}</i></button>`).join('')}<small>Tab 确认 · Shift+Tab 全部</small></div>`:''}
        ${semanticWarningHtml(n)}
        ${nodeResultVersions(n).length?`<div class="gen-result-strip"><span>生成结果 ${activeNodeResultIndex(n)+1}/${nodeResultVersions(n).length}</span><div><button id="genResultPrev" ${nodeResultVersions(n).length<2?'disabled':''}>‹</button><button id="genResultNext" ${nodeResultVersions(n).length<2?'disabled':''}>›</button>${nodeResultVersions(n).length>1?'<button id="genResultCompare">对比</button>':''}</div></div>`:''}
        <div class="lib-gen-controls">
          <button id="modelPickerBtn" class="model-pill ${noModel?'needs-model':''}"><span class="model-dot"></span><b>${escapeHtml(modelLabel)}</b><i>${uiIcon('chevronDown')}</i></button><button id="fallbackModelBtn" class="micro-action fallback-model-btn" title="主模型失败时自动切换">备用 ${(n.fallbackModels||[]).length}</button>
          ${n.type==='video'?`<select id="videoModeSelect" class="micro-select">${videoModes.map(v=>`<option value="${escapeAttr(v.key)}" ${normalizeVideoModeKey(n.videoMode||videoModes[0]?.key)===v.key?'selected':''}>${escapeHtml(v.label)}</option>`).join('')}</select>`:''}
          ${['image','video'].includes(n.type)?`<select id="ratioSelect" class="micro-select">${optionList(ratios,n.aspectRatio||ratios[0])}</select>`:''}
          ${n.type==='image'?`<select id="countSelect" class="micro-select">${[1,2,3,4].map(x=>`<option value="${x}" ${Number(n.count||1)===x?'selected':''}>${x} 张</option>`).join('')}</select>`:''}
          ${n.type==='video'?`<select id="durationSelect" class="micro-select">${optionList(durations,n.duration||durations[0])}</select><select id="resolutionSelect" class="micro-select">${optionList(resolutions,n.resolution||resolutions[0])}</select>`:''}
          <button class="micro-action" id="referenceBtn">${uiIcon('plus')}<span>参考${refs.length?` ${refs.length}`:''}</span></button><button class="micro-action context-open-btn ${contextHigh?'has-context':''}" id="creativeContextBtn">${uiIcon('context')}<span>Context${contextHigh?` ${contextHigh}`:''}</span></button>
          ${costBadgeHtml(n)}
          <div class="gen-spacer"></div>
          ${n.type==='image'?`<button class="micro-icon" data-gen-tool="风格" title="风格">风格</button><button class="micro-icon" data-gen-tool="镜头聚焦" title="镜头聚焦">聚焦</button>`:''}
          ${n.type==='video'?`<button class="micro-icon" data-gen-tool="运镜预设" title="运镜">运镜</button>${caps.supportsSubjects?'<button class="micro-icon" data-gen-tool="主体库" title="主体">主体</button>':''}`:''}
        </div>
        ${noModel?`<button class="inline-setup-model" id="inlineSetupModel">还没有${labelForType(n.type)}模型，点击添加</button>`:''}
        <div class="gen-progress ${['queued','running','polling','retrying','provider_succeeded','result_pending'].includes(n.taskStatus)?'':'hidden'}"><i style="width:${n.taskProgress||0}%"></i></div>
      </div>`;
    generator.classList.remove('hidden');
    positionGeneratorBelowNode(n,el,desiredWidth);
    const input=$('#promptInput');
    $('#genResultPrev')?.addEventListener('click',()=>stepNodeResultVersion(n,-1));$('#genResultNext')?.addEventListener('click',()=>stepNodeResultVersion(n,1));$('#genResultCompare')?.addEventListener('click',()=>openNodeVersionCompare(n));
    input.addEventListener('input',e=>{n.prompt=e.target.value;saveState();if(creativeContextSettings().autoSuggest!==false){clearTimeout(n.__autolinkTimer);n.__autolinkTimer=setTimeout(()=>refreshAutoLinkHints(n),260)}});
    input.addEventListener('keydown',e=>{if(e.key==='Tab'&&hints.length){e.preventDefault();applyAutoLinks(n,e.shiftKey?hints:[hints[0]]);renderGenerator();setTimeout(()=>$('#promptInput')?.focus(),0)}});
    $$('[data-autolink]',generator).forEach(b=>b.onclick=()=>{applyAutoLinks(n,[hints[Number(b.dataset.autolink)]]);renderGenerator()});
    $('#modelPickerBtn')?.addEventListener('click',e=>openModelPickerForNode(n,e.currentTarget));$('#fallbackModelBtn')?.addEventListener('click',()=>openFallbackModelPicker(n));
    $('#inlineSetupModel')?.addEventListener('click',()=>{if(providers.some(p=>(p.models||[]).length))window.location.href='./models.html';else openProviderModal()});
    $('#videoModeSelect')?.addEventListener('change',e=>{n.videoMode=normalizeVideoModeKey(e.target.value);saveState()});
    $('#ratioSelect')?.addEventListener('change',e=>{n.aspectRatio=e.target.value;saveState()});
    $('#countSelect')?.addEventListener('change',e=>{n.count=Number(e.target.value);saveState()});
    $('#durationSelect')?.addEventListener('change',e=>{n.duration=Number(e.target.value);saveState()});
    $('#resolutionSelect')?.addEventListener('change',e=>{n.resolution=e.target.value;saveState()});
    $('#generateBtn').onclick=()=>{expandedNodeId=null;generator.classList.add('hidden');renderToolbar();generateForNode(n).catch(()=>{})};$('#generationCostBtn')?.addEventListener('click',()=>openCostDetails([n.id]));
    $('#referenceBtn')?.addEventListener('click',()=>openReferencePicker(n));$('#creativeContextBtn')?.addEventListener('click',()=>openCreativeContextComposer(n));
    $$('[data-gen-tool]',generator).forEach(b=>b.onclick=()=>openFeatureTool(b.dataset.genTool,n));
    if(n.type==='text'&&contentState==='result'&&n.textInputMode!=='manual'){
      $('.node-body',el)?.addEventListener('dblclick',e=>{if(e.target.closest('button,textarea'))return;e.preventDefault();e.stopPropagation();beginManualTextEdit(n)});
    }
  }

  // v3.3 · Creative Context Engine: explicit links + sequence/shot state + prompt mentions + nearby canvas + project assets.
  function creativeContextSettings(){state.creativeContext=state.creativeContext||{};return state.creativeContext}
  function contextNodeCenter(n){return{x:Number(n?.x||0)+Number(n?.w||320)/2,y:Number(n?.y||0)+nodeHeight(n)/2}}
  function contextDistance(a,b){const x=contextNodeCenter(a),y=contextNodeCenter(b);return Math.hypot(x.x-y.x,x.y-y.y)}
  function contextRoleFor(item,target){
    const title=String(item?.title||item?.name||'').toLowerCase(),type=item?.type||item?.kind||'';
    if(type==='script')return'script_context';if(type==='text')return'prompt_context';if(type==='audio')return'audio_reference';if(type==='video')return target?.type==='video'?'video_reference':'reference';
    if(/角色|人物|模特|主体|character|person|model|subject/.test(title))return'character_reference';if(/场景|环境|空间|背景|scene|location|background/.test(title))return'scene_reference';if(/风格|style|look|视觉/.test(title))return'style_reference';return type==='image'?'image_reference':'reference';
  }
  function projectInlineAssets(){
    const out=[];for(const sn of state.nodes.filter(x=>x.type==='script'&&x.scriptData)){const d=ensureScriptData(sn);for(const bucket of ['characters','scenes','props'])for(const a of (d.assets?.[bucket]||[]))out.push({id:`scriptasset:${sn.id}:${a.id}`,assetId:a.id,scriptNodeId:sn.id,title:a.name||'未命名资产',type:a.mediaUrl?'image':'asset',text:a.prompt||'',url:a.mediaUrl||'',tags:[bucket,bucket==='characters'?'角色':bucket==='scenes'?'场景':'道具'],refKind:'script_asset',bucket})}return out;
  }
  function localAutoLinkCandidates(nodeId){
    const nodes=state.nodes.filter(n=>n.id!==nodeId).map(n=>({id:n.id,title:n.title||labelForType(n.type),type:n.type,text:n.text||n.prompt||'',url:n.outputUrl||'',tags:[n.modelName,n.type].filter(Boolean),refKind:'node'}));
    const assets=(state.assets||[]).map(a=>({id:a.id,title:a.title,type:a.type||'asset',text:a.prompt||a.text||'',url:a.mediaUrl||'',tags:a.tags||[],refKind:'asset'}));
    const subjects=(state.subjects||[]).map(a=>({id:a.id,title:a.name,type:'subject',text:a.desc||'',url:'',tags:a.tags||[],refKind:'subject'}));
    return [...nodes,...assets,...subjects,...projectInlineAssets()];
  }
  function scriptContextForNode(n){
    const script=scriptNodeForProductionNode(n),shot=scriptShotForProductionNode(n);if(!script||!shot)return null;const d=ensureScriptData(script),stateText=creativeContextSettings().includeNarrativeState===false?'':narrativeStatePrompt(script,shot);
    return{scriptNodeId:script.id,shotId:shot.id,sequenceTitle:script.title||'Sequence',shotNo:shot.no,scene:shot.scene||'',characters:shot.characters||'',shotSize:shot.shotSize||'',action:shot.action||'',dialogue:shot.dialogue||'',style:d.style||'',narrativeState:stateText||''};
  }
  function creativeContextCandidates(n){
    if(!n)return[];const cfg=creativeContextSettings(),q=String(n.prompt||'').toLowerCase(),radius=Math.max(300,Number(cfg.nearbyRadius||1200)),incoming=new Map(state.edges.filter(e=>e.target===n.id).map(e=>[e.source,e])),shotCtx=scriptContextForNode(n),sameShot=new Set();
    if(shotCtx)shotProductionNodes(shotCtx.scriptNodeId,shotCtx.shotId).forEach(x=>{if(x.id!==n.id)sameShot.add(x.id)});
    const expectedNames=new Set();if(shotCtx){String(shotCtx.characters||'').split(/[、,，/|]/).map(x=>x.trim()).filter(Boolean).forEach(x=>expectedNames.add(x.toLowerCase()));if(shotCtx.scene)expectedNames.add(String(shotCtx.scene).toLowerCase())}
    const list=localAutoLinkCandidates(n.id).map(c=>{let score=0,source='项目素材',reason='可用项目素材',role=contextRoleFor(c,n),distance=null;const edge=incoming.get(c.id);if(edge){score=100;source='明确连线';reason=`已连接为${edgeRoleLabel(edge.role||role)}`;role=edge.role||role}else if(sameShot.has(c.id)){score=94;source='当前 Shot';reason='与当前生成节点属于同一 Shot'}else{const node=state.nodes.find(x=>x.id===c.id);const title=String(c.title||'').toLowerCase(),mentioned=title&&q.includes(title),expected=[...expectedNames].some(x=>x&&(title.includes(x)||x.includes(title)));if(expected){score=92;source='Sequence / Shot';reason='当前 Shot 的角色或场景约束'}else if(mentioned){score=89;source='Prompt 提及';reason='Prompt 明确提到了这个素材'}else if(node){distance=contextDistance(n,node);if(distance<=radius){score=Math.round(72-Math.min(30,distance/radius*30));source='画布邻近';reason=`距离当前节点 ${Math.round(distance)}px`}}else if(cfg.includeProjectAssets!==false){score=title&&q.includes(title)?86:38;source=c.refKind==='script_asset'?'项目资产':'资产库';reason=title&&q.includes(title)?'Prompt 命中资产名称':'项目中可复用素材'}}return{...c,score,source,reason,role,distance}}).filter(c=>c.score>=38);
    const seen=new Map();for(const c of list){const k=`${c.refKind||c.type}:${c.id}`;if(!seen.has(k)||seen.get(k).score<c.score)seen.set(k,c)}return[...seen.values()].sort((a,b)=>b.score-a.score||String(a.title).localeCompare(String(b.title))).slice(0,30);
  }
  function getAutoLinkHints(text,nodeId){
    const n=state.nodes.find(x=>x.id===nodeId);if(!n)return[];const q=String(text||'').toLowerCase(),semantic=n.autoLinkHints||[],byId=new Map();
    for(const x of creativeContextCandidates(n)){const title=String(x.title||'').toLowerCase();if(String(text||'').includes('@'+x.title))continue;if(x.score>=80||q.endsWith('@')||(title&&q.includes(title)))byId.set(x.id,x)}
    for(const x of semantic){if(String(text||'').includes('@'+x.title))continue;const local=localAutoLinkCandidates(nodeId).find(c=>c.id===x.id);byId.set(x.id,{...local,...x,source:x.source||'语义匹配',reason:x.reason||'AI 语义匹配'})}
    return[...byId.values()].sort((a,b)=>Number(b.score||0)-Number(a.score||0)).slice(0,6);
  }
  async function refreshAutoLinkHints(n){
    if(!n||String(n.prompt||'').trim().length<2)return;const token=(n.__autolinkToken||0)+1;n.__autolinkToken=token;const locals=creativeContextCandidates(n),localById=new Map(localAutoLinkCandidates(n.id).map(x=>[x.id,x]));
    if(!backendOnline){n.autoLinkHints=locals.filter(x=>x.score>=80).slice(0,8);saveState();if(expandedNodeId===n.id)renderGenerator();return}
    try{const out=await apiJson('/api/autolink',{method:'POST',body:JSON.stringify({text:n.prompt,candidates:localAutoLinkCandidates(n.id)})});if(n.__autolinkToken!==token)return;n.autoLinkHints=(out.matches||[]).map(x=>({...localById.get(x.id),...x,source:'AI 语义匹配',reason:`语义相关度 ${Math.round(Number(x.score||0)*100)}%`}));saveState();if(expandedNodeId===n.id)renderGenerator()}catch{n.autoLinkHints=locals.filter(x=>x.score>=80).slice(0,8);if(expandedNodeId===n.id)renderGenerator()}
  }
  function applyAutoLinks(n,hints){
    if(!hints?.length)return;n.toolParams=n.toolParams||{};n.toolParams.externalRefs=n.toolParams.externalRefs||[];n.autoLinkBindings=n.autoLinkBindings||{};for(const h of hints.filter(Boolean)){const tag='@'+h.title;if(!String(n.prompt||'').includes(tag))n.prompt=((n.prompt||'').trim()+' '+tag).trim();const node=state.nodes.find(x=>x.id===h.id);if(node){let edge=state.edges.find(e=>e.source===node.id&&e.target===n.id);if(!edge){edge=makeSemanticEdge(node.id,n.id,'autolink',h.role||contextRoleFor(h,n));state.edges.push(edge)}else if(h.role){edge.role=h.role;edge.semanticRole=h.role;edge.targetSlot=h.role}n.autoLinkBindings[h.title]={type:'node',id:node.id,role:h.role||edge.role}}else{const asset=(state.assets||[]).find(x=>x.id===h.id);if(asset){n.toolParams.externalRefs=n.toolParams.externalRefs.filter(x=>x.id!==asset.id);n.toolParams.externalRefs.push({id:asset.id,type:asset.type||'image',title:asset.title,url:asset.mediaUrl||'',text:asset.text||asset.prompt||'',kind:'asset',role:h.role||'reference',usage:h.role||'reference'});n.autoLinkBindings[h.title]={type:'asset',id:asset.id,role:h.role||'reference'}}const sub=(state.subjects||[]).find(x=>x.id===h.id);if(sub){n.toolParams.subjectId=sub.id;n.autoLinkBindings[h.title]={type:'subject',id:sub.id};}if(h.refKind==='script_asset'||String(h.id||'').startsWith('scriptasset:')){n.toolParams.externalRefs=n.toolParams.externalRefs.filter(x=>x.id!==h.id);n.toolParams.externalRefs.push({id:h.id,type:h.url?'image':'asset',title:h.title,url:h.url||'',text:h.text||'',kind:'script_asset',role:h.role||contextRoleFor(h,n),usage:'creative_context',scriptNodeId:h.scriptNodeId,assetId:h.assetId});n.autoLinkBindings[h.title]={type:'script_asset',id:h.id,role:h.role||contextRoleFor(h,n)}}}}
    n.contextSnapshot=buildCreativeContextPacket(n);creativeContextSettings().lastNodeId=n.id;creativeContextSettings().lastScanAt=new Date().toISOString();saveState();showToast(`已绑定 ${hints.length} 个 Creative Context 引用`);
  }
  function buildCreativeContextPacket(n,chosen=null){
    const refs=collectReferences(n.id),shot=scriptContextForNode(n),cands=chosen||creativeContextCandidates(n).filter(x=>x.score>=80).slice(0,10);return{version:'3.3',nodeId:n.id,nodeTitle:n.title||'',nodeType:n.type,prompt:n.prompt||'',shot,linkedReferences:refs.map(r=>({id:r.id,title:r.title,type:r.type,role:r.role,url:r.url||'',text:r.text||''})),suggestedContext:cands.map(c=>({id:c.id,title:c.title,type:c.type,role:c.role,source:c.source,score:c.score,reason:c.reason})),createdAt:new Date().toISOString()};
  }
  function composePromptFromContext(n,chosen,mode='enhanced'){
    const base=String(n.prompt||'').trim(),shot=scriptContextForNode(n),refs=[...new Set((chosen||[]).map(x=>'@'+x.title))],lines=[];if(base)lines.push(base);if(refs.length)lines.push(`参考素材：${refs.join('、')}`);if(shot){const shotBits=[shot.scene&&`场景 ${shot.scene}`,shot.characters&&`主体 ${shot.characters}`,shot.shotSize&&`景别 ${shot.shotSize}`,shot.action&&`动作 ${shot.action}`].filter(Boolean);if(shotBits.length)lines.push(`镜头约束：${shotBits.join('；')}`);if(shot.dialogue)lines.push(`对白/旁白：${shot.dialogue}`);if(shot.style)lines.push(`视觉风格：${shot.style}`);if(shot.narrativeState)lines.push(`连续性状态：${shot.narrativeState}`)}if(mode==='structured'){return[`【画面目标】${base||'按当前上下文生成'}`,refs.length?`【引用素材】${refs.join('、')}`:'',shot?`【镜头】${[shot.shotSize,shot.scene,shot.action].filter(Boolean).join('；')}`:'',shot?.dialogue?`【对白/旁白】${shot.dialogue}`:'',shot?.style?`【视觉风格】${shot.style}`:'',shot?.narrativeState?`【连续性】${shot.narrativeState}`:''].filter(Boolean).join('\n')}return lines.join('\n');
  }
  function contextSourceClass(source){return source==='明确连线'?'linked':source==='当前 Shot'||source==='Sequence / Shot'?'sequence':source==='Prompt 提及'||source==='AI 语义匹配'?'semantic':source==='画布邻近'?'nearby':'asset'}
  function creativeContextCandidateHtml(c,i,selected){return`<label class="context-candidate ${contextSourceClass(c.source)} ${selected?'selected':''}"><input type="checkbox" data-context-candidate="${i}" ${selected?'checked':''}><span class="context-source-dot"></span><div><b>@${escapeHtml(c.title||'未命名')}</b><small>${escapeHtml(c.source)} · ${escapeHtml(edgeRoleLabel(c.role))}</small><em>${escapeHtml(c.reason||'')}</em></div><strong>${Math.round(c.score||0)}</strong></label>`}
  function openCreativeContextComposer(n){
    n=n||state.nodes.find(x=>x.id===expandedNodeId)||state.nodes.find(x=>x.id===selectedId);if(!n||!['image','video','audio','text'].includes(n.type))return openCreativeContextOverview();const cands=creativeContextCandidates(n),chosen=new Set(),seenTitles=new Set();for(const c of cands.filter(x=>x.score>=80)){const k=String(c.title||c.id).toLowerCase();if(seenTitles.has(k))continue;seenTitles.add(k);chosen.add(c.id);if(chosen.size>=8)break}const shot=scriptContextForNode(n),cfg=creativeContextSettings();cfg.lastNodeId=n.id;cfg.lastScanAt=new Date().toISOString();
    const renderPreview=()=>{const selected=cands.filter(x=>chosen.has(x.id)),prompt=composePromptFromContext(n,selected,$('#contextComposeMode')?.value||'enhanced'),host=$('#contextPacketPreview');if(host)host.innerHTML=`<div class="context-packet-kpis"><span>引用 <b>${selected.length}</b></span><span>明确连线 <b>${selected.filter(x=>x.source==='明确连线').length}</b></span><span>Shot 上下文 <b>${shot?1:0}</b></span></div><div class="context-packet-list">${selected.map(x=>`<div><b>@${escapeHtml(x.title)}</b><span>${escapeHtml(edgeRoleLabel(x.role))}</span><small>${escapeHtml(x.source)}</small></div>`).join('')||'<div class="context-empty">尚未选择上下文素材</div>'}</div>${shot?`<div class="context-shot-card"><b>${escapeHtml(shot.sequenceTitle)} · Shot ${shot.shotNo}</b><span>${escapeHtml([shot.scene,shot.characters,shot.shotSize].filter(Boolean).join(' · '))}</span>${shot.narrativeState?`<small>${escapeHtml(shot.narrativeState)}</small>`:''}</div>`:''}`;const ta=$('#contextComposedPrompt');if(ta&&!ta.matches(':focus'))ta.value=prompt};
    modalShell('Creative Context · AutoLink & Prompt Composer',`<div class="creative-context-shell"><aside class="context-source-panel"><header><div><b>上下文来源</b><span>${cands.length} 个候选</span></div><button id="contextRescan">重新扫描</button></header><div class="context-source-legend"><span class="linked">明确连线</span><span class="sequence">Shot / Sequence</span><span class="semantic">语义命中</span><span class="nearby">画布邻近</span><span class="asset">项目资产</span></div><div id="contextCandidateList" class="context-candidate-list">${cands.map((c,i)=>creativeContextCandidateHtml(c,i,chosen.has(c.id))).join('')||'<div class="context-empty">当前没有可用上下文。可以在画布上添加素材、连线或在 Prompt 中写出素材名称。</div>'}</div></aside><section class="context-compose-panel"><header><div><b>${escapeHtml(n.title||labelForType(n.type))}</b><span>Prompt Composer</span></div><select id="contextComposeMode"><option value="enhanced">自然增强</option><option value="structured">结构化 Prompt</option></select></header><label>原始 Prompt<textarea id="contextBasePrompt" rows="5">${escapeHtml(n.prompt||'')}</textarea></label><div class="context-compose-arrow">↓ 根据已确认上下文组装</div><label>最终 Prompt<textarea id="contextComposedPrompt" rows="13"></textarea></label><div class="context-compose-actions"><button id="contextApplyRefs">仅绑定引用</button><button id="contextApplyPrompt" class="primary">应用引用 + 最终 Prompt</button></div></section><aside class="context-packet-panel"><header><b>Context Packet</b><span>发送给生成任务前的真实上下文</span></header><div id="contextPacketPreview"></div><div class="context-policy"><b>Confirm-before-bind</b><span>系统可以发现和排序素材，但不会在你确认前自动创建真实引用。</span></div><label class="context-radius">邻近半径 <input id="contextRadius" type="range" min="400" max="2400" step="100" value="${Number(cfg.nearbyRadius||1200)}"><output>${Number(cfg.nearbyRadius||1200)}px</output></label></aside></div>`,{full:true});
    const rebind=()=>{$$('[data-context-candidate]',featureModal).forEach(x=>x.onchange=()=>{const c=cands[Number(x.dataset.contextCandidate)];if(!c)return;if(x.checked)chosen.add(c.id);else chosen.delete(c.id);x.closest('.context-candidate')?.classList.toggle('selected',x.checked);renderPreview()})};rebind();renderPreview();$('#contextComposeMode').onchange=renderPreview;$('#contextBasePrompt').oninput=e=>{n.prompt=e.target.value;renderPreview()};$('#contextRadius').oninput=e=>{cfg.nearbyRadius=Number(e.target.value);e.target.nextElementSibling.value=e.target.value+'px'};$('#contextRadius').onchange=()=>{saveState();openCreativeContextComposer(n)};$('#contextRescan').onclick=()=>{saveState();openCreativeContextComposer(n)};$('#contextApplyRefs').onclick=()=>{n.prompt=$('#contextBasePrompt').value;applyAutoLinks(n,cands.filter(x=>chosen.has(x.id)));n.contextSnapshot=buildCreativeContextPacket(n,cands.filter(x=>chosen.has(x.id)));saveState();closeFeatureModal();render();renderGenerator()};$('#contextApplyPrompt').onclick=()=>{n.prompt=$('#contextBasePrompt').value;const selected=cands.filter(x=>chosen.has(x.id));applyAutoLinks(n,selected);n.prompt=$('#contextComposedPrompt').value;n.contextSnapshot=buildCreativeContextPacket(n,selected);saveState();closeFeatureModal();render();renderGenerator();showToast('Creative Context 已应用到最终 Prompt')};
  }
  function openCreativeContextOverview(){
    const targets=state.nodes.filter(n=>['image','video','audio','text'].includes(n.type)),cfg=creativeContextSettings(),rows=targets.map(n=>{const c=creativeContextCandidates(n),linked=state.edges.filter(e=>e.target===n.id).length;return`<button data-context-target="${n.id}"><span><b>${escapeHtml(n.title||labelForType(n.type))}</b><small>${escapeHtml(labelForType(n.type))} · ${linked} 条明确连线</small></span><em>${c.filter(x=>x.score>=80).length} 个高相关上下文</em><i>›</i></button>`}).join('');modalShell('Creative Context Center',`<div class="context-overview"><div class="context-overview-hero"><div><b>让 Canvas 理解“你正在用什么创作”</b><span>明确连线、当前 Shot、Prompt 语义、邻近节点和项目资产会组成可检查的 Context Packet。</span></div><div><strong>${targets.length}</strong><small>可生成节点</small></div></div><div class="context-overview-settings"><label><input id="contextAutoSuggest" type="checkbox" ${cfg.autoSuggest!==false?'checked':''}> 输入 Prompt 时自动给 AutoLink 建议</label><label><input id="contextProjectAssets" type="checkbox" ${cfg.includeProjectAssets!==false?'checked':''}> 搜索项目资产</label><label><input id="contextNarrative" type="checkbox" ${cfg.includeNarrativeState!==false?'checked':''}> 注入连续性状态</label></div><div class="context-overview-list">${rows||'<div class="context-empty">先在 Canvas 添加图片、视频、音频或文本生成节点。</div>'}</div></div>`,{wide:true});$$('[data-context-target]',featureModal).forEach(b=>b.onclick=()=>openCreativeContextComposer(state.nodes.find(x=>x.id===b.dataset.contextTarget)));const save=()=>{cfg.autoSuggest=$('#contextAutoSuggest').checked;cfg.includeProjectAssets=$('#contextProjectAssets').checked;cfg.includeNarrativeState=$('#contextNarrative').checked;saveState()};$$('.context-overview-settings input',featureModal).forEach(x=>x.onchange=save);
  }
  function collectReferences(nodeId){
    const node=state.nodes.find(n=>n.id===nodeId);const refs=[];
    const addRef=r=>{if(r&&!refs.some(x=>x.id===r.id&&x.role===r.role))refs.push(r)};
    const addNode=(id,role='reference')=>{const x=state.nodes.find(n=>n.id===id);if(x)addRef({id:x.id,sourceNodeId:x.id,type:x.type,title:x.title||labelForType(x.type),url:x.outputUrl||'',text:x.text||x.prompt||'',kind:x.type,role,usage:role,slot:role})};
    state.edges.filter(e=>e.target===nodeId).forEach(e=>{const x=state.nodes.find(n=>n.id===e.source);if(!x)return;const role=e.role||inferEdgeRole(x,node);e.role=role;e.semanticRole=role;e.targetSlot=role;addRef({id:x.id,sourceNodeId:x.id,type:x.type,title:x.title||labelForType(x.type),url:x.outputUrl||'',text:x.text||x.prompt||'',kind:x.type,role,usage:role,slot:role})});
    if(node?.toolParams?.firstFrame)addNode(node.toolParams.firstFrame,'first_frame');if(node?.toolParams?.lastFrame)addNode(node.toolParams.lastFrame,'last_frame');
    if(node?.toolParams?.maskUrl)addRef({id:'mask:'+node.id,type:'image',title:'编辑蒙版',url:node.toolParams.maskUrl,text:'',kind:'mask',role:'mask',usage:'mask'});
    if(node?.toolParams?.focusSourceId)addNode(node.toolParams.focusSourceId,'image_reference');
    (node?.toolParams?.externalRefs||[]).forEach(r=>addRef({...r,role:r.role||'reference',usage:r.usage||r.role||'reference'}));
    if(node?.toolParams?.subjectId){const sub=(state.subjects||[]).find(s=>s.id===node.toolParams.subjectId);(sub?.nodeIds||[]).forEach(id=>addNode(id,'character_reference'))}
    const prompt=String(node?.prompt||'');(state.assets||[]).forEach(a=>{if(a.title&&prompt.includes('@'+a.title))addRef({id:a.id,type:a.type||'image',title:a.title,url:a.mediaUrl||'',text:a.text||a.prompt||'',kind:'asset',role:/角色|人物/.test(a.title)?'character_reference':/场景/.test(a.title)?'scene_reference':'reference',usage:'autolink'})});
    (state.subjects||[]).forEach(sub=>{if(sub.name&&prompt.includes('@'+sub.name))(sub.nodeIds||[]).forEach(id=>addNode(id,'character_reference'))});return refs;
  }

  function validateSemanticInputs(n,modelOverride=null){
    const refs=collectReferences(n.id),caps=modelOverride?.model?modelCapabilitiesFor(n.type,modelOverride.provider,modelOverride.model):modelCapabilities(n),warnings=[],errors=[];
    const byRole={};refs.forEach(r=>{const role=r.role||'reference';(byRole[role]||(byRole[role]=[])).push(r)});
    const mediaMissing=refs.filter(r=>['image','video','audio'].includes(r.type)&&!r.url);
    if(mediaMissing.length)warnings.push(`${mediaMissing.length} 个参考素材还没有可发送的生成结果`);
    if((byRole.first_frame||[]).length>1)errors.push('首帧只能有 1 个，请点击连线修改用途');
    if((byRole.last_frame||[]).length>1)errors.push('尾帧只能有 1 个，请点击连线修改用途');
    if(n.type==='video'){
      const currentMode=normalizeVideoModeKey(n.videoMode||'text2video'),allowedModes=videoModeOptions(caps).map(x=>x.key);
      if(allowedModes.length&&currentMode&&!allowedModes.includes(currentMode))errors.push(`当前视频模型不支持 ${videoModeLabel(currentMode)}`);
      if((byRole.first_frame||[]).length&&caps.supportsFirstFrame===false)errors.push('当前视频模型不支持首帧输入');
      if((byRole.last_frame||[]).length&&caps.supportsLastFrame===false)errors.push('当前视频模型不支持尾帧输入');
      if((byRole.video_reference||[]).length+(byRole.motion_reference||[]).length>0&&caps.supportsVideoReference===false)errors.push('当前视频模型不支持参考视频 / 运镜参考');
      if((byRole.audio_reference||[]).length+(byRole.voice_reference||[]).length>0&&caps.supportsAudioReference===false)errors.push('当前视频模型不支持音频参考');
    }
    const typeCounts={image:refs.filter(r=>r.type==='image').length,video:refs.filter(r=>r.type==='video').length,audio:refs.filter(r=>r.type==='audio').length};
    if(caps.maxReferences&&refs.length>caps.maxReferences)warnings.push(`参考素材 ${refs.length} 个，模型上限 ${caps.maxReferences}，超出部分会被忽略`);
    if(caps.maxImages&&typeCounts.image>caps.maxImages)warnings.push(`图片参考 ${typeCounts.image} 张，模型上限 ${caps.maxImages}`);
    if(caps.maxVideos&&typeCounts.video>caps.maxVideos)warnings.push(`视频参考 ${typeCounts.video} 段，模型上限 ${caps.maxVideos}`);
    if(caps.maxAudios&&typeCounts.audio>caps.maxAudios)warnings.push(`音频参考 ${typeCounts.audio} 段，模型上限 ${caps.maxAudios}`);
    return {refs,caps,warnings,errors,ok:!errors.length};
  }
  function imageQualityForNode(n){
    if(!n||n.type!=='image')return '';
    if(String(n.imageQuality||'').trim())return String(n.imageQuality);
    try{const raw=globalThis.CanvasBrowserStorageManager?.getItem('canvas-studio-image-quality-v2')||'{}',map=JSON.parse(raw);return String(map?.[n.id]||'标准画质')}catch{return '标准画质'}
  }

  function imageGenerationParameters(n,caps={}){
    const tool={...(n?.toolParams||{})};
    // These keys are controlled by the visible image generator. Historical Image
    // Studio/version data may contain old values; retaining them here causes the
    // provider request to stay 1:1 even after the user changes the UI.
    for(const key of ['imageQuality','quality','qualityLabel','aspectRatio','aspect_ratio','resolution','size','width','height','image_size','count','n'])delete tool[key];
    const selectedQuality=imageQualityForNode(n)||'标准画质';
    const raw={
      ...tool,
      capabilities:caps,
      creativeContext:buildCreativeContextPacket(n),
      imageQuality:selectedQuality,
      qualityLabel:selectedQuality,
      aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'1:1',
      resolution:n.resolution||caps.resolutions?.[0]||'1K',
      count:Math.max(1,Number(n.count||1))
    };
    const provider=providerById(n.providerId),model=modelForNode(n),resolver=globalThis.CanvasModelImageCapabilities;
    if(provider&&model&&resolver?.normalizeSelection){const selected=resolver.normalizeSelection(provider,model,raw),{imageCapabilities,...clean}=selected;return clean}
    return globalThis.CanvasImageRequestParameters?.normalize?.(raw)||raw;
  }

  window.addEventListener('canvas:image-quality-change',event=>{
    const id=String(event?.detail?.nodeId||''),value=String(event?.detail?.value||'').trim();
    const node=state.nodes.find(x=>String(x.id)===id);
    if(!node||node.type!=='image'||!value)return;
    node.imageQuality=value;
    saveState();
  });

  function semanticWarningHtml(n){
    const v=validateSemanticInputs(n),items=[...v.errors,...v.warnings];if(!items.length)return '';
    return `<div class="semantic-warning-bar ${v.errors.length?'error':''}"><b>${v.errors.length?'输入冲突':'输入提示'}</b><ul>${items.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>`;
  }

  function recordNodeResultVersion(n,{historyId='',outputUrl=n.outputUrl||'',text=n.type==='text'?(n.text||n.generatedText||''):(n.generatedText||''),generatedResult=n.generatedResult??null,providerId=n.providerId||'',modelId=n.modelId||'',modelName=n.modelName||''}={}){n.resultVersions=Array.isArray(n.resultVersions)?n.resultVersions:[];const v={id:uid('rv'),outputUrl:outputUrl||'',text:text||'',generatedText:n.generatedText||'',generatedResult,prompt:n.prompt||'',providerId,modelId,modelName,historyId,createdAt:new Date().toISOString(),parameters:{imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,videoMode:n.videoMode,...(n.toolParams||{})}};n.resultVersions=[...n.resultVersions.filter(x=>x.id!==v.id),v].slice(-50);n.activeResultVersionId=v.id;return v}

  function resolveGeneratedOutputUrl(output){
    if(!output)return '';
    if(typeof output==='string')return /^(https?:\/\/|data:|blob:|\/media\/|\/__browser_media\/)/i.test(output.trim())?output.trim():'';
    if(Array.isArray(output))return resolveGeneratedOutputUrl(output.find(Boolean));
    if(typeof output==='object'){
      const directKeys=['value','url','uri','href','file_url','fileUrl','fileURL','download_url','downloadUrl','video_url','videoUrl','image_url','imageUrl','audio_url','audioUrl','source_url','sourceUrl'];
      for(const key of directKeys){
        const v=output?.[key];
        if(typeof v==='string'&&/^(https?:\/\/|data:|blob:|\/\/|\/media\/|\/__browser_media\/)/i.test(v.trim()))return v.trim();
      }
      const nestedPaths=['data.url','data.video_url','data.videoUrl','data.image_url','data.imageUrl','data.audio_url','data.audioUrl','result.url','result.video_url','result.videoUrl','result.image_url','result.imageUrl','output.url','output.video_url','output.videoUrl','output.image_url','output.imageUrl','outputs.0.url','outputs.0.video_url','outputs.0.videoUrl','videos.0.url','images.0.url','audio.0.url'];
      for(const p of nestedPaths){
        const v=deepGet(output,p);
        if(typeof v==='string'&&/^(https?:\/\/|data:|blob:|\/\/|\/media\/|\/__browser_media\/)/i.test(v.trim()))return v.trim();
      }
      for(const v of Object.values(output)){
        const nested=resolveGeneratedOutputUrl(v);
        if(nested)return nested;
      }
    }
    return '';
  }


  function fallbackModelChain(n){
    const refs=[{providerId:n.providerId,modelId:n.modelId,primary:true},...(state.workflowSettings?.autoFallback===false?[]:(n.fallbackModels||[]))],seen=new Set(),out=[];for(const ref of refs){const key=`${ref.providerId}:${ref.modelId}`;if(!ref.providerId||!ref.modelId||seen.has(key))continue;seen.add(key);const provider=providerById(ref.providerId),model=provider?.models?.find(m=>m.id===ref.modelId&&m.enabled!==false&&normalizeClientModality(m.modality)===n.type);if(provider&&model&&modelRuntimeReady(provider,model))out.push({provider,model,providerId:provider.id,modelId:model.id,modelName:model.name||model.id,primary:Boolean(ref.primary)})}return out;
  }
  function openFallbackModelPicker(n){
    const items=availableModels(n.type).filter(x=>!(x.providerId===n.providerId&&x.id===n.modelId)),selected=new Map((n.fallbackModels||[]).map((x,i)=>[`${x.providerId}:${x.modelId}`,i])),ordered=[...items].sort((a,b)=>(selected.get(`${a.providerId}:${a.id}`)??999)-(selected.get(`${b.providerId}:${b.id}`)??999));modalShell('备用模型 · 自动故障切换',`<div class="fallback-picker"><div class="fallback-explain"><b>主模型失败时自动切备用</b><span>只在请求真正失败后切换，不会因为排队或生成时间长而误切。顺序按下面列表从上到下执行。</span></div><div class="fallback-list">${ordered.map((m,i)=>{const key=`${m.providerId}:${m.id}`,checked=selected.has(key);return `<label class="fallback-row ${checked?'selected':''}"><input type="checkbox" data-fallback-key="${escapeAttr(key)}" ${checked?'checked':''}><span><b>${escapeHtml(m.name||m.id)}</b><small>${escapeHtml(m.providerName||'API')}</small></span><em>${checked?'备用 '+(selected.get(key)+1):'可选'}</em></label>`}).join('')||'<div class="feature-empty">没有其他可用的同类型模型</div>'}</div><div class="feature-actions"><button id="clearFallbacks">清空备用</button><button id="saveFallbacks" class="primary">保存备用模型</button></div></div>`,{wide:true});$('#clearFallbacks').onclick=()=>{$$('[data-fallback-key]',featureModal).forEach(x=>x.checked=false)};$('#saveFallbacks').onclick=()=>{const chosen=$$('[data-fallback-key]:checked',featureModal).map(x=>{const [providerId,...rest]=x.dataset.fallbackKey.split(':');return{providerId,modelId:rest.join(':')}});snapshot('配置备用模型');n.fallbackModels=chosen;saveState();closeFeatureModal();renderGenerator();render();showToast(chosen.length?`已配置 ${chosen.length} 个备用模型`:'已清空备用模型')};
  }
  async function monitorNodeTask(n,taskId,attempt,seedTask=null){
    let info=seedTask;if(info)syncNodeTaskDiagnostics(n,info);
    while(true){
      await new Promise(r=>setTimeout(r,Math.max(1000,Number(attempt?.model?.pollIntervalMs||1500))));
      // The browser never supplies upstream polling routes or task snapshots.
      // GETing the server-owned task is cross-runtime: Node keeps its own worker loop,
      // while Cloudflare GET triggers the persisted server queue/poller via kickQueue.
      info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;syncNodeTaskDiagnostics(n,info);
      const resultSyncing=['provider_succeeded','result_pending'].includes(info.status),retrying=info.status==='retrying';
      n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=(resultSyncing||retrying)?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':retrying?(info.retryReason==='rate_limit'?'供应商触发限流，正在等待自动重试…':'上游服务暂时不可用，正在继续查询原任务…'):'';saveState();scheduleWorkflowVisualUpdate();
      if(expandedNodeId===n.id)renderGenerator();
      if(info.status==='succeeded')return info;
      if(['failed','canceled'].includes(info.status))throw new Error(info.status==='canceled'?'任务已取消':taskFailureText(info)||'生成失败');
    }
  }
  async function generateForNode(n,{silent=false,forceFrozen=false}={}){
    if(n.frozen&&!forceFrozen){const msg='节点结果已冻结，请先解除冻结再生成';if(!silent)showToast(msg);throw new Error(msg)}
    if(!backendOnline){showToast('API 网关未连接，请用 node server.js 启动项目');throw new Error('API网关未连接')}
    const chain=fallbackModelChain(n);if(!chain.length){showToast('请选择一个可用模型');throw new Error('未选择模型')}
    const estimated=estimateNodeCost(n),threshold=Math.max(0,Number(state.workflowSettings?.costConfirmThreshold||0));if(!silent&&threshold>0&&estimated.known&&estimated.amount>=threshold&&!confirm(`本次预计费用 ${estimated.currency} ${estimated.amount.toFixed(estimated.amount<1?4:2)}，确认提交？\n最终费用以第三方供应商账单为准。`))throw new Error('已取消生成');
    snapshot('生成节点');n.taskStatus='queued';n.taskProgress=0;n.taskError='';n.fallbackAttempt=0;saveState();render();let lastError=null;
    for(let ai=0;ai<chain.length;ai++){
      const attempt=chain[ai],check=validateSemanticInputs(n,{provider:attempt.provider,model:attempt.model}),caps=check.caps,refs=check.refs;if(check.errors.length){lastError=new Error(check.errors.join('；'));if(ai===0&&!chain.slice(1).length)break;continue}if(ai>0){n.taskStatus='fallback';n.fallbackAttempt=ai;n.taskError=`主模型失败，正在切换备用模型：${attempt.modelName}`;saveState();render();workflowLog(latestWorkflowRunForNode(n.id)||{logs:[]},`切换备用模型：${attempt.modelName}`,'warn')}
      try{
        let info=null;const canAdopt=n.taskId&&n.taskProviderId===attempt.providerId&&n.taskModelId===attempt.modelId&&['queued','running','polling','retrying','provider_succeeded','result_pending'].includes(n.taskStatus);if(canAdopt){try{const existing=(await apiJson('/api/tasks/'+encodeURIComponent(n.taskId))).task;if(existing&&!['failed','canceled','succeeded'].includes(existing.status))info=await monitorNodeTask(n,n.taskId,attempt)}catch{}}
        if(!info){const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:attempt.providerId,modelId:attempt.modelId,providerSnapshot:snapshotProviderForTask(attempt.provider),modelSnapshot:attempt.model,nodeType:n.type,prompt:n.prompt||'',references:refs,maxRetries:state.workflowSettings?.maxRetries??1,priority:nodePriority(n),parameters:n.type==='image'?imageGenerationParameters(n,caps):{aspectRatio:n.aspectRatio||caps.aspectRatios?.[0]||'16:9',count:n.count||1,duration:n.duration||caps.durations?.[0]||5,resolution:n.resolution||caps.resolutions?.[0]||'720p',capabilities:caps,creativeContext:buildCreativeContextPacket(n),...(n.toolParams||{})}})});n.taskId=created.task.id;n.taskProviderId=attempt.providerId;n.taskModelId=attempt.modelId;n.taskStatus=created.task.status;n.taskProgress=created.task.progress||0;syncNodeTaskDiagnostics(n,created.task);saveState();render();if(created.task.status==='succeeded')info=created.task;else if(['failed','canceled'].includes(created.task.status))throw new Error(taskFailureText(created.task)||'生成失败');else info=await monitorNodeTask(n,n.taskId,attempt,created.task)}
        const out=info.output||{};const resolvedUrl=resolveGeneratedOutputUrl(out.value??out);if(resolvedUrl)n.outputUrl=resolvedUrl;
        if(out.type==='url'&&!n.outputUrl)n.outputUrl=String(out.value||'').trim();
        else if(out.type==='text'){if(n.type==='text')n.text=out.value;else n.generatedText=out.value}
        else if(out.type!=='url'&&out.value!==undefined)n.generatedResult=out.value;
        if(!n.outputUrl&&n.type==='video'){const fallbackUrl=resolveGeneratedOutputUrl(n.generatedResult)||resolveGeneratedOutputUrl(n.toolParams?.output)||resolveGeneratedOutputUrl(n.toolParams?.result);if(fallbackUrl)n.outputUrl=fallbackUrl}
        n.taskStatus='succeeded';n.taskProgress=100;n.taskError='';n.outputSourceUrl=out.sourceUrl||'';n.lastUsedProviderId=attempt.providerId;n.lastUsedModelId=attempt.modelId;n.lastUsedModelName=attempt.modelName;n.fallbackAttempt=ai;
        const h={id:uid('h'),sourceNodeId:n.id,title:`${labelForType(n.type)}生成_${String(state.history.length+1).padStart(2,'0')}`,kind:labelForType(n.type),type:n.type,theme:n.content||'city',outputUrl:n.outputUrl||'',text:n.text||n.generatedText||'',prompt:n.prompt||'',providerId:attempt.providerId,modelId:attempt.modelId,modelName:attempt.modelName,createdAt:new Date().toISOString(),parameters:{imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,videoMode:n.videoMode,...(n.toolParams||{})}};state.history.unshift(h);recordNodeResultVersion(n,{historyId:h.id,providerId:attempt.providerId,modelId:attempt.modelId,modelName:attempt.modelName});syncGeneratedAssetResult(n,h);saveState();render();if(!silent)showToast(ai?`备用模型生成完成 · ${attempt.modelName}`:`生成完成 · 已保留 ${n.resultVersions.length} 个结果版本`);return n;
      }catch(err){const errMsg=errorText(err)||'生成失败';lastError=new Error(errMsg);n.taskStatus=errMsg==='任务已取消'?'canceled':'failed';n.taskError=errMsg;saveState();render();if(errMsg==='任务已取消')break;if(ai<chain.length-1){if(!silent)showToast(`${attempt.modelName} 失败，自动切换备用模型…`);continue}break}
    }
    const err=lastError||new Error('所有模型均生成失败');const msg=errorText(err)||'所有模型均生成失败';n.taskStatus=msg==='任务已取消'?'canceled':'failed';n.taskError=msg;saveState();render();if(!silent)showToast('生成失败：'+msg);throw new Error(msg);
  }
  function syncGeneratedAssetResult(n,h){
    const aid=n.toolParams?.assetId||n.toolParams?.scriptAssetId;if(!aid)return;
    for(const bucket of ['characters','scenes','props']){
      for(const sn of state.nodes.filter(x=>x.type==='script'&&x.scriptData)){
        const a=(sn.scriptData.assets?.[bucket]||[]).find(x=>x.id===aid);if(a){a.mediaUrl=n.outputUrl||a.mediaUrl||'';a.nodeIds=[...new Set([...(a.nodeIds||[]),n.id])];a.versions=[{id:uid('ver'),url:n.outputUrl||'',historyId:h.id,createdAt:new Date().toISOString(),prompt:n.prompt||''},...(a.versions||[])].slice(0,20);a.revision=Number(a.revision||0)+1;markScriptImpactedByAsset(sn.scriptData,a.id,'资产生成结果已更新');sn.scriptData.finalized=false}
      }
    }
    const asset=(state.assets||[]).find(x=>x.id===aid);if(asset){asset.mediaUrl=n.outputUrl||asset.mediaUrl;asset.versions=[{id:uid('ver'),url:n.outputUrl||'',historyId:h.id,createdAt:new Date().toISOString()},...(asset.versions||[])].slice(0,20)}
  }
  async function cancelNodeTask(n){if(!n?.taskId)return;try{await apiJson('/api/tasks/'+encodeURIComponent(n.taskId),{method:'DELETE'});n.taskStatus='cancelling';saveState();render()}catch(e){showToast(e.message)}}

  function toolAction(tool,n){
    if(tool==='删除'){ deleteNode(n.id); return; }
    if(tool==='复制'){ clipboard=JSON.parse(JSON.stringify(n)); showToast('已复制节点'); return; }
    if(tool==='创建资产'){ createAsset(n); return; }
    if(tool==='图像工作台'){openImageStudio(n);return;}
    if(tool==='视频工作台'){openVideoStudio(n);return;}
    if(tool==='分镜工作台'){openStoryboardFromImage(n);return;}
    if(tool==='打开脚本'){openScriptEditor(n);return;}
    if(tool==='整集看板'){openEpisodeDashboard(n);return;}
    if(tool==='资产管理'){openScriptEditor(n,'assets');return;}
    if(tool==='合成提示词'){synthesizeScriptPrompts(n);openScriptEditor(n,'prompts');return;}
    if(tool==='批量生图'){openScriptEditor(n,'batch-image');return;}
    if(tool==='批量视频'){openScriptEditor(n,'batch-video');return;}
    if(tool==='打开导演台'){openDirectorConsole(n);return;}
    if(tool==='截图'&&n.type==='director'){directorTakeScreenshot(n);return;}
    openFeatureTool(tool,n);
  }

  function closeFeatureModal(){ featureModal.classList.add('hidden'); featureModal.innerHTML=''; }
  function modalShell(title,body,{wide=false,full=false}={}){
    featureModal.innerHTML=`<div class="feature-dialog ${wide?'wide':''} ${full?'full':''}"><div class="feature-head"><div><div class="feature-title">${escapeHtml(title)}</div><div class="feature-subtitle">LibTV 画布工具 · 参数可继续发送到第三方 API 模型</div></div><button class="feature-close">×</button></div><div class="feature-body">${body}</div></div>`;
    featureModal.classList.remove('hidden');
    $('.feature-close',featureModal).onclick=closeFeatureModal;
    featureModal.onpointerdown=e=>{if(e.target===featureModal)closeFeatureModal()};
  }
  function field(label,html,wide=false){return `<label class="feature-field ${wide?'wide':''}"><span>${label}</span>${html}</label>`}
  function rangeField(label,id,min,max,value,step=1){return field(label,`<div class="range-line"><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}">${value}</output></div>`)}
  function bindRanges(root=featureModal){$$('input[type="range"]',root).forEach(r=>r.oninput=()=>{const o=$(`output[for="${r.id}"]`,root);if(o)o.value=r.value;});}

  function inheritGeneration(target,source){
    target.providerId=source.providerId||'';target.modelId=source.modelId||'';target.modelName=source.modelName||'';
    target.aspectRatio=source.aspectRatio||'16:9';target.resolution=source.resolution||'720p';
  }
  function createDerivedNode(source,type,title,prompt,params={},offset=430){
    snapshot();
    const n={id:uid('n'),type,x:source.x+offset,y:source.y,w:type==='image'?620:type==='script'?470:340,title,prompt:prompt||'',providerId:'',modelId:'',modelName:'',selected:false,toolParams:{...params}};
    inheritGeneration(n,source);
    if(type==='video')n.videoMode=defaultVideoModeForSource(source,params,type);
    if(type==='image'||type==='video')n.content='';if(type==='text')n.text=prompt||'';
    state.nodes.push(n);state.edges.push(makeSemanticEdge(source.id,n.id,source.type));
    state.selectedIds=[];selectedId=n.id;state.nodes.forEach(x=>x.selected=x.id===n.id);saveState();render();return n;
  }
  function sendToolToGenerator(source,tool,prompt,params={},targetType=source.type){
    const node=createDerivedNode(source,targetType,`${tool}结果`,prompt||source.prompt||'',{operation:tool,...params});
    closeFeatureModal();showToast(`${tool} 已发送到新的${labelForType(targetType)}生成器`);setTimeout(()=>renderGenerator(),0);return node;
  }

  const slashPresets=[
    ['多机位九宫格','生成同一主体的九宫格多机位视角，保持角色与场景一致'],
    ['剧情推演四宫格','将当前画面向后推演成四个连续剧情分镜'],
    ['25宫格连贯分镜','生成25宫格连续故事分镜，动作和空间连续'],
    ['电影级光影矫正','校正光影、色温与人物受光，提升电影质感'],
    ['角色三视图生成','生成角色正面、侧面、背面三视图并保持身份一致'],
    ['画面推演-3秒后','推演当前画面约3秒后的合理状态'],
    ['画面推演-5秒前','推演当前画面约5秒前的合理状态'],
    ['角色设定图','生成角色设定页，包含全身、表情和细节'],
    ['故事板','把10-15秒剧情整理成连续可生成的分镜故事板'],
    ['调度故事板','加入动作线、视线、走位、机位和运镜调度标记'],
    ['人像调节','降低AI感，优化皮肤、毛发、人景与光影融合'],
    ['情绪调节','保持人物身份与构图，仅调整目标人物自然表情']
  ];

  function openFeatureTool(tool,n){
    if(n.type==='image') return openImageTool(tool,n);
    if(n.type==='video') return openVideoTool(tool,n);
    if(n.type==='audio') return openAudioTool(tool,n);
    showToast(tool);
  }

  function studioReferenceRows(n){
    const refs=collectReferences(n.id);return refs.length?refs.map(r=>`<div class="studio-ref-row"><span class="studio-ref-icon ${r.type}">${r.type==='image'?'图':r.type==='video'?'视':r.type==='audio'?'音':'文'}</span><div><b>${escapeHtml(r.title||labelForType(r.type))}</b><small>${escapeHtml(edgeRoleLabel(r.role||'reference'))}</small></div></div>`).join(''):'<div class="studio-empty">还没有参考素材<br><small>从其他节点拉线到当前节点即可自动识别用途</small></div>';
  }
  function studioDiagnosticHtml(n){const v=validateSemanticInputs(n),items=[...v.errors,...v.warnings];return items.length?`<div class="studio-diagnostic"><b>${v.errors.length?'输入需要处理':'输入检查'}</b><br>${items.map(x=>'• '+escapeHtml(x)).join('<br>')}</div>`:`<div class="studio-diagnostic ok">输入关系与当前模型能力匹配</div>`}
  function studioModelButton(n,id){const m=modelForNode(n),ready=m?modelRuntimeReady(providerById(n.providerId),m):false;return `<button id="${id}" class="studio-model-btn ${m?'':'needs-model'} ${m&&!ready?'pending':''}"><span class="model-dot"></span><b>${escapeHtml(m?.name||n.modelName||`选择${labelForType(n.type)}模型`)}</b><i>${m&&!ready?'!':uiIcon('chevronDown')}</i></button>`}
  function openImageStudio(n){
    ensureDefaultModel(n);const caps=modelCapabilities(n);const tools=['高清','扩图','重绘','擦除','抠图','裁剪','九宫格','宫格切分','多角度','打光','全景','镜头聚焦'];
    modalShell('Image Studio · 图像工作台',`<div class="studio-shell image-studio"><aside class="studio-toolrail"><div class="studio-rail-title">图像工具</div>${tools.map(t=>`<button data-studio-image-tool="${t}">${t}</button>`).join('')}</aside><section class="studio-canvas"><div class="studio-canvas-head"><div><b>${escapeHtml(n.title||'图片节点')}</b><span>${escapeHtml(n.aspectRatio||caps.aspectRatios?.[0]||'1:1')}</span></div><button id="studioImageRefresh">刷新</button></div><div class="studio-media-frame">${n.outputUrl?`<img src="${escapeAttr(n.outputUrl)}" draggable="false">`:`<div class="studio-placeholder" style="background:${themeBg(n.content||'portrait')}"><span>生成结果将在这里预览</span></div>`}</div><div class="studio-prompt-bar"><textarea id="imageStudioPrompt" placeholder="描述你想生成或修改的画面…">${escapeHtml(n.prompt||'')}</textarea><button id="imageStudioGenerate" class="studio-generate">生成</button></div><div class="studio-bottom-controls">${studioModelButton(n,'imageStudioModel')}<select id="imageStudioRatio">${optionList(caps.aspectRatios,n.aspectRatio||caps.aspectRatios?.[0])}</select><select id="imageStudioCount">${[1,2,3,4].map(x=>`<option ${Number(n.count||1)===x?'selected':''}>${x} 张</option>`).join('')}</select></div></section><aside class="studio-inspector"><div class="studio-panel-title">输入关系</div>${studioReferenceRows(n)}${studioDiagnosticHtml(n)}<div class="studio-panel-title">模型能力</div><div class="studio-cap-grid"><span>参考图 <b>${caps.maxImages||1}</b></span><span>蒙版 <b>${caps.supportsMask?'支持':'—'}</b></span><span>扩图 <b>${caps.supportsOutpaint?'支持':'—'}</b></span><span>分辨率 <b>${(caps.resolutions||[]).join(' / ')||'自动'}</b></span></div><div class="studio-panel-title">当前任务</div><div class="studio-task-state ${n.taskStatus||''}">${n.taskStatus==='running'?`生成中 ${Math.round(n.taskProgress||0)}%`:n.taskStatus==='failed'?escapeHtml(n.taskError||'失败'):n.taskStatus==='succeeded'?'最近一次生成完成':'等待生成'}</div></aside></div>`,{full:true});
    $$('[data-studio-image-tool]',featureModal).forEach(b=>b.onclick=()=>openImageTool(b.dataset.studioImageTool,n));
    $('#imageStudioPrompt').oninput=e=>{n.prompt=e.target.value;saveState()};
    $('#imageStudioRatio').onchange=e=>{n.aspectRatio=e.target.value;saveState()};
    $('#imageStudioCount').onchange=e=>{n.count=Number(e.target.value);saveState()};
    $('#imageStudioModel').onclick=e=>openModelPickerForNode(n,e.currentTarget);
    $('#imageStudioGenerate').onclick=async()=>{n.prompt=$('#imageStudioPrompt').value;n.aspectRatio=$('#imageStudioRatio').value;n.count=Number($('#imageStudioCount').value);saveState();try{await generateForNode(n,{silent:true});openImageStudio(n);showToast('图像生成完成')}catch(e){openImageStudio(n);showToast(e.message)}};
    $('#studioImageRefresh').onclick=()=>openImageStudio(n);
  }
  function openVideoStudio(n){
    ensureDefaultModel(n);const caps=modelCapabilities(n);if(n.type==='video')syncVideoNodeCapabilities(n,caps);const tools=['剪辑','视频合成','解析','逐帧拉片','智能剪辑','智能续写','片段重拍','高清','人声分离','分离音视频'];const modes=videoModeOptions(caps);const activeMode=normalizeVideoModeKey(n.videoMode||modes[0]?.key||'text2video');
    modalShell('Video Studio · 视频工作台',`<div class="studio-shell video-studio"><aside class="studio-toolrail"><div class="studio-rail-title">视频工具</div>${tools.map(t=>`<button data-studio-video-tool="${t}">${t}</button>`).join('')}<button id="openStudioTimeline" class="primary-tool">多轨时间轴</button></aside><section class="studio-canvas"><div class="studio-canvas-head"><div><b>${escapeHtml(n.title||'视频节点')}</b><span>${videoModeLabel(activeMode)} · ${Number(n.duration||caps.durations?.[0]||5)}s · ${escapeHtml(n.resolution||caps.resolutions?.[0]||'720p')}</span></div><button id="studioVideoRefresh">刷新</button></div><div class="studio-media-frame video">${n.outputUrl?`<video id="videoStudioPreview" src="${escapeAttr(n.outputUrl)}" controls playsinline preload="metadata"></video>`:`<div class="studio-placeholder" style="background:${themeBg(n.content||'city')}"><span>视频结果将在这里预览</span></div>`}</div><div class="studio-prompt-bar"><textarea id="videoStudioPrompt" placeholder="描述动作、机位、运镜、节奏和声音…">${escapeHtml(n.prompt||'')}</textarea><button id="videoStudioGenerate" class="studio-generate">生成</button></div><div class="studio-bottom-controls">${studioModelButton(n,'videoStudioModel')}<select id="videoStudioMode">${modes.map(v=>`<option value="${escapeAttr(v.key)}" ${activeMode===v.key?'selected':''}>${escapeHtml(v.label)}</option>`).join('')}</select><select id="videoStudioRatio">${optionList(caps.aspectRatios,n.aspectRatio||caps.aspectRatios?.[0])}</select><select id="videoStudioDuration">${(caps.durations||[4,5,10]).map(x=>`<option value="${x}" ${Number(n.duration||5)===Number(x)?'selected':''}>${x}s</option>`).join('')}</select><select id="videoStudioResolution">${optionList(caps.resolutions,n.resolution||caps.resolutions?.[0])}</select></div></section><aside class="studio-inspector"><div class="studio-panel-title">输入关系</div>${studioReferenceRows(n)}${studioDiagnosticHtml(n)}<div class="studio-panel-title">模型能力</div><div class="studio-cap-grid"><span>生成方式 <b>${modes.map(x=>x.label).join(' / ')||'文生视频'}</b></span><span>首帧 <b>${caps.supportsFirstFrame?'✓':'—'}</b></span><span>尾帧 <b>${caps.supportsLastFrame?'✓':'—'}</b></span><span>参考视频 <b>${caps.supportsVideoReference?'✓':'—'}</b></span><span>参考音频 <b>${caps.supportsAudioReference?'✓':'—'}</b></span><span>续写 <b>${caps.supportsExtend?'✓':'—'}</b></span><span>重拍 <b>${caps.supportsReshoot?'✓':'—'}</b></span><span>清晰度 <b>${(caps.resolutions||[]).join(' / ')||'720p'}</b></span></div><div class="studio-panel-title">语义提示</div><div class="studio-semantic-help">连接线会自动区分首帧、尾帧、角色、场景、运镜和音频。点击画布中的连线可修改用途。</div></aside></div>`,{full:true});
    $$('[data-studio-video-tool]',featureModal).forEach(b=>b.onclick=()=>openVideoTool(b.dataset.studioVideoTool,n));
    $('#openStudioTimeline').onclick=()=>{closeFeatureModal();openTimelineEditor(n,{trimOnly:false})};
    $('#videoStudioPrompt').oninput=e=>{n.prompt=e.target.value;saveState()};
    $('#videoStudioMode').onchange=e=>{n.videoMode=normalizeVideoModeKey(e.target.value);saveState()};
    $('#videoStudioRatio').onchange=e=>{n.aspectRatio=e.target.value;saveState()};
    $('#videoStudioDuration').onchange=e=>{n.duration=Number(e.target.value);saveState()};
    $('#videoStudioResolution').onchange=e=>{n.resolution=e.target.value;saveState()};
    $('#videoStudioModel').onclick=e=>openModelPickerForNode(n,e.currentTarget);
    $('#videoStudioGenerate').onclick=async()=>{n.prompt=$('#videoStudioPrompt').value;n.aspectRatio=$('#videoStudioRatio').value;n.duration=Number($('#videoStudioDuration').value);n.resolution=$('#videoStudioResolution').value;saveState();try{await generateForNode(n,{silent:true});openVideoStudio(n);showToast('视频生成完成')}catch(e){openVideoStudio(n);showToast(e.message)}};
    $('#studioVideoRefresh').onclick=()=>openVideoStudio(n);
  }

  async function uploadBlob(blob,name='asset.png'){
    const res=await fetch('/api/upload?name='+encodeURIComponent(name),{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},credentials:'same-origin',body:blob});const out=await res.json();if(!res.ok)throw new Error(out.error||'上传失败');return out;
  }
  function bindSelectionBox(workspace,box,{ratio='free'}={}){
    let start=null,drag=null;const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const rect=()=>{const w=workspace.getBoundingClientRect(),b=box.getBoundingClientRect();return{x:(b.left-w.left)/w.width,y:(b.top-w.top)/w.height,width:b.width/w.width,height:b.height/w.height}};
    const apply=(x,y,w,h)=>{x=clamp(x,0,1);y=clamp(y,0,1);w=clamp(w,.01,1-x);h=clamp(h,.01,1-y);box.style.left=x*100+'%';box.style.top=y*100+'%';box.style.width=w*100+'%';box.style.height=h*100+'%'};
    const aspect=()=>{if(ratio==='free')return null;const m=String(ratio).match(/([\d.]+):([\d.]+)/);return m?Number(m[1])/Number(m[2]):null};
    workspace.onpointerdown=e=>{if(e.target===box||e.target.closest('.selection-handle'))return;const r=workspace.getBoundingClientRect();start={x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};apply(start.x,start.y,.01,.01);e.preventDefault()};
    workspace.onpointermove=e=>{if(!start)return;const r=workspace.getBoundingClientRect();let x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1),left=Math.min(start.x,x),top=Math.min(start.y,y),w=Math.abs(x-start.x),h=Math.abs(y-start.y),a=aspect();if(a){const pxRatio=r.width/r.height;if(w/(h||.001)/pxRatio>a)h=w/(a*pxRatio);else w=h*a*pxRatio}apply(left,top,w,h)};
    workspace.onpointerup=()=>start=null;
    box.onpointerdown=e=>{if(e.target.closest('.selection-handle'))return;const r=workspace.getBoundingClientRect(),b=rect();drag={px:e.clientX,py:e.clientY,b};e.stopPropagation();e.preventDefault()};
    document.addEventListener('pointermove',e=>{if(!drag)return;const r=workspace.getBoundingClientRect();apply(drag.b.x+(e.clientX-drag.px)/r.width,drag.b.y+(e.clientY-drag.py)/r.height,drag.b.width,drag.b.height)});
    document.addEventListener('pointerup',()=>drag=null);
    apply(.15,.15,.7,.7);return{get:rect,setRatio:v=>{ratio=v;const b=rect(),a=aspect(),r=workspace.getBoundingClientRect();if(a){let w=b.width,h=w/(a*(r.width/r.height));if(h>1-b.y){h=1-b.y;w=h*a*(r.width/r.height)}apply(b.x,b.y,w,h)}}};
  }
  function imageEditorPreview(n,id,extra=''){return `<div class="interactive-image-editor" id="${id}">${n.outputUrl?`<img src="${escapeAttr(n.outputUrl)}" draggable="false">`:`<div class="editor-placeholder" style="background:${themeBg(n.content||'city')}"></div>`}${extra}</div>`}
  function openInteractiveImageCrop(n){
    modalShell('自由裁剪',`${imageEditorPreview(n,'cropWorkspace','<div id="cropBox" class="image-selection-box"><span>裁剪区域</span></div>')}<div class="feature-grid">${field('比例',`<select id="cropRatioMode"><option value="free">自由</option><option>21:9</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option><option>1:1</option></select>`)}${field('说明',`<div class="provider-note">在图片上拖出裁剪框，也可以直接拖动整个框重新定位。实际裁剪坐标会写入图像文件。</div>`,true)}</div><div class="feature-actions"><button class="primary" id="applyInteractiveCrop">应用裁剪</button></div>`,{wide:true});
    const ctl=bindSelectionBox($('#cropWorkspace'),$('#cropBox'),{ratio:'free'});$('#cropRatioMode').onchange=e=>ctl.setRatio(e.target.value);
    $('#applyInteractiveCrop').onclick=async()=>{const box=ctl.get();if(canLocalProcess(n)){try{const out=await localMediaProcess(v352WorkingProxy(n),'image-crop',{...box,normalized:true});if(out.outputs?.[0]){makeLocalResultNode(n,out.outputs[0],'裁剪结果',{operation:'图像裁剪',cropBox:box});closeFeatureModal();showToast('已按真实选区裁剪');return}}catch(e){showToast('本地裁剪失败：'+e.message)}}sendToolToGenerator(n,'图像裁剪','仅保留框选区域并重新构图',{cropBox:box},'image')};
  }
  function openFocusSelection(n){
    modalShell('镜头聚焦',`${imageEditorPreview(n,'focusWorkspace','<div id="focusBox" class="image-selection-box focus"><span>特写区域</span></div>')}<div class="feature-grid">${field('特写描述',`<textarea id="focusPrompt" rows="4" placeholder="人物眼神更坚定，浅景深，85mm特写"></textarea>`,true)}</div><div class="feature-actions"><button class="primary" id="sendFocusShot">生成特写</button></div>`,{wide:true});
    const ctl=bindSelectionBox($('#focusWorkspace'),$('#focusBox'),{ratio:'free'});$('#sendFocusShot').onclick=()=>sendToolToGenerator(n,'镜头聚焦',$('#focusPrompt').value||'基于框选区域生成细节特写分镜',{focusBox:ctl.get()},'image');
  }
  function openMaskEditor(n,tool,opts={}){
    const studio=v35Data(n),draftKey=v351WorkingId(n),draft=studio.maskDrafts[draftKey]||null;
    const def=opts.prompt||studio.pendingInpaintPrompt||draft?.prompt||(tool==='擦除'?'擦除白色蒙版区域并自然补全背景，不留下任何擦除痕迹':'只修改白色蒙版区域，其余像素、人物身份和构图保持不变');
    modalShell(tool,`<div class="mask-editor-pro"><div class="mask-stage" id="maskStage">${n.outputUrl?`<img src="${escapeAttr(n.outputUrl)}" draggable="false">`:`<div style="background:${themeBg(n.content||'city')}" class="editor-placeholder"></div>`}<canvas id="maskCanvas"></canvas><div class="mask-cursor" id="maskCursor"></div></div><aside><div class="seg-buttons mask-history"><button id="maskPaint" class="active">画蒙版</button><button id="maskErase">擦蒙版</button><button id="maskUndo" title="Ctrl/Cmd+Z">↶</button><button id="maskRedo">↷</button></div><div class="seg-buttons"><button id="maskInvert">反选</button><button id="maskClear">清空</button></div>${rangeField('画笔大小','maskBrush',5,180,48,1)}${rangeField('边缘羽化','maskFeather',0,48,8,1)}${rangeField('蒙版预览','maskOpacity',15,100,62,1)}${field('处理描述',`<textarea id="maskPrompt" rows="7">${escapeHtml(def)}</textarea>`,true)}<div class="mask-tip">白色 = AI 允许修改；透明 = 保持原图。支持画笔、擦除、反选、撤销/重做和边缘羽化。</div></aside></div><div class="feature-actions"><button class="primary" id="sendRealMask">上传蒙版并发送生成器</button></div>`,{wide:true});bindRanges();
    const stage=$('#maskStage'),canvas=$('#maskCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let mode='paint',drawing=false,last=null,undo=[],redo=[];
    const resize=()=>{const r=stage.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),old=canvas.width?document.createElement('canvas'):null;if(old){old.width=canvas.width;old.height=canvas.height;old.getContext('2d').drawImage(canvas,0,0)}canvas.width=Math.max(2,Math.round(r.width*dpr));canvas.height=Math.max(2,Math.round(r.height*dpr));canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';if(old)ctx.drawImage(old,0,0,old.width,old.height,0,0,canvas.width,canvas.height);canvas.style.opacity=Number($('#maskOpacity').value||62)/100};
    requestAnimationFrame(resize);const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    const capture=()=>{try{return ctx.getImageData(0,0,canvas.width,canvas.height)}catch{return null}};const pushUndo=()=>{const x=capture();if(x){undo.push(x);if(undo.length>30)undo.shift();redo=[]}};const restore=x=>{if(x)ctx.putImageData(x,0,0)};
    const stroke=(a,b)=>{ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Number($('#maskBrush').value)*(canvas.width/canvas.getBoundingClientRect().width);if(mode==='paint'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(255,255,255,.94)'}else ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()};
    canvas.onpointerdown=e=>{pushUndo();drawing=true;last=pos(e);stroke(last,last);try{canvas.setPointerCapture(e.pointerId)}catch{}};canvas.onpointermove=e=>{const c=$('#maskCursor'),r=stage.getBoundingClientRect();c.style.left=e.clientX-r.left+'px';c.style.top=e.clientY-r.top+'px';c.style.width=c.style.height=Number($('#maskBrush').value)+'px';if(drawing){const p=pos(e);stroke(last,p);last=p}};canvas.onpointerup=()=>drawing=false;canvas.onpointercancel=()=>drawing=false;canvas.onpointerleave=()=>drawing=false;
    $('#maskPaint').onclick=()=>{mode='paint';$('#maskPaint').classList.add('active');$('#maskErase').classList.remove('active')};$('#maskErase').onclick=()=>{mode='erase';$('#maskErase').classList.add('active');$('#maskPaint').classList.remove('active')};$('#maskClear').onclick=()=>{pushUndo();ctx.clearRect(0,0,canvas.width,canvas.height)};$('#maskUndo').onclick=()=>{if(!undo.length)return;const cur=capture();if(cur)redo.push(cur);restore(undo.pop())};$('#maskRedo').onclick=()=>{if(!redo.length)return;const cur=capture();if(cur)undo.push(cur);restore(redo.pop())};$('#maskInvert').onclick=()=>{pushUndo();const im=capture();if(!im)return;for(let i=0;i<im.data.length;i+=4){const a=im.data[i+3];const na=255-a;im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=na}restore(im)};$('#maskOpacity').oninput=e=>canvas.style.opacity=Number(e.target.value)/100;
    $('#sendRealMask').onclick=async()=>{try{const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('无法导出蒙版');const up=await uploadBlob(blob,`mask-${Date.now()}.png`),promptText=$('#maskPrompt').value,params={operation:tool,maskUrl:up.url,maskMode:'white-edit',maskFeather:Number($('#maskFeather').value||0),maskOpacity:Number($('#maskOpacity').value||62)/100};if(opts.inPlace){closeFeatureModal();await v35AIEdit(n,'Inpaint',promptText,params);if(n.imageStudio)n.imageStudio.pendingInpaintPrompt='';saveState();openImageStudio(n,opts.returnTool||'inpaint');showToast('蒙版已保存为当前图片的新版本');return}const node=createDerivedNode(n,'image',`${tool}结果`,promptText,params,430);node.toolParams.maskUrl=up.url;closeFeatureModal();showToast('蒙版已保存并绑定到生成器');renderGenerator()}catch(e){showToast('蒙版上传失败：'+e.message)}};
  }
  function openPanoramaViewer(n){
    const has=n.outputUrl||n.content;modalShell('720° 全景',`<div class="panorama-pro"><div id="panoViewer" class="pano-viewer" style="${n.outputUrl?`background-image:url('${escapeAttr(n.outputUrl)}')`:`background:${themeBg(n.content||'city')}`}"><div class="pano-centerline"></div><span id="panoAngleText">0°</span></div><div class="pano-controls">${rangeField('视场角','panoFov',35,110,70,1)}<div class="seg-buttons"><button data-pano-shots="4">4 视角</button><button data-pano-shots="12">12 视角</button><button id="panoReset">重置</button></div></div></div><div class="feature-grid">${field('描述',`<textarea id="panoPrompt" rows="4">基于当前场景生成标准等距柱状全景图，空间连续、接缝自然、材质与光影一致</textarea>`,true)}</div><div class="feature-actions"><button id="makePanoViews">发送当前视角为参考</button><button class="primary" id="sendPanoGenerate">生成 / 重生成全景</button></div>`,{wide:true});bindRanges();
    const v=$('#panoViewer');let angle=0,down=null;const draw=()=>{v.style.backgroundSize=`${Math.max(120,360/Number($('#panoFov').value)*100)}% auto`;v.style.backgroundPosition=`${50+angle/360*100}% 50%`;$('#panoAngleText').textContent=((angle%360+360)%360).toFixed(0)+'°'};draw();v.onpointerdown=e=>{down={x:e.clientX,a:angle};v.setPointerCapture?.(e.pointerId)};v.onpointermove=e=>{if(down){angle=down.a-(e.clientX-down.x)*.35;draw()}};v.onpointerup=()=>down=null;$('#panoFov').oninput=draw;$('#panoReset').onclick=()=>{angle=0;draw()};
    $$('[data-pano-shots]',featureModal).forEach(b=>b.onclick=()=>{const count=Number(b.dataset.panoShots);snapshot();const ids=[];for(let i=0;i<count;i++){const a=i*360/count,node=createDerivedNode(n,'image',`全景视角 ${i+1}`,`从全景参考中提取 ${a}° 方向的透视视角`,{operation:'panorama_view',yaw:a,fov:Number($('#panoFov').value)},430+i*24);ids.push(node.id)}createGroup(ids,`${count}视角全景截图`,'storyboard',{grid:count===4?'2x2':'4x3',ratio:'16:9'});closeFeatureModal()});
    $('#makePanoViews').onclick=()=>sendToolToGenerator(n,'全景视角截图',`从当前全景 ${angle.toFixed(1)}° 方向生成标准透视截图`,{yaw:angle,fov:Number($('#panoFov').value)},'image');$('#sendPanoGenerate').onclick=()=>sendToolToGenerator(n,'720全景',$('#panoPrompt').value,{projection:'equirectangular',fov:Number($('#panoFov').value)},'image');
  }
  function openFocusEdit(n){
    const choices=state.nodes.filter(x=>x.id!==n.id&&x.type==='image');modalShell('焦点编辑',`<div class="focus-edit-pro"><aside class="reference-list">${choices.map(x=>`<button data-focus-source="${x.id}">${escapeHtml(x.title)}</button>`).join('')||'<div class="feature-empty">暂无其他图片节点</div>'}</aside><div><div id="focusSourceStage" class="interactive-image-editor"><div class="editor-placeholder">选择一张来源图片</div><div id="focusElementBox" class="image-selection-box focus hidden"><span>元素区域</span></div></div>${field('元素名称 / 意图',`<input id="focusElementName" placeholder="例如：红色杯子 / 女主的外套">`,true)}</div></div><div class="feature-actions"><button class="primary" id="applyFocusElement">提取元素引用</button></div>`,{wide:true});
    let source=null,ctl=null;$$('[data-focus-source]',featureModal).forEach(b=>b.onclick=()=>{source=state.nodes.find(x=>x.id===b.dataset.focusSource);$$('[data-focus-source]',featureModal).forEach(x=>x.classList.toggle('active',x===b));const stage=$('#focusSourceStage');stage.innerHTML=`${source.outputUrl?`<img src="${escapeAttr(source.outputUrl)}" draggable="false">`:`<div class="editor-placeholder" style="background:${themeBg(source.content||'city')}"></div>`}<div id="focusElementBox" class="image-selection-box focus"><span>元素区域</span></div>`;ctl=bindSelectionBox(stage,$('#focusElementBox'),{ratio:'free'})});
    $('#applyFocusElement').onclick=()=>{if(!source){showToast('先选择来源图片');return}snapshot();if(!state.edges.some(e=>e.source===source.id&&e.target===n.id))state.edges.push({id:uid('e'),source:source.id,target:n.id,type:'focus'});n.toolParams.focusSourceId=source.id;n.toolParams.focusBox=ctl?.get()||{x:.2,y:.2,width:.5,height:.5};n.toolParams.focusElement=$('#focusElementName').value||source.title;saveState();render();closeFeatureModal();showToast('元素区域已作为焦点引用绑定')};
  }

  function openImageTool(tool,n){
    if(tool==='Slash快捷'){
      modalShell('Slash 快捷功能',`<div class="preset-grid">${slashPresets.map((p,i)=>`<button class="preset-card" data-preset="${i}"><b>${p[0]}</b><span>${p[1]}</span></button>`).join('')}</div>`,{wide:true});
      $$('[data-preset]',featureModal).forEach(b=>b.onclick=()=>{const p=slashPresets[Number(b.dataset.preset)];sendToolToGenerator(n,p[0],p[1],{preset:p[0]},'image')});return;
    }
    if(tool==='旋转镜像'){
      modalShell('旋转与镜像',`<div class="feature-grid">${field('旋转角度',`<input id="imgRotation" type="number" min="0" max="360" value="${Number(n.rotation||0)}">`)}${field('镜像',`<div class="seg-buttons"><button id="mirrorX" class="${n.mirrorX?'active':''}">左右镜像</button><button id="mirrorY" class="${n.mirrorY?'active':''}">上下镜像</button></div>`)}</div><div class="feature-actions"><button id="rotate90">顺时针 90°</button><button class="primary" id="applyTransform">应用</button></div>`);
      $('#mirrorX').onclick=()=>{n.mirrorX=!n.mirrorX;$('#mirrorX').classList.toggle('active',n.mirrorX)};$('#mirrorY').onclick=()=>{n.mirrorY=!n.mirrorY;$('#mirrorY').classList.toggle('active',n.mirrorY)};
      $('#rotate90').onclick=()=>{$('#imgRotation').value=(Number($('#imgRotation').value||0)+90)%360};
      $('#applyTransform').onclick=async()=>{const rotation=Number($('#imgRotation').value||0),mirrorX=n.mirrorX,mirrorY=n.mirrorY;if(canLocalProcess(n)){try{showToast('正在本地处理图片…');const out=await localMediaProcess(n,'image-transform',{rotation,mirrorX,mirrorY});const first=out.outputs?.[0];if(first){n.outputUrl=first.url;n.rotation=0;n.mirrorX=false;n.mirrorY=false;saveState();render();closeFeatureModal();showToast('旋转与镜像已写入图片文件');return}}catch(e){showToast('本地处理失败：'+e.message)}}snapshot();n.rotation=rotation;saveState();render();closeFeatureModal();showToast('旋转与镜像已应用')};return;
    }
    if(tool==='裁剪') return openInteractiveImageCrop(n);

    if(tool==='标注'){
      modalShell('图像标注',`<div class="annotation-layout"><div class="annotation-canvas"><div class="annotation-box" style="left:24%;top:28%;width:38%;height:30%"><span>目标区域</span></div></div><div class="annotation-side">${field('标注文字',`<textarea id="annotationText" rows="5" placeholder="例如：把这里的杯子换成红色玻璃杯"></textarea>`,true)}${field('工具',`<div class="seg-buttons"><button class="active">框选</button><button>画笔</button><button>箭头</button></div>`,true)}</div></div><div class="feature-actions"><button id="saveAnnotation">保存标注</button><button class="primary" id="annotationGenerate">发送到生成器</button></div>`,{wide:true});
      $('#saveAnnotation').onclick=()=>{n.toolParams.annotation=$('#annotationText').value;saveState();closeFeatureModal();showToast('标注已保存到节点')};$('#annotationGenerate').onclick=()=>sendToolToGenerator(n,'标注重绘',$('#annotationText').value,{annotation:$('#annotationText').value},'image');return;
    }
    if(tool==='分镜组'){
      const ids=(state.selectedIds||[]).length>1?state.selectedIds:[n.id,...state.edges.filter(e=>e.target===n.id||e.source===n.id).flatMap(e=>[e.source,e.target])];
      const images=[...new Set(ids)].map(id=>state.nodes.find(x=>x.id===id)).filter(x=>x?.type==='image');
      modalShell('创建分镜组',`<div class="feature-grid">${field('已选图片',`<div class="selection-summary">${images.length} 张图片</div>`)}${field('宫格数量',`<select id="boardGrid"><option>2x2</option><option selected>3x3</option><option>4x4</option><option>5x5</option><option>自定义</option></select>`)}${field('画幅比',`<select id="boardRatio"><option>21:9</option><option selected>16:9</option><option>9:16</option><option>3:4</option><option>4:3</option><option>1:1</option></select>`)}</div><div class="feature-actions"><button class="primary" id="createStoryboardGroup">创建分镜组</button></div>`);$('#createStoryboardGroup').onclick=()=>{if(images.length<2){showToast('请先 Shift 多选至少两张图片');return;}createGroup(images.map(x=>x.id),'分镜组','storyboard',{grid:$('#boardGrid').value,ratio:$('#boardRatio').value});closeFeatureModal();};return;
    }
    if(tool==='高清'){
      modalShell('高清放大',`<div class="feature-grid">${field('放大倍数',`<select id="upscaleScale"><option>2</option><option>4</option><option>6</option></select>`)}${field('优化模式',`<select id="upscaleMode"><option>通用</option><option>低分辨率</option><option>3D动画</option><option>高保真</option><option>文本优化</option></select>`)}</div><div class="feature-actions"><button class="primary" id="sendImageTool">执行高清放大</button></div>`);$('#sendImageTool').onclick=async()=>{const scale=Number($('#upscaleScale').value),mode=$('#upscaleMode').value;if(canLocalProcess(n)&&mode==='通用'){try{showToast('ImageMagick 正在本地高清放大…');const out=await localMediaProcess(v352WorkingProxy(n),'image-upscale',{scale});if(out.outputs?.[0]){makeLocalResultNode(n,out.outputs[0],`${scale}x 高清图`,{operation:'高清放大',scale,mode});closeFeatureModal();showToast('图片已真实放大');return}}catch(e){showToast('本地高清失败：'+e.message)}}sendToolToGenerator(n,'高清放大',`对参考图进行 ${scale} 倍高清放大，使用${mode}模式`,{scale,mode},'image')};return;
    }
    if(tool==='扩图'){
      modalShell('扩图',`<div class="feature-grid">${field('画幅比',`<select id="outpaintRatio"><option>21:9</option><option>16:9</option><option>9:16</option><option>3:4</option><option>4:3</option><option>1:1</option></select>`)}${field('分辨率',`<select id="outpaintRes"><option>1K</option><option>2K</option><option>6K</option></select>`)}${field('生成张数',`<select id="outpaintCount"><option>1</option><option>2</option><option>3</option><option>4</option></select>`)}${field('补充描述',`<textarea id="outpaintPrompt" rows="4" placeholder="向外补全场景，保持空间与风格一致"></textarea>`,true)}</div><div class="feature-actions"><button class="primary" id="sendOutpaint">发送到生成器</button></div>`);$('#sendOutpaint').onclick=()=>sendToolToGenerator(n,'扩图',$('#outpaintPrompt').value||'向外扩展画面并保持原图空间、主体、风格一致',{aspectRatio:$('#outpaintRatio').value,resolution:$('#outpaintRes').value,count:Number($('#outpaintCount').value)},'image');return;
    }
    if(tool==='宫格切分'){
      modalShell('宫格切分',`<div class="feature-grid">${field('宫格数量',`<select id="splitGrid"><option value="9">9 宫格</option><option value="25">25 宫格</option></select>`)}${field('提取方式',`<select id="splitMode"><option>全部切分</option><option>选择分镜切片</option></select>`)}</div><div class="grid-split-preview">${Array.from({length:9},(_,i)=>`<button data-cell="${i}" class="active">${i+1}</button>`).join('')}</div><div class="feature-actions"><button class="primary" id="runGridSplit">发送到画布并创建分镜组</button></div>`);$('#splitGrid').onchange=()=>{const c=Number($('#splitGrid').value);$('.grid-split-preview').innerHTML=Array.from({length:c},(_,i)=>`<button data-cell="${i}" class="active">${i+1}</button>`).join('');bindCells()};const bindCells=()=>$$('[data-cell]',featureModal).forEach(b=>b.onclick=()=>b.classList.toggle('active'));bindCells();$('#runGridSplit').onclick=async()=>{const total=Number($('#splitGrid').value),chosen=$$('[data-cell].active',featureModal).map(x=>Number(x.dataset.cell));if(!chosen.length){showToast('至少选择一个分镜切片');return}if(canLocalProcess(n)){try{showToast('正在真实切分宫格图片…');const out=await localMediaProcess(n,'image-grid-split',{grid:total,selected:chosen});snapshot();const ids=[];(out.outputs||[]).forEach((x,i)=>{const cell={id:uid('n'),type:'image',x:n.x+420+(i%5)*350,y:n.y+Math.floor(i/5)*270,w:310,title:`分镜切片 ${(x.index??chosen[i])+1}`,outputUrl:x.url,prompt:'',providerId:'',modelId:'',modelName:'本地处理',taskStatus:'succeeded',toolParams:{operation:'grid_split',grid:total,index:x.index??chosen[i]}};state.nodes.push(cell);state.edges.push({id:uid('e'),source:n.id,target:cell.id,type:'split'});ids.push(cell.id)});createGroup(ids,'宫格切分分镜组','storyboard',{grid:total===25?'5x5':'3x3',ratio:n.aspectRatio||'16:9'});closeFeatureModal();saveState();render();showToast(`已真实提取 ${ids.length} 个分镜切片`);return}catch(e){showToast('本地切分失败：'+e.message)}}snapshot();const ids=[];chosen.slice(0,25).forEach((idx,i)=>{const cell={id:uid('n'),type:'image',x:n.x+420+(i%5)*350,y:n.y+Math.floor(i/5)*270,w:310,title:`分镜切片 ${idx+1}`,content:n.content||'city',prompt:'',providerId:n.providerId||'',modelId:n.modelId||'',modelName:n.modelName||'',toolParams:{operation:'grid_split',grid:total,index:idx}};state.nodes.push(cell);state.edges.push({id:uid('e'),source:n.id,target:cell.id,type:'split'});ids.push(cell.id)});createGroup(ids,'宫格切分分镜组','storyboard',{grid:total===25?'5x5':'3x3',ratio:n.aspectRatio||'16:9'});closeFeatureModal();saveState();render();showToast(`已创建 ${ids.length} 个切片处理节点`) };return;
    }
    if(['重绘','擦除'].includes(tool)) return openMaskEditor(n,tool);
    if(tool==='抠图') return sendToolToGenerator(n,'抠图','自动去除背景，仅保留主体，边缘保留毛发和半透明细节',{backgroundRemoval:true},'image');

    if(tool==='全景') return openPanoramaViewer(n);

    if(tool==='多角度'){
      modalShell('多角度相机控制',`<div class="camera-control-layout"><div class="camera-orbit" id="cameraOrbit"><div class="orbit-ring"></div><div class="orbit-camera" id="orbitCamera">⌖</div><div class="orbit-object">对象</div><div class="orbit-readout" id="orbitReadout">方位 0° · 俯仰 0°</div></div><div class="feature-grid">${rangeField('水平环绕','azimuth',-180,180,0,1)}${rangeField('垂直俯仰','elevation',-60,60,0,1)}${rangeField('景别缩放','zoomLevel',1,3,2,.1)}${field('额外提示词',`<input id="anglePrompt" placeholder="例如：广角、鱼眼、极度特写">`,true)}</div></div><div class="preset-inline"><button data-angle="-90,0,2">左侧</button><button data-angle="90,0,2">右侧</button><button data-angle="0,45,2">俯拍</button><button data-angle="0,-30,2">仰拍</button><button data-angle="180,0,2">背面</button><button data-angle="0,0,1">特写</button></div><div class="feature-actions"><button id="makeAngleSet">创建六视图组</button><button class="primary" id="sendAngle">生成当前视角</button></div>`,{wide:true});bindRanges();
      const orbit=$('#cameraOrbit'),dot=$('#orbitCamera');const draw=()=>{const a=Number($('#azimuth').value),e=Number($('#elevation').value),rad=a*Math.PI/180,rr=.34*(1-Math.abs(e)/150),x=50+Math.sin(rad)*rr*100,y=50-Math.cos(rad)*rr*28-e*.38;dot.style.left=Math.max(7,Math.min(93,x))+'%';dot.style.top=Math.max(7,Math.min(93,y))+'%';$('#orbitReadout').textContent=`方位 ${a.toFixed(0)}° · 俯仰 ${e.toFixed(0)}° · ${Number($('#zoomLevel').value).toFixed(1)}×`};$$('#azimuth,#elevation,#zoomLevel',featureModal).forEach(x=>x.oninput=()=>{bindRanges();draw()});draw();let drag=null;dot.onpointerdown=e=>{e.preventDefault();drag=true;try{dot.setPointerCapture(e.pointerId)}catch{}};dot.onpointermove=e=>{if(!drag)return;const r=orbit.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/(r.width*.34),dy=(e.clientY-(r.top+r.height/2))/(r.height*.34);$('#azimuth').value=Math.max(-180,Math.min(180,Math.atan2(dx,-dy)*180/Math.PI));$('#elevation').value=Math.max(-60,Math.min(60,-dy*42));draw()};dot.onpointerup=()=>drag=false;dot.onpointercancel=()=>drag=false;
      $$('[data-angle]',featureModal).forEach(b=>b.onclick=()=>{const[a,e,z]=b.dataset.angle.split(',');$('#azimuth').value=a;$('#elevation').value=e;$('#zoomLevel').value=z;draw()});const params=()=>({azimuth:Number($('#azimuth').value),elevation:Number($('#elevation').value),zoom:Number($('#zoomLevel').value)});$('#sendAngle').onclick=()=>sendToolToGenerator(n,'多角度',`生成新的拍摄视角。${$('#anglePrompt').value}`,params(),'image');$('#makeAngleSet').onclick=()=>{snapshot();const defs=[['正面',0,0],['右侧',90,0],['背面',180,0],['左侧',-90,0],['俯拍',0,45],['仰拍',0,-30]],ids=[];defs.forEach((d,i)=>{const node=createDerivedNode(n,'image',`${d[0]}视角`,`保持同一主体身份、服装、比例和背景逻辑，生成${d[0]}视角`,{operation:'multi_angle',azimuth:d[1],elevation:d[2],zoom:2},430+i*28);ids.push(node.id)});createGroup(ids,'主体六视图','storyboard',{grid:'3x2',ratio:'3:4'});closeFeatureModal();saveState();render()};return;
    }
    if(tool==='打光'){
      modalShell('打光控制器',`<div class="lighting-layout"><div class="light-sphere" id="lightSphere"><div class="light-subject">主体</div><i class="light-dot" id="lightDot"></i><span id="lightReadout">主光 -45° / 45° · 50%</span></div><div class="feature-grid">${rangeField('主光水平','lightX',-180,180,-45,1)}${rangeField('主光垂直','lightY',-90,90,45,1)}${rangeField('亮度','brightness',10,100,50,1)}${rangeField('柔光','softness',0,100,42,1)}${field('主光颜色',`<input id="lightColor" type="color" value="#ffffff">`)}${field('轮廓光',`<select id="rimLight"><option>关闭</option><option>正后方</option><option>左后方</option><option>右后方</option></select>`)}${field('智能模式描述',`<textarea id="lightPrompt" rows="3" placeholder="黄金时刻、压抑冷调、赛博朋克…"></textarea>`,true)}</div></div><div class="preset-inline"><button data-light="45,35,78,#ffd8a0">黄金时刻</button><button data-light="-50,25,55,#b9d8ff">冷调侧光</button><button data-light="0,70,62,#ffffff">顶光</button><button data-light="160,20,58,#d7e8ff">逆光</button><button data-light="-25,10,42,#ff5be8">霓虹</button></div><div class="feature-actions"><button class="primary" id="sendLight">生成打光版本</button></div>`,{wide:true});bindRanges();
      const sphere=$('#lightSphere'),dot=$('#lightDot');const draw=()=>{const x=Number($('#lightX').value),y=Number($('#lightY').value),b=Number($('#brightness').value),rad=x*Math.PI/180,r=.36*(1-Math.abs(y)/210);dot.style.left=(50+Math.sin(rad)*r*100)+'%';dot.style.top=(50-Math.cos(rad)*r*32-y*.27)+'%';const color=$('#lightColor').value;dot.style.background=color;dot.style.boxShadow=`0 0 ${18+b*.45}px ${color}`;sphere.style.setProperty('--light-opacity',String(.12+b/150));$('#lightReadout').textContent=`主光 ${x.toFixed(0)}° / ${y.toFixed(0)}° · ${b.toFixed(0)}%`};$$('#lightX,#lightY,#brightness,#lightColor',featureModal).forEach(x=>x.oninput=()=>{bindRanges();draw()});draw();let dragging=false;dot.onpointerdown=e=>{dragging=true;e.preventDefault();try{dot.setPointerCapture(e.pointerId)}catch{}};dot.onpointermove=e=>{if(!dragging)return;const r=sphere.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/(r.width*.36),dy=(e.clientY-(r.top+r.height/2))/(r.height*.36);$('#lightX').value=Math.max(-180,Math.min(180,Math.atan2(dx,-dy)*180/Math.PI));$('#lightY').value=Math.max(-90,Math.min(90,-dy*54));draw()};dot.onpointerup=()=>dragging=false;dot.onpointercancel=()=>dragging=false;$$('[data-light]',featureModal).forEach(b=>b.onclick=()=>{const[x,y,br,c]=b.dataset.light.split(',');$('#lightX').value=x;$('#lightY').value=y;$('#brightness').value=br;$('#lightColor').value=c;draw()});$('#sendLight').onclick=()=>sendToolToGenerator(n,'打光',$('#lightPrompt').value||'按照灯光参数重新布光，保持人物身份、构图和材质不变',{lightX:Number($('#lightX').value),lightY:Number($('#lightY').value),brightness:Number($('#brightness').value),softness:Number($('#softness').value),color:$('#lightColor').value,rim:$('#rimLight').value},'image');return;
    }
    if(tool==='九宫格'){
      modalShell('智能宫格 / 分镜生成',`<div class="preset-grid compact">${slashPresets.slice(0,10).map((p,i)=>`<button class="preset-card" data-gridpreset="${i}"><b>${p[0]}</b><span>${p[1]}</span></button>`).join('')}</div>`,{wide:true});$$('[data-gridpreset]',featureModal).forEach(b=>b.onclick=()=>{const p=slashPresets[Number(b.dataset.gridpreset)];sendToolToGenerator(n,p[0],p[1],{gridPreset:p[0]},'image')});return;
    }
    if(tool==='风格'){
      const styles=['电影写实','日系赛璐璐','3D动画','胶片摄影','复古港风','水墨工笔','电商棚拍','杂志时尚','黏土定格','像素游戏','手绘插画','赛博朋克'];
      modalShell('风格库',`<div class="style-search"><input id="styleSearch" placeholder="搜索风格"></div><div class="style-grid">${styles.map(x=>`<button data-style="${x}"><div class="style-swatch"></div><b>${x}</b></button>`).join('')}</div><div class="feature-actions"><button id="customStyle">＋ 自定义风格模板</button></div>`,{wide:true});$$('[data-style]',featureModal).forEach(b=>b.onclick=()=>{n.toolParams.style=b.dataset.style;n.prompt=((n.prompt||'')+`，${b.dataset.style}风格`).replace(/^，/,'');saveState();closeFeatureModal();renderGenerator();showToast('风格已加入生成器')});$('#customStyle').onclick=()=>showToast('自定义风格：选择 5-20 张同风格图后可保存为资产模板');return;
    }
    if(tool==='焦点编辑') return openFocusEdit(n);

    if(tool==='镜头聚焦') return openFocusSelection(n);

    if(tool==='摄像机控制'){
      modalShell('摄像机控制',`<div class="feature-grid">${field('相机',`<select id="cameraBody"><option>Sony Venice</option><option>ARRI Alexa 35</option><option>RED V-Raptor</option><option>Canon R5 C</option></select>`)}${field('镜头',`<select id="cameraLens"><option>Cooke S4</option><option>Helios</option><option>Zeiss Supreme</option><option>Anamorphic</option></select>`)}${rangeField('焦距 mm','focal',14,200,50,1)}${field('光圈',`<select id="aperture"><option>f/1.4</option><option>f/2</option><option selected>f/2.8</option><option>f/4</option><option>f/8</option><option>f/11</option></select>`)}</div><div class="feature-actions"><button class="primary" id="applyCamera">使用</button></div>`);bindRanges();$('#applyCamera').onclick=()=>{n.toolParams.camera={body:$('#cameraBody').value,lens:$('#cameraLens').value,focal:Number($('#focal').value),aperture:$('#aperture').value};saveState();closeFeatureModal();renderGenerator();showToast('摄像机参数已绑定到生成器')};return;
    }
    showToast(tool);
  }

  function openReferencePicker(n){
    modalShell('选择参考素材',`<div class="reference-list large">${state.nodes.filter(x=>x.id!==n.id&&['image','video','audio','text'].includes(x.type)).map(x=>`<label><input type="checkbox" data-ref-node="${x.id}" ${state.edges.some(e=>e.source===x.id&&e.target===n.id)?'checked':''}><span class="ref-type">${labelForType(x.type)}</span><b>${escapeHtml(x.title)}</b></label>`).join('')||'<div class="feature-empty">暂无可引用素材</div>'}</div><div class="feature-actions"><button class="primary" id="applyRefs">应用引用</button></div>`);
    $('#applyRefs').onclick=()=>{snapshot();state.edges=state.edges.filter(e=>!(e.target===n.id&&e.type==='manual-ref'));$$('[data-ref-node]:checked',featureModal).forEach(c=>{if(!state.edges.some(e=>e.source===c.dataset.refNode&&e.target===n.id))state.edges.push({id:uid('e'),source:c.dataset.refNode,target:n.id,type:'manual-ref'})});saveState();render();closeFeatureModal();};
  }

  function openVideoTool(tool,n){
    if(tool==='高清'){
      modalShell('视频高清 / 插帧 / 慢动作',`<div class="feature-grid">${field('放大倍数',`<select id="vScale"><option>2</option><option>4</option><option>6</option></select>`)}${field('目标帧率',`<select id="vFps"><option>30</option><option>60</option><option>90</option></select>`)}${rangeField('减速强度','slowMotion',0,100,0,10)}</div><div class="feature-actions"><button class="primary" id="sendVideoHD">发送到生成器</button></div>`);bindRanges();$('#sendVideoHD').onclick=async()=>{const params={scale:Number($('#vScale').value),fps:Number($('#vFps').value),slowMotion:Number($('#slowMotion').value)};if(canLocalProcess(n)){try{showToast('FFmpeg 正在本地处理视频…');const out=await localMediaProcess(n,'video-hd',params);if(out.outputs?.[0]){makeLocalResultNode(n,out.outputs[0],'本地视频高清',params);closeFeatureModal();showToast('本地视频处理完成');return}}catch(e){showToast('本地处理失败，转为供应商任务：'+e.message)}}sendToolToGenerator(n,'视频高清','对参考视频进行高清放大、帧率提升与慢动作处理',params,'video')};return;
    }
    if(tool==='解析') return createVideoAnalysis(n,false);
    if(tool==='逐帧拉片') return createVideoAnalysis(n,true);
    if(tool==='剪辑') return openVideoTrim(n);
    if(tool==='视频合成') return openVideoComposer(n);
    if(tool==='人声分离'){
      modalShell('人声 / 背景音分离',`<div class="feature-grid">${field('输出',`<select id="stemType"><option>仅人声</option><option>仅背景声</option><option>同时输出两条</option></select>`)}</div><div class="feature-actions"><button class="primary" id="runStem">创建处理节点</button></div>`);$('#runStem').onclick=()=>{const mode=$('#stemType').value;if(mode==='同时输出两条'){sendToolToGenerator(n,'人声分离','从参考视频提取干净人声',{stem:'voice'},'audio');const n2=createDerivedNode(n,'audio','背景声','从参考视频提取背景声',{operation:'人声分离',stem:'background'},470);closeFeatureModal();}else sendToolToGenerator(n,'人声分离',mode==='仅人声'?'提取干净人声':'提取背景声',{stem:mode==='仅人声'?'voice':'background'},'audio')};return;
    }
    if(tool==='分离音视频'){
      if(canLocalProcess(n)){(async()=>{try{showToast('正在本地分离音视频…');const out=await localMediaProcess(n,'av-separate',{});(out.outputs||[]).forEach((x,i)=>{const nn=makeLocalResultNode(n,x,x.type==='audio'?'分离音频':'静音画面',{operation:'分离音视频'});nn.y=n.y+(i?160:-80)});saveState();render();showToast('音视频已真实分离')}catch(e){showToast('本地分离失败：'+e.message)}})();return;}
      snapshot();const audio={id:uid('n'),type:'audio',x:n.x+420,y:n.y+160,w:340,title:'分离音频',prompt:'从视频分离音频',providerId:n.providerId||'',modelId:'',modelName:'',toolParams:{operation:'分离音视频',part:'audio'}};const video={...JSON.parse(JSON.stringify(n)),id:uid('n'),x:n.x+420,y:n.y-80,title:'静音画面',muted:true,toolParams:{...(n.toolParams||{}),operation:'分离音视频',part:'video'}};state.nodes.push(video,audio);state.edges.push({id:uid('e'),source:n.id,target:video.id,type:'video'},{id:uid('e'),source:n.id,target:audio.id,type:'audio'});saveState();render();showToast('已拆分为视频画面与音频节点');return;
    }
    if(tool==='智能剪辑'){
      modalShell('智能剪辑',`<div class="smart-edit-modes"><label><input type="radio" name="editmode" value="口播视频" checked><b>口播视频</b><span>去口水词 / 停顿 / 字幕 / 高亮动效 / 转场</span></label><label><input type="radio" name="editmode" value="批量广告"><b>批量广告</b><span>产品信息 + 目标场景，一次生成多版</span></label><label><input type="radio" name="editmode" value="智能混剪"><b>智能混剪</b><span>自动卡点、视觉聚焦和素材编排</span></label><label><input type="radio" name="editmode" value="无人出镜解说"><b>无人出镜解说</b><span>文稿 / 音色 / 素材自动组成讲解视频</span></label></div>${field('剪辑要求',`<textarea id="smartEditPrompt" rows="5" placeholder="描述剪辑节奏、字幕、转场、产品重点…"></textarea>`,true)}<div class="feature-actions"><button class="primary" id="runSmartEdit">发送到生成器</button></div>`,{wide:true});$('#runSmartEdit').onclick=()=>{const mode=$('input[name="editmode"]:checked',featureModal).value;sendToolToGenerator(n,'智能剪辑',$('#smartEditPrompt').value||`按${mode}场景智能剪辑`,{mode},'video')};return;
    }
    if(tool==='智能续写') return openVisualContinue(n);
    if(tool==='片段重拍') return openReshoot(n);
    if(['主体库','运镜预设','首尾帧','全能参考'].includes(tool)) return openVideoGeneratorTool(tool,n);
  }

  async function createVideoAnalysis(n,frameByFrame){
    const eligible=providers.flatMap(p=>(p.models||[]).filter(m=>m.enabled!==false&&m.modality==='text').map(m=>({p,m,c:{...defaultCapabilities('text',m.id,m.name),...(m.capabilities||{})}})));modalShell(frameByFrame?'逐帧拉片 · AI分析':'视频解析 · AI分镜',`<div class="video-analysis-layout"><video src="${escapeAttr(n.outputUrl||'')}" controls playsinline></video><div class="feature-grid">${field('文本/视觉模型',`<select id="analysisModel"><option value="">选择多模态文本模型</option>${eligible.map((x,i)=>`<option value="${i}">${escapeHtml(x.p.name)} · ${escapeHtml(x.m.name||x.m.id)}${x.c.supportsVideoUnderstanding?' · 视频理解':''}</option>`).join('')}</select>`,true)}${field('分析维度',`<div class="analysis-checks"><label><input type="checkbox" value="叙事分镜" checked>叙事分镜</label><label><input type="checkbox" value="精彩运镜" checked>精彩运镜</label><label><input type="checkbox" value="动作片段" checked>动作片段</label><label><input type="checkbox" value="音频参考" checked>音频参考</label></div>`,true)}${field('补充要求',`<textarea id="analysisPrompt" rows="4" placeholder="例如：重点分析镜头节奏、人物走位和可复刻运镜"></textarea>`,true)}</div></div><div class="feature-actions"><button id="extractOnly">仅提取关键帧</button><button class="primary" id="runVideoAnalysis">开始 AI 分析</button></div>`,{wide:true});
    const extractFrames=async(count=frameByFrame?8:5)=>{if(!canLocalProcess(n))return[];const out=await localMediaProcess(n,'video-frames',{count,duration:Number(n.duration||5)});return out.outputs||[]};
    $('#extractOnly').onclick=async()=>{try{const frames=await extractFrames();if(!frames.length)return showToast('远程素材无法本地提帧，请选择 AI 模型分析');snapshot();const ids=[];frames.forEach((x,i)=>{const img={id:uid('n'),type:'image',x:n.x+430+(i%4)*340,y:n.y+Math.floor(i/4)*280,w:300,title:`关键帧 ${i+1} · ${Number(x.time||0).toFixed(2)}s`,outputUrl:x.url,prompt:'',providerId:'',modelId:'',modelName:'本地 FFmpeg',taskStatus:'succeeded',toolParams:{operation:'video_frame',time:x.time}};state.nodes.push(img);state.edges.push({id:uid('e'),source:n.id,target:img.id,type:'analysis'});ids.push(img.id)});createGroup(ids,'视频关键帧','storyboard',{grid:frames.length>4?'4x2':'2x2',ratio:'16:9'});saveState();render();closeFeatureModal();showToast('真实关键帧已发送画布')}catch(e){showToast(e.message)}};
    $('#runVideoAnalysis').onclick=async()=>{const idx=Number($('#analysisModel').value);if(!Number.isFinite(idx)||!eligible[idx])return showToast('请选择多模态文本模型');const {p,m,c}=eligible[idx],dimensions=$$('.analysis-checks input:checked',featureModal).map(x=>x.value);const schema={summary:'视频概述',shots:[{start:0,end:2.4,visual:'画面内容',shotSize:'景别',camera:'运镜',action:'动作',audio:'对白/音效/音乐',imagePrompt:'可复刻画面提示词',videoPrompt:'可复刻动态/运镜提示词'}]};let refs=[{id:n.id,type:'video',title:n.title,url:n.outputUrl||'',text:'',kind:'video'}];try{if(!c.supportsVideoUnderstanding&&canLocalProcess(n)){showToast('该模型未声明视频理解，正在提取关键帧作为视觉参考…');const frames=await extractFrames(8);refs=frames.map((x,i)=>({id:`frame-${i}`,type:'image',title:`${x.time.toFixed(2)}s关键帧`,url:x.url,text:`时间 ${x.time.toFixed(2)}s`,kind:'image'}))}const prompt=`你是专业影视拉片分析师。分析参考视频/关键帧，维度：${dimensions.join('、')}。必须只返回合法 JSON 对象，不要 Markdown。按时间顺序给出 shot，时间精确到 0.01 秒；camera 写景别变化、机位和运动；action 写人物/物体动作；audio 写对白、音乐、环境音或节奏。输出结构：${JSON.stringify(schema)}。补充要求：${$('#analysisPrompt').value||'无'}`;showToast('第三方多模态模型正在分析视频…');const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:p.id,modelId:m.id,providerSnapshot:snapshotProviderForTask(p),modelSnapshot:m,nodeType:'text',prompt,references:refs,maxRetries:state.workflowSettings.maxRetries,parameters:{operation:frameByFrame?'frame_by_frame_analysis':'video_analysis',responseFormat:'json_object',dimensions}})});const info=await waitTask(created.task.id);if(info?.status!=='succeeded')throw new Error(info?.error||'分析失败');const parsed=extractStructuredJson(String(info.output?.value??info.output?.text??''));const shots=Array.isArray(parsed?.shots)?parsed.shots:[];snapshot();const script={id:uid('n'),type:'script',x:n.x+460,y:n.y,w:560,title:frameByFrame?'逐帧拉片结果':'视频解析表',prompt:'',providerId:'',modelId:'',modelName:'',sourceText:parsed?.summary||'',scriptData:{style:'视频反推',assets:{characters:[],scenes:[],props:[]},shots:shots.map((x,i)=>({id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:x.visual||'',characters:'',shotSize:x.shotSize||'中景',action:[x.visual,x.action,x.camera].filter(Boolean).join('；'),dialogue:x.audio||'',duration:Math.max(.01,Number(x.end||0)-Number(x.start||0)||2),imagePrompt:x.imagePrompt||'',videoPrompt:x.videoPrompt||x.camera||'',analysisStart:Number(x.start||0),analysisEnd:Number(x.end||0)})),finalized:true,analysis:{summary:parsed?.summary||'',dimensions,sourceVideoId:n.id,raw:parsed}}};state.nodes.push(script);state.edges.push({id:uid('e'),source:n.id,target:script.id,type:'analysis'});selectedId=script.id;saveState();render();closeFeatureModal();showToast(`AI 视频分析完成 · ${shots.length} 个镜头`)}catch(e){showToast('视频分析失败：'+e.message)}};
  }


  function timelineClipFromNode(node, start=0, track){
    const duration=Math.max(.1,Number(node.duration||node.mediaMeta?.duration||5));
    return {id:uid('clip'),nodeId:node.id,type:node.type,url:node.outputUrl||'',title:node.title||labelForType(node.type),track:track||(node.type==='audio'?'A1':'V1'),start:Number(start||0),in:0,out:duration,volume:1,muted:false,speed:1,transitionIn:'none',transitionDuration:.45,volumeKeyframes:[]};
  }
  function clipTimelineDuration(c){return Math.max(.01,(Number(c.out||0)-Number(c.in||0))/Math.max(.1,Number(c.speed||1)))}
  function timelineDuration(clips){return Math.max(1,...clips.map(c=>Number(c.start||0)+clipTimelineDuration(c)))}
  function ensureTimelineData(n, media=connectedMedia(n)){
    if(n.timelineData?.clips?.length){n.timelineData.clips=n.timelineData.clips.filter(c=>state.nodes.some(x=>x.id===c.nodeId)||c.url).map(c=>({transitionIn:'none',transitionDuration:.45,volumeKeyframes:[],...c,speed:Number(c.speed||1),volumeKeyframes:Array.isArray(c.volumeKeyframes)?c.volumeKeyframes:[]}));n.timelineData.trackState||={};n.timelineData.markers||=[];n.timelineData.subtitles||=[];n.timelineData.grade={brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,...(n.timelineData.grade||{})};n.timelineData.subtitleStyle={fontSize:42,color:'#ffffff',outline:2,bottom:72,...(n.timelineData.subtitleStyle||{})};n.timelineData.zoom=Number(n.timelineData.zoom||1);n.timelineData.snapEnabled=n.timelineData.snapEnabled!==false;return n.timelineData;}
    const clips=[];let cursor=0;
    media.filter(x=>x.type==='video').forEach((x,i)=>{const c=timelineClipFromNode(x,cursor,i%2?'V2':'V1');clips.push(c);cursor+=clipTimelineDuration(c)});
    media.filter(x=>x.type==='audio').forEach((x,i)=>clips.push(timelineClipFromNode(x,0,i?'BGM':'A1')));
    n.timelineData={clips,resolution:'720p',fps:30,duration:timelineDuration(clips),snap:.1,snapEnabled:true,selectedClipId:clips[0]?.id||'',playhead:0,zoom:1,markers:[],subtitles:[],subtitleStyle:{fontSize:42,color:'#ffffff',outline:2,bottom:72},grade:{brightness:0,contrast:1,saturation:1,gamma:1,temperature:0},trackState:{}};return n.timelineData;
  }
  function activeVideoClipAt(t, clips){return clips.filter(c=>c.type==='video'&&t>=Number(c.start||0)&&t<Number(c.start||0)+clipTimelineDuration(c)).sort((a,b)=>(a.track==='V2'?2:1)-(b.track==='V2'?2:1)).at(-1)||null;}
  function timelineSnapPoints(data,excludeId=''){const out=[0,Number(data.playhead||0),...(data.markers||[]).map(m=>Number(m.t||0))];(data.clips||[]).forEach(c=>{if(c.id===excludeId)return;out.push(Number(c.start||0),Number(c.start||0)+clipTimelineDuration(c))});return out.filter(Number.isFinite)}
  function magneticSnap(value,data,excludeId='',threshold=.12){if(!data.snapEnabled)return value;let best=value,dist=Infinity;for(const p of timelineSnapPoints(data,excludeId)){const d=Math.abs(value-p);if(d<dist&&d<=threshold){dist=d;best=p}}if(dist<Infinity)return best;const step=Number(data.snap||.1);return step>0?Math.round(value/step)*step:value}
  function splitTimelineClip(data,clip,t){const local=(Number(t)-Number(clip.start||0))*Math.max(.1,Number(clip.speed||1))+Number(clip.in||0);if(local<=Number(clip.in||0)+.03||local>=Number(clip.out||0)-.03)return false;const right={...clip,id:uid('clip'),in:local,start:Number(t),title:`${clip.title} · B`};clip.out=local;clip.title=clip.title.replace(/ · [AB]$/,'')+' · A';data.clips.push(right);data.selectedClipId=right.id;return true}
  function rippleDeleteClip(data,clip){const start=Number(clip.start||0),dur=clipTimelineDuration(clip);data.clips=data.clips.filter(c=>c.id!==clip.id);data.clips.forEach(c=>{if(c.track===clip.track&&Number(c.start||0)>start)c.start=Math.max(start,Number(c.start||0)-dur)});data.selectedClipId=data.clips[0]?.id||''}
  function clipVisualHtml(c){if(c.type==='audio')return `<div class="clip-waveform">${Array.from({length:15},(_,i)=>`<i style="height:${22+((i*17)%67)}%"></i>`).join('')}</div>`;return `<div class="clip-filmstrip">${Array.from({length:8},(_,i)=>`<i style="background-position:${(i*13)%100}% center"></i>`).join('')}</div>`}
  function bindTimelineClipDrag(lane,clip,data,scale,rerender){
    const block=$(`[data-timeline-clip="${clip.id}"]`,lane);if(!block)return;
    block.onpointerdown=e=>{
      if(e.target.closest('.clip-handle,.clip-mini-btn'))return;e.preventDefault();e.stopPropagation();data.selectedClipId=clip.id;if(data.trackState?.[clip.track]?.locked){showToast(`${clip.track} 已锁定`);rerender();return}const sx=e.clientX,orig=Number(clip.start||0);let moved=false;
      const move=ev=>{const dt=(ev.clientX-sx)/scale;if(Math.abs(dt)>.02)moved=true;let next=Math.max(0,orig+dt);next=ev.shiftKey?Math.round(next*100)/100:magneticSnap(next,data,clip.id,Math.max(.04,8/scale));clip.start=next;block.style.left=(clip.start*scale)+'px';const h=$('.timeline-total-label',timelinePanel);if(h)h.textContent=timelineDuration(data.clips).toFixed(2)+'s'};
      const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);if(moved){data.duration=timelineDuration(data.clips);saveState()}rerender()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
    };
    $$('.clip-handle',block).forEach(h=>h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(data.trackState?.[clip.track]?.locked)return showToast(`${clip.track} 已锁定`);const side=h.dataset.handle,sx=e.clientX,oin=Number(clip.in||0),oout=Number(clip.out||0),ostart=Number(clip.start||0),speed=Math.max(.1,Number(clip.speed||1));const move=ev=>{const raw=(ev.clientX-sx)/scale*speed;const delta=ev.shiftKey?Math.round(raw*100)/100:Math.round(raw/Number(data.snap||.1))*Number(data.snap||.1);if(side==='in'){const ni=Math.max(0,Math.min(oout-.05,oin+delta));clip.start=Math.max(0,ostart+(ni-oin)/speed);clip.in=ni}else clip.out=Math.max(Number(clip.in)+.05,oout+delta)};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);data.duration=timelineDuration(data.clips);saveState();rerender()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true})});
  }

  function activeSubtitleAt(data,t){return (data.subtitles||[]).filter(x=>t>=Number(x.start||0)&&t<Number(x.end||0)).sort((a,b)=>Number(a.start||0)-Number(b.start||0)).at(-1)||null}
  function previewGradeFilter(g={}){const b=Math.max(.2,1+Number(g.brightness||0)),c=Math.max(.2,Number(g.contrast??1)),sat=Math.max(0,Number(g.saturation??1)),temp=Math.max(-1,Math.min(1,Number(g.temperature||0)));return `brightness(${b}) contrast(${c}) saturate(${sat}) sepia(${Math.abs(temp)*.12}) hue-rotate(${temp*8}deg)`}
  function openTimelineTransitionEditor(data,clip,rerender){
    if(!clip||clip.type!=='video')return showToast('请先选择视频素材');
    modalShell('转场 · 入场效果',`<div class="transition-preview"><div class="transition-card before">上一镜头</div><div class="transition-arrow">→</div><div class="transition-card after">${escapeHtml(clip.title)}</div></div><div class="feature-grid">${field('转场类型',`<select id="transitionType"><option value="none">无</option><option value="fade">淡入</option><option value="dissolve">叠化</option><option value="slideleft">左侧滑入</option><option value="slideright">右侧滑入</option></select>`)}${rangeField('转场时长','transitionDuration',.1,2,Number(clip.transitionDuration||.45),.05)}${field('说明',`<div class="provider-note">转场写入时间轴并参与本地 FFmpeg 渲染；滑入与叠化在预览中会以近似动画呈现。</div>`,true)}</div><div class="feature-actions"><button id="clearTransition">清除</button><button class="primary" id="saveTransition">应用转场</button></div>`,{wide:true});
    $('#transitionType').value=clip.transitionIn||'none';bindRanges();$('#clearTransition').onclick=()=>{$('#transitionType').value='none'};$('#saveTransition').onclick=()=>{clip.transitionIn=$('#transitionType').value;clip.transitionDuration=Number($('#transitionDuration').value||.45);saveState();closeFeatureModal();rerender();showToast('转场已写入时间轴')};
  }
  function openTimelineSubtitleEditor(data,rerender,subtitleId=''){
    data.subtitles=data.subtitles||[];data.subtitleStyle={fontSize:42,color:'#ffffff',outline:2,bottom:72,...(data.subtitleStyle||{})};
    const edit=data.subtitles.find(x=>x.id===subtitleId)||null;
    modalShell('字幕编辑',`<div class="subtitle-editor-layout"><div class="subtitle-list">${data.subtitles.length?data.subtitles.map(s=>`<button data-subtitle-edit="${s.id}" class="${edit?.id===s.id?'active':''}"><b>${Number(s.start||0).toFixed(2)}–${Number(s.end||0).toFixed(2)}s</b><span>${escapeHtml(s.text||'空字幕')}</span></button>`).join(''):'<div class="feature-empty">还没有字幕</div>'}</div><div class="subtitle-form">${field('字幕文本',`<textarea id="subtitleText" rows="4" placeholder="输入字幕内容">${escapeHtml(edit?.text||'')}</textarea>`,true)}<div class="feature-grid">${field('开始',`<input id="subtitleStart" type="number" step="0.01" value="${Number(edit?.start??data.playhead??0).toFixed(2)}">`)}${field('结束',`<input id="subtitleEnd" type="number" step="0.01" value="${Number(edit?.end??Math.min(timelineDuration(data.clips),(Number(data.playhead||0)+2))).toFixed(2)}">`)}${rangeField('字号','subtitleFontSize',18,72,Number(data.subtitleStyle.fontSize||42),1)}${field('颜色',`<input id="subtitleColor" type="color" value="${escapeAttr(data.subtitleStyle.color||'#ffffff')}">`)}${rangeField('描边','subtitleOutline',0,6,Number(data.subtitleStyle.outline||2),1)}${rangeField('距底部','subtitleBottom',20,240,Number(data.subtitleStyle.bottom||72),2)}</div></div></div><div class="feature-actions">${edit?'<button id="deleteSubtitle" class="danger">删除字幕</button>':''}<button id="newSubtitle">新建</button><button class="primary" id="saveSubtitle">保存字幕</button></div>`,{wide:true});bindRanges();
    $$('[data-subtitle-edit]',featureModal).forEach(b=>b.onclick=()=>openTimelineSubtitleEditor(data,rerender,b.dataset.subtitleEdit));$('#newSubtitle').onclick=()=>openTimelineSubtitleEditor(data,rerender,'');if(edit)$('#deleteSubtitle').onclick=()=>{data.subtitles=data.subtitles.filter(x=>x.id!==edit.id);saveState();closeFeatureModal();rerender();showToast('字幕已删除')};$('#saveSubtitle').onclick=()=>{const text=$('#subtitleText').value.trim(),start=Math.max(0,Number($('#subtitleStart').value||0)),end=Math.max(start+.05,Number($('#subtitleEnd').value||start+2));if(!text)return showToast('请输入字幕内容');const x=edit||{id:uid('sub')};Object.assign(x,{text,start,end});if(!edit)data.subtitles.push(x);data.subtitleStyle={fontSize:Number($('#subtitleFontSize').value),color:$('#subtitleColor').value,outline:Number($('#subtitleOutline').value),bottom:Number($('#subtitleBottom').value)};data.subtitles.sort((a,b)=>a.start-b.start);saveState();closeFeatureModal();rerender();showToast('字幕已保存')};
  }
  function openTimelineGradeEditor(data,rerender){
    data.grade={brightness:0,contrast:1,saturation:1,gamma:1,temperature:0,...(data.grade||{})};const g=data.grade;
    modalShell('调色 · 基础校色',`<div class="grade-preview"><div class="grade-before">原始</div><div class="grade-after" id="gradePreview">预览</div></div><div class="feature-grid">${rangeField('曝光','gradeBrightness',-.5,.5,Number(g.brightness||0),.01)}${rangeField('对比度','gradeContrast',.5,2,Number(g.contrast||1),.01)}${rangeField('饱和度','gradeSaturation',0,2.5,Number(g.saturation||1),.01)}${rangeField('Gamma','gradeGamma',.5,2,Number(g.gamma||1),.01)}${rangeField('色温','gradeTemperature',-1,1,Number(g.temperature||0),.01)}</div><div class="preset-inline"><button data-grade-preset="0,1,1,1,0">还原</button><button data-grade-preset=".05,1.08,.88,.95,.2">暖电影</button><button data-grade-preset="-.04,1.12,.82,1.06,-.28">冷峻</button><button data-grade-preset=".02,1.18,1.25,.96,.08">广告鲜明</button></div><div class="feature-actions"><button class="primary" id="saveGrade">应用调色</button></div>`,{wide:true});bindRanges();
    const draw=()=>{const temp=Number($('#gradeTemperature').value||0);$('#gradePreview').style.filter=`brightness(${1+Number($('#gradeBrightness').value||0)}) contrast(${$('#gradeContrast').value}) saturate(${$('#gradeSaturation').value}) sepia(${Math.abs(temp)*.12}) hue-rotate(${temp*8}deg)`};$$('#gradeBrightness,#gradeContrast,#gradeSaturation,#gradeGamma,#gradeTemperature',featureModal).forEach(x=>x.oninput=()=>{bindRanges();draw()});$$('[data-grade-preset]',featureModal).forEach(b=>b.onclick=()=>{const v=b.dataset.gradePreset.split(',');['gradeBrightness','gradeContrast','gradeSaturation','gradeGamma','gradeTemperature'].forEach((id,i)=>$('#'+id).value=v[i]);draw()});draw();$('#saveGrade').onclick=()=>{data.grade={brightness:Number($('#gradeBrightness').value),contrast:Number($('#gradeContrast').value),saturation:Number($('#gradeSaturation').value),gamma:Number($('#gradeGamma').value),temperature:Number($('#gradeTemperature').value)};saveState();closeFeatureModal();rerender();showToast('调色已写入时间轴')};
  }
  function openVolumeAutomationEditor(data,clip,rerender){
    if(!clip||clip.type!=='audio')return showToast('请先选择音频素材');clip.volumeKeyframes=Array.isArray(clip.volumeKeyframes)?clip.volumeKeyframes:[];const dur=clipTimelineDuration(clip);
    const drawRows=()=>clip.volumeKeyframes.sort((a,b)=>a.t-b.t).map((k,i)=>`<div class="volume-kf-row"><input data-kf-t="${i}" type="number" min="0" max="${dur}" step="0.01" value="${Number(k.t||0).toFixed(2)}"><input data-kf-v="${i}" type="range" min="0" max="2" step=".01" value="${Number(k.v??1)}"><b>${Math.round(Number(k.v??1)*100)}%</b><button data-kf-del="${i}">×</button></div>`).join('');
    modalShell('音量关键帧',`<div class="volume-envelope"><div class="volume-envelope-line"></div>${clip.volumeKeyframes.map(k=>`<i style="left:${Math.min(100,Math.max(0,Number(k.t||0)/dur*100))}%;bottom:${Math.min(92,Math.max(4,Number(k.v??1)/2*88))}%"></i>`).join('')}</div><div class="volume-kf-list">${drawRows()||'<div class="feature-empty">还没有音量关键帧</div>'}</div><div class="feature-actions"><button id="addVolumeKf">＋ 在当前播放头添加</button><button id="resetVolumeKf">清空</button><button class="primary" id="saveVolumeKf">保存包络</button></div>`,{wide:true});
    const bind=()=>{$$('[data-kf-t]',featureModal).forEach(x=>x.oninput=()=>clip.volumeKeyframes[Number(x.dataset.kfT)].t=Math.max(0,Math.min(dur,Number(x.value||0))));$$('[data-kf-v]',featureModal).forEach(x=>x.oninput=()=>{const i=Number(x.dataset.kfV);clip.volumeKeyframes[i].v=Number(x.value);x.nextElementSibling.textContent=Math.round(Number(x.value)*100)+'%'});$$('[data-kf-del]',featureModal).forEach(x=>x.onclick=()=>{clip.volumeKeyframes.splice(Number(x.dataset.kfDel),1);openVolumeAutomationEditor(data,clip,rerender)})};bind();$('#addVolumeKf').onclick=()=>{clip.volumeKeyframes.push({t:Math.max(0,Math.min(dur,Number(data.playhead||0)-Number(clip.start||0))),v:Number(clip.volume??1)});openVolumeAutomationEditor(data,clip,rerender)};$('#resetVolumeKf').onclick=()=>{clip.volumeKeyframes=[];openVolumeAutomationEditor(data,clip,rerender)};$('#saveVolumeKf').onclick=()=>{saveState();closeFeatureModal();rerender();showToast('音量关键帧已保存并参与渲染')};
  }

  function openTimelineEditor(n,{trimOnly=false}={}){
    const media=trimOnly?[n]:connectedMedia(n);const data=trimOnly?{clips:[timelineClipFromNode(n,0,'V1')],resolution:'720p',fps:30,duration:Math.max(.1,Number(n.duration||5)),snap:.1,snapEnabled:true,selectedClipId:'',playhead:0,zoom:1,markers:[],trackState:{}}:ensureTimelineData(n,media);if(!data.selectedClipId)data.selectedClipId=data.clips[0]?.id||'';
    let keyHandler=null,raf=0;
    const close=()=>{if(raf)cancelAnimationFrame(raf);if(keyHandler)window.removeEventListener('keydown',keyHandler,true);timelinePanel.classList.add('hidden')};
    const renderTl=()=>{
      if(keyHandler)window.removeEventListener('keydown',keyHandler,true);
      const total=Math.max(1,timelineDuration(data.clips)),baseScale=Math.max(34,Math.min(90,900/Math.max(8,total))),scale=baseScale*Math.max(.5,Math.min(3,Number(data.zoom||1))),width=Math.max(940,total*scale+140),sel=data.clips.find(c=>c.id===data.selectedClipId);const tracks=trimOnly?['V1']:['V2','V1','A1','BGM'];data.trackState||={};tracks.forEach(t=>data.trackState[t]||={locked:false,muted:false});
      const markerHtml=(data.markers||[]).map((m,i)=>`<button class="nle-marker" data-marker-index="${i}" style="left:${Number(m.t||0)*scale}px" title="${escapeAttr(m.label||'标记')} · ${Number(m.t||0).toFixed(2)}s"></button>`).join('');
      timelinePanel.innerHTML=`<div class="timeline-head"><b>${trimOnly?'视频剪辑':'Video Studio · 专业多轨时间轴'}</b><span>${escapeHtml(n.title)} · <i class="timeline-total-label">${total.toFixed(2)}s</i></span><div class="timeline-head-actions"><select id="tlResolution"><option>480p</option><option>720p</option><option>1080p</option><option>1440p</option></select><button id="closeTimeline">${uiIcon('close')}</button></div></div><div class="nle-commandbar"><button id="tlSplit" title="S">${uiIcon('split')}<span>分割</span><kbd>S</kbd></button><button id="tlMarker" title="M">${uiIcon('markers')}<span>标记</span><kbd>M</kbd></button><button id="tlDuplicate">${uiIcon('copy')}<span>副本</span></button><button id="tlRippleDelete">${uiIcon('trim')}<span>波纹删除</span></button><button id="tlTransition">${uiIcon('workflow')}<span>转场</span></button><button id="tlSubtitle">${uiIcon('subtitle')}<span>字幕</span></button><button id="tlGrade">${uiIcon('grade')}<span>调色</span></button><button id="tlAutomation">${uiIcon('automation')}<span>音量包络</span></button><button id="tlSnap" class="${data.snapEnabled?'active':''}">${uiIcon('snap')}<span>磁吸</span></button><span class="spacer"></span><span class="tl-zoom-label">时间轴缩放</span><button id="tlZoomOut">${uiIcon('zoomOut')}</button><button id="tlZoomReset">${Math.round(Number(data.zoom||1)*100)}%</button><button id="tlZoomIn">${uiIcon('zoomIn')}</button></div><div class="nle-main"><div class="nle-preview"><video id="timelinePreview" playsinline preload="metadata"></video><div id="timelineSubtitlePreview" class="timeline-subtitle-preview"></div><div class="nle-preview-empty">移动播放头预览镜头</div><div class="nle-transport"><button id="tlPrev" title="上一帧">${uiIcon('prev')}</button><button id="tlPlay">${uiIcon('play')}</button><button id="tlNext" title="下一帧">${uiIcon('next')}</button><span id="tlTime">0.00 / ${total.toFixed(2)}s</span></div></div><div class="nle-inspector">${sel?`<b>${escapeHtml(sel.title)}</b><label>轨道<select id="clipTrack">${tracks.map(t=>`<option ${t===sel.track?'selected':''}>${t}</option>`).join('')}</select></label><label>时间位置<input id="clipStart" type="number" step=".01" value="${Number(sel.start).toFixed(2)}"></label><label>素材入点<input id="clipIn" type="number" step=".01" value="${Number(sel.in).toFixed(2)}"></label><label>素材出点<input id="clipOut" type="number" step=".01" value="${Number(sel.out).toFixed(2)}"></label><label>速度<select id="clipSpeed">${[.25,.5,.75,1,1.25,1.5,2,4].map(v=>`<option value="${v}" ${Math.abs(Number(sel.speed||1)-v)<.001?'selected':''}>${v}×</option>`).join('')}</select></label>${sel.type==='audio'?`<label>音量<input id="clipVolume" type="range" min="0" max="2" step=".05" value="${Number(sel.volume??1)}"></label><button id="clipAutomation">${uiIcon('automation')}<span>音量关键帧 · ${(sel.volumeKeyframes||[]).length}</span></button>`:`<label>入场转场<select id="clipTransition"><option value="none">无</option><option value="fade">淡入</option><option value="dissolve">叠化</option><option value="slideleft">左侧滑入</option><option value="slideright">右侧滑入</option></select></label><label>转场时长<input id="clipTransitionDuration" type="number" min=".1" max="2" step=".05" value="${Number(sel.transitionDuration||.45).toFixed(2)}"></label>`}<label class="toggle-row"><input id="clipMuted" type="checkbox" ${sel.muted?'checked':''}>静音</label><button id="deleteClip" class="danger">${uiIcon('trash')}<span>删除素材</span></button>`:'<span>选择一个时间轴素材</span>'}</div></div><div class="nle-timeline-scroll"><div class="nle-timeline" style="width:${width}px"><div class="nle-ruler" id="nleRuler">${Array.from({length:Math.ceil(total*2)+1},(_,i)=>{const t=i/2;return `<i class="${i%2?'minor':''}" style="left:${t*scale}px"><span>${i%2?'':t+'s'}</span></i>`}).join('')}${markerHtml}<div id="nlePlayhead" class="nle-playhead" style="left:${Number(data.playhead||0)*scale}px"></div></div>${tracks.map(track=>{const ts=data.trackState[track];return `<div class="nle-track-row ${ts.locked?'locked':''} ${ts.muted?'muted':''}"><div class="nle-track-name"><b>${track}</b><span><button data-track-lock="${track}" title="锁定">${ts.locked?uiIcon('lock'):uiIcon('chevronDown')}</button><button data-track-mute="${track}" title="静音">${ts.muted?uiIcon('mute'):uiIcon('audio')}</button></span></div><div class="nle-track-lane" data-track="${track}" style="width:${width-70}px">${data.clips.filter(c=>c.track===track).map(c=>{const dur=clipTimelineDuration(c);return `<div class="nle-clip ${c.type} ${c.id===data.selectedClipId?'selected':''}" data-timeline-clip="${c.id}" style="left:${Number(c.start)*scale}px;width:${Math.max(42,dur*scale)}px"><i class="clip-handle left" data-handle="in"></i>${clipVisualHtml(c)}<b>${escapeHtml(c.title)}</b><span>${dur.toFixed(2)}s · ${Number(c.speed||1)}×${c.type==='video'&&c.transitionIn!=='none'?` · ${c.transitionIn}`:''}${c.type==='audio'&&(c.volumeKeyframes||[]).length?` · ${(c.volumeKeyframes||[]).length}KF`:''}</span><i class="clip-handle right" data-handle="out"></i></div>`}).join('')}</div></div>`}).join('')}${!trimOnly?`<div class="nle-track-row subtitle-track"><div class="nle-track-name"><b>SUB</b><span>字幕</span></div><div class="nle-track-lane subtitle-lane" style="width:${width-70}px">${(data.subtitles||[]).map(s=>`<button class="subtitle-clip" data-subtitle-id="${s.id}" style="left:${Number(s.start||0)*scale}px;width:${Math.max(34,(Number(s.end||0)-Number(s.start||0))*scale)}px">${escapeHtml(s.text)}</button>`).join('')}</div></div>`:''}</div></div><div class="timeline-controls"><span>Space 播放 · ←/→ 逐帧 · S 分割 · M 标记 · Delete 删除 · Shift 精确到 0.01s</span><span class="spacer"></span>${!trimOnly?`<button id="addTimelineMedia">${uiIcon('plus')}<span>添加已连接素材</span></button>`:''}<button id="timelineSave">${uiIcon('refresh')}<span>保存时间轴</span></button><button class="primary" id="timelineExport">${uiIcon('play')}<span>${trimOnly?'裁取片段':'渲染时间轴'}</span></button></div>`;
      timelinePanel.classList.remove('hidden');$('#tlResolution').value=data.resolution||'720p';$('#closeTimeline').onclick=close;
      const video=$('#timelinePreview'),empty=$('.nle-preview-empty',timelinePanel),ph=$('#nlePlayhead'),time=$('#tlTime');let playing=false,last=0;
      const previewAt=t=>{data.playhead=Math.max(0,Math.min(total,Number(t)||0));ph.style.left=(data.playhead*scale)+'px';time.textContent=`${data.playhead.toFixed(2)} / ${total.toFixed(2)}s`;video.style.filter=previewGradeFilter(data.grade);const sub=activeSubtitleAt(data,data.playhead),subEl=$('#timelineSubtitlePreview');if(subEl){subEl.textContent=sub?.text||'';subEl.style.display=sub?'block':'none';subEl.style.color=data.subtitleStyle?.color||'#fff';subEl.style.fontSize=Math.max(14,Number(data.subtitleStyle?.fontSize||42)*.52)+'px';subEl.style.bottom=Math.max(42,Number(data.subtitleStyle?.bottom||72)*.55)+'px'}const c=activeVideoClipAt(data.playhead,data.clips);if(c?.url){empty.style.display='none';const speed=Math.max(.1,Number(c.speed||1));if(video.dataset.clip!==c.id){video.dataset.clip=c.id;video.src=c.url;video.playbackRate=speed;video.load()}else video.playbackRate=speed;const target=Number(c.in)+(data.playhead-Number(c.start))*speed;if(Number.isFinite(video.duration)&&Math.abs(video.currentTime-target)>.1)try{video.currentTime=Math.max(0,target)}catch{}}else{empty.style.display='grid';video.pause();video.removeAttribute('src');video.dataset.clip=''}};
      const tick=ts=>{if(!playing)return;if(!last)last=ts;const dt=(ts-last)/1000;last=ts;previewAt(data.playhead+dt);if(data.playhead>=total){playing=false;$('#tlPlay').textContent='▶';video.pause();return}const c=activeVideoClipAt(data.playhead,data.clips);if(c?.url&&video.paused)video.play().catch(()=>{});raf=requestAnimationFrame(tick)};
      const togglePlay=()=>{playing=!playing;$('#tlPlay').textContent=playing?'❚❚':'▶';last=0;if(playing)raf=requestAnimationFrame(tick);else video.pause()};$('#tlPlay').onclick=togglePlay;const frame=1/Math.max(1,Number(data.fps||30));$('#tlPrev').onclick=()=>previewAt(data.playhead-frame);$('#tlNext').onclick=()=>previewAt(data.playhead+frame);$('#nleRuler').onpointerdown=e=>{if(e.target.closest('.nle-marker'))return;const r=$('#nleRuler').getBoundingClientRect();previewAt((e.clientX-r.left)/scale)};previewAt(data.playhead||0);
      const selected=()=>data.clips.find(c=>c.id===data.selectedClipId);const split=()=>{const c=selected();if(!c)return showToast('先选择素材');if(splitTimelineClip(data,c,data.playhead)){data.duration=timelineDuration(data.clips);saveState();renderTl()}else showToast('播放头需要位于素材内部')};$('#tlSplit').onclick=split;$('#tlMarker').onclick=()=>{data.markers.push({id:uid('mark'),t:Number(data.playhead||0),label:`标记 ${data.markers.length+1}`});saveState();renderTl()};$('#tlDuplicate').onclick=()=>{const c=selected();if(!c)return;const cp={...c,id:uid('clip'),start:Number(c.start)+clipTimelineDuration(c)+.1,title:c.title.replace(/ · 副本 \d+$/,'')+` · 副本 ${data.clips.filter(x=>x.nodeId===c.nodeId).length}`};data.clips.push(cp);data.selectedClipId=cp.id;saveState();renderTl()};$('#tlRippleDelete').onclick=()=>{const c=selected();if(!c)return;rippleDeleteClip(data,c);saveState();renderTl()};$('#tlSnap').onclick=()=>{data.snapEnabled=!data.snapEnabled;saveState();renderTl()};$('#tlZoomOut').onclick=()=>{data.zoom=Math.max(.5,Number(data.zoom||1)/1.25);renderTl()};$('#tlZoomIn').onclick=()=>{data.zoom=Math.min(3,Number(data.zoom||1)*1.25);renderTl()};$('#tlZoomReset').onclick=()=>{data.zoom=1;renderTl()};if($('#tlTransition'))$('#tlTransition').onclick=()=>openTimelineTransitionEditor(data,selected(),renderTl);if($('#tlSubtitle'))$('#tlSubtitle').onclick=()=>openTimelineSubtitleEditor(data,renderTl);if($('#tlGrade'))$('#tlGrade').onclick=()=>openTimelineGradeEditor(data,renderTl);if($('#tlAutomation'))$('#tlAutomation').onclick=()=>openVolumeAutomationEditor(data,selected(),renderTl);$$('[data-subtitle-id]',timelinePanel).forEach(b=>b.onclick=()=>openTimelineSubtitleEditor(data,renderTl,b.dataset.subtitleId));
      $$('[data-marker-index]',timelinePanel).forEach(b=>{b.onclick=e=>{e.stopPropagation();const i=Number(b.dataset.markerIndex);previewAt(data.markers[i]?.t||0)};b.oncontextmenu=e=>{e.preventDefault();data.markers.splice(Number(b.dataset.markerIndex),1);saveState();renderTl()}});$$('[data-track-lock]',timelinePanel).forEach(b=>b.onclick=()=>{const t=b.dataset.trackLock;data.trackState[t].locked=!data.trackState[t].locked;saveState();renderTl()});$$('[data-track-mute]',timelinePanel).forEach(b=>b.onclick=()=>{const t=b.dataset.trackMute;data.trackState[t].muted=!data.trackState[t].muted;saveState();renderTl()});
      $$('.nle-track-lane',timelinePanel).forEach(lane=>{lane.ondragover=e=>e.preventDefault();lane.ondrop=e=>{e.preventDefault();if(data.trackState[lane.dataset.track]?.locked)return showToast(`${lane.dataset.track} 已锁定`);const id=e.dataTransfer.getData('text/node-id');const node=state.nodes.find(x=>x.id===id);if(node&&['video','audio'].includes(node.type)){const r=lane.getBoundingClientRect(),c=timelineClipFromNode(node,Math.max(0,(e.clientX-r.left)/scale),lane.dataset.track);data.clips.push(c);data.selectedClipId=c.id;saveState();renderTl()}};data.clips.filter(c=>c.track===lane.dataset.track).forEach(c=>bindTimelineClipDrag(lane,c,data,scale,renderTl))});
      if(sel){const bind=()=>{if(data.trackState?.[sel.track]?.locked)return showToast(`${sel.track} 已锁定`);sel.track=$('#clipTrack').value;sel.start=Math.max(0,Number($('#clipStart').value));sel.in=Math.max(0,Number($('#clipIn').value));sel.out=Math.max(sel.in+.05,Number($('#clipOut').value));sel.speed=Math.max(.1,Number($('#clipSpeed').value||1));if($('#clipVolume'))sel.volume=Number($('#clipVolume').value);if($('#clipTransition'))sel.transitionIn=$('#clipTransition').value;if($('#clipTransitionDuration'))sel.transitionDuration=Number($('#clipTransitionDuration').value||.45);sel.muted=$('#clipMuted').checked;data.duration=timelineDuration(data.clips);saveState();renderTl()};if($('#clipTransition'))$('#clipTransition').value=sel.transitionIn||'none';$$('#clipTrack,#clipStart,#clipIn,#clipOut,#clipSpeed,#clipMuted,#clipVolume,#clipTransition,#clipTransitionDuration',timelinePanel).forEach(x=>x.onchange=bind);if($('#clipAutomation'))$('#clipAutomation').onclick=()=>openVolumeAutomationEditor(data,sel,renderTl);$('#deleteClip').onclick=()=>{data.clips=data.clips.filter(c=>c.id!==sel.id);data.selectedClipId=data.clips[0]?.id||'';saveState();renderTl()}}
      if($('#addTimelineMedia'))$('#addTimelineMedia').onclick=()=>showToast('把视频/音频节点连接到当前节点，或直接拖素材节点到轨道');$('#timelineSave').onclick=()=>{if(!trimOnly)n.timelineData=data;saveState();showToast('时间轴已保存')};
      $('#timelineExport').onclick=async()=>{if(!data.clips.length)return showToast('时间轴没有素材');const clips=data.clips.map(c=>({...c,muted:c.muted||data.trackState?.[c.track]?.muted,url:c.url||state.nodes.find(x=>x.id===c.nodeId)?.outputUrl||''}));if(clips.every(c=>/^\/media\//.test(c.url))){try{showToast('FFmpeg 正在渲染专业时间轴…');const result=await localMediaProcess(n,'video-compose-timeline',{clips,resolution:$('#tlResolution').value,duration:timelineDuration(clips),markers:data.markers,subtitles:data.subtitles||[],subtitleStyle:data.subtitleStyle||{},grade:data.grade||{}});if(result.outputs?.[0]){makeLocalResultNode(n,result.outputs[0],trimOnly?'裁取片段':'时间轴合成结果',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips});close();showToast('时间轴渲染完成');return}}catch(e){showToast('本地时间轴渲染失败：'+e.message)}}if(trimOnly&&canLocalProcess(n)){const c=clips[0];try{const result=await localMediaProcess(n,'video-trim',{in:c.in,out:c.out});if(result.outputs?.[0]){makeLocalResultNode(n,result.outputs[0],'裁取片段',{operation:'视频剪辑',in:c.in,out:c.out});close();return}}catch(e){showToast(e.message)}}const out=createDerivedNode(n,'video',trimOnly?'裁取片段':'视频合成结果','根据专业多轨时间轴渲染并输出',{operation:trimOnly?'视频剪辑':'视频合成',timeline:clips,resolution:$('#tlResolution').value},520);out.timelineData={...data,clips};out.duration=timelineDuration(clips);close();saveState();render();showToast('已创建第三方时间轴处理任务')};
      keyHandler=e=>{if(!timelinePanel||timelinePanel.classList.contains('hidden')||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||''))return;if(e.code==='Space'){e.preventDefault();togglePlay()}else if(e.key==='ArrowLeft'){e.preventDefault();previewAt(data.playhead-frame)}else if(e.key==='ArrowRight'){e.preventDefault();previewAt(data.playhead+frame)}else if(e.key.toLowerCase()==='s'){e.preventDefault();split()}else if(e.key.toLowerCase()==='m'){e.preventDefault();$('#tlMarker').click()}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();$('#tlDuplicate').click()}else if(e.key==='Delete'||e.key==='Backspace'){const c=selected();if(c){e.preventDefault();data.clips=data.clips.filter(x=>x.id!==c.id);data.selectedClipId=data.clips[0]?.id||'';saveState();renderTl()}}};window.addEventListener('keydown',keyHandler,true);
    };renderTl();
  }

  function openVideoTrim(n){openTimelineEditor(n,{trimOnly:true});}

  function connectedMedia(n){const ids=new Set([n.id]);state.edges.forEach(e=>{if(e.source===n.id)ids.add(e.target);if(e.target===n.id)ids.add(e.source)});return state.nodes.filter(x=>ids.has(x.id)&&['video','audio'].includes(x.type));}

  function openVideoComposer(n){openTimelineEditor(n,{trimOnly:false});}

  function openVisualContinue(n){
    const duration=Math.max(.1,Number(n.duration||15));modalShell('智能续写',`<div class="video-range-editor"><video id="continueVideo" src="${escapeAttr(n.outputUrl||'')}" controls playsinline></video><div class="range-ruler"><i id="continueMarker" style="left:${Math.min(1,5/duration)*100}%"></i></div></div><div class="feature-grid">${rangeField('续写起点（秒）','continueAt',0,duration,Math.min(5,duration),.01)}${field('续写时长',`<select id="continueDuration"><option>4</option><option>5</option><option>10</option><option>15</option></select>`)}${field('后续内容描述',`<textarea id="continuePrompt" rows="5" placeholder="延续人物、场景和风格，描述后续发生什么"></textarea>`,true)}</div><div class="feature-actions"><button id="continueRefs">＋ 添加参考素材</button><button class="primary" id="runContinue">发送到生成器</button></div>`,{wide:true});bindRanges();const v=$('#continueVideo');$('#continueAt').oninput=e=>{const t=Number(e.target.value);$('#continueMarker').style.left=(t/duration*100)+'%';if(v&&Number.isFinite(v.duration))v.currentTime=t};if(v)v.ontimeupdate=()=>{if(document.activeElement!==$('#continueAt')){$('#continueAt').value=Math.min(duration,v.currentTime);$('#continueMarker').style.left=(Math.min(duration,v.currentTime)/duration*100)+'%'}};$('#continueRefs').onclick=()=>{closeFeatureModal();openReferencePicker(n)};$('#runContinue').onclick=()=>sendToolToGenerator(n,'智能续写',$('#continuePrompt').value,{startTime:Number($('#continueAt').value),duration:Number($('#continueDuration').value),visualSelection:true},'video');
  }

  function openReshoot(n){
    const duration=Math.max(.1,Number(n.duration||15)),segments=[{id:uid('seg'),start:Math.min(2,duration*.2),end:Math.min(4.5,duration*.45),prompt:'修改这一段的动作，其他内容保持一致'}];
    const renderSegments=()=>{modalShell('片段重拍',`<div class="video-range-editor"><video id="reshootVideo" src="${escapeAttr(n.outputUrl||'')}" controls playsinline></video><div class="reshoot-visual-ruler" id="reshootVisualRuler">${segments.map(s=>`<div class="reshoot-overlay" data-seg-overlay="${s.id}" style="left:${s.start/duration*100}%;width:${Math.max(.4,(s.end-s.start)/duration*100)}%"><i data-edge="start"></i><b>${s.start.toFixed(2)}–${s.end.toFixed(2)}</b><i data-edge="end"></i></div>`).join('')}</div></div><div id="reshootSegments" class="reshoot-segments">${segments.map(s=>`<div class="segment-row" data-segment="${s.id}">${field('开始',`<input class="seg-start" type="number" step="0.01" min="0" max="${duration}" value="${s.start.toFixed(2)}">`)}${field('结束',`<input class="seg-end" type="number" step="0.01" min="0" max="${duration}" value="${s.end.toFixed(2)}">`)}${field('重拍描述',`<input class="seg-prompt" value="${escapeAttr(s.prompt)}">`,true)}<button class="segment-delete">删除</button></div>`).join('')}</div><div class="feature-actions"><button id="addSegment">＋ 添加片段</button><button id="reshootRefs">＋ 参考素材</button><button class="primary" id="runReshoot">发送到生成器</button></div>`,{wide:true});
      $$('.segment-row',featureModal).forEach(row=>{const s=segments.find(x=>x.id===row.dataset.segment);const sync=()=>{s.start=Math.max(0,Math.min(duration,Number($('.seg-start',row).value)));s.end=Math.max(s.start+.01,Math.min(duration,Number($('.seg-end',row).value)));s.prompt=$('.seg-prompt',row).value;const ov=$(`[data-seg-overlay="${s.id}"]`,featureModal);if(ov){ov.style.left=s.start/duration*100+'%';ov.style.width=(s.end-s.start)/duration*100+'%';$('b',ov).textContent=`${s.start.toFixed(2)}–${s.end.toFixed(2)}`}};$$('input',row).forEach(x=>x.oninput=sync);$('.segment-delete',row).onclick=()=>{segments.splice(segments.indexOf(s),1);renderSegments()}});
      $$('.reshoot-overlay',featureModal).forEach(ov=>{const s=segments.find(x=>x.id===ov.dataset.segOverlay);ov.onpointerdown=e=>{if(e.target.dataset.edge)return;const r=$('#reshootVisualRuler').getBoundingClientRect(),sx=e.clientX,os=s.start,oe=s.end;const move=ev=>{const dt=(ev.clientX-sx)/r.width*duration;s.start=Math.max(0,Math.min(duration-(oe-os),os+dt));s.end=s.start+(oe-os);ov.style.left=s.start/duration*100+'%'};const up=()=>{document.removeEventListener('pointermove',move);renderSegments()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true})};$$('[data-edge]',ov).forEach(h=>h.onpointerdown=e=>{e.stopPropagation();const edge=h.dataset.edge,r=$('#reshootVisualRuler').getBoundingClientRect();const move=ev=>{const t=Math.max(0,Math.min(duration,(ev.clientX-r.left)/r.width*duration));if(edge==='start')s.start=Math.min(s.end-.01,t);else s.end=Math.max(s.start+.01,t)};const up=()=>{document.removeEventListener('pointermove',move);renderSegments()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true})})});
      $('#addSegment').onclick=()=>{const start=Math.min(duration-.1,segments.at(-1)?.end||0);segments.push({id:uid('seg'),start,end:Math.min(duration,start+Math.min(2,duration-start)),prompt:'重新表演这一段'});renderSegments()};$('#reshootRefs').onclick=()=>{closeFeatureModal();openReferencePicker(n)};$('#runReshoot').onclick=()=>sendToolToGenerator(n,'片段重拍','按照时间段分别重拍，未选中片段保持原视频不变',{segments:segments.map(({id,...x})=>x),visualTimeline:true},'video');
    };renderSegments();
  }

  function openVideoGeneratorTool(tool,n){
    if(tool==='主体库') return openSubjectLibrary(n);
    if(tool==='运镜预设'){
      const motions=['缓慢推近','缓慢拉远','左横移','右横移','环绕主体','低机位升起','高空俯冲','手持跟拍','摇镜展示','甩镜转场','轨道跟随','固定机位'];modalShell('运镜控制',`<div class="motion-grid">${motions.map(m=>`<button data-motion="${m}">★ ${m}</button>`).join('')}</div>${field('自定义运镜',`<input id="customMotion" placeholder="描述镜头如何移动">`,true)}<div class="feature-actions"><button class="primary" id="applyMotion">应用</button></div>`);$$('[data-motion]',featureModal).forEach(b=>b.onclick=()=>{n.toolParams.cameraMotion=b.dataset.motion;n.prompt=((n.prompt||'')+`，${b.dataset.motion}`).replace(/^，/,'');saveState();closeFeatureModal();renderGenerator()});$('#applyMotion').onclick=()=>{n.toolParams.cameraMotion=$('#customMotion').value;n.prompt=((n.prompt||'')+`，${$('#customMotion').value}`).replace(/^，/,'');saveState();closeFeatureModal();renderGenerator()};return;
    }
    if(tool==='首尾帧'){
      modalShell('首尾帧',`<div class="reference-list large">${state.nodes.filter(x=>x.type==='image').map(x=>`<label><input type="radio" name="firstFrame" value="${x.id}"><span>首帧</span><b>${escapeHtml(x.title)}</b></label><label><input type="radio" name="lastFrame" value="${x.id}"><span>尾帧</span><b>${escapeHtml(x.title)}</b></label>`).join('')}</div><div class="feature-actions"><button class="primary" id="applyFrames">应用</button></div>`);$('#applyFrames').onclick=()=>{n.toolParams.firstFrame=$('input[name="firstFrame"]:checked',featureModal)?.value||'';n.toolParams.lastFrame=$('input[name="lastFrame"]:checked',featureModal)?.value||'';saveState();closeFeatureModal();renderGenerator();showToast('首尾帧已绑定')};return;
    }
    if(tool==='全能参考') return openReferencePicker(n);
  }
  function subjectNodeRefs(subject){return (subject.nodeIds||[]).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);}
  function openSubjectLibrary(targetNode){
    const subjects=state.subjects||[];modalShell('主体库 · 一致性资产',`<div class="subject-library-layout"><div class="subject-library-list">${subjects.map(s=>`<button data-subject-card="${s.id}" class="subject-library-card"><div class="subject-thumb" style="${s.coverUrl?`background-image:url('${escapeAttr(s.coverUrl)}')`:''}"></div><div><b>${escapeHtml(s.name)}</b><span>${escapeHtml(s.type||'角色')} · ${(s.nodeIds||[]).length} 个参考</span><small>${escapeHtml(s.desc||'')}</small></div></button>`).join('')||'<div class="feature-empty">还没有主体。用 2-3 张不同视角图片或一段连续视频创建。</div>'}</div><aside class="subject-create"><h3>创建新主体</h3><label>主体名称<input id="subjectName" placeholder="例如：女主苏晚 / 香水瓶"></label><label>类型<select id="subjectType"><option>角色</option><option>人物</option><option>商品</option><option>宠物</option><option>物体</option></select></label><label>描述<textarea id="subjectDesc" rows="4" placeholder="外形、服装、材质、不可改变的识别特征"></textarea></label><div class="subject-ref-pick"><b>参考图片 / 视频</b>${state.nodes.filter(x=>['image','video'].includes(x.type)&&x.id!==targetNode.id).map(x=>`<label><input type="checkbox" data-subject-ref="${x.id}" ${x.id===targetNode.id?'checked':''}><span>${labelForType(x.type)}</span>${escapeHtml(x.title)}</label>`).join('')}</div><label>音色 / 声音参考<select id="subjectVoice"><option value="">不绑定</option>${state.nodes.filter(x=>x.type==='audio').map(x=>`<option value="${x.id}">${escapeHtml(x.title)}</option>`).join('')}</select></label><button id="createSubject" class="primary">创建主体</button></aside></div>`,{wide:true});
    $$('[data-subject-card]',featureModal).forEach(b=>b.onclick=()=>{const sub=subjects.find(x=>x.id===b.dataset.subjectCard);if(!sub)return;modalShell('主体 · '+sub.name,`<div class="subject-detail"><div class="subject-detail-head"><div class="subject-thumb large" style="${sub.coverUrl?`background-image:url('${escapeAttr(sub.coverUrl)}')`:''}"></div><div><h3>${escapeHtml(sub.name)}</h3><p>${escapeHtml(sub.desc||'')}</p><span>${escapeHtml(sub.type||'角色')} · ${(sub.nodeIds||[]).length} 个参考素材</span></div></div><div class="reference-list large">${subjectNodeRefs(sub).map(x=>`<div class="drawer-row"><b>${escapeHtml(x.title)}</b><span>${labelForType(x.type)}</span></div>`).join('')}</div><div class="feature-actions"><button id="deleteSubject" class="danger">删除主体</button><button id="editSubject">编辑描述</button><button id="useSubject" class="primary">用于当前生成器</button></div></div>`);$('#useSubject').onclick=()=>{targetNode.toolParams=targetNode.toolParams||{};targetNode.toolParams.subjectId=sub.id;targetNode.prompt=((targetNode.prompt||'')+` @${sub.name}`).trim();saveState();closeFeatureModal();renderGenerator();showToast('主体已绑定，参考素材会自动随任务发送')};$('#editSubject').onclick=()=>{const x=prompt('主体描述',sub.desc||'');if(x!=null){sub.desc=x;saveState();openSubjectLibrary(targetNode)}};$('#deleteSubject').onclick=()=>{if(confirm('删除这个主体？')){state.subjects=state.subjects.filter(x=>x.id!==sub.id);if(targetNode.toolParams?.subjectId===sub.id)delete targetNode.toolParams.subjectId;saveState();openSubjectLibrary(targetNode)}}});
    $('#createSubject').onclick=()=>{const name=$('#subjectName').value.trim();const refs=$$('[data-subject-ref]:checked',featureModal).map(x=>x.dataset.subjectRef);if(!name)return showToast('请输入主体名称');if(!refs.length&&targetNode.id)refs.push(targetNode.id);const voice=$('#subjectVoice').value;if(voice)refs.push(voice);const nodes=refs.map(id=>state.nodes.find(x=>x.id===id)).filter(Boolean),cover=nodes.find(x=>x.type==='image')?.outputUrl||'';const sub={id:uid('sub'),name,type:$('#subjectType').value,desc:$('#subjectDesc').value.trim(),nodeIds:[...new Set(refs)],voiceNodeId:voice,coverUrl:cover,createdAt:new Date().toISOString(),versions:[]};state.subjects.unshift(sub);saveState();openSubjectLibrary(targetNode);showToast('主体已创建，可跨模型/跨次复用')};
  }
  function createSubjectFromNode(n){openSubjectLibrary(n)}


  function openAudioTool(tool,n){
    if(tool==='截取'){
      modalShell('音频截取',`<div class="audio-tool-wave">${Array.from({length:100},(_,i)=>`<i style="height:${15+(i*23)%55}px"></i>`).join('')}</div><div class="feature-grid">${field('开始（秒）',`<input id="audioIn" type="number" step="0.01" value="0">`)}${field('结束（秒）',`<input id="audioOut" type="number" step="0.01" value="10">`)}</div><div class="feature-actions"><button class="primary" id="applyAudioTrim">创建片段</button></div>`);$('#applyAudioTrim').onclick=async()=>{const params={in:Number($('#audioIn').value),out:Number($('#audioOut').value)};if(canLocalProcess(n)){try{const result=await localMediaProcess(n,'audio-trim',params);if(result.outputs?.[0]){makeLocalResultNode(n,result.outputs[0],'音频截取',params);closeFeatureModal();showToast('音频已真实截取');return}}catch(e){showToast('本地截取失败：'+e.message)}}sendToolToGenerator(n,'音频截取','截取指定音频片段',params,'audio')};return;
    }
    if(tool==='变速'){
      modalShell('音频变速',`<div class="feature-grid">${rangeField('速度','audioSpeed',.25,2,1,.05)}${field('保持音高',`<select id="keepPitch"><option>是</option><option>否</option></select>`)}</div><div class="feature-actions"><button class="primary" id="applyAudioSpeed">创建变速版本</button></div>`);bindRanges();$('#applyAudioSpeed').onclick=async()=>{const params={speed:Number($('#audioSpeed').value),keepPitch:$('#keepPitch').value==='是'};if(canLocalProcess(n)){try{const result=await localMediaProcess(n,'audio-speed',params);if(result.outputs?.[0]){makeLocalResultNode(n,result.outputs[0],'音频变速',params);closeFeatureModal();showToast('音频已真实变速');return}}catch(e){showToast('本地变速失败：'+e.message)}}sendToolToGenerator(n,'音频变速','调整音频播放速度',params,'audio')};return;
    }
    if(tool==='切分'){
      modalShell('自定义切分',`${field('删除片段 / 切分点',`<textarea id="splitPoints" rows="6" placeholder="例如：删除 2.1-3.4s；在 5.0s、8.2s 切分"></textarea>`,true)}<div class="feature-actions"><button class="primary" id="applyAudioSplit">切分为多个节点</button></div>`);$('#applyAudioSplit').onclick=()=>{const count=Math.max(2,($('#splitPoints').value.match(/\d+(?:\.\d+)?/g)||[]).length);snapshot();const ids=[];for(let i=0;i<Math.min(6,count);i++){const a=createDerivedNode(n,'audio',`音频片段 ${i+1}`,'',{operation:'音频切分',segmentIndex:i},430+i*40);a.y=n.y+i*100;ids.push(a.id)}createGroup(ids,'音频切分','workflow');closeFeatureModal();saveState();render();};return;
    }
  }

  function createGroup(nodeIds,title='工作流组',kind='workflow',meta={}){
    const ids=[...new Set(nodeIds)].filter(id=>state.nodes.some(n=>n.id===id));if(ids.length<2)return null;snapshot('创建分组');const set=new Set(ids);state.groups=(state.groups||[]).map(g=>({...g,nodeIds:g.nodeIds.filter(id=>!set.has(id))})).filter(g=>g.nodeIds.length>1);const normalizedMeta={...(meta||{})};if(kind==='storyboard')normalizedMeta.storyboard={version:1,mode:'cinematic',concept:'',frameOrder:[...ids],updatedAt:new Date().toISOString(),...(normalizedMeta.storyboard||{})};const g={id:uid('g'),title,kind,nodeIds:ids,meta:normalizedMeta,collapsed:false,collapsedPos:null,locked:false,frozen:false};state.groups.push(g);if(kind==='storyboard')layoutStoryboardGroup(g,{save:false,render:false});selectedGroupId=g.id;state.selectedIds=ids;selectedId=ids[0]||null;saveState();render();showToast(`已创建${kind==='storyboard'?'分镜组':'工作流组'} · 节点仅属于一个组`);return g;
  }

  function ungroupSelection(){
    const g=selectedGroupId&&state.groups.find(x=>x.id===selectedGroupId);if(!g){showToast('请先点击组标题选中整个组');return}snapshot('解组');state.groups=state.groups.filter(x=>x.id!==g.id);selectedGroupId=null;saveState();render();showToast('已解组');
  }

  function scriptAssetCatalog(d){return [...(d.assets.characters||[]).map(a=>({...a,assetType:'character'})),...(d.assets.scenes||[]).map(a=>({...a,assetType:'scene'})),...(d.assets.props||[]).map(a=>({...a,assetType:'prop'}))];}
  function matchShotAssets(s,d){const cat=scriptAssetCatalog(d),text=[s.characters,s.scene,s.action,s.dialogue].filter(Boolean).join(' ');const explicit=Array.isArray(s.assetRefs)?s.assetRefs:[];const ids=new Set(explicit);cat.forEach(a=>{if(a.name&&text.includes(a.name))ids.add(a.id)});return [...ids].filter(id=>cat.some(a=>a.id===id));}
  function markScriptShotDirty(shot,reason='内容已修改'){const Core=globalThis.FuietScriptWorkflowCore;if(Core?.markShotDirty)return Core.markShotDirty(shot,reason);if(!shot)return;shot.promptDirty=true;shot.promptStatus='dirty';shot.dirtyReason=reason;shot.dirtyAt=new Date().toISOString()}
  function markScriptImpactedByAsset(d,assetId,reason='一致性资产已修改'){let count=0;(d.shots||[]).forEach(s=>{if(matchShotAssets(s,d).includes(assetId)){markScriptShotDirty(s,reason);count++}});return count}
  function scriptAssetImpactCount(d,assetId){return (d.shots||[]).filter(s=>matchShotAssets(s,d).includes(assetId)).length}
  function synthesizeScriptPrompts(n){
    const d=ensureScriptData(n),cat=scriptAssetCatalog(d),style=globalThis.FuietScriptWorkflowCore?.globalStyleText?.(d)||d.style||'';(d.shots||[]).forEach(s=>{s.assetRefs=matchShotAssets(s,d);const assets=s.assetRefs.map(id=>cat.find(a=>a.id===id)).filter(Boolean);const assetText=assets.map(a=>`@${a.name}（${a.prompt||'保持资产一致'}）`).join('；'),stateText=narrativeStatePrompt(n,s);const baseImage=s.baseImagePrompt||s.imagePrompt||'',baseVideo=s.baseVideoPrompt||s.videoPrompt||'';s.baseImagePrompt=s.baseImagePrompt||baseImage;s.baseVideoPrompt=s.baseVideoPrompt||baseVideo;s.imagePrompt=[style?`整体风格：${style}`:'',`景别：${s.shotSize}`,`画面：${s.action}`,s.scene?`场景：${s.scene}`:'',s.lighting?`光影氛围：${s.lighting}`:'',assetText?`一致性资产：${assetText}`:'',stateText,baseImage?`补充：${baseImage}`:''].filter(Boolean).join('。')+'。';s.videoPrompt=[`镜头画面：${s.action}`,s.cameraMovement?`运镜：${s.cameraMovement}`:'',s.dialogue?`对白/旁白：${s.dialogue}`:'',s.sound?`音效：${s.sound}`:'',assetText?`保持主体/场景/道具：${assets.map(a=>'@'+a.name).join('、')}`:'',style?`视觉风格：${style}`:'',stateText,baseVideo||'动作自然，镜头调度符合叙事',`目标时长约 ${Number(s.duration||3)} 秒`].filter(Boolean).join('。')+'。';s.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,s));globalThis.FuietScriptWorkflowCore?.markShotReady?.(s)||(()=>{s.promptDirty=false;s.promptStatus='ready';s.dirtyReason=''})();});d.finalized=true;d.finalizedAt=new Date().toISOString();d.workflow=d.workflow||{};d.workflow.stage='ready';d.workflow.promptsReady=true;d.workflow.updatedAt=new Date().toISOString();saveState();showToast('最终图像 / 视频提示词已按资产引用重新合成');
  }
  async function aiSynthesizeScriptPrompts(n){
    const d=ensureScriptData(n),pid=n.scriptProviderId,mid=n.scriptModelId,provider=providerById(pid),model=provider?.models?.find(x=>x.id===mid);if(!pid||!mid)return showToast('请先在「镜头信息」选择文本 API 供应商和模型');const payload={style:d.style,assets:d.assets,shots:d.shots.map(s=>({id:s.id,scene:s.scene,characters:s.characters,props:s.props,shotSize:s.shotSize,action:s.action,dialogue:s.dialogue,duration:s.duration,assetRefs:matchShotAssets(s,d),narrativeState:narrativeExpectedForShot(n,s)}))};const prompt=`你是专业 AI 影视提示词合成器。根据全局风格、资产一致性描述和每个镜头信息，为每个 shot 生成 imagePrompt 和 videoPrompt。必须只返回合法 JSON：{"shots":[{"id":"原shot id","imagePrompt":"...","videoPrompt":"..."}]}。要求：图像提示词包含构图、景别、人物动作、场景、光影和资产引用；视频提示词包含动作时间顺序、机位、运镜、对白/声音和时长，不改变剧本事实。素材引用用 @资产名 表达。输入：${JSON.stringify(payload)}`;try{showToast('AI 正在合成专业提示词…');const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:pid,modelId:mid,providerSnapshot:snapshotProviderForTask(provider),modelSnapshot:model,nodeType:'text',prompt,references:[],maxRetries:state.workflowSettings.maxRetries,parameters:{operation:'prompt_synthesis',responseFormat:'json_object'}})});const info=await waitTask(created.task.id);if(info?.status!=='succeeded')throw new Error(info?.error||'提示词合成失败');const parsed=extractStructuredJson(String(info.output?.value??info.output?.text??''));if(!Array.isArray(parsed?.shots))throw new Error('模型没有返回 shots JSON');parsed.shots.forEach(x=>{const shot=d.shots.find(s=>s.id===x.id)||d.shots[Number(x.no)-1];if(shot){const stateText=narrativeStatePrompt(n,shot);if(x.imagePrompt)shot.imagePrompt=[String(x.imagePrompt),stateText].filter(Boolean).join('。')+'。';if(x.videoPrompt)shot.videoPrompt=[String(x.videoPrompt),stateText].filter(Boolean).join('。')+'。';shot.narrativeFingerprint=narrativeStateFingerprint(narrativeExpectedForShot(n,shot));shot.promptDirty=false;shot.dirtyReason=''}});d.finalized=true;d.aiSynthesizedAt=new Date().toISOString();saveState();openScriptEditor(n,'prompts');showToast('AI 专业提示词已合成')}catch(e){showToast('AI 合成失败：'+e.message)}}

  function openScriptEditor(n,initialTab='shots',focusShotId=''){
    const d=ensureScriptData(n);let tab=initialTab.startsWith('batch')?'batch':initialTab;
    const renderEditor=()=>{
      const batchType=initialTab==='batch-video'?'video':'image';
      modalShell('Script Studio · 分镜故事板',`<div class="script-editor-shell"><div class="script-editor-tabs"><button data-script-tab="shots" class="${tab==='shots'?'active':''}">镜头信息</button><button data-script-tab="assets" class="${tab==='assets'?'active':''}">资产</button><button data-script-tab="state" class="${tab==='state'?'active':''}">剧情状态</button><button data-script-tab="prompts" class="${tab==='prompts'?'active':''}">最终提示词</button><button data-script-tab="batch" class="${tab==='batch'?'active':''}">批量生成</button><button id="scriptDashboardBtn" class="script-dashboard-tab">整集生产看板</button></div><div id="scriptEditorContent" class="script-editor-content"></div></div>`,{full:true});
      const c=$('#scriptEditorContent');
      if(tab==='shots') c.innerHTML=scriptShotsHtml(n,d);
      if(tab==='assets') c.innerHTML=scriptAssetsHtml(n,d);
      if(tab==='state') c.innerHTML=scriptNarrativeHtml(n,d);
      if(tab==='prompts') c.innerHTML=scriptPromptsHtml(n,d);
      if(tab==='batch') c.innerHTML=scriptBatchHtml(n,d,batchType);
      $$('[data-script-tab]',featureModal).forEach(b=>b.onclick=()=>{tab=b.dataset.scriptTab;renderEditor()});
      bindScriptTab(n,d,tab,renderEditor,batchType);$('#scriptDashboardBtn')?.addEventListener('click',()=>openEpisodeDashboard(n));if(tab==='shots'&&focusShotId)requestAnimationFrame(()=>{const row=featureModal.querySelector(`[data-shot-row="${CSS.escape(String(focusShotId))}"]`);if(row){row.classList.add('shot-focused');row.scrollIntoView({block:'center',behavior:'smooth'})}});if(tab==='state'&&focusShotId)requestAnimationFrame(()=>{const row=featureModal.querySelector(`[data-state-shot="${CSS.escape(String(focusShotId))}"]`);if(row){row.classList.add('shot-focused');row.scrollIntoView({block:'center',behavior:'smooth'})}});
    };renderEditor();
  }

  function scriptShotsHtml(n,d){return `<div class="script-top-actions"><div class="script-source">${field('剧本 / 故事',`<textarea id="scriptSource" rows="3" placeholder="输入完整剧本或故事梗概…">${escapeHtml(n.sourceText||'')}</textarea>`,true)}</div><div class="script-ai-config">${providerModelSelectHtml('text',n.scriptProviderId||'',n.scriptModelId||'','script')}</div><button id="aiBreakdownScript" class="primary">AI 拆解</button></div><div class="script-table-wrap"><table class="script-editor-table"><thead><tr><th>序号</th><th>标记</th><th>场景</th><th>角色</th><th>道具</th><th>景别</th><th>画面描述</th><th>光影氛围</th><th>对白 / 旁白</th><th>音效</th><th>运镜</th><th>时长</th><th>生产</th><th>顺序</th><th></th></tr></thead><tbody>${d.shots.map((s,i)=>`<tr data-shot-row="${s.id}"><td><span class="shot-drag">≡</span>${i+1}</td><td><input data-shot="color" type="color" value="${s.color||'#55616b'}"></td><td><input data-shot="scene" value="${escapeAttr(s.scene||'')}"></td><td><input data-shot="characters" value="${escapeAttr(s.characters||'')}"></td><td><input data-shot="props" value="${escapeAttr(s.props||'')}"></td><td><select data-shot="shotSize">${['大全景','全景','中景','近景','特写','极特写'].map(x=>`<option ${x===s.shotSize?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea data-shot="action">${escapeHtml(s.action||'')}</textarea></td><td><textarea data-shot="lighting">${escapeHtml(s.lighting||'')}</textarea></td><td><textarea data-shot="dialogue">${escapeHtml(s.dialogue||'')}</textarea></td><td><textarea data-shot="sound">${escapeHtml(s.sound||'')}</textarea></td><td><textarea data-shot="cameraMovement">${escapeHtml(s.cameraMovement||'')}</textarea></td><td><input data-shot="duration" type="number" min=".5" step=".5" value="${Number(s.duration||3)}"></td><td>${shotProductionCellHtml(n,s)}</td><td><button data-move-shot="up" data-shot-id="${s.id}">↑</button><button data-move-shot="down" data-shot-id="${s.id}">↓</button></td><td><button data-delete-shot="${s.id}">×</button></td></tr>`).join('')}</tbody></table></div><div class="script-bottom-actions"><button id="addShot">＋ 新增 shot</button><button id="synthesizePrompts">合成最终提示词</button><button id="scriptGoProduction" class="primary">进入分镜生产线 →</button><button id="scriptProductionDashboard">整集看板</button><button id="scriptContinuityAudit">连续性检查</button><span class="spacer"></span><button id="downloadScript">导出 JSON</button></div>`}
  function scriptAssetsHtml(n,d){
    const typeBlock=(key,label)=>`<section class="asset-block"><div class="asset-block-head"><b>${label}</b><small>修改后会自动标记受影响镜头</small><button data-add-script-asset="${key}">＋ 添加</button></div><div class="script-asset-grid">${(d.assets[key]||[]).map(a=>{const impact=scriptAssetImpactCount(d,a.id),dirty=(d.shots||[]).some(s=>s.promptDirty&&matchShotAssets(s,d).includes(a.id)),ctype=key==='characters'?'character':key==='scenes'?'scene':'',lock=ctype?projectAssetLockInfo(ctype,a.name):null,locked=Boolean(lock);return `<article class="${dirty?'asset-dirty ':''}${locked?'asset-project-locked':''}" data-script-asset-card="${a.id}"><div class="asset-preview" style="${a.mediaUrl?`background-image:url('${escapeAttr(a.mediaUrl)}');background-size:cover;background-position:center`:`background:${themeBg(key==='characters'?'portrait':key==='scenes'?'city':'forest')}`}">${locked?'<span class="asset-global-lock">🔒 全剧标准</span>':''}</div><input data-asset-name value="${escapeAttr(a.name)}" ${locked?'disabled':''}><textarea data-asset-prompt rows="4" ${locked?'disabled':''}>${escapeHtml(a.prompt||'')}</textarea><small>${(a.versions||[]).length} 个生成版本${a.mediaUrl?' · 已绑定参考图':''}${locked?' · 全剧锁定':''}</small><span class="asset-impact">影响 ${impact} 个镜头${dirty?' · 提示词待同步':''}</span><div>${locked?`<button data-open-project-consistency="${escapeAttr(lock.key)}">查看全剧标准</button>`:`<button data-generate-asset="${a.id}" data-asset-type="${key}">生成资产图</button><button data-bind-asset="${a.id}" data-asset-type="${key}">绑定画布图</button><button data-delete-asset="${a.id}" data-asset-type="${key}">删除</button>`}</div></article>`}).join('')||'<div class="feature-empty">暂无资产</div>'}</div></section>`;
    const dirtyCount=(d.shots||[]).filter(s=>s.promptDirty).length,lockedCount=[...(d.assets.characters||[]).map(a=>projectAssetLockInfo('character',a.name)),...(d.assets.scenes||[]).map(a=>projectAssetLockInfo('scene',a.name))].filter(Boolean).length;return `<div class="script-asset-toolbar"><span>角色、场景、道具资产会通过 @ 自动同步到相关 shot。${dirtyCount?`<span class="script-impact-note">${dirtyCount} 个镜头待同步</span>`:'<span class="script-impact-note clean">提示词已同步</span>'}${lockedCount?`<span class="script-impact-note locked">${lockedCount} 个资产由全剧标准锁定</span>`:''}</span><div class="asset-provider-pick">${providerModelSelectHtml('image',n.assetProviderId||'',n.assetModelId||'','assetGen')}</div><button id="openProjectConsistencyFromAssets">全剧一致性</button><button id="generateAllAssets" class="primary">一键创建资产生成器</button></div>${typeBlock('characters','角色')}${typeBlock('scenes','场景')}${typeBlock('props','道具')}`
  }

  function scriptPromptsHtml(n,d){const dirtyCount=(d.shots||[]).filter(s=>s.promptDirty).length,style=d.globalStyle?.text??d.style??'';return `<div class="prompt-compose-head"><div><b>最终提示词</b><span>综合当前 shot、角色 / 场景 / 道具与全局风格。${dirtyCount?` <span class="script-impact-note">${dirtyCount} 个镜头需要重新合成</span>`:' <span class="script-impact-note clean">全部已同步</span>'}</span></div><label>全局风格 <input id="scriptStyle" value="${escapeAttr(style)}"></label><button id="synthesizeAgain">规则合成</button><button id="aiSynthesizePrompts" class="primary">AI 专业合成</button></div><div class="final-prompt-list">${d.shots.map(s=>`<article class="${s.promptDirty?'dirty':''}" data-final-shot="${s.id}"><header><b>Shot ${s.no}</b><span>${escapeHtml(s.shotSize)} · ${Number(s.duration)}s${s.promptDirty?`<i class="dirty-badge">${escapeHtml(s.dirtyReason||'待同步')}</i>`:''}</span></header><label>图像提示词<textarea data-final-image rows="4">${escapeHtml(s.imagePrompt||'')}</textarea></label><label>视频提示词<textarea data-final-video rows="4">${escapeHtml(s.videoPrompt||'')}</textarea></label></article>`).join('')}</div>`}
  function providerModelSelectHtml(modality,pid,mid,prefix){const eligible=providers.filter(p=>(p.models||[]).some(m=>m.enabled!==false&&normalizeClientModality(m.modality)===normalizeClientModality(modality)&&modelRuntimeReady(p,m)));const p=(providerById(pid)&&eligible.find(x=>x.id===pid))||eligible[0];const models=(p?.models||[]).filter(m=>m.enabled!==false&&normalizeClientModality(m.modality)===normalizeClientModality(modality)&&modelRuntimeReady(p,m));return `<select id="${prefix}Provider"><option value="">选择 API 供应商</option>${eligible.map(x=>`<option value="${x.id}" ${x.id===(p?.id||pid)?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select><select id="${prefix}Model"><option value="">选择模型</option>${models.map(m=>`<option value="${m.id}" ${m.id===mid?'selected':''}>${escapeHtml(m.name||m.id)}</option>`).join('')}</select>`}
  function scriptBatchHtml(n,d,defaultType){const type=defaultType||'image';return `<div class="batch-panel"><div class="batch-flow-banner"><div><b>脚本 → 生成器组 → 人工确认 → 整组执行</b><span>这里仅创建已填好提示词、资产引用和模型参数的普通生成节点，不会立即调用付费 API。</span></div></div><div class="batch-config"><label>生成类型<select id="batchType"><option value="image" ${type==='image'?'selected':''}>批量生分镜图</option><option value="video" ${type==='video'?'selected':''}>批量生视频</option></select></label><div id="batchProviderModels">${providerModelSelectHtml(type,n.batchProviderId||'',n.batchModelId||'','batch')}</div><label>画幅比<select id="batchRatio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option></select></label><label>队列优先级<select id="batchPriority"><option value="90">高 · 90</option><option value="50" selected>普通 · 50</option><option value="10">低 · 10</option></select></label><label>范围<select id="batchRange"><option>全部镜头</option><option>已勾选镜头</option></select></label></div><div class="batch-shot-list">${d.shots.map(s=>`<label><input type="checkbox" data-batch-shot="${s.id}" checked><span>Shot ${s.no}</span><b>${escapeHtml(s.action)}</b><small>${escapeHtml((type==='image'?s.imagePrompt:s.videoPrompt)||'尚未合成提示词')}</small></label>`).join('')}</div><div id="batchCostPreview" class="batch-cost-preview"></div><div class="feature-actions"><button id="batchCreateGroup" class="primary">确认并创建生成器组</button></div></div>`}
  function bindScriptTab(n,d,tab,rerender,batchType){
    if(tab==='shots'){
      const saveRows=()=>{$$('[data-shot-row]',featureModal).forEach(r=>{const s=d.shots.find(x=>x.id===r.dataset.shotRow);if(!s)return;$$('[data-shot]',r).forEach(x=>{const k=x.dataset.shot;s[k]=k==='duration'?Number(x.value):x.value})});n.sourceText=$('#scriptSource').value;saveState()};
      $$('[data-shot-row] input,[data-shot-row] textarea,[data-shot-row] select',featureModal).forEach(x=>x.onchange=()=>{const row=x.closest('[data-shot-row]'),shot=d.shots.find(s=>s.id===row?.dataset.shotRow);markScriptShotDirty(shot,'镜头信息已修改');d.finalized=false;saveRows()});
      $('#addShot').onclick=()=>{saveRows();d.shots.push({id:uid('shot'),no:d.shots.length+1,color:'#4e6570',scene:'',characters:'',props:'',shotSize:'中景',lighting:'',action:'',dialogue:'',sound:'',cameraMovement:'',duration:3,assetRefs:[],baseImagePrompt:'',baseVideoPrompt:'',imagePrompt:'',videoPrompt:'',promptStatus:'empty',promptDirty:false,outputs:{imageNodeIds:[],videoNodeIds:[],selectedImageNodeId:'',selectedVideoNodeId:''}});rerender()};
      $$('[data-delete-shot]',featureModal).forEach(b=>b.onclick=()=>{saveRows();d.shots=d.shots.filter(x=>x.id!==b.dataset.deleteShot);d.shots.forEach((x,i)=>x.no=i+1);rerender()});
      $$('[data-move-shot]',featureModal).forEach(b=>b.onclick=()=>{saveRows();const i=d.shots.findIndex(x=>x.id===b.dataset.shotId),j=b.dataset.moveShot==='up'?i-1:i+1;if(j>=0&&j<d.shots.length){[d.shots[i],d.shots[j]]=[d.shots[j],d.shots[i]];d.shots.forEach((x,k)=>x.no=k+1);rerender()}});
      $('#synthesizePrompts').onclick=()=>{saveRows();synthesizeScriptPrompts(n);tab='prompts';rerender()};$('#scriptGoProduction').onclick=()=>{saveRows();if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(n);openScriptEditor(n,'batch-image')};$('#scriptProductionDashboard').onclick=()=>{saveRows();openEpisodeDashboard(n)};$('#scriptContinuityAudit').onclick=()=>{saveRows();openContinuityAudit(n)};$$('[data-shot-locate]',featureModal).forEach(b=>b.onclick=()=>{saveRows();focusShotProductionNode(n,b.dataset.shotLocate,b.dataset.shotType)});$$('[data-shot-regenerate]',featureModal).forEach(b=>b.onclick=async()=>{saveRows();await regenerateScriptShots(n,[b.dataset.shotRegenerate],b.dataset.shotType);openScriptEditor(n,'shots',b.dataset.shotRegenerate)});
      $('#downloadScript').onclick=()=>downloadJson(`${state.projectName}-script.json`,d);
      $('#scriptProvider').onchange=()=>{n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId='';saveRows();rerender()};
      $('#scriptModel').onchange=()=>{n.scriptModelId=$('#scriptModel').value;saveRows()};
      $('#aiBreakdownScript').onclick=()=>{saveRows();n.scriptProviderId=$('#scriptProvider').value;n.scriptModelId=$('#scriptModel').value;saveState();aiBreakdownScript(n)};
    }
    if(tab==='assets'){
      const saveAssets=()=>{$$('[data-script-asset-card]',featureModal).forEach(card=>{for(const key of ['characters','scenes','props']){const a=(d.assets[key]||[]).find(x=>x.id===card.dataset.scriptAssetCard);if(a){const ctype=key==='characters'?'character':key==='scenes'?'scene':'',locked=ctype&&projectAssetLockInfo(ctype,a.name);if(locked)continue;const nameEl=$('[data-asset-name]',card),promptEl=$('[data-asset-prompt]',card);if(!nameEl||!promptEl)continue;const nextName=nameEl.value,nextPrompt=promptEl.value,changed=nextName!==a.name||nextPrompt!==a.prompt;a.name=nextName;a.prompt=nextPrompt;if(changed){a.updatedAt=new Date().toISOString();a.revision=Number(a.revision||0)+1;markScriptImpactedByAsset(d,a.id,'资产描述已修改');d.finalized=false}}}});saveState()};
      $$('[data-script-asset-card] input,[data-script-asset-card] textarea',featureModal).forEach(x=>x.onchange=()=>{saveAssets();rerender()});
      $$('[data-add-script-asset]',featureModal).forEach(b=>b.onclick=()=>{saveAssets();d.assets[b.dataset.addScriptAsset].push({id:uid('asset'),name:'新'+({characters:'角色',scenes:'场景',props:'道具'}[b.dataset.addScriptAsset]),prompt:''});rerender()});
      $('#openProjectConsistencyFromAssets')?.addEventListener('click',()=>openProjectConsistencyCenter('all'));$$('[data-open-project-consistency]',featureModal).forEach(b=>b.onclick=()=>openProjectConsistencyCenter('all'));
      $$('[data-delete-asset]',featureModal).forEach(b=>b.onclick=()=>{saveAssets();const key=b.dataset.assetType,id=b.dataset.deleteAsset,a=d.assets[key].find(x=>x.id===id),ctype=key==='characters'?'character':key==='scenes'?'scene':'';if(ctype&&projectAssetLockInfo(ctype,a?.name))return showToast('该资产已被全剧锁定，请先在一致性中心解除锁定');(d.shots||[]).forEach(s=>{if((s.assetRefs||[]).includes(id))markScriptShotDirty(s,'引用资产已删除')});d.assets[key]=d.assets[key].filter(x=>x.id!==id);d.finalized=false;saveState();rerender()});
      $$('[data-generate-asset]',featureModal).forEach(b=>b.onclick=()=>{saveAssets();const key=b.dataset.assetType,a=d.assets[key].find(x=>x.id===b.dataset.generateAsset),ctype=key==='characters'?'character':key==='scenes'?'scene':'';if(ctype&&projectAssetLockInfo(ctype,a?.name))return showToast('该资产已被全剧锁定，请先在一致性中心解除锁定');createScriptAssetNode(n,a,key)});
      $('#assetGenProvider').onchange=()=>{n.assetProviderId=$('#assetGenProvider').value;n.assetModelId='';saveAssets();rerender()};$('#assetGenModel').onchange=()=>{n.assetModelId=$('#assetGenModel').value;saveAssets()};$$('[data-bind-asset]',featureModal).forEach(b=>b.onclick=()=>{saveAssets();const key=b.dataset.assetType,a=d.assets[key].find(x=>x.id===b.dataset.bindAsset),ctype=key==='characters'?'character':key==='scenes'?'scene':'';if(ctype&&projectAssetLockInfo(ctype,a?.name))return showToast('该资产已被全剧锁定，请先在一致性中心解除锁定');const imgs=state.nodes.filter(x=>x.type==='image'&&x.outputUrl);if(!imgs.length)return showToast('画布上没有可绑定的图片');const pick=prompt('输入要绑定的图片节点标题（可复制标题）',imgs[0].title);const img=imgs.find(x=>x.title===pick)||imgs[0];a.mediaUrl=img.outputUrl;a.nodeIds=[...new Set([...(a.nodeIds||[]),img.id])];a.versions=[{id:uid('ver'),url:img.outputUrl,createdAt:new Date().toISOString(),source:'canvas'},...(a.versions||[])];a.revision=Number(a.revision||0)+1;markScriptImpactedByAsset(d,a.id,'资产参考图已更新');d.finalized=false;saveState();rerender();showToast('资产参考图已绑定，相关镜头已标记待同步')});$('#generateAllAssets').onclick=()=>{saveAssets();n.assetProviderId=$('#assetGenProvider').value;n.assetModelId=$('#assetGenModel').value;const all=[...d.assets.characters.map(a=>[a,'characters']),...d.assets.scenes.map(a=>[a,'scenes']),...d.assets.props.map(a=>[a,'props'])];const ids=all.map(([a,t],i)=>createScriptAssetNode(n,a,t,i*34,false).id);createGroup(ids,'脚本资产组','workflow');saveState();render();showToast('资产生成器组已创建')};
    }
    if(tab==='state'){
      $('#openNarrativeCenterFromScript').onclick=()=>openNarrativeContinuityCenter('characters');$('#scriptNarrativeAudit').onclick=openNarrativeAuditReport;$$('[data-shot-state]',featureModal).forEach(b=>b.onclick=()=>openShotNarrativeState(n,b.dataset.shotState));
    }
    if(tab==='prompts'){
      $('#scriptStyle').onchange=()=>{const value=$('#scriptStyle').value;d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};if(value!==d.globalStyle.text){d.globalStyle.text=value;d.globalStyle.revision=Number(d.globalStyle.revision||0)+1;d.globalStyle.updatedAt=new Date().toISOString();d.style=value;(d.shots||[]).forEach(s=>markScriptShotDirty(s,'全局风格已修改'));d.finalized=false;saveState()}};$('#synthesizeAgain').onclick=()=>{d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=$('#scriptStyle').value;d.style=d.globalStyle.text;synthesizeScriptPrompts(n);rerender()};$('#aiSynthesizePrompts').onclick=()=>{d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=$('#scriptStyle').value;d.style=d.globalStyle.text;aiSynthesizeScriptPrompts(n)};$$('[data-final-shot]',featureModal).forEach(card=>{const s=d.shots.find(x=>x.id===card.dataset.finalShot);$('[data-final-image]',card).onchange=e=>{s.imagePrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()};$('[data-final-video]',card).onchange=e=>{s.videoPrompt=e.target.value;globalThis.FuietScriptWorkflowCore?.markShotReady?.(s);saveState()};});
    }
    if(tab==='batch'){
      $('#batchType').onchange=()=>{initialTab=$('#batchType').value==='video'?'batch-video':'batch-image';openScriptEditor(n,initialTab)};
      $('#batchProvider').onchange=()=>{n.batchProviderId=$('#batchProvider').value;n.batchModelId='';saveState();openScriptEditor(n,$('#batchType').value==='video'?'batch-video':'batch-image')};$('#batchModel').onchange=()=>{n.batchModelId=$('#batchModel').value;saveState();refreshCost()};
      const refreshCost=()=>{const type=$('#batchType').value,pid=$('#batchProvider').value,mid=$('#batchModel').value,model=providerById(pid)?.models?.find(m=>m.id===mid),pricing=model?.pricing||model?.capabilities?.pricing,shots=$$('[data-batch-shot]:checked',featureModal).map(x=>d.shots.find(s=>s.id===x.dataset.batchShot)).filter(Boolean);let total=0,known=Boolean(pricing);if(known){for(const shot of shots){total+=Number(pricing.perRequest||0);if(type==='image')total+=Number(pricing.perImage||0);else total+=Number(pricing.perSecond||0)*Number(shot.duration||3)}}$('#batchCostPreview').innerHTML=known?`预计费用：<b>${escapeHtml(pricing.currency||'USD')} ${total.toFixed(total<1?4:2)}</b> · ${shots.length} 个镜头 <small>最终以第三方供应商账单为准</small>`:`${shots.length} 个镜头 · <b>模型未配置价格，无法预估费用</b>`};$$('[data-batch-shot]',featureModal).forEach(x=>x.onchange=refreshCost);$('#batchPriority').value=String(n.batchPriority??state.workflowSettings?.defaultPriority??50);$('#batchPriority').onchange=()=>{n.batchPriority=Number($('#batchPriority').value);saveState()};$('#batchCreateGroup').onclick=()=>batchCreateFromScript(n,d,$('#batchType').value,{autoRun:false});refreshCost();
    }
  }

  function extractStructuredJson(text){
    const raw=String(text||'').trim();const candidates=[];const fenced=[...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1]);candidates.push(...fenced,raw);for(const x of candidates){try{return JSON.parse(x)}catch{}const firstObj=x.indexOf('{'),lastObj=x.lastIndexOf('}');if(firstObj>=0&&lastObj>firstObj)try{return JSON.parse(x.slice(firstObj,lastObj+1))}catch{}const firstArr=x.indexOf('['),lastArr=x.lastIndexOf(']');if(firstArr>=0&&lastArr>firstArr)try{return JSON.parse(x.slice(firstArr,lastArr+1))}catch{}}return null;
  }
  function normalizeScriptAsset(x,prefix){if(typeof x==='string')return{id:uid(prefix),name:x,prompt:'',mediaUrl:'',versions:[]};return{id:x?.id||uid(prefix),name:String(x?.name||x?.title||'未命名'),prompt:String(x?.prompt||x?.description||''),description:String(x?.description||''),mediaUrl:String(x?.mediaUrl||x?.referenceUrl||''),versions:Array.isArray(x?.versions)?x.versions:[]};}
  async function waitTask(taskId,loops=420){let info;for(let i=0;i<loops;i++){await new Promise(r=>setTimeout(r,700));info=(await apiJson('/api/tasks/'+taskId)).task;if(['succeeded','failed','canceled'].includes(info.status))break}return info;}
  async function aiBreakdownScript(n){
    if(!backendOnline){showToast('API 网关未连接');return}const pid=n.scriptProviderId,mid=n.scriptModelId;if(!pid||!mid){showToast('请选择文本 API 供应商与模型');return}
    const schema={style:'统一视觉风格',assets:{characters:[{name:'角色名',description:'身份外形服装',prompt:'用于一致性生成的视觉提示词'}],scenes:[{name:'场景名',description:'空间布局和光线',prompt:'场景一致性提示词'}],props:[{name:'道具名',description:'外观归属',prompt:'道具一致性提示词'}]},shots:[{scene:'场景名',characters:['角色名'],props:['道具名'],shotSize:'全景/中景/近景/特写',lighting:'光影与画面氛围',action:'可视化动作与调度',dialogue:'对白或旁白',sound:'环境音/音效',cameraMovement:'运镜方式',duration:3,imagePrompt:'只写本镜头额外图像信息',videoPrompt:'动作、声音额外信息'}]};
    const prompt=`你是影视分镜与资产拆解引擎。把用户剧本拆成可直接进入 AI 影视生产线的结构化 JSON。必须只返回一个合法 JSON 对象，不要 Markdown，不要解释。\n要求：1) 先抽取角色、场景、道具资产；2) 每个镜头引用明确资产名称；3) 镜头动作必须可视化；4) 时长为数字秒；5) 不要凭空增加重要人物；6) imagePrompt/videoPrompt 只写该镜头额外信息，统一资产由系统之后自动合成。\n严格结构示例：${JSON.stringify(schema)}\n\n用户剧本：\n${n.sourceText||''}`;
    showToast('正在用第三方文本模型结构化拆解剧本与资产…');try{const provider=providerById(pid),model=provider?.models?.find(x=>x.id===mid);const created=await apiJson('/api/tasks',{method:'POST',body:JSON.stringify({providerId:pid,modelId:mid,providerSnapshot:snapshotProviderForTask(provider),modelSnapshot:model,nodeType:'text',prompt,references:collectReferences(n.id),parameters:{operation:'script_breakdown',responseFormat:'json_object',schema}})});const info=await waitTask(created.task.id);if(info?.status!=='succeeded')throw new Error(errorText(info?.error)||'脚本拆解失败');const text=String(info.output?.value??info.output?.text??info.output?.url??'');applyScriptBreakdownText(n,text);closeFeatureModal();openScriptEditor(n,'shots');showToast('剧本、角色、场景、道具与镜头已结构化拆解');}catch(e){showToast('拆解失败：'+errorText(e))}
  }
  function applyScriptBreakdownText(n,text){
    const d=ensureScriptData(n),parsed=extractStructuredJson(text);let obj=parsed;if(Array.isArray(parsed))obj={shots:parsed};if(!obj||!Array.isArray(obj.shots)){const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(x=>x.length>4).slice(0,24);obj={assets:{characters:[],scenes:[],props:[]},shots:lines.map((x,i)=>({scene:'场景',characters:[],props:[],shotSize:['全景','中景','近景'][i%3],action:x,dialogue:'',duration:3,imagePrompt:'',videoPrompt:''}))};showToast('供应商没有返回合法 JSON，已使用安全降级拆分')}
    if(obj.style){d.globalStyle=d.globalStyle||{text:'',referenceNodeIds:[],referenceMediaUrls:[],revision:0,updatedAt:''};d.globalStyle.text=String(obj.style);d.globalStyle.revision=Number(d.globalStyle.revision||0)+1;d.globalStyle.updatedAt=new Date().toISOString();d.style=d.globalStyle.text;}const assets=obj.assets||{};d.assets={characters:(assets.characters||assets.roles||[]).map(x=>normalizeScriptAsset(x,'char')),scenes:(assets.scenes||[]).map(x=>normalizeScriptAsset(x,'scene')),props:(assets.props||assets.objects||[]).map(x=>normalizeScriptAsset(x,'prop'))};
    const nameMap=new Map(scriptAssetCatalog(d).map(a=>[a.name,a.id]));d.shots=obj.shots.map((x,i)=>{const names=[...(Array.isArray(x.characters)?x.characters:String(x.characters||'').split(/[、,，]/)),...(Array.isArray(x.props)?x.props:String(x.props||'').split(/[、,，]/)),x.scene].map(v=>String(v||'').trim()).filter(Boolean);return globalThis.FuietScriptWorkflowCore.normalizeShot({id:uid('shot'),no:i+1,color:['#486a63','#5b586e','#6f6248','#4b6070'][i%4],scene:String(x.scene||''),characters:Array.isArray(x.characters)?x.characters.join('、'):String(x.characters||''),props:Array.isArray(x.props)?x.props.join('、'):String(x.props||''),shotSize:String(x.shotSize||x.shot_size||'中景'),lighting:String(x.lighting||x.atmosphere||''),action:String(x.action||x.visual||x.description||''),dialogue:String(x.dialogue||x.voice||''),sound:String(x.sound||x.sfx||''),cameraMovement:String(x.cameraMovement||x.camera_movement||x.camera||''),duration:Math.max(.5,Number(x.duration||3)),baseImagePrompt:String(x.imagePrompt||x.image_prompt||''),baseVideoPrompt:String(x.videoPrompt||x.video_prompt||''),imagePrompt:String(x.imagePrompt||x.image_prompt||''),videoPrompt:String(x.videoPrompt||x.video_prompt||''),assetRefs:names.map(v=>nameMap.get(v)).filter(Boolean)},i,prefix=>uid(prefix));});d.finalized=false;synthesizeScriptPrompts(n);saveState();
  }

  function createScriptAssetNode(scriptNode,a,type,offset=0,select=true){const p=providerById(scriptNode.assetProviderId),m=p?.models?.find(x=>x.id===scriptNode.assetModelId&&x.modality==='image');const img={id:uid('n'),type:'image',x:scriptNode.x+520+offset,y:scriptNode.y+(type==='characters'?0:type==='scenes'?300:600),w:320,title:a.name||'脚本资产',content:'',outputUrl:a.mediaUrl||'',prompt:a.prompt||'',providerId:p?.id||'',modelId:m?.id||'',modelName:m?.name||'',toolParams:{operation:'script_asset',assetType:type,assetId:a.id,scriptNodeId:scriptNode.id}};state.nodes.push(img);state.edges.push({id:uid('e'),source:scriptNode.id,target:img.id,type:'script-asset'});(a.nodeIds||(a.nodeIds=[])).push(img.id);if(select)selectedId=img.id;saveState();render();return img}


  function scriptGenerationAssets(d,shot){const cat=scriptAssetCatalog(d);return (shot.assetRefs||matchShotAssets(shot,d)).map(id=>cat.find(a=>a.id===id)).filter(Boolean)}
  function scriptGenerationSnapshot(scriptNode,d,shot,type,config){return globalThis.FuietScriptWorkflowCore?.createGenerationSnapshot?.({scriptNodeId:scriptNode.id,shot,type,prompt:type==='image'?shot.imagePrompt:shot.videoPrompt,globalStyle:d.globalStyle||{text:d.style||'',revision:0},assets:scriptGenerationAssets(d,shot),providerId:config.providerId,modelId:config.modelId,parameters:{aspectRatio:config.aspectRatio||'16:9',duration:Number(shot.duration||3),priority:Number(config.priority||50)}})||null}
  function connectScriptShotAssetNodes(scriptNode,d,shot,node){const roleByType={character:'character_reference',scene:'scene_reference',prop:'image_reference'};for(const asset of scriptGenerationAssets(d,shot)){const source=[...(asset.nodeIds||[])].reverse().map(id=>state.nodes.find(n=>n.id===id&&n.type==='image')).find(Boolean);if(!source)continue;if(!state.edges.some(e=>e.source===source.id&&e.target===node.id))createEdge(source.id,node.id,{type:'asset',role:roleByType[asset.assetType||asset.type]||'image_reference',silent:true})}}
  function registerScriptShotOutput(shot,type,nodeId){globalThis.FuietScriptWorkflowCore?.registerShotOutput?.(shot,type,nodeId,{select:true})}

  function scriptProductionConfig(scriptNode,d,type){
    const prod=d.production?.[type]||{},pid=prod.providerId||scriptNode.batchProviderId||'',mid=prod.modelId||scriptNode.batchModelId||'',model=providerById(pid)?.models?.find(m=>m.id===mid);return{providerId:pid,modelId:mid,modelName:model?.name||mid,aspectRatio:prod.aspectRatio||'16:9',priority:Number(prod.priority??scriptNode.batchPriority??state.workflowSettings?.defaultPriority??50)};
  }
  function createScriptShotProductionNode(scriptNode,d,shot,type,config,index=0){
    const node={id:uid('n'),type,x:scriptNode.x+560+(index%4)*380,y:scriptNode.y+Math.floor(index/4)*320,w:340,title:`Shot ${shot.no} · ${type==='image'?'分镜图':'视频'}`,content:'',prompt:type==='image'?shot.imagePrompt:shot.videoPrompt,providerId:config.providerId,modelId:config.modelId,modelName:config.modelName,aspectRatio:config.aspectRatio||'16:9',duration:shot.duration,queuePriority:config.priority,toolParams:{operation:type==='image'?'script_batch_image':'script_batch_video',shotId:shot.id,scriptNodeId:scriptNode.id,autoFlow:false}};node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,config);state.nodes.push(node);createEdge(scriptNode.id,node.id,{type:'script',role:'script_context',silent:true});connectScriptShotAssetNodes(scriptNode,d,shot,node);if(type==='video'){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}registerScriptShotOutput(shot,type,node.id);return node;
  }
  async function regenerateScriptShots(scriptNode,shotIds,type){
    const d=ensureScriptData(scriptNode);if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(scriptNode);const config=scriptProductionConfig(scriptNode,d,type);if(!config.providerId||!config.modelId){showToast(`还没有保存${type==='video'?'视频':'图片'}生产模型，请先进入批量生成设置一次`);openScriptEditor(scriptNode,type==='video'?'batch-video':'batch-image');return []}snapshot(`重新生成部分 ${type==='video'?'视频':'分镜图'}`);const ids=[];for(const [i,shotId] of shotIds.entries()){const shot=d.shots.find(s=>s.id===shotId);if(!shot)continue;let node=latestShotProductionNode(scriptNode.id,shot.id,type);if(!node){node=createScriptShotProductionNode(scriptNode,d,shot,type,config,i);const prod=d.production?.[type];if(prod){prod.nodeIds=[...new Set([...(prod.nodeIds||[]),node.id])];const g=state.groups.find(x=>x.id===prod.groupId);if(g&&!g.nodeIds.includes(node.id))g.nodeIds.push(node.id)}}else{if(node.frozen){const ok=confirm(`Shot ${shot.no} 的${type==='video'?'视频':'分镜图'}已冻结。是否解除冻结并重新生成？`);if(!ok)continue;node.frozen=false}node.prompt=type==='image'?shot.imagePrompt:shot.videoPrompt;node.runCacheKey='';node.taskError='';node.taskStatus='';if(!node.providerId||!node.modelId){node.providerId=config.providerId;node.modelId=config.modelId;node.modelName=config.modelName}connectScriptShotAssetNodes(scriptNode,d,shot,node);node.generationSnapshot=scriptGenerationSnapshot(scriptNode,d,shot,type,{providerId:node.providerId,modelId:node.modelId,modelName:node.modelName,aspectRatio:node.aspectRatio||config.aspectRatio,priority:node.queuePriority??config.priority});registerScriptShotOutput(shot,type,node.id);if(type==='video'&&!state.edges.some(e=>e.target===node.id&&e.role==='first_frame')){const imageNode=latestShotProductionNode(scriptNode.id,shot.id,'image');if(imageNode)createEdge(imageNode.id,node.id,{type:'asset',role:'first_frame',silent:true})}}ids.push(node.id)}saveState();render();if(!ids.length)return[];showToast(`正在重新生成 ${ids.length} 个 ${type==='video'?'视频':'分镜图'}镜头`);await executeWorkflowIds(ids,{title:`部分 Shot 重新生成 · ${type==='video'?'视频':'分镜图'}`,force:true});return ids;
  }

  async function batchCreateFromScript(n,d,type,{autoRun=false}={}){if(!d.finalized||(d.shots||[]).some(s=>s.promptDirty))synthesizeScriptPrompts(n);const ids=$$('[data-batch-shot]:checked',featureModal).map(x=>x.dataset.batchShot),pid=$('#batchProvider').value,mid=$('#batchModel').value;if(!pid||!mid){showToast('请选择第三方 API 供应商与模型');return}const priority=Math.max(0,Math.min(100,Number($('#batchPriority')?.value??n.batchPriority??50))),model=providerById(pid)?.models?.find(m=>m.id===mid),config={providerId:pid,modelId:mid,modelName:model?.name||mid,aspectRatio:$('#batchRatio').value,priority};n.batchPriority=priority;n.batchProviderId=pid;n.batchModelId=mid;n.scriptAutoFlow=false;snapshot('脚本创建生成器组');const created=[],shotNodeMap={};ids.forEach((id,i)=>{const shot=d.shots.find(x=>x.id===id);if(!shot)return;const node=createScriptShotProductionNode(n,d,shot,type,config,i);created.push(node.id);shotNodeMap[shot.id]=node.id});const group=createGroup(created,type==='image'?'脚本分镜组':'分镜视频生成组',type==='image'?'storyboard':'workflow',{grid:created.length<=4?'2x2':created.length<=9?'3x3':'4x4',ratio:$('#batchRatio').value,scriptNodeId:n.id,shotNodeMap,autoFlow:false});d.production=d.production||{};d.production[type]={groupId:group?.id||'',nodeIds:created,createdAt:new Date().toISOString(),priority,providerId:pid,modelId:mid,aspectRatio:$('#batchRatio').value};saveState();render();if(type==='image')autoLayoutNodes(created,{direction:'LR',mode:'compact',fit:true});closeFeatureModal();showToast(`已创建 ${created.length} 个${type==='image'?'分镜图':'视频'}生成器，请检查后点击组上的“整组执行”`);return created}
  function downloadJson(name,data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

  function mat4Identity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
  function mat4Mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
  function mat4Translate(x,y,z){const m=mat4Identity();m[12]=x;m[13]=y;m[14]=z;return m}
  function mat4Scale(x,y,z){const m=mat4Identity();m[0]=x;m[5]=y;m[10]=z;return m}
  function mat4RotX(a){a=a*Math.PI/180;const c=Math.cos(a),q=Math.sin(a);return [1,0,0,0,0,c,q,0,0,-q,c,0,0,0,0,1]}
  function mat4RotY(a){a=a*Math.PI/180;const c=Math.cos(a),q=Math.sin(a);return [c,0,-q,0,0,1,0,0,q,0,c,0,0,0,0,1]}
  function mat4RotZ(a){a=a*Math.PI/180;const c=Math.cos(a),q=Math.sin(a);return [c,q,0,0,-q,c,0,0,0,0,1,0,0,0,0,1]}
  function mat4Perspective(fov,aspect,near=.1,far=200){const f=1/Math.tan(fov*Math.PI/360),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]}
  function v3Norm(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l)}
  function v3Cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function v3Sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
  function mat4LookAt(eye,target,up=[0,1,0]){const z=v3Norm(v3Sub(eye,target)),x=v3Norm(v3Cross(up,z)),y=v3Cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2],-y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2],-z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2],1]}
  function hexRgb(hex){const s=String(hex||'#aaaaaa').replace('#','');const n=parseInt(s.length===3?s.split('').map(c=>c+c).join(''):s,16)||0xaaaaaa;return[((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,1]}
  function directorCameraState(d){
    if(d.view==='camera'){
      const cam=d.objects.find(o=>o.type==='camera'&&o.id===d.selectedObjectId)||d.objects.find(o=>o.type==='camera');const eye=cam?[Number(cam.x),Number(cam.y)+1.2,Number(cam.z)]:[Number(d.camera.x||0),Number(d.camera.y||2.2),Number(d.camera.z||7)];const targetObj=d.objects.find(o=>o.id===d.camera.target);const target=targetObj?[targetObj.x,targetObj.y+1,targetObj.z]:[0,1,0];return{eye,target,fov:Number(d.camera.fov||50)};
    }
    d.orbit=d.orbit||{yaw:38,pitch:25,distance:13,target:[0,1,0]};if(d.camera.preset==='top'){d.orbit.yaw=0;d.orbit.pitch=88;d.orbit.distance=15}else if(d.camera.preset==='front'){d.orbit.yaw=0;d.orbit.pitch=8;d.orbit.distance=13}d.camera.preset='';const yaw=d.orbit.yaw*Math.PI/180,pitch=d.orbit.pitch*Math.PI/180,dist=d.orbit.distance,t=d.orbit.target||[0,1,0];return{eye:[t[0]+dist*Math.sin(yaw)*Math.cos(pitch),t[1]+dist*Math.sin(pitch),t[2]+dist*Math.cos(yaw)*Math.cos(pitch)],target:t,fov:50};
  }
  function createDirector2DFallback(canvas,d){
    const ctx=canvas.getContext('2d');if(!ctx)return null;canvas.dataset.renderer='2d-fallback';
    const api={canvas,lastCam:null,project(o){return api.projectPoint([Number(o.x||0),Number(o.y||0)+1,Number(o.z||0)])},projectPoint(pt){
      const cam=api.lastCam||directorCameraState(d),eye=cam.eye,target=cam.target,forward=v3Norm(v3Sub(target,eye)),right=v3Norm(v3Cross(forward,[0,1,0])),up=v3Norm(v3Cross(right,forward)),rel=v3Sub(pt,eye),z=rel[0]*forward[0]+rel[1]*forward[1]+rel[2]*forward[2];if(z<=.05)return null;
      const x=rel[0]*right[0]+rel[1]*right[1]+rel[2]*right[2],y=rel[0]*up[0]+rel[1]*up[1]+rel[2]*up[2],f=.5*canvas.clientHeight/Math.tan(Number(cam.fov||50)*Math.PI/360);return{x:canvas.clientWidth/2+x/z*f,y:canvas.clientHeight/2-y/z*f,z};
    },draw(){
      const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1,w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(dpr,0,0,dpr,0,0);const W=rect.width,H=rect.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#0b0f12';ctx.fillRect(0,0,W,H);api.lastCam=directorCameraState(d);
      const line=(a,b,color,width=1)=>{const A=api.projectPoint(a),B=api.projectPoint(b);if(!A||!B)return;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()};
      for(let i=-10;i<=10;i++){line([i,0,-10],[i,0,10],i===0?'#37534f':'#263037',i===0?1.4:.7);line([-10,0,i],[10,0,i],i===0?'#365066':'#263037',i===0?1.4:.7)}line([0,0,0],[2,0,0],'#d26767',2);line([0,0,0],[0,2,0],'#68c889',2);line([0,0,0],[0,0,2],'#658ed0',2);
      const objects=d.objects.filter(o=>o.visible!==false).map(o=>({o,p:api.project(o)})).filter(x=>x.p).sort((a,b)=>b.p.z-a.p.z);for(const {o,p} of objects){const sc=Math.max(.28,Math.min(2.2,7/p.z))*Math.max(.55,Number(o.sx||1));const selected=o.id===d.selectedObjectId;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-Number(o.ry||0)*Math.PI/360);ctx.fillStyle=o.color||'#b8c3cf';ctx.strokeStyle=selected?'#74e0c8':'rgba(255,255,255,.28)';ctx.lineWidth=selected?3:1;
        if(o.type==='character'){ctx.fillRect(-16*sc,-48*sc,32*sc,54*sc);ctx.beginPath();ctx.arc(0,-62*sc,15*sc,0,Math.PI*2);ctx.fill();ctx.strokeRect(-16*sc,-48*sc,32*sc,54*sc);ctx.stroke()}else if(o.type==='camera'){ctx.fillRect(-25*sc,-20*sc,45*sc,30*sc);ctx.beginPath();ctx.moveTo(20*sc,-14*sc);ctx.lineTo(34*sc,-7*sc);ctx.lineTo(34*sc,2*sc);ctx.lineTo(20*sc,8*sc);ctx.closePath();ctx.fill();ctx.strokeRect(-25*sc,-20*sc,45*sc,30*sc)}else if(o.type==='crowd'){for(let k=0;k<9;k++){const cx=(k%3-1)*18*sc,cy=(Math.floor(k/3)-1)*10*sc;ctx.beginPath();ctx.arc(cx,cy-8*sc,5*sc,0,Math.PI*2);ctx.fill();ctx.fillRect(cx-4*sc,cy-3*sc,8*sc,15*sc)}}else{ctx.fillRect(-25*sc,-25*sc,50*sc,50*sc);ctx.strokeRect(-25*sc,-25*sc,50*sc,50*sc)}ctx.fillStyle=selected?'#dffef7':'#bac4cc';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(o.name,0,22*sc+14);ctx.restore()}
      ctx.fillStyle='rgba(116,224,200,.72)';ctx.font='11px system-ui';ctx.textAlign='left';ctx.fillText('WebGL 不可用 · 已启用 2D 兼容渲染',14,H-14);
    }};api.draw();return api;
  }

  function createDirectorThree(canvas,d){
    const T=window.THREE;if(!T)return null;
    try{
      const Add=window.THREE_ADDONS||{},renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.setClearColor(0x0c1014,1);renderer.outputColorSpace=T.SRGBColorSpace||renderer.outputColorSpace;
      const scene=new T.Scene();scene.background=new T.Color(0x0c1014);scene.add(new T.HemisphereLight(0xffffff,0x26303a,1.8));const dl=new T.DirectionalLight(0xffffff,2.2);dl.position.set(5,9,7);scene.add(dl);scene.add(new T.GridHelper(24,24,0x38434d,0x222a31));scene.add(new T.AxesHelper(2.2));
      const dynamic=new T.Group(),pathGroup=new T.Group();scene.add(dynamic,pathGroup);const camera=new T.PerspectiveCamera(50,1,.1,250),groupMap=new Map(),gltfCache=new Map(),gltfPending=new Set(),mixerMap=new Map();const loader=Add.GLTFLoader?new Add.GLTFLoader():null;
      const disposeGroup=g=>g?.traverse?.(x=>{if(x.userData?.sharedGltf)return;x.geometry?.dispose?.();if(x.material){if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());else x.material.dispose?.()}});
      const matFor=(o)=>new T.MeshStandardMaterial({color:new T.Color(o.color||'#b8c1cc'),roughness:.68,metalness:o.type==='camera'?.25:.05,emissive:o.id===d.selectedObjectId?new T.Color(0x153d36):new T.Color(0)}),box=(a,b,c,m)=>new T.Mesh(new T.BoxGeometry(a,b,c),m),sphere=(r,m)=>new T.Mesh(new T.SphereGeometry(r,18,12),m);
      function addCharacter(o,g,mat){const torso=box(.68,1.3,.45,mat);torso.position.y=1.25;g.add(torso);const head=sphere(.32,mat);head.position.y=2.18;g.add(head);for(const side of [-1,1]){const arm=box(.18,1.05,.2,mat);arm.position.set(side*.5,1.35+((o.pose==='抬手'&&side===1)?.45:0),0);arm.rotation.z=o.pose==='抬手'&&side===1?-1.15:side*.08;g.add(arm);const leg=box(.22,1.2,.24,mat);leg.position.set(side*.2,.42,0);g.add(leg)}}
      function addCamera(o,g,mat){const body=box(.8,.48,.95,mat);body.position.y=1.05;g.add(body);const lens=new T.Mesh(new T.CylinderGeometry(.18,.25,.46,18),mat);lens.rotation.x=Math.PI/2;lens.position.set(0,1.05,-.65);g.add(lens)}
      function primitiveGroup(o){const g=new T.Group(),mat=matFor(o);if(o.type==='character')addCharacter(o,g,mat);else if(o.type==='camera')addCamera(o,g,mat);else if(o.type==='crowd'){for(let i=0;i<9;i++){const m=box(.32,1.5,.32,mat);m.position.set((i%3-1)*.8,.75,Math.floor(i/3)*.8);g.add(m)}}else{const m=box(1.2,1.1,1.2,mat);m.position.y=.55;g.add(m)}return g}
      function gltfGroup(o){const wrap=new T.Group();wrap.userData.gltfUrl=o.assetUrl||'';const cached=gltfCache.get(o.assetUrl);if(cached){const clone=cached.scene.clone(true);clone.traverse(x=>x.userData.sharedGltf=true);wrap.add(clone);o.animations=(cached.animations||[]).map(a=>a.name||'Animation');if(cached.animations?.length)mixerMap.set(o.id,{mixer:new T.AnimationMixer(clone),clips:cached.animations,root:clone})}else{const placeholder=primitiveGroup({...o,type:'cube',color:'#66737c'});placeholder.scale.set(.7,.7,.7);wrap.add(placeholder);if(loader&&o.assetUrl&&!gltfPending.has(o.assetUrl)){gltfPending.add(o.assetUrl);loader.load(o.assetUrl,g=>{gltfCache.set(o.assetUrl,{scene:g.scene,animations:g.animations||[]});gltfPending.delete(o.assetUrl);o.modelStatus='ready';o.animations=(g.animations||[]).map(a=>a.name||'Animation');for(const gg of groupMap.values())if(gg.userData.gltfUrl===o.assetUrl)gg.userData.signature='';api.draw()},undefined,err=>{gltfPending.delete(o.assetUrl);o.modelStatus='error';o.modelError=String(err?.message||err);api.draw()})}}return wrap}
      function makeGroup(o){const g=o.type==='gltf'?gltfGroup(o):primitiveGroup(o);g.userData.objectId=o.id;g.userData.kind=o.type;return g}
      let transform=null,transformHelper=null,gizmoDragging=false;
      if(Add.TransformControls){try{transform=new Add.TransformControls(camera,canvas);transformHelper=transform.getHelper?transform.getHelper():transform;scene.add(transformHelper);transform.addEventListener('dragging-changed',e=>{gizmoDragging=!!e.value});transform.addEventListener('objectChange',()=>{const g=transform.object;if(!g)return;const o=d.objects.find(x=>x.id===g.userData.objectId);if(!o)return;o.x=g.position.x;o.y=g.position.y;o.z=g.position.z;o.rx=T.MathUtils.radToDeg(g.rotation.x);o.ry=T.MathUtils.radToDeg(g.rotation.y);o.rz=T.MathUtils.radToDeg(g.rotation.z);o.sx=g.scale.x;o.sy=g.scale.y;o.sz=g.scale.z;['X','Y','Z'].forEach(k=>{const el=$(`#dir${k}`);if(el)el.value=Number(o[k.toLowerCase()]||0).toFixed(2)});renderer.render(scene,camera)});transform.addEventListener('mouseUp',()=>saveState())}catch(err){console.warn('TransformControls unavailable',err);transform=null}}
      function syncObjects(){
        const existing=new Set(d.objects.map(o=>o.id));for(const [id,g] of [...groupMap])if(!existing.has(id)){if(transform?.object===g)transform.detach();dynamic.remove(g);disposeGroup(g);groupMap.delete(id)}
        d.objects.forEach(o=>{let g=groupMap.get(o.id);const signature=`${o.type}|${o.assetUrl||''}|${o.pose||''}`;if(!g||g.userData.signature!==signature){if(g){dynamic.remove(g);disposeGroup(g)}g=makeGroup(o);g.userData.signature=signature;groupMap.set(o.id,g);dynamic.add(g)}g.visible=o.visible!==false;g.position.set(Number(o.x||0),Number(o.y||0),Number(o.z||0));g.rotation.set(T.MathUtils.degToRad(Number(o.rx||0)),T.MathUtils.degToRad(Number(o.ry||0)),T.MathUtils.degToRad(Number(o.rz||0)));g.scale.set(Number(o.sx||1),Number(o.sy||1),Number(o.sz||1));g.traverse(x=>{if(x.material&&!x.userData?.sharedGltf){const mats=Array.isArray(x.material)?x.material:[x.material];mats.forEach(m=>{if(m.emissive)m.emissive.set(o.id===d.selectedObjectId?0x153d36:0x000000)})}})});
        if(transform){const target=groupMap.get(d.selectedObjectId);if(target&&transform.object!==target)transform.attach(target);else if(!target)transform.detach();transform.setMode(d.mode==='rotate'?'rotate':d.mode==='scale'?'scale':'translate');transform.setTranslationSnap(d.snap?.5:null);transform.setRotationSnap(d.snap?T.MathUtils.degToRad(15):null);transform.setScaleSnap(d.snap?.1:null)}
      }
      function syncPaths(){while(pathGroup.children.length){const x=pathGroup.children.pop();x.geometry?.dispose?.();x.material?.dispose?.()}(d.paths||[]).forEach(p=>{if(!Array.isArray(p.keyframes)||p.keyframes.length<2)return;const pts=p.keyframes.map(k=>new T.Vector3(Number(k.x||0),Number(k.y||0)+.06,Number(k.z||0))),geo=new T.BufferGeometry().setFromPoints(pts),mat=new T.LineBasicMaterial({color:p.type==='摄像机运镜'?0x72a9ff:0x69e0c3});pathGroup.add(new T.Line(geo,mat));pts.forEach(pt=>{const m=new T.Mesh(new T.SphereGeometry(.065,10,8),new T.MeshBasicMaterial({color:p.type==='摄像机运镜'?0x72a9ff:0x69e0c3}));m.position.copy(pt);pathGroup.add(m)})})}
      const api={renderer,scene,camera,transformControls:transform,get gizmoDragging(){return gizmoDragging},draw(){const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);renderer.setSize(w,h,false);camera.aspect=w/h;const cam=directorCameraState(d);camera.fov=Number(cam.fov||50);camera.position.set(...cam.eye.map(Number));camera.lookAt(new T.Vector3(...cam.target.map(Number)));camera.updateProjectionMatrix();camera.updateMatrixWorld();syncObjects();syncPaths();renderer.render(scene,camera)},project(o){const v=new T.Vector3(Number(o.x||0),Number(o.y||0)+1,Number(o.z||0));v.project(camera);if(v.z>1)return null;return{x:(v.x*.5+.5)*canvas.clientWidth,y:(1-(v.y*.5+.5))*canvas.clientHeight}},playAnimation(objectId,name){const m=mixerMap.get(objectId);if(!m)return false;const clip=m.clips.find(c=>(c.name||'Animation')===name)||m.clips[0];if(!clip)return false;m.mixer.stopAllAction();m.mixer.clipAction(clip).reset().play();let last=performance.now(),elapsed=0;const tick=now=>{const dt=Math.min(.05,(now-last)/1000);last=now;elapsed+=dt;m.mixer.update(dt);renderer.render(scene,camera);if(elapsed<clip.duration+.05)requestAnimationFrame(tick)};requestAnimationFrame(tick);return true},stopAnimation(objectId){mixerMap.get(objectId)?.mixer.stopAllAction()},applyPose(objectId,preset){const m=mixerMap.get(objectId),root=m?.root||groupMap.get(objectId);if(!root)return false;const bones=[];root.traverse(x=>{if(x.isBone)bones.push(x)});if(!bones.length)return false;const find=re=>bones.find(b=>re.test(String(b.name||'')));bones.forEach(b=>{if(!b.userData.__restRot)b.userData.__restRot=[b.rotation.x,b.rotation.y,b.rotation.z];const r=b.userData.__restRot;b.rotation.set(...r)});if(preset==='T Pose'){const l=find(/left.*(arm|shoulder)|(^|_)l.*(arm|shoulder)/i),r=find(/right.*(arm|shoulder)|(^|_)r.*(arm|shoulder)/i);if(l)l.rotation.z+=1.45;if(r)r.rotation.z-=1.45}else if(preset==='抬手'){const r=find(/right.*(arm|shoulder)|(^|_)r.*(arm|shoulder)/i)||find(/arm/i);if(r){r.rotation.z-=1.1;r.rotation.x-=.5}}else if(preset==='坐姿'){const lu=find(/left.*upleg|left.*thigh/i),ru=find(/right.*upleg|right.*thigh/i),ll=find(/left.*leg|left.*shin/i),rl=find(/right.*leg|right.*shin/i);if(lu)lu.rotation.x-=1.25;if(ru)ru.rotation.x-=1.25;if(ll)ll.rotation.x+=1.05;if(rl)rl.rotation.x+=1.05}renderer.render(scene,camera);return true},dispose(){try{transform?.dispose?.()}catch{};mixerMap.forEach(x=>x.mixer.stopAllAction());for(const g of groupMap.values())disposeGroup(g);renderer.dispose()}};api.draw();return api;
    }catch(err){console.warn('Three.js director fallback:',err);return createDirectorGL(canvas,d)}
  }

  function createDirectorGL(canvas,d){
    const gl=canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:true});if(!gl)return createDirector2DFallback(canvas,d);const vs=`attribute vec3 aPos;uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(aPos,1.0);}`;const fs=`precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}`;
    const shader=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh};const prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);const posLoc=gl.getAttribLocation(prog,'aPos'),mvpLoc=gl.getUniformLocation(prog,'uMVP'),colLoc=gl.getUniformLocation(prog,'uColor');
    const cube=[-1,-1,-1, 1,-1,-1, 1,1,-1,-1,-1,-1,1,1,-1,-1,1,-1, -1,-1,1,1,1,1,1,-1,1,-1,-1,1,-1,1,1,1,1,1, -1,-1,-1,-1,1,-1,-1,1,1,-1,-1,-1,-1,1,1,-1,-1,1, 1,-1,-1,1,-1,1,1,1,1,1,-1,-1,1,1,1,1,1,-1, -1,1,-1,1,1,-1,1,1,1,-1,1,-1,1,1,1,-1,1,1, -1,-1,-1,1,-1,1,1,-1,-1,-1,-1,-1,-1,-1,1,1,-1,1];const cubeBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cubeBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cube),gl.STATIC_DRAW);
    const grid=[];for(let i=-10;i<=10;i++){grid.push(i,0,-10,i,0,10,-10,0,i,10,0,i)}const gridBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gridBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(grid),gl.STATIC_DRAW);
    const axes=[0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,2],axisBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,axisBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(axes),gl.STATIC_DRAW);
    const modelOf=(o,extra=[0,0,0,1,1,1])=>{let m=mat4Translate(Number(o.x||0)+extra[0],Number(o.y||0)+extra[1],Number(o.z||0)+extra[2]);m=mat4Mul(m,mat4RotY(Number(o.ry||0)));m=mat4Mul(m,mat4RotX(Number(o.rx||0)));m=mat4Mul(m,mat4RotZ(Number(o.rz||0)));m=mat4Mul(m,mat4Scale(Number(o.sx||1)*extra[3],Number(o.sy||1)*extra[4],Number(o.sz||1)*extra[5]));return m};
    const api={gl,canvas,lastViewProj:null,draw(){const rect=canvas.getBoundingClientRect(),w=Math.max(1,Math.round(rect.width*devicePixelRatio)),h=Math.max(1,Math.round(rect.height*devicePixelRatio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}gl.viewport(0,0,w,h);gl.enable(gl.DEPTH_TEST);gl.clearColor(.045,.055,.065,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const cam=directorCameraState(d),vp=mat4Mul(mat4Perspective(cam.fov,w/h,.1,200),mat4LookAt(cam.eye,cam.target));api.lastViewProj=vp;gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER,gridBuf);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(vp));gl.uniform4fv(colLoc,new Float32Array([.16,.19,.22,1]));gl.drawArrays(gl.LINES,0,grid.length/3);
      gl.bindBuffer(gl.ARRAY_BUFFER,axisBuf);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);[[1,.25,.25,1],[.25,1,.45,1],[.3,.55,1,1]].forEach((c,i)=>{gl.uniform4fv(colLoc,new Float32Array(c));gl.drawArrays(gl.LINES,i*2,2)});
      const drawCube=(m,color)=>{gl.bindBuffer(gl.ARRAY_BUFFER,cubeBuf);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(mat4Mul(vp,m)));gl.uniform4fv(colLoc,new Float32Array(color));gl.drawArrays(gl.TRIANGLES,0,cube.length/3)};
      d.objects.filter(o=>o.visible!==false).forEach(o=>{let c=hexRgb(o.color),selected=o.id===d.selectedObjectId;if(selected)c=[Math.min(1,c[0]+.22),Math.min(1,c[1]+.22),Math.min(1,c[2]+.22),1];if(o.type==='character'){drawCube(modelOf(o,[0,1.05,0,.34,.65,.24]),c);drawCube(modelOf(o,[0,2.05,0,.32,.32,.32]),c);const pose=o.pose||'站立',arm=pose==='抬手'?.8:0;drawCube(modelOf(o,[-.52,1.15+arm*.3,0,.12,.55,.12]),c);drawCube(modelOf(o,[.52,1.15+arm*.6,0,.12,.55,.12]),c);drawCube(modelOf(o,[-.2,.25,0,.14,.6,.15]),c);drawCube(modelOf(o,[.2,.25,0,.14,.6,.15]),c)}else if(o.type==='camera'){drawCube(modelOf(o,[0,1,0,.42,.28,.5]),c);drawCube(modelOf(o,[0,1,-.62,.18,.18,.25]),c)}else if(o.type==='crowd'){for(let i=0;i<9;i++)drawCube(modelOf(o,[(i%3-1)*.75,.75,Math.floor(i/3)*.75,.18,.75,.18]),c)}else drawCube(modelOf(o,[0,.55,0,.6,.55,.6]),c)});
    },project(o){if(!api.lastViewProj)return null;const m=api.lastViewProj,x=Number(o.x||0),y=Number(o.y||0)+1,z=Number(o.z||0),cx=m[0]*x+m[4]*y+m[8]*z+m[12],cy=m[1]*x+m[5]*y+m[9]*z+m[13],cw=m[3]*x+m[7]*y+m[11]*z+m[15];if(cw<=0)return null;return{x:(cx/cw*.5+.5)*canvas.clientWidth,y:(1-(cy/cw*.5+.5))*canvas.clientHeight}}};api.draw();return api;
  }
  function interpolateKeyframes(frames,t){if(!frames?.length)return null;const sorted=[...frames].sort((a,b)=>a.t-b.t);if(t<=sorted[0].t)return sorted[0];if(t>=sorted.at(-1).t)return sorted.at(-1);const b=sorted.find(x=>x.t>=t),a=sorted[sorted.indexOf(b)-1],f=(t-a.t)/(b.t-a.t);const out={t};['x','y','z','rx','ry','rz','fov'].forEach(k=>{if(a[k]!=null||b[k]!=null)out[k]=Number(a[k]??b[k]??0)+(Number(b[k]??a[k]??0)-Number(a[k]??b[k]??0))*f});return out}
  async function directorTakeScreenshot(n){const d=ensureDirectorData(n),canvas=$('#directorWebgl',featureModal);if(canvas){try{const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));const up=blob&&backendOnline?await uploadBlob(blob,`director-${Date.now()}.png`):null;const url=up?.url||canvas.toDataURL('image/png');snapshot();const img={id:uid('n'),type:'image',x:n.x+460,y:n.y,w:340,title:'导演台机位截图',outputUrl:url,prompt:'',providerId:'',modelId:'',modelName:'',toolParams:{operation:'director_screenshot',camera:{...d.camera}}};state.nodes.push(img);state.edges.push(makeSemanticEdge(n.id,img.id,'camera','reference'));d.screenshots.push({id:uid('ss'),url,createdAt:new Date().toISOString()});saveState();render();showToast('WebGL 当前机位截图已发送到画布');return img}catch(e){showToast('截图失败：'+e.message)}}showToast('导演台未打开');}

  function openDirectorConsole(n){ensureDirectorData(n);renderDirectorConsole(n)}
  function directorCameraPathFrames(template,cam,target,duration=5){
    const x=Number(cam?.x||0),y=Number(cam?.y||2.2),z=Number(cam?.z||7),tx=Number(target?.x||0),ty=Number(target?.y||1),tz=Number(target?.z||0),D=Math.max(1,Number(duration||5));
    if(template==='拉远')return[{t:0,x,y,z},{t:D,x,y,z:z+3.5}];if(template==='左移')return[{t:0,x,y,z},{t:D,x:x-4,y,z}];if(template==='右移')return[{t:0,x,y,z},{t:D,x:x+4,y,z}];if(template==='升镜')return[{t:0,x,y,z},{t:D,x,y:y+4,z:z+.8}];if(template==='俯冲')return[{t:0,x,y:y+4,z:z+1},{t:D,x,y:Math.max(.8,y-1),z:z-2}];if(template==='环绕'){const r=Math.max(3,Math.hypot(x-tx,z-tz)),a0=Math.atan2(x-tx,z-tz);return Array.from({length:9},(_,i)=>{const a=a0+i/8*Math.PI*2;return{t:D*i/8,x:tx+Math.sin(a)*r,y,z:tz+Math.cos(a)*r}})}return[{t:0,x,y,z},{t:D,x,y,z:z-3}]
  }
  function directorMotionFrames(template,o,duration=5){const x=Number(o.x||0),y=Number(o.y||0),z=Number(o.z||0),D=Math.max(1,Number(duration||5));if(template==='圆形')return Array.from({length:9},(_,i)=>{const a=i/8*Math.PI*2;return{t:D*i/8,x:x+Math.sin(a)*2.2,y,z:z+Math.cos(a)*2.2,ry:a*180/Math.PI}});if(template==='矩形')return[{t:0,x,y,z},{t:D*.25,x:x+3,y,z},{t:D*.5,x:x+3,y,z:z+2},{t:D*.75,x,y,z:z+2},{t:D,x,y,z}];if(template==='上台阶')return[{t:0,x,y,z},{t:D*.33,x:x+1,y:y+.4,z:z+.5},{t:D*.66,x:x+2,y:y+.8,z:z+1},{t:D,x:x+3,y:y+1.2,z:z+1.5}];return[{t:0,x,y,z,ry:o.ry||0},{t:D,x:x+3,y,z:z+1,ry:o.ry||0}]}
  function openDirectorPathBuilder(n,d,kind,selected){
    const isCam=kind==='camera',templates=isCam?['推近','拉远','左移','右移','环绕','升镜','俯冲']:['直线','圆形','矩形','上台阶'];const cam=d.objects.find(o=>o.type==='camera')||selected;modalShell(isCam?'创建摄像机运镜':'创建角色运动',`<div class="motion-grid director-path-presets">${templates.map((x,i)=>`<button data-path-template="${x}" class="${i===0?'active':''}"><b>${x}</b><span>${isCam?(x==='环绕'?'围绕注视对象生成完整圆弧轨迹':'自动生成机位、高度与关键帧'):'自动生成地面运动轨迹与关键帧'}</span></button>`).join('')}</div><div class="feature-grid">${rangeField('持续时间','dirPathDuration',1,20,5,.5)}${isCam?field('注视目标',`<select id="dirPathTarget"><option value="">场景中心</option>${d.objects.filter(o=>o.type!=='camera').map(o=>`<option value="${o.id}">${escapeHtml(o.name)}</option>`).join('')}</select>`):field('对象',`<div class="provider-note">${escapeHtml(selected?.name||'未选择')}</div>`)} </div><div class="feature-actions"><button id="backDirector">返回导演台</button><button class="primary" id="applyDirectorPath">创建轨迹</button></div>`,{wide:true});bindRanges();let tpl=templates[0];$$('[data-path-template]',featureModal).forEach(b=>b.onclick=()=>{$$('[data-path-template]',featureModal).forEach(x=>x.classList.toggle('active',x===b));tpl=b.dataset.pathTemplate});$('#backDirector').onclick=()=>renderDirectorConsole(n);$('#applyDirectorPath').onclick=()=>{const D=Number($('#dirPathDuration').value||5);if(isCam){if(!cam)return showToast('请先添加摄像机');const target=d.objects.find(o=>o.id===$('#dirPathTarget').value);if(target)d.camera.target=target.id;d.paths.push({id:uid('path'),type:'摄像机运镜',objectId:cam.id,target:target?.id||'',template:tpl,duration:D,keyframes:directorCameraPathFrames(tpl,cam,target,D)})}else{if(!selected||selected.type==='camera')return showToast('请选择角色或场景对象');d.paths.push({id:uid('path'),type:'角色运动',objectId:selected.id,template:tpl,duration:D,keyframes:directorMotionFrames(tpl,selected,D)})}saveState();renderDirectorConsole(n)};
  }
  function renderDirectorConsole(n){
    const d=ensureDirectorData(n);d.orbit=d.orbit||{yaw:38,pitch:25,distance:13,target:[0,1,0]};const selected=d.objects.find(o=>o.id===d.selectedObjectId)||d.objects[0];if(selected&&!d.selectedObjectId)d.selectedObjectId=selected.id;
    modalShell('Director Studio · 3D 导演台',`<div class="director-console"><aside class="director-tree"><div class="director-panel-title">对象树 <button id="addDirectorObject">＋</button></div><div class="director-object-list">${d.objects.map(o=>`<button data-dir-obj="${o.id}" class="${o.id===d.selectedObjectId?'active':''}"><span class="obj-icon">${o.type==='character'?'人':o.type==='camera'?'⌖':o.type==='gltf'?'3D':'◇'}</span><b>${escapeHtml(o.name)}</b><i>${o.type==='gltf'?(o.modelStatus==='ready'?'GLB':o.modelStatus==='error'?'错误':'加载中'):o.visible===false?'隐藏':''}</i></button>`).join('')}</div><div class="director-add-menu hidden" id="directorAddMenu"><button data-add-kind="character">人体素模</button><button data-add-kind="cube">基础几何体</button><button data-add-kind="crowd">群众阵列</button><button data-add-kind="camera">摄像机</button><button id="importDirectorModel">导入 GLB 模型</button><input id="directorModelInput" type="file" accept=".glb,model/gltf-binary" hidden></div></aside><section class="director-stage"><div class="director-stage-toolbar"><div class="seg-buttons"><button data-dir-mode="move" class="${d.mode==='move'?'active':''}">V 移动</button><button data-dir-mode="rotate" class="${d.mode==='rotate'?'active':''}">R 旋转</button><button data-dir-mode="scale" class="${d.mode==='scale'?'active':''}">S 缩放</button><button id="toggleSnap" class="${d.snap?'active':''}">X 吸附</button></div><div class="seg-buttons"><button data-dir-view="top">T 俯视</button><button data-dir-view="front">Y 正面</button><button data-dir-view="reset">Q 重置</button></div><select id="directorView"><option value="director" ${d.view==='director'?'selected':''}>导演视角</option><option value="camera" ${d.view==='camera'?'selected':''}>机位视角</option></select><button id="directorPlay">▶ 播放轨迹</button><button id="directorStop">■</button><button id="directorBlender">Blender桥接</button><button id="directorScreenshot" class="primary">截图</button></div><div class="director-webgl-wrap"><canvas id="directorWebgl"></canvas><div class="webgl-hint">Three.js：点击对象后使用 XYZ Gizmo 精确变换 · 空白拖动环绕 · 滚轮缩放 · 支持 GLB</div></div><div class="director-timeline"><div><b>运动 / 运镜轨迹</b><button id="createMotionPath">创建运动</button><button id="createCameraPath">创建运镜</button><button id="createFollow">一键跟随拍摄</button></div><div class="director-keyframes">${Array.from({length:11},(_,i)=>`<i><span>${i}</span></i>`).join('')}${(d.paths||[]).map((p,i)=>`<em style="left:${10+Math.min(82,i*12)}%" title="${escapeAttr(p.template||p.type)}"></em>`).join('')}<b id="directorPlayhead" style="left:0%"></b></div></div></section><aside class="director-inspector"><div class="director-panel-title">属性</div>${selected?directorInspectorHtml(selected,d):'<div class="feature-empty">选择对象</div>'}</aside></div>`,{full:true});
    const canvas=$('#directorWebgl'),engine=(window.THREE?createDirectorThree(canvas,d):createDirectorGL(canvas,d));if(!engine){showToast('当前浏览器无法创建 WebGL 上下文');return}window.__directorEngine=engine;const redraw=()=>engine.draw();
    $$('[data-dir-obj]',featureModal).forEach(b=>b.onclick=()=>{d.selectedObjectId=b.dataset.dirObj;saveState();renderDirectorConsole(n)});$('#addDirectorObject').onclick=()=>$('#directorAddMenu').classList.toggle('hidden');$$('[data-add-kind]',featureModal).forEach(b=>b.onclick=()=>{addDirectorObject(d,b.dataset.addKind);saveState();renderDirectorConsole(n)});$('#importDirectorModel').onclick=()=>$('#directorModelInput').click();$('#directorModelInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{showToast('正在上传 GLB 模型…');const up=await uploadBlob(f,f.name),o={id:uid('obj'),type:'gltf',name:f.name.replace(/\.glb$/i,''),assetUrl:up.url,modelStatus:'loading',x:0,y:0,z:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1,color:'#b8c1cc',visible:true};d.objects.push(o);d.selectedObjectId=o.id;saveState();renderDirectorConsole(n);showToast('GLB 已加入导演台')}catch(err){showToast('GLB 导入失败：'+err.message)}};
    $$('[data-dir-mode]',featureModal).forEach(b=>b.onclick=()=>{d.mode=b.dataset.dirMode;saveState();if(engine.transformControls){engine.transformControls.setMode(d.mode==='rotate'?'rotate':d.mode==='scale'?'scale':'translate');$$('[data-dir-mode]',featureModal).forEach(x=>x.classList.toggle('active',x===b));redraw()}else renderDirectorConsole(n)});$('#toggleSnap').onclick=()=>{d.snap=!d.snap;saveState();renderDirectorConsole(n)};$$('[data-dir-view]',featureModal).forEach(b=>b.onclick=()=>{const v=b.dataset.dirView;if(v==='reset'){d.orbit={yaw:38,pitch:25,distance:13,target:[0,1,0]};d.camera={...d.camera,x:0,y:2.2,z:7,fov:50,target:''}}else d.camera.preset=v;saveState();renderDirectorConsole(n)});$('#directorView').onchange=e=>{d.view=e.target.value;saveState();renderDirectorConsole(n)};$('#directorBlender').onclick=()=>openDirectorBridge(n);$('#directorScreenshot').onclick=()=>directorTakeScreenshot(n);bindDirectorInspector(n,d,selected);
    $('#createMotionPath').onclick=()=>openDirectorPathBuilder(n,d,'motion',selected);$('#createCameraPath').onclick=()=>openDirectorPathBuilder(n,d,'camera',selected);$('#createFollow').onclick=()=>{if(!selected||selected.type==='camera')return showToast('请选择被跟随角色');const cam=d.objects.find(o=>o.type==='camera');if(!cam)return showToast('请先添加摄像机');d.paths.push({id:uid('path'),type:'跟随拍摄',objectId:cam.id,target:selected.id,duration:5,distance:4,height:2,angle:0});saveState();renderDirectorConsole(n)};
    let drag=null;canvas.onpointerdown=e=>{if(engine.transformControls?.axis||engine.gizmoDragging)return;const rect=canvas.getBoundingClientRect(),mx=e.clientX-rect.left,my=e.clientY-rect.top;let nearest=null,dist=38;d.objects.filter(o=>o.visible!==false).forEach(o=>{const p=engine.project(o);if(!p)return;const dd=Math.hypot(p.x-mx,p.y-my);if(dd<dist){dist=dd;nearest=o}});if(nearest){d.selectedObjectId=nearest.id;if(engine.transformControls){saveState();renderDirectorConsole(n);return}const o=nearest;drag={kind:'object',o,sx:e.clientX,sy:e.clientY,orig:{x:o.x,y:o.y,z:o.z,rx:o.rx||0,ry:o.ry||0,sx:o.sx||1,sy:o.sy||1,sz:o.sz||1}}}else drag={kind:'orbit',sx:e.clientX,sy:e.clientY,yaw:d.orbit.yaw,pitch:d.orbit.pitch};try{canvas.setPointerCapture(e.pointerId)}catch{}};canvas.onpointermove=e=>{if(engine.gizmoDragging||!drag)return;const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;if(drag.kind==='orbit'){d.orbit.yaw=drag.yaw+dx*.35;d.orbit.pitch=Math.max(-80,Math.min(88,drag.pitch-dy*.3))}else{const o=drag.o,snap=v=>d.snap?Math.round(v*2)/2:v;if(d.mode==='rotate'){o.ry=drag.orig.ry+dx*.6;o.rx=drag.orig.rx-dy*.3}else if(d.mode==='scale'){const f=Math.max(.15,1+(dx-dy)/180);o.sx=drag.orig.sx*f;o.sy=drag.orig.sy*f;o.sz=drag.orig.sz*f}else{o.x=snap(drag.orig.x+dx/55);o.z=snap(drag.orig.z+dy/55)}}redraw()};canvas.onpointerup=()=>{if(drag){saveState();const was=drag;drag=null;if(was.kind==='object')renderDirectorConsole(n)}};canvas.onwheel=e=>{e.preventDefault();d.orbit.distance=Math.max(2,Math.min(40,d.orbit.distance*Math.exp(e.deltaY*.001)));redraw()};
    let stopPlayback=false;$('#directorStop').onclick=()=>{stopPlayback=true;if(window.__directorRAF)cancelAnimationFrame(window.__directorRAF);redraw()};$('#directorPlay').onclick=()=>{stopPlayback=false;const paths=d.paths||[];if(!paths.length)return showToast('先创建角色运动或摄像机运镜');const start=performance.now(),dur=Math.max(1,...paths.map(p=>Number(p.duration||p.keyframes?.at(-1)?.t||5)));const tick=now=>{if(stopPlayback)return;const t=Math.min(dur,(now-start)/1000);paths.forEach(p=>{const o=d.objects.find(x=>x.id===p.objectId);if(p.type==='跟随拍摄'){const target=d.objects.find(x=>x.id===p.target);if(o&&target){o.x=target.x+Number(p.distance||4)*Math.sin(Number(p.angle||0));o.z=target.z+Number(p.distance||4)*Math.cos(Number(p.angle||0));o.y=target.y+Number(p.height||2)}}else if(o){const k=interpolateKeyframes(p.keyframes,t);if(k)Object.keys(k).forEach(key=>{if(key!=='t'&&k[key]!=null)o[key]=k[key]})}});const ph=$('#directorPlayhead');if(ph)ph.style.left=(t/dur*100)+'%';redraw();if(t<dur)window.__directorRAF=requestAnimationFrame(tick);else{saveState();showToast('轨迹播放完成')}};window.__directorRAF=requestAnimationFrame(tick)};
  }

  async function openDirectorBridge(n){const d=ensureDirectorData(n),scene={camera:d.camera,objects:d.objects,paths:d.paths};let bridge={token:'',plugin:'/blender_canvas_bridge.py'};try{bridge=await apiJson('/api/blender/bridge/token')}catch(e){return showToast('无法初始化 Blender Bridge：'+e.message)}const text=JSON.stringify(scene,null,2);modalShell('Blender Live Bridge',`<div class="blender-live-head"><div><b>实时桥接</b><span>Canvas ⇄ Blender · 1 秒轮询同步 · 无需重复下载上传</span></div><i id="blenderBridgeStatus">等待连接</i></div><div class="feature-grid">${field('Canvas 地址',`<input id="blenderServerUrl" value="${escapeAttr(location.origin)}" readonly>`)}${field('Bridge Token',`<div class="token-copy"><input id="blenderBridgeToken" value="${escapeAttr(bridge.token)}" readonly><button id="copyBridgeToken">复制</button></div>`)}${field('场景 JSON',`<textarea id="blenderSceneJson" rows="13">${escapeHtml(text)}</textarea>`,true)}${field('使用方式',`<div class="provider-note">下载插件并在 Blender 安装，填入 Server 和 Token。Blender 可发送当前场景到 Canvas，也可以开启 1 秒自动同步。</div>`,true)}</div><div class="feature-actions"><a class="button-link" href="${escapeAttr(bridge.plugin||'/blender_canvas_bridge.py')}" download>下载 Blender 插件</a><button id="pushSceneToBlender">发送当前场景到 Blender</button><button id="pullSceneFromBlender">接收 Blender 场景</button><button id="exportBlenderJson">导出 JSON</button><button class="primary" id="importBlenderJson">导入 JSON</button></div>`,{wide:true});const status=(msg,ok=false)=>{const el=$('#blenderBridgeStatus');if(el){el.textContent=msg;el.classList.toggle('ok',ok)}};$('#copyBridgeToken').onclick=async()=>{try{await navigator.clipboard.writeText(bridge.token);showToast('Bridge Token 已复制')}catch{showToast(bridge.token)}};$('#exportBlenderJson').onclick=()=>downloadJson(`${state.projectName}-director-scene.json`,scene);$('#importBlenderJson').onclick=()=>{try{const x=JSON.parse($('#blenderSceneJson').value);if(x.camera)d.camera=x.camera;if(Array.isArray(x.objects))d.objects=x.objects;if(Array.isArray(x.paths))d.paths=x.paths;saveState();render();closeFeatureModal();openDirectorConsole(n);showToast('Blender 场景数据已导入')}catch(e){showToast('JSON 格式错误')}};$('#pushSceneToBlender').onclick=async()=>{try{const latest={camera:d.camera,objects:d.objects,paths:d.paths},out=await apiJson('/api/blender/bridge/push',{method:'POST',headers:{'X-Canvas-Bridge-Token':bridge.token},body:JSON.stringify({direction:'canvas_to_blender',source:'canvas',scene:latest})});status(`已发送 v${out.packet?.version||'?'} · ${new Date().toLocaleTimeString()}`,true)}catch(e){status('发送失败');showToast(e.message)}};$('#pullSceneFromBlender').onclick=async()=>{try{const out=await apiJson('/api/blender/bridge/poll?direction=blender_to_canvas&since=0',{headers:{'X-Canvas-Bridge-Token':bridge.token}}),x=out.packet?.scene;if(!x)return status('Blender 暂无场景');if(x.camera)d.camera={...d.camera,...x.camera};if(Array.isArray(x.objects)&&x.objects.length){const current=new Map(d.objects.map(o=>[o.id,o]));x.objects.forEach(o=>{const old=current.get(o.id)||d.objects.find(z=>z.name===o.name);if(old)Object.assign(old,o);else d.objects.push(o)})}if(Array.isArray(x.paths))d.paths=x.paths;saveState();status(`已接收 v${out.packet?.version||'?'} · ${new Date().toLocaleTimeString()}`,true);closeFeatureModal();openDirectorConsole(n)}catch(e){status('接收失败');showToast(e.message)}};}

  function directorInspectorHtml(o,d){return `<div class="inspector-section"><label>名称<input id="dirName" value="${escapeAttr(o.name)}"></label><label class="toggle-row"><input id="dirVisible" type="checkbox" ${o.visible!==false?'checked':''}>显示对象</label></div>${o.type==='gltf'?`<div class="inspector-section model-inspector"><b>GLB 模型</b><span>${escapeHtml(o.assetUrl||'')}</span><i class="${o.modelStatus||'loading'}">${o.modelStatus==='ready'?'模型已加载':o.modelStatus==='error'?'模型加载失败':'模型加载中 / 等待 Three.js'}</i>${(o.animations||[]).length?`<label>动画 Clip<select id="dirAnimation">${o.animations.map(a=>`<option>${escapeHtml(a)}</option>`).join('')}</select></label><div class="director-animation-actions"><button id="playDirAnimation">▶ 播放</button><button id="stopDirAnimation">■ 停止</button></div>`:'<small>GLB 若包含动画，加载后重新选中对象即可显示 Clip</small>'}<label>骨骼姿势<select id="dirGltfPose"><option>还原</option><option>T Pose</option><option>抬手</option><option>坐姿</option></select></label><button id="applyDirGltfPose">应用姿势</button></div>`:''}<div class="inspector-section"><b>变换</b><div class="xyz-row"><span>位置</span><input id="dirX" type="number" step=".1" value="${o.x}"><input id="dirY" type="number" step=".1" value="${o.y}"><input id="dirZ" type="number" step=".1" value="${o.z}"></div><div class="xyz-row"><span>旋转</span><input id="dirRX" type="number" step="1" value="${o.rx||0}"><input id="dirRY" type="number" step="1" value="${o.ry||0}"><input id="dirRZ" type="number" step="1" value="${o.rz||0}"></div><div class="xyz-row"><span>缩放</span><input id="dirSX" type="number" step=".1" value="${o.sx||1}"><input id="dirSY" type="number" step=".1" value="${o.sy||1}"><input id="dirSZ" type="number" step=".1" value="${o.sz||1}"></div>${o.type!=='gltf'?`<label>颜色<input id="dirColor" type="color" value="${o.color||'#bbbbbb'}"></label>`:''}</div>${o.type==='character'?`<div class="inspector-section"><b>姿势</b><select id="dirPose"><option>站立</option><option>行走</option><option>坐下</option><option>奔跑</option><option>抬手</option><option>自定义</option></select></div>`:''}${o.type==='camera'?`<div class="inspector-section"><b>摄像机</b><label>FOV <input id="dirFov" type="number" min="10" max="120" value="${d.camera.fov}"></label><label>注视目标<select id="dirTarget"><option value="">无</option>${d.objects.filter(x=>x.type!=='camera').map(x=>`<option value="${x.id}" ${d.camera.target===x.id?'selected':''}>${escapeHtml(x.name)}</option>`).join('')}</select></label></div>`:''}<div class="inspector-section"><b>全景图</b><button id="setPanorama">选择生成历史 / 本地全景</button></div><div class="inspector-section danger-zone"><button id="deleteDirObject">删除对象</button></div>`}
  function bindDirectorInspector(n,d,o){if(!o)return;const save=()=>{o.name=$('#dirName').value;o.visible=$('#dirVisible').checked;o.x=Number($('#dirX').value);o.y=Number($('#dirY').value);o.z=Number($('#dirZ').value);o.rx=Number($('#dirRX').value);o.ry=Number($('#dirRY').value);o.rz=Number($('#dirRZ').value);o.sx=Number($('#dirSX').value);o.sy=Number($('#dirSY').value);o.sz=Number($('#dirSZ').value);if($('#dirColor'))o.color=$('#dirColor').value;if($('#dirPose'))o.pose=$('#dirPose').value;if($('#dirFov'))d.camera.fov=Number($('#dirFov').value);if($('#dirTarget'))d.camera.target=$('#dirTarget').value;saveState();};$$('.director-inspector input,.director-inspector select',featureModal).forEach(x=>x.onchange=()=>{if(['dirAnimation','dirGltfPose'].includes(x.id))return;save();renderDirectorConsole(n)});if($('#playDirAnimation'))$('#playDirAnimation').onclick=()=>{if(!window.__directorEngine?.playAnimation?.(o.id,$('#dirAnimation').value))showToast('当前模型没有可播放动画')};if($('#stopDirAnimation'))$('#stopDirAnimation').onclick=()=>window.__directorEngine?.stopAnimation?.(o.id);if($('#applyDirGltfPose'))$('#applyDirGltfPose').onclick=()=>{const ok=window.__directorEngine?.applyPose?.(o.id,$('#dirGltfPose').value);showToast(ok?'骨骼姿势已应用':'未检测到可编辑骨骼')};$('#setPanorama').onclick=()=>{d.panorama='已设置全景环境';saveState();showToast('全景环境已设置')};$('#deleteDirObject').onclick=()=>{d.objects=d.objects.filter(x=>x.id!==o.id);d.selectedObjectId=d.objects[0]?.id||null;saveState();renderDirectorConsole(n)}}
  function addDirectorObject(d,kind){const count=d.objects.length+1;d.objects.push({id:uid('obj'),type:kind,name:kind==='character'?`角色 ${count}`:kind==='camera'?`机位 ${count}`:kind==='crowd'?`群众阵列 ${count}`:kind==='gltf'?`3D 模型 ${count}`:`几何体 ${count}`,x:(count%4)-1.5,y:0,z:Math.floor(count/4),rx:0,ry:0,rz:0,sx:1,sy:1,sz:1,color:kind==='character'?'#bdcce0':kind==='camera'?'#79d6c3':'#c4a779',visible:true,pose:'站立'});d.selectedObjectId=d.objects.at(-1).id}

  function onNodePointerDown(e,n,el){
    if(e.button!==0) return;
    if(currentInteractionMode()==='grab'){
      if(e.target.closest('button,input,select,textarea,.node-port,.node-menu-btn')) return;
      startViewportPan(e);
      return;
    }
    if(n.locked&&!e.target.closest('button,input,select,textarea,.node-port,.node-menu-btn')){e.preventDefault();e.stopPropagation();selectNode(n.id,e.shiftKey);expandedNodeId=n.id;render();return;}
    if(e.target.closest('button,input,select,textarea,.node-port,.node-menu-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    const worldPt=screenToWorld(e.clientX,e.clientY);selectedGroupId=null;
    const dragIds=(state.selectedIds||[]).includes(n.id)&&(state.selectedIds||[]).length>1?[...state.selectedIds]:[n.id];
    dragging={
      id:n.id,
      ids:dragIds,
      pointerId:e.pointerId,
      starts:Object.fromEntries(dragIds.map(id=>{const x=state.nodes.find(node=>node.id===id);return [id,{x:x.x,y:x.y}]})),
      startWorld:worldPt,
      startClient:{x:e.clientX,y:e.clientY},
      moved:false,
      snapshotted:false,
      additive:!!e.shiftKey
    };
    // LibTV behavior: dragging only moves/selects; details are opened only after a true click.
    // Close any floating detail surface while the pointer is deciding between click vs drag.
    expandedNodeId=null;
    // Selection may rebuild the node DOM. Node dragging therefore deliberately does
    // NOT rely on pointer capture on the old element; window-level pointerup owns cleanup.
    selectNode(n.id,e.shiftKey);
    requestAnimationFrame(()=>{(dragging?.ids||[n.id]).forEach(id=>document.querySelector(`.node[data-id="${CSS.escape(String(id))}"]`)?.classList.add('dragging-node'))});
  }

  function ensureGuideLayer(){if(alignmentGuideLayer)return alignmentGuideLayer;alignmentGuideLayer=document.createElement('div');alignmentGuideLayer.className='alignment-guide-layer';viewport.appendChild(alignmentGuideLayer);return alignmentGuideLayer}
  function clearAlignmentGuides(){if(alignmentGuideLayer)alignmentGuideLayer.innerHTML=''}
  function showAlignmentGuides(guides=[]){const layer=ensureGuideLayer();layer.innerHTML=guides.map(g=>g.axis==='x'?`<i class="alignment-guide vertical" style="left:${g.screen}px"></i>`:`<i class="alignment-guide horizontal" style="top:${g.screen}px"></i>`).join('')}
  function selectionBounds(ids,starts=null){const ns=ids.map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);if(!ns.length)return null;const coords=ns.map(n=>({n,x:starts?.[n.id]?.x??n.x,y:starts?.[n.id]?.y??n.y}));const left=Math.min(...coords.map(o=>o.x)),top=Math.min(...coords.map(o=>o.y)),right=Math.max(...coords.map(o=>o.x+(o.n.w||320))),bottom=Math.max(...coords.map(o=>o.y+nodeHeight(o.n)));return{left,top,right,bottom,cx:(left+right)/2,cy:(top+bottom)/2}}
  function snapDragDelta(ids,starts,dx,dy,bypass=false){if(bypass||state.canvasSettings?.snap===false)return{dx,dy,guides:[]};const moving=selectionBounds(ids,starts);if(!moving)return{dx,dy,guides:[]};const threshold=8/Math.max(.1,state.viewport.zoom),others=state.nodes.filter(n=>!ids.includes(n.id));let bestX=null,bestY=null;const mx=[moving.left+dx,moving.cx+dx,moving.right+dx],my=[moving.top+dy,moving.cy+dy,moving.bottom+dy];for(const o of others){const r=nodeRect(o),xs=[r.left,(r.left+r.right)/2,r.right],ys=[r.top,(r.top+r.bottom)/2,r.bottom];for(const a of mx)for(const b of xs){const d=b-a;if(Math.abs(d)<=threshold&&(!bestX||Math.abs(d)<Math.abs(bestX.d)))bestX={d,world:b}}for(const a of my)for(const b of ys){const d=b-a;if(Math.abs(d)<=threshold&&(!bestY||Math.abs(d)<Math.abs(bestY.d)))bestY={d,world:b}}}
    const grid=Math.max(1,Number(state.canvasSettings?.grid||12));if(!bestX){const x=moving.left+dx,b=Math.round(x/grid)*grid,d=b-x;if(Math.abs(d)<=threshold*.75)bestX={d,world:b,grid:true}}if(!bestY){const y=moving.top+dy,b=Math.round(y/grid)*grid,d=b-y;if(Math.abs(d)<=threshold*.75)bestY={d,world:b,grid:true}}
    const guides=[];if(bestX&&!bestX.grid)guides.push({axis:'x',screen:state.viewport.x+bestX.world*state.viewport.zoom});if(bestY&&!bestY.grid)guides.push({axis:'y',screen:state.viewport.y+bestY.world*state.viewport.zoom});return{dx:dx+(bestX?.d||0),dy:dy+(bestY?.d||0),guides}
  }
  function updateDraggedNodeDom(){if(!dragging)return;const ids=dragging.ids||[dragging.id];ids.forEach(id=>{const node=state.nodes.find(n=>n.id===id),el=document.querySelector(`.node[data-id="${CSS.escape(String(id))}"]`);if(node&&el){el.style.left=node.x+'px';el.style.top=node.y+'px'}});renderEdges(ids);(state.groups||[]).filter(g=>g.nodeIds.some(id=>ids.includes(id))).forEach(g=>updateGroupGeometry(g.id));scheduleMinimapRender()}
  function updateGroupDraggedDom(){if(!groupDragging)return;const gd=groupDragging,g=state.groups.find(x=>x.id===gd.groupId);if(!g)return;g.nodeIds.forEach(id=>{const n=state.nodes.find(x=>x.id===id),el=document.querySelector(`.node[data-id="${CSS.escape(String(id))}"]`);if(n&&el){el.style.left=n.x+'px';el.style.top=n.y+'px'}});renderEdges(g.nodeIds);updateGroupGeometry(g.id);scheduleMinimapRender()}
  function handleGroupDragMove(e){if(!groupDragging)return false;if(groupDragging.pointerId!=null&&e.pointerId!==groupDragging.pointerId)return false;if(typeof e.buttons==='number'&&(e.buttons&1)===0){finishGroupDrag();return false}const dist=Math.hypot(e.clientX-groupDragging.startClient.x,e.clientY-groupDragging.startClient.y);if(!groupDragging.moved&&dist<4)return true;if(!groupDragging.snapshotted){snapshot('移动分组');groupDragging.snapshotted=true}groupDragging.moved=true;const rawDx=(e.clientX-groupDragging.startClient.x)/state.viewport.zoom,rawDy=(e.clientY-groupDragging.startClient.y)/state.viewport.zoom,g=state.groups.find(x=>x.id===groupDragging.groupId),ids=g?.nodeIds||Object.keys(groupDragging.starts);let sn;if(g?.collapsed&&groupDragging.collapsedStart){const grid=Math.max(1,Number(state.canvasSettings?.grid||12)),dx=e.altKey||state.canvasSettings?.snap===false?rawDx:Math.round((groupDragging.collapsedStart.x+rawDx)/grid)*grid-groupDragging.collapsedStart.x,dy=e.altKey||state.canvasSettings?.snap===false?rawDy:Math.round((groupDragging.collapsedStart.y+rawDy)/grid)*grid-groupDragging.collapsedStart.y;sn={dx,dy,guides:[]};g.collapsedPos={x:groupDragging.collapsedStart.x+dx,y:groupDragging.collapsedStart.y+dy}}else sn=snapDragDelta(ids,groupDragging.starts,rawDx,rawDy,e.altKey);for(const [id,st] of Object.entries(groupDragging.starts)){const n=state.nodes.find(x=>x.id===id);if(n){n.x=st.x+sn.dx;n.y=st.y+sn.dy}}showAlignmentGuides(sn.guides);updateGroupDraggedDom();return true}
  function finishGroupDrag(){if(!groupDragging)return;const gd=groupDragging;groupDragging=null;clearAlignmentGuides();scheduleMinimapRender();const g=state.groups.find(x=>x.id===gd.groupId);if(g&&gd.moved){g.__justDragged=true;saveState();render()}else renderGroups(renderedNodeIds())}

  function beginNodeResize(e,n,el){if(e.button!==0)return;if(n.locked){e.preventDefault();e.stopPropagation();showToast('节点已锁定，先解锁再调整尺寸');return}e.preventDefault();e.stopPropagation();const min=nodeMinSize(n);/* Do not call selectNode() here: it re-renders the DOM and detaches the handle that owns this pointer gesture. Update selection in-place so pointer capture and window-level move/up stay stable for the whole resize. */selectedEdgeId=null;selectedGroupId=null;expandedNodeId=null;state.selectedIds=[n.id];selectedId=n.id;state.nodes.forEach(x=>x.selected=x.id===n.id);$$('.node',nodeLayer).forEach(x=>{const on=x.dataset.id===String(n.id);x.classList.toggle('selected',on);x.classList.toggle('multi-selected',on)});resizingNode={id:n.id,pointerId:e.pointerId,startClient:{x:e.clientX,y:e.clientY},startW:Number(n.w||320),startH:nodeHeight(n),min,moved:false,snapshotted:false};el.classList.add('resizing-node');renderToolbar();generator.classList.add('hidden');try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}}
  function handleNodeResizeMove(e){if(!resizingNode)return false;if(resizingNode.pointerId!=null&&e.pointerId!==resizingNode.pointerId)return false;if(typeof e.buttons==='number'&&(e.buttons&1)===0){finishNodeResize();return false}const dx=(e.clientX-resizingNode.startClient.x)/state.viewport.zoom,dy=(e.clientY-resizingNode.startClient.y)/state.viewport.zoom,dist=Math.hypot(dx,dy);if(!resizingNode.moved&&dist<3)return true;if(!resizingNode.snapshotted){snapshot('调整节点尺寸');resizingNode.snapshotted=true}resizingNode.moved=true;const n=state.nodes.find(x=>x.id===resizingNode.id);if(!n)return false;const grid=Math.max(1,Number(state.canvasSettings?.grid||12)),snap=state.canvasSettings?.snap!==false&&!e.altKey;let w=Math.max(resizingNode.min.w,Math.min(960,resizingNode.startW+dx)),h=Math.max(resizingNode.min.h,Math.min(780,resizingNode.startH+dy));if(snap){w=Math.round(w/grid)*grid;h=Math.round(h/grid)*grid}n.w=w;n.h=h;const el=nodeLayer.querySelector(`.node[data-id="${CSS.escape(String(n.id))}"]`);if(el){el.style.width=w+'px';el.style.height=h+'px';el.classList.add('resized-node')}renderEdges([n.id]);(state.groups||[]).filter(g=>g.nodeIds.includes(n.id)).forEach(g=>updateGroupGeometry(g.id));scheduleMinimapRender();return true}
  function finishNodeResize(){if(!resizingNode)return;const r=resizingNode;resizingNode=null;nodeLayer.querySelector(`.node[data-id="${CSS.escape(String(r.id))}"]`)?.classList.remove('resizing-node');if(r.moved){saveState();render()}else render()}
  function resetNodeSize(id){const n=state.nodes.find(x=>x.id===id);if(!n)return;if(n.locked){showToast('节点已锁定，先解锁再恢复尺寸');return}snapshot('重置节点尺寸');n.w=n.type==='script'?310:n.type==='director'?420:320;n.h=null;saveState();render();showToast('节点尺寸已恢复默认')}

  function autoPanForPointer(clientX,clientY){const r=viewport.getBoundingClientRect(),edge=46,max=18;let dx=0,dy=0;if(clientX<r.left+edge)dx=max*(1-(clientX-r.left)/edge);else if(clientX>r.right-edge)dx=-max*(1-(r.right-clientX)/edge);if(clientY<r.top+edge)dy=max*(1-(clientY-r.top)/edge);else if(clientY>r.bottom-edge)dy=-max*(1-(r.bottom-clientY)/edge);if(dx||dy){state.viewport.x+=dx;state.viewport.y+=dy;scheduleViewportTransform();return true}return false}

  function handleNodeDragMove(e){
    if(!dragging)return false;
    if(dragging.pointerId!=null&&e.pointerId!==dragging.pointerId)return false;
    // If the browser reports that the primary button is no longer held, terminate the
    // drag immediately. This is the safety net that prevents a node from "sticking"
    // to the cursor after mouseup was delivered outside/rebuilt DOM.
    if(typeof e.buttons==='number'&&(e.buttons&1)===0){finishNodeDrag();return false;}
    const distance=Math.hypot(e.clientX-dragging.startClient.x,e.clientY-dragging.startClient.y);
    if(!dragging.moved&&distance<4)return true;
    autoPanForPointer(e.clientX,e.clientY);
    if(!dragging.snapshotted){snapshot();dragging.snapshotted=true;}
    dragging.moved=true;
    const p=screenToWorld(e.clientX,e.clientY),ids=dragging.ids||[dragging.id],rawDx=p.x-dragging.startWorld.x,rawDy=p.y-dragging.startWorld.y,sn=snapDragDelta(ids,dragging.starts,rawDx,rawDy,e.altKey);
    ids.forEach(id=>{const node=state.nodes.find(n=>n.id===id),st=dragging.starts?.[id];if(node&&st){node.x=st.x+sn.dx;node.y=st.y+sn.dy}});showAlignmentGuides(sn.guides);
    updateDraggedNodeDom();
    return true;
  }

  function finishNodeDrag(){
    if(!dragging)return;
    const finished={...dragging};
    const moved=finished.moved;
    dragging=null;clearAlignmentGuides();scheduleMinimapRender();
    if(moved){saveState();expandedNodeId=null;}else if(finished.additive){
      // Shift-click is a true multi-select action. Do not collapse the selection on pointerup.
      expandedNodeId=null;
      state.nodes.forEach(n=>n.selected=n.id===selectedId);
    }else{const clicked=state.nodes.find(n=>n.id===finished.id);expandedNodeId=clicked&&uiV23NodeContentState(clicked)==='empty'?finished.id:null;selectedId=finished.id;state.selectedIds=[finished.id];state.nodes.forEach(n=>n.selected=n.id===finished.id);}
    render();
  }

  function isCanvasBlankTarget(target){return !target?.closest?.('.node')&&!target?.closest?.('.canvas-group')&&!target?.closest?.('.node-toolbar')&&!target?.closest?.('.generator-panel');}

  viewport.addEventListener('pointermove',e=>{if(panning){state.viewport.x=panning.startX+(e.clientX-panning.px);state.viewport.y=panning.startY+(e.clientY-panning.py);scheduleViewportTransform();scheduleVirtualizationRefresh();return}if(marquee)updateMarquee(e)});
  viewport.addEventListener('pointerup',()=>{if(panning){panning=null;viewport.classList.remove('panning');queueViewportSave();render()}if(marquee)finishMarquee()});
  window.addEventListener('pointermove',e=>{
    if(resizingNode){handleNodeResizeMove(e);return;}
    if(groupDragging){handleGroupDragMove(e);return;}
    if(dragging){handleNodeDragMove(e);return;}
    if(edgeReconnect){if(edgeReconnect.pointerId!=null&&e.pointerId!==edgeReconnect.pointerId)return;e.preventDefault();autoPanForPointer(e.clientX,e.clientY);drawEdgeReconnect(e.clientX,e.clientY);return;}
    if(!connectingFrom)return;
    if(connectingPointerId!=null&&e.pointerId!==connectingPointerId)return;
    e.preventDefault();autoPanForPointer(e.clientX,e.clientY);drawTempEdge(e.clientX,e.clientY);
  },{passive:false});
  // Blank connection releases must not rely only on bubble-phase pointerup.
  window.addEventListener('pointerup',e=>{
    if(!connectingFrom)return;
    if(connectingPointerId!=null&&e.pointerId!==connectingPointerId)return;
    const release={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY};
    queueMicrotask(()=>{if(connectingFrom)finishConnectionPointerUp(release)});
  },true);

  window.addEventListener('pointerup',e=>{
    if(resizingNode&&(resizingNode.pointerId==null||e.pointerId===resizingNode.pointerId)){finishNodeResize();return;}
    if(groupDragging&&(groupDragging.pointerId==null||e.pointerId===groupDragging.pointerId)){finishGroupDrag();return;}
    if(dragging&&(dragging.pointerId==null||e.pointerId===dragging.pointerId)){finishNodeDrag();return;}
    if(edgeReconnect&&(edgeReconnect.pointerId==null||e.pointerId===edgeReconnect.pointerId)){const target=findReconnectTarget(e.clientX,e.clientY,edgeReconnect.end);if(target){completeEdgeReconnect(target.id);return}cleanupEdgeReconnect();return;}
    if(finishConnectionPointerUp(e))return;
  });
  window.addEventListener('pointercancel',e=>{
    if(groupDragging&&(groupDragging.pointerId==null||e.pointerId===groupDragging.pointerId))finishGroupDrag();
    if(dragging&&(dragging.pointerId==null||e.pointerId===dragging.pointerId))finishNodeDrag();
    if(edgeReconnect)cleanupEdgeReconnect();
    if(connectingFrom)cleanupConnectionDrag();
  });
  window.addEventListener('blur',()=>{
    if(groupDragging)finishGroupDrag();
    if(dragging)finishNodeDrag();
    if(edgeReconnect)cleanupEdgeReconnect();
    if(connectingFrom)cleanupConnectionDrag();
  });
  viewport.addEventListener('pointerdown',e=>{
    hideMenus();selectedEdgeId=null;renderEdges();
    if(e.button===1 || e.code==='Space' || window.__spaceDown || (e.button===0 && currentInteractionMode()==='grab')){ if(startViewportPan(e)) return; }
    if(e.button===0 && isCanvasBlankTarget(e.target)){const additive=!!(e.shiftKey||e.ctrlKey||e.metaKey),baseIds=additive?currentSelectionIds():[];expandedNodeId=null;selectedGroupId=null;marquee={x:e.clientX,y:e.clientY,cx:e.clientX,cy:e.clientY,baseIds,additive,active:false,previewIds:[...baseIds]};selectionRect.classList.add('hidden');}
  });
  viewport.addEventListener('dblclick',e=>{ if(!isCanvasBlankTarget(e.target)) return; const p=screenToWorld(e.clientX,e.clientY); showQuickAdd(e.clientX,e.clientY,p); });
  viewport.addEventListener('contextmenu',e=>{ if(!isCanvasBlankTarget(e.target)) return; e.preventDefault(); const p=screenToWorld(e.clientX,e.clientY); showCanvasContext(e.clientX,e.clientY,p); });
  viewport.addEventListener('wheel',e=>{e.preventDefault();const rect=viewport.getBoundingClientRect();if(!e.ctrlKey&&!e.metaKey&&Math.abs(e.deltaX)+Math.abs(e.deltaY)<140){state.viewport.x-=e.deltaX;state.viewport.y-=e.deltaY;scheduleViewportTransform();scheduleVirtualizationRefresh();queueViewportSave();return}const old=state.viewport.zoom,next=Math.max(.1,Math.min(8,old*Math.exp(-e.deltaY*.0014))),sx=e.clientX-rect.left,sy=e.clientY-rect.top,wx=(sx-state.viewport.x)/old,wy=(sy-state.viewport.y)/old;state.viewport.zoom=next;state.viewport.x=sx-wx*next;state.viewport.y=sy-wy*next;scheduleViewportTransform();scheduleVirtualizationRefresh(true);queueViewportSave()}, {passive:false});

  function marqueeHits(){if(!marquee)return[];const a=screenToWorld(marquee.x,marquee.y),b=screenToWorld(marquee.cx,marquee.cy),r={left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)},contain=marquee.cx>=marquee.x;return state.nodes.filter(n=>!nodeHiddenByCollapsedGroup(n.id)).filter(n=>{const nr=nodeRect(n);return contain?(nr.left>=r.left&&nr.right<=r.right&&nr.top>=r.top&&nr.bottom<=r.bottom):rectIntersects(nr,r)}).map(n=>n.id)}
  function updateMarquee(e){
    if(!marquee)return;marquee.cx=e.clientX;marquee.cy=e.clientY;const dx=marquee.cx-marquee.x,dy=marquee.cy-marquee.y,dist=Math.hypot(dx,dy);if(!marquee.active&&dist<4)return;marquee.active=true;const x=Math.min(marquee.x,marquee.cx),y=Math.min(marquee.y,marquee.cy),w=Math.abs(dx),h=Math.abs(dy),contain=dx>=0;selectionRect.classList.remove('hidden');selectionRect.classList.toggle('crossing',!contain);selectionRect.style.left=x+'px';selectionRect.style.top=y+'px';selectionRect.style.width=w+'px';selectionRect.style.height=h+'px';if(marqueePreviewFrame)return;marqueePreviewFrame=requestAnimationFrame(()=>{marqueePreviewFrame=0;if(!marquee)return;const hits=marqueeHits(),set=new Set(marquee.additive?[...marquee.baseIds,...hits]:hits);marquee.previewIds=[...set];selectionRect.dataset.count=String(set.size);selectionRect.dataset.mode=marquee.cx>=marquee.x?'包含选择':'交叉选择';$$('.node',nodeLayer).forEach(el=>el.classList.toggle('marquee-preview',set.has(el.dataset.id)))})
  }
  function finishMarquee(){
    if(!marquee)return;const m=marquee;if(!m.active){if(!m.additive){state.selectedIds=[];selectedId=null;expandedNodeId=null}else{state.selectedIds=[...m.baseIds];selectedId=state.selectedIds.at(-1)||null}}else{state.selectedIds=[...(m.previewIds||[])];selectedId=state.selectedIds.at(-1)||null;if(state.selectedIds.length>1)showToast(`已框选 ${state.selectedIds.length} 个节点 · ${m.cx>=m.x?'包含选择':'交叉选择'}`)}marquee=null;$$('.node.marquee-preview',nodeLayer).forEach(el=>el.classList.remove('marquee-preview'));selectionRect.classList.add('hidden');delete selectionRect.dataset.count;delete selectionRect.dataset.mode;render();
  }
  function cancelMarquee(){if(!marquee)return;state.selectedIds=[...(marquee.baseIds||[])];selectedId=state.selectedIds.at(-1)||null;marquee=null;$$('.node.marquee-preview',nodeLayer).forEach(el=>el.classList.remove('marquee-preview'));selectionRect.classList.add('hidden');render()}

  function selectNode(id,additive=false){selectedEdgeId=null;if(expandedNodeId&&expandedNodeId!==id)expandedNodeId=null;selectedGroupId=null;if(additive){const set=new Set(state.selectedIds||[]);if(set.has(id))set.delete(id);else set.add(id);state.selectedIds=[...set];selectedId=state.selectedIds.at(-1)||null}else{state.selectedIds=[id];selectedId=id}const target=state.nodes.find(n=>n.id===selectedId);if(target?.type==='text'&&target.textInputMode==='manual')expandedNodeId=null;state.nodes.forEach(n=>n.selected=n.id===selectedId);render()}
  function currentSelectionIds(fallbackId=null){const ids=(state.selectedIds||[]).filter(id=>state.nodes.some(n=>n.id===id));if(ids.length)return ids;if(fallbackId&&state.nodes.some(n=>n.id===fallbackId))return[fallbackId];if(selectedId&&state.nodes.some(n=>n.id===selectedId))return[selectedId];return[]}
  function deleteSelection(fallbackId=null){
    const ids=currentSelectionIds(fallbackId);if(!ids.length)return;
    const locked=ids.filter(id=>state.nodes.find(n=>n.id===id)?.locked),editable=ids.filter(id=>!locked.includes(id));
    if(!editable.length){showToast('选中节点均已锁定，未执行删除');return}
    snapshot('删除节点');editable.forEach(deleteNodeSilent);
    state.selectedIds=locked;selectedId=locked[0]||null;selectedGroupId=null;
    if(editable.includes(expandedNodeId))expandedNodeId=null;
    saveState();render();
    showToast(locked.length?`已删除 ${editable.length} 个节点，跳过 ${locked.length} 个锁定节点`:`已删除 ${editable.length} 个节点`)
  }
  function deleteNode(id){deleteSelection(id)}
  function copySelection(fallbackId=null){
    const ids=currentSelectionIds(fallbackId);if(!ids.length)return false;const set=new Set(ids),nodes=state.nodes.filter(n=>set.has(n.id)).map(deepClone),edges=state.edges.filter(e=>set.has(e.source)&&set.has(e.target)).map(deepClone),groups=(state.groups||[]).filter(g=>g.nodeIds.every(id=>set.has(id))).map(deepClone),b=sceneBounds(ids),assets=clipboardAssetDependencies(nodes,edges,groups);nodes.forEach(n=>{n.x-=b.left;n.y-=b.top;n.selected=false});persistCanvasClipboard({schema:'canvas-studio.graph-fragment',version:3,sourceProjectId:state.projectId||'',sourceProjectName:state.projectName||'',copiedAt:Date.now(),nodes,edges,groups,assets,width:b.width,height:b.height});showToast(`已复制 ${ids.length} 个节点 · ${edges.length} 条内部连线 · 可跨画布粘贴`);return true
  }
  function pasteClipboard(atWorld=null){
    const clip=clipboard||loadCanvasClipboard();if(!clip?.nodes?.length)return false;snapshot('跨画布粘贴');const assetMap=new Map();for(const src of (clip.assets||[])){const existing=(state.assets||[]).find(a=>a.id===src.id);if(existing){assetMap.set(src.id,src.id);continue}const a=deepClone(src),old=a.id;a.id=uid('a');a.importedFrom={projectId:clip.sourceProjectId||'',projectName:clip.sourceProjectName||'',assetId:old};state.assets.unshift(a);assetMap.set(old,a.id)}
    const map=new Map(),center=atWorld||screenToWorld(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+viewport.clientHeight/2),baseX=center.x-(clip.width||320)/2,baseY=center.y-(clip.height||220)/2,ids=[];for(const src0 of clip.nodes){const src=remapDeepIds(src0,assetMap),n=deepClone(src),old=n.id;n.id=uid('n');map.set(old,n.id);n.x=baseX+Number(n.x||0);n.y=baseY+Number(n.y||0);n.selected=false;state.nodes.push(n);ids.push(n.id)}
    const combined=new Map([...assetMap,...map]);for(const e0 of (clip.edges||[])){const e=remapDeepIds(e0,combined);if(map.has(e0.source)&&map.has(e0.target))state.edges.push({...e,id:uid('e'),source:map.get(e0.source),target:map.get(e0.target)})}for(const g0 of (clip.groups||[])){const g=remapDeepIds(g0,combined),nodeIds=(g0.nodeIds||[]).map(id=>map.get(id)).filter(Boolean);if(nodeIds.length>1)state.groups.push({...g,id:uid('g'),nodeIds})}
    state.selectedIds=ids;selectedId=ids[0]||null;selectedGroupId=null;saveState();render();showToast(`已从「${clip.sourceProjectName||'其他画布'}」粘贴 ${ids.length} 个节点${(clip.assets||[]).length?` · ${(clip.assets||[]).length} 个资产依赖`:''}`);return true
  }
  function cloneGraphFragment(ids,{offset=60,keepIncomingToRoots=false,roots=ids,label='复制节点'}={}){
    ids=[...new Set(ids)].filter(id=>state.nodes.some(n=>n.id===id));if(!ids.length)return[];snapshot(label);const set=new Set(ids),rootSet=new Set(roots),map=new Map(),newIds=[];state.nodes.filter(n=>set.has(n.id)).forEach(src=>{const n=deepClone(src);map.set(src.id,n.id=uid('n'));n.x+=offset;n.y+=offset;n.selected=false;state.nodes.push(n);newIds.push(n.id)});for(const e of [...state.edges]){const internal=set.has(e.source)&&set.has(e.target),incoming=keepIncomingToRoots&&!set.has(e.source)&&rootSet.has(e.target);if(!internal&&!incoming)continue;const cp=deepClone(e);cp.id=uid('e');if(map.has(cp.source))cp.source=map.get(cp.source);if(map.has(cp.target))cp.target=map.get(cp.target);state.edges.push(cp)};(state.groups||[]).filter(g=>(g.nodeIds||[]).every(id=>set.has(id))).forEach(g=>state.groups.push({...deepClone(g),id:uid('g'),nodeIds:g.nodeIds.map(id=>map.get(id)).filter(Boolean),title:(g.title||'组')+' 副本'}));state.selectedIds=newIds;selectedId=newIds[0]||null;selectedGroupId=null;saveState();render();return newIds
  }
  function duplicateSelection(fallbackId=null,keepEdges=false){const ids=currentSelectionIds(fallbackId);const out=cloneGraphFragment(ids,{offset:60,keepIncomingToRoots:Boolean(keepEdges),roots:ids,label:keepEdges?'副本（保留输入）':'复制节点'});if(out.length)showToast(keepEdges?`已创建副本 · 保留上游输入与内部连线`:`已复制 ${out.length} 个节点`);return out}
  function duplicateNode(id,keepEdges=false){return duplicateSelection(id,keepEdges)}
  function downstreamClosure(seedIds){const out=new Set(seedIds),q=[...seedIds];while(q.length){const id=q.shift();for(const e of state.edges){if(e.source===id&&!out.has(e.target)){out.add(e.target);q.push(e.target)}}}return [...out]}
  function duplicateBranch(fallbackId=null){const roots=currentSelectionIds(fallbackId);if(!roots.length)return[];const ids=downstreamClosure(roots),out=cloneGraphFragment(ids,{offset:72,keepIncomingToRoots:true,roots,label:'复制整个下游分支'});if(out.length)showToast(`已复制完整分支 · ${ids.length} 个节点 · 上游输入继续共用`);return out}
  function createAssetsFromSelection(fallbackId=null){const ids=currentSelectionIds(fallbackId);if(!ids.length)return;snapshot('创建资产');ids.forEach(id=>{const n=state.nodes.find(x=>x.id===id);if(n)state.assets.unshift(assetFromNode(n,(n.title||labelForType(n.type))+' 资产'))});saveState();showToast(`已创建 ${ids.length} 个资产`);if(!drawer.classList.contains('hidden'))renderDrawer('asset')}
  function assetFromNode(n,title){const snap=JSON.parse(JSON.stringify(n));delete snap.selected;delete snap.taskProgress;delete snap.taskError;return{id:uid('a'),title:title||n.title+' 资产',kind:labelForType(n.type),type:n.type,folder:'未分类',theme:n.content||'city',mediaUrl:n.outputUrl||'',text:n.text||n.generatedText||'',prompt:n.prompt||'',providerId:n.providerId||'',modelId:n.modelId||'',modelName:n.modelName||'',parameters:{aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,...(n.toolParams||{})},snapshot:snap,versions:n.outputUrl?[{id:uid('ver'),url:n.outputUrl,prompt:n.prompt||'',createdAt:new Date().toISOString()}]:[],createdAt:new Date().toISOString()};}
  function assetToCanvasNode(a,p=null){const src=a.snapshot?deepClone(a.snapshot):{type:a.type||'image',title:a.title,outputUrl:a.mediaUrl||'',text:a.text||'',prompt:a.prompt||'',providerId:a.providerId||'',modelId:a.modelId||'',modelName:a.modelName||''};src.id=uid('n');const center=p||screenToWorld(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+viewport.clientHeight/2);src.x=center.x;src.y=center.y;src.selected=false;src.outputUrl=a.mediaUrl||src.outputUrl||'';src.assetSourceId=a.id;return src}
  function useAsset(a,p=null){runTransaction('资产发送到画布',()=>{const src=assetToCanvasNode(a,p);state.nodes.push(src);selectedId=src.id;state.selectedIds=[src.id]});saveState();render();showToast('资产已发送到画布');}
  function openAssetDetail(a){modalShell('资产 · '+a.title,`<div class="asset-detail"><div class="asset-preview">${a.mediaUrl?`<img src="${escapeAttr(a.mediaUrl)}">`:`<div style="background:${themeBg(a.theme)}"></div>`}</div><div class="feature-grid">${field('名称',`<input id="assetTitle" value="${escapeAttr(a.title)}">`)}${field('文件夹',`<input id="assetFolder" value="${escapeAttr(a.folder||'未分类')}">`)}${field('类型',`<input value="${escapeAttr(a.kind||labelForType(a.type))}" disabled>`)}${field('提示词',`<textarea id="assetPrompt" rows="5">${escapeHtml(a.prompt||'')}</textarea>`,true)}</div><h3>版本</h3><div class="asset-version-list">${(a.versions||[]).map(v=>`<button data-asset-version="${v.id}">${v.url?`<img src="${escapeAttr(v.url)}">`:''}<span>${new Date(v.createdAt).toLocaleString()}</span></button>`).join('')||'<div class="feature-empty">暂无版本</div>'}</div><div class="feature-actions"><button id="deleteAsset" class="danger">删除资产</button><button id="saveAssetMeta">保存</button><button id="useAsset" class="primary">发送到画布</button></div></div>`,{wide:true});$('#saveAssetMeta').onclick=()=>{a.title=$('#assetTitle').value.trim()||a.title;a.folder=$('#assetFolder').value.trim()||'未分类';a.prompt=$('#assetPrompt').value;saveState();closeFeatureModal();renderDrawer('asset');showToast('资产已保存')};$('#useAsset').onclick=()=>{useAsset(a);closeFeatureModal()};$('#deleteAsset').onclick=()=>{if(confirm('删除这个资产？')){state.assets=state.assets.filter(x=>x.id!==a.id);saveState();closeFeatureModal();renderDrawer('asset')}};$$('[data-asset-version]',featureModal).forEach(b=>b.onclick=()=>{const v=(a.versions||[]).find(x=>x.id===b.dataset.assetVersion);if(v?.url){a.mediaUrl=v.url;saveState();openAssetDetail(a)}})}
  function createAsset(n){const title=prompt('资产名称',n.title+' 资产');if(!title)return;snapshot();state.assets.unshift(assetFromNode(n,title));saveState();showToast('已保存完整节点、媒体、提示词和模型参数到资产');renderDrawer('asset');}


  function screenToWorld(x,y){ const rect=viewport.getBoundingClientRect(); return {x:(x-rect.left-state.viewport.x)/state.viewport.zoom,y:(y-rect.top-state.viewport.y)/state.viewport.zoom}; }

  function addNode(type,worldPt,silent=false){
    snapshot(); const same=state.nodes.length+1;const n={id:uid('n'),type,x:worldPt.x,y:worldPt.y,w:(type==='image'||type==='video')?MEDIA_NODE_DISPLAY_WIDTH:type==='script'?310:type==='director'?420:320,title:`${defaultNodeName(type)} ${same}`,prompt:'',providerId:'',modelId:'',modelName:'',selected:false};
    if(type==='text'){n.text='';n.generatedText='';n.textHtml='';n.textInputMode='ai';n.textEditing=false;n.textEditorExpanded=false}
    if(type==='image'||type==='video') n.content=''; if(type==='script') ensureScriptData(n); if(type==='director') ensureDirectorData(n); ensureDefaultModel(n);state.nodes.push(n); selectNode(n.id); saveState(); if(!silent)showToast('已创建'+labelForType(type)+'节点');return n;
  }

  function openLocalUpload(p){
    const input=document.createElement('input');input.type='file';input.multiple=true;input.accept='image/*,video/*,audio/*';input.onchange=()=>[...(input.files||[])].forEach((f,i)=>importLocalFile(f,{x:p.x+i*34,y:p.y+i*34}));input.click();
  }
  async function importLocalFile(f,p,{deferRender=false}={}){
    const t=f.type.startsWith('video')?'video':f.type.startsWith('audio')?'audio':'image';snapshot('导入本地素材');const blobUrl=URL.createObjectURL(f);const n={id:uid('n'),type:t,x:p.x,y:p.y,w:t==='image'?620:320,title:f.name,prompt:'',providerId:'',modelId:'',modelName:'',selected:false,outputUrl:blobUrl,localFileName:f.name,localMime:f.type,content:'',uploading:backendOnline};state.nodes.push(n);state.selectedIds=[n.id];selectedId=n.id;if(!deferRender){saveState();render();showToast('已导入 '+f.name)};
    if(backendOnline){try{const res=await fetch('/api/upload?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':f.type||'application/octet-stream'},body:f});const out=await res.json();if(!res.ok)throw new Error(out.error||'上传失败');n.outputUrl=out.url;n.serverMedia=true;n.uploading=false;URL.revokeObjectURL(blobUrl);if(!deferRender){saveState();render();showToast('本地素材已保存到项目，可使用本地剪辑工具')}}catch(e){n.uploading=false;if(!deferRender){saveState();render();showToast('服务器保存失败，当前素材仅本次会话可用')}}}return n;
  }
  async function importLocalFilesGrid(files,p){files=[...files].filter(f=>f&&/^(image|video|audio)\//.test(f.type||''));if(!files.length)return;const cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(files.length)))),ids=[];await runTransactionAsync(`导入 ${files.length} 个本地素材`,async()=>{for(let i=0;i<files.length;i++){const n=await importLocalFile(files[i],{x:p.x+(i%cols)*354,y:p.y+Math.floor(i/cols)*272},{deferRender:true});if(n)ids.push(n.id)}});state.selectedIds=ids;selectedId=ids[0]||null;saveState();render();showToast(`已导入 ${ids.length} 个素材 · 自动网格排列`)}
  function canLocalProcess(n){return backendOnline&&typeof n?.outputUrl==='string'&&n.outputUrl.startsWith('/media/');}
  async function localMediaProcess(n,operation,params={}){return apiJson('/api/media/process',{method:'POST',body:JSON.stringify({sourceUrl:n.outputUrl,operation,params})});}
  function makeLocalResultNode(source,out,title,params={}){const type=out.type||source.type;const node=createDerivedNode(source,type,title,'',params);node.outputUrl=out.url||'';node.duration=out.duration||node.duration;node.providerId='';node.modelId='';node.modelName='本地处理';node.taskStatus='succeeded';recordNodeResultVersion(node);saveState();render();return node;}

  const NODE_PALETTE_ITEMS=[
    {type:'text',icon:'☰',label:'文本',keywords:'text prompt llm 文本 提示词'},
    {type:'image',icon:'▧',label:'图片',keywords:'image picture img 图片 图像'},
    {type:'video',icon:'▷',label:'视频',keywords:'video movie 视频'},
    {type:'smart-edit',baseType:'video',icon:'✂',label:'视频编辑',badge:'Beta',keywords:'smart edit video editor 视频编辑 智能剪辑'},
    {type:'director',baseType:'director',icon:'◇',label:'导演台',badge:'NEW',keywords:'director 3d camera 导演 摄像机'},
    {type:'frame-analysis',baseType:'video',icon:'▣',label:'逐帧拉片',badge:'SD 2.5',keywords:'analysis frame by frame shot video breakdown 逐帧拉片'},
    {type:'audio',icon:'≋',label:'音频',keywords:'audio music sound 音频 音乐'},
    {type:'script',icon:'▤',label:'脚本',keywords:'script storyboard shot 脚本 分镜',children:true},
    {type:'asset-library',baseType:'asset-library',icon:'◇',label:'素材库',keywords:'asset library 素材库 资源',children:true}
  ];
  function paletteCanvasActions(){return [
    {id:'paste',icon:'⌘V',label:'粘贴图片段',keywords:'paste clipboard 粘贴',enabled:()=>Boolean(clipboard||loadCanvasClipboard()),run:p=>pasteClipboard(p)},
    {id:'search',icon:'⌕',label:'搜索 / 定位节点',keywords:'find search 搜索 定位',run:()=>openCanvasSearch()},
    {id:'layout',icon:'↹',label:'自动整理画布',keywords:'layout arrange 排版 整理',run:()=>openAutoLayoutMenu()},
    {id:'toolbox',icon:'⌘',label:'打开我的工具箱',keywords:'workflow toolbox 工作流 工具箱',run:()=>renderDrawer('workflow')},
    {id:'upload',icon:'↑',label:'上传图片 / 视频 / 音频',keywords:'upload import media 上传 导入 素材',run:p=>openLocalUpload(p)},
    {id:'shortcuts',icon:'?',label:'快捷键面板',keywords:'shortcut keyboard 快捷键',run:()=>openShortcutHelp()}
  ]}
  function runPaletteNode(type,p,fromNodeId){const created=addNode(type,p,true);expandedNodeId=null;if(fromNodeId&&created){const edge=createEdge(fromNodeId,created.id,{type:'asset',silent:true});if(!edge)showToast('这个节点组合无法连接')}saveState();render();return created}
  function showCommandPalette(x,y,p,{fromNodeId=null,initialQuery=''}={}){
    const source=fromNodeId&&state.nodes.find(n=>n.id===fromNodeId),allowed=new Set(compatibleDownstreamTypes(source));let active=0,rows=[];
    setDockModeMenuOpen(false);
    contextMenu.style.left=Math.max(8,Math.min(x,window.innerWidth-360))+'px';contextMenu.style.top=Math.max(8,Math.min(y,window.innerHeight-430))+'px';contextMenu.classList.add('quick-add-menu','command-palette');contextMenu.classList.remove('hidden');contextMenu.innerHTML=`<div class="command-palette-head"><b>${source?`从「${escapeHtml(source.title||labelForType(source.type))}」继续`:'Command Palette'}</b><span>${source?'仅显示兼容节点':'Tab / ⌘K'}</span></div><input id="commandPaletteInput" class="command-palette-input" placeholder="搜索节点或命令…" value="${escapeAttr(initialQuery)}"><div class="command-palette-results" id="commandPaletteResults"></div>${!source?'<div class="command-palette-foot">提示：拖动节点输出端口到空白处，也会打开这个面板并自动过滤兼容节点。</div>':''}`;
    const input=$('#commandPaletteInput',contextMenu),results=$('#commandPaletteResults',contextMenu);
    const buildRows=()=>{const norm=String(input?.value||'').trim().toLowerCase(),nodes=NODE_PALETTE_ITEMS.filter(it=>(!source||allowed.has(it.type))&&(!norm||`${it.label} ${it.keywords}`.toLowerCase().includes(norm))),actions=source?[]:paletteCanvasActions().filter(a=>(!norm||`${a.label} ${a.keywords}`.toLowerCase().includes(norm))&&(!a.enabled||a.enabled()));return[...nodes.map(it=>({kind:'node',...it})),...actions.map(a=>({kind:'action',...a}))]};
    const execute=r=>{if(!r)return;if(r.kind==='node')runPaletteNode(r.type,p,fromNodeId);else r.run?.(p);contextMenu.classList.add('hidden');contextMenu.classList.remove('quick-add-menu','command-palette')};
    const drawResults=()=>{rows=buildRows();active=Math.max(0,Math.min(active,Math.max(0,rows.length-1)));results.innerHTML=rows.map((r,i)=>`<button class="command-palette-row ${i===active?'active':''}" data-palette-index="${i}"><i>${escapeHtml(r.icon||'•')}</i><span><b>${escapeHtml(r.label)}</b><small>${r.kind==='node'?(source?'创建并自动连线':'创建节点'):'画布命令'}</small></span><em>${i===active?'↵':''}</em></button>`).join('')||'<div class="command-palette-empty">没有匹配结果</div>';$$('[data-palette-index]',results).forEach(b=>b.onclick=()=>execute(rows[Number(b.dataset.paletteIndex)]))};
    input?.addEventListener('input',()=>{active=0;drawResults()});input?.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(rows.length-1,active+1);drawResults()}else if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,active-1);drawResults()}else if(e.key==='Enter'){e.preventDefault();execute(rows[active])}else if(e.key==='Escape'){e.preventDefault();hideMenus()}});drawResults();requestAnimationFrame(()=>input?.focus());
  }
  function showQuickAdd(x,y,p,fromNodeId=null,{preferAboveToolbar=false,fullMenu=false}={}){
    const source=(!fullMenu&&fromNodeId)?state.nodes.find(n=>n.id===fromNodeId):null,allowed=new Set(compatibleDownstreamTypes(source));
    setDockModeMenuOpen(false);
    const nodeItems=NODE_PALETTE_ITEMS.filter(it=>!source||allowed.has(it.baseType||it.type));
    const resourceItems=source?[]:[
      {id:'asset',icon:'◇',label:'素材库',run:()=>renderDrawer('asset')},
      {id:'upload',icon:'↥',label:'上传',run:point=>openLocalUpload(point)},
      {id:'history',icon:'♧',label:'从生成历史中选择',run:()=>renderDrawer('history')}
    ];
    const runItem=item=>{
      if(item.kind==='node'){
        if(item.type==='smart-edit'){
          const node=runPaletteNode('video',p,fromNodeId);
          if(node){node.title='视频编辑';saveState();render();setTimeout(()=>openVideoTool('智能剪辑',node),0)}
        }else if(item.type==='frame-analysis'){
          const node=runPaletteNode('video',p,fromNodeId);
          if(node){node.title='逐帧拉片';saveState();render();setTimeout(()=>openVideoTool('逐帧拉片',node),0)}
        }else if(item.type==='director'){
          const node=runPaletteNode('director',p,fromNodeId);
          if(node){node.title='导演台';saveState();render();setTimeout(()=>openDirectorConsole(node),0)}
        }else if(item.type==='asset-library'){
          renderDrawer('asset');
        }else{
          runPaletteNode(item.type,p,fromNodeId);
        }
      }else item.run?.(p);
      contextMenu.classList.add('hidden');
      contextMenu.classList.remove('quick-add-menu','libtv-add-menu','command-palette');
    };
    const row=item=>{
      const tag=item.badge?`<em class="libtv-badge ${item.badge==='NEW'?'cyan':'muted'}">${escapeHtml(item.badge)}</em>`:'';
      return `<button class="libtv-add-row" data-kind="${item.kind}" data-id="${escapeAttr(item.type||item.id)}"><i>${escapeHtml(item.icon||'＋')}</i><span>${escapeHtml(item.label)}</span>${tag}${item.children?'<b>›</b>':''}</button>`;
    };
    contextMenu.className='context-menu quick-add-menu libtv-add-menu';
    contextMenu.style.left=Math.max(12,Math.min(x,window.innerWidth-244))+'px';
    contextMenu.style.top=Math.max(12,Math.min(y,window.innerHeight-500))+'px';
    contextMenu.innerHTML=`<div class="libtv-add-title">${source?`从「${escapeHtml(source.title||labelForType(source.type))}」继续`:'添加节点'}</div>${nodeItems.map(it=>row({kind:'node',...it,children:['script'].includes(it.type)})).join('')}${resourceItems.length?`<div class="libtv-add-title resource">添加资源</div>${resourceItems.map(it=>row({kind:'action',...it})).join('')}`:''}`;
    contextMenu.classList.remove('hidden');
    $$('[data-kind]',contextMenu).forEach(b=>b.onclick=()=>{const item=b.dataset.kind==='node'?nodeItems.find(x=>x.type===b.dataset.id):resourceItems.find(x=>x.id===b.dataset.id);if(item)runItem({kind:b.dataset.kind,...item})});
    requestAnimationFrame(()=>{
      const r=contextMenu.getBoundingClientRect(),pad=12,dock=preferAboveToolbar?bottomDock?.getBoundingClientRect():null;
      if(dock&&r.bottom>dock.top-pad)contextMenu.style.top=Math.max(pad,dock.top-r.height-pad)+'px';
      else if(r.bottom>window.innerHeight-pad)contextMenu.style.top=Math.max(pad,window.innerHeight-r.height-pad)+'px';
      if(r.right>window.innerWidth-pad)contextMenu.style.left=Math.max(pad,window.innerWidth-r.width-pad)+'px';
    });
  }
  function showCanvasContext(x,y,p){ showQuickAdd(x,y,p); }
  function nodeContextPrimaryHtml(n,many){if(many||!n)return'';if(n.type==='image')return `<div class="menu-section-label">图片创作</div><button class="menu-item strong" data-act="image-studio">打开 Image Studio</button><button class="menu-item" data-act="image-storyboard">创建 Storyboard</button><button class="menu-item" data-act="image-video">创建图转视频节点</button><div class="menu-sep"></div>`;if(n.type==='video')return `<div class="menu-section-label">视频创作</div><button class="menu-item strong" data-act="video-studio">打开 Video Studio</button><button class="menu-item" data-act="video-analysis">逐帧拉片</button><button class="menu-item" data-act="video-compose">视频合成</button><div class="menu-sep"></div>`;if(n.type==='script')return `<div class="menu-section-label">脚本</div><button class="menu-item strong" data-act="script-studio">打开 Script Studio</button><button class="menu-item" data-act="script-storyboard">从脚本创建 Storyboard</button><div class="menu-sep"></div>`;if(n.type==='audio')return `<div class="menu-section-label">音频</div><button class="menu-item strong" data-act="audio-trim">截取 / 编辑音频</button><div class="menu-sep"></div>`;return''}
  function showContextMenu(x,y,id){
    const many=(state.selectedIds||[]).length>1,n=state.nodes.find(x=>x.id===id),failed=nodeTaskVisualState(n)==='failed',versions=nodeResultVersions(n).length,ids=currentSelectionIds(id),candidateCount=ids.filter(nid=>nodeResultVersions(state.nodes.find(x=>x.id===nid)).length).length;
    setDockModeMenuOpen(false);
    contextMenu.style.left=x+'px';contextMenu.style.top=y+'px';contextMenu.classList.remove('quick-add-menu','command-palette');contextMenu.innerHTML=`${nodeContextPrimaryHtml(n,many)}<div class="menu-section-label">复制与分支</div><button class="menu-item" data-act="dup">复制（不带外部连线）</button><button class="menu-item" data-act="clone-inputs">副本（保留上游输入）</button><button class="menu-item" data-act="clone-branch">复制完整下游分支</button><button class="menu-item" data-act="copy">复制到跨画布剪贴板</button><button class="menu-item" data-act="asset">${many?'批量创建资产':'创建资产'}</button>${!many?`<button class="menu-item" data-act="reset-size">恢复默认尺寸</button>${versions>1?`<button class="menu-item" data-act="compare-versions">对比 ${versions} 个生成结果</button>`:''}`:''}${candidateCount?`<button class="menu-item" data-act="batch-candidates">▦ 批量候选结果 (${candidateCount})</button>`:''}<div class="menu-sep"></div><button class="menu-item" data-act="lock">${ids.every(nid=>state.nodes.find(x=>x.id===nid)?.locked)?'🔓 解锁位置':'🔒 锁定位置'}</button><button class="menu-item" data-act="freeze">${ids.every(nid=>state.nodes.find(x=>x.id===nid)?.frozen)?'☀ 解除冻结':'❄ 冻结生成结果'}</button><button class="menu-item" data-act="priority">队列优先级 · ${priorityLabel(n?.queuePriority??state.workflowSettings?.defaultPriority)}</button>${!many&&['image','video','audio','text'].includes(n.type)?`<button class="menu-item" data-act="fallback-models">备用模型 · ${(n.fallbackModels||[]).length}</button>`:''}<div class="menu-sep"></div>${failed?`<button class="menu-item retry-emphasis" data-act="retry-downstream">↻ 失败节点重试并重跑下游</button>`:`<button class="menu-item" data-act="run-downstream">从此节点执行下游</button>`}<button class="menu-item" data-act="cost">生成前成本预估</button>${many?`<div class="menu-sep"></div><button class="menu-item" data-act="group">打组</button><button class="menu-item" data-act="storyboard">合并分镜组</button><button class="menu-item strong" data-act="workflow">保存到 My Toolbox</button><button class="menu-item" data-act="run-group">整组执行</button><button class="menu-item" data-act="layout">整理工作流分支</button>`:''}<div class="menu-sep"></div><button class="menu-item danger" data-act="delete" ${ids.some(nid=>state.nodes.find(x=>x.id===nid)?.locked)?'disabled':''}>删除</button>`;contextMenu.classList.remove('hidden');
    requestAnimationFrame(()=>{const r=contextMenu.getBoundingClientRect(),pad=8;if(r.right>window.innerWidth-pad)contextMenu.style.left=Math.max(pad,window.innerWidth-r.width-pad)+'px';if(r.bottom>window.innerHeight-pad)contextMenu.style.top=Math.max(pad,window.innerHeight-r.height-pad)+'px'});
    $$('[data-act]',contextMenu).forEach(b=>b.onclick=()=>{const act=b.dataset.act;if(act==='image-studio'){contextMenu.classList.add('hidden');openImageStudio(n);return}if(act==='image-storyboard'){contextMenu.classList.add('hidden');openStoryboardFromImage(n);return}if(act==='image-video'){snapshot('创建图转视频');const v=createDerivedNode(n,'video','图转视频',n.prompt||'保持主体与构图连续，自然运动',{operation:'image_to_video'},430);saveState();render();showToast('已创建图转视频节点');}if(act==='video-studio'){contextMenu.classList.add('hidden');openVideoStudio(n);return}if(act==='video-analysis'){contextMenu.classList.add('hidden');createVideoAnalysis(n,true);return}if(act==='video-compose'){contextMenu.classList.add('hidden');openVideoComposer(n);return}if(act==='script-studio'){contextMenu.classList.add('hidden');openScriptEditor(n);return}if(act==='script-storyboard'){contextMenu.classList.add('hidden');createStoryboardFromSource(n,{count:9,mode:'cinematic',concept:n.sourceText||'',ratio:'16:9'});return}if(act==='audio-trim'){contextMenu.classList.add('hidden');openAudioTool('截取',n);return}if(act==='dup')duplicateSelection(id,false);if(act==='clone-inputs')duplicateSelection(id,true);if(act==='clone-branch')duplicateBranch(id);if(act==='copy')copySelection(id);if(act==='asset'){if(many)createAssetsFromSelection(id);else createAsset(n)}if(act==='reset-size')resetNodeSize(id);if(act==='compare-versions')openNodeVersionCompare(n);if(act==='batch-candidates')openBatchCandidateView(ids);if(act==='cost')openCostDetails(ids);if(act==='lock'){snapshot('切换节点锁定');const lock=!ids.every(nid=>state.nodes.find(x=>x.id===nid)?.locked);ids.forEach(nid=>{const node=state.nodes.find(x=>x.id===nid);if(node)node.locked=lock});saveState();render();showToast(lock?'已锁定节点位置':'已解锁节点')}if(act==='freeze'){snapshot('切换节点冻结');const freeze=!ids.every(nid=>state.nodes.find(x=>x.id===nid)?.frozen);ids.forEach(nid=>{const node=state.nodes.find(x=>x.id===nid);if(node)node.frozen=freeze});saveState();render();showToast(freeze?'已冻结生成结果，工作流将直接复用':'已解除冻结')}if(act==='priority'){const current=nodePriority(n),v=prompt('队列优先级 0-100（80+ 高，50 普通，20- 低）',String(current));if(v!=null){const pr=Math.max(0,Math.min(100,Number(v)||0));ids.forEach(nid=>{const node=state.nodes.find(x=>x.id===nid);if(node)node.queuePriority=pr});saveState();showToast(`队列优先级：${priorityLabel(pr)} ${pr}`)}}if(act==='fallback-models'){contextMenu.classList.add('hidden');openFallbackModelPicker(n);return}if(act==='run-downstream')executeDownstream(id);if(act==='retry-downstream')rerunFailedDownstream(id);if(act==='group')createGroup(state.selectedIds,'工作流组','workflow');if(act==='storyboard')createGroup(state.selectedIds.filter(x=>state.nodes.find(n=>n.id===x)?.type==='image'),'分镜组','storyboard',{grid:'3x3',ratio:'16:9'});if(act==='workflow')saveWorkflowFromSelection();if(act==='run-group')executeSelectedGroup();if(act==='layout')openAutoLayoutMenu();if(act==='delete')deleteSelection(id);contextMenu.classList.add('hidden');});
  }

  function deleteNodeSilent(id){const target=state.nodes.find(n=>n.id===id);if(target?.locked)return;state.nodes=state.nodes.filter(n=>n.id!==id);state.edges=state.edges.filter(e=>e.source!==id&&e.target!==id);state.groups=(state.groups||[]).map(g=>({...g,nodeIds:g.nodeIds.filter(x=>x!==id)})).filter(g=>g.nodeIds.length>1)}


  const STORYBOARD_SHOT_SIZES=['超远景','远景','全景','中景','中近景','近景','特写','大特写'];
  const STORYBOARD_ANGLES=['平视','高机位','低机位','俯拍','仰拍','荷兰角','侧面','背面','过肩','POV'];
  const STORYBOARD_MOVES=['静止','推近','拉远','横移','摇摄','跟随','环绕','升镜','俯冲'];
  const STORYBOARD_MODES={cinematic:{label:'电影叙事',desc:'建立空间 → 人物关系 → 动作 → 情绪 → 细节'},action:{label:'动作覆盖',desc:'强调方向、连续动作、反应与冲击'},product:{label:'产品广告',desc:'Hero、功能、材质、使用、细节与品牌收口'},mv:{label:'MV / 情绪',desc:'节奏化构图、情绪特写与视觉变化'},coverage:{label:'标准 Coverage',desc:'主镜头、过肩、正反打、特写与细节覆盖'}};
  function storyboardMeta(g){if(!g)return null;g.meta=g.meta||{};g.meta.storyboard={version:1,mode:'cinematic',concept:'',frameOrder:[...(g.nodeIds||[])],releasedFrameIds:[],updatedAt:'',...(g.meta.storyboard||{})};const order=g.meta.storyboard.frameOrder=(g.meta.storyboard.frameOrder||[]).filter(id=>(g.nodeIds||[]).includes(id));for(const id of (g.nodeIds||[]))if(!order.includes(id))order.push(id);return g.meta.storyboard}
  function storyboardOrderedNodes(g){const meta=storyboardMeta(g);return (meta?.frameOrder||[]).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean)}
  function storyboardFrameData(node,index=0){node.toolParams=node.toolParams||{};node.toolParams.storyboardFrame={order:index,shotSize:STORYBOARD_SHOT_SIZES[Math.min(index,STORYBOARD_SHOT_SIZES.length-1)]||'中景',angle:'平视',movement:'静止',intent:'',...(node.toolParams.storyboardFrame||{})};return node.toolParams.storyboardFrame}
  function storyboardGridForCount(count){return count<=4?'2x2':count<=9?'3x3':count<=16?'4x4':'5x5'}
  function resizeStoryboardCapacity(g,count){
    if(!g||g.kind!=='storyboard')return{released:0,restored:0};count=[4,9,16,25].includes(Number(count))?Number(count):9;const ordered=storyboardOrderedNodes(g),meta=storyboardMeta(g),releasedIds=[...(meta.releasedFrameIds||[])].filter(id=>state.nodes.some(n=>n.id===id)&&!(g.nodeIds||[]).includes(id));let released=0,restored=0;
    if(ordered.length>count){const overflow=ordered.slice(count),keep=ordered.slice(0,count),b=groupBoundsRaw(g),startX=(b?.right||Math.max(...keep.map(n=>n.x+(n.w||250))))+90,startY=b?.top||keep[0]?.y||0;overflow.forEach((n,i)=>{n.x=startX+(i%4)*285;n.y=startY+Math.floor(i/4)*235;n.toolParams=n.toolParams||{};n.toolParams.storyboardReleasedFrom=g.id;n.toolParams.storyboardReleasedAt=Date.now();releasedIds.push(n.id)});g.nodeIds=keep.map(n=>n.id);meta.frameOrder=keep.map(n=>n.id);released=overflow.length}
    if((g.nodeIds||[]).length<count&&releasedIds.length){const room=count-g.nodeIds.length,toRestore=releasedIds.splice(0,room).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean);toRestore.forEach(n=>{g.nodeIds.push(n.id);meta.frameOrder.push(n.id);if(n.toolParams){delete n.toolParams.storyboardReleasedFrom;delete n.toolParams.storyboardReleasedAt}});restored=toRestore.length}
    meta.releasedFrameIds=[...new Set(releasedIds)];g.meta.capacity=count;g.meta.grid=storyboardGridForCount(count);meta.updatedAt=new Date().toISOString();layoutStoryboardGroup(g,{save:false,render:false});return{released,restored}
  }
  function storyboardRecipe(mode,count){
    const cinematic=[['建立镜头','远景','平视','静止','交代空间、时间和主体位置'],['主镜头','全景','平视','推近','建立主体与环境关系'],['人物中景','中景','平视','跟随','承接核心动作'],['过肩关系','中近景','过肩','静止','强化人物或主体关系'],['反应特写','近景','平视','推近','强调情绪与反应'],['低机位强调','中景','低机位','推近','增强力量与重要性'],['高机位变化','全景','高机位','横移','补充空间关系'],['侧面运动','中景','侧面','跟随','保持动作方向连续'],['关键细节','特写','平视','静止','捕捉关键手部、道具或产品细节'],['POV','中近景','POV','静止','提供主观视角'],['背面跟随','全景','背面','跟随','连接人物与前方空间'],['情绪大特写','大特写','平视','推近','强化情绪峰值'],['俯拍构图','远景','俯拍','静止','重新建立视觉秩序'],['荷兰角变化','中景','荷兰角','推近','制造不稳定或张力'],['剪影/轮廓','全景','低机位','静止','形成视觉记忆点'],['环境反应','远景','平视','拉远','让事件回到环境尺度'],['镜面/反射','中近景','侧面','静止','增加构图层次'],['微距细节','大特写','平视','静止','突出材质与微小信息'],['Hero Shot','中景','低机位','环绕','建立高潮画面'],['结束镜头','远景','背面','拉远','完成视觉收束'],['插入镜头','特写','俯拍','静止','补充关键叙事信息'],['逆反打','中近景','过肩','静止','完善双向覆盖'],['动态穿越','全景','平视','横移','增加节奏与空间运动'],['极近视觉','大特写','POV','推近','制造强烈感官细节'],['最终全景','远景','高机位','拉远','结束整段故事板']];
    const product=[['产品 Hero','中景','低机位','环绕','清晰展示产品整体轮廓与品牌识别'],['使用环境','全景','平视','推近','建立产品使用语境'],['功能动作','中近景','侧面','跟随','展示核心功能或操作'],['材质细节','大特写','平视','静止','展示材质、工艺、纹理'],['Logo 细节','特写','平视','推近','品牌标识清晰可读'],['手部交互','近景','POV','静止','展示真实使用方式'],['结构拆解','特写','俯拍','静止','展示结构与细节'],['生活方式','中景','平视','横移','将产品放入真实生活场景'],['最终 Packshot','中景','低机位','静止','干净品牌收口']];
    const action=[['建立方向','远景','平视','横移','先交代双方空间和运动方向'],['动作起势','全景','低机位','推近','动作开始'],['动作中段','中景','侧面','跟随','保持动作轴线'],['冲击点','近景','低机位','推近','突出动作碰撞'],['反应','特写','平视','静止','角色或主体反应'],['反向覆盖','全景','高机位','横移','重新交代空间'],['细节','大特写','POV','静止','关键物件或身体动作'],['追随','中景','背面','跟随','维持运动速度'],['收势','远景','平视','拉远','结束动作段落']];
    const mv=[['主视觉','远景','平视','静止','确立 MV 核心视觉'],['表演中景','中景','平视','推近','主体表演'],['情绪特写','特写','平视','推近','抓取情绪'],['侧面轮廓','中近景','侧面','横移','形成节奏变化'],['高机位图形','远景','俯拍','静止','强调画面图形感'],['低机位 Hero','中景','低机位','环绕','强化人物气场'],['POV 瞬间','近景','POV','静止','制造主观情绪'],['动态模糊','全景','荷兰角','横移','增加节奏冲击'],['收尾视觉','远景','背面','拉远','完成段落收束']];
    const coverage=[['主镜头','全景','平视','静止','完整覆盖场面'],['A 中景','中景','平视','静止','主体 A'],['B 中景','中景','平视','静止','主体 B'],['A 过肩','中近景','过肩','静止','A 看 B'],['B 过肩','中近景','过肩','静止','B 看 A'],['A 特写','特写','平视','静止','A 反应'],['B 特写','特写','平视','静止','B 反应'],['双人关系','全景','平视','推近','重新建立关系'],['细节插入','大特写','俯拍','静止','叙事细节']];
    const base=mode==='product'?product:mode==='action'?action:mode==='mv'?mv:mode==='coverage'?coverage:cinematic;return Array.from({length:count},(_,i)=>base[i%base.length]);
  }
  function ratioValue(r='16:9'){const [a,b]=String(r).split(':').map(Number);return a>0&&b>0?a/b:16/9}
  function layoutStoryboardGroup(g,{save=true,render=true}={}){if(!g||g.kind!=='storyboard')return;const nodes=storyboardOrderedNodes(g);if(!nodes.length)return;const meta=storyboardMeta(g),grid=String(g.meta?.grid||storyboardGridForCount(nodes.length)),m=grid.match(/(\d+)x(\d+)/i),cols=m?Math.max(1,Number(m[1])):Math.ceil(Math.sqrt(nodes.length)),ratio=ratioValue(g.meta?.ratio||'16:9'),anchorX=Math.min(...nodes.map(n=>n.x)),anchorY=Math.min(...nodes.map(n=>n.y)),w=250,h=Math.max(165,Math.min(245,w/ratio+58)),gapX=30,gapY=34;nodes.forEach((n,i)=>{n.x=anchorX+(i%cols)*(w+gapX);n.y=anchorY+Math.floor(i/cols)*(h+gapY);n.w=w;n.h=h;storyboardFrameData(n,i).order=i});meta.frameOrder=nodes.map(n=>n.id);meta.updatedAt=new Date().toISOString();if(save)saveState();if(render)render()}
  function makeStoryboardFrameNode(source,def,i,{concept='',mode='cinematic'}={}){const [label,shotSize,angle,movement,intent]=def,basePrompt=String(source.prompt||source.text||'').trim(),prompt=[basePrompt,concept,`Storyboard frame ${i+1}: ${label}`,`景别：${shotSize}`,`机位：${angle}`,`运镜意图：${movement}`,`画面目的：${intent}`,'保持主体身份、产品结构、服装、场景空间、光线逻辑与前后镜头连续'].filter(Boolean).join('。');return{id:uid('n'),type:'image',x:source.x+420+(i%5)*280,y:source.y+Math.floor(i/5)*220,w:250,h:190,title:`S${String(i+1).padStart(2,'0')} · ${label}`,prompt,content:'',providerId:source.type==='image'?(source.providerId||''):'',modelId:source.type==='image'?(source.modelId||''):'',modelName:source.type==='image'?(source.modelName||''):'',aspectRatio:source.aspectRatio||'16:9',toolParams:{operation:'storyboard_frame',storyboardSourceId:source.id,storyboardFrame:{order:i,shotSize,angle,movement,intent,label,mode}}}}
  function createStoryboardFromSource(source,{count=9,mode='cinematic',concept='',ratio='16:9'}={}){if(!source)return null;count=[4,9,16,25].includes(Number(count))?Number(count):9;return runTransaction('创建 Storyboard',()=>{const defs=storyboardRecipe(mode,count),ids=[];defs.forEach((def,i)=>{const n=makeStoryboardFrameNode(source,def,i,{concept,mode});n.aspectRatio=ratio;state.nodes.push(n);state.edges.push(makeSemanticEdge(source.id,n.id,'asset',source.type==='image'?'image_reference':source.type==='script'?'script_context':''));ids.push(n.id)});const g=createGroup(ids,`Storyboard · ${STORYBOARD_MODES[mode]?.label||'电影叙事'}`,'storyboard',{grid:storyboardGridForCount(count),ratio,capacity:count,sourceNodeId:source.id,storyboard:{mode,concept,frameOrder:[...ids],releasedFrameIds:[],sourceNodeId:source.id,updatedAt:new Date().toISOString()}});if(g){layoutStoryboardGroup(g,{save:false,render:false});saveState();render();setTimeout(()=>openStoryboardStudio(g.id),0)}return g})}
  function openStoryboardFromImage(n){const existing=(state.groups||[]).find(g=>g.kind==='storyboard'&&(g.nodeIds||[]).includes(n.id));if(existing)return openStoryboardStudio(existing.id);modalShell('创建 Storyboard Studio',`<div class="storyboard-create"><section><h3>从当前画面扩展故事板</h3><p>同一主体 / 产品 / 场景上下文会作为每一格的参考。系统生成的是可独立编辑的 Frame 节点，不是一张不可拆的宫格图片。</p></section><div class="storyboard-create-grid"><label>宫格数量<select id="sbCreateCount"><option value="4">4 宫格</option><option value="9" selected>9 宫格</option><option value="16">16 宫格</option><option value="25">25 宫格</option></select></label><label>创作模式<select id="sbCreateMode">${Object.entries(STORYBOARD_MODES).map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}</select></label><label>画幅<select id="sbCreateRatio"><option>16:9</option><option>9:16</option><option>1:1</option><option>4:3</option><option>3:4</option><option>21:9</option></select></label><label class="wide">创作意图<textarea id="sbCreateConcept" rows="4" placeholder="例如：15 秒香水广告，从环境氛围逐步推进到瓶身材质与最终 Hero Shot"></textarea></label></div><div class="storyboard-mode-preview" id="sbModePreview"></div><div class="feature-actions"><button id="sbCreateCancel">取消</button><button class="primary" id="sbCreateRun">创建可编辑 Storyboard</button></div></div>`,{wide:true});const draw=()=>{const mode=$('#sbCreateMode').value,c=Number($('#sbCreateCount').value),defs=storyboardRecipe(mode,Math.min(c,9));$('#sbModePreview').innerHTML=`<b>${STORYBOARD_MODES[mode].label}</b><span>${STORYBOARD_MODES[mode].desc}</span><div>${defs.map((d,i)=>`<i>${i+1}. ${escapeHtml(d[0])}</i>`).join('')}</div>`};$('#sbCreateMode').onchange=draw;$('#sbCreateCount').onchange=draw;draw();$('#sbCreateCancel').onclick=closeFeatureModal;$('#sbCreateRun').onclick=()=>{const opts={count:Number($('#sbCreateCount').value),mode:$('#sbCreateMode').value,ratio:$('#sbCreateRatio').value,concept:$('#sbCreateConcept').value.trim()};closeFeatureModal();createStoryboardFromSource(n,opts)}}
  function storyboardFrameCardHtml(n,index,selected=false){const f=storyboardFrameData(n,index),activeVersion=nodeResultVersions(n).find(v=>v.id===activeResultVersionId(n))||nodeResultVersions(n).at(-1),thumb=n.outputUrl||activeVersion?.outputUrl||'';return `<button class="storyboard-frame-card ${selected?'selected':''}" data-sb-frame="${n.id}" draggable="true"><span class="sb-frame-number">${String(index+1).padStart(2,'0')}</span><div class="sb-frame-thumb" ${thumb?`style="background-image:url('${escapeAttr(thumb)}')"`:''}>${thumb?'':'<i>等待生成</i>'}</div><div class="sb-frame-copy"><b>${escapeHtml(n.title||`Frame ${index+1}`)}</b><small>${escapeHtml(f.shotSize)} · ${escapeHtml(f.angle)} · ${escapeHtml(f.movement)}</small></div></button>`}
  function replaceStoryboardFrame(g,oldNode,{prompt='',operation='storyboard_replace',label='替换'}={}){if(!g||!oldNode)return null;const meta=storyboardMeta(g),order=[...meta.frameOrder],idx=order.indexOf(oldNode.id);if(idx<0)return null;snapshot(`${label}分镜`);const f={...storyboardFrameData(oldNode,idx)},n={id:uid('n'),type:'image',x:oldNode.x,y:oldNode.y,w:oldNode.w,h:oldNode.h,title:`S${String(idx+1).padStart(2,'0')} · ${label}版`,prompt:prompt||oldNode.prompt||'',content:'',providerId:oldNode.providerId||'',modelId:oldNode.modelId||'',modelName:oldNode.modelName||'',aspectRatio:oldNode.aspectRatio||g.meta?.ratio||'16:9',toolParams:{...(oldNode.toolParams||{}),operation,storyboardReplaces:oldNode.id,storyboardFrame:f}};state.nodes.push(n);state.edges.push(makeSemanticEdge(oldNode.id,n.id,'asset','image_reference'));state.edges.filter(e=>e.target===oldNode.id&&e.source!==oldNode.id).forEach(e=>{if(!state.edges.some(x=>x.source===e.source&&x.target===n.id&&x.role===e.role))state.edges.push({...e,id:uid('e'),target:n.id})});order[idx]=n.id;meta.frameOrder=order;g.nodeIds=g.nodeIds.map(id=>id===oldNode.id?n.id:id);oldNode.x+=46;oldNode.y+=46;oldNode.title=`旧版 · ${oldNode.title||`S${idx+1}`}`;meta.updatedAt=new Date().toISOString();saveState();render();return n}
  function extractStoryboardFrame(g,node){const meta=storyboardMeta(g),idx=meta.frameOrder.indexOf(node.id);snapshot('提取分镜单帧');const v=nodeResultVersions(node).find(v=>v.id===activeResultVersionId(node))||nodeResultVersions(node).at(-1),out={...deepClone(node),id:uid('n'),x:Math.max(...storyboardOrderedNodes(g).map(n=>n.x+(n.w||250)))+90,y:Math.min(...storyboardOrderedNodes(g).map(n=>n.y)),w:340,h:null,title:`提取 · S${String(idx+1).padStart(2,'0')} · ${node.title||'Frame'}`,selected:false,toolParams:{...(node.toolParams||{}),operation:'storyboard_extract',storyboardGroupId:g.id,sourceFrameId:node.id}};if(v){out.resultVersions=[deepClone(v)];out.resultVersions[0].id=uid('rv');out.activeResultVersionId=out.resultVersions[0].id}state.nodes.push(out);state.edges.push(makeSemanticEdge(node.id,out.id,'asset','image_reference'));saveState();render();showToast('单帧已提取为独立图片节点');return out}
  function storyboardToVideo(g,{frameIds=null,duration=5}={}){const frames=storyboardOrderedNodes(g).filter(n=>!frameIds||frameIds.includes(n.id));if(!frames.length)return showToast('没有可转换的分镜');return runTransaction('Storyboard 转视频',()=>{const vids=[],videoModel=availableModels('video')[0];frames.forEach((frame,i)=>{const f=storyboardFrameData(frame,i),v={id:uid('n'),type:'video',x:frame.x,y:Math.max(...storyboardOrderedNodes(g).map(n=>n.y+nodeHeight(n)))+110,w:310,title:`Video · ${String(i+1).padStart(2,'0')} · ${f.label||frame.title||'Shot'}`,prompt:[frame.prompt,`视频运动：${f.movement}`,`保持当前分镜构图、主体身份、场景连续性`].filter(Boolean).join('。'),providerId:videoModel?.providerId||'',modelId:videoModel?.id||'',modelName:videoModel?.name||'',aspectRatio:g.meta?.ratio||frame.aspectRatio||'16:9',duration:Number(duration)||5,videoMode:'frame2video',toolParams:{operation:'storyboard_to_video',storyboardGroupId:g.id,sourceFrameId:frame.id,shotSize:f.shotSize,angle:f.angle,movement:f.movement}};state.nodes.push(v);state.edges.push(makeSemanticEdge(frame.id,v.id,'asset','first_frame'));vids.push(v.id)});const vg=createGroup(vids,`${g.title||'Storyboard'} · Video Handoff`,'workflow',{sourceStoryboardId:g.id,sequenceOrder:[...vids]});saveState();render();showToast(`已创建 ${vids.length} 个视频节点 · 分镜顺序与首帧引用已保留`);return vg})}
  function openStoryboardStudio(groupId){const g=state.groups.find(x=>x.id===groupId);if(!g||g.kind!=='storyboard')return showToast('Storyboard 分镜组不存在');const meta=storyboardMeta(g),nodes=storyboardOrderedNodes(g);if(!nodes.length)return showToast('分镜组为空');let activeId=meta.selectedFrameId&&nodes.some(n=>n.id===meta.selectedFrameId)?meta.selectedFrameId:nodes[0].id;const redraw=()=>{const live=state.groups.find(x=>x.id===groupId);if(!live)return closeFeatureModal();const lm=storyboardMeta(live),ordered=storyboardOrderedNodes(live),active=ordered.find(n=>n.id===activeId)||ordered[0];activeId=active?.id||'';lm.selectedFrameId=activeId;const idx=ordered.findIndex(n=>n.id===activeId),f=active?storyboardFrameData(active,idx):{};featureModal.innerHTML=`<div class="feature-dialog full storyboard-studio-dialog"><div class="feature-head"><div><div class="feature-title">Storyboard Studio</div><div class="feature-subtitle">${escapeHtml(live.title||'Storyboard')} · ${ordered.length} Frames · ${escapeHtml(live.meta?.ratio||'16:9')} · 可独立提取 / 替换 / 精修 / 转视频</div></div><button class="feature-close">×</button></div><div class="feature-body storyboard-studio-body"><aside class="storyboard-studio-sidebar"><section><b>布局</b><div class="sb-segmented">${[4,9,16,25].map(c=>`<button data-sb-layout-count="${c}" class="${storyboardGridForCount(c)===live.meta.grid?'active':''}">${c}</button>`).join('')}</div><label>画幅<select id="sbStudioRatio">${['16:9','9:16','1:1','4:3','3:4','21:9'].map(r=>`<option ${r===live.meta.ratio?'selected':''}>${r}</option>`).join('')}</select></label><label>模式<select id="sbStudioMode">${Object.entries(STORYBOARD_MODES).map(([k,v])=>`<option value="${k}" ${k===lm.mode?'selected':''}>${v.label}</option>`).join('')}</select></label><label>创作意图<textarea id="sbStudioConcept" rows="4">${escapeHtml(lm.concept||'')}</textarea></label><button id="sbApplyLayout" class="primary">重新排布画布节点</button></section><section class="sb-frame-inspector"><b>Frame ${String(idx+1).padStart(2,'0')}</b><label>景别<select id="sbShotSize">${STORYBOARD_SHOT_SIZES.map(x=>`<option ${x===f.shotSize?'selected':''}>${x}</option>`).join('')}</select></label><label>机位<select id="sbAngle">${STORYBOARD_ANGLES.map(x=>`<option ${x===f.angle?'selected':''}>${x}</option>`).join('')}</select></label><label>运动<select id="sbMove">${STORYBOARD_MOVES.map(x=>`<option ${x===f.movement?'selected':''}>${x}</option>`).join('')}</select></label><label>镜头意图<textarea id="sbIntent" rows="3">${escapeHtml(f.intent||'')}</textarea></label><button id="sbSaveFrameMeta">保存镜头设计</button></section></aside><main class="storyboard-studio-main"><div class="storyboard-studio-toolbar"><span><b>${ordered.length}</b> Frames</span><button id="sbExtractFrame">提取单帧</button><button id="sbRefineFrame">精修并替换</button><button id="sbReplaceFrame">重新生成并替换</button><button id="sbFrameLeft">← 前移</button><button id="sbFrameRight">后移 →</button><span class="spacer"></span><label class="inline">每镜时长 <input id="sbVideoDuration" type="number" min="1" max="30" value="5">s</label><button id="sbToVideo" class="primary">Storyboard → Video</button></div><div class="storyboard-frame-grid grid-${escapeAttr(live.meta.grid||storyboardGridForCount(ordered.length))}" id="sbFrameGrid">${ordered.map((n,i)=>storyboardFrameCardHtml(n,i,n.id===activeId)).join('')}</div><div class="storyboard-bottom-strip"><b>Frame Prompt</b><textarea id="sbFramePrompt" rows="4">${escapeHtml(active?.prompt||'')}</textarea><span>Prompt 修改只影响当前 Frame；跨帧身份 / 场景引用继续由 v3.3 Creative Context 提供。</span></div></main></div></div>`;featureModal.classList.remove('hidden');$('.feature-close',featureModal).onclick=closeFeatureModal;featureModal.onpointerdown=e=>{if(e.target===featureModal)closeFeatureModal()};$$('[data-sb-frame]',featureModal).forEach(b=>{b.onclick=()=>{activeId=b.dataset.sbFrame;redraw()};b.ondragstart=e=>{e.dataTransfer.setData('text/sb-frame',b.dataset.sbFrame)};b.ondragover=e=>e.preventDefault();b.ondrop=e=>{e.preventDefault();const from=e.dataTransfer.getData('text/sb-frame'),to=b.dataset.sbFrame;if(!from||from===to)return;const order=[...lm.frameOrder],fi=order.indexOf(from),ti=order.indexOf(to);if(fi<0||ti<0)return;snapshot('调整分镜顺序');order.splice(ti,0,order.splice(fi,1)[0]);lm.frameOrder=order;live.nodeIds=[...order];layoutStoryboardGroup(live,{save:false,render:false});saveState();render();redraw()}});$$('[data-sb-layout-count]',featureModal).forEach(b=>b.onclick=()=>{$$('[data-sb-layout-count]',featureModal).forEach(x=>x.classList.remove('active'));b.classList.add('active');live.meta.pendingCapacity=Number(b.dataset.sbLayoutCount);live.meta.grid=storyboardGridForCount(live.meta.pendingCapacity);$('#sbFrameGrid').className=`storyboard-frame-grid grid-${live.meta.grid}`});$('#sbApplyLayout').onclick=()=>{snapshot('调整 Storyboard 布局');live.meta.ratio=$('#sbStudioRatio').value;const activeLayout=$('[data-sb-layout-count].active');let capResult={released:0,restored:0};if(activeLayout)capResult=resizeStoryboardCapacity(live,Number(activeLayout.dataset.sbLayoutCount));lm.mode=$('#sbStudioMode').value;lm.concept=$('#sbStudioConcept').value.trim();layoutStoryboardGroup(live,{save:false,render:false});saveState();render();showToast(capResult.released?`Storyboard 已缩减，${capResult.released} 个溢出 Frame 已释放到右侧`:capResult.restored?`Storyboard 已扩展并恢复 ${capResult.restored} 个之前释放的 Frame`:'Storyboard 布局已同步到画布');redraw()};$('#sbSaveFrameMeta').onclick=()=>{const n=state.nodes.find(n=>n.id===activeId),index=lm.frameOrder.indexOf(activeId);if(!n)return;const fd=storyboardFrameData(n,index);fd.shotSize=$('#sbShotSize').value;fd.angle=$('#sbAngle').value;fd.movement=$('#sbMove').value;fd.intent=$('#sbIntent').value.trim();n.prompt=$('#sbFramePrompt').value.trim();n.title=`S${String(index+1).padStart(2,'0')} · ${fd.label||fd.intent||'Frame'}`;lm.updatedAt=new Date().toISOString();saveState();render();showToast('当前镜头设计已保存');redraw()};$('#sbExtractFrame').onclick=()=>{const n=state.nodes.find(n=>n.id===activeId);if(n)extractStoryboardFrame(live,n)};const editReplace=(kind)=>{const n=state.nodes.find(n=>n.id===activeId);if(!n)return;const base=$('#sbFramePrompt').value.trim()||n.prompt||'',instruction=prompt(kind==='refine'?'输入精修要求':'输入重新生成要求',kind==='refine'?'保持构图和主体一致，优化手部、表情、材质和光影':'保持主体身份与场景连续，重新设计当前镜头构图');if(instruction===null)return;const next=replaceStoryboardFrame(live,n,{prompt:[base,instruction].filter(Boolean).join('。'),operation:kind==='refine'?'storyboard_refine':'storyboard_replace',label:kind==='refine'?'精修':'替换'});if(next){activeId=next.id;redraw()}};$('#sbRefineFrame').onclick=()=>editReplace('refine');$('#sbReplaceFrame').onclick=()=>editReplace('replace');const move=(dir)=>{const order=[...lm.frameOrder],i=order.indexOf(activeId),j=i+dir;if(i<0||j<0||j>=order.length)return;snapshot('调整分镜顺序');[order[i],order[j]]=[order[j],order[i]];lm.frameOrder=order;live.nodeIds=[...order];layoutStoryboardGroup(live,{save:false,render:false});saveState();render();redraw()};$('#sbFrameLeft').onclick=()=>move(-1);$('#sbFrameRight').onclick=()=>move(1);$('#sbToVideo').onclick=()=>{const duration=Number($('#sbVideoDuration').value)||5;closeFeatureModal();storyboardToVideo(live,{duration})}};redraw()}
  function openStoryboardCenter(){const groups=(state.groups||[]).filter(g=>g.kind==='storyboard'),selectedImage=state.nodes.find(n=>n.id===selectedId&&n.type==='image');modalShell('Storyboard Studio',`<div class="storyboard-center"><div class="storyboard-center-hero"><div><h3>从画面到可编辑多镜头 Storyboard</h3><p>4 / 9 / 16 / 25 宫格只是布局；每一格都是独立 Frame 节点，可继续生成、替换、精修和转视频。</p></div>${selectedImage?`<button id="sbCenterCreate" class="primary">从「${escapeHtml(selectedImage.title||'当前图片')}」创建</button>`:'<span>先选择一张图片，即可从当前画面创建 Storyboard</span>'}</div><div class="storyboard-center-list">${groups.map(g=>{const nodes=storyboardOrderedNodes(g),meta=storyboardMeta(g);return `<button data-open-sb="${g.id}"><i>▦</i><span><b>${escapeHtml(g.title||'Storyboard')}</b><small>${nodes.length} Frames · ${escapeHtml(g.meta?.ratio||'16:9')} · ${escapeHtml(STORYBOARD_MODES[meta.mode]?.label||meta.mode)}</small></span><em>打开 →</em></button>`}).join('')||'<div class="feature-empty">当前项目还没有 Storyboard</div>'}</div></div>`,{wide:true});$$('[data-open-sb]',featureModal).forEach(b=>b.onclick=()=>openStoryboardStudio(b.dataset.openSb));$('#sbCenterCreate')?.addEventListener('click',()=>{closeFeatureModal();openStoryboardFromImage(selectedImage)})}

  function showGroupMenu(x,y,groupId){
    const g=state.groups.find(x=>x.id===groupId);if(!g)return;const info=groupRunInfo(g),failedCount=Math.max(info?.failed||0,g.nodeIds.filter(id=>state.nodes.find(n=>n.id===id)?.taskStatus==='failed').length),candidateCount=g.nodeIds.filter(id=>nodeResultVersions(state.nodes.find(n=>n.id===id)).length).length,resumableRun=latestResumableRunForIds(g.nodeIds);contextMenu.style.left=x+'px';contextMenu.style.top=y+'px';
    const common=`<button class="menu-item" data-gact="candidates">▦ 批量候选结果${candidateCount?` (${candidateCount})`:''}</button><button class="menu-item" data-gact="cost">生成前成本预估</button><button class="menu-item" data-gact="lock">${g.locked?'🔓 解锁工作流组':'🔒 锁定工作流组'}</button><button class="menu-item" data-gact="freeze">${g.frozen?'☀ 解除整组冻结':'❄ 冻结整组结果'}</button>`;
    contextMenu.innerHTML=g.kind==='storyboard'?`<button class="menu-item storyboard-menu-primary" data-gact="studio">▦ 打开 Storyboard Studio</button><button class="menu-item" data-gact="collapse">${g.collapsed?'展开':'折叠'}分镜组</button>${common}<button class="menu-item" data-gact="ratio">比例切换</button><button class="menu-item" data-gact="grid">宫格数量</button><button class="menu-item" data-gact="stitch">拼接 2K/4K</button><button class="menu-item" data-gact="number">序号</button><button class="menu-item" data-gact="workflow">创建工作流</button><button class="menu-item" data-gact="normal">转普通组</button><button class="menu-item" data-gact="ungroup">解组</button><div class="menu-sep"></div><button class="menu-item danger" data-gact="clear" ${g.locked?'disabled':''}>清空</button>`:`<button class="menu-item" data-gact="collapse">${g.collapsed?'展开':'折叠'}工作流组</button>${common}<button class="menu-item" data-gact="workflow">创建工作流</button><button class="menu-item" data-gact="run">整组执行</button>${resumableRun?`<button class="menu-item" data-gact="resume">▶ 从断点续跑</button>`:''}${failedCount?`<button class="menu-item retry-emphasis" data-gact="retry-failed">↻ 重跑失败节点及下游 (${failedCount})</button>`:''}<button class="menu-item" data-gact="branch-layout">整理工作流分支</button><button class="menu-item" data-gact="layout">排版设置…</button><button class="menu-item" data-gact="duplicate">创建副本（保留内部连线）</button><button class="menu-item" data-gact="ungroup">解组</button>`;
    contextMenu.classList.remove('hidden');$$('[data-gact]',contextMenu).forEach(b=>b.onclick=()=>{const a=b.dataset.gact;if(['ratio','grid','number','normal','ungroup','clear','duplicate','lock','freeze'].includes(a))snapshot('编辑分组');if(a==='studio'){contextMenu.classList.add('hidden');openStoryboardStudio(g.id);return}if(a==='collapse'){contextMenu.classList.add('hidden');toggleGroupCollapsed(g.id);return}if(a==='candidates'){contextMenu.classList.add('hidden');openBatchCandidateView(g.nodeIds);return}if(a==='cost'){contextMenu.classList.add('hidden');openCostDetails(g.nodeIds,`${g.title||'工作流'} · 成本预估`);return}if(a==='lock'){g.locked=!g.locked;g.nodeIds.forEach(id=>{const n=state.nodes.find(x=>x.id===id);if(n)n.locked=g.locked});showToast(g.locked?'整组已锁定':'整组已解锁')}if(a==='freeze'){g.frozen=!g.frozen;g.nodeIds.forEach(id=>{const n=state.nodes.find(x=>x.id===id);if(n)n.frozen=g.frozen});showToast(g.frozen?'整组结果已冻结':'整组已解除冻结')}if(a==='ratio'){g.meta.ratio=prompt('分镜比例',g.meta.ratio||'16:9')||g.meta.ratio;if(g.kind==='storyboard')layoutStoryboardGroup(g)}if(a==='grid'){const raw=prompt('宫格数量（2x2 / 3x3 / 4x4 / 5x5）',g.meta.grid||'3x3');if(raw&&g.kind==='storyboard'){const map={'2x2':4,'3x3':9,'4x4':16,'5x5':25},count=map[String(raw).toLowerCase()];if(count){const r=resizeStoryboardCapacity(g,count);showToast(r.released?`Storyboard 已缩减，${r.released} 个 Frame 已释放到右侧`:r.restored?`Storyboard 已扩展并恢复 ${r.restored} 个 Frame`:`Storyboard 已切换为 ${raw}`)}else showToast('请输入 2x2 / 3x3 / 4x4 / 5x5')}}if(a==='number'){g.meta.numbered=!g.meta.numbered;showToast(g.meta.numbered?'已显示分镜序号':'已隐藏分镜序号')}if(a==='workflow'){state.selectedIds=[...g.nodeIds];saveWorkflowFromSelection()}if(a==='run'){state.selectedIds=[...g.nodeIds];executeSelectedGroup()}if(a==='resume'){contextMenu.classList.add('hidden');resumeWorkflowRun(resumableRun.id);return}if(a==='retry-failed'){contextMenu.classList.add('hidden');rerunFailedGroupDownstream(g.id);return}if(a==='branch-layout'){selectedGroupId=g.id;state.selectedIds=[...g.nodeIds];autoLayoutNodes(g.nodeIds,{direction:state.canvasSettings?.autoLayoutDirection||'LR',mode:'branches',fit:true})}if(a==='layout'){selectedGroupId=g.id;state.selectedIds=[...g.nodeIds];openAutoLayoutMenu()}if(a==='normal'){g.kind='workflow';g.title='普通组'}if(a==='ungroup'){state.groups=state.groups.filter(x=>x.id!==g.id);selectedGroupId=null}if(a==='clear'&&!g.locked&&confirm('确认清空分镜组内所有节点？')){g.nodeIds.forEach(id=>{const n=state.nodes.find(x=>x.id===id);if(n)n.locked=false;deleteNodeSilent(id)});state.groups=state.groups.filter(x=>x.id!==g.id);selectedGroupId=null}if(a==='duplicate')duplicateGroup(g);if(a==='stitch')stitchStoryboardGroup(g);saveState();render();contextMenu.classList.add('hidden')});
  }

  function duplicateGroup(g){const originals=g.nodeIds.map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),map=new Map(),ids=[];originals.forEach(o=>{const n=JSON.parse(JSON.stringify(o));map.set(o.id,n.id=uid('n'));n.x+=60;n.y+=60;state.nodes.push(n);ids.push(n.id)});state.edges.filter(e=>g.nodeIds.includes(e.source)&&g.nodeIds.includes(e.target)).forEach(e=>state.edges.push({...e,id:uid('e'),source:map.get(e.source),target:map.get(e.target)}));const gp={...JSON.parse(JSON.stringify(g)),id:uid('g'),title:g.title+' 副本',nodeIds:ids};if(gp.collapsedPos)gp.collapsedPos={x:gp.collapsedPos.x+60,y:gp.collapsedPos.y+60};state.groups.push(gp);showToast('分组副本已创建');}
  async function stitchStoryboardGroup(g){
    const imgs=g.nodeIds.map(id=>state.nodes.find(n=>n.id===id)).filter(n=>n?.type==='image');if(!imgs.length)return;const grid=String(g.meta?.grid||''),gm=grid.match(/(\d+)x(\d+)/i),cols=gm?Number(gm[1]):Math.ceil(Math.sqrt(imgs.length));const local=imgs.every(x=>/^\/media\//.test(x.outputUrl||''));if(local){try{showToast('正在真实拼接分镜组…');const result=await localMediaProcess(imgs[0],'image-stitch',{urls:imgs.slice(1).map(x=>x.outputUrl),cols,resolution:g.meta?.resolution||'2K',numbered:Boolean(g.meta?.numbered)});if(result.outputs?.[0]){const out=makeLocalResultNode(imgs[0],result.outputs[0],`分镜拼接 ${g.meta?.resolution||'2K'}`,{operation:'storyboard_stitch',cols,numbered:Boolean(g.meta?.numbered)});out.x=Math.max(...imgs.map(n=>n.x+(n.w||320)))+80;out.y=Math.min(...imgs.map(n=>n.y));imgs.slice(1).forEach(x=>state.edges.push({id:uid('e'),source:x.id,target:out.id,type:'stitch'}));saveState();render();showToast('分镜组已真实拼接成图片');return}}catch(e){showToast('真实拼接失败：'+e.message)}}const out={id:uid('n'),type:'image',x:Math.max(...imgs.map(n=>n.x+(n.w||320)))+80,y:Math.min(...imgs.map(n=>n.y)),w:420,title:'分镜拼接图',prompt:'把所有分镜按照宫格顺序拼接为一张高清故事板',providerId:'',modelId:'',modelName:'',toolParams:{operation:'storyboard_stitch',resolution:g.meta?.resolution||'2K',cols,sourceNodeIds:imgs.map(x=>x.id)}};state.nodes.push(out);imgs.forEach(x=>state.edges.push({id:uid('e'),source:x.id,target:out.id,type:'stitch'}));saveState();render();showToast('远程素材已创建拼接处理节点，请选择图像 API 后生成');
  }

  function historyToNode(h,offsetOrPoint=0){const type=h.type||({视频:'video',音频:'audio',文本:'text',图片:'image'})[h.kind]||'image',id=uid('n'),v={id:uid('rv'),outputUrl:h.outputUrl||'',text:h.text||'',prompt:h.prompt||'',providerId:h.providerId||'',modelId:h.modelId||'',modelName:h.modelName||'',historyId:h.id,createdAt:h.createdAt||new Date().toISOString(),parameters:{...(h.parameters||{})}},pt=typeof offsetOrPoint==='object'?offsetOrPoint:{x:460+Number(offsetOrPoint||0),y:220+Number(offsetOrPoint||0)};return{id,type,x:pt.x,y:pt.y,w:320,title:h.title||'历史素材',content:h.theme||'',outputUrl:h.outputUrl||'',text:h.text||'',prompt:h.prompt||'',providerId:h.providerId||'',modelId:h.modelId||'',modelName:h.modelName||'',toolParams:{...(h.parameters||{})},taskStatus:'succeeded',resultVersions:[v],activeResultVersionId:v.id,historySourceId:h.id}}
  function renderDrawer(kind){
    if(kind==='add'){
      drawer.innerHTML=`<div class="drawer-title">添加</div><div class="drawer-grid">${['text','image','video','audio','script','director'].map(t=>`<button class="drawer-item" data-type="${t}"><b>${labelForType(t)}</b><span>新建${labelForType(t)}节点</span></button>`).join('')}<button class="drawer-item" data-upload><b>上传</b><span>图片 / 视频 / 音频</span></button></div>`;$$('[data-type]',drawer).forEach(b=>b.onclick=()=>addNode(b.dataset.type,{x:520-state.viewport.x/state.viewport.zoom,y:260-state.viewport.y/state.viewport.zoom}));$('[data-upload]',drawer).onclick=()=>openLocalUpload({x:520-state.viewport.x/state.viewport.zoom,y:260-state.viewport.y/state.viewport.zoom});
    }else if(kind==='workflow'){
      const workflows=toolboxWorkflows();drawer.innerHTML=`<div class="drawer-title">My Toolbox</div><div class="drawer-toolbar"><input id="toolboxSearch" placeholder="搜索工作流"><button id="toolboxShortcuts">快捷键</button></div><div class="drawer-section-title">用户级工作流 · 跨项目可用</div><div id="toolboxRows">${workflows.map(w=>`<div class="drawer-row toolbox-row" data-toolbox-row="${w.id}"><div class="thumb-mini workflow-thumb">⌘</div><div class="row-main"><div class="row-title">${escapeHtml(w.title)}</div><div class="row-sub">${escapeHtml(w.desc||'')} ${w.io?`· ${w.io.inputs||0} 入 / ${w.io.outputs||0} 出`:''}</div></div><button class="top-icon" title="发送到画布" data-wf="${w.id}">＋</button>${w.id!=='w1'?`<button class="top-icon danger-lite" title="删除" data-wf-delete="${w.id}">×</button>`:''}</div>`).join('')||'<div class="feature-empty">框选节点 → 右键 → 保存到 My Toolbox</div>'}</div><button class="drawer-wide-action" id="workflowRunCenter">任务与运行中心</button>`;$$('[data-wf]',drawer).forEach(b=>b.onclick=()=>instantiateWorkflow(b.dataset.wf));$$('[data-wf-delete]',drawer).forEach(b=>b.onclick=e=>{e.stopPropagation();if(confirm('从 My Toolbox 删除这个工作流？'))deleteToolboxWorkflow(b.dataset.wfDelete)});$('#toolboxSearch',drawer).oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('[data-toolbox-row]',drawer).forEach(r=>{const w=workflows.find(x=>x.id===r.dataset.toolboxRow);r.style.display=!q||`${w?.title||''} ${w?.desc||''}`.toLowerCase().includes(q)?'':'none'})};$('#toolboxShortcuts',drawer).onclick=openShortcutHelp;$('#workflowRunCenter',drawer).onclick=openTaskManager;
    }else if(kind==='asset'){
      const folders=[...new Set(state.assets.map(a=>a.folder||'未分类'))];drawer.innerHTML=`<div class="drawer-title">我的资产</div><div class="drawer-toolbar"><input id="assetSearch" placeholder="搜索资产"><button id="openSubjects">主体库</button></div>${folders.map(f=>`<div class="drawer-section-title">${escapeHtml(f)}</div>${state.assets.filter(a=>(a.folder||'未分类')===f).map(a=>`<div class="drawer-row asset-row" draggable="true" data-asset-row="${a.id}"><div class="thumb-mini" style="${a.mediaUrl?`background-image:url('${escapeAttr(a.mediaUrl)}');background-size:cover`: `background:${themeBg(a.theme)}`}"></div><div class="row-main"><div class="row-title">${escapeHtml(a.title)}</div><div class="row-sub">${escapeHtml(a.kind||labelForType(a.type))} · ${(a.versions||[]).length} 版本</div></div><button class="top-icon" data-asset-use="${a.id}">＋</button></div>`).join('')}`).join('')||'<div class="feature-empty">右键任意节点 → 创建资产</div>'}`;$$('[data-asset-row]',drawer).forEach(row=>row.onclick=e=>{if(e.target.closest('[data-asset-use]'))return;openAssetDetail(state.assets.find(a=>a.id===row.dataset.assetRow))});$$('[data-asset-row]',drawer).forEach(row=>row.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-canvasstudio-item',JSON.stringify({kind:'asset',id:row.dataset.assetRow}));e.dataTransfer.setData('text/plain','canvasstudio:asset:'+row.dataset.assetRow)});$$('[data-asset-use]',drawer).forEach(b=>b.onclick=e=>{e.stopPropagation();useAsset(state.assets.find(a=>a.id===b.dataset.assetUse))});$('#assetSearch',drawer).oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('[data-asset-row]',drawer).forEach(r=>{const a=state.assets.find(x=>x.id===r.dataset.assetRow);r.style.display=!q||`${a.title} ${a.kind} ${a.folder} ${a.prompt}`.toLowerCase().includes(q)?'':'none'})};$('#openSubjects',drawer).onclick=()=>openSubjectLibrary(state.nodes.find(x=>x.id===selectedId&&x.type==='video')||{id:'__manage__',toolParams:{},prompt:'',title:'管理模式'});
    }else if(kind==='history'){
      drawer.innerHTML=`<div class="drawer-title">历史记录</div><div class="drawer-toolbar"><input id="historySearch" placeholder="搜索生成历史"><select id="historyType"><option value="">全部</option><option value="image">图片</option><option value="video">视频</option><option value="audio">音频</option><option value="text">文本</option></select></div><div class="history-bulk"><button id="histSelectAll">全选</button><button id="histBulkUse">发送画布</button><button id="histBulkDownload">下载</button><button id="histBulkDelete" class="danger">删除</button></div><div id="historyRows">${state.history.map(h=>`<div class="drawer-row history-row" draggable="true" data-history-row="${h.id}"><input type="checkbox" data-history-check="${h.id}"><div class="thumb-mini" style="${h.outputUrl?`background-image:url('${escapeAttr(h.outputUrl)}');background-size:cover`:`background:${themeBg(h.theme)}`}"></div><div class="row-main"><div class="row-title">${escapeHtml(h.title)}</div><div class="row-sub">${escapeHtml(h.kind||labelForType(h.type))} · ${h.modelName?escapeHtml(h.modelName):'本地/未知'}</div></div><button class="top-icon" data-hist-use="${h.id}">＋</button></div>`).join('')||'<div class="feature-empty">暂无生成记录</div>'}</div>`;
      const filter=()=>{const q=$('#historySearch',drawer).value.trim().toLowerCase(),t=$('#historyType',drawer).value;$$('[data-history-row]',drawer).forEach(r=>{const h=state.history.find(x=>x.id===r.dataset.historyRow),ht=h.type||({视频:'video',音频:'audio',文本:'text',图片:'image'})[h.kind]||'image';r.style.display=(!q||`${h.title} ${h.prompt} ${h.modelName}`.toLowerCase().includes(q))&&(!t||ht===t)?'':'none'})};$$('[data-history-row]',drawer).forEach(row=>row.ondragstart=e=>{e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/x-canvasstudio-item',JSON.stringify({kind:'history',id:row.dataset.historyRow}));e.dataTransfer.setData('text/plain','canvasstudio:history:'+row.dataset.historyRow)});$('#historySearch',drawer).oninput=filter;$('#historyType',drawer).onchange=filter;$$('[data-hist-use]',drawer).forEach(b=>b.onclick=()=>{const h=state.history.find(x=>x.id===b.dataset.histUse);snapshot();state.nodes.push(historyToNode(h));saveState();render()});const checked=()=>$$('[data-history-check]:checked',drawer).map(x=>x.dataset.historyCheck);$('#histSelectAll',drawer).onclick=()=>$$('[data-history-check]',drawer).forEach(x=>x.checked=true);$('#histBulkUse',drawer).onclick=()=>{const ids=checked().slice(0,10);runTransaction(`发送 ${ids.length} 个历史素材`,()=>{ids.forEach((id,i)=>state.nodes.push(historyToNode(state.history.find(x=>x.id===id),i*25)));saveState();render()});showToast(`已发送 ${ids.length} 个历史素材`)};$('#histBulkDelete',drawer).onclick=()=>{const ids=checked();if(ids.length&&confirm(`删除 ${ids.length} 条历史记录？`)){state.history=state.history.filter(h=>!ids.includes(h.id));saveState();renderDrawer('history')}};$('#histBulkDownload',drawer).onclick=()=>{checked().forEach((id,i)=>{const h=state.history.find(x=>x.id===id);if(h?.outputUrl){setTimeout(()=>{const a=document.createElement('a');a.href=h.outputUrl;a.download=(h.title||'history')+(h.type==='video'?'.mp4':'');a.click()},i*120)}})};requestAnimationFrame(()=>{drawer.scrollTop=state.historyScroll||0});drawer.onscroll=()=>{state.historyScroll=drawer.scrollTop;try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{}};
    }else{
      drawer.innerHTML=`<div class="drawer-title">怎么用</div><div class="drawer-item guide-step"><b>1 · 第一次只配置一次 API</b><span>右上角 ⚙ → API供应商 → 填名称、Base URL、API Key → 测试连接 → 拉取模型。</span></div><div class="drawer-item guide-step"><b>2 · 双击画布新建节点</b><span>选择图片 / 视频 / 文本 / 音频 / 脚本。节点会自动选择对应模型，不需要再选供应商。</span></div><div class="drawer-item guide-step"><b>3 · 点击节点再展开详情</b><span>节点默认保持简洁；单击节点卡片后，才会在下方显示提示词、模型、比例、时长等生成设置。</span></div><div class="drawer-item guide-step"><b>4 · 从右侧拖线继续下一步</b><span>把节点右侧圆点拖到空白处，松开后直接选择下一节点；参考素材会自动传过去。</span></div><div class="drawer-item guide-step"><b>5 · 点击素材直接编辑</b><span>图片、视频节点点击展开后，上方出现高清、重绘、裁剪、解析、剪辑等工具；点击空白处收起。</span></div>`;
    }drawer.classList.remove('hidden');
  }


  function saveWorkflowFromSelection(){
    const ids=(state.selectedIds||[]).filter(id=>state.nodes.some(n=>n.id===id));if(ids.length<2){showToast('请先框选至少两个节点');return}
    const title=prompt('工作流名称','自定义工作流 '+(toolboxWorkflows().length+1));if(!title)return;const set=new Set(ids),nodes=ids.map(id=>deepClone(state.nodes.find(n=>n.id===id))),minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y));nodes.forEach(n=>{n.x-=minX;n.y-=minY;n.selected=false});const edges=state.edges.filter(e=>set.has(e.source)&&set.has(e.target)).map(deepClone),internalIn=new Set(edges.map(e=>e.target)),internalOut=new Set(edges.map(e=>e.source)),inputs=ids.filter(id=>!internalIn.has(id)||state.edges.some(e=>e.target===id&&!set.has(e.source))),outputs=ids.filter(id=>!internalOut.has(id)||state.edges.some(e=>e.source===id&&!set.has(e.target))),wf={id:uid('wf'),title,desc:`${nodes.length} 个节点 · ${edges.length} 条连线`,sourceProjectId:state.projectId||'',sourceProjectName:state.projectName||'',createdAt:new Date().toISOString(),io:{inputs:inputs.length,outputs:outputs.length,inputNodeIds:inputs,outputNodeIds:outputs},template:{version:2,nodes,edges}};upsertToolboxWorkflow(wf);state.workflows=(state.workflows||[]).filter(x=>x.id!==wf.id);state.workflows.unshift(deepClone(wf));saveState();renderDrawer('workflow');showToast('工作流已保存到用户级 My Toolbox · 可在其他项目直接调用')
  }
  function nodeRunSignature(n){const refs=collectReferences(n.id).map(r=>({id:r.id,url:r.url,text:r.text,role:r.role}));const ctx=scriptContextForNode(n);return JSON.stringify({providerId:n.providerId,modelId:n.modelId,prompt:n.prompt,imageQuality:imageQualityForNode(n),aspectRatio:n.aspectRatio,duration:n.duration,resolution:n.resolution,toolParams:n.toolParams,refs,creativeContext:ctx});}
  function workflowLog(run,message,level='info'){const now=new Date().toISOString();run.logs=run.logs||[];run.logs.push({at:now,message,level});run.logs=run.logs.slice(-300);run.checkpointAt=now;saveState();scheduleWorkflowVisualUpdate();}
  function nodeHasReusableResult(n){
    if(!n)return false;
    if(n.type==='text')return Boolean(String(n.generatedText||n.text||'').trim()||n.generatedResult);
    if(['image','video','audio'].includes(n.type))return Boolean(n.outputUrl||n.generatedResult||nodeResultVersions(n).length);
    return true
  }

  async function executeWorkflowIds(ids,{title='工作流执行',force=false,resumeOf=''}={}){
    ids=[...new Set(ids)].filter(id=>state.nodes.some(n=>n.id===id));if(!ids.length)return;const settings={concurrency:2,maxRetries:1,failPolicy:'stop',cache:true,...state.workflowSettings},idSet=new Set(ids),deps=new Map(ids.map(id=>[id,[]]));state.edges.forEach(e=>{if(idSet.has(e.source)&&idSet.has(e.target))deps.get(e.target).push(e.source)});const statuses=Object.fromEntries(ids.map(id=>[id,'pending']));const run={id:uid('run'),title,startedAt:new Date().toISOString(),checkpointAt:new Date().toISOString(),status:'running',statuses,logs:[],nodeIds:ids,cancelRequested:false,settings:{...settings},checkpoint:true,resumeOf:resumeOf||''};state.workflowRuns.unshift(run);state.workflowRuns=state.workflowRuns.slice(0,30);workflowLog(run,`开始执行 ${ids.length} 个节点，并发 ${settings.concurrency}，失败策略 ${settings.failPolicy}`);let stop=false;
    const runnable=()=>ids.filter(id=>{if(statuses[id]!=='pending')return false;const ds=deps.get(id)||[];if(ds.some(d=>statuses[d]==='running'||statuses[d]==='pending'))return false;if(ds.some(d=>['failed','canceled','skipped'].includes(statuses[d]))&&settings.failPolicy!=='continue'){statuses[id]='skipped';workflowLog(run,`${state.nodes.find(n=>n.id===id)?.title||id} 因上游失败已跳过`,'warn');return false}return true});
    const active=new Map();const launch=id=>{const node=state.nodes.find(n=>n.id===id);if(node?.frozen){
      if(!nodeHasReusableResult(node)){statuses[id]='failed';workflowLog(run,`冻结节点没有可复用结果：${node.title}`,'error');if(settings.failPolicy==='stop')stop=true;scheduleWorkflowVisualUpdate();return}
      statuses[id]='frozen';workflowLog(run,`冻结复用：${node.title}`);scheduleWorkflowVisualUpdate();return
    }statuses[id]='running';workflowLog(run,`执行：${node.title} · 优先级 ${nodePriority(node)}`);const promise=(async()=>{if(!['image','video','audio','text'].includes(node.type)||!node.providerId||!node.modelId){statuses[id]='succeeded';workflowLog(run,`通过非生成节点：${node.title}`);return}const sig=nodeRunSignature(node);if(!force&&settings.cache&&node.runCacheKey===sig&&node.taskStatus==='succeeded'){statuses[id]='cached';workflowLog(run,`命中缓存：${node.title}`);return}try{await generateForNode(node,{silent:true});node.runCacheKey=sig;statuses[id]='succeeded';workflowLog(run,`完成：${node.title}`)}catch(e){statuses[id]=node.taskStatus==='canceled'?'canceled':'failed';workflowLog(run,`失败：${node.title} · ${e.message}`,'error');if(settings.failPolicy==='stop')stop=true}})().finally(()=>active.delete(id));active.set(id,promise)};
    while(true){if(run.cancelRequested){stop=true;workflowLog(run,'用户取消工作流','warn')}if(stop){for(const id of active.keys()){const node=state.nodes.find(n=>n.id===id);if(node?.taskId)cancelNodeTask(node).catch(()=>{})}ids.filter(id=>statuses[id]==='pending').forEach(id=>statuses[id]='skipped')}
      if(!stop){for(const id of runnable()){if(active.size>=Math.max(1,Number(settings.concurrency||2)))break;launch(id)}}
      if(!active.size){const pending=ids.some(id=>statuses[id]==='pending');if(!pending||stop)break;const ready=runnable();if(!ready.length){ids.filter(id=>statuses[id]==='pending').forEach(id=>statuses[id]='skipped');break}}
      if(active.size)await Promise.race([...active.values()]);
    }
    run.finishedAt=new Date().toISOString();run.status=run.cancelRequested?'canceled':Object.values(statuses).some(x=>x==='failed')?'failed':'succeeded';workflowLog(run,`工作流结束：${run.status}`);saveState();render();showToast(run.status==='succeeded'?'整组执行完成':run.status==='canceled'?'工作流已取消':'工作流执行完成，存在失败节点');return run;
  }

  function workflowRunResumable(run){return Boolean(run&&run.nodeIds?.length&&['failed','canceled','interrupted'].includes(run.status))}
  function latestResumableRunForIds(ids){const set=new Set(ids||[]);return (state.workflowRuns||[]).find(r=>workflowRunResumable(r)&&r.nodeIds?.some(id=>set.has(id)))||null}
  async function resumeWorkflowRun(runId){const source=(state.workflowRuns||[]).find(r=>r.id===runId);if(!source||!source.nodeIds?.length)return showToast('没有可续跑的断点');const finished=new Set(['succeeded','cached','frozen']),live=source.nodeIds.filter(id=>state.nodes.some(n=>n.id===id)),pending=live.filter(id=>!finished.has(source.statuses?.[id]));if(!live.length)return showToast('断点中的节点已经不存在');if(!pending.length){source.resumedAt=new Date().toISOString();source.resumed=true;saveState();return showToast('断点中的节点已经全部完成')}source.resumedAt=new Date().toISOString();source.resumed=true;source.resumedNodeIds=[...pending];saveState();showToast(`从断点继续 · ${pending.length}/${live.length} 个未完成节点`);return executeWorkflowIds(pending,{title:`${source.title||'工作流'} · 断点续跑`,force:false,resumeOf:source.id})}

  async function executeSelectedGroup(){const selected=new Set(state.selectedIds||[]);const g=(state.groups||[]).find(g=>g.nodeIds.some(id=>selected.has(id)));const ids=g?.nodeIds||(state.selectedIds||[]);return executeWorkflowIds(ids,{title:g?.title||'选中节点工作流'});}
  async function executeDownstream(nodeId){const seen=new Set([nodeId]),q=[nodeId];while(q.length){const x=q.shift();state.edges.filter(e=>e.source===x).forEach(e=>{if(!seen.has(e.target)){seen.add(e.target);q.push(e.target)}})}return executeWorkflowIds([...seen],{title:'从节点向下游执行'});}
  function downstreamNodeIds(nodeId,limitIds=null){const limit=limitIds?new Set(limitIds):null,seen=new Set(),q=[nodeId];while(q.length){const x=q.shift();if(seen.has(x)||limit&&!limit.has(x))continue;seen.add(x);state.edges.filter(e=>e.source===x).forEach(e=>{if(!seen.has(e.target)&&(!limit||limit.has(e.target)))q.push(e.target)})}return[...seen]}
  async function rerunFailedDownstream(nodeId,{limitIds=null}={}){const n=state.nodes.find(x=>x.id===nodeId);if(!n)return;const ids=downstreamNodeIds(nodeId,limitIds);if(!ids.length)return;ids.forEach(id=>{const x=state.nodes.find(n=>n.id===id);if(x){x.runCacheKey='';if(id===nodeId&&x.taskStatus==='failed')x.taskError=''}});showToast(`正在重跑 ${ids.length} 个节点…`);return executeWorkflowIds(ids,{title:`失败恢复 · ${n.title||labelForType(n.type)}`,force:true})}
  async function rerunFailedGroupDownstream(groupId){const g=state.groups.find(x=>x.id===groupId);if(!g)return;const info=groupRunInfo(g),run=info?.run,failed=g.nodeIds.filter(id=>run?.statuses?.[id]==='failed'||state.nodes.find(n=>n.id===id)?.taskStatus==='failed');if(!failed.length){showToast('这个工作流组没有失败节点');return}const all=new Set();failed.forEach(id=>downstreamNodeIds(id,g.nodeIds).forEach(x=>all.add(x)));[...all].forEach(id=>{const n=state.nodes.find(x=>x.id===id);if(n)n.runCacheKey=''});showToast(`从 ${failed.length} 个失败节点开始重跑`);return executeWorkflowIds([...all],{title:`失败恢复 · ${g.title||'工作流组'}`,force:true})}
  function workflowRunCardHtml(r){const p=runProgress(r),started=r.startedAt?new Date(r.startedAt).toLocaleString():'';return `<details ${r.status==='running'?'open':''}><summary><b>${escapeHtml(r.title)}</b><span class="task-status ${r.status}">${r.status}</span><strong>${p.pct}%</strong><small>${started}</small>${r.status==='running'?`<button data-cancel-run="${r.id}">取消工作流</button>`:''}${workflowRunResumable(r)?`<button data-resume-run="${r.id}" class="resume-run-btn">▶ 断点续跑</button>`:''}</summary><div class="run-overview"><div class="run-overview-bar"><i style="width:${p.pct}%"></i></div><span>${p.done}/${p.total} 已完成</span><span>${p.running} 运行中</span><span>${p.failed} 失败</span></div><div class="run-node-status">${Object.entries(r.statuses||{}).map(([id,st])=>`<button data-run-focus="${id}" class="${st}"><i></i>${escapeHtml(state.nodes.find(n=>n.id===id)?.title||id)}<em>${workflowStatusLabel(st)}</em></button>`).join('')}</div><pre>${escapeHtml((r.logs||[]).map(x=>`${x.at.slice(11,19)}  ${x.message}`).join('\n'))}</pre></details>`}

  async function openTaskManager(){
    let tasks=[],queue={paused:false,concurrency:2,running:0,queued:0};try{tasks=(await apiJson('/api/tasks?limit=120')).tasks||[]}catch{}try{queue=await apiJson('/api/queue')}catch{}const settings=state.workflowSettings||{},runs=state.workflowRuns||[],queued=tasks.filter(t=>t.status==='queued').sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.createdAt).localeCompare(String(b.createdAt)));
    modalShell('任务与工作流运行中心',`<div class="task-manager"><section><div class="queue-control-head"><h3>运行队列调度</h3><div><span class="queue-stat">${queue.running||0} 运行 · ${queued.length} 排队 · 服务并发 ${queue.concurrency||2}</span><button id="toggleQueuePause" class="${queue.paused?'primary':''}">${queue.paused?'▶ 恢复队列':'❚❚ 暂停新任务'}</button></div></div><div class="task-settings"><label>工作流并发<input id="wfConcurrency" type="number" min="1" max="8" value="${Number(settings.concurrency||2)}"></label><label>默认优先级<input id="wfPriority" type="number" min="0" max="100" value="${Number(settings.defaultPriority??50)}"></label><label>失败重试<input id="wfRetries" type="number" min="0" max="5" value="${Number(settings.maxRetries||1)}"></label><label>费用确认阈值<input id="wfCostThreshold" type="number" min="0" step="0.01" value="${Number(settings.costConfirmThreshold||0)}" title="0 表示不强制弹窗"></label><label>失败策略<select id="wfFailPolicy"><option value="stop" ${settings.failPolicy==='stop'?'selected':''}>停止后续</option><option value="skip" ${settings.failPolicy==='skip'?'selected':''}>跳过依赖节点</option><option value="continue" ${settings.failPolicy==='continue'?'selected':''}>继续执行</option></select></label><label class="toggle-row"><input id="wfCache" type="checkbox" ${settings.cache!==false?'checked':''}>复用成功缓存</label><label class="toggle-row"><input id="wfAutoFallback" type="checkbox" ${settings.autoFallback!==false?'checked':''}>失败自动切备用模型</label><button id="saveWfSettings">保存</button></div></section><section><h3>等待队列 · 高优先级先执行</h3><div class="queue-list">${queued.map((t,i)=>`<div class="queue-task"><b>#${i+1} ${escapeHtml(t.nodeType||'任务')} · ${escapeHtml(t.modelId||'')}</b><span class="priority ${priorityLabel(t.priority)}">${priorityLabel(t.priority)} ${Number(t.priority??50)}</span><small>${new Date(t.createdAt).toLocaleTimeString()}</small><select data-queue-priority="${t.id}"><option value="90" ${Number(t.priority)>=80?'selected':''}>高 · 90</option><option value="50" ${Number(t.priority)>20&&Number(t.priority)<80?'selected':''}>普通 · 50</option><option value="10" ${Number(t.priority)<=20?'selected':''}>低 · 10</option></select><button data-cancel-task="${t.id}">取消</button></div>`).join('')||'<div class="feature-empty">暂无等待任务</div>'}</div></section><section><h3>全部持久任务</h3><div class="task-list">${tasks.slice(0,60).map(t=>`<div class="task-row"><span class="task-status ${t.status}">${t.status}</span><b>${escapeHtml(t.nodeType||'任务')} · ${escapeHtml(t.modelId||'')}</b><span>${Math.round(t.progress||0)}%</span><small>${escapeHtml((taskDiagnosticSummary(t)||t.error||t.id||'').slice(0,220))}</small><em>P${Number(t.priority??50)}</em>${['queued','running','polling','retrying','provider_succeeded','result_pending','cancelling'].includes(t.status)?`<button data-cancel-task="${t.id}">取消</button>`:''}${['failed','canceled'].includes(t.status)?`<button data-retry-task="${t.id}">重试</button>`:''}</div>`).join('')||'<div class="feature-empty">暂无任务</div>'}</div></section><section><h3>工作流运行日志</h3><div class="workflow-run-list">${runs.slice(0,12).map(workflowRunCardHtml).join('')||'<div class="feature-empty">暂无工作流运行记录</div>'}</div></section></div>`,{wide:true});
    $('#saveWfSettings').onclick=()=>{state.workflowSettings={...state.workflowSettings,concurrency:Number($('#wfConcurrency').value),defaultPriority:Math.max(0,Math.min(100,Number($('#wfPriority').value))),maxRetries:Number($('#wfRetries').value),costConfirmThreshold:Math.max(0,Number($('#wfCostThreshold').value)||0),failPolicy:$('#wfFailPolicy').value,cache:$('#wfCache').checked,autoFallback:$('#wfAutoFallback').checked};saveState();showToast('工作流运行设置已保存')};$('#toggleQueuePause').onclick=async()=>{await apiJson('/api/queue',{method:'PUT',body:JSON.stringify({paused:!queue.paused})});openTaskManager()};$$('[data-queue-priority]',featureModal).forEach(sel=>sel.onchange=async()=>{await apiJson('/api/tasks/'+encodeURIComponent(sel.dataset.queuePriority),{method:'PATCH',body:JSON.stringify({priority:Number(sel.value)})});openTaskManager()});$$('[data-cancel-task]',featureModal).forEach(b=>b.onclick=async()=>{await apiJson('/api/tasks/'+encodeURIComponent(b.dataset.cancelTask),{method:'DELETE'});openTaskManager()});$$('[data-retry-task]',featureModal).forEach(b=>b.onclick=async()=>{await apiJson('/api/tasks/'+encodeURIComponent(b.dataset.retryTask)+'/retry',{method:'POST',body:'{}'});openTaskManager()});$$('[data-cancel-run]',featureModal).forEach(b=>b.onclick=()=>{const r=state.workflowRuns.find(x=>x.id===b.dataset.cancelRun);if(r){r.cancelRequested=true;saveState();showToast('正在取消工作流')}});$$('[data-resume-run]',featureModal).forEach(b=>b.onclick=()=>{closeFeatureModal();resumeWorkflowRun(b.dataset.resumeRun)});$$('[data-run-focus]',featureModal).forEach(b=>b.onclick=()=>{const id=b.dataset.runFocus;closeFeatureModal();focusNode(id)});
  }

  function saveAgentState(){
    if(!agentState)return;
    try{
      globalThis.CanvasBrowserStorageManager.setItem(AGENT_STATE_KEY,JSON.stringify({
        open:Boolean(agentState.open),
        selectedSkillId:agentState.selectedSkillId||'story-script',
        draft:String(agentState.draft||''),
        chatTitle:String(agentState.chatTitle||'新对话'),
        messages:(agentState.messages||[]).slice(-80)
      }));
    }catch{}
  }
  function agentSkillById(id){return AGENT_SKILLS.find(x=>x.id===id)||AGENT_SKILLS[0]}
  function agentCurrentNode(){
    return state.nodes.find(x=>x.id===expandedNodeId)||state.nodes.find(x=>x.id===selectedId)||null;
  }
  function agentWorkspacePoint(offset=0){
    const rect=viewport.getBoundingClientRect();
    return screenToWorld(rect.left+Math.min(rect.width*.62,Math.max(340,rect.width-520))+offset,rect.top+rect.height*.32+offset);
  }
  function agentSkillToneClass(tone){
    return tone==='story'?'story':tone==='image'?'image':tone==='video'?'video':tone==='audio'?'audio':'edit';
  }
  function agentMessageHtml(message){
    const user=message.role==='user';
    return `<div class="agent-message ${user?'user':'assistant'}"><div class="agent-avatar">${user?'我':'A'}</div><div class="agent-bubble"><b>${escapeHtml(message.label|| (user?'你':'Agent'))}</b><p>${escapeHtml(message.text||'')}</p>${message.meta?`<div class="agent-meta">${escapeHtml(message.meta)}</div>`:''}</div></div>`;
  }
  function agentSelectedSkill(){return agentSkillById(agentState.selectedSkillId)}
  function agentEnsureMessage(text,role='assistant',meta=''){
    agentState.messages=agentState.messages||[];
    agentState.messages.push({id:uid('agent'),role,label:role==='user'?'你':'Agent',text,meta});
    if(agentState.messages.length>80)agentState.messages=agentState.messages.slice(-80);
    saveAgentState();
    renderAgentPanel();
  }
  function agentOpenSkill(skillId){
    const skill=agentSkillById(skillId);
    agentState.selectedSkillId=skill.id;
    agentState.draft=skill.prompt||'';
    agentState.open=true;
    agentState.chatTitle=skill.title;
    agentState.messages=agentState.messages||[];
    agentState.messages.push({id:uid('agent'),role:'assistant',label:'Agent',text:`已切换到 ${skill.title}。可以直接生成节点，也可以继续补充需求。`,meta:skill.summary});
    saveAgentState();
    render();
  }
  function agentResetChat(){
    agentState={
      open:true,
      selectedSkillId:'story-script',
      draft:'',
      chatTitle:'新对话',
      messages:[
        {id:'welcome',role:'assistant',label:'Agent',text:'我可以把脚本、三视图、参考生视频、音频生视频和智能剪辑串起来。'},
        {id:'hint',role:'assistant',label:'Agent',text:'选择一个 Skill，或者直接输入 `@ 节点名` / 你的创作需求。'}
      ]
    };
    saveAgentState();
    render();
  }
  function agentNodeForSkill(skill,createIfMissing=true){
    const current=agentCurrentNode();
    if(current&&current.type===skill.type)return current;
    if(!createIfMissing)return current;
    const p=agentWorkspacePoint();
    const node=addNode(skill.type,p,true);
    node.title=skill.title;
    node.prompt=skill.prompt;
    if(skill.id==='smart-edit')node.toolParams={...(node.toolParams||{}),mode:'智能混剪'};
    saveState();
    render();
    return node;
  }
  function agentOpenSkillTarget(skillId){
    const skill=agentSkillById(skillId);
    const node=agentNodeForSkill(skill,true);
    if(!node)return;
    node.title=skill.title;
    node.prompt=skill.prompt;
    if(skill.id==='smart-edit')node.toolParams={...(node.toolParams||{}),mode:'智能混剪'};
    if(skill.id==='story-script'){
      saveState();render();focusNode(node.id);setTimeout(()=>openScriptEditor(node,'breakdown'),0);
      return;
    }
    if(skill.id==='smart-edit'){
      saveState();render();focusNode(node.id);setTimeout(()=>openVideoTool('智能剪辑',node),0);
      return;
    }
    if(skill.id==='character-three-view'){
      saveState();render();focusNode(node.id);setTimeout(()=>openImageStudio(node),0);
      return;
    }
    if(skill.id==='audio-video'){
      saveState();render();focusNode(node.id);setTimeout(()=>openVideoStudio(node),0);
      return;
    }
    saveState();render();focusNode(node.id);
    setTimeout(()=>openVideoStudio(node),0);
  }
  function agentInferSkill(text=''){
    const q=String(text||'').toLowerCase();
    if(/剪辑|混剪|拼接|成片|合成/.test(q))return 'smart-edit';
    if(/三视图|角色|设定图|立绘/.test(q))return 'character-three-view';
    if(/音频|配音|音乐|音效/.test(q))return 'audio-video';
    if(/脚本|故事|分镜|剧本/.test(q))return 'story-script';
    return 'reference-video';
  }
  function agentSubmitDraft(){
    const text=String(agentState.draft||'').trim();
    if(!text)return showToast('先输入一点内容吧');
    agentState.messages=agentState.messages||[];
    agentState.messages.push({id:uid('agent'),role:'user',label:'你',text});
    const skill=agentSkillById(agentState.selectedSkillId||agentInferSkill(text));
    const chosenSkill=skill.id===agentInferSkill(text)?skill:agentSkillById(agentInferSkill(text));
    const finalSkill=chosenSkill||skill;
    agentState.draft='';
    agentState.chatTitle=agentState.chatTitle==='新对话'?finalSkill.title:agentState.chatTitle;
    const reply=`我先按「${finalSkill.title}」帮你接到画布里。`;
    agentState.messages.push({id:uid('agent'),role:'assistant',label:'Agent',text:reply,meta:finalSkill.summary});
    saveAgentState();
    render();
    agentOpenSkillTarget(finalSkill.id);
  }
  function renderAgentPanel(){
    if(!agentPanel)return;
    const skill=agentSelectedSkill();
    const messages=agentState.messages||[];
    const current=agentCurrentNode();
    const currentName=current?current.title:'未选中节点';
    agentPanel.innerHTML=`<div class="agent-head"><div class="agent-title"><b>${escapeHtml(agentState.chatTitle||'新对话')}</b><span>${messages.length} 条消息 · 当前 ${escapeHtml(currentName)}</span></div><div class="agent-head-actions"><button data-agent-head="new" title="新对话">${uiIcon('plus')}</button><button data-agent-head="history" title="任务中心">${uiIcon('history')}</button><button data-agent-head="share" title="复制摘要">${uiIcon('share')}</button><button data-agent-head="context" title="上下文">${uiIcon('settings')}</button><button data-agent-head="link" title="引用节点">${uiIcon('context')}</button><button data-agent-head="close" title="收起">${uiIcon('close')}</button></div></div><div class="agent-body"><div class="agent-log">${messages.map(agentMessageHtml).join('')||'<div class="agent-empty"><b>新对话</b><div>选择一个 Skill 开始，或者直接输入你的创作需求。也可以用 @ 引用画布里的节点和资源。</div></div>'}</div><div class="agent-skills"><div class="agent-skills-head"><b>每天，换一个 Skill 开场</b><button data-agent-skill="shuffle">${uiIcon('shuffle')}<span>换一批</span></button></div><div class="agent-skill-grid">${AGENT_SKILLS.map(s=>`<button class="agent-skill-card ${skill.id===s.id?'active':''}" data-agent-skill="${s.id}"><span class="agent-skill-icon ${agentSkillToneClass(s.tone)}">${uiIcon(s.icon)}</span><span class="agent-skill-copy"><b>${escapeHtml(s.title)}</b><span>${escapeHtml(s.summary)}</span><i class="agent-pill">${escapeHtml(s.badge)} · ${escapeHtml(s.action)}</i></span></button>`).join('')}</div></div></div><div class="agent-composer"><div class="agent-composer-top"><button class="agent-chip ${agentState.open?'active':''}" data-agent-shortcut="add">${uiIcon('plus')}<span>添加节点</span></button><button class="agent-chip" data-agent-shortcut="context">${uiIcon('context')}<span>Context</span></button><button class="agent-chip" data-agent-shortcut="task">${uiIcon('history')}<span>任务中心</span></button><button class="agent-chip" data-agent-shortcut="clear">${uiIcon('close')}<span>清空草稿</span></button></div><div class="agent-input"><textarea id="agentDraft" placeholder="开始你的创作，或者 @ 引用工作流/节点/资源…">${escapeHtml(agentState.draft||'')}</textarea><div class="agent-input-footer"><div class="agent-input-actions"><button data-agent-bottom="add" title="添加节点">${uiIcon('plus')}</button><button data-agent-bottom="context" title="引用上下文">${uiIcon('context')}</button><button data-agent-bottom="tasks" title="任务中心">${uiIcon('history')}</button><button data-agent-bottom="clear" title="新对话">${uiIcon('close')}</button></div><button class="agent-send" data-agent-bottom="send">${uiIcon('next')}</button></div></div></div><div class="agent-footer"><span>LibTV 风格 · 右侧 Agent 工作台</span><button class="agent-foot-link" data-agent-shortcut="toggle">${agentState.open?'收起':'展开'}面板</button></div>`;
    const draft=$('#agentDraft',agentPanel);
    if(draft){
      draft.oninput=e=>{agentState.draft=e.target.value;saveAgentState()};
      draft.onkeydown=e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();agentSubmitDraft();}}
    }
    $$('[data-agent-head]',agentPanel).forEach(b=>b.onclick=()=>{
      const a=b.dataset.agentHead;
      if(a==='new')agentResetChat();
      if(a==='history')openTaskManager();
      if(a==='share'){navigator.clipboard?.writeText((agentState.messages||[]).map(m=>`${m.role==='user'?'你':'Agent'}：${m.text}`).join('\n\n')).then(()=>showToast('已复制 Agent 摘要')).catch(()=>showToast('复制失败')); }
      if(a==='context')openCreativeContextOverview();
      if(a==='link'){const node=agentCurrentNode();if(node)openCreativeContextComposer(node);else openCreativeContextOverview();}
      if(a==='close'){agentState.open=false;saveAgentState();render();}
    });
    $$('[data-agent-skill]',agentPanel).forEach(b=>b.onclick=()=>{
      if(b.dataset.agentSkill==='shuffle'){
        const shuffled=[...AGENT_SKILLS].sort(()=>Math.random()-.5);
        agentState.selectedSkillId=shuffled[0].id;
        agentState.messages.push({id:uid('agent'),role:'assistant',label:'Agent',text:`今天先从「${shuffled[0].title}」开始。`,meta:shuffled[0].summary});
        saveAgentState();
        render();
        return;
      }
      agentOpenSkill(b.dataset.agentSkill);
    });
    $$('[data-agent-shortcut]',agentPanel).forEach(b=>b.onclick=()=>{
      const a=b.dataset.agentShortcut;
      if(a==='add')showCommandPalette(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+140,screenToWorld(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+140));
      if(a==='context'){const node=agentCurrentNode();if(node)openCreativeContextComposer(node);else openCreativeContextOverview();}
      if(a==='task')openTaskManager();
      if(a==='clear')agentResetChat();
      if(a==='toggle'){agentState.open=!agentState.open;saveAgentState();render();}
    });
    $$('[data-agent-bottom]',agentPanel).forEach(b=>b.onclick=()=>{
      const a=b.dataset.agentBottom;
      if(a==='add')showCommandPalette(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+140,screenToWorld(viewport.getBoundingClientRect().left+viewport.clientWidth/2,viewport.getBoundingClientRect().top+140));
      if(a==='context'){const node=agentCurrentNode();if(node)openCreativeContextComposer(node);else openCreativeContextOverview();}
      if(a==='tasks')openTaskManager();
      if(a==='clear')agentResetChat();
      if(a==='send')agentSubmitDraft();
    });
  }
  function autoLayoutTargetIds(){const selected=currentSelectionIds();if(selected.length>1)return selected;if(selectedGroupId){const g=state.groups.find(x=>x.id===selectedGroupId);if(g?.nodeIds?.length)return [...g.nodeIds]}return state.nodes.filter(n=>!nodeHiddenByCollapsedGroup(n.id)).map(n=>n.id)}
  function computeWorkflowBranchLayout(ids,{direction='LR',mode='branches'}={}){
    const set=new Set(ids),incoming=new Map(ids.map(id=>[id,[]])),outgoing=new Map(ids.map(id=>[id,[]]));
    state.edges.forEach(e=>{if(set.has(e.source)&&set.has(e.target)){outgoing.get(e.source).push(e.target);incoming.get(e.target).push(e.source)}});
    const indeg=new Map(ids.map(id=>[id,incoming.get(id).length])),queue=ids.filter(id=>!indeg.get(id)).sort((a,b)=>{const na=state.nodes.find(n=>n.id===a),nb=state.nodes.find(n=>n.id===b);return(direction==='TB'?(na?.x||0)-(nb?.x||0):(na?.y||0)-(nb?.y||0))}),level=new Map(ids.map(id=>[id,0])),order=[];
    while(queue.length){const id=queue.shift();order.push(id);for(const t of outgoing.get(id)||[]){level.set(t,Math.max(level.get(t)||0,(level.get(id)||0)+1));indeg.set(t,indeg.get(t)-1);if(indeg.get(t)===0)queue.push(t)}}
    let cycleLevel=Math.max(0,...level.values());ids.filter(id=>!order.includes(id)).forEach(id=>{level.set(id,++cycleLevel);order.push(id)});
    const layers=new Map();order.forEach(id=>{const l=level.get(id)||0;if(!layers.has(l))layers.set(l,[]);layers.get(l).push(id)});const levels=[...layers.keys()].sort((a,b)=>a-b);
    const secondary=n=>direction==='TB'?(n?.x||0):(n?.y||0);levels.forEach(l=>layers.get(l).sort((a,b)=>secondary(state.nodes.find(n=>n.id===a))-secondary(state.nodes.find(n=>n.id===b))));
    if(mode==='branches'){
      const positions=()=>{const m=new Map();levels.forEach(l=>layers.get(l).forEach((id,i)=>m.set(id,i)));return m};
      for(let sweep=0;sweep<4;sweep++){
        let pos=positions();for(let li=1;li<levels.length;li++){const l=levels[li],arr=layers.get(l);arr.sort((a,b)=>{const pa=incoming.get(a)||[],pb=incoming.get(b)||[],ba=pa.length?pa.reduce((s,x)=>s+(pos.get(x)??0),0)/pa.length:(pos.get(a)??0),bb=pb.length?pb.reduce((s,x)=>s+(pos.get(x)??0),0)/pb.length:(pos.get(b)??0);return ba-bb||secondary(state.nodes.find(n=>n.id===a))-secondary(state.nodes.find(n=>n.id===b))});pos=positions()}
        pos=positions();for(let li=levels.length-2;li>=0;li--){const l=levels[li],arr=layers.get(l);arr.sort((a,b)=>{const ca=outgoing.get(a)||[],cb=outgoing.get(b)||[],ba=ca.length?ca.reduce((s,x)=>s+(pos.get(x)??0),0)/ca.length:(pos.get(a)??0),bb=cb.length?cb.reduce((s,x)=>s+(pos.get(x)??0),0)/cb.length:(pos.get(b)??0);return ba-bb||secondary(state.nodes.find(n=>n.id===a))-secondary(state.nodes.find(n=>n.id===b))})}
      }
    }
    const bounds=sceneBounds(ids),primaryGap=mode==='branches'?138:112,secondaryGap=mode==='branches'?72:42,layerCrossTotals=new Map();let maxCross=0;
    levels.forEach(l=>{const ns=layers.get(l).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),total=ns.reduce((s,n)=>s+(direction==='TB'?(n.w||320):nodeHeight(n)),0)+Math.max(0,ns.length-1)*secondaryGap;layerCrossTotals.set(l,total);maxCross=Math.max(maxCross,total)});
    let primary=direction==='TB'?bounds.top:bounds.left;const out=new Map();
    levels.forEach(l=>{const ns=layers.get(l).map(id=>state.nodes.find(n=>n.id===id)).filter(Boolean),primarySize=Math.max(...ns.map(n=>direction==='TB'?nodeHeight(n):(n.w||320))),total=layerCrossTotals.get(l)||0;let cross=(direction==='TB'?bounds.left:bounds.top)+(maxCross-total)/2;ns.forEach(n=>{if(direction==='TB'){out.set(n.id,{x:cross,y:primary});cross+=(n.w||320)+secondaryGap}else{out.set(n.id,{x:primary,y:cross});cross+=nodeHeight(n)+secondaryGap}});primary+=primarySize+primaryGap});
    return{positions:out,levels,incoming,outgoing};
  }
  function autoLayoutNodes(ids=null,{direction='LR',fit=true,mode=null}={}){
    ids=[...new Set(ids?.length?ids:autoLayoutTargetIds())].filter(id=>state.nodes.some(n=>n.id===id));if(ids.length<2){showToast('至少需要两个节点才能自动排版');return null}const layoutMode=mode||state.canvasSettings?.autoLayoutMode||'branches';snapshot(layoutMode==='branches'?'整理工作流分支':'自动排版');const layout=computeWorkflowBranchLayout(ids,{direction,mode:layoutMode});layout.positions.forEach((pos,id)=>{const n=state.nodes.find(x=>x.id===id);if(n){n.x=pos.x;n.y=pos.y}});state.canvasSettings.autoLayoutDirection=direction;state.canvasSettings.autoLayoutMode=layoutMode;state.selectedIds=[...ids];selectedId=ids[0]||null;saveState();render();if(fit)setTimeout(()=>fitView(ids,{maxZoom:1.08}),20);showToast(`已整理 ${ids.length} 个节点 · ${layoutMode==='branches'?'分支优先':'紧凑'} · ${direction==='TB'?'从上到下':'从左到右'}`);return ids
  }
  function openAutoLayoutMenu(){const ids=autoLayoutTargetIds(),scope=(currentSelectionIds().length>1)?`选中 ${ids.length} 个节点`:selectedGroupId?`当前组 ${ids.length} 个节点`:`全部 ${ids.length} 个节点`;modalShell('自动整理工作流',`<div class="auto-layout-dialog"><p>根据连线依赖自动分层，并使用重心排序减少分支交叉。适合把生成链路整理成清晰的主干、分支与汇合结构。</p><div class="auto-layout-scope">范围：<b>${escapeHtml(scope)}</b></div><div class="auto-layout-options"><button data-layout-mode="branches"><b>分支优先</b><span>拉开主干与支线，减少连线交叉</span></button><button data-layout-mode="compact"><b>紧凑布局</b><span>节省画布空间，适合简单流程</span></button></div><div class="auto-layout-options"><button data-layout-dir="LR"><b>从左到右</b><span>适合 AI 生成工作流</span></button><button data-layout-dir="TB"><b>从上到下</b><span>适合脚本 / 分镜流程</span></button></div><div class="feature-actions"><button id="cancelAutoLayout">取消</button><button id="runAutoLayout" class="primary">整理并适应视图</button></div></div>`);let dir=state.canvasSettings?.autoLayoutDirection||'LR',mode=state.canvasSettings?.autoLayoutMode||'branches';const sync=()=>{$$('[data-layout-dir]',featureModal).forEach(b=>b.classList.toggle('active',b.dataset.layoutDir===dir));$$('[data-layout-mode]',featureModal).forEach(b=>b.classList.toggle('active',b.dataset.layoutMode===mode))};$$('[data-layout-dir]',featureModal).forEach(b=>b.onclick=()=>{dir=b.dataset.layoutDir;sync()});$$('[data-layout-mode]',featureModal).forEach(b=>b.onclick=()=>{mode=b.dataset.layoutMode;sync()});sync();$('#cancelAutoLayout').onclick=closeFeatureModal;$('#runAutoLayout').onclick=()=>{closeFeatureModal();autoLayoutNodes(ids,{direction:dir,mode,fit:true})}}


  async function runCanvasStressBenchmark(count=1000){if(stressBenchmarking)return;stressBenchmarking=true;const original=deepClone(state),ui={selectedId,expandedNodeId,selectedGroupId},makeNode=i=>({id:'stress_n'+i,type:i%7===0?'video':'image',x:(i%50)*390,y:Math.floor(i/50)*285,w:320,title:`Stress ${i+1}`,prompt:'stress benchmark',providerId:'',modelId:'',modelName:'',content:i%7===0?'girls2':'city'});try{const nodes=Array.from({length:count},(_,i)=>makeNode(i)),edges=[];for(let i=0;i<count-1;i++){if((i+1)%50!==0)edges.push({id:'stress_e'+i,source:'stress_n'+i,target:'stress_n'+(i+1),type:'asset',role:i%7===0?'motion_reference':'image_reference',semanticRole:i%7===0?'motion_reference':'image_reference',targetSlot:i%7===0?'motion_reference':'image_reference'})}for(let i=0;i<count-50;i+=5)edges.push({id:'stress_b'+i,source:'stress_n'+i,target:'stress_n'+(i+50),type:'asset',role:'reference',semanticRole:'reference',targetSlot:'reference'});state=migrateState({...defaultState(),projectName:'Stress Benchmark',nodes,edges,groups:[],workflowRuns:[],viewport:{x:80,y:80,zoom:.86}});selectedId=null;expandedNodeId=null;selectedGroupId=null;const t0=performance.now();render();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const fullMs=performance.now()-t0,visibleNodes=$$('.node',nodeLayer).length,visibleEdges=$$('path.edge[data-edge-key]',edgeLayer).length,minis=$$('.mini-node',minimapNodes).length;const p0=performance.now();for(let i=0;i<60;i++){state.viewport.x-=9;state.viewport.y-=i%2?2:-2;applyViewportTransform({minimap:true,overlays:false})}const panMs=(performance.now()-p0)/60;const t1=performance.now(),rows=Math.ceil(count/50),targetX=9000,targetY=Math.max(0,(rows-4)*285);state.viewport.x=500-targetX*state.viewport.zoom;state.viewport.y=300-targetY*state.viewport.zoom;render();await new Promise(r=>requestAnimationFrame(r));const jumpMs=performance.now()-t1,jumpVisible=$$('.node',nodeLayer).length;state=original;selectedId=ui.selectedId;expandedNodeId=ui.expandedNodeId;selectedGroupId=ui.selectedGroupId;render();const mem=performance.memory?Math.round(performance.memory.usedJSHeapSize/1024/1024):null;modalShell(`画布压力测试 · ${count} 节点`,`<div class="stress-report"><div class="stress-metrics"><article><span>首次虚拟化渲染</span><b>${fullMs.toFixed(1)} ms</b></article><article><span>相机平移均值</span><b>${panMs.toFixed(2)} ms/frame</b></article><article><span>远距离跳转重绘</span><b>${jumpMs.toFixed(1)} ms</b></article><article><span>当前 DOM 节点</span><b>${visibleNodes} / ${count}</b></article><article><span>当前 DOM 连线</span><b>${visibleEdges} / ${edges.length}</b></article><article><span>跳转后 DOM 节点</span><b>${jumpVisible} / ${count}</b></article></div><div class="stress-summary"><b>${panMs<4&&visibleNodes<count*.2?'通过大型画布交互基线':'需要继续优化'}</b><span>小地图包含 ${minis} 个轻量节点${mem?` · JS Heap 约 ${mem} MB`:''}</span><small>测试在临时内存项目中执行，完成后已恢复你的原项目，没有写入项目数据。</small></div><div class="feature-actions"><button id="stress500">再测 500</button><button id="stress1000" class="primary">再测 1000</button></div></div>`,{wide:true});$('#stress500').onclick=()=>{closeFeatureModal();setTimeout(()=>runCanvasStressBenchmark(500),50)};$('#stress1000').onclick=()=>{closeFeatureModal();setTimeout(()=>runCanvasStressBenchmark(1000),50)}}catch(err){state=original;selectedId=ui.selectedId;expandedNodeId=ui.expandedNodeId;selectedGroupId=ui.selectedGroupId;render();showToast('压力测试失败：'+err.message)}finally{stressBenchmarking=false}}
  function openPerformanceDiagnostics(){modalShell('大型画布性能诊断',`<div class="stress-launch"><p>使用隔离的临时画布生成大量节点与连线，测试虚拟化渲染、相机平移和远距离跳转。不会修改或保存当前项目。</p><div class="stress-choice"><button data-stress-count="500"><b>500 节点</b><span>中大型项目</span></button><button data-stress-count="1000"><b>1000 节点</b><span>极限压力</span></button></div></div>`);$$('[data-stress-count]',featureModal).forEach(b=>b.onclick=()=>{const count=Number(b.dataset.stressCount);closeFeatureModal();setTimeout(()=>runCanvasStressBenchmark(count),50)})}

  function topologicalNodeOrder(ids){const set=new Set(ids),deg=new Map(ids.map(id=>[id,0])),adj=new Map(ids.map(id=>[id,[]]));state.edges.forEach(e=>{if(set.has(e.source)&&set.has(e.target)){adj.get(e.source).push(e.target);deg.set(e.target,deg.get(e.target)+1)}});const q=ids.filter(id=>deg.get(id)===0),out=[];while(q.length){const id=q.shift();out.push(id);for(const t of adj.get(id)||[]){deg.set(t,deg.get(t)-1);if(deg.get(t)===0)q.push(t)}}return out.length===ids.length?out:ids}
  function instantiateWorkflow(workflowId){
    snapshot(); const wf=toolboxWorkflows().find(w=>w.id===workflowId);
    if(wf?.template){
      const center={x:(viewport.clientWidth/2-state.viewport.x)/state.viewport.zoom,y:(viewport.clientHeight/2-state.viewport.y)/state.viewport.zoom};const map=new Map();const ids=[];
      wf.template.nodes.forEach(src=>{const n=JSON.parse(JSON.stringify(src));const old=n.id;n.id=uid('n');map.set(old,n.id);n.x=center.x+n.x;n.y=center.y+n.y;state.nodes.push(n);ids.push(n.id)});
      wf.template.edges.forEach(e=>state.edges.push({...e,id:uid('e'),source:map.get(e.source),target:map.get(e.target)}));createGroup(ids,wf.title,'workflow');saveState();render();showToast('工作流已发送到画布');return;
    }
    const baseX=500, baseY=190; const a={id:uid('n'),type:'image',x:baseX,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH,title:'参考图',content:'forest',prompt:'',providerId:'',modelId:'',modelName:''}; const b={id:uid('n'),type:'image',x:baseX+380,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH,title:'生成图',content:'girls',prompt:'参考图风格生成角色镜头',providerId:'',modelId:'',modelName:''}; const c={id:uid('n'),type:'video',x:baseX+780,y:baseY,w:MEDIA_NODE_DISPLAY_WIDTH,title:'图转视频',content:'girls2',prompt:'人物自然走动，电影感运镜',providerId:'',modelId:'',modelName:''}; state.nodes.push(a,b,c); state.edges.push({id:uid('e'),source:a.id,target:b.id,type:'image'},{id:uid('e'),source:b.id,target:c.id,type:'image'}); createGroup([a.id,b.id,c.id],'参考生图 → 图转视频','workflow');saveState(); render(); showToast('工作流已发送到画布');
  }

  function updateMinimapViewport(){if(!minimapMap||!minimapView)return;const {scale,ox,oy}=minimapMap,z=Math.max(.01,state.viewport.zoom),left=-state.viewport.x/z,top=-state.viewport.y/z;minimapView.style.left=(ox+left*scale)+'px';minimapView.style.top=(oy+top*scale)+'px';minimapView.style.width=Math.max(8,viewport.clientWidth/z*scale)+'px';minimapView.style.height=Math.max(6,viewport.clientHeight/z*scale)+'px'}
  function scheduleMinimapRender(){if(minimapFrame)return;minimapFrame=requestAnimationFrame(()=>{minimapFrame=0;renderMinimap()})}
  function renderMinimap(){if(!minimap||!minimapNodes||!minimapView)return;minimapNodes.innerHTML='';const W=190,H=120,pad=10,b=sceneBounds(),vw=Math.max(1,b.width),vh=Math.max(1,b.height),scale=Math.min((W-pad*2)/vw,(H-pad*2)/vh),ox=(W-vw*scale)/2-b.left*scale,oy=(H-vh*scale)/2-b.top*scale;minimapMap={scale,ox,oy,bounds:b};const frag=document.createDocumentFragment(),collapsedSeen=new Set();state.nodes.forEach(n=>{const cg=collapsedGroupForNode(n.id);if(cg){if(collapsedSeen.has(cg.id))return;collapsedSeen.add(cg.id);const gb=groupBounds(cg);if(!gb)return;const d=document.createElement('div');d.className='mini-node mini-group';d.dataset.groupId=cg.id;d.style.left=(ox+gb.left*scale)+'px';d.style.top=(oy+gb.top*scale)+'px';d.style.width=Math.max(4,(gb.right-gb.left)*scale)+'px';d.style.height=Math.max(4,(gb.bottom-gb.top)*scale)+'px';frag.appendChild(d);return}const d=document.createElement('div');d.className='mini-node';d.dataset.nodeId=n.id;d.style.left=(ox+n.x*scale)+'px';d.style.top=(oy+n.y*scale)+'px';d.style.width=Math.max(2,(n.w||320)*scale)+'px';d.style.height=Math.max(2,nodeHeight(n)*scale)+'px';frag.appendChild(d)});minimapNodes.appendChild(frag);updateMinimapViewport()}
  function fitView(ids=null,{maxZoom=1.35}={}){const b=sceneBounds(ids&&ids.length?ids:null),pad=96,z=Math.max(.1,Math.min(maxZoom,Math.min((viewport.clientWidth-pad*2)/Math.max(1,b.width),(viewport.clientHeight-pad*2)/Math.max(1,b.height))));state.viewport.zoom=z;state.viewport.x=viewport.clientWidth/2-(b.left+b.right)/2*z;state.viewport.y=viewport.clientHeight/2-(b.top+b.bottom)/2*z;applyViewportTransform();queueViewportSave();render()}
  function focusNode(id){const n=state.nodes.find(x=>x.id===id);if(!n)return;const cg=collapsedGroupForNode(id);if(cg){cg.collapsed=false;selectedGroupId=cg.id}state.selectedIds=[id];selectedId=id;selectedGroupId=null;expandedNodeId=id;const cx=n.x+(n.w||320)/2,cy=n.y+nodeHeight(n)/2,z=Math.max(.65,Math.min(1.15,state.viewport.zoom));state.viewport.zoom=z;state.viewport.x=viewport.clientWidth/2-cx*z;state.viewport.y=Math.max(70,viewport.clientHeight/2-cy*z);render();queueViewportSave()}
  function openCanvasSearch(){const items=state.nodes.map(n=>({id:n.id,type:n.type,title:n.title||labelForType(n.type),text:`${n.prompt||''} ${n.text||''} ${n.modelName||''}`}));modalShell('搜索与定位',`<div class="canvas-search"><input id="canvasSearchInput" placeholder="搜索节点名称、提示词、模型…" autofocus><div id="canvasSearchResults"></div></div>`,{wide:true});const draw=()=>{const q=$('#canvasSearchInput').value.trim().toLowerCase(),matches=items.filter(x=>!q||`${x.title} ${x.text}`.toLowerCase().includes(q)).slice(0,60);$('#canvasSearchResults').innerHTML=matches.map(x=>`<button data-focus-node="${x.id}"><i>${escapeHtml(labelForType(x.type))}</i><span><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.text.slice(0,100)||'无提示词')}</small></span><em>定位</em></button>`).join('')||'<div class="feature-empty">没有匹配节点</div>';$$('[data-focus-node]',featureModal).forEach(b=>b.onclick=()=>{const id=b.dataset.focusNode;closeFeatureModal();focusNode(id)})};$('#canvasSearchInput').oninput=draw;draw();setTimeout(()=>$('#canvasSearchInput')?.focus(),0)}
  function showZoomMenu(){const r=$('#zoomBtn').getBoundingClientRect(),ids=currentSelectionIds();contextMenu.style.left=Math.max(8,r.left)+'px';contextMenu.style.top=Math.max(8,r.top-244)+'px';contextMenu.innerHTML=`<button class="menu-item" data-view="all">适应全部节点</button><button class="menu-item" data-view="selected" ${ids.length?'':'disabled'}>适应选中 (${ids.length})</button><button class="menu-item" data-view="100">100%</button><button class="menu-item" data-view="search">搜索 / 定位节点</button><div class="menu-sep"></div><button class="menu-item" data-view="layout">自动排版</button><button class="menu-item" data-view="snap">${state.canvasSettings?.snap!==false?'✓ ':''}吸附与对齐线</button><button class="menu-item" data-view="stress">大型画布性能诊断</button>`;contextMenu.classList.remove('hidden');$$('[data-view]',contextMenu).forEach(b=>b.onclick=()=>{const a=b.dataset.view;if(a==='all')fitView();if(a==='selected'&&ids.length)fitView(ids,{maxZoom:1.25});if(a==='100'){state.viewport.zoom=1;applyViewportTransform();queueViewportSave();render()}if(a==='search')openCanvasSearch();if(a==='layout')openAutoLayoutMenu();if(a==='stress')openPerformanceDiagnostics();if(a==='snap'){state.canvasSettings.snap=state.canvasSettings.snap===false;saveState();showToast(state.canvasSettings.snap?'已开启吸附':'已关闭吸附')}contextMenu.classList.add('hidden')})}

  // v3.6.4 · workspace canvases + LibTV-style workflow/storyboard dual view
  function persistWorkspaceName(){try{globalThis.CanvasBrowserStorageManager.setItem(WORKSPACE_NAME_KEY,workspaceName)}catch{}}
  function showWorkspaceMenu(){
    const r=$('#brandButton').getBoundingClientRect();projectMenu.style.left=r.left+'px';projectMenu.style.top=(r.bottom+5)+'px';projectMenu.classList.remove('canvas-menu');projectMenu.innerHTML=`<button class="menu-item" id="renameWorkspace">重命名工作区</button><button class="menu-item" id="workspaceCanvases">管理画布</button>`;projectMenu.classList.remove('hidden');
    $('#renameWorkspace').onclick=()=>{const v=prompt('重命名工作区',workspaceName);if(v&&v.trim()){workspaceName=v.trim();persistWorkspaceName();if(workspaceNameEl)workspaceNameEl.textContent=workspaceName;projectMenu.classList.add('hidden');showToast('工作区已重命名')}};
    $('#workspaceCanvases').onclick=()=>{projectMenu.classList.add('hidden');showCanvasMenu()};
  }
  async function listCanvasProjects(){
    if(backendOnline&&authenticated){try{return (await apiJson('/api/projects')).projects||[]}catch(e){showToast(e.message)}}
    return [{id:state.projectId||'__local__',name:state.projectName||'画布 1',version:1,updatedAt:state.projectUpdatedAt||new Date().toISOString()}];
  }
  async function switchCanvasProject(projectId){
    if(!projectId||projectId===state.projectId)return;
    if(!(backendOnline&&authenticated))return showToast('多画布切换需要本地服务已连接');
    try{
      await flushProjectSave(false).catch(()=>{});undoStack.length=0;redoStack.length=0;selectedGroupId=null;selectedId=null;expandedNodeId=null;
      const r=await apiJson('/api/projects/'+encodeURIComponent(projectId));if(!r.project?.data)throw new Error('画布不存在');
      state=migrateState(r.project.data);state.projectId=r.project.id;state.projectName=r.project.name||state.projectName;state.projectUpdatedAt=r.project.updatedAt;selectedId=state.nodes.find(n=>n.selected)?.id||null;
      try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{};hideMenus();render();showToast(`已切换到「${state.projectName}」`);
    }catch(e){showToast('切换画布失败：'+e.message)}
  }
  async function renameCanvasProject(project){
    const v=prompt('重命名画布',project?.name||state.projectName);if(!v||!v.trim())return;const name=v.trim();
    try{
      if(project.id===state.projectId||(!project.id&&!state.projectId)){state.projectName=name;saveState();if(backendOnline&&authenticated&&state.projectId)await flushProjectSave(false);render();showToast('画布已重命名');return}
      if(backendOnline&&authenticated&&project.id){const r=await apiJson('/api/projects/'+encodeURIComponent(project.id));if(!r.project?.data)throw new Error('画布不存在');await apiJson('/api/projects/'+encodeURIComponent(project.id),{method:'PUT',body:JSON.stringify({name,data:r.project.data,forceSnapshot:false})});showToast('画布已重命名')}
    }catch(e){showToast('重命名失败：'+e.message)}
  }
  async function duplicateCanvasProject(project){
    if(!(backendOnline&&authenticated))return showToast('复制画布需要本地服务已连接');
    try{const r=await apiJson('/api/projects/'+encodeURIComponent(project.id));if(!r.project?.data)throw new Error('画布不存在');const data=migrateState(deepClone(r.project.data));data.projectId='';data.projectName=(project.name||'画布')+' 副本';data.projectUpdatedAt='';const created=await apiJson('/api/projects',{method:'POST',body:JSON.stringify({name:data.projectName,data})});showToast('画布副本已创建');return created.project}catch(e){showToast('复制画布失败：'+e.message)}}
  async function deleteCanvasProject(project,allProjects=[]){
    if(allProjects.length<=1)return showToast('工作区至少保留一个画布');
    if(!confirm(`删除画布「${project.name}」？此操作不可撤销。`))return;
    try{
      if(backendOnline&&authenticated&&project.id)await apiJson('/api/projects/'+encodeURIComponent(project.id),{method:'DELETE'});
      if(project.id===state.projectId){const next=allProjects.find(p=>p.id!==project.id);if(next)await switchCanvasProject(next.id)}
      showToast('画布已删除');
    }catch(e){showToast('删除画布失败：'+e.message)}
  }
  async function showCanvasActions(project,anchor,projects){
    const r=anchor.getBoundingClientRect();contextMenu.style.left=Math.min(window.innerWidth-205,r.right+6)+'px';contextMenu.style.top=Math.min(window.innerHeight-180,r.top)+'px';contextMenu.className='context-menu canvas-actions-menu';contextMenu.innerHTML=`<button class="menu-item" data-canvas-action="open-window">在新窗口打开</button><button class="menu-item" data-canvas-action="rename">重命名画布</button><button class="menu-item" data-canvas-action="duplicate">复制画布</button><div class="menu-sep"></div><button class="menu-item danger" data-canvas-action="delete" ${projects.length<=1?'disabled':''}>删除画布</button>`;contextMenu.classList.remove('hidden');
    $$('[data-canvas-action]',contextMenu).forEach(b=>b.onclick=async()=>{const act=b.dataset.canvasAction;if(act==='open-window'&&project.id){window.open(location.pathname+'?projectId='+encodeURIComponent(project.id),'_blank','noopener')}if(act==='rename')await renameCanvasProject(project);if(act==='duplicate')await duplicateCanvasProject(project);if(act==='delete')await deleteCanvasProject(project,projects);contextMenu.classList.add('hidden');if(act!=='open-window')showCanvasMenu()});
  }
  async function showCanvasMenu(){
    const projects=await listCanvasProjects(),r=$('#projectName').getBoundingClientRect();projectMenu.style.left=Math.max(8,r.left)+'px';projectMenu.style.top=(r.bottom+6)+'px';projectMenu.classList.add('canvas-menu');projectMenu.innerHTML=`<div class="canvas-menu-head"><span>画布</span><button id="canvasAddBtn" title="新增画布">${uiIcon('plus')}</button></div><div class="canvas-menu-list">${projects.map((p,i)=>`<div class="canvas-menu-row ${p.id===state.projectId||(!state.projectId&&i===0)?'current':''}"><button class="canvas-menu-select" data-canvas-id="${escapeAttr(p.id||'__local__')}">${escapeHtml(p.name||`画布 ${i+1}`)}${p.id===state.projectId?'<span class="canvas-menu-check">✓</span>':''}</button><button class="canvas-menu-more" data-canvas-more="${escapeAttr(p.id||'__local__')}" title="画布操作">${uiIcon('more')}</button></div>`).join('')}</div>`;projectMenu.classList.remove('hidden');
    $('#canvasAddBtn').onclick=async()=>{const name=`画布 ${projects.length+1}`;projectMenu.classList.add('hidden');await createNewServerProject(name)};
    $$('[data-canvas-id]',projectMenu).forEach(b=>b.onclick=async()=>{projectMenu.classList.add('hidden');await switchCanvasProject(b.dataset.canvasId)});
    $$('[data-canvas-more]',projectMenu).forEach(b=>b.onclick=e=>{e.stopPropagation();const p=projects.find(x=>String(x.id)===String(b.dataset.canvasMore));if(p)showCanvasActions(p,b,projects)});
  }

  function setCanvasViewMode(mode,{persist=true}={}){
    mode=mode==='storyboard'?'storyboard':'workflow';state.canvasSettings=state.canvasSettings||{};state.canvasSettings.viewMode=mode;if(persist)saveState();renderCanvasViewMode();
  }
  function firstLinkedNode(startId,type,direction='down'){
    const seen=new Set([startId]),q=[startId];while(q.length){const id=q.shift(),links=direction==='down'?state.edges.filter(e=>e.source===id).map(e=>e.target):state.edges.filter(e=>e.target===id).map(e=>e.source);for(const next of links){if(seen.has(next))continue;seen.add(next);const n=state.nodes.find(x=>x.id===next);if(n?.type===type)return n;q.push(next)}}return null;
  }
  function storyboardScriptForFrame(frame){return firstLinkedNode(frame.id,'script','up')||firstLinkedNode(frame.id,'text','up')||null}
  function storyboardVideoForFrame(frame){return firstLinkedNode(frame.id,'video','down')||state.nodes.find(n=>n.type==='video'&&n.toolParams?.sourceFrameId===frame.id)||null}
  function storyboardAudioForFrame(frame,video){return (video&&firstLinkedNode(video.id,'audio','down'))||firstLinkedNode(frame.id,'audio','down')||null}
  function storyboardMediaUrl(n){return n?.outputUrl||nodeResultVersions(n||{}).at(-1)?.outputUrl||''}
  function storyboardViewGroups(){return (state.groups||[]).filter(g=>g.kind==='storyboard'&&storyboardOrderedNodes(g).length)}
  function activeStoryboardViewGroup(){const groups=storyboardViewGroups();if(!groups.length)return null;let g=groups.find(x=>x.id===state.canvasSettings?.storyboardGroupId)||groups[0];state.canvasSettings.storyboardGroupId=g.id;return g}
  function createStoryboardGroupFromCanvasImages(){const imgs=state.nodes.filter(n=>n.type==='image').sort((a,b)=>a.y-b.y||a.x-b.x).slice(0,25);if(imgs.length<2)return showToast('至少需要两张图片才能创建故事版');snapshot('创建故事版视图');const g=createGroup(imgs.map(n=>n.id),'故事版','storyboard',{grid:storyboardGridForCount(imgs.length),ratio:imgs[0].aspectRatio||'16:9'});if(g){state.canvasSettings.storyboardGroupId=g.id;saveState();render();setCanvasViewMode('storyboard')};return g}
  function createStoryboardVideoNode(g,frame,index){const existing=storyboardVideoForFrame(frame);if(existing)return existing;const f=storyboardFrameData(frame,index),videoModel=availableModels('video')[0],nodes=storyboardOrderedNodes(g),baseY=Math.max(...nodes.map(n=>n.y+nodeHeight(n)))+110,v={id:uid('n'),type:'video',x:frame.x,y:baseY,w:310,title:`Video · ${String(index+1).padStart(2,'0')} · ${f.label||frame.title||'Shot'}`,prompt:[frame.prompt,`视频运动：${f.movement}`,`保持当前分镜构图、主体身份、场景连续性`].filter(Boolean).join('。'),providerId:videoModel?.providerId||'',modelId:videoModel?.id||'',modelName:videoModel?.name||'',aspectRatio:g.meta?.ratio||frame.aspectRatio||'16:9',duration:5,videoMode:'frame2video',toolParams:{operation:'storyboard_to_video',storyboardGroupId:g.id,sourceFrameId:frame.id,shotSize:f.shotSize,angle:f.angle,movement:f.movement}};state.nodes.push(v);state.edges.push(makeSemanticEdge(frame.id,v.id,'asset','first_frame'));return v}
  function storyboardViewRowHtml(g,frame,index){
    const fd=storyboardFrameData(frame,index),script=storyboardScriptForFrame(frame),video=storyboardVideoForFrame(frame),audio=storyboardAudioForFrame(frame,video),imgUrl=storyboardMediaUrl(frame),videoUrl=storyboardMediaUrl(video),audioUrl=storyboardMediaUrl(audio),refs=collectReferences(frame.id).filter(r=>['image','text'].includes(r.type)).slice(0,3),copy=(script?.generatedText||script?.text||script?.sourceText||frame.prompt||fd.intent||'').trim();
    const refText=refs.length?`参考：${refs.map(r=>r.title||labelForType(r.type)).join(' · ')}`:'暂无额外参考素材';
    return `<article class="storyboard-shot-row" draggable="true" data-story-shot="${escapeAttr(frame.id)}"><div class="storyboard-shot-cell storyboard-shot-index"><b>镜头 ${String(index+1).padStart(2,'0')}</b><i>${escapeHtml(fd.shotSize||'中景')} · ${escapeHtml(fd.angle||'平视')}</i><span>${escapeHtml(fd.movement||'静止')}<br>${escapeHtml(fd.intent||frame.title||'')}</span></div><div class="storyboard-shot-cell storyboard-shot-copy"><b>${escapeHtml(script?.title||'脚本 / 提示词')}</b><p>${escapeHtml(copy||'当前镜头还没有脚本说明')}</p><small>${escapeHtml(refText)}</small><div class="storyboard-shot-actions"><button data-sb-view-open-node="${escapeAttr(frame.id)}">在工作流中定位</button><button data-sb-view-edit-group="${escapeAttr(g.id)}">编辑镜头设计</button></div></div><div class="storyboard-shot-cell">${imgUrl?`<div class="storyboard-media-card"><img src="${escapeAttr(imgUrl)}" alt="镜头 ${index+1} 分镜图"><div class="storyboard-media-meta"><span>${escapeHtml(frame.title||'分镜图')}</span></div></div>`:`<div class="storyboard-media-card empty">尚未生成分镜图</div>`}<div class="storyboard-shot-actions"><button class="primary" data-sb-view-generate-image="${escapeAttr(frame.id)}">${imgUrl?'重新生成':'生成分镜图'}</button></div></div><div class="storyboard-shot-cell">${videoUrl?`<div class="storyboard-media-card"><video src="${escapeAttr(videoUrl)}" muted preload="metadata" playsinline></video><div class="storyboard-media-meta"><span>${escapeHtml(video.title||'分镜视频')}</span></div></div>`:`<div class="storyboard-media-card empty">还没有对应视频节点</div>`}<div class="storyboard-shot-actions">${video?`<button class="primary" data-sb-view-generate-video="${escapeAttr(video.id)}">${videoUrl?'重新生成':'生成视频'}</button><button data-sb-view-open-node="${escapeAttr(video.id)}">打开节点</button>`:`<button class="primary" data-sb-view-create-video="${escapeAttr(frame.id)}">创建视频节点</button>`}</div></div><div class="storyboard-shot-cell">${audio?`<div class="storyboard-audio-card"><i>♪</i><span><b>${escapeHtml(audio.title||'音频')}</b><small>${audioUrl?'已生成':'等待生成'}</small></span></div>${audioUrl?`<audio src="${escapeAttr(audioUrl)}" controls preload="metadata"></audio>`:''}`:`<div class="storyboard-media-card empty">暂无镜头音频</div>`}</div></article>`;
  }
  function bindStoryboardView(g){
    if(!storyboardView||!g)return;storyboardView.onpointerdown=e=>e.stopPropagation();storyboardView.onwheel=e=>e.stopPropagation();
    $('#sbViewGroupSelect',storyboardView)?.addEventListener('change',e=>{state.canvasSettings.storyboardGroupId=e.target.value;saveState();renderCanvasViewMode()});
    $('#sbViewEdit',storyboardView)?.addEventListener('click',()=>openStoryboardStudio(g.id));
    $('#sbViewBackWorkflow',storyboardView)?.addEventListener('click',()=>setCanvasViewMode('workflow'));
    $('#sbViewCreateMissing',storyboardView)?.addEventListener('click',()=>{snapshot('批量补齐故事版视频节点');const frames=storyboardOrderedNodes(g);let created=0;frames.forEach((f,i)=>{if(!storyboardVideoForFrame(f)){createStoryboardVideoNode(g,f,i);created++}});saveState();render();showToast(created?`已创建 ${created} 个缺失视频节点`:'所有镜头都已有视频节点')});
    $('#sbViewRunVideos',storyboardView)?.addEventListener('click',async()=>{const ids=storyboardOrderedNodes(g).map(f=>storyboardVideoForFrame(f)?.id).filter(Boolean);if(!ids.length)return showToast('先创建故事版视频节点');await executeWorkflowIds(ids,{title:`${g.title||'故事版'} · 视频生成`});renderCanvasViewMode()});
    $$('[data-sb-view-open-node]',storyboardView).forEach(b=>b.onclick=()=>{setCanvasViewMode('workflow');requestAnimationFrame(()=>focusNode(b.dataset.sbViewOpenNode))});
    $$('[data-sb-view-edit-group]',storyboardView).forEach(b=>b.onclick=()=>openStoryboardStudio(b.dataset.sbViewEditGroup));
    $$('[data-sb-view-generate-image]',storyboardView).forEach(b=>b.onclick=async()=>{const n=state.nodes.find(x=>x.id===b.dataset.sbViewGenerateImage);if(n){await generateForNode(n);renderCanvasViewMode()}});
    $$('[data-sb-view-create-video]',storyboardView).forEach(b=>b.onclick=()=>{const frame=state.nodes.find(x=>x.id===b.dataset.sbViewCreateVideo),i=storyboardOrderedNodes(g).findIndex(n=>n.id===frame?.id);if(frame){snapshot('创建故事版视频节点');createStoryboardVideoNode(g,frame,i);saveState();render();showToast('视频节点已创建')}});
    $$('[data-sb-view-generate-video]',storyboardView).forEach(b=>b.onclick=async()=>{const n=state.nodes.find(x=>x.id===b.dataset.sbViewGenerateVideo);if(n){await generateForNode(n);renderCanvasViewMode()}});
    $$('[data-story-shot]',storyboardView).forEach(row=>{row.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/storyboard-shot',row.dataset.storyShot)};row.ondragover=e=>{e.preventDefault();row.classList.add('drag-over')};row.ondragleave=()=>row.classList.remove('drag-over');row.ondrop=e=>{e.preventDefault();row.classList.remove('drag-over');const from=e.dataTransfer.getData('text/storyboard-shot'),to=row.dataset.storyShot;if(!from||from===to)return;const meta=storyboardMeta(g),order=[...meta.frameOrder],fi=order.indexOf(from),ti=order.indexOf(to);if(fi<0||ti<0)return;snapshot('调整故事版镜头顺序');order.splice(ti,0,order.splice(fi,1)[0]);meta.frameOrder=order;g.nodeIds=[...order];layoutStoryboardGroup(g,{save:false,render:false});saveState();render();showToast('镜头顺序已更新')}});
  }
  function renderStoryboardBoardView(){
    if(!storyboardView)return;storyboardView.onpointerdown=e=>e.stopPropagation();storyboardView.ondblclick=e=>e.stopPropagation();storyboardView.onwheel=e=>e.stopPropagation();const groups=storyboardViewGroups(),g=activeStoryboardViewGroup();storyboardView.classList.remove('hidden');
    if(!g){const images=state.nodes.filter(n=>n.type==='image'),script=state.nodes.find(n=>n.type==='script'),selectedImage=state.nodes.find(n=>n.id===selectedId&&n.type==='image');storyboardView.innerHTML=`<div class="storyboard-view-shell"><div class="storyboard-view-head"><div><h2>故事版</h2><p>按镜头查看脚本、分镜图、视频与音频；拖拽镜头可以调整顺序。</p></div></div><div class="storyboard-view-empty"><div><h3>当前画布还没有故事版</h3><p>工作流视图负责节点关系与自动执行；故事版视图负责逐镜头检查、排序和生成衔接。先从现有图片或脚本创建一个故事版。</p>${images.length>=2?'<button id="sbViewCreateFromImages">使用当前图片创建故事版</button>':selectedImage?'<button id="sbViewCreateFromSelected">从选中图片扩展故事版</button>':script?'<button id="sbViewCreateFromScript">从脚本创建故事版</button>':'<button id="sbViewBackWorkflow">返回工作流添加素材</button>'}</div></div></div>`;$('#sbViewCreateFromImages',storyboardView)?.addEventListener('click',createStoryboardGroupFromCanvasImages);$('#sbViewCreateFromSelected',storyboardView)?.addEventListener('click',()=>openStoryboardFromImage(selectedImage));$('#sbViewCreateFromScript',storyboardView)?.addEventListener('click',()=>createStoryboardFromSource(script,{count:9,mode:'cinematic',concept:script.sourceText||'',ratio:'16:9'}));$('#sbViewBackWorkflow',storyboardView)?.addEventListener('click',()=>setCanvasViewMode('workflow'));return}
    const frames=storyboardOrderedNodes(g),videos=frames.map(f=>storyboardVideoForFrame(f)).filter(Boolean),audios=frames.map(f=>storyboardAudioForFrame(f,storyboardVideoForFrame(f))).filter(Boolean),readyImages=frames.filter(f=>storyboardMediaUrl(f)).length,readyVideos=videos.filter(v=>storyboardMediaUrl(v)).length;
    storyboardView.innerHTML=`<div class="storyboard-view-shell"><div class="storyboard-view-head"><div><h2>故事版</h2><p>画布逻辑在“工作流”视图；镜头细节、顺序、分镜图、视频和音频在这里集中处理。</p></div><div class="storyboard-view-actions"><select id="sbViewGroupSelect">${groups.map(x=>`<option value="${escapeAttr(x.id)}" ${x.id===g.id?'selected':''}>${escapeHtml(x.title||'故事版')} · ${storyboardOrderedNodes(x).length} 镜</option>`).join('')}</select><button id="sbViewEdit">镜头设计</button><button id="sbViewCreateMissing">补齐视频节点</button><button id="sbViewRunVideos" class="primary">生成故事版视频</button><button id="sbViewBackWorkflow">工作流视图</button></div></div><div class="storyboard-view-summary"><article><span>镜头</span><b>${frames.length}</b></article><article><span>分镜图已生成</span><b>${readyImages}/${frames.length}</b></article><article><span>视频已生成</span><b>${readyVideos}/${frames.length}</b></article><article><span>镜头音频</span><b>${audios.length}</b></article></div><div class="storyboard-board"><div class="storyboard-board-head"><div>镜头</div><div>脚本 / 提示词 / 参考</div><div>分镜图</div><div>视频</div><div>音频</div></div>${frames.map((f,i)=>storyboardViewRowHtml(g,f,i)).join('')}</div></div>`;bindStoryboardView(g);
  }
  function renderCanvasViewMode(){
    const mode=state.canvasSettings?.viewMode==='storyboard'?'storyboard':'workflow',story=mode==='storyboard';workflowViewBtn?.classList.toggle('active',!story);storyboardViewBtn?.classList.toggle('active',story);viewport.classList.toggle('storyboard-mode',story);viewport.classList.toggle('grab-mode',currentInteractionMode()==='grab'&&!story);if(story){drawer.classList.add('hidden');toolbar.classList.add('hidden');generator.classList.add('hidden');bottomDock?.classList.add('hidden');$('.bottom-left')?.classList.add('hidden');$('.bottom-center-hint')?.classList.add('hidden');renderStoryboardBoardView()}else{storyboardView?.classList.add('hidden');bottomDock?.classList.remove('hidden');$('.bottom-left')?.classList.remove('hidden');$('.bottom-center-hint')?.classList.remove('hidden')}
  }

  async function createNewServerProject(name=''){await flushProjectSave(true).catch(()=>{});undoStack.length=0;redoStack.length=0;selectedGroupId=null;const fresh=defaultState();fresh.nodes=[];fresh.edges=[];fresh.groups=[];fresh.history=[];fresh.assets=[];fresh.subjects=[];fresh.projectName=String(name||'').trim()||`画布 ${Math.max(1,(await listCanvasProjects()).length+1)}`;fresh.projectId='';state=migrateState(fresh);selectedId=null;expandedNodeId=null;await ensureServerProject();saveState();render();showToast(`已创建「${state.projectName}」`);}
  async function openProjectManager(){
    let projects=[];try{projects=(await apiJson('/api/projects')).projects||[]}catch(e){return showToast(e.message)}let versions=[];if(state.projectId)try{versions=(await apiJson('/api/projects/'+encodeURIComponent(state.projectId)+'/versions')).versions||[]}catch{}modalShell('全部项目',`<div class="project-manager"><section class="project-list-pane"><div class="project-manager-head"><h3>项目库</h3><button id="pmNewProject" class="primary">＋ 新项目</button></div>${projects.map(p=>`<button class="project-card ${p.id===state.projectId?'active':''}" data-project-id="${p.id}"><div><b>${escapeHtml(p.name)}</b><span>v${p.version} · ${new Date(p.updatedAt).toLocaleString()}</span></div>${p.id!==state.projectId?`<i data-project-delete="${p.id}">删除</i>`:'<i>当前</i>'}</button>`).join('')||'<div class="feature-empty">暂无项目</div>'}</section><aside class="project-version-pane"><h3>当前项目版本</h3><p>${escapeHtml(state.projectName)}</p><button id="pmSnapshot">创建版本快照</button><div class="version-list">${versions.map(v=>`<div><b>v${v.version}</b><span>${new Date(v.createdAt).toLocaleString()}</span><button data-restore-version="${v.version}">恢复</button></div>`).join('')||'<div class="feature-empty">暂无版本</div>'}</div></aside></div>`,{wide:true});
    $('#pmNewProject').onclick=async()=>{closeFeatureModal();await createNewServerProject()};$$('[data-project-id]',featureModal).forEach(b=>b.onclick=async e=>{if(e.target.closest('[data-project-delete]'))return;await flushProjectSave(false).catch(()=>{});undoStack.length=0;redoStack.length=0;selectedGroupId=null;const r=await apiJson('/api/projects/'+encodeURIComponent(b.dataset.projectId));if(r.project?.data){state=migrateState(r.project.data);state.projectId=r.project.id;state.projectName=r.project.name||state.projectName;state.projectUpdatedAt=r.project.updatedAt;selectedId=state.nodes.find(n=>n.selected)?.id||null;try{globalThis.CanvasBrowserStorageManager.setItem('libtv-clone-state',JSON.stringify(state))}catch{}closeFeatureModal();render();showToast('已切换项目')}});$$('[data-project-delete]',featureModal).forEach(b=>b.onclick=async e=>{e.stopPropagation();if(confirm('永久删除这个项目？')){await apiJson('/api/projects/'+encodeURIComponent(b.dataset.projectDelete),{method:'DELETE'});openProjectManager()}});$('#pmSnapshot').onclick=async()=>{await saveProjectToServer(true);openProjectManager();showToast('项目快照已创建')};$$('[data-restore-version]',featureModal).forEach(b=>b.onclick=async()=>{if(!confirm(`恢复到 v${b.dataset.restoreVersion}？当前状态会先作为版本保留。`))return;await saveProjectToServer(true);const r=await apiJson(`/api/projects/${encodeURIComponent(state.projectId)}/restore/${b.dataset.restoreVersion}`,{method:'POST',body:'{}'});if(r.project?.data){state=migrateState(r.project.data);state.projectId=r.project.id;state.projectUpdatedAt=r.project.updatedAt;saveState();closeFeatureModal();render();showToast('历史版本已恢复')}});
  }
  function showProjectMenu(){
    const r=$('#brandButton').getBoundingClientRect();projectMenu.style.left=r.left+'px';projectMenu.style.top=(r.bottom+5)+'px';projectMenu.innerHTML=`<button class="menu-item" id="allProjects">全部项目</button><button class="menu-item" id="newProject">创建新项目</button><button class="menu-item" id="snapshotProject">保存版本快照</button><div class="menu-sep"></div><button class="menu-item danger" id="deleteProject">删除项目</button>`;projectMenu.classList.remove('hidden');$('#allProjects').onclick=()=>{projectMenu.classList.add('hidden');openProjectManager()};$('#newProject').onclick=()=>{projectMenu.classList.add('hidden');createNewServerProject()};$('#snapshotProject').onclick=async()=>{await saveProjectToServer(true);projectMenu.classList.add('hidden');showToast('已保存项目版本快照')};$('#deleteProject').onclick=async()=>{if(!confirm('确认永久删除当前项目？'))return;try{if(state.projectId)await apiJson('/api/projects/'+encodeURIComponent(state.projectId),{method:'DELETE'});globalThis.CanvasBrowserStorageManager.removeItem('libtv-clone-state');state=migrateState(defaultState());state.projectId='';selectedId=state.nodes.find(n=>n.selected)?.id||null;await ensureServerProject();saveState();render();projectMenu.classList.add('hidden');showToast('项目已删除')}catch(e){showToast(e.message)}};
  }


  function setDockAddOpen(open){
    quickAddMenuOpen=!!open;
    bottomDock?.classList.toggle('add-open',!!open);
    bottomDock?.querySelector('[data-dock-action="add"]')?.classList.toggle('open',!!open);
  }
  function hideMenus(){ contextMenu.classList.add('hidden');contextMenu.classList.remove('quick-add-menu','libtv-add-menu','command-palette','dock-mode-menu'); projectMenu.classList.add('hidden'); modelPicker?.classList.add('hidden'); setDockAddOpen(false); setDockModeMenuOpen(false); }
  function showToast(msg){ toast.textContent=msg;toast.classList.remove('hidden');clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>toast.classList.add('hidden'),1700); }
  function labelForType(t){ return ({text:'文本',image:'图片',video:'视频',audio:'音频',script:'脚本',director:'导演台'})[t] || t; }
  function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function escapeAttr(s=''){return escapeHtml(String(s)).replace(/`/g,'&#96;')}

  function emptyProviderDraft(){return {id:'',name:'',protocol:'auto',videoProtocol:'auto',videoProtocolConfig:{createPath:'/v1/videos',pollPath:'/v1/videos/{{taskId}}',contentPath:'/v1/videos/{{taskId}}/content',taskIdPath:'',statusPath:'',progressPath:'',outputPath:'',successValues:['succeeded','completed','success','done','finished'],failureValues:['failed','error','cancelled','canceled'],pollIntervalMs:1500,timeoutMs:1200000},baseUrl:'',apiKey:'',authHeader:'Authorization',authScheme:'Bearer',testPath:'',modelsPath:'',referenceTransport:'auto',publicBaseUrl:'',uploadPath:'',uploadFileField:'file',uploadOutputPath:'data.url',allowPrivateHosts:false,downloadOutputs:true,defaultHeaders:{},models:[]}}
  function defaultModelRoute(modality='image',protocol='generic-rest'){
    const base={id:'',name:labelForType(modality)+'模型',modality,enabled:true,adapterKey:'auto',operationRoutes:{},createPath:'',method:'POST',responseMode:'async',outputPath:'output.url',taskIdPath:'id',pollPath:'/v1/tasks/{{taskId}}',statusPath:'status',progressPath:'progress',successValues:['succeeded','completed','success'],failureValues:['failed','error','cancelled'],pollIntervalMs:1500,timeoutMs:1200000,requestTemplate:{model:'{{model}}',prompt:'{{prompt}}',references:'{{references}}',images:'{{images}}',videos:'{{videos}}',audios:'{{audios}}',aspect_ratio:'{{aspectRatio}}',duration:'{{duration}}',resolution:'{{resolution}}',parameters:'{{params}}'},capabilities:defaultCapabilities(modality)};
    if(protocol==='openai-compatible'&&modality==='text')return{...base,adapterKey:'openai-chat',name:'文本模型',createPath:'',responseMode:'sync',outputPath:'choices.0.message.content',taskIdPath:'',pollPath:'',statusPath:'',progressPath:'',timeoutMs:120000,requestTemplate:{model:'{{model}}',prompt:'{{prompt}}'}};
    if(protocol==='openai-compatible'&&modality==='image')return{...base,adapterKey:'openai-image',name:'图片模型',createPath:'',responseMode:'sync',outputPath:'data.0.url',taskIdPath:'',pollPath:'',statusPath:'',progressPath:'',timeoutMs:120000,requestTemplate:{model:'{{model}}',prompt:'{{prompt}}'}};
    if(protocol==='openai-compatible'&&modality==='audio')return{...base,adapterKey:'openai-audio-speech',name:'音频模型',createPath:'',responseMode:'sync',outputPath:'',taskIdPath:'',pollPath:'',statusPath:'',progressPath:'',timeoutMs:120000,requestTemplate:{model:'{{model}}',prompt:'{{prompt}}'}};
    if(protocol==='comfyui')return{...base,adapterKey:'comfyui-workflow',id:'workflow-'+modality,name:'ComfyUI '+labelForType(modality),createPath:'/prompt',responseMode:'async',outputPath:'',taskIdPath:'prompt_id',pollPath:'/history/{{taskId}}',statusPath:'',progressPath:'',successValues:['success'],failureValues:['error'],requestTemplate:{}};
    return base;
  }

  function openProviderModal(){
    activeProviderId=activeProviderId||providers[0]?.id||'__new__';
    providerEditorDraft=activeProviderId==='__new__'?emptyProviderDraft():JSON.parse(JSON.stringify(providerById(activeProviderId)||emptyProviderDraft()));
    discoveredModels=[];discoveredEndpoint='';
    renderProviderModal();providerModal.classList.remove('hidden');
  }
  function readProviderDraftFromDom(){
    if(providerModal.classList.contains('hidden')||!$('.provider-editor',providerModal)) return providerEditorDraft||emptyProviderDraft();
    const base={...(providerEditorDraft||emptyProviderDraft())};
    const val=id=>$('#'+id,providerModal)?.value??'';
    base.name=val('prvName');base.protocol=val('prvProtocol');base.videoProtocol=val('prvVideoProtocol')||base.videoProtocol||'auto';
    const oldVideoCfg=(base.videoProtocolConfig&&typeof base.videoProtocolConfig==='object')?base.videoProtocolConfig:{};
    base.videoProtocolConfig={
      ...oldVideoCfg,
      pollPath:val('prvVideoPollPath')||oldVideoCfg.pollPath||'/v1/video/generations/{{taskId}}',
      taskIdPath:val('prvVideoTaskIdPath').trim(),statusPath:val('prvVideoStatusPath').trim(),progressPath:val('prvVideoProgressPath').trim(),outputPath:val('prvVideoOutputPath').trim(),
      successValues:(val('prvVideoSuccessValues')||(oldVideoCfg.successValues||[]).join(',')).split(',').map(x=>x.trim()).filter(Boolean),
      failureValues:(val('prvVideoFailureValues')||(oldVideoCfg.failureValues||[]).join(',')).split(',').map(x=>x.trim()).filter(Boolean),
      pollIntervalMs:Number(val('prvVideoPollInterval')||oldVideoCfg.pollIntervalMs||1500),timeoutMs:Number(val('prvVideoTimeout')||oldVideoCfg.timeoutMs||1200000)
    };
    base.baseUrl=val('prvBaseUrl');const apiKeyInput=val('prvApiKey').trim();if(apiKeyInput)base.apiKey=apiKeyInput;else if(!base.apiKey)base.apiKey='';base.authHeader=val('prvAuthHeader');base.authScheme=val('prvAuthScheme');base.testPath=val('prvTestPath');base.modelsPath=val('prvModelsPath');base.referenceTransport=val('prvReferenceTransport')||'auto';base.publicBaseUrl=val('prvPublicBaseUrl');base.uploadPath=val('prvUploadPath');base.uploadFileField=val('prvUploadField')||'file';base.uploadOutputPath=val('prvUploadOutput')||'data.url';base.allowPrivateHosts=$('#prvAllowPrivate',providerModal)?.checked||false;base.downloadOutputs=$('#prvDownloadOutputs',providerModal)?.checked!==false;
    try{base.defaultHeaders=JSON.parse(val('prvHeaders')||'{}')}catch{base.defaultHeaders={}}
    const modelCards=$$('.model-card',providerModal);
    if(modelCards.length){
      base.models=modelCards.map(card=>{
        const g=n=>$(`[data-field="${n}"]`,card)?.value??'';
        let requestTemplate={};try{requestTemplate=JSON.parse(g('requestTemplate')||'{}')}catch{requestTemplate={__invalidJson:true}};let capabilities={};try{capabilities=JSON.parse(g('capabilities')||'{}')}catch{capabilities={__invalidJson:true}}
        return {id:g('id').trim(),name:g('name').trim(),modality:g('modality'),enabled:$('[data-field=\"enabled\"]',card)?.checked!==false,createPath:g('createPath').trim(),method:'POST',responseMode:g('responseMode'),outputPath:g('outputPath').trim(),taskIdPath:g('taskIdPath').trim(),pollPath:g('pollPath').trim(),statusPath:g('statusPath').trim(),progressPath:g('progressPath').trim(),successValues:g('successValues').split(',').map(x=>x.trim()).filter(Boolean),failureValues:g('failureValues').split(',').map(x=>x.trim()).filter(Boolean),pollIntervalMs:Number(g('pollIntervalMs')||1500),timeoutMs:Number(g('timeoutMs')||1200000),requestTemplate,capabilities};
      });
    } else {
      base.models=Array.isArray(base.models)?base.models:[];
    }
    return base;
  }
  function modelCardHtml(m,i){
    const json=escapeHtml(JSON.stringify(m.requestTemplate??{},null,2));
    const ready=Boolean(String(m.createPath||'').trim());
    const enabled=m.enabled!==false;
    return `<div class="model-card compact model-config-card ${enabled?'':'disabled'}" data-index="${i}" id="model-config-${i}">
      <div class="model-card-head compact">
        <div class="model-card-summary"><span class="model-index-badge">${i+1}</span><span class="model-ready-dot ${ready?'ready':''}"></span><div><b>${escapeHtml(m.name||m.id||'未命名模型')}</b><small>${escapeHtml(m.id||'')} · ${labelForType(m.modality)} · ${ready?'接口已配置':'接口待配置'}</small></div></div>
        <div class="model-card-actions"><label class="model-enable"><input data-field="enabled" type="checkbox" ${enabled?'checked':''}><span>${enabled?'已启用':'未启用'}</span></label><button class="model-remove" data-remove-model="${i}">删除</button></div>
      </div>
      <div class="model-grid compact-basic model-config-basic">
        <label class="model-label">显示名称<input data-field="name" value="${escapeAttr(m.name||'')}"></label>
        <label class="model-label">模型 ID<input data-field="id" value="${escapeAttr(m.id||'')}" placeholder="供应商实际 model id"></label>
        <label class="model-label">节点类型<select data-field="modality">${['text','image','video','audio'].map(x=>`<option value="${x}" ${x===m.modality?'selected':''}>${labelForType(x)}</option>`).join('')}</select></label>
        <label class="model-label">响应模式<select data-field="responseMode"><option value="sync" ${m.responseMode!=='async'?'selected':''}>同步</option><option value="async" ${m.responseMode==='async'?'selected':''}>异步任务</option></select></label>
        <label class="model-label wide">创建接口<input data-field="createPath" value="${escapeAttr(m.createPath||'')}" placeholder="例如 /v1/videos/generations"></label>
        <label class="model-label wide">结果字段<input data-field="outputPath" value="${escapeAttr(m.outputPath||'')}" placeholder="output.url / data.0.url"></label>
      </div>
      <details class="model-route-advanced" ${ready?'':'open'}><summary>更多接口配置</summary><div class="model-grid">
        <label class="model-label">任务 ID 字段<input data-field="taskIdPath" value="${escapeAttr(m.taskIdPath||'')}" placeholder="id"></label>
        <label class="model-label wide">查询接口<input data-field="pollPath" value="${escapeAttr(m.pollPath||'')}" placeholder="/v1/tasks/{{taskId}}"></label>
        <label class="model-label">状态字段<input data-field="statusPath" value="${escapeAttr(m.statusPath||'')}" placeholder="status"></label>
        <label class="model-label">进度字段<input data-field="progressPath" value="${escapeAttr(m.progressPath||'')}" placeholder="progress"></label>
        <label class="model-label wide">成功状态<input data-field="successValues" value="${escapeAttr((m.successValues||[]).join(','))}"></label>
        <label class="model-label wide">失败状态<input data-field="failureValues" value="${escapeAttr((m.failureValues||[]).join(','))}"></label>
        <label class="model-label">轮询间隔 ms<input data-field="pollIntervalMs" type="number" value="${Number(m.pollIntervalMs||1500)}"></label>
        <label class="model-label">超时 ms<input data-field="timeoutMs" type="number" value="${Number(m.timeoutMs||1200000)}"></label>
        <label class="model-label full">能力 Schema JSON<textarea class="model-json model-cap-json" data-field="capabilities">${escapeHtml(JSON.stringify(m.capabilities||defaultCapabilities(m.modality,m.id,m.name),null,2))}</textarea><span class="field-hint">只在模型能力识别错误时修改。</span></label>
        <label class="model-label full">请求体模板 JSON<textarea class="model-json" data-field="requestTemplate">${json}</textarea><span class="field-hint">可用变量：{{model}} {{prompt}} {{references}} {{aspectRatio}} {{duration}} {{resolution}} {{params.xxx}}</span></label>
      </div></details>
    </div>`;
  }

  function discoveredModelState(d,m){
    const existing=(d.models||[]).find(x=>x.id===m.id);
    // 已经进入「全部模型」的模型默认勾选；新拉取的模型必须由用户主动选择。
    return {checked:!!existing,modality:existing?.modality||m.modality||'text'};
  }
  function renderProviderModal(){
    const d=providerEditorDraft||emptyProviderDraft();
    providerModal.innerHTML=`<div class="provider-dialog">
      <aside class="provider-sidebar"><div class="provider-side-head"><div class="provider-side-title">API 供应商</div><button class="provider-add" id="newProviderBtn">＋ 新建</button></div>
        <div class="provider-list">${providers.length?providers.map(p=>`<button class="provider-list-item ${activeProviderId===p.id?'active':''}" data-provider-id="${escapeAttr(p.id)}"><div class="provider-list-name">${escapeHtml(p.name)}</div><div class="provider-list-meta">${protocolName(p.protocol)} · ${(p.models||[]).length} 个模型</div></button>`).join(''):'<div class="provider-empty">还没有供应商。添加第三方 API 后，图片、视频、音频、文本节点都从这里选择模型。</div>'}</div>
        <div class="backend-status"><i class="backend-dot ${backendOnline?'online':''}"></i>${backendOnline?'API 网关已连接':'API 网关未连接'}</div>
      </aside>
      <section class="provider-editor"><div class="provider-editor-head"><div class="provider-editor-title">${d.id?'编辑供应商':'新建供应商'}</div><div class="provider-actions"><button class="provider-action" id="testProviderBtn">测试连接</button><button class="provider-action" id="testAuthBtn">测试鉴权</button><button class="provider-action" id="diagnoseProviderBtn">一键诊断</button><button class="provider-action fetch-models" id="fetchModelsBtn">拉取模型</button>${d.id?'<button class="provider-action danger" id="deleteProviderBtn">删除</button>':''}<button class="provider-action primary" id="saveProviderBtn">连接并自动添加模型</button><button class="provider-action provider-close" id="closeProviderBtn">×</button></div></div>
      <div class="provider-scroll"><div class="provider-note">只需填写 API Base URL 和 API Key，然后点击「连接并自动添加模型」。系统会在供应商提供模型列表时自动识别；没有模型列表也会保存供应商，不再把连接失败和模型发现失败混为一谈。</div>
        <div class="provider-section"><div class="provider-section-title">供应商连接</div><div class="provider-grid provider-grid-basic">
          <input id="prvName" type="hidden" value="${escapeAttr(d.name||'')}">
          <div class="provider-field full"><label>Base URL</label><input id="prvBaseUrl" value="${escapeAttr(d.baseUrl||'')}" placeholder="https://api.example.com 或 https://api.example.com/v1"></div>
          <div class="provider-field full"><label>API Key ${String(d.apiKey||'').trim()?`<span class="field-hint">● 新密钥已暂存，待保存</span>`:(d.hasApiKey?`<span class="field-hint">${d.apiKeyReadable===false?'⚠ 无法解密':`已保存 ${escapeHtml(d.apiKeyHint||'')}`}</span>`:'')}</label><input id="prvApiKey" type="password" value="" placeholder="${String(d.apiKey||'').trim()?'新密钥已暂存；点击「保存」后生效':(d.hasApiKey?'重新输入可替换；留空保持原密钥':'sk-...')}"><div class="field-hint">只填写密钥本身。即使粘贴了「Bearer sk-...」或「Authorization: Bearer sk-...」，系统也会自动清理，避免重复 Bearer。拉取模型或切换界面时，尚未保存的新密钥会继续保留。</div></div>
        </div>
        <div class="provider-section" hidden><div class="provider-section-title">视频生成协议</div><div class="provider-grid provider-grid-basic">
          <div class="provider-field full"><label>视频协议</label><select id="prvVideoProtocol"><option value="auto" ${!d.videoProtocol||d.videoProtocol==='auto'?'selected':''}>跟随模型配置 / 自动</option><option value="standard-video-async-v1" ${d.videoProtocol==='standard-video-async-v1'?'selected':''}>标准异步视频协议 v1</option></select><div class="field-hint">绑定后，此供应商的所有视频模型自动共用同一套协议；模型无需再单独填写创建接口。</div></div>
          ${d.videoProtocol==='standard-video-async-v1'?`<div class="provider-field full"><label>创建接口</label><input value="POST /v1/videos" disabled><div class="field-hint">协议固定：Authorization 继承供应商配置；请求体发送 model / prompt / duration / ratio，并透传额外供应商参数。</div></div>
          <div class="provider-field full"><label>查询接口</label><input id="prvVideoPollPath" value="${escapeAttr(d.videoProtocolConfig?.pollPath||'/v1/video/generations/{{taskId}}')}" placeholder="/v1/video/generations/{{taskId}}"></div>
          <details class="provider-field full provider-advanced"><summary>视频协议高级设置</summary><div class="provider-grid provider-advanced-grid" style="margin-top:12px">
            <div class="provider-field"><label>任务 ID 字段</label><input id="prvVideoTaskIdPath" value="${escapeAttr(d.videoProtocolConfig?.taskIdPath||'')}" placeholder="留空自动识别 id / task_id / data.id"></div>
            <div class="provider-field"><label>状态字段</label><input id="prvVideoStatusPath" value="${escapeAttr(d.videoProtocolConfig?.statusPath||'')}" placeholder="留空自动识别 status / state"></div>
            <div class="provider-field"><label>进度字段</label><input id="prvVideoProgressPath" value="${escapeAttr(d.videoProtocolConfig?.progressPath||'')}" placeholder="留空自动识别 progress / percent"></div>
            <div class="provider-field"><label>结果字段</label><input id="prvVideoOutputPath" value="${escapeAttr(d.videoProtocolConfig?.outputPath||'')}" placeholder="留空自动识别 output.url / video_url / data.url"></div>
            <div class="provider-field full"><label>成功状态</label><input id="prvVideoSuccessValues" value="${escapeAttr((d.videoProtocolConfig?.successValues||['succeeded','completed','success','done','finished']).join(','))}"></div>
            <div class="provider-field full"><label>失败状态</label><input id="prvVideoFailureValues" value="${escapeAttr((d.videoProtocolConfig?.failureValues||['failed','error','cancelled','canceled']).join(','))}"></div>
            <div class="provider-field"><label>轮询间隔 ms</label><input id="prvVideoPollInterval" type="number" value="${Number(d.videoProtocolConfig?.pollIntervalMs||1500)}"></div>
            <div class="provider-field"><label>超时 ms</label><input id="prvVideoTimeout" type="number" value="${Number(d.videoProtocolConfig?.timeoutMs||1200000)}"></div>
          </div></details>`:''}
        </div></div>
        <details class="provider-advanced"><summary>高级连接设置</summary><div class="provider-grid provider-advanced-grid">
          <div class="provider-field"><label>协议类型</label><select id="prvProtocol"><option value="auto" ${!d.protocol||d.protocol==='auto'?'selected':''}>自动检测（推荐）</option><option value="generic-rest" ${d.protocol==='generic-rest'?'selected':''}>通用 REST API</option><option value="openai-compatible" ${d.protocol==='openai-compatible'?'selected':''}>OpenAI 兼容</option><option value="comfyui" ${d.protocol==='comfyui'?'selected':''}>ComfyUI API</option></select></div>
          <div class="provider-field"><label>模型列表路径</label><input id="prvModelsPath" value="${escapeAttr(d.modelsPath||'')}" placeholder="默认自动尝试 /v1/models、/models"></div>
          <div class="provider-field"><label>鉴权头</label><input id="prvAuthHeader" value="${escapeAttr(d.authHeader||'Authorization')}"></div>
          <div class="provider-field"><label>鉴权前缀</label><input id="prvAuthScheme" value="${escapeAttr(d.authScheme??'Bearer')}" placeholder="Bearer；无前缀可留空"></div>
          <div class="provider-field"><label>测试路径</label><input id="prvTestPath" value="${escapeAttr(d.testPath||'')}" placeholder="可选；留空自动测试模型接口"></div>
          <div class="provider-field"><label>参考素材传输</label><select id="prvReferenceTransport"><option value="auto" ${d.referenceTransport==='auto'||!d.referenceTransport?'selected':''}>自动</option><option value="base64" ${d.referenceTransport==='base64'?'selected':''}>Base64 Data URL</option><option value="public-url" ${d.referenceTransport==='public-url'?'selected':''}>Public URL</option><option value="upload-endpoint" ${d.referenceTransport==='upload-endpoint'?'selected':''}>先上传供应商</option></select></div>
          <div class="provider-field full"><label>Public Base URL</label><input id="prvPublicBaseUrl" value="${escapeAttr(d.publicBaseUrl||'')}" placeholder="例如 https://canvas.example.com；第三方 API 可访问本地素材时使用"></div>
          <div class="provider-field"><label>素材上传接口</label><input id="prvUploadPath" value="${escapeAttr(d.uploadPath||'')}" placeholder="/v1/files"></div>
          <div class="provider-field"><label>文件字段</label><input id="prvUploadField" value="${escapeAttr(d.uploadFileField||'file')}" placeholder="file"></div>
          <div class="provider-field"><label>上传返回 URL 字段</label><input id="prvUploadOutput" value="${escapeAttr(d.uploadOutputPath||'data.url')}" placeholder="data.url"></div>
          <div class="provider-field"><label class="toggle-provider"><input id="prvAllowPrivate" type="checkbox" ${d.allowPrivateHosts?'checked':''}>允许私有网络 / 本地 ComfyUI</label></div>
          <div class="provider-field"><label class="toggle-provider"><input id="prvDownloadOutputs" type="checkbox" ${d.downloadOutputs!==false?'checked':''}>结果自动保存到本地媒体库</label></div>
          <div class="provider-field full"><label>附加 Headers（JSON）</label><textarea id="prvHeaders" class="model-json">${escapeHtml(JSON.stringify(d.defaultHeaders||{},null,2))}</textarea></div>
        </div></details>
        <div id="providerTestResult" class="provider-test-result"></div></div>
        ${discoveredModels.length?`<div class="provider-section discovered-section"><div class="discovered-head"><div><div class="provider-section-title">已拉取模型</div><div class="field-hint">${escapeHtml(discoveredEndpoint||'模型接口')} · ${discoveredModels.length} 个模型。只有勾选的模型才会加入「全部模型」并进入画布；未勾选的模型不会保存、不会显示。</div></div><div class="discovered-actions"><button class="provider-add" id="selectAllDiscoveredBtn">全选/全不选</button><button class="provider-add discovered-import" id="importDiscoveredBtn">应用选择并保存</button></div></div><div class="discovered-model-list">${discoveredModels.map((m,i)=>{const st=discoveredModelState(d,m);return `<label class="discovered-model-row"><input type="checkbox" data-discovered-model="${i}" ${st.checked?'checked':''}><div class="discovered-model-main"><b>${escapeHtml(m.name||m.id)}</b><span>${escapeHtml(m.id)}</span></div>${m.ownedBy?`<span class="discovered-owner">${escapeHtml(m.ownedBy)}</span>`:''}<select data-discovered-modality="${i}">${['text','image','video','audio'].map(x=>`<option value="${x}" ${x===st.modality?'selected':''}>${labelForType(x)}</option>`).join('')}</select></label>`}).join('')}</div></div>`:''}
        <div class="provider-section configured-models-section models-page-entry"><div class="configured-models-head"><div><div class="provider-section-title" style="margin:0">模型管理 <strong>${(d.models||[]).length}</strong></div><div class="field-hint" style="margin-top:4px">全部模型已经移到独立页面管理，不再塞在供应商弹窗里。独立页面会一次显示全部模型，并支持搜索、筛选、启用/停用和完整接口配置。</div></div><div class="configured-model-actions"><button class="provider-action primary" id="openAllModelsPageBtn">打开全部模型页面 ↗</button></div></div><div class="model-summary-strip">${['text','image','video','audio'].map(t=>`<span><b>${(d.models||[]).filter(m=>m.modality===t).length}</b>${labelForType(t)}</span>`).join('')}</div>${!(d.models||[]).length?'<div class="provider-empty">还没有模型。先点击右上角「拉取模型」，保存供应商后再进入全部模型页面。</div>':''}</div>
      </div></section></div>`;
    $('#closeProviderBtn',providerModal).onclick=()=>providerModal.classList.add('hidden');
    $('#newProviderBtn',providerModal).onclick=()=>{activeProviderId='__new__';providerEditorDraft=emptyProviderDraft();discoveredModels=[];discoveredEndpoint='';renderProviderModal();};
    $$('[data-provider-id]',providerModal).forEach(b=>b.onclick=()=>{activeProviderId=b.dataset.providerId;providerEditorDraft=JSON.parse(JSON.stringify(providerById(activeProviderId)));discoveredModels=[];discoveredEndpoint='';renderProviderModal();});
    $('#prvProtocol',providerModal).onchange=()=>{providerEditorDraft=readProviderDraftFromDom();providerEditorDraft.protocol=$('#prvProtocol',providerModal).value;discoveredModels=[];discoveredEndpoint='';renderProviderModal();};
    $('#prvVideoProtocol',providerModal)?.addEventListener('change',()=>{providerEditorDraft=readProviderDraftFromDom();providerEditorDraft.videoProtocol=$('#prvVideoProtocol',providerModal).value;renderProviderModal();});
    $('#saveProviderBtn',providerModal).onclick=saveProviderFromModal;
    $('#testProviderBtn',providerModal).onclick=testProviderFromModal;
    $('#testAuthBtn',providerModal).onclick=testAuthFromModal;
    $('#diagnoseProviderBtn',providerModal).onclick=diagnoseProviderFromModal;
    $('#fetchModelsBtn',providerModal).onclick=fetchModelsFromModal;
    $('#openAllModelsPageBtn',providerModal)?.addEventListener('click',()=>{
      const d=readProviderDraftFromDom();
      if(!d.id){showProviderTest('请先保存供应商，再进入全部模型页面',true);return;}
      window.location.href='./models.html?provider='+encodeURIComponent(d.id);
    });
    $('#selectAllDiscoveredBtn',providerModal)?.addEventListener('click',()=>{const boxes=$$('[data-discovered-model]',providerModal);const shouldCheck=boxes.some(x=>!x.checked);boxes.forEach(x=>x.checked=shouldCheck);});
    $('#importDiscoveredBtn',providerModal)?.addEventListener('click',importDiscoveredModels);
    $('#deleteProviderBtn',providerModal)?.addEventListener('click',deleteProviderFromModal);
    providerModal.onpointerdown=e=>{if(e.target===providerModal)providerModal.classList.add('hidden')};
  }
  function protocolName(p){return ({auto:'自动检测','generic-rest':'通用 REST','openai-compatible':'OpenAI兼容','comfyui':'ComfyUI'})[p]||p}

  async function saveProviderFromModal(){
    const d=readProviderDraftFromDom();
    if(!d.baseUrl.trim()){showProviderTest('请填写 API Base URL',true);return;}
    if(!d.apiKey?.trim()&&!d.hasApiKey){showProviderTest('请填写 API Key',true);return;}
    if(d.models.some(m=>m.requestTemplate?.__invalidJson||m.capabilities?.__invalidJson)){showProviderTest('请求体模板或能力 Schema JSON 格式错误',true);return;}
    showProviderTest('正在连接供应商、拉取模型并自动配置…');
    try{
      const out=await apiJson('/api/providers',{method:'POST',body:JSON.stringify(d)});
      const publicSaved=sanitizeProviderForBrowser(out.provider);
      providers=[...providers.filter(p=>p.id!==publicSaved.id),publicSaved];
      saveLocalProviders(providers);
      await loadProviders();
      activeProviderId=publicSaved.id;providerEditorDraft=JSON.parse(JSON.stringify(providerById(publicSaved.id)||publicSaved));renderProviderModal();render();
      showProviderTest(`配置完成 · 已自动添加 ${Number(out.modelCount||(publicSaved.models||[]).length)} 个模型`);
      showToast('供应商和模型已自动配置');
    }
    catch(err){showProviderTest(err.message,true)}
  }
  async function testProviderFromModal(){
    const d=readProviderDraftFromDom();
    if(!d.baseUrl.trim()){showProviderTest('请先填写 API Base URL',true);return;}
    showProviderTest('正在测试连接…');
    try{const out=await apiJson('/api/providers/test-config',{method:'POST',body:JSON.stringify(d)});const count=Number(out.modelCount||0);showProviderTest(`连接成功${out.endpoint?` · ${out.endpoint}`:''}${count?` · 发现 ${count} 个模型`:''}${out.warning?`\n${out.warning}`:''}`);}
    catch(err){showProviderTest(err.message,true)}
  }
  async function testAuthFromModal(){
  const d=readProviderDraftFromDom();
  if(!d.baseUrl.trim()){showProviderTest('请先填写 API Base URL',true);return;}
  if(!d.apiKey?.trim()&&!d.hasApiKey){showProviderTest('请先填写 API Key',true);return;}
  showProviderTest('正在验证鉴权（不会调用可能产生费用的图片/视频生成接口）…');
  try{
    const out=await apiJson('/api/providers/test-auth',{method:'POST',body:JSON.stringify(d)});
    if(out.verified===false){showProviderTest(`连接已建立，但鉴权暂未验证。${out.warning||'当前供应商没有无副作用的鉴权测试接口；可配置测试路径，或在模型配置完成后通过真实生成验证。'}`);return;}
    showProviderTest(`鉴权已验证${out.modelId?` · 模型 ${out.modelId}`:''}${out.endpoint?` · ${out.endpoint}`:''}${String(d.apiKey||'').trim()?' · 新密钥已通过验证，点击「保存」后用于正式生成':''}`);
  }catch(err){showProviderTest(err.message,true)}
}

async function diagnoseProviderFromModal(){
  const d=readProviderDraftFromDom();
  if(!d.baseUrl.trim()){showProviderTest('请先填写 API Base URL',true);return;}
  showProviderTest('正在分别检查连接、鉴权、模型发现与适配器状态…');
  try{
    const out=await apiJson('/api/providers/diagnose',{method:'POST',body:JSON.stringify(d)});
    const authText=out.auth?.verified===false?'? 未验证':(out.auth?.ok?'✓':'×');
    const lines=[`连接：${out.connection?.ok?'✓':'×'}${out.connection?.endpoint?` ${out.connection.endpoint}`:''}${out.connection?.httpStatus?` · HTTP ${out.connection.httpStatus}`:''}${out.connection?.error?` · ${out.connection.error}`:''}`,`鉴权：${authText}${out.auth?.modelId?` ${out.auth.modelId}`:''}${out.auth?.error?` · ${out.auth.error}`:''}${out.auth?.warning?` · ${out.auth.warning}`:''}`,`模型发现：${out.models?.discoveryOk?'✓':'?'}${out.models?.discovered!=null?` ${out.models.discovered} 个`:''}${out.models?.discoveryError?` · ${out.models.discoveryError}`:''}`,`已配置模型：${out.models?.ready||0}/${out.models?.total||0} 已就绪${out.models?.pending?` · ${out.models.pending} 个待配置`:''}`];
    if(out.warnings?.length)lines.push('提示：'+out.warnings.slice(0,5).join('；'));
    showProviderTest(lines.join('\n'),!out.connection?.ok||out.auth?.ok===false);
  }catch(err){showProviderTest(err.message,true)}
}

async function fetchModelsFromModal(){
    const d=readProviderDraftFromDom();
    if(!d.baseUrl.trim()){showProviderTest('请先填写 API Base URL',true);return;}
    showProviderTest('正在连接供应商并拉取全部模型…');
    try{
      const out=await apiJson('/api/providers/discover-models',{method:'POST',body:JSON.stringify(d)});
      discoveredModels=out.models||[];discoveredEndpoint=out.endpoint||'';
      if(out.authHeader){d.authHeader=out.authHeader;d.authScheme=out.authScheme||'';}
      // 如果供应商返回的是标准 OpenAI /v1/models 结构，则自动切换到 OpenAI 兼容适配器。
      // 这样文本模型会自动走 /v1/chat/completions，而不是落入 Generic REST 的未知路由。
      if((d.protocol==='auto'||d.protocol==='generic-rest')&&out.suggestedProtocol==='openai-compatible'){
        d.protocol='openai-compatible';
      }
      providerEditorDraft=d;
      renderProviderModal();
      showProviderTest(`已拉取 ${discoveredModels.length} 个模型。请选择要加入「全部模型」的模型，然后点击「应用选择并保存」。${out.suggestedProtocol==='openai-compatible'?' 已自动识别为 OpenAI 兼容接口。':''}`);
    }catch(err){discoveredModels=[];discoveredEndpoint='';showProviderTest(err.message,true)}
  }
  async function importDiscoveredModels(){
    const d=readProviderDraftFromDom();
    if(!discoveredModels.length){showProviderTest('请先拉取模型',true);return;}
    const selectedIds=new Set();
    const modalityById=new Map();
    $$('[data-discovered-model]',providerModal).forEach(box=>{
      const i=Number(box.dataset.discoveredModel),found=discoveredModels[i];if(!found)return;
      const modality=$(`[data-discovered-modality="${i}"]`,providerModal)?.value||found.modality||'text';
      modalityById.set(found.id,modality);
      if(box.checked)selectedIds.add(found.id);
    });
    if(!selectedIds.size){showProviderTest('请至少勾选一个要加入「全部模型」的模型',true);return;}
    const selectedHasVideo=[...selectedIds].some(id=>(modalityById.get(id)||discoveredModels.find(x=>x.id===id)?.modality)==='video');
    if(selectedHasVideo&&d.protocol!=='comfyui'&&(!d.videoProtocol||d.videoProtocol==='auto')){
      d.videoProtocol='standard-video-async-v1';
      d.videoProtocolConfig={...(d.videoProtocolConfig||{}),pollPath:d.videoProtocolConfig?.pollPath||'/v1/video/generations/{{taskId}}'};
    }

    const discoveredIds=new Set(discoveredModels.map(m=>m.id));
    const previous=Array.isArray(d.models)?d.models:[];
    // 本次拉取到的模型，以当前勾选结果为准。
    // 勾选 -> 加入/保留；未勾选 -> 不保存、不显示。
    // 手动添加且本次供应商没有返回的旧模型继续保留。
    const nextModels=previous.filter(m=>!discoveredIds.has(m.id));

    for(const found of discoveredModels){
      if(!selectedIds.has(found.id))continue;
      const modality=modalityById.get(found.id)||found.modality||'text';
      let route=previous.find(x=>x.id===found.id);
      if(route)route=JSON.parse(JSON.stringify(route));
      else{route=defaultModelRoute(modality,d.protocol);route.id=found.id;}
      route.name=found.name||route.name||found.id;
      route.modality=modality;
      route.modalitySource='user';
      route.enabled=true;
      route.capabilities={
        ...defaultCapabilities(modality,found.id,found.name),
        ...(route.capabilities||{}),
        ...(found.capabilities||{})
      };
      nextModels.push(route);
    }

    d.models=nextModels;
    providerEditorDraft=d;
    showProviderTest(`正在保存 ${selectedIds.size} 个已选择模型…`);
    try{
      const out=await apiJson('/api/providers',{method:'POST',body:JSON.stringify(d)});
      const publicSaved=sanitizeProviderForBrowser(out.provider);
      const nextProviders=[...providers.filter(p=>p.id!==publicSaved.id),publicSaved];
      providers=nextProviders;
      saveLocalProviders(nextProviders);
      await loadProviders();
      activeProviderId=publicSaved.id;
      providerEditorDraft=JSON.parse(JSON.stringify(publicSaved));
      renderProviderModal();
      render();
      showProviderTest(`已保存：${selectedIds.size} 个已选择模型已加入「全部模型」并可在画布节点中使用；未选择模型不会显示。${selectedHasVideo&&d.videoProtocol==='standard-video-async-v1'?' 视频模型已绑定「标准异步视频协议 v1」。':''}`);
    }catch(err){showProviderTest(err.message,true)}
  }

  async function deleteProviderFromModal(){
    const d=readProviderDraftFromDom();if(!d.id||!confirm('确认删除这个 API 供应商？'))return;
    try{await apiJson('/api/providers/'+encodeURIComponent(d.id),{method:'DELETE'});state.nodes.forEach(n=>{if(n.providerId===d.id){n.providerId='';n.modelId='';n.modelName='';}});saveState();providers=providers.filter(p=>p.id!==d.id);saveLocalProviders(providers);await loadProviders();activeProviderId=providers[0]?.id||'__new__';providerEditorDraft=activeProviderId==='__new__'?emptyProviderDraft():JSON.parse(JSON.stringify(providerById(activeProviderId)));renderProviderModal();render();showToast('供应商已删除');}catch(err){showProviderTest(err.message,true)}
  }
  function showProviderTest(msg,error=false){const el=$('#providerTestResult',providerModal);if(el){el.textContent=msg;el.classList.toggle('error',error)}}

  function showSettingsMenu(){
    const r=$('#settingsBtn').getBoundingClientRect();
    setDockModeMenuOpen(false);
    contextMenu.style.left=Math.max(8,r.right-190)+'px';contextMenu.style.top=(r.bottom+6)+'px';
    contextMenu.innerHTML=`<button class="menu-item" data-setting="providers">API 供应商</button><button class="menu-item" data-setting="models">全部模型</button><button class="menu-item" data-setting="production">项目生产总控</button><button class="menu-item" data-setting="context">Creative Context</button><button class="menu-item" data-setting="narrative">连续性状态时间线</button><button class="menu-item" data-setting="tasks">任务队列</button><button class="menu-item" data-setting="shortcuts">快捷键</button>`;
    contextMenu.classList.remove('hidden');
    $$('[data-setting]',contextMenu).forEach(b=>b.onclick=()=>{contextMenu.classList.add('hidden');if(b.dataset.setting==='providers')openProviderModal();if(b.dataset.setting==='models')window.location.href='./models.html';if(b.dataset.setting==='production')openProjectProductionDashboard();if(b.dataset.setting==='context')openCreativeContextOverview();if(b.dataset.setting==='narrative')openNarrativeContinuityCenter('characters');if(b.dataset.setting==='tasks')openTaskManager();if(b.dataset.setting==='shortcuts')renderDrawer('help')});
  }

  function setDockActive(action){if(!bottomDock)return;$$('[data-dock-action]',bottomDock).forEach(b=>b.classList.toggle('active',b.dataset.dockAction===action||b.dataset.dockAction==='select'&&action==='select'))}
  let dockModeMenuOpen=false;
  function currentInteractionMode(){return state.canvasSettings?.interactionMode==='grab'?'grab':'move'}
  function syncDockModeButton(){
    const btn=bottomDock?.querySelector('[data-dock-action="mode"]');
    if(!btn)return;
    const grab=currentInteractionMode()==='grab';
    btn.classList.toggle('mode-grab',grab);
    btn.setAttribute('aria-pressed',grab?'true':'false');
    btn.setAttribute('title',grab?'抓手工具 · H':'移动 · V');
    btn.setAttribute('aria-label',grab?'抓手工具':'移动');
  }
  function setDockModeMenuOpen(open){
    dockModeMenuOpen=!!open;
    bottomDock?.classList.toggle('mode-open',!!open);
    bottomDock?.querySelector('[data-dock-action="mode"]')?.classList.toggle('open',!!open);
  }
  function setInteractionMode(mode,{persist=true,toast=true}={}){
    const next=mode==='grab'?'grab':'move';
    state.canvasSettings=state.canvasSettings||{};
    state.canvasSettings.interactionMode=next;
    viewport.classList.toggle('grab-mode',next==='grab');
    syncDockModeButton();
    if(persist)saveState();
    if(toast)showToast(next==='grab'?'抓手工具 · 拖动画布':'移动工具 · 拖动节点');
  }
  function startViewportPan(e){
    if(e.button!==0)return false;
    e.preventDefault();
    e.stopPropagation();
    panning={px:e.clientX,py:e.clientY,startX:state.viewport.x,startY:state.viewport.y};
    viewport.classList.add('panning');
    return true;
  }
  function openDockAdd(){
    const r=viewport.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,btn=bottomDock?.querySelector('[data-dock-action="add"]'),br=btn?.getBoundingClientRect();
    if(quickAddMenuOpen && !contextMenu.classList.contains('hidden') && contextMenu.classList.contains('libtv-add-menu')){hideMenus();return}
    window.__quickAddOpenedAt=Date.now();
    showQuickAdd(br?br.left:cx,br?br.top-460:cy,screenToWorld(cx,cy-190),null,{preferAboveToolbar:true});
    setDockAddOpen(true);
  }
  function showDockModeMenu(){
    const btn=bottomDock?.querySelector('[data-dock-action="mode"]');
    if(!btn)return;
    if(dockModeMenuOpen && !contextMenu.classList.contains('hidden') && contextMenu.classList.contains('dock-mode-menu')){hideMenus();return}
    hideMenus();
    window.__quickAddOpenedAt=Date.now();
    const current=currentInteractionMode();
    const row=(mode,label,desc,shortcut,icon)=>`<button class="dock-mode-row ${current===mode?'active':''}" data-mode="${mode}"><i aria-hidden="true">${uiIcon(icon)}</i><span><b>${label}</b><small>${desc}</small></span><em>${shortcut}</em></button>`;
    contextMenu.className='context-menu dock-mode-menu';
    contextMenu.innerHTML=`<div class="libtv-add-title">画布操作模式</div>${row('move','移动','拖动节点 / 框选节点','V','move')}${row('grab','抓手工具','拖动画布视图','H','hand')}`;
    contextMenu.classList.remove('hidden');
    setDockModeMenuOpen(true);
    $$('[data-mode]',contextMenu).forEach(b=>b.onclick=()=>{setInteractionMode(b.dataset.mode);hideMenus()});
    requestAnimationFrame(()=>{
      const pad=12,menu=contextMenu.getBoundingClientRect(),anchor=btn.getBoundingClientRect();
      const center=anchor.left+anchor.width/2;
      const left=Math.max(pad,Math.min(center-menu.width/2,window.innerWidth-menu.width-pad));
      const top=Math.max(pad,Math.min(anchor.top-menu.height-12,window.innerHeight-menu.height-pad));
      contextMenu.style.left=`${left}px`;
      contextMenu.style.top=`${top}px`;
    });
  }
  if(bottomDock){$$('[data-dock-action]',bottomDock).forEach(b=>b.onclick=()=>{const a=b.dataset.dockAction;if(a==='add'){openDockAdd();return}if(a==='mode'){showDockModeMenu();return}if(a==='layout'){setDockActive('layout');openAutoLayoutMenu();setTimeout(()=>setDockActive('select'),120)}if(a==='workflow'){setDockActive('workflow');renderDrawer('workflow')}if(a==='asset'){setDockActive('asset');renderDrawer('asset')}if(a==='history'){setDockActive('history');renderDrawer('history')}if(a==='shortcuts'){setDockActive('shortcuts');renderDrawer('help');setTimeout(()=>$('#drawer')?.scrollTo?.({top:0,behavior:'smooth'}),0)}if(a==='help'){setDockActive('help');renderDrawer('help')}})}


  // v3.5.2 · Image Studio Polish — explicit working/applied versions, stronger compare,
  // progressive tools, reference weighting and a production-oriented mask editor.
  const V351_RATIOS=['free','1:1','4:5','3:4','16:9','21:9','9:16','2:3','3:2'];
  function v351RefKey(r,i=0){return String(r.sourceId||r.nodeId||r.assetId||r.id||r.url||r.title||`ref-${i}`)}
  function v35Data(n){
    const d=n.imageStudio||(n.imageStudio={}),compose=d.compose||{},compare=d.compare||{};
    d.activeTool=d.activeTool||'crop';d.moreOpen=Boolean(d.moreOpen);d.workingVersionId=d.workingVersionId||'';d.appliedVersionId=d.appliedVersionId||'';d.view={zoom:1,...(d.view||{})};
    d.maskDrafts={...(d.maskDrafts||{})};
    d.crop={ratio:'free',x:.12,y:.10,width:.76,height:.80,guides:'thirds',safeArea:true,...(d.crop||{})};
    d.extend={ratio:n.aspectRatio||'16:9',anchor:'center',prompt:'向外扩展画面，保持主体、空间和光线连续',...(d.extend||{})};
    d.relight={direction:135,intensity:72,temperature:5600,rim:45,softness:68,color:'#FFD8B2',...(d.relight||{})};
    d.angle={yaw:0,pitch:0,roll:0,lens:50,prompt:'保持主体身份、服装与场景一致，只改变观察机位',...(d.angle||{})};
    d.focus={strength:70,depth:58,prompt:'突出主体，建立自然景深与视觉焦点',...(d.focus||{})};
    d.compose={prompt:'融合已确认参考素材，保持主体身份与整体风格一致',blend:.75,priority:'balanced',styleLock:true,subjectPreservation:.85,referenceWeights:{},referenceEnabled:{},normalizeWeights:false,preset:'balanced',preserve:{identity:true,pose:false,composition:true,clothing:true,product:true,logo:true,background:false},...compose,referenceWeights:{...(compose.referenceWeights||{})},referenceEnabled:{...(compose.referenceEnabled||{})},preserve:{identity:true,pose:false,composition:true,clothing:true,product:true,logo:true,background:false,...(compose.preserve||{})}};
    d.upscale={mode:'UltraSharp',scale:4,detail:75,texture:70,face:85,...(d.upscale||{})};
    d.compare={left:'',right:'',overlay:50,mode:'split',syncZoom:true,zoom:1,panX:0,panY:0,...compare};
    return d;
  }
  function v35EnsureBase(n){
    n.resultVersions=Array.isArray(n.resultVersions)?n.resultVersions:[];
    if(!n.resultVersions.length&&n.outputUrl){const v={id:uid('rv'),outputUrl:n.outputUrl,prompt:n.prompt||'',providerId:n.providerId||'',modelId:n.modelId||'',modelName:n.modelName||'Imported',createdAt:new Date().toISOString(),operation:'Original',status:'base',parentVersionId:null,parameters:{aspectRatio:n.aspectRatio||''}};n.resultVersions=[v];n.activeResultVersionId=v.id}
    n.resultVersions.forEach((v,i)=>{if(!('parentVersionId' in v))v.parentVersionId=i?v.parentVersionId||n.resultVersions[i-1]?.id:null;if(!v.status)v.status=i?'candidate':'base'});const ids=new Set(n.resultVersions.map(v=>v.id));n.resultVersions.forEach(v=>{if(v.parentVersionId&&!ids.has(v.parentVersionId))v.parentVersionId=null});
    const d=v35Data(n),active=n.activeResultVersionId||n.resultVersions.at(-1)?.id||'';
    if(!d.appliedVersionId)d.appliedVersionId=active;
    if(!d.workingVersionId)d.workingVersionId=active;
  }
  function v35Versions(n){v35EnsureBase(n);return nodeResultVersions(n)}
  function v351Version(n,id){return v35Versions(n).find(v=>v.id===id)}
  function v351WorkingId(n){v35EnsureBase(n);const d=v35Data(n);return d.workingVersionId||n.activeResultVersionId||v35Versions(n).at(-1)?.id||''}
  function v351AppliedId(n){v35EnsureBase(n);return v35Data(n).appliedVersionId||v351WorkingId(n)}
  function v351SetWorking(n,id){if(!v351Version(n,id))return false;v35Data(n).workingVersionId=id;return true}
  function v351RestoreApplied(n){const id=v351AppliedId(n);if(id&&v351Version(n,id))v35Data(n).workingVersionId=id}
  function v352WorkingVersion(n){return v351Version(n,v351WorkingId(n))||v35Versions(n).at(-1)||null}
  function v352WorkingProxy(n){const v=v352WorkingVersion(n);return {...n,outputUrl:v?.outputUrl||n.outputUrl||'',prompt:v?.prompt??n.prompt,toolParams:{...(n.toolParams||{}),...(v?.parameters||{})},aspectRatio:v?.parameters?.aspectRatio||n.aspectRatio,resolution:v?.parameters?.resolution||n.resolution}}
  function v352ApplyVersionToNode(n,v){if(!v)return false;n.outputUrl=v.outputUrl||n.outputUrl||'';if(v.prompt!=null)n.prompt=v.prompt;if(v.providerId)n.providerId=v.providerId;if(v.modelId)n.modelId=v.modelId;if(v.modelName)n.modelName=v.modelName;if(Object.prototype.hasOwnProperty.call(v,'generatedText'))n.generatedText=v.generatedText||'';if(Object.prototype.hasOwnProperty.call(v,'generatedResult'))n.generatedResult=v.generatedResult;n.toolParams={...(n.toolParams||{}),...(v.parameters||{})};if(v.parameters?.aspectRatio)n.aspectRatio=v.parameters.aspectRatio;if(v.parameters?.resolution)n.resolution=v.parameters.resolution;if(n.outputUrl)n.taskStatus='succeeded';n.activeResultVersionId=v.id;return true}
  function v352ApplyWorkingToCanvas(n){const id=v351WorkingId(n),v=v351Version(n,id);if(!v)return false;snapshot('Image Studio · Apply to Node');v352ApplyVersionToNode(n,v);const d=v35Data(n);d.appliedVersionId=id;d.canvasRevision=Number(d.canvasRevision||0)+1;d.appliedAt=new Date().toISOString();n.imageStudioDirty=false;saveState();render();return true}
  function v35Op(v,i){return v.operation||v.parameters?.operation||v.modelName||(i===0?'Original':`Version ${i+1}`)}
  function v35Status(v,i){return v.status||(i===0?'base':'candidate')}
  function v35Badge(s){return s==='approved'?'Approved':s==='review'?'Needs Review':s==='rejected'?'Rejected':s==='base'?'Base':'Candidate'}
  function v351VersionDepth(v,vs){let depth=0,cur=v,seen=new Set();while(cur?.parentVersionId&&depth<5&&!seen.has(cur.parentVersionId)){seen.add(cur.parentVersionId);cur=vs.find(x=>x.id===cur.parentVersionId);if(cur)depth++}return depth}
  function v351Lineage(n,id){const vs=v35Versions(n),map=new Map(vs.map(v=>[v.id,v])),out=[];let cur=map.get(id),guard=0;while(cur&&guard++<50){out.unshift(cur);if(!cur.parentVersionId)break;cur=map.get(cur.parentVersionId)}if(out.length===1){const i=vs.findIndex(v=>v.id===id);return i>=0?vs.slice(0,i+1):out}return out}
  function v35Refs(n){const refs=collectReferences(n.id);return refs.length?refs.slice(0,8).map(r=>`<article class="v35-ref"><div>${r.url?`<img src="${escapeAttr(r.url)}">`:`<span>${r.type==='image'?'IMG':r.type==='video'?'VID':r.type==='audio'?'AUD':'TXT'}</span>`}</div><section><i>${escapeHtml(edgeRoleLabel(r.role||r.usage||'reference'))}</i><b>${escapeHtml(r.title||labelForType(r.type))}</b></section></article>`).join(''):'<div class="v35-empty">No references yet<br><small>Connect assets or use AutoLink.</small></div>'}
  function v352TreeHtml(n){const vs=v35Versions(n),active=v351WorkingId(n),applied=v351AppliedId(n),map=new Map(vs.map((v,i)=>[v.id,{v,i,children:[]} ]));const roots=[];vs.forEach((v,i)=>{const row=map.get(v.id);const parent=map.get(v.parentVersionId);if(parent)parent.children.push(row);else roots.push(row)});const draw=(row,depth=0)=>{const {v,i,children}=row;return `<button data-v35-lineage="${v.id}" class="v352-tree-row ${v.id===active?'active':''} ${v.id===applied?'applied':''}" style="--depth:${depth}"><i>${i+1}</i><span><b>${escapeHtml(v35Op(v,i))}</b><small>${depth?`branch depth ${depth}`:'root'} · ${children.length?children.length+' child'+(children.length>1?'ren':''):'leaf'}</small></span><em class="${v35Status(v,i)}">${v.id===applied?'Canvas':v35Badge(v35Status(v,i))}</em></button>${children.map(c=>draw(c,depth+1)).join('')}`};return roots.map(r=>draw(r)).join('')}
  function v352RefConfig(n){const d=v35Data(n),refs=collectReferences(n.id).slice(0,10);return refs.map((r,i)=>{const key=v351RefKey(r,i),base=r.role==='character_reference'?0.95:(r.role==='scene_reference'?0.80:(r.role==='product_reference'?1:0.75));if(!(key in d.compose.referenceWeights))d.compose.referenceWeights[key]=base;if(!(key in d.compose.referenceEnabled))d.compose.referenceEnabled[key]=true;return {...r,key,enabled:d.compose.referenceEnabled[key]!==false,weight:Number(d.compose.referenceWeights[key]??base)}})}
  function v352ApplyRefPreset(n,preset){const d=v35Data(n),items=v352RefConfig(n);d.compose.preset=preset;items.forEach(r=>{const role=String(r.role||r.usage||'');let w=r.weight;if(preset==='identity')w=/character|subject/.test(role)?1:/style/.test(role)?.45:.55;else if(preset==='product')w=/product/.test(role)?1:/scene/.test(role)?.55:/character|subject/.test(role)?.70:.80;else if(preset==='scene')w=/scene/.test(role)?1:/character|subject/.test(role)?.75:.60;else if(preset==='balanced')w=/character|subject/.test(role)?.90:/scene/.test(role)?.80:.75;d.compose.referenceWeights[r.key]=Math.max(0,Math.min(1,Number(w)||0));d.compose.referenceEnabled[r.key]=true})}
  function v352EffectiveRefs(n){const d=v35Data(n),items=v352RefConfig(n).filter(r=>r.enabled);const total=items.reduce((a,r)=>a+Math.max(0,r.weight),0);return items.map(r=>({...r,weight:d.compose.normalizeWeights&&total>0?r.weight/total:r.weight}))}
  function v351ComposeRefs(n){const d=v35Data(n),refs=v352RefConfig(n);if(!refs.length)return'<div class="v35-empty">No references yet.</div>';return refs.map(r=>`<article class="v351-weight-ref ${r.enabled?'':'disabled'}"><div>${r.url?`<img src="${escapeAttr(r.url)}">`:'REF'}</div><section><div class="v352-ref-head"><b>${escapeHtml(r.title||labelForType(r.type))}</b><label class="v352-ref-toggle" title="Enable reference"><input data-v352-refenabled="${escapeAttr(r.key)}" type="checkbox" ${r.enabled?'checked':''}></label></div><small>${escapeHtml(edgeRoleLabel(r.role||r.usage||'reference'))}</small><label><input data-v351-refweight="${escapeAttr(r.key)}" type="range" min="0" max="1" step="0.05" value="${r.weight}" ${r.enabled?'':'disabled'}><output>${r.weight.toFixed(2)}</output></label></section></article>`).join('')}
  function v35VersionsHtml(n){const vs=v35Versions(n),active=v351WorkingId(n),applied=v351AppliedId(n);return vs.map((v,i)=>`<button class="v35-ver ${v.id===active?'active':''} ${v.id===applied?'applied':''}" data-v35-version="${v.id}">${v.outputUrl?`<img src="${escapeAttr(v.outputUrl)}">`:`<div class="v35-ver-fallback" style="background:${themeBg(n.content||'portrait')}"></div>`}<span>v${i+1}${v.id===applied?' · Canvas':''}</span><b>${escapeHtml(v35Op(v,i))}</b><small class="${v35Status(v,i)}">${v35Badge(v35Status(v,i))}</small></button>`).join('')+`<button class="v35-ver new" id="v35New"><i>${uiIcon('plus')}</i><b>New Version</b></button>`}
  function v35ToolRail(active){const dOpen=['angle','focus','compose','compare'].includes(active);const primary=[['crop','Crop','trim'],['inpaint','Inpaint','edit'],['extend','Extend','extend'],['relight','Relight','camera'],['upscale','Upscale','zoomIn']],advanced=[['angle','Angle','target'],['focus','Focus','target'],['compose','Reference Compose','workflow'],['compare','Version Compare','compare']];const draw=a=>a.map(([id,label,icon])=>`<button data-v35-tool="${id}" class="${id===active?'active':''}"><i>${uiIcon(icon)}</i><span>${label}</span></button>`).join('');return draw(primary)+`<button id="v351More" class="v351-more ${dOpen?'active':''}"><i>${uiIcon('more')}</i><span>More</span></button><div class="v351-advanced ${dOpen?'open':''}">${draw(advanced)}</div>`}
  function v35Opt(arr,val){return arr.map(x=>`<option value="${escapeAttr(String(x))}" ${String(x)===String(val)?'selected':''}>${escapeHtml(String(x))}</option>`).join('')}
  function v351PreserveControls(d){const labels={identity:'Identity',pose:'Pose',composition:'Composition',clothing:'Clothing',product:'Product geometry',logo:'Logo / text',background:'Background'};return `<div class="v351-preserve">${Object.entries(labels).map(([k,l])=>`<label><input data-v351-preserve="${k}" type="checkbox" ${d.compose.preserve[k]?'checked':''}><span>${l}</span></label>`).join('')}</div>`}
  function v35Inspector(n,tool){const d=v35Data(n),vs=v35Versions(n);if(tool==='crop')return `<header><div><i>⌗</i><span><b>Crop</b><small>Unified aspect presets and safe guides.</small></span></div><button id="v35CropReset">Reset</button></header><label>Aspect Ratio<select id="v35CropRatio">${v35Opt(V351_RATIOS,d.crop.ratio)}</select></label><div class="v35-ratios">${V351_RATIOS.filter(x=>x!=='free').map(x=>`<button data-v35-ratio="${x}" class="${d.crop.ratio===x?'active':''}">${x}</button>`).join('')}</div><label>Guide<select id="v351CropGuide">${v35Opt(['thirds','center','none'],d.crop.guides)}</select></label><label class="toggle">Safe Area<input id="v351CropSafe" type="checkbox" ${d.crop.safeArea?'checked':''}></label><p>Crop uses the same ratios as Storyboard and Video Studio. The source version is never deleted.</p><div class="v35-actions"><button id="v351CropCancel">Reset Working</button><button id="v35CropApply" class="primary">Apply Crop</button></div>`;
    if(tool==='extend')return `<header><div><i>⌑</i><span><b>Extend</b><small>Generative outpaint with context.</small></span></div></header><label>Target Ratio<select id="v35ExtendRatio">${v35Opt(V351_RATIOS.filter(x=>x!=='free'),d.extend.ratio)}</select></label><label>Anchor<select id="v35ExtendAnchor">${v35Opt(['center','left','right','top','bottom'],d.extend.anchor)}</select></label><label>Outpaint Prompt<textarea id="v35ExtendPrompt" rows="5">${escapeHtml(d.extend.prompt)}</textarea></label><p>Confirmed references and Continuity State are carried into this edit.</p><button class="primary block" id="v35ExtendApply">Generate Extended Version</button>`;
    if(tool==='inpaint')return `<header><div><i>✎</i><span><b>Inpaint</b><small>Mask-first local editing.</small></span></div></header><label>Region Prompt<textarea id="v35InpaintPrompt" rows="6">${escapeHtml(n.imageStudio?.pendingInpaintPrompt||'只修改蒙版区域，其余像素、主体身份、服装和构图保持不变')}</textarea></label><p>Brush, erase, lasso, quick subject/background masks, invert, grow/shrink, feather and undo/redo.</p><button class="primary block" id="v35InpaintOpen">Open Mask Editor</button>`;
    if(tool==='relight')return `<header><div><i>☼</i><span><b>Relight</b><small>Relighting with controllable intent.</small></span></div><button id="v35RelightReset">Reset</button></header><div class="v35-before"><div>${n.outputUrl?`<img src="${escapeAttr(n.outputUrl)}">`:''}<span>Before</span></div><div>${n.outputUrl?`<img src="${escapeAttr(n.outputUrl)}">`:''}<span>After</span></div></div>${[['Light Direction','direction',0,360,'°'],['Intensity','intensity',0,100,'%'],['Color Temperature','temperature',2800,9000,'K'],['Rim Light','rim',0,100,'%'],['Shadow Softness','softness',0,100,'%']].map(([l,k,min,max,suf])=>`<label>${l}<div class="v35-range"><input id="v35Relight_${k}" type="range" min="${min}" max="${max}" value="${d.relight[k]}"><output>${d.relight[k]}${suf}</output></div></label>`).join('')}<label>Light Color<input id="v35RelightColor" type="color" value="${escapeAttr(d.relight.color)}"></label><button class="primary block" id="v35RelightApply">Create Relight Version</button>`;
    if(tool==='angle')return `<header><div><i>◒</i><span><b>Angle</b><small>Change viewpoint, preserve identity.</small></span></div></header>${[['Yaw','yaw',-90,90],['Pitch','pitch',-45,45],['Roll','roll',-30,30],['Lens','lens',18,135]].map(([l,k,min,max])=>`<label>${l}<div class="v35-range"><input id="v35Angle_${k}" type="range" min="${min}" max="${max}" value="${d.angle[k]}"><output>${d.angle[k]}${k==='lens'?'mm':'°'}</output></div></label>`).join('')}<label>Camera Intent<textarea id="v35AnglePrompt" rows="4">${escapeHtml(d.angle.prompt)}</textarea></label><button class="primary block" id="v35AngleApply">Generate New View</button>`;
    if(tool==='focus')return `<header><div><i>◎</i><span><b>Focus</b><small>Depth and subject emphasis.</small></span></div></header><label>Focus Strength<div class="v35-range"><input id="v35FocusStrength" type="range" min="0" max="100" value="${d.focus.strength}"><output>${d.focus.strength}%</output></div></label><label>Depth Separation<div class="v35-range"><input id="v35FocusDepth" type="range" min="0" max="100" value="${d.focus.depth}"><output>${d.focus.depth}%</output></div></label><label>Focus Intent<textarea id="v35FocusPrompt" rows="5">${escapeHtml(d.focus.prompt)}</textarea></label><button class="primary block" id="v35FocusApply">Generate Focus Version</button>`;
    if(tool==='compose'){const enabled=v352EffectiveRefs(n),sum=enabled.reduce((a,r)=>a+r.weight,0);return `<header><div><i>◫</i><span><b>Reference Compose</b><small>Weighted references with preservation locks.</small></span></div></header><label>Composition Prompt<textarea id="v35ComposePrompt" rows="4">${escapeHtml(d.compose.prompt)}</textarea></label><label>Global Blend<div class="v35-range"><input id="v35Blend" type="range" min="0" max="1" step="0.05" value="${d.compose.blend}"><output>${Number(d.compose.blend).toFixed(2)}</output></div></label><label>Composition Priority<select id="v35Priority">${v35Opt(['background','balanced','foreground'],d.compose.priority)}</select></label><label class="toggle">Style Lock<input id="v35StyleLock" type="checkbox" ${d.compose.styleLock?'checked':''}></label><label>Subject Preservation<div class="v35-range"><input id="v35Preserve" type="range" min="0" max="1" step="0.05" value="${d.compose.subjectPreservation}"><output>${Number(d.compose.subjectPreservation).toFixed(2)}</output></div></label><div class="v351-subtitle">Preserve</div>${v351PreserveControls(d)}<div class="v351-subtitle">Reference Policy</div><div class="v352-ref-presets">${['balanced','identity','product','scene'].map(x=>`<button data-v352-refpreset="${x}" class="${d.compose.preset===x?'active':''}">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><label class="toggle">Normalize enabled weights<input id="v352NormalizeRefs" type="checkbox" ${d.compose.normalizeWeights?'checked':''}></label><div class="v352-ref-meter"><span>${enabled.length} enabled</span><b>${d.compose.normalizeWeights?'Σ 1.00':'Σ '+sum.toFixed(2)}</b></div><div class="v351-subtitle">Reference Weights</div><div class="v351-weight-list">${v351ComposeRefs(n)}</div><button class="primary block" id="v35ComposeApply">Generate Composed Version</button>`}
    if(tool==='upscale')return `<header><div><i>↗</i><span><b>Upscale</b><small>Enhance resolution and recover detail.</small></span></div></header><label>Mode<select id="v35UpscaleMode">${v35Opt(['UltraSharp','Natural','Animation','Text & UI'],d.upscale.mode)}</select></label><label>Scale<div class="v35-scales">${[2,4,6].map(x=>`<button data-v35-scale="${x}" class="${Number(d.upscale.scale)===x?'active':''}">${x}x</button>`).join('')}</div></label>${[['Detail Boost','detail'],['Texture Recovery','texture'],['Face Fidelity','face']].map(([l,k])=>`<label>${l}<div class="v35-range"><input id="v35Upscale_${k}" type="range" min="0" max="100" value="${d.upscale[k]}"><output>${d.upscale[k]}%</output></div></label>`).join('')}<button class="primary block" id="v35UpscaleApply">Upscale Current Version</button>`;
    const left=d.compare.left||vs[0]?.id||'',right=d.compare.right||vs.at(-1)?.id||'';return `<header><div><i>◩</i><span><b>Version Compare</b><small>Split, overlay, flicker, 2-Up and difference comparison.</small></span></div></header><label>Left Version<select id="v35CompareLeft">${vs.map((v,i)=>`<option value="${v.id}" ${v.id===left?'selected':''}>v${i+1} · ${escapeHtml(v35Op(v,i))}</option>`).join('')}</select></label><label>Right Version<select id="v35CompareRight">${vs.map((v,i)=>`<option value="${v.id}" ${v.id===right?'selected':''}>v${i+1} · ${escapeHtml(v35Op(v,i))}</option>`).join('')}</select></label><div class="v351-compare-modes">${[['split','Split'],['overlay','Overlay'],['flicker','Flicker'],['grid','2-Up'],['difference','Difference']].map(([id,l])=>`<button data-v351-comparemode="${id}" class="${d.compare.mode===id?'active':''}">${l}</button>`).join('')}</div><label class="v351-overlay-label ${d.compare.mode==='split'||d.compare.mode==='overlay'?'':'hidden'}">Divider / Overlay<div class="v35-range"><input id="v35CompareOverlay" type="range" min="5" max="95" value="${d.compare.overlay}"><output>${d.compare.overlay}%</output></div></label><div class="v351-zoom-note">Synchronized view · ${Math.round(Number(d.compare.zoom||1)*100)}% · Pan ${Math.round(d.compare.panX||0)}, ${Math.round(d.compare.panY||0)}</div><div class="v352-compare-actions"><button id="v352FlipCompare">Flip A/B</button><button id="v352ResetCompareView">Reset View</button></div><div class="v351-review-row"><button data-v351-review="review">Needs Review</button><button data-v351-review="rejected">Reject Right</button><button data-v351-review="approved" class="primary">Approve Right</button></div><div class="v35-actions"><button id="v35UseLeft">Work from Left</button><button id="v35UseRight" class="primary">Work from Right</button></div><p>Review state and working state stay independent from the version applied to the Canvas node.</p>`
  }
  function v35Stage(n,tool){const d=v35Data(n),vs=v35Versions(n),active=v351Version(n,v351WorkingId(n))||vs.at(-1),url=active?.outputUrl||n.outputUrl||'';if(tool==='compare'&&vs.length){const l=vs.find(v=>v.id===(d.compare.left||vs[0].id))||vs[0],r=vs.find(v=>v.id===(d.compare.right||vs.at(-1).id))||vs.at(-1),pct=Number(d.compare.overlay||50),li=l.outputUrl||'',ri=r.outputUrl||'',mode=d.compare.mode||'split',t=`translate(${Number(d.compare.panX||0)}px,${Number(d.compare.panY||0)}px) scale(${Number(d.compare.zoom||1)})`;if(mode==='grid')return `<div class="v351-gridcompare v352-compare-root v352-pan-stage"><figure>${li?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(li)}">`:''}<figcaption>Left · ${escapeHtml(v35Op(l,0))}</figcaption></figure><figure>${ri?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(ri)}">`:''}<figcaption>Right · ${escapeHtml(v35Op(r,1))}</figcaption></figure></div>`;if(mode==='flicker')return `<div class="v35-compare v351-flicker v352-compare-root v352-pan-stage">${ri?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(ri)}">`:''}${li?`<img class="v351-flicker-top v352-compare-media" style="transform:${t}" src="${escapeAttr(li)}">`:''}<span class="v35-compare-label left">Flicker A/B</span></div>`;if(mode==='overlay')return `<div class="v35-compare v351-overlay v352-compare-root v352-pan-stage">${ri?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(ri)}">`:''}${li?`<img class="v351-overlay-img v352-compare-media" style="opacity:${pct/100};transform:${t}" src="${escapeAttr(li)}">`:''}<span class="v35-compare-label left">Left ${pct}%</span><span class="v35-compare-label right">Right</span></div>`;if(mode==='difference')return `<div class="v35-compare v352-difference v352-compare-root v352-pan-stage">${ri?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(ri)}">`:''}${li?`<img class="v352-diff-top v352-compare-media" style="transform:${t}" src="${escapeAttr(li)}">`:''}<span class="v35-compare-label left">Difference</span></div>`;return `<div class="v35-compare v352-compare-root v352-pan-stage">${ri?`<img class="v352-compare-media" style="transform:${t}" src="${escapeAttr(ri)}">`:''}<div class="v35-compare-layer" id="v35CompareLayer" style="width:${pct}%">${li?`<img class="v352-compare-media" style="width:${10000/pct}%;max-width:none;transform:${t}" src="${escapeAttr(li)}">`:''}</div><i class="v35-compare-line" id="v35CompareLine" style="left:${pct}%"></i><span class="v35-compare-label left">Left</span><span class="v35-compare-label right">Right</span></div>`}return `<div class="v35-stage ${tool==='crop'&&d.crop.safeArea?'v351-safe':''}" id="v35Stage" style="transform:scale(${d.view.zoom});">${url?`<img src="${escapeAttr(url)}">`:`<div class="fallback" style="background:${themeBg(n.content||'portrait')}">Image Preview</div>`}${tool==='crop'?`<div id="v35CropBox" class="v35-cropbox guide-${escapeAttr(d.crop.guides)}" style="left:${d.crop.x*100}%;top:${d.crop.y*100}%;width:${d.crop.width*100}%;height:${d.crop.height*100}%"><span></span><span></span><span></span><span></span></div>`:''}</div>`}
  function v35CommitLocal(n,out,label,params={}){v35EnsureBase(n);const parent=v351WorkingId(n),canvasState={outputUrl:n.outputUrl||'',prompt:n.prompt||'',toolParams:structuredClone(n.toolParams||{}),aspectRatio:n.aspectRatio,resolution:n.resolution,activeResultVersionId:n.activeResultVersionId};snapshot(`Image Studio · ${label}`);n.outputUrl=out.url||v352WorkingVersion(n)?.outputUrl||n.outputUrl;n.taskStatus='succeeded';n.toolParams={...(n.toolParams||{}),...params,operation:label,studioOperation:label};const v=recordNodeResultVersion(n);v.operation=label;v.status='candidate';v.parentVersionId=parent||null;v.parameters={...(v.parameters||{}),...params,operation:label};v35Data(n).workingVersionId=v.id;Object.assign(n,canvasState);saveState();return v}
  async function v35AIEdit(n,label,promptText,params={}){v35EnsureBase(n);const parent=v351WorkingId(n),wv=v352WorkingVersion(n),canvasState={outputUrl:n.outputUrl||'',prompt:n.prompt||'',toolParams:structuredClone(n.toolParams||{}),aspectRatio:n.aspectRatio,resolution:n.resolution,activeResultVersionId:n.activeResultVersionId};n.outputUrl=wv?.outputUrl||n.outputUrl||'';n.prompt=promptText||wv?.prompt||n.prompt||label;n.toolParams={...(n.toolParams||{}),...(wv?.parameters||{}),...params,operation:label,studioOperation:label,sourceVersionId:parent,sourceImageUrl:wv?.outputUrl||n.outputUrl||''};n.contextSnapshot=buildCreativeContextPacket(n);saveState();await generateForNode(n,{silent:true});const generatedId=activeResultVersionId(n),v=v35Versions(n).find(x=>x.id===generatedId)||v35Versions(n).at(-1);if(v){v.operation=label;v.status='candidate';v.parentVersionId=parent||null;v.parameters={...(v.parameters||{}),...params,operation:label,sourceVersionId:parent};v35Data(n).workingVersionId=v.id}Object.assign(n,canvasState);saveState();return v}
  function v351SendVersionNode(n,v){const b=createDerivedNode(n,'image',`${n.title||'Image'} · ${v35Op(v,0)}`,v.prompt||n.prompt||'',{operation:'image_studio_version',sourceVersionId:v.id},430);b.outputUrl=v.outputUrl||'';b.taskStatus='succeeded';const nv={...structuredClone(v),id:uid('rv'),parentVersionId:null,status:v.status||'candidate',createdAt:new Date().toISOString()};b.resultVersions=[nv];b.activeResultVersionId=nv.id;b.imageStudio={appliedVersionId:nv.id,workingVersionId:nv.id,activeTool:'crop'};return b}
  function v351CreateBranch(n,v){const b=createDerivedNode(n,'image',`${n.title||'Image'} · Branch`,v.prompt||n.prompt||'',{operation:'image_studio_branch',sourceVersionId:v.id},460),line=v351Lineage(n,v.id),idMap=new Map(line.map(x=>[x.id,uid('rv')]));b.resultVersions=line.map(x=>({...structuredClone(x),id:idMap.get(x.id),parentVersionId:x.parentVersionId?idMap.get(x.parentVersionId)||null:null}));const last=b.resultVersions.at(-1);b.outputUrl=last?.outputUrl||v.outputUrl||'';b.taskStatus='succeeded';b.activeResultVersionId=last?.id||'';b.imageStudio=structuredClone(v35Data(n));b.imageStudio.appliedVersionId=last?.id||'';b.imageStudio.workingVersionId=last?.id||'';return b}
  function openImageStudio(n,initialTool){ensureDefaultModel(n);v35EnsureBase(n);const d=v35Data(n);if(initialTool)d.activeTool=initialTool;const tool=d.activeTool||'crop',vs=v35Versions(n),packet=buildCreativeContextPacket(n),count=(packet?.references||packet?.items||packet?.assets||[]).length||collectReferences(n.id).length,working=v351WorkingId(n),applied=v351AppliedId(n);modalShell('Image Studio v3.5.2',`<div class="v35-studio"><div class="v35-top v351-top"><b>Canvas Studio</b><span>v3.5.2 · Image Studio</span><strong>${escapeHtml(n.title||'Image Node')}</strong><mark>Working v${Math.max(1,vs.findIndex(v=>v.id===working)+1)} · Canvas v${Math.max(1,vs.findIndex(v=>v.id===applied)+1)}</mark><button id="v351ApplyNode" class="primary">Apply to Node</button><button id="v351SendVersion">Send Version</button><button id="v351CreateBranch">Create Branch</button><button id="v35Back">Back</button></div><div class="v35-grid"><aside class="v35-left"><header><b>References</b><button id="v35AddRef">＋ Add</button></header><div>${v35Refs(n)}</div><header class="workflow"><b>Version Tree</b><span>${vs.length} versions</span></header><section class="v35-lineage v351-lineage v352-tree">${v352TreeHtml(n)}</section></aside><main class="v35-main"><header><span>${escapeHtml(tool==='compose'?'Reference Compose':tool==='compare'?'Version Compare':tool[0].toUpperCase()+tool.slice(1))}</span><div><button id="v351ZoomOut">−</button><button id="v351ZoomFit">Fit</button><button id="v351ZoomIn">＋</button></div></header><section class="v35-canvas">${v35Stage(n,tool)}</section><div class="v35-meta"><span>${escapeHtml(n.aspectRatio||'Auto')} · ${escapeHtml(n.resolution||'Source')}</span><span>Working version ${Math.max(1,vs.findIndex(v=>v.id===working)+1)} / ${Math.max(1,vs.length)}</span></div><footer><header><b>Versions</b><button id="v35CompareQuick">Compare</button></header><div>${v35VersionsHtml(n)}</div></footer></main><aside class="v35-right"><nav>${v35ToolRail(tool)}</nav><section class="v35-inspector"><div class="tabs"><b>Tools</b><span>Adjust</span><span>AI</span><span>Info</span></div>${v35Inspector(n,tool)}<div class="v35-context"><header><b>Context Packet</b><button id="v35Context">View</button></header><span>${count} linked items · Continuity Ready</span><div>${v35Refs(n)}</div></div></section></aside></div></div>`,{full:true});const dialog=$('.feature-dialog',featureModal),head=$('.feature-head',featureModal),body=$('.feature-body',featureModal);dialog?.classList.add('v35-dialog');if(head)head.style.display='none';if(body)body.classList.add('v35-body');const reopen=t=>{d.activeTool=t;saveState();openImageStudio(n,t)};$$('[data-v35-tool]',featureModal).forEach(b=>b.onclick=()=>reopen(b.dataset.v35Tool));$('#v351ZoomOut')?.addEventListener('click',()=>{if(tool==='compare')d.compare.zoom=Math.max(.5,Math.round((Number(d.compare.zoom||1)-.1)*10)/10);else d.view.zoom=Math.max(.5,Math.round((d.view.zoom-.1)*10)/10);saveState();reopen(tool)});$('#v351ZoomIn')?.addEventListener('click',()=>{if(tool==='compare')d.compare.zoom=Math.min(3,Math.round((Number(d.compare.zoom||1)+.1)*10)/10);else d.view.zoom=Math.min(2.5,Math.round((d.view.zoom+.1)*10)/10);saveState();reopen(tool)});$('#v351ZoomFit')?.addEventListener('click',()=>{if(tool==='compare'){d.compare.zoom=1;d.compare.panX=0;d.compare.panY=0}else d.view.zoom=1;saveState();reopen(tool)});$('#v351More')?.addEventListener('click',()=>{const adv=$('.v351-advanced',featureModal);adv?.classList.toggle('open');$('#v351More')?.classList.toggle('active')});$$('[data-v35-version],[data-v35-lineage]',featureModal).forEach(b=>b.onclick=()=>{const id=b.dataset.v35Version||b.dataset.v35Lineage;if(v351SetWorking(n,id)){saveState();reopen(tool)}});$('#v35Back').onclick=()=>{saveState();render();closeFeatureModal()};$('#v35CompareQuick').onclick=()=>reopen('compare');$('#v35AddRef').onclick=$('#v35Context').onclick=()=>{saveState();closeFeatureModal();openCreativeContextComposer(n)};$('#v351ApplyNode').onclick=()=>{if(v352ApplyWorkingToCanvas(n)){showToast('当前工作版本已原子应用到原 Image Node');reopen(tool)}};$('#v351SendVersion').onclick=()=>{const v=v351Version(n,v351WorkingId(n));if(!v)return;v351SendVersionNode(n,v);saveState();render();showToast('当前版本已作为新 Image Node 发送到画布')};$('#v351CreateBranch').onclick=()=>{const v=v351Version(n,v351WorkingId(n));if(!v)return;v351CreateBranch(n,v);saveState();render();showToast('已创建带版本谱系的独立分支')};$('#v35New').onclick=()=>showToast('选择编辑工具即可从当前工作版本创建新版本');bindRanges(featureModal);let cropCtl=tool==='crop'?bindSelectionBox($('#v35Stage'),$('#v35CropBox'),{ratio:d.crop.ratio}):null;$$('[data-v35-ratio]',featureModal).forEach(b=>b.onclick=()=>{d.crop.ratio=b.dataset.v35Ratio;saveState();reopen('crop')});$('#v35CropRatio')?.addEventListener('change',e=>{d.crop.ratio=e.target.value;cropCtl?.setRatio(e.target.value);saveState()});$('#v351CropGuide')?.addEventListener('change',e=>{d.crop.guides=e.target.value;saveState();reopen('crop')});$('#v351CropSafe')?.addEventListener('change',e=>{d.crop.safeArea=e.target.checked;saveState();reopen('crop')});$('#v35CropReset')?.addEventListener('click',()=>{d.crop={ratio:'free',x:.12,y:.10,width:.76,height:.80,guides:'thirds',safeArea:true};saveState();reopen('crop')});$('#v351CropCancel')?.addEventListener('click',()=>{v351RestoreApplied(n);saveState();reopen('crop')});$('#v35CropApply')?.addEventListener('click',async()=>{const box=cropCtl?.get()||d.crop;d.crop={...d.crop,...box};saveState();try{if(canLocalProcess(n)){const out=await localMediaProcess(v352WorkingProxy(n),'image-crop',{...box,normalized:true});if(out.outputs?.[0]){v35CommitLocal(n,out.outputs[0],'Crop',{cropBox:box,aspectRatio:d.crop.ratio});reopen('crop');return}}await v35AIEdit(n,'Crop',`Crop and reframe to ${d.crop.ratio}. Preserve identity and continuity.`,{cropBox:box,aspectRatio:d.crop.ratio});reopen('crop')}catch(e){showToast(e.message)}});$('#v35ExtendApply')?.addEventListener('click',async()=>{d.extend.ratio=$('#v35ExtendRatio').value;d.extend.anchor=$('#v35ExtendAnchor').value;d.extend.prompt=$('#v35ExtendPrompt').value;saveState();try{await v35AIEdit(n,'Extend',d.extend.prompt,{aspectRatio:d.extend.ratio,anchor:d.extend.anchor,outpaint:true});saveState();reopen('extend')}catch(e){showToast(e.message)}});$('#v35InpaintOpen')?.addEventListener('click',()=>{d.pendingInpaintPrompt=$('#v35InpaintPrompt').value;saveState();openMaskEditor(n,'重绘',{inPlace:true,returnTool:'inpaint'})});$('#v35RelightReset')?.addEventListener('click',()=>{d.relight={direction:135,intensity:72,temperature:5600,rim:45,softness:68,color:'#FFD8B2'};saveState();reopen('relight')});$('#v35RelightApply')?.addEventListener('click',async()=>{for(const k of ['direction','intensity','temperature','rim','softness'])d.relight[k]=Number($(`#v35Relight_${k}`).value);d.relight.color=$('#v35RelightColor').value;saveState();try{if(canLocalProcess(n)){const out=await localMediaProcess(v352WorkingProxy(n),'image-relight',d.relight);if(out.outputs?.[0]){v35CommitLocal(n,out.outputs[0],'Relight',d.relight);reopen('relight');return}}await v35AIEdit(n,'Relight',`Relight image. Direction ${d.relight.direction}°, intensity ${d.relight.intensity}%, ${d.relight.temperature}K, rim ${d.relight.rim}%, softness ${d.relight.softness}%. Preserve composition and identity.`,d.relight);reopen('relight')}catch(e){showToast(e.message)}});$('#v35AngleApply')?.addEventListener('click',async()=>{for(const k of ['yaw','pitch','roll','lens'])d.angle[k]=Number($(`#v35Angle_${k}`).value);d.angle.prompt=$('#v35AnglePrompt').value;saveState();try{await v35AIEdit(n,'Angle',`${d.angle.prompt}. yaw ${d.angle.yaw}°, pitch ${d.angle.pitch}°, roll ${d.angle.roll}°, ${d.angle.lens}mm lens.`,d.angle);reopen('angle')}catch(e){showToast(e.message)}});$('#v35FocusApply')?.addEventListener('click',async()=>{d.focus.strength=Number($('#v35FocusStrength').value);d.focus.depth=Number($('#v35FocusDepth').value);d.focus.prompt=$('#v35FocusPrompt').value;saveState();try{await v35AIEdit(n,'Focus',`${d.focus.prompt}. Focus strength ${d.focus.strength}%, depth separation ${d.focus.depth}%.`,d.focus);reopen('focus')}catch(e){showToast(e.message)}});$$('[data-v351-refweight]',featureModal).forEach(r=>{r.oninput=()=>{d.compose.referenceWeights[r.dataset.v351Refweight]=Number(r.value);d.compose.preset='custom';const o=r.nextElementSibling;if(o)o.textContent=Number(r.value).toFixed(2);saveState()}});$$('[data-v352-refenabled]',featureModal).forEach(c=>c.onchange=()=>{d.compose.referenceEnabled[c.dataset.v352Refenabled]=c.checked;d.compose.preset='custom';saveState();reopen('compose')});$$('[data-v352-refpreset]',featureModal).forEach(b=>b.onclick=()=>{v352ApplyRefPreset(n,b.dataset.v352Refpreset);saveState();reopen('compose')});$('#v352NormalizeRefs')?.addEventListener('change',e=>{d.compose.normalizeWeights=e.target.checked;saveState();reopen('compose')});$$('[data-v351-preserve]',featureModal).forEach(c=>c.onchange=()=>{d.compose.preserve[c.dataset.v351Preserve]=c.checked;saveState()});$('#v35ComposeApply')?.addEventListener('click',async()=>{d.compose.prompt=$('#v35ComposePrompt').value;d.compose.blend=Number($('#v35Blend').value);d.compose.priority=$('#v35Priority').value;d.compose.styleLock=$('#v35StyleLock').checked;d.compose.subjectPreservation=Number($('#v35Preserve').value);saveState();try{const refs=v352EffectiveRefs(n);if(!refs.length)throw new Error('至少启用一个参考素材');await v35AIEdit(n,'Reference Compose',d.compose.prompt,{...d.compose,references:refs,referencePolicy:{normalize:d.compose.normalizeWeights,preset:d.compose.preset},contextPacket:buildCreativeContextPacket(n)});reopen('compose')}catch(e){showToast(e.message)}});$$('[data-v35-scale]',featureModal).forEach(b=>b.onclick=()=>{d.upscale.scale=Number(b.dataset.v35Scale);saveState();reopen('upscale')});$('#v35UpscaleApply')?.addEventListener('click',async()=>{d.upscale.mode=$('#v35UpscaleMode').value;for(const k of ['detail','texture','face'])d.upscale[k]=Number($(`#v35Upscale_${k}`).value);saveState();try{if(canLocalProcess(n)){const out=await localMediaProcess(v352WorkingProxy(n),'image-upscale',{scale:d.upscale.scale});if(out.outputs?.[0]){v35CommitLocal(n,out.outputs[0],`Upscale ${d.upscale.scale}x`,d.upscale);reopen('upscale');return}}await v35AIEdit(n,`Upscale ${d.upscale.scale}x`,`Upscale ${d.upscale.scale}x while preserving faces, text, product geometry and composition.`,d.upscale);reopen('upscale')}catch(e){showToast(e.message)}});const sync=()=>{d.compare.left=$('#v35CompareLeft')?.value||d.compare.left;d.compare.right=$('#v35CompareRight')?.value||d.compare.right;d.compare.overlay=Number($('#v35CompareOverlay')?.value||d.compare.overlay);saveState();$('#v35CompareLayer')?.style.setProperty('width',d.compare.overlay+'%');$('#v35CompareLine')?.style.setProperty('left',d.compare.overlay+'%');$('.v351-overlay-img',featureModal)?.style.setProperty('opacity',d.compare.overlay/100)};$('#v35CompareLeft')?.addEventListener('change',()=>{sync();reopen('compare')});$('#v35CompareRight')?.addEventListener('change',()=>{sync();reopen('compare')});$('#v35CompareOverlay')?.addEventListener('input',sync);$$('[data-v351-comparemode]',featureModal).forEach(b=>b.onclick=()=>{d.compare.mode=b.dataset.v351Comparemode||b.getAttribute('data-v351-comparemode');saveState();reopen('compare')});$$('[data-v351-review]',featureModal).forEach(b=>b.onclick=()=>{sync();const v=v351Version(n,d.compare.right||v35Versions(n).at(-1)?.id);if(v){v.status=b.dataset.v351Review;saveState();reopen('compare')}});$('#v35UseLeft')?.addEventListener('click',()=>{sync();if(v351SetWorking(n,d.compare.left)){saveState();reopen('compare')}});$('#v35UseRight')?.addEventListener('click',()=>{sync();if(v351SetWorking(n,d.compare.right)){saveState();reopen('compare')}});$('#v352FlipCompare')?.addEventListener('click',()=>{sync();[d.compare.left,d.compare.right]=[d.compare.right,d.compare.left];saveState();reopen('compare')});$('#v352ResetCompareView')?.addEventListener('click',()=>{d.compare.zoom=1;d.compare.panX=0;d.compare.panY=0;saveState();reopen('compare')});if(tool==='compare'){const stage=$('.v35-canvas',featureModal);let dragging=false,sx=0,sy=0,px=0,py=0;stage?.addEventListener('pointerdown',e=>{if(e.target.closest('button,input,select'))return;dragging=true;sx=e.clientX;sy=e.clientY;px=Number(d.compare.panX||0);py=Number(d.compare.panY||0);stage.setPointerCapture?.(e.pointerId)});stage?.addEventListener('pointermove',e=>{if(!dragging)return;d.compare.panX=px+(e.clientX-sx);d.compare.panY=py+(e.clientY-sy);$$('.v352-compare-media',featureModal).forEach(img=>img.style.transform=`translate(${d.compare.panX}px,${d.compare.panY}px) scale(${Number(d.compare.zoom||1)})`)});stage?.addEventListener('pointerup',()=>{if(dragging){dragging=false;saveState()}});stage?.addEventListener('pointercancel',()=>{dragging=false})}}

  function openMaskEditor(n,tool,opts={}){
    const studio=v35Data(n),draftKey=v351WorkingId(n),draft=studio.maskDrafts[draftKey]||null;
    const def=opts.prompt||studio.pendingInpaintPrompt||draft?.prompt||(tool==='擦除'?'擦除白色蒙版区域并自然补全背景，不留下任何擦除痕迹':'只修改白色蒙版区域，其余像素、人物身份和构图保持不变');
    modalShell('Mask Editor · v3.5.2',`<div class="mask-editor-pro v351-mask"><div class="mask-stage" id="maskStage">${v352WorkingVersion(n)?.outputUrl?`<img src="${escapeAttr(v352WorkingVersion(n).outputUrl)}" draggable="false">`:`<div style="background:${themeBg(n.content||'city')}" class="editor-placeholder"></div>`}<canvas id="maskCanvas"></canvas><div class="mask-cursor" id="maskCursor"></div></div><aside><div class="v351-mask-tools"><button id="maskPaint" class="active">Brush</button><button id="maskErase">Erase</button><button id="maskLasso">Lasso</button><button id="maskUndo">↶</button><button id="maskRedo">↷</button></div><div class="v351-mask-tools"><button id="maskSubject">Subject Draft</button><button id="maskBackground">Background</button><button id="maskCenter">Center Object</button></div><div class="v351-mask-tools"><button id="maskInvert">Invert</button><button id="maskGrow">Grow</button><button id="maskShrink">Shrink</button><button id="maskClear">Clear</button></div>${rangeField('Brush Size','maskBrush',5,180,48,1)}${rangeField('Feather','maskFeather',0,48,8,1)}${rangeField('Mask Preview','maskOpacity',15,100,62,1)}${field('Edit Prompt',`<textarea id="maskPrompt" rows="7">${escapeHtml(def)}</textarea>`,true)}<div class="mask-tip">White = editable region. Draft masks are editable starting points; Brush/Lasso can refine them before generation.</div></aside></div><div class="feature-actions v352-mask-actions"><button id="v352SaveMaskDraft">Save Mask Draft</button><button id="v352DiscardMaskDraft">Discard Draft</button><button class="primary" id="sendRealMask">Create Inpaint Version</button></div>`,{wide:true});bindRanges();
    const stage=$('#maskStage'),canvas=$('#maskCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let mode='paint',drawing=false,last=null,lasso=[],undo=[],redo=[];
    const resize=()=>{const r=stage.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),old=canvas.width?document.createElement('canvas'):null;if(old){old.width=canvas.width;old.height=canvas.height;old.getContext('2d').drawImage(canvas,0,0)}canvas.width=Math.max(2,Math.round(r.width*dpr));canvas.height=Math.max(2,Math.round(r.height*dpr));canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';if(old)ctx.drawImage(old,0,0,old.width,old.height,0,0,canvas.width,canvas.height);canvas.style.opacity=Number($('#maskOpacity').value||62)/100};
    requestAnimationFrame(resize);const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}};
    const capture=()=>{try{return ctx.getImageData(0,0,canvas.width,canvas.height)}catch{return null}},pushUndo=()=>{const x=capture();if(x){undo.push(x);if(undo.length>30)undo.shift();redo=[]}},restore=x=>{if(x)ctx.putImageData(x,0,0)};
    const stroke=(a,b)=>{ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Number($('#maskBrush').value)*(canvas.width/canvas.getBoundingClientRect().width);if(mode==='paint'||mode==='lasso'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(255,255,255,.94)'}else ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()};
    const setMode=m=>{mode=m;['maskPaint','maskErase','maskLasso'].forEach(id=>$('#'+id)?.classList.toggle('active',id===`mask${m[0].toUpperCase()+m.slice(1)}`))};
    canvas.onpointerdown=e=>{pushUndo();drawing=true;last=pos(e);lasso=mode==='lasso'?[last]:[];if(mode!=='lasso')stroke(last,last);try{canvas.setPointerCapture(e.pointerId)}catch{}};canvas.onpointermove=e=>{const c=$('#maskCursor'),r=stage.getBoundingClientRect();c.style.left=e.clientX-r.left+'px';c.style.top=e.clientY-r.top+'px';c.style.width=c.style.height=Number($('#maskBrush').value)+'px';if(drawing){const p=pos(e);if(mode==='lasso'){lasso.push(p);stroke(last,p)}else stroke(last,p);last=p}};canvas.onpointerup=()=>{if(mode==='lasso'&&lasso.length>2){ctx.save();ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(255,255,255,.94)';ctx.beginPath();ctx.moveTo(lasso[0].x,lasso[0].y);lasso.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.restore()}drawing=false};canvas.onpointercancel=()=>drawing=false;canvas.onpointerleave=()=>{if(mode!=='lasso')drawing=false};
    $('#maskPaint').onclick=()=>setMode('paint');$('#maskErase').onclick=()=>setMode('erase');$('#maskLasso').onclick=()=>setMode('lasso');$('#maskClear').onclick=()=>{pushUndo();ctx.clearRect(0,0,canvas.width,canvas.height)};$('#maskUndo').onclick=()=>{if(!undo.length)return;const cur=capture();if(cur)redo.push(cur);restore(undo.pop())};$('#maskRedo').onclick=()=>{if(!redo.length)return;const cur=capture();if(cur)undo.push(cur);restore(redo.pop())};$('#maskInvert').onclick=()=>{pushUndo();const im=capture();if(!im)return;for(let i=0;i<im.data.length;i+=4){const na=255-im.data[i+3];im.data[i]=im.data[i+1]=im.data[i+2]=255;im.data[i+3]=na}restore(im)};$('#maskOpacity').oninput=e=>canvas.style.opacity=Number(e.target.value)/100;
    const quick=kind=>{pushUndo();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.fillStyle='rgba(255,255,255,.94)';if(kind==='background'){ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.ellipse(canvas.width*.5,canvas.height*.53,canvas.width*.20,canvas.height*.43,0,0,Math.PI*2);ctx.fill()}else if(kind==='subject'){ctx.beginPath();ctx.ellipse(canvas.width*.5,canvas.height*.53,canvas.width*.20,canvas.height*.43,0,0,Math.PI*2);ctx.fill()}else{ctx.fillRect(canvas.width*.28,canvas.height*.25,canvas.width*.44,canvas.height*.5)}ctx.restore()};$('#maskSubject').onclick=()=>quick('subject');$('#maskBackground').onclick=()=>quick('background');$('#maskCenter').onclick=()=>quick('center');
    const morph=grow=>{pushUndo();const im=capture();if(!im)return;const w=im.width,h=im.height,src=new Uint8ClampedArray(im.data),rad=2;for(let y=rad;y<h-rad;y++)for(let x=rad;x<w-rad;x++){let val=grow?0:255;for(let yy=-rad;yy<=rad;yy++)for(let xx=-rad;xx<=rad;xx++){const a=src[((y+yy)*w+x+xx)*4+3];val=grow?Math.max(val,a):Math.min(val,a)}im.data[(y*w+x)*4]=im.data[(y*w+x)*4+1]=im.data[(y*w+x)*4+2]=255;im.data[(y*w+x)*4+3]=val}restore(im)};$('#maskGrow').onclick=()=>morph(true);$('#maskShrink').onclick=()=>morph(false);
    const loadDraft=async()=>{if(!draft?.url)return;try{const im=new Image();im.onload=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height)};im.src=draft.url;if($('#maskPrompt'))$('#maskPrompt').value=draft.prompt||$('#maskPrompt').value;if($('#maskFeather')&&draft.feather!=null)$('#maskFeather').value=draft.feather;if($('#maskOpacity')&&draft.opacity!=null){$('#maskOpacity').value=Math.round(draft.opacity*100);canvas.style.opacity=draft.opacity}}catch{}};loadDraft();
    const saveDraft=async()=>{const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('无法导出蒙版');const up=await uploadBlob(blob,`mask-draft-${Date.now()}.png`);studio.maskDrafts[draftKey]={url:up.url,prompt:$('#maskPrompt').value,feather:Number($('#maskFeather').value||0),opacity:Number($('#maskOpacity').value||62)/100,updatedAt:new Date().toISOString()};saveState();showToast('蒙版草稿已按工作版本保存')};
    $('#v352SaveMaskDraft')?.addEventListener('click',()=>saveDraft().catch(e=>showToast(e.message)));$('#v352DiscardMaskDraft')?.addEventListener('click',()=>{delete studio.maskDrafts[draftKey];ctx.clearRect(0,0,canvas.width,canvas.height);saveState();showToast('当前工作版本的蒙版草稿已丢弃')});
    $('#sendRealMask').onclick=async()=>{try{const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error('无法导出蒙版');const up=await uploadBlob(blob,`mask-${Date.now()}.png`),promptText=$('#maskPrompt').value,params={operation:tool,maskUrl:up.url,maskMode:'white-edit',maskFeather:Number($('#maskFeather').value||0),maskOpacity:Number($('#maskOpacity').value||62)/100,maskDraftVersionId:draftKey};if(opts.inPlace){closeFeatureModal();await v35AIEdit(n,'Inpaint',promptText,params);if(n.imageStudio)n.imageStudio.pendingInpaintPrompt='';saveState();openImageStudio(n,opts.returnTool||'inpaint');showToast('蒙版已创建为新的工作版本');return}const node=createDerivedNode(n,'image',`${tool}结果`,promptText,params,430);node.toolParams.maskUrl=up.url;closeFeatureModal();showToast('蒙版已保存并绑定到生成器');renderGenerator()}catch(e){showToast('蒙版上传失败：'+e.message)}};
  }


  // v3.6 · Video Studio Core
  function v36Data(n){
    const d=n.videoStudio||(n.videoStudio={});
    d.activeTool=d.activeTool||'trim';d.playhead=Number(d.playhead||0);d.fps=Math.max(1,Number(d.fps||30));
    d.range=d.range||{in:0,out:Math.max(.1,Number(n.duration||5))};
    d.extend=d.extend||{direction:'after',duration:5,prompt:'延续当前主体、场景、动作和镜头语言，自然继续画面'};
    d.remake=d.remake||{prompt:'只重拍选中时间段，前后内容保持不变，主体身份、服装、场景和镜头连续'};
    d.compare=d.compare||{left:'',right:'',mode:'2up',active:'right'};
    d.reframe=d.reframe||{ratio:'9:16',tracking:'auto',focusX:.5,focusY:.5,safeMargin:12};
    d.speedEdit=d.speedEdit||{speed:1,preservePitch:true};
    d.freeze=d.freeze||{time:Number(d.playhead||0),duration:1.5,audioMode:'silence'};
    d.audio=d.audio||{lastSeparatedAt:'',createMutedVersion:true};
    d.markers=Array.isArray(d.markers)?d.markers:[];
    return d;
  }
  function v36EnsureBase(n){
    n.resultVersions=Array.isArray(n.resultVersions)?n.resultVersions:[];
    if(!n.resultVersions.length&&n.outputUrl){const v={id:uid('rv'),outputUrl:n.outputUrl,prompt:n.prompt||'',providerId:n.providerId||'',modelId:n.modelId||'',modelName:n.modelName||'Imported',createdAt:new Date().toISOString(),operation:'Original',status:'base',parentVersionId:null,parameters:{aspectRatio:n.aspectRatio||'',resolution:n.resolution||'',duration:Number(n.duration||5)}};n.resultVersions=[v];n.activeResultVersionId=v.id}
    n.resultVersions.forEach((v,i)=>{if(!('parentVersionId' in v))v.parentVersionId=i?n.resultVersions[i-1]?.id||null:null;if(!v.status)v.status=i?'candidate':'base';v.parameters=v.parameters||{};if(!v.parameters.duration)v.parameters.duration=Number(n.duration||5)});
    const d=v36Data(n),active=n.activeResultVersionId||n.resultVersions.at(-1)?.id||'';d.workingVersionId=d.workingVersionId&&n.resultVersions.some(v=>v.id===d.workingVersionId)?d.workingVersionId:active;d.appliedVersionId=d.appliedVersionId&&n.resultVersions.some(v=>v.id===d.appliedVersionId)?d.appliedVersionId:active;
    const wv=n.resultVersions.find(v=>v.id===d.workingVersionId)||n.resultVersions.at(-1),dur=Math.max(.1,Number(wv?.parameters?.duration||n.duration||5));d.range.in=Math.max(0,Math.min(dur-.01,Number(d.range.in||0)));d.range.out=Math.max(d.range.in+.01,Math.min(dur,Number(d.range.out||dur)));
  }
  function v36Versions(n){v36EnsureBase(n);return nodeResultVersions(n)}
  function v36Version(n,id){return v36Versions(n).find(v=>v.id===id)}
  function v36WorkingId(n){v36EnsureBase(n);return v36Data(n).workingVersionId||n.activeResultVersionId||v36Versions(n).at(-1)?.id||''}
  function v36AppliedId(n){v36EnsureBase(n);return v36Data(n).appliedVersionId||v36WorkingId(n)}
  function v36Working(n){return v36Version(n,v36WorkingId(n))||v36Versions(n).at(-1)||null}
  function v36Duration(n,v=v36Working(n)){return Math.max(.1,Number(v?.parameters?.duration||n.duration||5))}
  function v36Proxy(n){const v=v36Working(n);return {...n,outputUrl:v?.outputUrl||n.outputUrl||'',prompt:v?.prompt??n.prompt,duration:v36Duration(n,v),resolution:v?.parameters?.resolution||n.resolution,aspectRatio:v?.parameters?.aspectRatio||n.aspectRatio,toolParams:{...(n.toolParams||{}),...(v?.parameters||{})}}}
  function v36SetWorking(n,id){if(!v36Version(n,id))return false;const d=v36Data(n);d.workingVersionId=id;const dur=v36Duration(n,v36Version(n,id));d.range={in:0,out:dur};d.playhead=Math.min(d.playhead||0,dur);return true}
  function v36Op(v,i=0){return v?.operation||v?.parameters?.operation||v?.modelName||(i===0?'Original':`Version ${i+1}`)}
  function v36Status(v,i=0){return v.status||(i===0?'base':'candidate')}
  function v36Badge(s){return s==='approved'?'Approved':s==='review'?'Needs Review':s==='rejected'?'Rejected':s==='base'?'Base':'Candidate'}
  function v36TreeHtml(n){const vs=v36Versions(n),active=v36WorkingId(n),applied=v36AppliedId(n),map=new Map(vs.map((v,i)=>[v.id,{v,i,children:[]} ])),roots=[];vs.forEach(v=>{const row=map.get(v.id),p=map.get(v.parentVersionId);p?p.children.push(row):roots.push(row)});const draw=(row,depth=0)=>{const {v,i,children}=row;return `<button class="v36-tree-row ${v.id===active?'active':''} ${v.id===applied?'applied':''}" data-v36-version="${v.id}" style="--depth:${depth}"><i>${i+1}</i><span><b>${escapeHtml(v36Op(v,i))}</b><small>${Number(v.parameters?.duration||n.duration||0).toFixed(2)}s · ${children.length?children.length+' child'+(children.length>1?'ren':''):'leaf'}</small></span><em class="${v36Status(v,i)}">${v.id===applied?'Canvas':v36Badge(v36Status(v,i))}</em></button>${children.map(c=>draw(c,depth+1)).join('')}`};return roots.map(r=>draw(r)).join('')}
  function v36Lineage(n,id){const vs=v36Versions(n),map=new Map(vs.map(v=>[v.id,v])),out=[];let cur=map.get(id),guard=0;while(cur&&guard++<50){out.unshift(cur);if(!cur.parentVersionId)break;cur=map.get(cur.parentVersionId)}return out}
  function v36ApplyWorking(n){const v=v36Working(n);if(!v)return false;snapshot('Video Studio · Apply to Node');n.outputUrl=v.outputUrl||n.outputUrl||'';n.prompt=v.prompt??n.prompt;n.providerId=v.providerId||n.providerId;n.modelId=v.modelId||n.modelId;n.modelName=v.modelName||n.modelName;n.duration=Number(v.parameters?.duration||n.duration||5);n.resolution=v.parameters?.resolution||n.resolution;n.aspectRatio=v.parameters?.aspectRatio||n.aspectRatio;n.toolParams={...(n.toolParams||{}),...(v.parameters||{})};n.activeResultVersionId=v.id;n.taskStatus=n.outputUrl?'succeeded':n.taskStatus;const d=v36Data(n);d.appliedVersionId=v.id;d.appliedAt=new Date().toISOString();saveState();render();return true}
  function v36CommitLocal(n,out,label,params={}){v36EnsureBase(n);const parent=v36WorkingId(n),canvas={outputUrl:n.outputUrl||'',prompt:n.prompt||'',duration:n.duration,resolution:n.resolution,aspectRatio:n.aspectRatio,toolParams:structuredClone(n.toolParams||{}),activeResultVersionId:n.activeResultVersionId};snapshot(`Video Studio · ${label}`);n.outputUrl=out.url||v36Working(n)?.outputUrl||n.outputUrl||'';n.duration=Number(out.duration||params.duration||v36Duration(n));n.toolParams={...(n.toolParams||{}),...params,operation:label,studioOperation:label};n.taskStatus='succeeded';const v=recordNodeResultVersion(n);v.operation=label;v.status='candidate';v.parentVersionId=parent||null;v.parameters={...(v.parameters||{}),...params,operation:label,duration:n.duration,resolution:n.resolution,aspectRatio:n.aspectRatio};v36Data(n).workingVersionId=v.id;Object.assign(n,canvas);saveState();return v}
  async function v36AIEdit(n,label,promptText,params={}){v36EnsureBase(n);const parent=v36WorkingId(n),wv=v36Working(n),canvas={outputUrl:n.outputUrl||'',prompt:n.prompt||'',duration:n.duration,resolution:n.resolution,aspectRatio:n.aspectRatio,toolParams:structuredClone(n.toolParams||{}),activeResultVersionId:n.activeResultVersionId};n.outputUrl=wv?.outputUrl||n.outputUrl||'';n.duration=v36Duration(n,wv);n.prompt=promptText||wv?.prompt||n.prompt||label;n.toolParams={...(n.toolParams||{}),...(wv?.parameters||{}),...params,operation:label,studioOperation:label,sourceVersionId:parent,sourceVideoUrl:wv?.outputUrl||n.outputUrl||'',contextPacket:buildCreativeContextPacket(n)};n.contextSnapshot=buildCreativeContextPacket(n);saveState();await generateForNode(n,{silent:true});const v=v36Version(n,activeResultVersionId(n))||v36Versions(n).at(-1);if(v){v.operation=label;v.status='candidate';v.parentVersionId=parent||null;v.parameters={...(v.parameters||{}),...params,operation:label,sourceVersionId:parent,duration:Number(v.parameters?.duration||params.outputDuration||n.duration||5)};v36Data(n).workingVersionId=v.id}Object.assign(n,canvas);saveState();return v}
  function v36SendVersionNode(n,v){const b=createDerivedNode(n,'video',`${n.title||'Video'} · ${v36Op(v,0)}`,v.prompt||n.prompt||'',{operation:'video_studio_version',sourceVersionId:v.id},440);b.outputUrl=v.outputUrl||'';b.duration=Number(v.parameters?.duration||n.duration||5);b.resolution=v.parameters?.resolution||n.resolution;b.taskStatus='succeeded';const nv={...structuredClone(v),id:uid('rv'),parentVersionId:null,createdAt:new Date().toISOString()};b.resultVersions=[nv];b.activeResultVersionId=nv.id;b.videoStudio={appliedVersionId:nv.id,workingVersionId:nv.id,activeTool:'trim',range:{in:0,out:b.duration},playhead:0,fps:30};return b}
  function v36CreateBranch(n,v){const b=createDerivedNode(n,'video',`${n.title||'Video'} · Branch`,v.prompt||n.prompt||'',{operation:'video_studio_branch',sourceVersionId:v.id},470),line=v36Lineage(n,v.id),idMap=new Map(line.map(x=>[x.id,uid('rv')]));b.resultVersions=line.map(x=>({...structuredClone(x),id:idMap.get(x.id),parentVersionId:x.parentVersionId?idMap.get(x.parentVersionId)||null:null}));const last=b.resultVersions.at(-1);b.outputUrl=last?.outputUrl||v.outputUrl||'';b.duration=Number(last?.parameters?.duration||n.duration||5);b.taskStatus='succeeded';b.activeResultVersionId=last?.id||'';b.videoStudio=structuredClone(v36Data(n));b.videoStudio.appliedVersionId=last?.id||'';b.videoStudio.workingVersionId=last?.id||'';return b}
  function v36ToolRail(active){return [['trim','Trim','trim'],['extract','Extract Frame','extract'],['extend','Extend','extend'],['remake','Segment Remake','remake'],['reframe','Auto Reframe','reframe'],['speed','Speed','speed'],['freeze','Freeze Frame','freeze'],['audio','Audio Split','audio'],['markers','Markers','markers'],['compare','Version Compare','compare']].map(([id,l,i])=>`<button data-v36-tool="${id}" class="${active===id?'active':''}"><i>${uiIcon(i)}</i><span>${l}</span></button>`).join('')}
  function v36RefsHtml(n){const rows=collectReferences(n.id).slice(0,7);return rows.length?rows.map(r=>`<div class="v36-ref"><i>${r.type==='image'?'IMG':r.type==='video'?'VID':r.type==='audio'?'AUD':'TXT'}</i><span><b>${escapeHtml(r.title||labelForType(r.type))}</b><small>${escapeHtml(edgeRoleLabel(r.role||r.usage||'reference'))}</small></span></div>`).join(''):'<div class="v36-empty">No references yet.</div>'}
  function v36VersionOptions(n,id){return v36Versions(n).map((v,i)=>`<option value="${v.id}" ${v.id===id?'selected':''}>v${i+1} · ${escapeHtml(v36Op(v,i))}</option>`).join('')}
  function v362MarkerRows(n){const d=v36Data(n);return d.markers.length?d.markers.slice().sort((a,b)=>a.time-b.time).map((m,i)=>`<div class="v362-marker-row"><button data-v362-jump-marker="${m.id}"><i>${Number(m.time||0).toFixed(2)}s</i><span><b>${escapeHtml(m.label||`Marker ${i+1}`)}</b><small>${escapeHtml(m.note||m.type||'Review marker')}</small></span></button><button title="Create remake range" data-v362-marker-remake="${m.id}">${uiIcon('refresh')}</button><button title="Delete" data-v362-marker-delete="${m.id}">${uiIcon('trash')}</button></div>`).join(''):'<div class="v36-empty">No markers yet. Press M while reviewing.</div>'}
  function v36Inspector(n,tool){const d=v36Data(n),dur=v36Duration(n),rin=Number(d.range.in||0),rout=Number(d.range.out||dur);if(tool==='trim')return `<header><div><i>${uiIcon('trim')}</i><span><b>Trim</b><small>Non-destructive range trim.</small></span></div></header><label>In Point<input id="v36TrimIn" type="number" min="0" max="${dur}" step="0.01" value="${rin.toFixed(2)}"></label><label>Out Point<input id="v36TrimOut" type="number" min="0" max="${dur}" step="0.01" value="${rout.toFixed(2)}"></label><p>Selected duration: <b>${Math.max(.01,rout-rin).toFixed(2)}s</b>. Local media is trimmed by FFmpeg; remote media is sent as an edit task.</p><button class="primary block" id="v36ApplyTrim">Create Trim Version</button>`;if(tool==='extract')return `<header><div><i>${uiIcon('extract')}</i><span><b>Extract Frame</b><small>Create an Image Node from the exact playhead.</small></span></div></header><label>Timecode<input id="v36ExtractAt" type="number" min="0" max="${dur}" step="0.001" value="${Number(d.playhead||0).toFixed(3)}"></label><p>For local media, the exact frame is extracted with FFmpeg and sent to Canvas as an Image Node.</p><button class="primary block" id="v36ExtractFrame">Extract Current Frame</button>`;if(tool==='extend')return `<header><div><i>${uiIcon('extend')}</i><span><b>Extend</b><small>Continue before or after the working version.</small></span></div></header><label>Direction<select id="v36ExtendDirection"><option value="after" ${d.extend.direction==='after'?'selected':''}>After End</option><option value="before" ${d.extend.direction==='before'?'selected':''}>Before Start</option></select></label><label>Extend Duration<select id="v36ExtendDuration">${[2,3,4,5,8,10,15].map(x=>`<option value="${x}" ${Number(d.extend.duration)===x?'selected':''}>${x}s</option>`).join('')}</select></label><label>Continuation Prompt<textarea id="v36ExtendPrompt" rows="7">${escapeHtml(d.extend.prompt)}</textarea></label><button class="primary block" id="v36RunExtend">Create Extend Version</button>`;if(tool==='remake')return `<header><div><i>${uiIcon('remake')}</i><span><b>Segment Remake</b><small>Regenerate only the selected time range.</small></span></div></header><label>Range<input value="${rin.toFixed(2)}s → ${rout.toFixed(2)}s" disabled></label><label>Remake Prompt<textarea id="v36RemakePrompt" rows="8">${escapeHtml(d.remake.prompt)}</textarea></label><p>Continuity context, connected references, source version and selected range are sent with the generation task.</p><button class="primary block" id="v36RunRemake">Remake Selected Segment</button>`;if(tool==='reframe')return `<header><div><i>${uiIcon('reframe')}</i><span><b>Auto Reframe</b><small>Adapt one video to another delivery ratio.</small></span></div></header><label>Target Ratio<select id="v362ReframeRatio">${['9:16','4:5','1:1','16:9','21:9'].map(x=>`<option ${d.reframe.ratio===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Subject Tracking<select id="v362ReframeTracking"><option value="auto" ${d.reframe.tracking==='auto'?'selected':''}>Auto / continuity subject</option><option value="center" ${d.reframe.tracking==='center'?'selected':''}>Center</option><option value="left" ${d.reframe.tracking==='left'?'selected':''}>Bias Left</option><option value="right" ${d.reframe.tracking==='right'?'selected':''}>Bias Right</option><option value="manual" ${d.reframe.tracking==='manual'?'selected':''}>Manual focus point</option></select></label><label>Horizontal Focus <span class="v362-inline-value">${Math.round(Number(d.reframe.focusX||.5)*100)}%</span><input id="v362FocusX" type="range" min="0" max="1" step=".01" value="${Number(d.reframe.focusX||.5)}"></label><label>Vertical Focus <span class="v362-inline-value">${Math.round(Number(d.reframe.focusY||.5)*100)}%</span><input id="v362FocusY" type="range" min="0" max="1" step=".01" value="${Number(d.reframe.focusY||.5)}"></label><label>Safe Margin<input id="v362SafeMargin" type="range" min="0" max="30" step="1" value="${Number(d.reframe.safeMargin||12)}"></label><p>Local processing uses a real FFmpeg crop around the chosen focus. “Auto” is a continuity-aware focal heuristic in this phase; provider-backed semantic tracking can override it.</p><button class="primary block" id="v362ApplyReframe">Create Reframe Version</button>`;if(tool==='speed')return `<header><div><i>${uiIcon('speed')}</i><span><b>Speed</b><small>Create a retimed video version.</small></span></div></header><label>Playback Speed<select id="v362Speed">${[.5,.75,1,1.25,1.5,2].map(x=>`<option value="${x}" ${Number(d.speedEdit.speed||1)===x?'selected':''}>${x}×</option>`).join('')}</select></label><label class="v362-check"><input id="v362KeepPitch" type="checkbox" ${d.speedEdit.preservePitch!==false?'checked':''}> Preserve audio pitch</label><div class="v362-metric"><span>Source</span><b>${dur.toFixed(2)}s</b><span>Output</span><b>${(dur/Math.max(.1,Number(d.speedEdit.speed||1))).toFixed(2)}s</b></div><button class="primary block" id="v362ApplySpeed">Create Speed Version</button>`;if(tool==='freeze')return `<header><div><i>${uiIcon('freeze')}</i><span><b>Freeze Frame</b><small>Hold one frame without destroying the source.</small></span></div></header><label>Freeze At<input id="v362FreezeAt" type="number" min="0" max="${dur}" step=".001" value="${Number(d.freeze.time ?? d.playhead ?? 0).toFixed(3)}"></label><label>Hold Duration<select id="v362FreezeDuration">${[.5,1,1.5,2,3,5].map(x=>`<option value="${x}" ${Number(d.freeze.duration||1.5)===x?'selected':''}>${x}s</option>`).join('')}</select></label><label>Audio During Hold<select id="v362FreezeAudio"><option value="silence" ${d.freeze.audioMode==='silence'?'selected':''}>Insert silence</option></select></label><p>The working video is split at the timecode, the selected frame is cloned for the hold duration, then the remaining video is rejoined.</p><button class="primary block" id="v362ApplyFreeze">Create Freeze Version</button>`;if(tool==='audio')return `<header><div><i>${uiIcon('audio')}</i><span><b>Audio Split</b><small>Separate picture and original audio.</small></span></div></header><div class="v362-audio-diagram"><span>Working Video</span><i>→</i><b>Muted Video</b><i>+</i><b>Audio Node</b></div><label class="v362-check"><input id="v362MutedVersion" type="checkbox" ${d.audio.createMutedVersion!==false?'checked':''}> Keep muted video as a new Video Version</label><p>For uploaded/local media this is a real FFmpeg demux. The extracted audio is sent to Canvas as a connected Audio Node.</p><button class="primary block" id="v362SeparateAudio">Separate Audio to Canvas</button>${d.audio.lastSeparatedAt?`<small class="v362-last">Last separated ${escapeHtml(d.audio.lastSeparatedAt)}</small>`:''}`;if(tool==='markers')return `<header><div><i>${uiIcon('markers')}</i><span><b>Review Markers</b><small>Persistent issue notes attached to this Video Node.</small></span></div></header><label>Label<input id="v362MarkerLabel" value="审片问题" placeholder="例如：面部漂移 / 标志错误 / 节奏问题…"></label><label>Note<textarea id="v362MarkerNote" rows="4" placeholder="记录这个时间点需要修复的问题…"></textarea></label><button class="primary block" id="v362AddMarker">Add Marker at ${Number(d.playhead||0).toFixed(2)}s</button><div class="v362-marker-list">${v362MarkerRows(n)}</div><p>Shortcut: <b>M</b> creates a quick marker at the current playhead. The ↻ action creates a ±0.6s remake range around a marker.</p>`;const left=d.compare.left||v36Versions(n)[0]?.id||'',right=d.compare.right||v36WorkingId(n);return `<header><div><i>${uiIcon('compare')}</i><span><b>Version Compare</b><small>Synchronized playback and playhead.</small></span></div></header><label>Left Version<select id="v36CompareLeft">${v36VersionOptions(n,left)}</select></label><label>Right Version<select id="v36CompareRight">${v36VersionOptions(n,right)}</select></label><div class="v36-compare-modes"><button data-v36-compare="2up" class="${d.compare.mode==='2up'?'active':''}">2-Up</button><button data-v36-compare="ab" class="${d.compare.mode==='ab'?'active':''}">A/B</button><button data-v36-compare="split" class="${d.compare.mode==='split'?'active':''}">Split</button></div><div class="v36-compare-actions"><button id="v36UseLeft">Work from Left</button><button id="v36UseRight">Work from Right</button></div>`}
  function v36CompareStage(n){const d=v36Data(n),vs=v36Versions(n),l=v36Version(n,d.compare.left)||vs[0],r=v36Version(n,d.compare.right)||v36Working(n),mode=d.compare.mode||'2up',lu=l?.outputUrl||'',ru=r?.outputUrl||'';if(mode==='ab'){const active=d.compare.active==='left'?l:r,url=active?.outputUrl||'';return `<div class="v36-ab-stage"><video id="v36CompareA" src="${escapeAttr(url)}" playsinline preload="metadata"></video><span>A/B · ${d.compare.active==='left'?'Left':'Right'}</span><button id="v36ABToggle">Hold A / Toggle</button></div>`}if(mode==='split')return `<div class="v36-split-stage"><video id="v36CompareLeftVideo" src="${escapeAttr(lu)}" playsinline preload="metadata"></video><div class="v36-split-cut"><video id="v36CompareRightVideo" src="${escapeAttr(ru)}" playsinline preload="metadata"></video></div><i></i></div>`;return `<div class="v36-2up"><figure><video id="v36CompareLeftVideo" src="${escapeAttr(lu)}" playsinline preload="metadata"></video><figcaption>Left · ${escapeHtml(v36Op(l,0))}</figcaption></figure><figure><video id="v36CompareRightVideo" src="${escapeAttr(ru)}" playsinline preload="metadata"></video><figcaption>Right · ${escapeHtml(v36Op(r,1))}</figcaption></figure></div>`}
  function v36VersionsHtml(n){const active=v36WorkingId(n),applied=v36AppliedId(n);return v36Versions(n).map((v,i)=>`<button class="v36-ver ${v.id===active?'active':''} ${v.id===applied?'applied':''}" data-v36-version="${v.id}">${v.outputUrl?`<video src="${escapeAttr(v.outputUrl)}" muted preload="metadata"></video>`:'<div></div>'}<span>v${i+1}</span><b>${escapeHtml(v36Op(v,i))}</b><small>${Number(v.parameters?.duration||n.duration||0).toFixed(2)}s</small></button>`).join('')}
  function v36TimelineHtml(n){const d=v36Data(n),dur=v36Duration(n),rin=Number(d.range.in||0),rout=Number(d.range.out||dur),play=Math.max(0,Math.min(dur,Number(d.playhead||0))),ticks=Array.from({length:11},(_,i)=>({t:dur*i/10,p:i*10})),markers=(d.markers||[]).filter(m=>Number(m.time)>=0&&Number(m.time)<=dur);return `<div class="v36-timeline" id="v36Timeline"><div class="v36-ruler" id="v36Ruler">${ticks.map(x=>`<i style="left:${x.p}%"><span>${x.t.toFixed(1)}s</span></i>`).join('')}${markers.map(m=>`<button class="v362-timeline-marker" data-v362-timeline-marker="${m.id}" style="left:${Number(m.time)/dur*100}%" title="${escapeAttr((m.label||'Marker')+' · '+Number(m.time).toFixed(2)+'s')}">◆</button>`).join('')}<div class="v36-range" id="v36Range" style="left:${rin/dur*100}%;width:${(rout-rin)/dur*100}%"><button id="v36RangeIn" class="left"></button><button id="v36RangeOut" class="right"></button></div><div class="v36-playhead" id="v36Playhead" style="left:${play/dur*100}%"></div></div><div class="v36-filmstrip">${Array.from({length:12},(_,i)=>`<span style="--i:${i}"></span>`).join('')}</div></div>`}
  function v36BindPlayer(n,reopen){const d=v36Data(n),dur=v36Duration(n),video=$('#v36Video',featureModal),time=$('#v36Time',featureModal),playhead=$('#v36Playhead',featureModal),range=$('#v36Range',featureModal);if(!video)return;const sync=()=>{const t=Math.max(0,Math.min(dur,Number(video.currentTime||0)));d.playhead=t;if(time)time.textContent=`${t.toFixed(2)} / ${dur.toFixed(2)}s`;if(playhead)playhead.style.left=(t/dur*100)+'%';if(video.loop&&t>=Number(d.range.out||dur)-.03)video.currentTime=Number(d.range.in||0)};video.ontimeupdate=sync;video.onloadedmetadata=()=>{const saved=Math.max(0,Math.min(dur,Number(d.playhead||0)));try{video.currentTime=saved}catch{};if(time)time.textContent=`${saved.toFixed(2)} / ${dur.toFixed(2)}s`;if(playhead)playhead.style.left=(saved/dur*100)+'%'};const seek=t=>{d.playhead=Math.max(0,Math.min(dur,Number(t)||0));try{video.currentTime=d.playhead}catch{}sync()};$('#v36Play',featureModal)?.addEventListener('click',()=>video.paused?video.play().catch(()=>{}):video.pause());$('#v36Prev',featureModal)?.addEventListener('click',()=>seek(d.playhead-1/d.fps));$('#v36Next',featureModal)?.addEventListener('click',()=>seek(d.playhead+1/d.fps));$('#v36SetIn',featureModal)?.addEventListener('click',()=>{d.range.in=Math.min(d.playhead,Number(d.range.out)-.01);saveState();reopen()});$('#v36SetOut',featureModal)?.addEventListener('click',()=>{d.range.out=Math.max(d.playhead,Number(d.range.in)+.01);saveState();reopen()});$('#v36Loop',featureModal)?.addEventListener('click',e=>{video.loop=!video.loop;e.currentTarget.classList.toggle('active',video.loop)});$('#v36Speed',featureModal)?.addEventListener('change',e=>video.playbackRate=Number(e.target.value));$('#v36Ruler',featureModal)?.addEventListener('pointerdown',e=>{if(e.target.closest('#v36RangeIn,#v36RangeOut'))return;const r=e.currentTarget.getBoundingClientRect();seek((e.clientX-r.left)/r.width*dur);saveState()});const dragHandle=(el,key)=>{if(!el)return;el.onpointerdown=e=>{e.stopPropagation();const ruler=$('#v36Ruler',featureModal),r=ruler.getBoundingClientRect();const move=ev=>{const t=Math.max(0,Math.min(dur,(ev.clientX-r.left)/r.width*dur));if(key==='in')d.range.in=Math.min(t,Number(d.range.out)-.01);else d.range.out=Math.max(t,Number(d.range.in)+.01);if(range){range.style.left=d.range.in/dur*100+'%';range.style.width=(d.range.out-d.range.in)/dur*100+'%'}};const up=()=>{document.removeEventListener('pointermove',move);saveState();reopen()};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true})}};dragHandle($('#v36RangeIn',featureModal),'in');dragHandle($('#v36RangeOut',featureModal),'out');if(window.__v36KeyHandler)window.removeEventListener('keydown',window.__v36KeyHandler,true);window.__v36KeyHandler=e=>{if(featureModal.classList.contains('hidden')||!$('.v36-studio',featureModal)||/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName||''))return;if(e.key==='ArrowLeft'){e.preventDefault();seek(d.playhead-1/d.fps)}else if(e.key==='ArrowRight'){e.preventDefault();seek(d.playhead+1/d.fps)}else if(e.key.toLowerCase()==='k'||e.code==='Space'){e.preventDefault();video.paused?video.play().catch(()=>{}):video.pause()}else if(e.key.toLowerCase()==='j'){e.preventDefault();video.playbackRate=.5;video.currentTime=Math.max(0,d.playhead-.2)}else if(e.key.toLowerCase()==='l'){e.preventDefault();video.playbackRate=2;video.play().catch(()=>{})}else if(e.key.toLowerCase()==='m'){e.preventDefault();d.markers.push({id:uid('vm'),time:Number(d.playhead||0),label:'Quick marker',note:'',type:'review',createdAt:new Date().toISOString()});saveState();reopen('markers')}};window.addEventListener('keydown',window.__v36KeyHandler,true)}
  function v36BindCompare(n,reopen){
    const d = v36Data(n);
    const left = $('#v36CompareLeftVideo', featureModal);
    const right = $('#v36CompareRightVideo', featureModal);
    const ab = $('#v36CompareA', featureModal);
    const videos = [left, right, ab].filter(Boolean);
    const master = right || left || ab;
    const dur = Math.max(.1, v36Duration(n));
    const updateCompare = ()=>{
      d.compare.left = $('#v36CompareLeft')?.value || d.compare.left;
      d.compare.right = $('#v36CompareRight')?.value || d.compare.right;
      saveState();
    };

    if(master){
      master.ontimeupdate = ()=>{
        const t = master.currentTime;
        d.playhead = t;
        videos.forEach(v=>{
          if(v !== master && Math.abs(v.currentTime - t) > .08) try{ v.currentTime = t }catch{}
        });
        const ph = $('#v36Playhead', featureModal);
        if(ph) ph.style.left = Math.min(100, t / dur * 100) + '%';
        const tm = $('#v36Time', featureModal);
        if(tm) tm.textContent = `${t.toFixed(2)} / ${dur.toFixed(2)}s`;
      };
      master.onplay = ()=>videos.forEach(v=>{ if(v !== master) v.play().catch(()=>{}) });
      master.onpause = ()=>videos.forEach(v=>v !== master && v.pause());
    }

    $('#v36ABToggle', featureModal)?.addEventListener('click', ()=>{
      d.compare.active = d.compare.active === 'left' ? 'right' : 'left';
      saveState();
      reopen();
    });
    $('#v362ReframeRatio')?.addEventListener('change', e=>{
      d.reframe.ratio = e.target.value;
      saveState();
      reopen('reframe');
    });
    $('#v362ReframeTracking')?.addEventListener('change', e=>{
      d.reframe.tracking = e.target.value;
      if(e.target.value === 'left') d.reframe.focusX = .28;
      else if(e.target.value === 'right') d.reframe.focusX = .72;
      else if(e.target.value === 'center') d.reframe.focusX = .5;
      saveState();
      reopen('reframe');
    });
    for(const [id, key] of [['v362FocusX','focusX'],['v362FocusY','focusY'],['v362SafeMargin','safeMargin']]){
      $('#'+id)?.addEventListener('input', e=>{
        d.reframe[key] = Number(e.target.value);
        saveState();
      });
    }
    $('#v362ApplyReframe')?.addEventListener('click', async()=>{
      const p = {aspectRatio:d.reframe.ratio, tracking:d.reframe.tracking, focusX:Number(d.reframe.focusX||.5), focusY:Number(d.reframe.focusY||.5), safeMargin:Number(d.reframe.safeMargin||12), duration:dur};
      try{
        if(canLocalProcess(v36Proxy(n))){
          const out = await localMediaProcess(v36Proxy(n), 'video-reframe', p);
          if(out.outputs?.[0]){
            v36CommitLocal(n, out.outputs[0], `Auto Reframe ${p.aspectRatio}`, p);
            reopen('reframe');
            return;
          }
        }
        await v36AIEdit(n, `Auto Reframe ${p.aspectRatio}`, `Reframe the source video to ${p.aspectRatio}, keep the primary subject safely framed and preserve continuity.`, {...p, editMode:'auto_reframe', outputDuration:dur});
        reopen('reframe');
      }catch(e){ showToast(e.message) }
    });
    $('#v362Speed')?.addEventListener('change', e=>{
      d.speedEdit.speed = Number(e.target.value);
      saveState();
      reopen('speed');
    });
    $('#v362KeepPitch')?.addEventListener('change', e=>{
      d.speedEdit.preservePitch = e.target.checked;
      saveState();
    });
    $('#v362ApplySpeed')?.addEventListener('click', async()=>{
      const p = {speed:Number(d.speedEdit.speed||1), preservePitch:d.speedEdit.preservePitch!==false, duration:dur / Math.max(.1, Number(d.speedEdit.speed||1))};
      try{
        if(canLocalProcess(v36Proxy(n))){
          const out = await localMediaProcess(v36Proxy(n), 'video-speed', p);
          if(out.outputs?.[0]){
            v36CommitLocal(n, out.outputs[0], `Speed ${p.speed}x`, p);
            reopen('speed');
            return;
          }
        }
        await v36AIEdit(n, `Speed ${p.speed}x`, `Retiming only: play the source video at ${p.speed}x while preserving visual content and audio pitch.`, {...p, editMode:'speed', outputDuration:p.duration});
        reopen('speed');
      }catch(e){ showToast(e.message) }
    });
    $('#v362FreezeAt')?.addEventListener('change', e=>{
      d.freeze.time = Math.max(0, Math.min(dur, Number(e.target.value)||0));
      saveState();
    });
    $('#v362FreezeDuration')?.addEventListener('change', e=>{
      d.freeze.duration = Number(e.target.value);
      saveState();
    });
    $('#v362FreezeAudio')?.addEventListener('change', e=>{
      d.freeze.audioMode = e.target.value;
      saveState();
    });
    $('#v362ApplyFreeze')?.addEventListener('click', async()=>{
      const p = {time:Math.max(0,Math.min(dur-.04,Number($('#v362FreezeAt')?.value ?? d.playhead ?? 0))), holdDuration:Number(d.freeze.duration||1.5), audioMode:d.freeze.audioMode||'silence', duration:dur + Number(d.freeze.duration||1.5)};
      d.freeze.time = p.time;
      saveState();
      try{
        if(canLocalProcess(v36Proxy(n))){
          const out = await localMediaProcess(v36Proxy(n), 'video-freeze', p);
          if(out.outputs?.[0]){
            v36CommitLocal(n, out.outputs[0], `Freeze ${p.holdDuration}s`, p);
            reopen('freeze');
            return;
          }
        }
        await v36AIEdit(n, `Freeze Frame ${p.holdDuration}s`, `Freeze the visual frame at ${p.time.toFixed(3)} seconds for ${p.holdDuration} seconds, then continue the original video unchanged.`, {...p, editMode:'freeze_frame', outputDuration:p.duration});
        reopen('freeze');
      }catch(e){ showToast(e.message) }
    });
    $('#v362MutedVersion')?.addEventListener('change', e=>{
      d.audio.createMutedVersion = e.target.checked;
      saveState();
    });
    $('#v362SeparateAudio')?.addEventListener('click', async()=>{
      try{
        if(!canLocalProcess(v36Proxy(n))) throw new Error('音视频真实分离目前需要已上传到本地媒体库的视频');
        const out = await localMediaProcess(v36Proxy(n), 'av-separate', {});
        const vid = (out.outputs||[]).find(x=>x.type==='video');
        const aud = (out.outputs||[]).find(x=>x.type==='audio');
        snapshot('Video Studio · Separate Audio');
        if(vid && d.audio.createMutedVersion!==false) v36CommitLocal(n, {...vid, duration:dur}, 'Muted Video', {duration:dur, audioSeparated:true});
        if(aud){
          const a = {id:uid('n'), type:'audio', x:n.x+450, y:n.y+170, w:330, title:`${n.title||'Video'} · Extracted Audio`, outputUrl:aud.url, prompt:'', providerId:'', modelId:'', modelName:'FFmpeg Audio Split', duration:dur, taskStatus:'succeeded', toolParams:{operation:'audio_split', sourceVideoId:n.id, sourceVersionId:v36WorkingId(n)}};
          state.nodes.push(a);
          state.edges.push(makeSemanticEdge(n.id, a.id, 'asset', 'audio_reference'));
        }
        d.audio.lastSeparatedAt = new Date().toLocaleTimeString();
        saveState();
        render();
        showToast('音视频已真实分离，音频节点已发送到 Canvas');
        reopen('audio');
      }catch(e){ showToast(e.message) }
    });
    const addMarker = (label='审片问题', note='') => {
      const t = Math.max(0, Math.min(v36Duration(n), Number(d.playhead || 0)));
      d.markers.push({ id:uid('vm'), time:t, label:String(label || '审片问题'), note:String(note || ''), type:'review', createdAt:new Date().toISOString() });
      saveState();
    };
    $('#v362AddMarker')?.addEventListener('click', ()=>{
      addMarker($('#v362MarkerLabel')?.value, $('#v362MarkerNote')?.value);
      reopen('markers');
    });
    $$('[data-v362-jump-marker],[data-v362-timeline-marker]', featureModal).forEach(b=>b.onclick=()=>{
      const id = b.dataset.v362JumpMarker || b.dataset.v362TimelineMarker;
      const m = d.markers.find(x=>x.id===id);
      if(m){
        d.playhead = Number(m.time || 0);
        saveState();
        reopen(tool);
      }
    });
    $$('[data-v362-marker-delete]', featureModal).forEach(b=>b.onclick=()=>{
      d.markers = d.markers.filter(x=>x.id !== b.dataset.v362MarkerDelete);
      saveState();
      reopen('markers');
    });
    $$('[data-v362-marker-remake]', featureModal).forEach(b=>b.onclick=()=>{
      const m = d.markers.find(x=>x.id===b.dataset.v362MarkerRemake);
      if(!m) return;
      d.range.in = Math.max(0, Number(m.time) - .6);
      d.range.out = Math.min(v36Duration(n), Number(m.time) + .6);
      d.remake.prompt = `修复标记的问题：${m.label||'审片问题'}。${m.note||''}`;
      saveState();
      reopen('remake');
    });
    $('#v36CompareLeft')?.addEventListener('change', ()=>{ updateCompare(); reopen('compare') });
    $('#v36CompareRight')?.addEventListener('change', ()=>{ updateCompare(); reopen('compare') });
    $$('[data-v36-compare]', featureModal).forEach(b=>b.onclick=()=>{
      updateCompare();
      d.compare.mode = b.dataset.v36Compare;
      saveState();
      reopen('compare');
    });
    $('#v36UseLeft')?.addEventListener('click', ()=>{
      updateCompare();
      if(v36SetWorking(n, d.compare.left)){ saveState(); reopen('compare'); }
    });
    $('#v36UseRight')?.addEventListener('click', ()=>{
      updateCompare();
      if(v36SetWorking(n, d.compare.right)){ saveState(); reopen('compare'); }
    });
  }

  // top bindings
  $('#brandButton').onclick = showWorkspaceMenu;
  $('#projectName').onclick = showCanvasMenu;
  workflowViewBtn?.addEventListener('click',()=>setCanvasViewMode('workflow'));
  storyboardViewBtn?.addEventListener('click',()=>setCanvasViewMode('storyboard'));
  $('#settingsBtn').onclick=showSettingsMenu;
  $('#productionBtn').onclick=openProjectProductionDashboard;
  $('#contextBtn').onclick=openCreativeContextOverview;
  agentBtn?.addEventListener('click',()=>{agentState.open=!agentState.open;saveAgentState();render();if(agentState.open)setTimeout(()=>$('#agentDraft')?.focus(),50)});
  if(storyboardBtn)storyboardBtn.onclick=openStoryboardCenter;
  $('#taskBtn').onclick=openTaskManager;
  $('#undoBtn').onclick=undo; $('#redoBtn').onclick=redo;
  $('#minimapBtn').onclick=()=>minimap.classList.toggle('hidden');
  if(minimap){let miniDragging=false;const jumpMini=e=>{if(!minimapMap)renderMinimap();const r=minimap.getBoundingClientRect(),m=minimapMap,mx=e.clientX-r.left,my=e.clientY-r.top,wx=(mx-m.ox)/m.scale,wy=(my-m.oy)/m.scale;state.viewport.x=viewport.clientWidth/2-wx*state.viewport.zoom;state.viewport.y=viewport.clientHeight/2-wy*state.viewport.zoom;scheduleViewportTransform()};minimap.onpointerdown=e=>{e.preventDefault();miniDragging=true;jumpMini(e);try{minimap.setPointerCapture(e.pointerId)}catch{}};minimap.onpointermove=e=>{if(miniDragging)jumpMini(e)};minimap.onpointerup=e=>{if(!miniDragging)return;miniDragging=false;try{minimap.releasePointerCapture(e.pointerId)}catch{}queueViewportSave();render()};minimap.onpointercancel=()=>{miniDragging=false;queueViewportSave()}}
  $('#zoomBtn').onclick=showZoomMenu;
  document.addEventListener('click',e=>{
    const workflow=e.target.closest?.('[data-workflow-starter]');
    if(workflow){e.preventDefault();launchEmptyWorkflow(workflow.dataset.workflowStarter);return}
    const quick=e.target.closest?.('[data-empty-quick]');
    if(quick&&emptyQuickBar&&!emptyQuickBar.classList.contains('hidden')){
      e.preventDefault();
      if(quick.dataset.emptyQuick==='smart-edit'){launchEmptyWorkflow('smart-edit');return}
      const order=['text','image','video','audio'].indexOf(quick.dataset.emptyQuick),rect=viewport.getBoundingClientRect(),p=screenToWorld(rect.left+viewport.clientWidth/2-315+Math.max(0,order)*172,rect.top+viewport.clientHeight/2+80);addNode(quick.dataset.emptyQuick,p);
    }
  },true);

  function isTypingTarget(el=document.activeElement){return Boolean(el&&(['INPUT','TEXTAREA','SELECT'].includes(el.tagName)||el.isContentEditable))}
  const SHORTCUT_REGISTRY=[
    {id:'history.undo',label:'撤销',combo:'Mod+Z',run:()=>undo()},
    {id:'history.redo',label:'重做',combo:'Mod+Shift+Z',run:()=>redo()},
    {id:'node.create',label:'Command Palette / 新建节点',combo:'Tab',run:()=>{const r=viewport.getBoundingClientRect(),x=r.left+viewport.clientWidth/2,y=r.top+viewport.clientHeight/2;showCommandPalette(x,y,screenToWorld(x,y))}},
    {id:'canvas.commands',label:'Command Palette',combo:'Mod+K',run:()=>{const r=viewport.getBoundingClientRect(),x=r.left+viewport.clientWidth/2,y=r.top+Math.min(220,viewport.clientHeight*.3);showCommandPalette(x,y,screenToWorld(x,y))}},
    {id:'node.copy',label:'复制到跨画布剪贴板',combo:'Mod+C',when:()=>currentSelectionIds().length>0,run:()=>copySelection()},
    {id:'node.paste',label:'粘贴图片段',combo:'Mod+V',when:()=>Boolean(clipboard||loadCanvasClipboard()),run:()=>pasteClipboard()},
    {id:'node.duplicate',label:'复制节点',combo:'Mod+D',when:()=>currentSelectionIds().length>0,run:()=>duplicateSelection(null,false)},
    {id:'node.duplicateInputs',label:'副本（保留上游输入）',combo:'Mod+Shift+D',when:()=>currentSelectionIds().length>0,run:()=>duplicateSelection(null,true)},
    {id:'node.duplicateBranch',label:'复制完整下游分支',combo:'Mod+Alt+D',when:()=>currentSelectionIds().length>0,run:()=>duplicateBranch()},
    {id:'node.delete',label:'删除',combo:'Delete',when:()=>currentSelectionIds().length>0,run:()=>deleteSelection()},
    {id:'canvas.search',label:'搜索 / 定位节点',combo:'Mod+F',run:()=>openCanvasSearch()},
    {id:'canvas.layout',label:'整理工作流分支',combo:'Mod+Shift+L',run:()=>openAutoLayoutMenu()},
    {id:'group.create',label:'打组',combo:'Mod+G',when:()=>currentSelectionIds().length>1,run:()=>createGroup(state.selectedIds,'工作流组','workflow')},
    {id:'group.ungroup',label:'解组',combo:'Mod+Shift+G',run:()=>ungroupSelection()},
    {id:'group.storyboard',label:'创建分镜组',combo:'Mod+Alt+G',when:()=>currentSelectionIds().filter(id=>state.nodes.find(n=>n.id===id)?.type==='image').length>1,run:()=>{const imgs=currentSelectionIds().filter(id=>state.nodes.find(n=>n.id===id)?.type==='image');createGroup(imgs,'分镜组','storyboard',{grid:'3x3',ratio:'16:9'})}},
    {id:'generation.run',label:'运行选中生成器',combo:'Mod+Enter',when:()=>Boolean(selectedId),run:()=>{const n=state.nodes.find(x=>x.id===selectedId);if(n&&['image','video','audio','text'].includes(n.type))generateForNode(n)}},
    {id:'help.shortcuts',label:'快捷键面板',combo:'Shift+?',run:()=>openShortcutHelp()}
  ];
  function shortcutParts(combo){return String(combo).split('+')}
  function shortcutMatches(e,combo){const p=shortcutParts(combo),key=p.at(-1).toLowerCase(),mod=p.includes('Mod'),shift=p.includes('Shift'),alt=p.includes('Alt');if(Boolean(e.metaKey||e.ctrlKey)!==mod)return false;if(Boolean(e.shiftKey)!==shift)return false;if(Boolean(e.altKey)!==alt)return false;const eventKey=(e.key==='Backspace'?'delete':e.key).toLowerCase();return eventKey===key.toLowerCase()}
  function dispatchShortcut(e){if(isTypingTarget())return false;for(const item of SHORTCUT_REGISTRY){const combo=state.shortcutOverrides?.[item.id]||item.combo;if(shortcutMatches(e,combo)&&(!item.when||item.when())){e.preventDefault();item.run(e);return true}}return false}
  function openShortcutHelp(){modalShell('快捷键',`<div class="shortcut-help"><div class="shortcut-help-head"><p>Canvas Studio v3.5.4 使用统一 Shortcut Registry。所有核心画布命令都从这里分发，后续可以安全加入用户自定义键位。</p></div><div class="shortcut-help-list">${SHORTCUT_REGISTRY.map(s=>`<div><span>${escapeHtml(s.label)}</span><kbd>${escapeHtml(state.shortcutOverrides?.[s.id]||s.combo.replace('Mod',navigator.platform?.includes('Mac')?'⌘':'Ctrl'))}</kbd></div>`).join('')}</div></div>`,{wide:true})}
  window.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&edgeReconnect){e.preventDefault();cleanupEdgeReconnect();return}
    if(e.key==='Escape'&&connectingFrom){e.preventDefault();cleanupConnectionDrag();return}
    if(e.key==='Escape'&&marquee){e.preventDefault();cancelMarquee();return}
    if(e.key==='Escape'&&expandedNodeId){e.preventDefault();expandedNodeId=null;generator.classList.add('hidden');renderToolbar();return}
    if(!isTypingTarget()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){
      if(e.key.toLowerCase()==='v'){e.preventDefault();setInteractionMode('move');hideMenus();return}
      if(e.key.toLowerCase()==='h'){e.preventDefault();setInteractionMode('grab');hideMenus();return}
    }
    if(e.code==='Space'&&!isTypingTarget()){window.__spaceDown=true;e.preventDefault();return}
    dispatchShortcut(e)
  });
  window.addEventListener('keyup',e=>{if(e.code==='Space')window.__spaceDown=false});
  window.addEventListener('resize',render);
  document.addEventListener('click',e=>{if(Date.now()-(window.__quickAddOpenedAt||0)<240)return;if(!contextMenu.contains(e.target)&&!projectMenu.contains(e.target)&&!modelPicker?.contains(e.target)&&!e.target.closest('#brandButton')&&!e.target.closest('#projectName')&&!e.target.closest('[data-canvas-more]')&&!e.target.closest('#settingsBtn')&&!e.target.closest('#modelPickerBtn')&&!e.target.closest('#zoomBtn'))hideMenus()});

  let lastProviderRefreshAt=0;
  async function refreshProvidersFromServer(force=false){
    const now=Date.now();if(!force&&now-lastProviderRefreshAt<700)return;lastProviderRefreshAt=now;
    if(!authenticated)return;
    await loadProviders();
    // Clear stale node model ids only when the model truly disappeared/was disabled; then choose a fresh default.
    state.nodes.forEach(n=>{
      if(!['text','image','video','audio'].includes(n.type))return;
      if(n.modelId&&!modelForNode(n)){n.providerId='';n.modelId='';n.modelName=''}
      ensureDefaultModel(n);
    });
    if(expandedNodeId)renderGenerator();
    renderEmptyQuickBar();
  }
  const resumedNodeTaskMonitors=new Map();
  function persistedNodeTaskAttempt(n){
    const providerId=String(n?.taskProviderId||n?.providerId||''),modelId=String(n?.taskModelId||n?.modelId||''),provider=providerById(providerId),model=provider?.models?.find(m=>String(m.id)===modelId)||null;
    return{provider,model,providerId,modelId,modelName:model?.name||n?.modelName||modelId||'模型',primary:true};
  }
  function applyRecoveredTaskSuccess(n,info,attempt){
    if(!n||!info||n.taskId!==info.id)return false;
    syncNodeTaskDiagnostics(n,info);const out=info.output||{},resolvedUrl=resolveGeneratedOutputUrl(out.value??out);if(resolvedUrl)n.outputUrl=resolvedUrl;
    if(out.type==='url'&&!n.outputUrl)n.outputUrl=String(out.value||'').trim();
    else if(out.type==='text'){if(n.type==='text')n.text=out.value;else n.generatedText=out.value}
    else if(out.type!=='url'&&out.value!==undefined)n.generatedResult=out.value;
    if(!n.outputUrl&&n.type==='video'){const fallbackUrl=resolveGeneratedOutputUrl(n.generatedResult)||resolveGeneratedOutputUrl(n.toolParams?.output)||resolveGeneratedOutputUrl(n.toolParams?.result);if(fallbackUrl)n.outputUrl=fallbackUrl}
    n.taskStatus='succeeded';n.taskProgress=100;n.taskError='';n.taskSyncMessage='';n.outputSourceUrl=out.sourceUrl||n.outputSourceUrl||'';n.lastUsedProviderId=attempt.providerId||n.taskProviderId||n.providerId||'';n.lastUsedModelId=attempt.modelId||n.taskModelId||n.modelId||'';n.lastUsedModelName=attempt.modelName||n.modelName||'';
    const hasVersion=n.outputUrl&&(n.resultVersions||[]).some(v=>String(v.outputUrl||'')===String(n.outputUrl));if(n.outputUrl&&!hasVersion)recordNodeResultVersion(n,{providerId:n.lastUsedProviderId,modelId:n.lastUsedModelId,modelName:n.lastUsedModelName});
    saveState();render();return true;
  }
  async function resumePersistedNodeTask(n){
    if(!n?.taskId||resumedNodeTaskMonitors.has(n.id))return;
    const taskId=String(n.taskId),attempt=persistedNodeTaskAttempt(n);
    const work=(async()=>{try{
      let info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;if(!info||String(n.taskId)!==taskId)return;
      syncNodeTaskDiagnostics(n,info);n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=['failed','canceled'].includes(info.status)?taskFailureText(info):'';n.taskSyncMessage=['provider_succeeded','result_pending'].includes(info.status)?'上游已生成，正在同步视频结果…':'';saveState();render();
      if(info.status==='succeeded'){applyRecoveredTaskSuccess(n,info,attempt);return}
      if(['failed','canceled'].includes(info.status))return;
      if(!['queued','running','polling','retrying','provider_succeeded','result_pending','fallback'].includes(info.status))return;
      info=await monitorNodeTask(n,taskId,attempt,info);if(info?.status==='succeeded'&&String(n.taskId)===taskId)applyRecoveredTaskSuccess(n,info,attempt);
    }catch(error){if(String(n.taskId)!==taskId)return;n.taskSyncMessage='任务恢复监控暂时失败，页面会保留原任务 ID；请勿重新生成。';n.taskError=safeTaskDiagnosticText(errorText(error));saveState();render()}finally{resumedNodeTaskMonitors.delete(n.id)}})();
    resumedNodeTaskMonitors.set(n.id,work);return work;
  }
  function resumePersistedNodeTaskMonitors(){
    const active=new Set(['queued','running','polling','retrying','provider_succeeded','result_pending','fallback']);
    for(const n of state.nodes){if(n?.taskId&&active.has(String(n.taskStatus||'')))resumePersistedNodeTask(n)}
  }

  window.addEventListener('pagehide',()=>{if(!backendOnline||!authenticated||!state.projectId)return;try{const payload=deepClone(state);fetch('/api/projects/'+encodeURIComponent(state.projectId),{method:'PUT',headers:{'Content-Type':'application/json'},credentials:'same-origin',keepalive:true,body:JSON.stringify({name:payload.projectName,data:payload,forceSnapshot:false})})}catch{}});
  window.addEventListener('pageshow',()=>refreshProvidersFromServer(true));
  window.addEventListener('focus',()=>refreshProvidersFromServer(false));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshProvidersFromServer(true)});

  // v3.5.4 · unified drag & drop: Assets / History / Local Files
  viewport.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';viewport.classList.add('canvas-drop-active')});
  viewport.addEventListener('dragleave',e=>{if(e.target===viewport)viewport.classList.remove('canvas-drop-active')});
  viewport.addEventListener('drop',async e=>{e.preventDefault();viewport.classList.remove('canvas-drop-active');const p=screenToWorld(e.clientX,e.clientY),files=[...(e.dataTransfer.files||[])];if(files.length){await importLocalFilesGrid(files,p);return}let payload=null;try{payload=JSON.parse(e.dataTransfer.getData('application/x-canvasstudio-item')||'null')}catch{}if(!payload){const text=e.dataTransfer.getData('text/plain')||'',m=text.match(/^canvasstudio:(asset|history):(.+)$/);if(m)payload={kind:m[1],id:m[2]}}if(payload?.kind==='asset'){const a=state.assets.find(x=>x.id===payload.id);if(a)useAsset(a,p);return}if(payload?.kind==='history'){const h=state.history.find(x=>x.id===payload.id);if(h){runTransaction('历史素材拖入画布',()=>{const n=historyToNode(h,p);state.nodes.push(n);state.selectedIds=[n.id];selectedId=n.id});saveState();render();showToast('历史素材已拖入画布')}return}});

  (async function init(){const ok=await checkAuth();const params=new URLSearchParams(location.search),requestedProject=params.get('projectId');if(requestedProject)state.projectId=requestedProject;if(ok){await loadProviders();await ensureServerProject();}render();resumePersistedNodeTaskMonitors();const open=params.get('open');if(open==='providers'&&ok)openProviderModal();})();
})();
