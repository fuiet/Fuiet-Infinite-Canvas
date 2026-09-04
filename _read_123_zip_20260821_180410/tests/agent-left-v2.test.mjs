import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../agent-left-v2.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/agent-left-v2.css',import.meta.url),'utf8');
const topCss=fs.readFileSync(new URL('../styles/agent-panel-top-v1.css',import.meta.url),'utf8');

test('Agent right surface is cache-busted and loaded after the native Agent engine',()=>{
  assert.match(index,/browser-bootstrap\.js\?v=20260904-script-skill-pack-1/);
  assert.match(bootstrap,/const v='20260904-script-skill-pack-1'/);
  assert.match(bootstrap,/script-assets-reference-v1\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/agent-left-v2\.js\?v=\$\{v\}/);
  assert.match(bootstrap,/agent-left-v2\.css\?v=\$\{v\}/);
  assert.match(bootstrap,/agent-panel-top-v1\.css\?v=\$\{v\}/);
});

test('Agent is immediately after Settings and docks from the right',()=>{
  assert.match(index,/id="settingsBtn"[\s\S]*id="agentBtn"/);
  assert.match(js,/settingsButton\.insertAdjacentElement\('afterend',agentButton\)/);
  assert.match(css,/#agentPanel\{[\s\S]*right:0!important/);
  assert.match(css,/\.app-shell\.agent-open \.canvas-viewport\{[\s\S]*right:404px!important/);
});

test('Agent panel is fixed to viewport top and overlays the toolbar area',()=>{
  assert.match(topCss,/position:fixed!important/);
  assert.match(topCss,/inset:0 0 0 auto!important/);
  assert.match(topCss,/height:100dvh!important/);
  assert.match(topCss,/z-index:10000!important/);
  assert.match(js,/function forceViewportPanelStyles\(\)/);
  assert.match(js,/set\('top','0'\)/);
  assert.match(js,/set\('z-index','10000'\)/);
});

test('blank Agent panels are replaced by a visible recovery shell',()=>{
  assert.match(js,/function panelMeaningful\(\)/);
  assert.match(js,/renderRecoveryPanel\(true\)/);
  assert.match(js,/agent-recovery-shell/);
  assert.match(css,/\.agent-left-v2 \.agent-recovery-shell\{[\s\S]*display:flex/);
});

test('selected canvas nodes become Agent context chips',()=>{
  assert.match(js,/\.node\.selected,\.node\.multi-selected/);
  assert.match(js,/agent-context-strip-v2/);
  assert.match(js,/agent-context-chip-v2/);
  assert.match(js,/一个 Skill，一部作品/);
});

test('recovery mode can reconnect to the native Agent and send through its real send control',()=>{
  assert.match(js,/async function reconnectNative/);
  assert.match(js,/data-agent-bottom="send"/);
  assert.match(js,/send\.click\(\)/);
  assert.match(css,/\.agent-left-v2 \.agent-send/);
});