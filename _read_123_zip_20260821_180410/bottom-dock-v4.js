/* Canvas Studio · Bottom Dock v4
 * Crisp inline-vector icons based on the supplied reference toolbar.
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
    cursor:svg('<path d="M5.5 4.5 17.8 10.6l-5.2 1.5-2.1 6.1-5-13.7Z"/>','dock-mode-cursor'),
    hand:svg('<path d="M8.4 11V7.8a1.25 1.25 0 0 1 2.5 0V11m0-1V6.9a1.25 1.25 0 0 1 2.5 0V10m0 .3V7.6a1.25 1.25 0 0 1 2.5 0v3.2m0 .7V9.4a1.25 1.25 0 0 1 2.5 0v4.4c0 3.2-2.6 5.8-5.8 5.8h-1.5a5.7 5.7 0 0 1-5.2-3.4l-1.3-3a1.25 1.25 0 0 1 2.2-1.2l1.6 2.2V11Z"/>','dock-mode-hand'),
    toolbox:svg('<circle cx="6" cy="7" r="1.8"/><circle cx="18" cy="7" r="1.8"/><circle cx="12" cy="17" r="1.8"/><path d="M7.8 7h8.4M7.2 8.6l3.7 6.4M16.8 8.6 13.1 15"/>'),
    materials:svg('<path d="M8 5.8 13 9l-3.1 4.7-5-3.1L8 5.8Z"/><path d="m15.7 7.4 3.2 3.4-4.3 4-3.1-3.4 4.2-4Z"/><path d="m9.3 14.3 4.9 3-2.3 3.6-4.8-3 2.2-3.6Z"/><circle cx="5.7" cy="5" r="1.45"/>'),
    character:svg('<path d="M6.6 9.2a5.4 5.4 0 0 1 10.8 0M8.1 16.8c1-1.1 2.4-1.7 3.9-1.7s2.9.6 3.9 1.7M9.5 10.2h5"/><circle cx="7.2" cy="10.2" r="2.25"/><circle cx="16.8" cy="10.2" r="2.25"/>'),
    history:svg('<circle cx="12" cy="12" r="8"/><path d="M12 7.5v4.9l3.2 1.9"/>'),
    keyboard:svg('<rect x="3.5" y="6.2" width="17" height="11.6" rx="2"/><path d="M7 9.7h.01M10.4 9.7h.01M13.8 9.7h.01M17.2 9.7h.01M7 13h.01M10.4 13h.01M13.8 13h.01M17.2 13h.01M8.3 15.5h7.4"/>'),
    help:svg('<circle cx="12" cy="12" r="8"/><path d="M9.6 9.2a2.7 2.7 0 1 1 4.6 2c-.9.8-1.9 1.2-1.9 2.7M12 17h.01"/>')
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
    #bottomDock .dock-btn{position:relative!important;color:#e1e1e1!important}
    #bottomDock .dock-btn:hover,#bottomDock .dock-btn.open,#bottomDock .dock-btn.active,#bottomDock .dock-btn.mode-grab{color:#f7f7f7!important}
    #bottomDock .dock-btn.primary{color:#171717!important}
    #bottomDock .dock-v4-icon{
      display:block!important;
      width:20px!important;
      height:20px!important;
      flex:0 0 20px!important;
      overflow:visible!important;
      fill:none!important;
      stroke:currentColor!important;
      stroke-width:1.85!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
      shape-rendering:geometricPrecision;
      vector-effect:non-scaling-stroke;
      opacity:1!important;
      transform:none!important;
      filter:none!important;
    }
    #bottomDock .dock-btn.primary .dock-v4-icon{width:21px!important;height:21px!important;stroke-width:2!important}
    #bottomDock .dock-mode-hand{display:none!important}
    #bottomDock [data-dock-action="mode"].mode-grab .dock-mode-cursor{display:none!important}
    #bottomDock [data-dock-action="mode"].mode-grab .dock-mode-hand{display:block!important}
  `;
  document.head.appendChild(style);
})();
