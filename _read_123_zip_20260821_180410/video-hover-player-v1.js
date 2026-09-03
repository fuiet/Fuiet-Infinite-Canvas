/* Fuiet Infinite Canvas · hover video player
 * Canvas result videos prefer sound on hover and pause on leave.
 * If the browser blocks audible autoplay, preview falls back to muted playback.
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
  video.removeAttribute('muted');
  video.muted=false;
  video.defaultMuted=false;
  if(video.volume===0)video.volume=1;
  video.preload='metadata';

  const controls=document.createElement('div');
  controls.className='video-hover-controls';
  controls.setAttribute('data-video-hover-controls','');
  controls.innerHTML=`
    <button type="button" class="video-hover-play" data-video-hover-play aria-label="播放">${PLAY_ICON}</button>
    <span class="video-hover-time" data-video-hover-current>0:00</span>
    <input class="video-hover-seek" data-video-hover-seek type="range" min="0" max="1000" step="1" value="0" aria-label="视频进度">
    <span class="video-hover-time" data-video-hover-duration>0:00</span>
    <button type="button" class="video-hover-volume" data-video-hover-volume aria-label="静音">${VOLUME_ICON}</button>`;
  stage.appendChild(controls);

  const playButton=controls.querySelector('[data-video-hover-play]');
  const volumeButton=controls.querySelector('[data-video-hover-volume]');
  const seek=controls.querySelector('[data-video-hover-seek]');
  const current=controls.querySelector('[data-video-hover-current]');
  const duration=controls.querySelector('[data-video-hover-duration]');
  let seeking=false,userMuted=false,playRequested=false;

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
    playRequested=true;
    if(video.ended){try{video.currentTime=0}catch{}}
    video.defaultMuted=false;
    video.removeAttribute('muted');
    video.muted=userMuted;
    if(!userMuted&&video.volume===0)video.volume=1;
    syncVolume();
    const p=video.play();
    if(p&&typeof p.catch==='function')p.catch(()=>{
      if(!playRequested||userMuted)return;
      video.muted=true;
      syncVolume();
      const fallback=video.play();
      if(fallback&&typeof fallback.catch==='function')fallback.catch(()=>{});
    });
  };
  const pause=()=>{playRequested=false;video.pause()};

  // Desktop/fine-pointer behavior: hover previews automatically.
  stage.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'||!e.pointerType)start()});
  stage.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen'||!e.pointerType)pause()});

  // Tap/click remains a complete fallback for touch and accessibility.
  video.addEventListener('click',e=>{stopEvent(e);video.paused?start():pause()});
  playButton.addEventListener('click',e=>{stopEvent(e);video.paused?start():pause()});
  volumeButton.addEventListener('click',e=>{
    stopEvent(e);
    userMuted=!video.muted;
    video.muted=userMuted;
    if(!userMuted&&video.volume===0)video.volume=1;
    syncVolume();
  });
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
