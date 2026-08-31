import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../video-hover-player-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/video-node.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('canvas result videos do not use native browser controls',()=>{
  const match=app.match(/<video class="node-media-video"[^>]+>/)?.[0]||'';
  assert.ok(match,'node media video markup exists');
  assert.doesNotMatch(match,/\scontrols(?:\s|=|>)/);
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
