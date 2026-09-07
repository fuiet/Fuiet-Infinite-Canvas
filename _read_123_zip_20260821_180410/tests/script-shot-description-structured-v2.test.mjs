import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-shot-description-structured-v2.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('shot table separates prose from character scene and prop references',()=>{
  assert.match(app,/function scriptShotDescriptionParts\(d,shot\)/);
  assert.match(app,/group\('人物','character',view\.characters\)/);
  assert.match(app,/group\('场景','scene',view\.scenes\)/);
  assert.match(app,/group\('道具','prop',view\.props\)/);
  assert.match(app,/shot-desc-main/);
  assert.match(app,/shot-desc-ref-list/);
});

test('inline @ markers are stripped from display prose without changing stored source',()=>{
  assert.match(app,/description=description\.split\('@'\+a\.name\)\.join\(String\(a\.name\)\)/);
  assert.match(app,/scriptShotVisualDescription\(d,shot\)/);
  assert.doesNotMatch(app,/html=html\.split\(token\)\.join\(`<span class="shot-mention-token"/);
});

test('structured description column is wide left-aligned and readable',()=>{
  assert.match(css,/nth-child\(3\)[\s\S]*width:540px!important/);
  assert.match(css,/\.shot-desc-card\{display:flex;flex-direction:column/);
  assert.match(css,/\.shot-desc-main\{[\s\S]*-webkit-line-clamp:3/);
  assert.match(css,/\.shot-desc-ref-list\{[\s\S]*border-top/);
  assert.match(css,/text-align:left!important/);
});

test('asset classes are visually separated instead of mixed into prose',()=>{
  assert.match(css,/\.shot-desc-ref-chip\.character/);
  assert.match(css,/\.shot-desc-ref-chip\.scene/);
  assert.match(css,/\.shot-desc-ref-chip\.prop/);
});

test('bootstrap loads structured layout after legacy description CSS and cache-busts app',()=>{
  const oldIndex=boot.indexOf('script-shot-description-reference-v1.css');
  const newIndex=boot.indexOf('script-shot-description-structured-v2.css');
  assert.ok(oldIndex>=0&&newIndex>oldIndex);
  assert.match(boot,/20260907-shot-description-structured-v2-1/);
  assert.match(boot,/shotdesc=\$\{shotDescriptionV\}/);
});
