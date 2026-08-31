from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD='20260831-agnes-provider-throttle-1'
BUILD='20260831-video-hover-player-1'


def rep(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'anchor not found: {label}')
    return text.replace(old,new,1)

# 1) Remove native browser video controls from canvas result nodes.
app=ROOT/'app.js'
text=app.read_text(encoding='utf-8')
old='''const media=n.outputUrl?`<div class="media-clip video-node-stage"><video class="node-media-video" src="${escapeAttr(n.outputUrl)}" controls playsinline preload="${n.id===selectedId||n.id===expandedNodeId?'metadata':'none'}" ${n.muted?'muted':''}></video></div>`'''
new='''const media=n.outputUrl?`<div class="media-clip video-node-stage"><video class="node-media-video" src="${escapeAttr(n.outputUrl)}" playsinline muted preload="metadata" disablepictureinpicture disableremoteplayback></video></div>`'''
text=rep(text,old,new,'canvas result video markup')
text=text.replace(OLD,BUILD)
app.write_text(text,encoding='utf-8')

# 2) Custom hover player behavior. No fullscreen / PiP controls are created.
player=ROOT/'video-hover-player-v1.js'
player.write_text(r'''/* Fuiet Infinite Canvas · hover video player
 * Canvas result videos autoplay muted on hover and pause on leave.
 * Native browser controls are intentionally disabled to avoid the black side rail,
 * fullscreen/PiP affordances and inconsistent Chromium control layout.
 */
(()=>{
'use strict';

const ROOT_SELECTOR='.node.node-video[data-content-state="result"] .media-clip.video-node-stage';
const PLAY_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5 18 12 8 18.5v-13Z"/></svg>';
const PAUSE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>';
const VOLUME_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l4-3.5v11L9 14H5v-4Z"/><path d="M16 9.2a4 4 0 0 1 0 5.6M18.5 6.8a7.2 7.2 0 0 1 0 10.4"/></svg>';
const MUTED_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h4l4-3.5v11L9 14H5v-4Z"/><path d="m17 9 4 4M21 9l-4 4"/></svg>';

function fmt(seconds){
  const value=Number(seconds);
  if(!Number.isFinite(value)||value<0)return'0:00';
  const whole=Math.floor(value),m=Math.floor(whole/60),s=whole%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function stopEvent(e){e.stopPropagation()}

function decorate(stage){
  if(!stage||stage.dataset.hoverPlayerReady==='1')return;
  const video=stage.querySelector('.node-media-video');
  if(!video)return;
  stage.dataset.hoverPlayerReady='1';

  // Explicitly suppress native/browser-owned media UI.
  video.controls=false;
  video.removeAttribute('controls');
  video.setAttribute('playsinline','');
  video.setAttribute('disablepictureinpicture','');
  video.setAttribute('disableremoteplayback','');
  video.muted=true;
  video.defaultMuted=true;
  video.preload='metadata';

  const controls=document.createElement('div');
  controls.className='video-hover-controls';
  controls.setAttribute('data-video-hover-controls','');
  controls.innerHTML=`
    <button type="button" class="video-hover-play" data-video-hover-play aria-label="播放">${PLAY_ICON}</button>
    <span class="video-hover-time" data-video-hover-current>0:00</span>
    <input class="video-hover-seek" data-video-hover-seek type="range" min="0" max="1000" step="1" value="0" aria-label="视频进度">
    <span class="video-hover-time" data-video-hover-duration>0:00</span>
    <button type="button" class="video-hover-volume muted" data-video-hover-volume aria-label="打开声音">${MUTED_ICON}</button>`;
  stage.appendChild(controls);

  const playButton=controls.querySelector('[data-video-hover-play]');
  const volumeButton=controls.querySelector('[data-video-hover-volume]');
  const seek=controls.querySelector('[data-video-hover-seek]');
  const current=controls.querySelector('[data-video-hover-current]');
  const duration=controls.querySelector('[data-video-hover-duration]');
  let seeking=false;

  const syncPlay=()=>{
    const playing=!video.paused&&!video.ended;
    stage.classList.toggle('is-hover-playing',playing);
    playButton.innerHTML=playing?PAUSE_ICON:PLAY_ICON;
    playButton.setAttribute('aria-label',playing?'暂停':'播放');
  };
  const syncVolume=()=>{
    const muted=video.muted||video.volume===0;
    volumeButton.classList.toggle('muted',muted);
    volumeButton.innerHTML=muted?MUTED_ICON:VOLUME_ICON;
    volumeButton.setAttribute('aria-label',muted?'打开声音':'静音');
  };
  const syncTime=()=>{
    const dur=Number(video.duration)||0,cur=Number(video.currentTime)||0;
    current.textContent=fmt(cur);duration.textContent=fmt(dur);
    if(!seeking)seek.value=dur>0?String(Math.max(0,Math.min(1000,Math.round(cur/dur*1000)))):'0';
  };
  const start=()=>{
    if(video.ended){try{video.currentTime=0}catch{}}
    const p=video.play();if(p&&typeof p.catch==='function')p.catch(()=>{});
  };
  const pause=()=>video.pause();

  // Desktop/fine-pointer behavior: hover previews automatically.
  stage.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'||!e.pointerType)start()});
  stage.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'||!e.pointerType)pause()});

  // Tap/click remains a complete fallback for touch and accessibility.
  video.addEventListener('click',e=>{stopEvent(e);video.paused?start():pause()});
  playButton.addEventListener('click',e=>{stopEvent(e);video.paused?start():pause()});
  volumeButton.addEventListener('click',e=>{stopEvent(e);video.muted=!video.muted;if(!video.muted&&video.volume===0)video.volume=1;syncVolume()});
  seek.addEventListener('pointerdown',stopEvent);
  seek.addEventListener('click',stopEvent);
  seek.addEventListener('input',e=>{stopEvent(e);seeking=true;const dur=Number(video.duration)||0;if(dur>0){const t=Number(seek.value)/1000*dur;current.textContent=fmt(t)}});
  seek.addEventListener('change',e=>{stopEvent(e);const dur=Number(video.duration)||0;if(dur>0)video.currentTime=Number(seek.value)/1000*dur;seeking=false;syncTime()});
  controls.addEventListener('pointerdown',stopEvent);
  controls.addEventListener('dblclick',stopEvent);

  video.addEventListener('loadedmetadata',syncTime);
  video.addEventListener('durationchange',syncTime);
  video.addEventListener('timeupdate',syncTime);
  video.addEventListener('play',syncPlay);
  video.addEventListener('pause',syncPlay);
  video.addEventListener('ended',()=>{syncPlay();syncTime()});
  video.addEventListener('volumechange',syncVolume);
  syncPlay();syncVolume();syncTime();
}

function scan(root=document){
  if(root.matches?.(ROOT_SELECTOR))decorate(root);
  root.querySelectorAll?.(ROOT_SELECTOR).forEach(decorate);
}

scan();
const layer=document.querySelector('#nodeLayer');
if(layer)new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){if(node?.nodeType===1)scan(node)}
}).observe(layer,{childList:true,subtree:true});
})();
''',encoding='utf-8')

