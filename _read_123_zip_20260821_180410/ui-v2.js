/* Canvas Studio · UI Enhancements v2
 * Presentation only: icon rendering, detail-surface decoration, generated-media lightbox.
 */
(()=>{
  'use strict';
  const ICONS={
    plus:'<path d="M12 5v14M5 12h14"/>',
    cursor:'<path d="M5 3l11 8-5 1 3 6-2 1-3-6-4 4z"/>',
    layout:'<path d="M4 6h6M4 12h10M4 18h16"/><path d="M15 5l5 3-5 3"/>',
    workflow:'<circle cx="6" cy="7" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="12" cy="17" r="2"/><path d="M8 8.5l3 6M16 8.5l-3 6M8 7h8"/>',
    assets:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M6.5 16l4-4 3 3 2-2 2 3"/>',
    history:'<circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2M4.5 5.5L3 9h4"/>',
    keyboard:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 9h1M10 9h1M14 9h1M18 9h1M6 13h1M10 13h1M14 13h1M18 13h1M8 16h8"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 014.8 1c0 2-2.5 2.2-2.5 4M12 18h.01"/>',
    undo:'<path d="M9 7L5 11l4 4"/><path d="M5 11h8a5 5 0 015 5"/>',
    redo:'<path d="M15 7l4 4-4 4"/><path d="M19 11h-8a5 5 0 00-5 5"/>',
    share:'<path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
    production:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5M8 17h7"/>',
    context:'<path d="M10 13a4 4 0 005.7 0l2.3-2.3a4 4 0 00-5.7-5.7L11 6.3"/><path d="M14 11a4 4 0 00-5.7 0L6 13.3A4 4 0 0011.7 19l1.3-1.3"/>',
    storyboard:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 5v14M15 5v14M3 10h18M3 15h18"/>',
    tasks:'<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="7" cy="7" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="17" cy="17" r="1"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a7 7 0 00-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 00-1.7-.7L10.5 2h-3l-.7 2a7 7 0 00-1.7.7l-1.9-.9-2.1 2.1.9 1.9a7 7 0 00-.7 1.7L0 10.5v3l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1.1.5 1.7.7l.7 2h3l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.5-1.1.7-1.7z" transform="translate(2.5 0) scale(.8)"/>',
    text:'<rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    image:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l5-5 3 3 2-2 4 4"/>',
    video:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9l5 3-5 3z"/>',
    audio:'<path d="M9 18V7l9-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="15.5" cy="16" r="2.5"/>',
    script:'<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>',
    expand:'<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><path d="M3 8l6-5M21 8l-6-5M3 16l6 5M21 16l-6 5"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>'
  };
  const icon=(name)=>`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]||ICONS.help}</svg>`;

  function installStaticIcons(){
    const set=(sel,name)=>{const el=document.querySelector(sel);if(el&&!el.dataset.uiIconReady){el.innerHTML=icon(name);el.dataset.uiIconReady='1'}};
    set('#undoBtn','undo');set('#redoBtn','redo');
    set('#shareBtn','share');
    set('#productionBtn','production');set('#contextBtn','context');set('#storyboardBtn','storyboard');set('#taskBtn','tasks');set('#settingsBtn','settings');
    const dockMap={add:'plus',select:'cursor',layout:'layout',workflow:'workflow',asset:'assets',history:'history',shortcuts:'keyboard',help:'help'};
    document.querySelectorAll('[data-dock-action]').forEach(b=>{const n=dockMap[b.dataset.dockAction];if(n){const s=b.querySelector('span')||b;s.innerHTML=icon(n);b.dataset.uiIconReady='1'}});
  }

  function selectedNodeKind(){
    const n=document.querySelector('.node.selected');
    if(!n)return '节点';
    if(n.classList.contains('node-image'))return '图片';
    if(n.classList.contains('node-video'))return '视频';
    if(n.classList.contains('node-text'))return '文本';
    if(n.classList.contains('node-audio'))return '音频';
    if(n.classList.contains('node-script'))return '脚本';
    return '节点';
  }
  function kindIcon(kind){return ({'图片':'image','视频':'video','文本':'text','音频':'audio','脚本':'script'})[kind]||'production'}

  function enhanceGenerator(){
    const panel=document.querySelector('#generatorPanel');
    if(!panel||panel.classList.contains('hidden'))return;
    const main=panel.querySelector('.lib-gen-main');if(!main)return;
    const kind=selectedNodeKind();
    main.classList.add('detail-kind-'+kind);
    if(!main.querySelector('.detail-ui-head')){
      const h=document.createElement('div');h.className='detail-ui-head';
      h.innerHTML=`<b>节点详情</b><span class="detail-kind">${icon(kindIcon(kind))}${kind}</span><small>参数与生成设置</small>`;
      main.prepend(h);
    }else{
      const badge=main.querySelector('.detail-kind');if(badge)badge.innerHTML=`${icon(kindIcon(kind))}${kind}`;
    }
    const controls=main.querySelector('.lib-gen-controls');
    if(controls&&!controls.previousElementSibling?.classList?.contains('detail-section-label')){
      const label=document.createElement('div');label.className='detail-section-label';label.textContent=kind==='脚本'?'模型与脚本设置':'模型与参数';controls.before(label);
    }
    requestAnimationFrame(()=>{
      const r=panel.getBoundingClientRect();
      if(r.right>window.innerWidth-12)panel.style.left=Math.max(70,window.innerWidth-r.width-16)+'px';
      if(r.left<70)panel.style.left='70px';
    });
  }

  function ensureLightbox(){
    let box=document.querySelector('#uiMediaLightbox');
    if(box)return box;
    box=document.createElement('div');box.id='uiMediaLightbox';box.className='ui-media-lightbox';
    box.innerHTML=`<div class="ui-media-lightbox-card"><button class="ui-media-lightbox-close" type="button" aria-label="关闭预览">${icon('close')}</button><div class="ui-media-lightbox-content"></div><div class="ui-media-lightbox-meta">点击背景或按 Esc 关闭</div></div>`;
    document.body.appendChild(box);
    const close=()=>{box.classList.remove('open');const v=box.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load()}setTimeout(()=>{const c=box.querySelector('.ui-media-lightbox-content');if(c)c.innerHTML=''},170)};
    box.querySelector('.ui-media-lightbox-close').onclick=close;
    box.addEventListener('click',e=>{if(e.target===box)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&box.classList.contains('open'))close()});
    box._close=close;return box;
  }
  function openMedia(media){
    const src=media.currentSrc||media.src||media.getAttribute('src');if(!src)return;
    const box=ensureLightbox(),c=box.querySelector('.ui-media-lightbox-content');
    const isVideo=media.tagName==='VIDEO';
    c.innerHTML=isVideo?`<video src="${src.replace(/"/g,'&quot;')}" controls autoplay playsinline></video>`:`<img src="${src.replace(/"/g,'&quot;')}" alt="放大预览">`;
    box.classList.add('open');
  }

  function mediaHost(media){
    return media.closest('.media-clip')||media.closest('.node-body')||media.closest('.version-preview')||media.closest('.quality-preview')||media.closest('.candidate-version>div')||media.closest('[data-inline-version]')||media.closest('figure')||media.parentElement;
  }
  function enhanceMedia(){
    const scope='.node img[src],.node video[src],.feature-modal img[src],.feature-modal video[src],.generator-panel img[src],.generator-panel video[src],.storyboard-view img[src],.storyboard-view video[src]';
    document.querySelectorAll(scope).forEach(media=>{
      if(media.dataset.mediaPreviewReady)return;media.dataset.mediaPreviewReady='1';
      const host=mediaHost(media);if(!host)return;host.classList.add('ui-media-preview-host');
      const compact=host.matches('button,[data-inline-version]')||Boolean(host.closest('.quality-version-strip,.node-candidate-rail,.v36-ver,.v35-version'));
      let trigger=[...host.children].find(x=>x.classList?.contains('ui-media-preview-trigger'));
      if(!compact&&!trigger){trigger=document.createElement('span');trigger.className='ui-media-preview-trigger';trigger.setAttribute('role','button');trigger.setAttribute('tabindex','0');trigger.setAttribute('title','点击放大预览');trigger.innerHTML=icon('expand');host.appendChild(trigger)}
      if(trigger){
        trigger.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMedia(media)});
        trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();openMedia(media)}});
      }
      if(media.tagName==='IMG'||compact)media.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openMedia(media)});
    });
  }

  let raf=0;
  function refresh(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{installStaticIcons();enhanceGenerator();enhanceMedia()})}
  const mo=new MutationObserver(refresh);mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src']});
  window.addEventListener('resize',refresh,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
})();
