import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-node-progress-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('generated script card selects the node and only the open button enters the editor',()=>{
  const readyLine=app.split('\n').find(x=>x.includes('data-script-node-ready='));
  assert.ok(readyLine,'generated script card should have a selectable root');
  assert.ok(readyLine.includes('<div class="script-node-ready"'));
  assert.ok(readyLine.includes('class="script-ready-open" data-open-script='));
  assert.ok(!readyLine.includes('class="script-node-ready" data-open-script='),'the whole generated card must not open the editor');
  assert.match(app,/\$\('\[data-open-script\]',el\)\?\.addEventListener\('click',e=>\{e\.stopPropagation\(\);openScriptEditor\(n\)\}\)/);
  assert.match(app,/\$\('\[data-script-node-ready\]',el\)\?\.addEventListener\('click',e=>\{if\(e\.target\.closest\('\[data-open-script\]'\)\)return;e\.stopPropagation\(\);selectNode\(n\.id\)\}\)/);
});

test('click-selected script result toolbar is the compact three-action bar',()=>{
  const actionLine=app.split('\n').find(x=>x.includes("if(n.type==='script')return["));
  assert.ok(actionLine);
  assert.ok(actionLine.includes("label:'重新生成'"));
  assert.ok(actionLine.includes("label:'批量生成分镜'"));
  assert.ok(actionLine.includes("label:'批量生成视频'"));
  assert.match(app,/if\(n\.type==='script'\)\{\n\s+const estimatedWidth=Math\.min\(window\.innerWidth-32,Math\.max\(430,actions\.length\*132\)\);/);
  assert.ok(!app.includes('node-toolbar-script"><span class="selection-toolbar-label">脚本结果</span>'));
});

test('generated script click shows toolbar and generator together',()=>{
  assert.ok(app.includes("else if(!additive&&target?.type==='script'&&uiV23NodeContentState(target)==='result')expandedNodeId=target.id"));
  assert.ok(app.includes("clickedState==='empty'||(clicked.type==='script'&&clickedState==='result')"));
  assert.ok(app.includes("(expandedNodeId===n.id&&n.type!=='script')"),'expanded script must remain eligible for the toolbar');
  assert.ok(app.includes("if(!expandedNodeId){generator.classList.add('hidden');return}"));
  assert.ok(app.includes("if(n.type==='script'){"));
});

test('script toolbar is centered higher above the node and stays centered on viewport moves',()=>{
  assert.ok(app.includes('const toolbarRect=toolbar.getBoundingClientRect()'));
  assert.ok(app.includes('toolbarGap=30'));
  assert.ok(app.includes('r.left+r.width/2-toolbarWidth/2'));
  assert.ok(app.includes('r.top-toolbarHeight-toolbarGap'));
  assert.ok(app.includes('r.left+r.width/2-tw/2'));
  assert.ok(app.includes('r.top-th-30'));
});

test('script generator is centered below the node',()=>{
  assert.ok(app.includes("const generatorLeft=n?.type==='script'?r.left+r.width/2-desiredWidth/2:r.left-10"));
  assert.ok(app.includes("n.type==='script'?Math.min(660,window.innerWidth-64)"));
});

test('script open control remains button-like and changed assets are cache-busted',()=>{
  assert.match(css,/\.script-ready-open\{[^}]*border:0;[^}]*cursor:pointer/);
  assert.ok(bootstrap.includes("const v='20260903-script-node-compact-2';"));
  assert.ok(bootstrap.includes('&scriptclick=toolbar-3'));
  assert.ok(bootstrap.includes('&scriptgen=panel-4'));
  assert.ok(bootstrap.includes('script-node-progress-v1.css?v=${v}&scriptclick=toolbar-3'));
});
