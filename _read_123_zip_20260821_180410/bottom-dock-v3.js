/* Canvas Studio · Bottom Dock v3
 * Redesigns the persistent dock and upgrades History / Shortcuts surfaces.
 * Placeholder dock entries intentionally stay non-functional until their product areas are ready.
 */
(()=>{
  'use strict';

  const $=(s,root=document)=>root.querySelector(s);
  const $$=(s,root=document)=>[...root.querySelectorAll(s)];
  const dock=$('#bottomDock');
  const drawer=$('#drawer');
  const featureModal=$('#featureModal');
  if(!dock||!drawer)return;

  const svg=(paths,cls='ui-icon')=>`<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const ICONS={
    toolbox:'<circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M8 8.3 10.9 15M16 8.3 13.1 15M8.2 7h7.6"/>',
    materials:'<path d="M7.2 8.5 11 5.2a1.6 1.6 0 0 1 2 0l3.8 3.3"/><path d="M5.8 11 12 7.1l6.2 3.9"/><path d="m6.7 16 5.3-3 5.3 3"/><circle cx="17.2" cy="6.2" r="2.2"/>',
    character:'<path d="M7 9.2a5 5 0 0 1 10 0"/><path d="M6.7 9.3c0 4.3 2.3 7.2 5.3 7.2s5.3-2.9 5.3-7.2"/><path d="M8.3 19c1.2-1.1 2.4-1.7 3.7-1.7s2.5.6 3.7 1.7"/><path d="M4.8 10.2h4.4M14.8 10.2h4.4M9.2 10.2h5.6"/><circle cx="7" cy="10.2" r="2.2"/><circle cx="17" cy="10.2" r="2.2"/>',
    sort:'<path d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3"/>',
    batch:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    close:'<path d="M6 6l12 12M18 6 6 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    image:'<rect x="3.5" y="5" width="17" height="14" rx="2.3"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.5-4.5 3.2 3 2.3-2.3 3 3"/>',
    video:'<rect x="3.5" y="5" width="17" height="14" rx="2.3"/><path d="m10 9 5 3-5 3z"/>',
    audio:'<path d="M9 18V7l9-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
    text:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'
  };

  const STYLE=`
  /* persistent dock */
  #bottomDock.bottom-dock{height:54px!important;padding:7px 10px!important;gap:6px!important;border:1px solid #3b3b3b!important;border-radius:14px!important;background:rgba(35,35,35,.97)!important;box-shadow:0 12px 30px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.025)!important;backdrop-filter:blur(18px)!important}
  #bottomDock .dock-btn{width:36px!important;height:36px!important;border-radius:9px!important;color:#d6d6d6!important;transition:background .14s ease,color .14s ease,transform .14s ease!important}
  #bottomDock .dock-btn:hover{background:#353535!important;color:#fff!important}
  #bottomDock .dock-btn:active{transform:translateY(1px)!important}
  #bottomDock .dock-btn.primary{width:34px!important;height:34px!important;border-radius:8px!important;background:#f3f3f1!important;color:#171717!important}
  #bottomDock .dock-btn.primary:hover{background:#fff!important}
  #bottomDock .dock-btn .ui-icon{width:18px!important;height:18px!important;stroke-width:1.75!important}
  #bottomDock .dock-btn.primary .ui-icon{width:19px!important;height:19px!important;stroke-width:2!important}
  #bottomDock .dock-separator{height:24px!important;margin:0 3px!important;background:#494949!important}
  #bottomDock .dock-btn[data-dock-placeholder="1"]{color:#cfcfcf!important}
  #bottomDock .dock-btn[data-dock-placeholder="1"]:hover{color:#fff!important}

  /* history modal */
  .dock-history-backdrop{position:fixed;inset:0;z-index:346;background:rgba(0,0,0,.66);backdrop-filter:blur(6px)}
  #drawer.dock-history-modal{display:flex!important;flex-direction:column!important;position:fixed!important;left:24px!important;right:24px!important;top:26px!important;bottom:18px!important;width:auto!important;max-height:none!important;padding:0!important;overflow:hidden!important;z-index:347!important;border:1px solid #3c3c3c!important;border-radius:15px!important;background:#242424!important;box-shadow:0 28px 80px rgba(0,0,0,.55)!important}
  #drawer.dock-history-modal>.drawer-title,#drawer.dock-history-modal>.drawer-toolbar{display:none!important}
  .history-v3-head{height:62px;min-height:62px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #343434;background:#252525}
  .history-v3-title{font-size:16px;font-weight:720;color:#f0f0f0;letter-spacing:.01em}
  .history-v3-head-spacer{flex:1}
  .history-v3-zoom{height:30px;display:flex;align-items:center;border:1px solid #393939;border-radius:8px;background:#1d1d1d;overflow:hidden}
  .history-v3-zoom button{width:32px;height:30px;border:0;background:transparent;color:#aaa;display:grid;place-items:center}
  .history-v3-zoom button:hover{background:#303030;color:#fff}
  .history-v3-zoom button .ui-icon{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round}
  .history-v3-zoom strong{min-width:54px;text-align:center;font-size:12px;color:#e7e7e7;font-weight:650}
  .history-v3-close{width:34px;height:34px;margin-left:10px;border:0;background:transparent;border-radius:8px;color:#9c9c9c;display:grid;place-items:center}
  .history-v3-close:hover{background:#343434;color:#fff}
  .history-v3-close .ui-icon{width:19px;height:19px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round}
  .history-v3-tools{height:58px;min-height:58px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid #303030;background:#242424}
  .history-v3-tabs{display:flex;align-items:center;gap:24px;height:100%}
  .history-v3-tab{position:relative;height:100%;padding:0;border:0;background:transparent;color:#818181;font-size:13px}
  .history-v3-tab:hover{color:#d9d9d9}
  .history-v3-tab.active{color:#f0f0f0;font-weight:650}
  .history-v3-tab.active:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:#f0f0f0;border-radius:2px}
  .history-v3-tools-spacer{flex:1}
  .history-v3-toolbtn{height:32px;padding:0 9px;border:0;background:transparent;color:#c7c7c7;border-radius:7px;display:inline-flex;align-items:center;gap:6px;font-size:12px}
  .history-v3-toolbtn:hover{background:#323232;color:#fff}
  .history-v3-toolbtn .ui-icon{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}
  #drawer.dock-history-modal #historyRows{--history-card-size:144px;flex:1;min-height:0;overflow:auto!important;padding:18px 20px 72px!important;display:block!important;background:#242424;scrollbar-width:thin;scrollbar-color:#777 transparent}
  .history-date-section{margin:0 0 22px}
  .history-date-title{margin:0 0 12px;font-size:14px;font-weight:650;color:#f0f0f0}
  .history-date-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--history-card-size),1fr));gap:12px;align-items:start}
  #drawer.dock-history-modal .history-row{position:relative;display:block!important;min-width:0!important;padding:0!important;border:0!important;border-radius:9px!important;background:#191919!important;overflow:hidden!important;aspect-ratio:1/1;cursor:default}
  #drawer.dock-history-modal .history-row:hover{background:#191919!important;box-shadow:0 0 0 1px #4a4a4a inset}
  #drawer.dock-history-modal .history-row[style*="display: none"]{display:none!important}
  #drawer.dock-history-modal .history-row>.thumb-mini{position:absolute;inset:0;width:100%!important;height:100%!important;border:0!important;border-radius:9px!important;background-color:#171717!important;background-position:center!important;background-size:cover!important}
  #drawer.dock-history-modal .history-row>.row-main{display:none!important}
  #drawer.dock-history-modal .history-row>[data-hist-use]{position:absolute!important;right:8px!important;bottom:8px!important;width:28px!important;height:28px!important;border-radius:8px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(17,17,17,.72)!important;color:#fff!important;opacity:0;display:grid!important;place-items:center!important;transition:opacity .14s ease,background .14s ease!important;backdrop-filter:blur(8px)}
  #drawer.dock-history-modal .history-row:hover>[data-hist-use]{opacity:1}
  #drawer.dock-history-modal .history-row>[data-hist-use]:hover{background:rgba(40,40,40,.9)!important}
  #drawer.dock-history-modal .history-row>[data-history-check]{position:absolute;left:9px;top:9px;z-index:4;width:18px;height:18px;margin:0;opacity:0;pointer-events:none;accent-color:#efefef}
  #drawer.dock-history-modal.history-batch-mode .history-row>[data-history-check]{opacity:1;pointer-events:auto}
  #drawer.dock-history-modal.history-batch-mode .history-row{cursor:pointer}
  #drawer.dock-history-modal .history-card-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#111;pointer-events:none}
  .history-card-kind{position:absolute;right:8px;top:8px;z-index:2;width:26px;height:26px;border-radius:7px;background:rgba(10,10,10,.66);display:grid;place-items:center;color:#e8e8e8;backdrop-filter:blur(7px);pointer-events:none}
  .history-card-kind .ui-icon{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .history-audio-card{position:absolute;inset:0;display:grid;place-items:center;background:linear-gradient(145deg,#1b1b1b,#2b2b2b);color:#9e9e9e}
  .history-audio-card .ui-icon{width:36px;height:36px;stroke:currentColor;fill:none;stroke-width:1.35;stroke-linecap:round;stroke-linejoin:round}
  .history-text-card{position:absolute;inset:0;padding:16px;display:flex;align-items:flex-start;background:#ededeb;color:#242424;font-size:11px;line-height:1.5;overflow:hidden;white-space:pre-wrap}
  #drawer.dock-history-modal .history-bulk{display:none!important;position:absolute;left:0;right:0;bottom:0;z-index:8;height:58px;margin:0!important;padding:0 18px!important;border-top:1px solid #343434!important;background:#292929!important;align-items:center!important;gap:8px!important}
  #drawer.dock-history-modal.history-batch-mode .history-bulk{display:flex!important}
  #drawer.dock-history-modal .history-bulk:before{content:"已选择 " attr(data-count) " 项";margin-right:2px;color:#aaa;font-size:12px}
  #drawer.dock-history-modal .history-bulk button{height:32px!important;padding:0 12px!important;border:1px solid #3b3b3b!important;background:#323232!important;color:#cfcfcf!important;border-radius:8px!important;font-size:12px!important}
  #drawer.dock-history-modal .history-bulk button:hover{border-color:#505050!important;background:#393939!important;color:#fff!important}
  #drawer.dock-history-modal .history-bulk button:disabled{opacity:.38!important;cursor:not-allowed!important}
  #drawer.dock-history-modal .history-bulk #histBulkDelete{color:#b9b9b9!important}
  #drawer.dock-history-modal .history-bulk .history-v3-cancel{margin-left:8px!important;background:transparent!important;border-color:transparent!important}
  #drawer.dock-history-modal .feature-empty{padding:70px 20px!important;color:#777!important;font-size:12px!important}

  /* shortcuts modal */
  .feature-dialog.shortcut-v3-dialog{width:min(1160px,94vw)!important;max-height:min(760px,88vh)!important;background:#252525!important;border-color:#3b3b3b!important;border-radius:14px!important}
  .feature-dialog.shortcut-v3-dialog .feature-head{height:52px!important;background:#252525!important;border-bottom:1px solid #343434!important}
  .feature-dialog.shortcut-v3-dialog .feature-head>div{display:flex;align-items:center}
  .feature-dialog.shortcut-v3-dialog .feature-title{display:none!important}
  .feature-dialog.shortcut-v3-dialog .feature-subtitle{display:none!important}
  .feature-dialog.shortcut-v3-dialog .feature-close{margin-left:auto!important;border:0!important;background:transparent!important;color:#aaa!important;font-size:24px!important}
  .feature-dialog.shortcut-v3-dialog .feature-close:hover{background:#333!important;color:#fff!important}
  .feature-dialog.shortcut-v3-dialog .feature-body{padding:24px 26px 28px!important;overflow:auto!important}
  .feature-dialog.shortcut-v3-dialog .shortcut-help-head{display:none!important}
  .feature-dialog.shortcut-v3-dialog .shortcut-help-list{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0!important}
  .shortcut-v3-column{min-width:0;padding:0 24px;border-right:1px solid #353535}
  .shortcut-v3-column:first-child{padding-left:0}
  .shortcut-v3-column:last-child{border-right:0;padding-right:0}
  .shortcut-v3-column-title{margin:0 0 15px;color:#2bd9ff;font-size:13px;font-weight:700}
  .shortcut-v3-column .shortcut-v3-row{min-height:40px;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:16px!important;border:0!important;background:transparent!important;padding:0!important}
  .shortcut-v3-column .shortcut-v3-row>span{min-width:0;color:#8b8b8b!important;font-size:12px!important;line-height:1.35}
  .shortcut-v3-column .shortcut-v3-row>kbd{margin-left:auto!important;display:inline-flex!important;align-items:center!important;gap:5px!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;color:#cfcfcf!important;white-space:nowrap}
  .shortcut-keycap{min-width:27px;height:28px;padding:0 7px;border:1px solid #454545;border-radius:6px;background:#303030;display:inline-flex;align-items:center;justify-content:center;color:#dcdcdc;font-size:11px;font-family:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.035)}
  .shortcut-keyplus{color:#686868;font-size:11px}
  @media(max-width:900px){
    #drawer.dock-history-modal{left:10px!important;right:10px!important;top:12px!important;bottom:10px!important}
    .history-v3-tabs{gap:14px}.history-v3-tab{font-size:11px}.history-v3-toolbtn{font-size:0;padding:0 8px}.history-v3-toolbtn .ui-icon{margin:0}
    .feature-dialog.shortcut-v3-dialog .shortcut-help-list{grid-template-columns:repeat(2,minmax(0,1fr))!important;row-gap:24px!important}.shortcut-v3-column:nth-child(2){border-right:0}.shortcut-v3-column:nth-child(3){padding-left:0}
  }
  `;

  function installStyles(){
    if($('#bottomDockV3Styles'))return;
    const style=document.createElement('style');style.id='bottomDockV3Styles';style.textContent=STYLE;document.head.appendChild(style);
  }

  function toast(message){
    const el=$('#toast');if(!el)return;
    el.textContent=message;el.classList.remove('hidden');
    clearTimeout(window.__dockV3ToastTimer);
    window.__dockV3ToastTimer=setTimeout(()=>el.classList.add('hidden'),1600);
  }

  function setDockIcon(action,paths,title,placeholder=false){
    const btn=dock.querySelector(`[data-dock-action="${action}"]`);if(!btn)return;
    btn.innerHTML=svg(paths);
    btn.title=title;btn.setAttribute('aria-label',title);
    if(placeholder)btn.dataset.dockPlaceholder='1';else delete btn.dataset.dockPlaceholder;
    btn.dataset.dockV3='1';
  }

  function decorateDock(){
    if(dock.dataset.dockV3Ready)return;
    dock.dataset.dockV3Ready='1';
    setDockIcon('layout',ICONS.toolbox,'工具箱（即将上线）',true);
    setDockIcon('workflow',ICONS.materials,'素材库（即将上线）',true);
    setDockIcon('asset',ICONS.character,'角色库（即将上线）',true);
    const history=dock.querySelector('[data-dock-action="history"]');if(history){history.title='历史记录';history.setAttribute('aria-label','历史记录')}
    const shortcuts=dock.querySelector('[data-dock-action="shortcuts"]');if(shortcuts){shortcuts.title='快捷键';shortcuts.setAttribute('aria-label','快捷键')}
    const help=dock.querySelector('[data-dock-action="help"]');if(help){help.title='使用教程（即将上线）';help.setAttribute('aria-label','使用教程（即将上线）');help.dataset.dockPlaceholder='1'}
  }

  let historyBackdrop=null;
  let historySort='desc';
  let historyZoom=100;
  let historyBatch=false;
  let bypassHistoryClick=false;

  function readState(){try{return JSON.parse(localStorage.getItem('libtv-clone-state')||'{}')||{}}catch{return {}}}
  function historyType(item={}){return item.type||({视频:'video',音频:'audio',文本:'text',图片:'image'})[item.kind]||'image'}
  function historyDate(item={}){
    const d=new Date(item.createdAt||item.updatedAt||0);if(Number.isNaN(d.getTime())||d.getTime()<=0)return '未记录日期';
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;
  }
  function historyTime(item={}){const d=new Date(item.createdAt||item.updatedAt||0);return Number.isNaN(d.getTime())?0:d.getTime()}

  function closeHistoryModal(){
    historyBackdrop?.remove();historyBackdrop=null;
    drawer.classList.remove('dock-history-modal','history-batch-mode');
    drawer.classList.add('hidden');
    historyBatch=false;
  }

  function ensureHistoryBackdrop(){
    historyBackdrop?.remove();
    historyBackdrop=document.createElement('div');historyBackdrop.className='dock-history-backdrop';
    historyBackdrop.addEventListener('pointerdown',closeHistoryModal);
    document.body.appendChild(historyBackdrop);
  }

  function addHistoryCardMedia(row,item){
    const thumb=row.querySelector('.thumb-mini');if(!thumb||thumb.dataset.historyV3Media)return;thumb.dataset.historyV3Media='1';
    const type=historyType(item),url=item?.outputUrl||'';
    if(type==='video'&&url){thumb.style.backgroundImage='none';thumb.innerHTML=`<video class="history-card-video" src="${String(url).replace(/"/g,'&quot;')}" muted playsinline preload="metadata"></video><span class="history-card-kind">${svg(ICONS.video)}</span>`}
    else if(type==='audio'){thumb.style.backgroundImage='none';thumb.innerHTML=`<div class="history-audio-card">${svg(ICONS.audio)}</div><span class="history-card-kind">${svg(ICONS.audio)}</span>`}
    else if(type==='text'){thumb.style.backgroundImage='none';thumb.innerHTML=`<div class="history-text-card">${String(item?.text||item?.prompt||item?.title||'文本').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</div><span class="history-card-kind">${svg(ICONS.text)}</span>`}
    else if(type==='image'){thumb.insertAdjacentHTML('beforeend',`<span class="history-card-kind">${svg(ICONS.image)}</span>`)}
    row.title=item?.title||'历史素材';
  }

  function rebuildHistoryGrid(){
    const root=$('#historyRows',drawer);if(!root)return;
    const state=readState(),items=Array.isArray(state.history)?state.history:[],map=new Map(items.map(x=>[String(x.id),x]));
    const rows=$$('[data-history-row]',root);
    rows.sort((a,b)=>{
      const av=historyTime(map.get(String(a.dataset.historyRow))||{}),bv=historyTime(map.get(String(b.dataset.historyRow))||{});
      return historySort==='desc'?bv-av:av-bv;
    });
    const groups=new Map();
    rows.forEach(row=>{const item=map.get(String(row.dataset.historyRow))||{};addHistoryCardMedia(row,item);const key=historyDate(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)});
    root.innerHTML='';
    if(!rows.length){root.innerHTML='<div class="feature-empty">暂无历史资产</div>';return}
    for(const [date,list] of groups){const section=document.createElement('section');section.className='history-date-section';section.innerHTML=`<h3 class="history-date-title">${date}</h3><div class="history-date-grid"></div>`;const grid=section.querySelector('.history-date-grid');list.forEach(row=>grid.appendChild(row));root.appendChild(section)}
    root.style.setProperty('--history-card-size',`${Math.round(144*historyZoom/100)}px`);
  }

  function setHistoryTab(type){
    $$('.history-v3-tab',drawer).forEach(b=>b.classList.toggle('active',b.dataset.historyTab===type));
    const select=$('#historyType',drawer);if(select){select.value=type;select.dispatchEvent(new Event('change',{bubbles:true}))}
  }

  function updateBatchCount(){
    const checked=$$('[data-history-check]:checked',drawer).length,bar=$('.history-bulk',drawer);if(bar)bar.dataset.count=String(checked);
    ['#histBulkUse','#histBulkDownload','#histBulkDelete'].forEach(sel=>{const b=$(sel,drawer);if(b)b.disabled=checked===0});
  }

  function setHistoryBatch(enabled){
    historyBatch=Boolean(enabled);drawer.classList.toggle('history-batch-mode',historyBatch);
    if(!historyBatch)$$('[data-history-check]',drawer).forEach(c=>{c.checked=false});
    updateBatchCount();
  }

  function decorateHistoryDrawer(){
    if(!drawer.classList.contains('dock-history-modal'))drawer.classList.add('dock-history-modal');
    ensureHistoryBackdrop();
    const state=readState(),items=Array.isArray(state.history)?state.history:[];
    const counts={image:0,video:0,audio:0};items.forEach(x=>{const t=historyType(x);if(t in counts)counts[t]++});
    const oldHead=$('.history-v3-head',drawer);oldHead?.remove();$('.history-v3-tools',drawer)?.remove();
    const head=document.createElement('div');head.className='history-v3-head';
    head.innerHTML=`<div class="history-v3-title">历史资产</div><div class="history-v3-head-spacer"></div><div class="history-v3-zoom"><button type="button" data-history-zoom="minus" aria-label="缩小">${svg(ICONS.minus)}</button><strong>${historyZoom}%</strong><button type="button" data-history-zoom="plus" aria-label="放大">${svg(ICONS.plus)}</button></div><button type="button" class="history-v3-close" aria-label="关闭">${svg(ICONS.close)}</button>`;
    drawer.prepend(head);
    const tools=document.createElement('div');tools.className='history-v3-tools';
    tools.innerHTML=`<div class="history-v3-tabs"><button class="history-v3-tab active" data-history-tab="image">图片历史(${counts.image})</button><button class="history-v3-tab" data-history-tab="video">视频历史(${counts.video})</button><button class="history-v3-tab" data-history-tab="audio">音频历史(${counts.audio})</button></div><div class="history-v3-tools-spacer"></div><button class="history-v3-toolbtn" data-history-sort>${svg(ICONS.sort)}<span>${historySort==='desc'?'时间降序':'时间升序'}</span></button><button class="history-v3-toolbtn" data-history-batch>${svg(ICONS.batch)}<span>批量操作</span></button>`;
    head.after(tools);
    head.querySelector('.history-v3-close').onclick=closeHistoryModal;
    head.querySelector('[data-history-zoom="minus"]').onclick=()=>{historyZoom=Math.max(75,historyZoom-25);decorateHistoryDrawer()};
    head.querySelector('[data-history-zoom="plus"]').onclick=()=>{historyZoom=Math.min(175,historyZoom+25);decorateHistoryDrawer()};
    $$('.history-v3-tab',tools).forEach(b=>b.onclick=()=>setHistoryTab(b.dataset.historyTab));
    $('[data-history-sort]',tools).onclick=()=>{historySort=historySort==='desc'?'asc':'desc';decorateHistoryDrawer()};
    $('[data-history-batch]',tools).onclick=()=>setHistoryBatch(!historyBatch);

    const oldToolbar=$('.drawer-toolbar',drawer);if(oldToolbar)oldToolbar.style.display='none';
    const bar=$('.history-bulk',drawer);if(bar){
      const selectAll=$('#histSelectAll',bar);if(selectAll)selectAll.textContent='全选';
      const use=$('#histBulkUse',bar);if(use)use.textContent='使用';
      const dl=$('#histBulkDownload',bar);if(dl)dl.textContent='下载';
      const del=$('#histBulkDelete',bar);if(del)del.textContent='删除';
      if(!$('.history-v3-cancel',bar)){const cancel=document.createElement('button');cancel.className='history-v3-cancel';cancel.type='button';cancel.textContent='取消选择';cancel.onclick=()=>setHistoryBatch(false);bar.appendChild(cancel)}
      $$('[data-history-check]',drawer).forEach(c=>c.addEventListener('change',updateBatchCount));
      selectAll?.addEventListener('click',()=>setTimeout(updateBatchCount,0));
      del?.addEventListener('click',()=>setTimeout(()=>{if(drawer.classList.contains('dock-history-modal'))decorateHistoryDrawer()},0));
    }
    rebuildHistoryGrid();
    setHistoryTab('image');
    setHistoryBatch(historyBatch);
  }

  function openHistoryModal(){
    const btn=dock.querySelector('[data-dock-action="history"]');if(!btn)return;
    setTimeout(()=>{
      bypassHistoryClick=true;
      try{btn.click()}finally{bypassHistoryClick=false}
      if(drawer.classList.contains('hidden'))return;
      drawer.classList.add('dock-history-modal');
      decorateHistoryDrawer();
    },0);
  }

  function keycapHtml(text){
    return String(text||'').split('+').map((part,i,arr)=>`<span class="shortcut-keycap">${part.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>${i<arr.length-1?'<span class="shortcut-keyplus">+</span>':''}`).join('');
  }

  function shortcutCategory(label=''){
    if(/缩放|放大|缩小|适应画布|100%/.test(label))return '缩放';
    if(/移动|抓手|画布|整理|平移/.test(label))return '移动画布';
    if(/成组|解组|连接|复制|生成|新建|节点/.test(label))return '创作';
    return '其他';
  }

  function decorateShortcutModal(){
    const dialog=featureModal?.querySelector('.feature-dialog');if(!dialog)return false;
    const title=$('.feature-title',dialog);if(!title||title.textContent.trim()!=='快捷键')return false;
    dialog.classList.add('shortcut-v3-dialog');
    const list=$('.shortcut-help-list',dialog);if(!list||list.dataset.shortcutV3)return true;list.dataset.shortcutV3='1';
    const rows=[...list.children],groups={创作:[],缩放:[],移动画布:[],其他:[]};
    rows.forEach(row=>{const label=row.querySelector('span')?.textContent?.trim()||'';const kbd=row.querySelector('kbd');if(kbd)kbd.innerHTML=keycapHtml(kbd.textContent);row.classList.add('shortcut-v3-row');groups[shortcutCategory(label)].push(row)});
    list.innerHTML='';
    for(const name of ['创作','缩放','移动画布','其他']){const col=document.createElement('section');col.className='shortcut-v3-column';col.innerHTML=`<h3 class="shortcut-v3-column-title">${name}</h3>`;groups[name].forEach(row=>col.appendChild(row));list.appendChild(col)}
    return true;
  }

  function openShortcutModal(){
    setTimeout(()=>{
      window.dispatchEvent(new KeyboardEvent('keydown',{key:'?',code:'Slash',shiftKey:true,bubbles:true,cancelable:true}));
      let tries=0;const timer=setInterval(()=>{tries++;if(decorateShortcutModal()||tries>12)clearInterval(timer)},16);
    },0);
  }

  dock.addEventListener('click',e=>{
    const btn=e.target.closest('[data-dock-action]');if(!btn)return;
    const action=btn.dataset.dockAction;
    if(action==='history'&&bypassHistoryClick)return;
    if(action==='layout'||action==='workflow'||action==='asset'||action==='help'||action==='history'||action==='shortcuts'){
      e.preventDefault();e.stopImmediatePropagation();
    }
    if(action==='layout')toast('工具箱功能稍后开发');
    if(action==='workflow')toast('素材库功能稍后开发');
    if(action==='asset')toast('角色库功能稍后开发');
    if(action==='help')toast('使用教程将在全部功能完成后开发');
    if(action==='history')openHistoryModal();
    if(action==='shortcuts')openShortcutModal();
  },true);

  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('dock-history-modal')){e.preventDefault();e.stopPropagation();closeHistoryModal()}},true);

  installStyles();decorateDock();
})();
