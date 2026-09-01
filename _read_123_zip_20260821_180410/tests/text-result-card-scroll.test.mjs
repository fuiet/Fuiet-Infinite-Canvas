import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('generated AI text nodes use a horizontal result card',()=>{
  assert.match(app,/function ensureGeneratedTextNodeLayout\(n\)/);
  assert.match(app,/n\.w=560/);
  assert.match(app,/n\.h=260/);
  assert.match(css,/data-content-state="result"\]\{\s*height:260px;/);
});

test('text result body stays fixed and scrolls internally',()=>{
  assert.match(css,/\.text-node-preview\{[\s\S]*?height:100%;[\s\S]*?min-height:0;[\s\S]*?max-height:none;[\s\S]*?overflow:auto;/);
});

test('clicking a text result does not start node dragging and wheel stays in the result',()=>{
  assert.match(app,/textarea,\.text-node-preview,\.node-port/);
  assert.match(app,/textPreview=e\.target\.closest\?\.\('\.text-node-preview\[data-text-result\]'\)/);
  assert.match(app,/if\(textPreview&&document\.activeElement===textPreview\)return;/);
});

test('wheel inside expanded text editing scrolls text instead of zooming the canvas',()=>{
  assert.match(app,/textEditor=e\.target\.closest\?\.\('\[data-text-manual\]'\)/);
  assert.match(app,/if\(textEditor\)return;/);
  const guard=app.indexOf("const textEditor=e.target.closest?.('[data-text-manual]')");
  const canvasPrevent=app.indexOf('e.preventDefault();const rect=viewport.getBoundingClientRect()',guard);
  assert.ok(guard>=0&&canvasPrevent>guard,'text editor wheel guard must run before canvas zoom prevention');
});

test('text result stylesheet is cache busted',()=>{
  assert.match(index,/text-node\.css\?v=20260901-text-result-card-scroll-1/);
});
