from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
rich=ROOT/'script-final-prompt-rich-v1.js'
v2=ROOT/'script-final-prompt-v2.js'
boot=ROOT/'browser-bootstrap.js'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing pattern: {label}')
    return text.replace(old,new,1)

# Production-grade rich composer: include full script source and expose per-shot compose.
s=rich.read_text()
s=replace_once(s,
    "6. previousShot / nextShot 只用于连续性和指代理解，不得把相邻镜头内容混入当前镜头。\\\n7. 输入里只要出现手机屏幕、手部交互、餐具、门窗、说话口型、人物朝向等容易出错关系，就必须写成明确约束。\\\n8. 不要拿“电影感、高清、细节丰富”充数；系统会单独追加全局视觉风格。",
    "6. previousShot / nextShot 只用于连续性和指代理解，不得把相邻镜头内容混入当前镜头。\\\n7. scriptSource 是完整剧本原文，必须用于理解人物关系、事件因果、情绪、指代和当前镜头在剧情中的真实作用；不得只根据单镜头局部字段猜剧情。\\\n8. 输入里只要出现手机屏幕、手部交互、餐具、门窗、说话口型、人物朝向等容易出错关系，就必须写成明确约束。\\\n9. 不要拿“电影感、高清、细节丰富”充数；系统会单独追加全局视觉风格。",
    'rich instruction scriptSource')
s=replace_once(s,
    "payload={globalStyle:ctx.style,currentShot:ctx.shot,associatedAssets:",
    "payload={scriptSource:text(ctx.node?.sourceText||''),globalStyle:ctx.style,currentShot:ctx.shot,associatedAssets:",
    'rich single payload')
s=replace_once(s,
    "payload={globalStyle:text(data.globalStyle?.text||data.style),shots:",
    "payload={scriptSource:text(hit.node?.sourceText||''),globalStyle:text(data.globalStyle?.text||data.style),shots:",
    'rich batch payload')
s=replace_once(s,
    "aiInstruction({shots:payload.shots,globalStyle:payload.globalStyle},'每个 shot 自己的 duration')",
    "aiInstruction({scriptSource:payload.scriptSource,shots:payload.shots,globalStyle:payload.globalStyle},'每个 shot 自己的 duration')",
    'rich batch prompt payload')
s=replace_once(s,
    "async function bulk(){if(bulkRunning)return;",
    "async function composeOne(shotId,onProgress){const ctx=base.shotContext(shotId);if(!ctx)throw new Error('找不到当前镜头');const result=await aiOne(ctx,onProgress);await commit([{id:String(shotId),...result}]);return result}\n\nasync function bulk(){if(bulkRunning)return;",
    'rich composeOne')
s=replace_once(s,
    "globalThis.FuietFinalPromptProduction=Object.freeze({version:1,compileImage,compileVideo,ruleCompose,openRich,bulk});",
    "globalThis.FuietFinalPromptProduction=Object.freeze({version:2,compileImage,compileVideo,ruleCompose,openRich,composeOne,bulk});",
    'rich export')
rich.write_text(s)

# V2 fallback composer: carry the same full-script context so legacy calls behave consistently.
s=v2.read_text()
s=replace_once(s,
    "const payload={\n    globalStyle:ctx.style,",
    "const payload={\n    scriptSource:text(ctx.node?.sourceText||''),\n    globalStyle:ctx.style,",
    'v2 single payload')
s=replace_once(s,
    "const payload={globalStyle:text(data.globalStyle?.text||data.style),assets:",
    "const payload={scriptSource:text(node?.sourceText||''),globalStyle:text(data.globalStyle?.text||data.style),assets:",
    'v2 batch payload')
s=replace_once(s,
    "资产名称需要时使用 @资产名。previousShot / nextShot 只用于理解上下文与指代，最终只描述 currentShot。",
    "资产名称需要时使用 @资产名。scriptSource 是完整剧本原文，必须用于理解人物关系、事件因果、情绪和当前镜头在整段剧情中的作用；previousShot / nextShot 只用于理解上下文与指代，最终只描述 currentShot。",
    'v2 single instruction')
s=replace_once(s,
    "不得改变剧本事实，不得新增人物/道具；前后镜头只用于上下文理解；引用资产时使用 @资产名。",
    "必须结合 scriptSource 完整剧本理解人物关系、事件因果、情绪和指代；不得改变剧本事实，不得新增人物/道具；前后镜头只用于上下文理解；引用资产时使用 @资产名。",
    'v2 batch instruction')
