import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/edge-reference-cards-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('incoming edges are both generation references and visible live reference cards',()=>{
  assert.match(app,/state\.edges\.filter\(e=>e\.target===nodeId\)[\s\S]*?addRef\(/);
  assert.match(app,/function incomingEdgeReferences\(target\)[\s\S]*?state\.edges\.filter\(e=>e\.target===target\.id\)/);
  assert.match(app,/const source=state\.nodes\.find\(n=>n\.id===edge\.source\)/);
  assert.match(app,/const incomingReferenceHtml=nodeIncomingReferenceHtml\(n\)/);
  assert.match(app,/\$\{incomingReferenceHtml\}[\s\S]*?<div class="node-body">\$\{body\}<\/div>/);
});

test('reference cards show the current source result and hover detail',()=>{
  assert.match(app,/source\?\.generatedText\|\|source\?\.text\|\|source\?\.prompt/);
  assert.match(app,/source\?\.outputUrl/);
  assert.match(app,/class="node-reference-popover" role="tooltip"/);
  assert.match(css,/\.node-reference-chip:hover \.node-reference-popover/);
  assert.match(css,/\.node-reference-chip:focus-within \.node-reference-popover/);
});

test('text references send latest generated text instead of stale prompt when available',()=>{
  assert.match(app,/text:x\.generatedText\|\|x\.text\|\|x\.prompt\|\|''/);
});

test('reference card assets are loaded with an explicit cache marker',()=>{
  assert.match(bootstrap,/edge-reference-cards-v1\.css\?v=\$\{v\}&ui=edge-reference-card-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=edge-reference-card-1/);
});