# 3) Load hover player after app.js so it decorates both existing and future renders.
boot=ROOT/'browser-bootstrap.js'
s=boot.read_text(encoding='utf-8')
s=rep(s,"  `./app.js?v=${v}`,\n","  `./app.js?v=${v}`,\n  `./video-hover-player-v1.js?v=${v}`,\n",'hover player bootstrap')
s=s.replace(OLD,BUILD)
boot.write_text(s,encoding='utf-8')

# 4) Result video styling: no native side rail, custom controls only on hover/focus.
css=ROOT/'styles'/'video-node.css'
s=css.read_text(encoding='utf-8')
anchor='''.node.node-video[data-content-state="result"] .node-media-video{\n  display:block;\n  width:100%;\n  height:auto;\n  min-height:0;\n  max-height:none;\n  object-fit:contain;\n  border-radius:7px;\n  background:#111;\n}\n'''
replacement='''.node.node-video[data-content-state="result"] .node-media-video{\n  display:block;\n  width:100%;\n  height:auto;\n  min-height:0;\n  max-height:none;\n  object-fit:cover;\n  border-radius:7px;\n  background:#111;\n}\n.node.node-video[data-content-state="result"] .media-clip.video-node-stage{position:relative;line-height:0}\n.node.node-video[data-content-state="result"] .node-media-video::-webkit-media-controls,\n.node.node-video[data-content-state="result"] .node-media-video::-webkit-media-controls-enclosure{display:none!important}\n.video-hover-controls{\n  position:absolute;\n  left:0;right:0;bottom:0;\n  min-height:43px;\n  display:flex;align-items:center;gap:8px;\n  padding:15px 11px 8px;\n  border-radius:0 0 7px 7px;\n  background:linear-gradient(to bottom,rgba(0,0,0,0),rgba(0,0,0,.72));\n  opacity:0;pointer-events:none;\n  transition:opacity .14s ease;\n  z-index:6;\n  line-height:1;\n}\n.media-clip.video-node-stage:hover .video-hover-controls,\n.media-clip.video-node-stage:focus-within .video-hover-controls{opacity:1;pointer-events:auto}\n.video-hover-controls button{\n  width:27px;height:27px;min-width:27px;\n  display:grid;place-items:center;\n  padding:0;border:0;border-radius:5px;\n  background:transparent;color:#f4f4f4;\n}\n.video-hover-controls button:hover,.video-hover-controls button:focus-visible{background:rgba(255,255,255,.12);outline:none}\n.video-hover-controls button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n.video-hover-play svg path:first-child{fill:currentColor;stroke:none}\n.video-hover-time{color:#f0f0f0;font:500 10px/1 var(--ui-font-sans);white-space:nowrap;line-height:27px}\n.video-hover-seek{\n  flex:1 1 auto;min-width:50px;height:18px;margin:0;\n  accent-color:#e8e8e8;cursor:pointer;\n}\n.video-hover-volume{margin-left:1px}\n@media (hover:none),(pointer:coarse){\n  .video-hover-controls{opacity:1;pointer-events:auto}\n}\n'''
s=rep(s,anchor,replacement,'video result player css')
css.write_text(s,encoding='utf-8')

