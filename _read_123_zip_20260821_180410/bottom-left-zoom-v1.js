/* Canvas Studio · Persistent Canvas Zoom Tool */
(()=>{
'use strict';
const bar=document.querySelector('.bottom-left');
const zoomBtn=document.querySelector('#zoomBtn');
const viewport=document.querySelector('#canvasViewport');
const world=document.querySelector('#canvasWorld');
const contextMenu=document.querySelector('#contextMenu');
if(!bar||!zoomBtn||!viewport||!world||!contextMenu)return;

const legacyZoomClick=zoomBtn.onclick;
window.__canvasOpenLegacyZoomMenu=()=>{if(typeof legacyZoomClick==='function')legacyZoomClick.call(zoomBtn)};

const style=document.createElement('style');
style.id='canvasZoomToolV1Styles';
style.textContent=`
#zoomBtn{position:relative!important;min-width:48px!important;height:30px!important;padding:0 7px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#ededed!important;font-size:13px!important;font-weight:650!important;line-height:30px!important}
#zoomBtn:hover,#zoomBtn.zoom-menu-open,#zoomBtn:focus-visible{background:#343534!important;color:#fff!important;outline:none!important}
#canvasZoomMenu{position:fixed;width:216px;padding:7px;border:1px solid #3a3d3a;border-radius:11px;background:#272827;color:#eee;box-shadow:0 12px 32px #0007;z-index:650;display:none}
#canvasZoomMenu.open{display:block}
.czm-input{height:34px;display:flex;align-items:center;padding:0 10px;border-radius:7px;background:#444644;margin-bottom:5px}
.czm-input input{min-width:0;flex:1;border:0;background:transparent;color:#fff;outline:none;font:600 14px/1.2 var(--ui-font-sans,system-ui);padding:0}
.czm-input span{color:#9da09d;font-size:12px}
.czm-row{width:100%;height:36px;border:0;border-radius:7px;background:transparent;color:#eee;padding:0 10px;display:flex;align-items:center;justify-content:space-between;text-align:left;font-size:13px}
.czm-row:hover{background:#363836}
.czm-row kbd{font:500 11px/1.2 var(--ui-font-sans,system-ui);color:#8f938f;background:transparent;border:0;padding:0;box-shadow:none}
.czm-sep{height:1px;background:#3a3c3a;margin:5px 3px}
`;
document.querySelector('#canvasZoomToolV1Styles')?.remove();document.head.appendChild(style);

const menu=document.createElement('div');menu.id='canvasZoomMenu';menu.innerHTML=`
  <div class="czm-input"><input id="canvasZoomInput" inputmode="numeric" aria-label="画布缩放百分比"><span>%</span></div>
  <button class="czm-row" data-zoom-action="in"><span>放大</span><kbd>⌘ +</kbd></button>
  <button class="czm-row" data-zoom-action="out"><span>缩小</span><kbd>⌘ −</kbd></button>
  <button class="czm-row" data-zoom-action="fit"><span>适合屏幕</span><kbd>⌘ 0</kbd></button>
  <div class="czm-sep"></div>
  <button class="czm-row" data-zoom-value="50"><span>缩放至50%</span></button>
  <button class="czm-row" data-zoom-value="100"><span>缩放至100%</span></button>
  <button class="czm-row" data-zoom-value="800"><span>缩放至800%</span></button>`;
document.body.appendChild(menu);

const currentZoom=()=>{
  const t=world.style.transform||'',m=t.match(/scale\(([\d.]+)\)/);
  if(m)return Math.max(.1,Number(m[1])||1);
  const n=parseFloat(zoomBtn.textContent);return Number.isFinite(n)?n/100:1;
};
const setZoom=pct=>{
  const target=Math.max(10,Math.min(800,Number(pct)||100))/100;
  const old=Math.max(.01,currentZoom());if(Math.abs(target-old)<.0005)return;
  const r=viewport.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  const deltaY=-Math.log(target/old)/.0014;
  viewport.dispatchEvent(new WheelEvent('wheel',{bubbles:true,cancelable:true,ctrlKey:true,deltaY,clientX:cx,clientY:cy}));
};
const presets=[10,25,50,75,100,125,150,200,300,400,600,800];
const stepZoom=dir=>{const p=Math.round(currentZoom()*100);const next=dir>0?(presets.find(x=>x>p)||800):([ ...presets].reverse().find(x=>x<p)||10);setZoom(next)};
const fitScreen=()=>{
  window.__canvasOpenLegacyZoomMenu?.();
  const item=contextMenu.querySelector('[data-view="all"]');
  if(item)item.click();else contextMenu.classList.add('hidden');
};
const position=()=>{const r=zoomBtn.getBoundingClientRect(),w=216,h=menu.offsetHeight||278;menu.style.left=Math.max(10,Math.min(innerWidth-w-10,r.right-w))+'px';menu.style.top=Math.max(10,r.top-h-9)+'px'};
const close=()=>{menu.classList.remove('open');zoomBtn.classList.remove('zoom-menu-open')};
const open=()=>{const input=menu.querySelector('#canvasZoomInput');input.value=String(Math.round(currentZoom()*100));menu.classList.add('open');zoomBtn.classList.add('zoom-menu-open');requestAnimationFrame(position)};

zoomBtn.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();menu.classList.contains('open')?close():open()};
menu.addEventListener('click',e=>{const b=e.target.closest('[data-zoom-action],[data-zoom-value]');if(!b)return;e.preventDefault();if(b.dataset.zoomValue)setZoom(Number(b.dataset.zoomValue));else if(b.dataset.zoomAction==='in')stepZoom(1);else if(b.dataset.zoomAction==='out')stepZoom(-1);else if(b.dataset.zoomAction==='fit')fitScreen();close()});
const input=menu.querySelector('#canvasZoomInput');const applyInput=()=>{setZoom(input.value);input.value=String(Math.round(currentZoom()*100))};input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyInput();close()}else if(e.key==='Escape'){e.preventDefault();close();zoomBtn.focus()}});input.addEventListener('change',applyInput);
document.addEventListener('pointerdown',e=>{if(menu.classList.contains('open')&&!menu.contains(e.target)&&e.target!==zoomBtn)close()},true);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open'))close()},true);
window.addEventListener('resize',()=>{if(menu.classList.contains('open'))position()},{passive:true});

const keepOrder=()=>{const g=document.querySelector('#gridSnapBtn');if(g&&g.nextElementSibling!==zoomBtn)bar.insertBefore(g,zoomBtn)};
keepOrder();new MutationObserver(keepOrder).observe(bar,{childList:true});
})();
