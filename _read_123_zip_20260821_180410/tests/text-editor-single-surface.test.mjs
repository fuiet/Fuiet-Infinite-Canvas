import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('expanded text editing uses one visual surface and fills the node',()=>{
  assert.match(css,/text-node-editing\[data-content-state="result"\]>.node-body\{[\s\S]*?height:100%!important;[\s\S]*?min-height:0!important;[\s\S]*?background:transparent!important;/);
  assert.match(css,/text-node-editing\[data-content-state="result"\] \.text-node-shell\.is-manual-editing\{[\s\S]*?height:100%!important;[\s\S]*?border:0!important;[\s\S]*?border-radius:0!important;[\s\S]*?background:transparent!important;/);
  assert.match(css,/text-node-editing\[data-content-state="result"\] \.text-node-editor\{[\s\S]*?height:100%!important;[\s\S]*?border:0!important;[\s\S]*?background:transparent!important;/);
});

test('single-surface text editor stylesheet is cache busted',()=>{
  assert.match(index,/text-node\.css\?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1&edit=single-surface-1/);
});
