import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const script=fs.readFileSync(new URL('../edge-cut-interaction-v1.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/edge-cut-interaction-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('edge interaction is reduced to hover flow and single-click disconnect',()=>{
  assert.match(script,/cloneNode\(true\)/);
  assert.match(script,/data-edge-delete/);
  assert.match(script,/pointerenter/);
  assert.match(script,/pointermove/);
  assert.match(script,/addEventListener\('click',event=>cutEdge/);
  assert.match(script,/addEventListener\('contextmenu'/);
  assert.match(script,/event\.preventDefault\(\)/);
});

test('edge visuals hide legacy labels and reconnect handles',()=>{
  assert.match(css,/#edgeLayer \.edge-label,[\s\S]*#edgeLayer \.edge-end-handle[\s\S]*display:none!important/);
  assert.match(css,/\.edge-cut-flow\.visible[\s\S]*edge-cut-flow-forward/);
  assert.match(css,/stroke-dashoffset:-116/);
  assert.match(css,/\.edge-cut-scissor\.visible/);
  assert.match(css,/edge-cut-delete-pending #contextMenu/);
});

test('bootstrap loads edge cut interaction after core edge creation',()=>{
  const appIndex=bootstrap.indexOf('./app.js');
  const edgeIndex=bootstrap.indexOf('./edge-cut-interaction-v1.js');
  assert.ok(appIndex>=0);
  assert.ok(edgeIndex>appIndex);
  assert.match(bootstrap,/styles\/edge-cut-interaction-v1\.css/);
});
