import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root='_read_123_zip_20260821_180410';
const icon=fs.readFileSync(`${root}/node-send-icon-v1.js`,'utf8');
const bootstrap=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('generation send icon normalizer observes the whole document, not only generatorPanel',()=>{
  assert.match(icon,/applySendIcon\(document\)/);
  assert.match(icon,/observer\.observe\(document\.body/);
  assert.doesNotMatch(icon,/const generator=document\.querySelector\('#generatorPanel'\)/);
});

test('known image video audio text and script generation buttons use the unified send arrow',()=>{
  for(const token of ['#generateBtn','#scriptGenerateBtn','.generate-btn','.image-generate-btn','.video-generate-btn','.audio-generate-btn']){
    assert.ok(icon.includes(token),token);
  }
  assert.match(icon,/node-send-arrow/);
  assert.match(icon,/btn\.dataset\.sendIcon='up-v2'/);
});

test('legacy next glyph is only normalized when button semantics indicate generation',()=>{
  assert.match(icon,/hasLegacyNextGlyph/);
  assert.match(icon,/generationSemantic\(btn\)&&hasLegacyNextGlyph\(btn\)/);
  assert.match(icon,/generate\|生成\|发送/);
});

test('global next navigation icon definition is not modified by this feature module',()=>{
  assert.doesNotMatch(icon,/UI_ICONS/);
  assert.doesNotMatch(icon,/next:/);
});

test('bootstrap cache-busts unified send icon v2',()=>{
  assert.match(bootstrap,/const sendIconV='20260907-unified-send-icon-v2-1'/);
  assert.match(bootstrap,/node-send-icon-v1\.js\?v=\$\{sendIconV\}/);
  assert.match(bootstrap,/data-node-send-icon':'2'/);
});
