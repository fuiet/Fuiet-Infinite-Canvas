import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/script-editor-simplified-v1.css',import.meta.url),'utf8');

test('shot table keeps ten requested columns while shot rows stay dynamic',()=>{
  const start=app.indexOf('function scriptShotsHtml(n,d)');
  const end=app.indexOf('function scriptWorkflowStats(d)',start);
  const fn=app.slice(start,end);
  for(const title of ['镜号','时长','画面描述','景别','光影氛围','对白 / 旁白','音效','运镜','最终提示词','操作'])assert.ok(fn.includes(`<th>${title}</th>`),title);
  for(const removed of ['<th>场景</th>','<th>角色</th>','<th>道具</th>','<th>资产引用</th>','<th>生产</th>','<th>顺序</th>'])assert.ok(!fn.includes(removed),removed);
  assert.ok(fn.includes('d.shots.map((s,i)=>'), 'AI-produced shot count remains dynamic');
});

test('visual description editor supports @ asset mentions and syncs hidden shot metadata',()=>{
  assert.ok(app.includes('openShotDescriptionEditor'));
  assert.ok(app.includes("lastIndexOf('@')"));
  assert.ok(app.includes("shot.assetRefs=mentioned.map(a=>a.id)"));
  assert.ok(app.includes("shot.characters=mentioned.filter"));
  assert.ok(app.includes("shot.scene=scenes[0]||''"));
  assert.ok(app.includes("shot.props=mentioned.filter"));
});

test('script studio is true fullscreen and only exposes the three production steps',()=>{
  assert.ok(app.includes("featureModal.classList.add('script-studio-fullscreen')"));
  assert.ok(css.includes('.feature-modal.script-studio-fullscreen'));
  assert.ok(css.includes('width:100vw!important'));
  assert.ok(css.includes('height:100vh!important'));
  const editorStart=app.indexOf("modalShell('Script Studio · 分镜故事板'");
  const editorEnd=app.indexOf("const c=$('#scriptEditorContent')",editorStart);
  const editor=app.slice(editorStart,editorEnd);
  assert.ok(!editor.includes('script-secondary-tabs'));
});

test('script studio typography is enlarged by two pixels and centered',()=>{
  assert.ok(css.includes('/* Script Studio typography: +2px across the editor and centered throughout. */'));
  assert.ok(css.includes('.script-editor-shell.simplified .script-workflow-head.simplified .script-step b{font-size:13px}'));
  assert.ok(css.includes('.script-editor-shell.simplified .script-editor-table.simplified th{font-size:12px;text-align:center!important}'));
  assert.ok(css.includes('.script-editor-shell.simplified .script-editor-table.simplified textarea,.script-editor-shell.simplified .script-editor-table.simplified select,.script-editor-shell.simplified .script-editor-table.simplified input{font-size:13px;text-align:center!important}'));
  assert.ok(css.includes('.script-editor-shell.simplified .shot-description-cell{font-size:13px;text-align:center;display:flex;align-items:center;justify-content:center}'));
  assert.ok(css.includes('.script-editor-shell.simplified .shot-final-prompt{font-size:11px;text-align:center;align-items:center;justify-content:center}'));
});
