/* Canvas Studio · Persistent Minimap Tool */
(()=>{
'use strict';
const btn=document.querySelector('#minimapBtn');
const minimap=document.querySelector('#minimap');
const minimapNodes=document.querySelector('#minimapNodes');
const minimapView=document.querySelector('#minimapView');
const viewport=document.querySelector('#canvasViewport');
const world=document.querySelector('#canvasWorld');
const nodeLayer=document.querySelector('#nodeLayer');
if(!btn||!minimap||!minimapNodes||!minimapView||!viewport||!world)return;

btn.type='button';
btn.setAttribute('aria-label','小地图');
btn.setAttribute('title','小地图');
btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>';

const style=document.createElement('style');
style.id='persistentMinimapV1Styles';
style.textContent=`
#minimapBtn{position:relative;width:30px!important;height:30px!important;display:grid!important;place-items:center!important;padding:0!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#d7d7d7!important;font-size:0!important}
#minimapBtn:hover,#minimapBtn.active,#minimapBtn:focus-visible{background:#343534!important;color:#fff!important;outline:none!important}
#minimapBtn svg{width:18px!important;height:18px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#minimap{position:absolute!important;width:190px!important;height:120px!important;padding:0!important;border:1px solid #3d403d!important;border-radius:10px!important;background:#202220!important;box-shadow:0 10px 28px rgba(0,0,0,.4)!important;overflow:hidden!important;z-index:96!important;cursor:crosshair!important}
#minimap.hidden{display:none!important}
#minimapNodes{position:absolute!important;inset:0!important}
#minimap .mini-node{position:absolute!important;min-width:3px!important;min-height:3px!important;border-radius:1px!important;background:#777b77!important;opacity:.9!important;box-shadow:none!important}
#minimap .mini-node[data-type="text"]{background:#8a8a82!important}
#minimap .mini-node[data-type="image"]{background:#7b807b!important}
#minimap .mini-node[data-type="video"]{background:#6f7679!important}
#minimap .mini-node[data-type="audio"]{background:#727a72!important}
#minimapView{position:absolute!important;border:1px solid #8b8f8b!important;background:rgba(255,255,255,.035)!important;pointer-events:none!important;box-sizing:border-box!important}
`;
document.querySelector('#persistentMinimapV1Styles')?.remove();
document.head.appendChild(style);

const readState=()=>{try{return JSON.parse(localStorage.getItem('libtv-clone-state')||'{}')||{}}catch{return {}}};
const h=n=>Math.max(40,Number(n?.h)||({text:180,image:240,video:240,audio:170,script:260,director:260}[n?.type]||180));
let geom=null,frame=0;

function canvasNodes(){
  const s=readState();
  return Array.isArray(s.nodes)?s.nodes.filter(n=>Number.isFinite(Number(n.x))&&Number.isFinite(Number(n.y))):[];
}
function bounds(nodes){
  if(!nodes.length)return{left:0,top:0,right:600,bottom:400,width:600,height:400};
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const n of nodes){
    const x=Number(n.x)||0,y=Number(n.y)||0,w=Math.max(40,Number(n.w)||320),nh=h(n);
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+w);bottom=Math.max(bottom,y+nh);
  }
  const padWorld=80;
  left-=padWorld;top-=padWorld;right+=padWorld;bottom+=padWorld;
  return{left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
function parseViewport(){
  const s=readState(),v=s.viewport||{};
  const t=world.style.transform||'';
  const m=t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)\s*scale\(([\d.]+)\)/);
  return m?{x:Number(m[1]),y:Number(m[2]),z:Math.max(.01,Number(m[3]))}:{x:Number(v.x)||0,y:Number(v.y)||0,z:Math.max(.01,Number(v.zoom)||1)};
}
function place(){
  const r=btn.getBoundingClientRect(),w=190,gap=10;
  const left=Math.max(12,Math.min(window.innerWidth-w-12,r.left+r.width/2-w/2));
  minimap.style.left=`${Math.round(left)}px`;
  minimap.style.bottom=`${Math.round(window.innerHeight-r.top+gap)}px`;
}
function drawView(){
  if(!geom)return;
  const v=parseViewport(),r=viewport.getBoundingClientRect();
  const worldLeft=-v.x/v.z,worldTop=-v.y/v.z;
  minimapView.style.left=(geom.ox+worldLeft*geom.scale)+'px';
  minimapView.style.top=(geom.oy+worldTop*geom.scale)+'px';
  minimapView.style.width=Math.max(8,r.width/v.z*geom.scale)+'px';
  minimapView.style.height=Math.max(6,r.height/v.z*geom.scale)+'px';
}
function draw(){
  if(minimap.classList.contains('hidden'))return;
  place();
  const nodes=canvasNodes(),W=190,H=120,pad=10,b=bounds(nodes);
  const scale=Math.min((W-pad*2)/b.width,(H-pad*2)/b.height);
  const ox=(W-b.width*scale)/2-b.left*scale,oy=(H-b.height*scale)/2-b.top*scale;
  geom={scale,ox,oy,bounds:b};
  const frag=document.createDocumentFragment();
  for(const n of nodes){
    const d=document.createElement('div');
    d.className='mini-node';d.dataset.nodeId=String(n.id||'');d.dataset.type=String(n.type||'');
    d.style.left=(ox+(Number(n.x)||0)*scale)+'px';
    d.style.top=(oy+(Number(n.y)||0)*scale)+'px';
    d.style.width=Math.max(3,(Number(n.w)||320)*scale)+'px';
    d.style.height=Math.max(3,h(n)*scale)+'px';
    frag.appendChild(d);
  }
  minimapNodes.replaceChildren(frag);
  drawView();
}
function schedule(full=true){
  cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{frame=0;full?draw():drawView()});
}

const appToggle=btn.onclick;
btn.onclick=e=>{
  if(typeof appToggle==='function')appToggle.call(btn,e);
  else minimap.classList.toggle('hidden');
  const open=!minimap.classList.contains('hidden');
  btn.classList.toggle('active',open);
  btn.setAttribute('aria-pressed',String(open));
  if(open)schedule(true);
};

new MutationObserver(()=>{if(!minimap.classList.contains('hidden'))schedule(true)}).observe(nodeLayer||document.body,{childList:true,subtree:false});
new MutationObserver(()=>{if(!minimap.classList.contains('hidden'))schedule(false)}).observe(world,{attributes:true,attributeFilter:['style']});
addEventListener('resize',()=>{if(!minimap.classList.contains('hidden'))schedule(true)},{passive:true});

btn.classList.toggle('active',!minimap.classList.contains('hidden'));
btn.setAttribute('aria-pressed',String(!minimap.classList.contains('hidden')));
})();