v2.write_text(s)

# Browser bootstrap: load V4 after V3 and its CSS last so it can intentionally replace the table.
s=boot.read_text()
s=replace_once(s,
    "const shotEditorV='20260907-shot-editor-inline-mentions-2';",
    "const shotEditorV='20260907-shot-editor-inline-mentions-2';\nconst promptWorkbenchV='20260907-final-prompt-workbench-v4-1';",
    'bootstrap version')
s=replace_once(s,
    "`./script-final-prompt-page-v3.js?v=${promptV}`,",
    "`./script-final-prompt-page-v3.js?v=${promptV}`,\n  `./script-final-prompt-workbench-v4.js?v=${promptWorkbenchV}`,",
    'bootstrap script')
s=replace_once(s,
    "loadStyle(`./styles/script-final-prompt-page-v3-fit.css?v=${promptV}`),",
    "loadStyle(`./styles/script-final-prompt-page-v3-fit.css?v=${promptV}`),\n      loadStyle(`./styles/script-final-prompt-workbench-v4.css?v=${promptWorkbenchV}`),",
    'bootstrap css')
boot.write_text(s)

# Focused source-level regression tests.
t=ROOT/'tests'/'script-final-prompt-workbench-v4.test.mjs'
t.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='_read_123_zip_20260821_180410';
const workbench=fs.readFileSync(`${root}/script-final-prompt-workbench-v4.js`,'utf8');
const css=fs.readFileSync(`${root}/styles/script-final-prompt-workbench-v4.css`,'utf8');
const rich=fs.readFileSync(`${root}/script-final-prompt-rich-v1.js`,'utf8');
const v2=fs.readFileSync(`${root}/script-final-prompt-v2.js`,'utf8');
const boot=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('V4 replaces dense V3 table with shot workbench cards',()=>{
  assert.match(workbench,/class=\\"fpv4-card/);
  assert.match(workbench,/镜头输入/);
  assert.match(workbench,/分镜图提示词/);
  assert.match(workbench,/视频提示词/);
  assert.match(css,/\.fpv4-prompts-active \.fpv3-page\{display:none!important\}/);
});

test('workbench exposes all requested shot synthesis inputs',()=>{
  for(const token of ['duration','shotSize','cameraMovement','lighting','action','dialogue','sound','assets'])assert.match(workbench,new RegExp(token));
  assert.match(workbench,/剧情 \/ 视觉风格/);
  assert.match(workbench,/完整剧本/);
});

test('manual editing writes through canonical hidden final prompt controls',()=>{
  assert.match(workbench,/data-fpv4-prompt/);
  assert.match(workbench,/\[data-final-\$\{type\}\]/);
  assert.match(workbench,/dispatchEvent\(new Event\('change'/);
  assert.match(workbench,/自动保存/);
});

test('production AI synthesis receives full script source',()=>{
  assert.match(rich,/scriptSource:text\(ctx\.node\?\.sourceText\|\|''\)/);
  assert.match(rich,/scriptSource:text\(hit\.node\?\.sourceText\|\|''\)/);
  assert.match(rich,/scriptSource 是完整剧本原文/);
  assert.match(v2,/scriptSource:text\(ctx\.node\?\.sourceText\|\|''\)/);
  assert.match(v2,/scriptSource:text\(node\?\.sourceText\|\|''\)/);
});

test('single-shot AI compose is available to workbench',()=>{
  assert.match(rich,/async function composeOne\(shotId,onProgress\)/);
  assert.match(rich,/Object\.freeze\(\{version:2,[^}]*composeOne,bulk\}\)/);
  assert.match(workbench,/production\.composeOne/);
});

test('bootstrap loads workbench after V3 with isolated cache key',()=>{
  const v3=boot.indexOf('script-final-prompt-page-v3.js');
  const v4=boot.indexOf('script-final-prompt-workbench-v4.js');
  assert.ok(v3>=0&&v4>v3);
  assert.match(boot,/promptWorkbenchV='20260907-final-prompt-workbench-v4-1'/);
  assert.match(boot,/script-final-prompt-workbench-v4\.css/);
});
''')
print('Final prompt workbench V4 runtime patch applied.')
