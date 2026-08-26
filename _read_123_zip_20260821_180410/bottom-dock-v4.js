/* Canvas Studio · Bottom Dock v4
 * Icon-only polish requested from the reference toolbar.
 * Keeps all existing dock behavior unchanged.
 */
(()=>{
  'use strict';

  document.querySelector('.bottom-center-hint')?.remove();

  const ICONS={
    plus:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEyIDV2MTRNNSAxMmgxNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
    cursor:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTUuNSA0LjUgMTcuOCAxMC42bC01LjIgMS41LTIuMSA2LjEtNS0xMy43WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjY1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=',
    hand:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTguNCAxMVY3LjhhMS4yNSAxLjI1IDAgMCAxIDIuNSAwVjExbTAtMVY2LjlhMS4yNSAxLjI1IDAgMCAxIDIuNSAwVjEwbTAgLjNWNy42YTEuMjUgMS4yNSAwIDAgMSAyLjUgMHYzLjJtMCAuN1Y5LjRhMS4yNSAxLjI1IDAgMCAxIDIuNSAwdjQuNGMwIDMuMi0yLjYgNS44LTUuOCA1LjhoLTEuNWE1LjcgNS43IDAgMCAxLTUuMi0zLjRsLTEuMy0zYTEuMjUgMS4yNSAwIDAgMSAyLjItMS4ybDEuNiAyLjJWMTFaIiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEuNTUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==',
    toolbox:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iNiIgY3k9IjciIHI9IjEuOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PGNpcmNsZSBjeD0iMTgiIGN5PSI3IiByPSIxLjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMS41NSIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTciIHI9IjEuOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PHBhdGggZD0iTTcuNyA3aDguNk03LjEgOC41bDMuNyA2LjdtNi4xLTYuNy0zLjcgNi43IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEuNTUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==',
    materials:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0ibTguMiA2LjEgNC4xIDIuNS0zIDQuOC00LjEtMi41IDMtNC44Wm03LjYgMS44IDMgMy4yLTQgMy44LTMtMy4yIDQtMy44Wk05LjQgMTQuNWw0LjggMi44LTIuMiAzLjgtNC44LTIuOCAyLjItMy44WiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjQ1IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PGNpcmNsZSBjeD0iNi4xIiBjeT0iNS4yIiByPSIxLjUiIGZpbGw9Im5vbmUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMS40NSIvPjwvc3ZnPg==',
    character:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTYuNSA5LjJhNS41IDUuNSAwIDAgMSAxMSAwTTggMTYuOGMxLTEuMSAyLjQtMS43IDQtMS43czMgLjYgNCAxLjdNOS42IDEwLjJoNC44IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjEuNTUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxjaXJjbGUgY3g9IjcuMyIgY3k9IjEwLjIiIHI9IjIuMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PGNpcmNsZSBjeD0iMTYuNyIgY3k9IjEwLjIiIHI9IjIuMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PC9zdmc+',
    history:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PHBhdGggZD0iTTEyIDcuNnY0LjhsMy4xIDEuOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=',
    keyboard:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3QgeD0iMy41IiB5PSI2LjMiIHdpZHRoPSIxNyIgaGVpZ2h0PSIxMS40IiByeD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjQ1Ii8+PHBhdGggZD0iTTcgOS43aC4wMU0xMC40IDkuN2guMDFNMTMuOCA5LjdoLjAxTTE3LjIgOS43aC4wMU03IDEzaC4wMU0xMC40IDEzaC4wMU0xMy44IDEzaC4wMU0xNy4yIDEzaC4wMU04LjIgMTUuNWg3LjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMS43NSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+',
    help:'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1Ii8+PHBhdGggZD0iTTkuNiA5LjJhMi42IDIuNiAwIDEgMSA0LjYgMS43Yy0uOS45LTEuOSAxLjItMS45IDIuOE0xMiAxNi45aC4wMSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIxLjU1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4='
  };

  const mask=(name)=>`url("data:image/svg+xml;base64,${ICONS[name]}")`;
  const style=document.createElement('style');
  style.id='bottomDockV4Styles';
  style.textContent=`
    #bottomDock .dock-btn{position:relative!important}
    #bottomDock .dock-btn>svg,#bottomDock .dock-btn>.ui-icon{display:none!important}
    #bottomDock .dock-btn::before{content:"";display:block;width:18px;height:18px;background:currentColor;-webkit-mask:var(--dock-v4-icon) center/contain no-repeat;mask:var(--dock-v4-icon) center/contain no-repeat}
    #bottomDock .dock-btn.primary::before{width:20px;height:20px}
    #bottomDock [data-dock-action="add"]{--dock-v4-icon:${mask('plus')}}
    #bottomDock [data-dock-action="mode"]{--dock-v4-icon:${mask('cursor')}}
    #bottomDock [data-dock-action="mode"].mode-grab{--dock-v4-icon:${mask('hand')}}
    #bottomDock [data-dock-action="layout"]{--dock-v4-icon:${mask('toolbox')}}
    #bottomDock [data-dock-action="workflow"]{--dock-v4-icon:${mask('materials')}}
    #bottomDock [data-dock-action="asset"]{--dock-v4-icon:${mask('character')}}
    #bottomDock [data-dock-action="history"]{--dock-v4-icon:${mask('history')}}
    #bottomDock [data-dock-action="shortcuts"]{--dock-v4-icon:${mask('keyboard')}}
    #bottomDock [data-dock-action="help"]{--dock-v4-icon:${mask('help')}}
  `;
  document.head.appendChild(style);
})();
