import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../script-final-prompt-page-v3.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-final-prompt-page-v3.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('final prompt page exposes one compact production command surface',()=>{
  assert.match(page,/fpv3-commandbar/);
  assert.match(page,/id="fpv3BulkCompose"/);
  assert.match(page,/一键合成全部提示词/);
  assert.doesNotMatch(page,/fpv3-hero/);
  assert.doesNotMatch(page,/第 3 步<\/div>/);
});

test('final prompt page keeps status filters and six production columns',()=>{
  for(const filter of ['all','todo','ready'])assert.match(page,new RegExp(`data-fpv3-filter="${filter}"`));
  for(const label of ['镜号','时长','镜头内容','关联资产','状态','操作'])assert.match(page,new RegExp(label));
  assert.match(page,/查看编辑/);
  assert.match(page,/重新合成/);
  assert.match(page,/合成提示词/);
});

test('final prompt page opens detailed editor and gates batch production',()=>{
  assert.match(page,/production\.openRich/);
  assert.match(page,/id="fpv3ToBatch"/);
  assert.match(page,/scriptPromptsToBatch/);
  assert.match(page,/\$\{s\.todo\?'disabled':''\}/);
});

test('layout gives the shot table the scrollable middle viewport with sticky header and fixed footer',()=>{
  assert.match(css,/\.fpv3-table-shell\{[^}]*flex:1 1 auto[^}]*overflow:auto/);
  assert.match(css,/\.fpv3-table thead\{position:sticky;top:0/);
  assert.match(css,/\.fpv3-footer\{flex:0 0 56px/);
  assert.match(css,/\.fpv3-commandbar\{flex:0 0 52px/);
});

test('browser bootstrap loads final prompt production page and viewport fit styles',()=>{
  assert.match(bootstrap,/script-final-prompt-page-v3\.js/);
  assert.match(bootstrap,/script-final-prompt-page-v3\.css/);
  assert.match(bootstrap,/script-final-prompt-page-v3-fit\.css/);
});
