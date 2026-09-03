import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../agent-left-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/agent-left-v2.css',import.meta.url),'utf8');

test('Agent left surface is cache-busted and loaded after the existing Agent engine',()=>{
  assert.match(index,/browser-bootstrap\.js\?v=20260903-agent-left-v2-1/);
  assert.match(bootstrap,/const v='20260903-agent-left-v2-1'/);
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/agent-left-v2\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/agent-left-v2\.css\?v=\$\{v\}/);
});

test('Agent is a fixed left workspace surface rather than a canvas node',()=>{
  assert.match(js,/agent-left-rail/);
  assert.match(js,/legacyButton\.click\(\)/);
  assert.match(css,/#agentBtn\{display:none!important\}/);
  assert.match(css,/#agentPanel\{[\s\S]*left:0!important;[\s\S]*right:auto!important/);
  assert.match(css,/\.app-shell\.agent-open \.canvas-viewport\{[\s\S]*left:404px!important/);
});

test('selected canvas nodes become Agent context chips',()=>{
  assert.match(js,/\.node\.selected,\.node\.multi-selected/);
  assert.match(js,/agent-context-strip-v2/);
  assert.match(js,/agent-context-chip-v2/);
  assert.match(js,/一个 Skill，一部作品/);
});

test('Agent keeps existing Skill execution and task/context controls intact',()=>{
  assert.match(js,/Enhances the existing Agent engine in app\.js/);
  assert.match(css,/\.agent-left-v2 \.agent-input-actions button/);
  assert.match(css,/\.agent-left-v2 \.agent-send/);
});
