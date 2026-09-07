import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-shot-dialogue-reference-v1.css',import.meta.url),'utf8');
const highlighter=fs.readFileSync(new URL('../script-shot-description-editor-highlight-v1.js',import.meta.url),'utf8');

test('dialogue column uses inline asset mentions and a dedicated editor',()=>{
  assert.match(app,/function scriptShotDialogueText\(d,shot\)/);
  assert.match(app,/data-edit-shot-dialogue/);
  assert.match(app,/function openShotDialogueEditor\(n,d,shot,rerender\)/);
  assert.match(app,/data-shot-dialogue-text/);
});

test('dialogue mentions are auto inserted in-place without prepending asset blocks',()=>{
  assert.match(app,/autoMentionAssetNames/);
  assert.match(app,/value\.indexOf\(name,cursor\)/);
  assert.doesNotMatch(css,/chip|pill/i);
  assert.match(css,/shot-mention-token\{color:#21c7df/);
});

test('dialogue-linked assets participate in shot asset references',()=>{
  assert.match(app,/String\(shot\?\.dialogue\|\|''\)/);
  assert.match(app,/corpus\.includes\('@'\+a\.name\)\|\|corpus\.includes\(a\.name\)/);
});

test('dialogue table stays concise, left aligned and line clamped',()=>{
  assert.match(css,/nth-child\(6\).*width:320px/s);
  assert.match(css,/text-align:left!important/);
  assert.match(css,/-webkit-line-clamp:4/);
});

test('dialogue modal reuses the inline cyan textarea highlighter',()=>{
  assert.match(highlighter,/textarea\[data-shot-dialogue-text\]/);
  assert.match(boot,/script-shot-dialogue-reference-v1\.css\?v=\$\{dialogueV\}/);
  assert.match(boot,/shot-editor-inline-mentions-3/);
});

test('confirmed shot description implementation remains present',()=>{
  assert.match(app,/function scriptShotVisualDescription\(d,shot\)/);
  assert.match(app,/function scriptShotDescriptionHtml\(d,shot\)/);
  assert.match(app,/data-edit-shot-description/);
});
