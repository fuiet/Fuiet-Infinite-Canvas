import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('video generator exposes exactly the four requested modes',()=>{
  const block=app.slice(app.indexOf('const VIDEO_GENERATION_MODES'),app.indexOf('const VIDEO_ASPECT_RATIOS_BY_MODE'));
  assert.match(block,/key:'text2video',label:'文生视频'/);
  assert.match(block,/key:'image2video',label:'图生视频'/);
  assert.match(block,/key:'frame2video',label:'首尾帧'/);
  assert.match(block,/key:'omni_reference',label:'全能参考'/);
  assert.equal((block.match(/key:/g)||[]).length,4);
  assert.doesNotMatch(block,/音频生视频/);
});

test('all video modes use the requested six aspect ratios',()=>{
  const block=app.slice(app.indexOf('const VIDEO_ASPECT_RATIOS_BY_MODE'),app.indexOf('function normalizeVideoModeKey'));
  for(const mode of ['text2video','image2video','frame2video','omni_reference']){
    assert.match(block,new RegExp(`${mode}:Object\\.freeze\\(\\['16:9','9:16','1:1','4:3','3:4','21:9'\\]\\)`));
  }
});

test('legacy audio mode migrates to omni reference mode',()=>{
  const block=app.slice(app.indexOf('function normalizeVideoModeKey'),app.indexOf('function videoModeOptions'));
  assert.match(block,/audio2video[\s\S]*?return 'omni_reference'/);
  assert.match(block,/全能参考/);
});

test('references are routed by selected video mode',()=>{
  const block=app.slice(app.indexOf('function videoReferencesForMode'),app.indexOf('function syncVideoNodeCapabilities'));
  assert.match(block,/if\(mode==='text2video'\)return \[\]/);
  assert.match(block,/if\(mode==='image2video'\)return list\.filter/);
  assert.match(block,/role==='first_frame'\|\|role==='last_frame'/);
  assert.match(block,/return list;/);
});

test('generator and studio resync ratio when video mode changes',()=>{
  assert.match(app,/const ratios=n\.type==='video'\?videoAspectRatiosForMode\(n\.videoMode\)/);
  assert.match(app,/videoModeSelect[\s\S]{0,500}?videoAspectRatiosForMode\(n\.videoMode\)/);
  assert.match(app,/studioRatios=videoAspectRatiosForMode\(activeMode\)/);
  assert.match(app,/videoStudioMode[\s\S]{0,500}?videoAspectRatiosForMode\(n\.videoMode\)/);
});

test('video validation uses mode-filtered references and enforces mode inputs',()=>{
  const start=app.indexOf('function validateSemanticInputs');
  const block=app.slice(start,start+7000);
  assert.match(block,/refs=n\.type==='video'\?videoReferencesForMode\(n,allRefs\):allRefs/);
  assert.match(block,/图生视频至少需要 1 张参考图/);
  assert.match(block,/首尾帧模式需要首帧图片/);
  assert.match(block,/首尾帧模式需要尾帧图片/);
  assert.match(block,/全能参考至少需要 1 个参考素材/);
});

test('video task includes the selected fixed generation mode',()=>{
  assert.match(app,/videoMode:normalizeVideoModeKey\(n\.videoMode\)\|\|'text2video'/);
  assert.match(app,/generationMode:normalizeVideoModeKey\(n\.videoMode\)\|\|'text2video'/);
  assert.match(app,/n\.type==='video'\?videoAspectRatiosForMode\(n\.videoMode\)\[0\]/);
});