# 5) Cache bust references in index/models and stale tests.
for name in ['index.html','models.html']:
    fp=ROOT/name
    s=fp.read_text(encoding='utf-8').replace(OLD,BUILD)
    fp.write_text(s,encoding='utf-8')
for fp in (ROOT/'tests').glob('*.test.mjs'):
    s=fp.read_text(encoding='utf-8')
    if OLD in s: fp.write_text(s.replace(OLD,BUILD),encoding='utf-8')

# 6) Regression tests.
(ROOT/'tests'/'video-hover-player.test.mjs').write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../video-hover-player-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('canvas result videos do not use native browser controls',()=>{
  const match=app.match(/<video class=\\"node-media-video\\"[^>]+>/)?.[0]||'';
  assert.ok(match,'node media video markup exists');
  assert.doesNotMatch(match,/\\scontrols(?:\\s|=|>)/);
  assert.match(match,/playsinline/);
  assert.match(match,/muted/);
  assert.match(match,/disablepictureinpicture/);
  assert.match(match,/disableremoteplayback/);
});

test('hover player autoplays on pointer enter and pauses on leave',()=>{
  assert.match(player,/stage\.addEventListener\('pointerenter'/);
  assert.match(player,/stage\.addEventListener\('pointerleave'/);
  assert.match(player,/video\.play\(\)/);
  assert.match(player,/video\.pause\(\)/);
});

test('hover player does not expose fullscreen or picture in picture actions',()=>{
  assert.doesNotMatch(player,/requestFullscreen|webkitRequestFullscreen|requestPictureInPicture/);
  assert.match(player,/video\.controls=false/);
});

test('custom controls are loaded and styled as overlay controls',()=>{
  assert.match(boot,/video-hover-player-v1\.js\?v=\$\{v\}/);
  assert.match(css,/\.video-hover-controls\{/);
  assert.match(css,/\.media-clip\.video-node-stage:hover \.video-hover-controls/);
  assert.match(css,/object-fit:cover/);
});
''',encoding='utf-8')

print('patched video hover player',BUILD)
