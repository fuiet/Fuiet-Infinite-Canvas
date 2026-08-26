/* Canvas Studio · Bottom Dock v4
 * High-clarity inline SVG icons based on the supplied reference toolbar.
 * Keeps all existing dock behavior unchanged.
 */
(()=>{
  'use strict';

  document.querySelector('.bottom-center-hint')?.remove();

  const dock=document.querySelector('#bottomDock');
  if(!dock)return;

  const svg=(body,extra='')=>`<svg class="dock-v4-icon ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
  const ICONS={
    add:svg('<path d="M12 5v14M5 12h14"/>'),
    cursor:svg('<path d="M5 4 18 10.5l-5.5 1.6-2.2 6.4L5 4Z"/>','dock-mode-cursor'),
    hand:svg('<path d="M8 11V8a1.5 1.5 0 0 1 3 0v3M11 10V7a1.5 1.5 0 0 1 3 0v3M14 10V8a1.5 1.5 0 0 1 3 0v3M17 11v-1a1.5 1.5 0 0 1 3 0v4c0 3.5-2.5 6-6 6h-2c-2.5 0-4.5-1.3-5.5-3.5L5 13.5a1.5 1.5 0 0 1 2.6-1.4L9 14v-3"/>','dock-mode-hand'),
    toolbox:svg('<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M8 6h8M7.4 7.7l3.4 8M16.6 7.7l-3.4 8"/>'),
    materials:svg('<circle cx="9" cy="9" r="3"/><path d="m14 5 5 5-5 5-5-5 5-5Z"/><path d="M7 16h6l3 3H10l-3-3Z"/>'),
    character:svg('<circle cx="7" cy="11" r="3"/><circle cx="17" cy="11" r="3"/><path d="M10 11h4M4 11H2M22 11h-2M8 17c1.1-1.3 2.4-2 4-2s2.9.7 4 2"/>'),
    history:svg('<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>'),
    keyboard:svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h.01M11 14h.01M15 14h.01M19 14h.01M8 16h8"/>'),
    help:svg('<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5a2.7 2.7 0 1 1 4.7 1.8c-1 .9-2.2 1.3-2.2 2.7M12 17h.01"/>')
  };

  const setIcon=(action,html)=>{
    const btn=dock.querySelector(`[data-dock-action="${action}"]`);
    if(!btn)return;
    btn.innerHTML=html;
  };

  setIcon('add',ICONS.add);
  setIcon('mode',ICONS.cursor+ICONS.hand);
  setIcon('layout',ICONS.toolbox);
  setIcon('workflow',ICONS.materials);
  setIcon('asset',ICONS.character);
  setIcon('history',ICONS.history);
  setIcon('shortcuts',ICONS.keyboard);
  setIcon('help',ICONS.help);

  document.querySelector('#bottomDockV4Styles')?.remove();
  const style=document.createElement('style');
  style.id='bottomDockV4Styles';
  style.textContent=`
    #bottomDock.bottom-dock{
      transform:none!important;
      will-change:auto!important;
    }
    #bottomDock .dock-btn{
      position:relative!important;
      color:#eeeeee!important;
      -webkit-font-smoothing:auto!important;
    }
    #bottomDock .dock-btn:hover,#bottomDock .dock-btn.open,#bottomDock .dock-btn.active,#bottomDock .dock-btn.mode-grab{color:#ffffff!important}
    #bottomDock .dock-btn.primary{color:#111111!important}
    #bottomDock .dock-v4-icon{
      display:block!important;
      width:24px!important;
      height:24px!important;
      flex:0 0 24px!important;
      overflow:visible!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:2!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
      shape-rendering:auto!important;
      vector-effect:non-scaling-stroke!important;
      opacity:1!important;
      transform:none!important;
      filter:none!important;
    }
    #bottomDock .dock-btn.primary .dock-v4-icon{width:23px!important;height:23px!important;stroke-width:2.2!important}
    #bottomDock .dock-mode-hand{display:none!important}
    #bottomDock [data-dock-action="mode"].mode-grab .dock-mode-cursor{display:none!important}
    #bottomDock [data-dock-action="mode"].mode-grab .dock-mode-hand{display:block!important}

    /* compact move / hand selector — matches the supplied reference */
    .context-menu.dock-mode-menu{
      width:168px!important;
      min-width:168px!important;
      padding:5px!important;
      border:1px solid #3b3b3b!important;
      border-radius:12px!important;
      background:#252525!important;
      box-shadow:0 10px 26px rgba(0,0,0,.34)!important;
      overflow:visible!important;
    }
    .context-menu.dock-mode-menu::after{
      content:""!important;
      position:absolute!important;
      left:50%!important;
      bottom:-6px!important;
      width:11px!important;
      height:11px!important;
      background:#252525!important;
      border-right:1px solid #3b3b3b!important;
      border-bottom:1px solid #3b3b3b!important;
      border-radius:1px!important;
      transform:translateX(-50%) rotate(45deg)!important;
    }
    .dock-mode-menu .libtv-add-title{display:none!important}
    .dock-mode-menu .dock-mode-row{
      width:100%!important;
      min-height:35px!important;
      height:35px!important;
      margin:0!important;
      padding:0 9px!important;
      gap:8px!important;
      border:0!important;
      border-radius:7px!important;
      background:transparent!important;
      color:#ededed!important;
      box-shadow:none!important;
      font-size:13px!important;
    }
    .dock-mode-menu .dock-mode-row+.dock-mode-row{margin-top:2px!important}
    .dock-mode-menu .dock-mode-row:hover{background:#3a3a3a!important;color:#fff!important}
    .dock-mode-menu .dock-mode-row.active{background:#555555!important;color:#fff!important}
    .dock-mode-menu .dock-mode-row i{
      width:19px!important;
      height:19px!important;
      flex:0 0 19px!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:inherit!important;
      box-shadow:none!important;
    }
    .dock-mode-menu .dock-mode-row i svg{
      width:18px!important;
      height:18px!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:1.8!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
    }
    .dock-mode-menu .dock-mode-row span{
      display:flex!important;
      flex:1!important;
      min-width:0!important;
      flex-direction:row!important;
      align-items:center!important;
      gap:0!important;
    }
    .dock-mode-menu .dock-mode-row span b{
      font-size:13px!important;
      line-height:1!important;
      font-weight:500!important;
      color:inherit!important;
      white-space:nowrap!important;
    }
    .dock-mode-menu .dock-mode-row span small{display:none!important}
    .dock-mode-menu .dock-mode-row em{
      min-width:0!important;
      width:auto!important;
      height:auto!important;
      padding:0!important;
      border:0!important;
      border-radius:0!important;
      background:transparent!important;
      color:#999!important;
      font-size:12px!important;
      font-weight:500!important;
      line-height:1!important;
    }
    .dock-mode-menu .dock-mode-row.active em{background:transparent!important;color:#bdbdbd!important}
  `;
  document.head.appendChild(style);

  function snapDockToDevicePixels(){
    const dpr=window.devicePixelRatio||1;
    const width=dock.offsetWidth;
    const rawLeft=(window.innerWidth-width)/2;
    const snappedLeft=Math.round(rawLeft*dpr)/dpr;
    const rawBottom=18;
    const snappedBottom=Math.round(rawBottom*dpr)/dpr;
    dock.style.left=`${snappedLeft}px`;
    dock.style.bottom=`${snappedBottom}px`;
  }

  requestAnimationFrame(snapDockToDevicePixels);
  window.addEventListener('resize',()=>requestAnimationFrame(snapDockToDevicePixels),{passive:true});
})();
