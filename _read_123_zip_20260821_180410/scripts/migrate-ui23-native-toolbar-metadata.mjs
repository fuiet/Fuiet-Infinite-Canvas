import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const appPath = new URL('../app.js', import.meta.url);
const uiPath = new URL('../ui-v23.js', import.meta.url);
const connectPath = new URL('../ui-connect-v23.js', import.meta.url);
const indexPath = new URL('../index.html', import.meta.url);
const testsPath = new URL('../tests/ui-design-system.test.mjs', import.meta.url);
const resultRuntimePath = new URL('../ui-result-v23.js', import.meta.url);

let app = readFileSync(appPath, 'utf8');
let ui = readFileSync(uiPath, 'utf8');
let connect = readFileSync(connectPath, 'utf8');
let index = readFileSync(indexPath, 'utf8');
let tests = readFileSync(testsPath, 'utf8');

const replaceOnce = (source, pattern, replacement, label) => {
  const matches = source.match(pattern);
  if (!matches || matches.length !== 1) throw new Error(`${label}: expected exactly one match, got ${matches?.length || 0}`);
  return source.replace(pattern, replacement);
};

// 1) Native media metadata lifecycle in app.js.
if (app.includes('function uiV23BindMediaMetadata')) throw new Error('native media metadata already installed');
const helperPattern = /  function uiV23ProgressHtml\(n,taskState\)\{[\s\S]*?\n  \}\n\n  function renderNode\(n\)\{/;
const helperMatch = app.match(helperPattern)?.[0];
if (!helperMatch) throw new Error('uiV23ProgressHtml/renderNode anchor not found');
const progressFn = helperMatch.slice(0, helperMatch.lastIndexOf('\n\n  function renderNode'));
const metadataHelpers = `${progressFn}
  function uiV23FormatMediaDuration(seconds){
    const value=Number(seconds);if(!Number.isFinite(value)||value<=0)return'';const total=Math.round(value),hours=Math.floor(total/3600),minutes=Math.floor((total%3600)/60),secs=total%60;return hours>0?\`${'${hours}'}:${'${String(minutes).padStart(2,\'0\')}'}:${'${String(secs).padStart(2,\'0\')}'}\`:\`${'${String(minutes).padStart(2,\'0\')}'}:${'${String(secs).padStart(2,\'0\')}'}\`;
  }
  function uiV23BindMediaMetadata(n,el){
    const meta=$('[data-node-result-meta]',el);if(!meta)return;
    const apply=text=>{const value=String(text||'').trim();meta.textContent=value;meta.hidden=!value;};
    if(n.type==='image'){
      const image=$('img',el);if(!image)return apply('');
      const update=()=>apply(image.naturalWidth&&image.naturalHeight?\`${'${image.naturalWidth}'} × ${'${image.naturalHeight}'}\`:'');
      if(image.complete)update();else image.addEventListener('load',update,{once:true});return;
    }
    if(n.type==='video'){
      const video=$('video',el);if(!video)return apply('');
      const update=()=>{const resolution=video.videoWidth&&video.videoHeight?\`${'${video.videoWidth}'} × ${'${video.videoHeight}'}\`:'';const duration=uiV23FormatMediaDuration(video.duration);apply([resolution,duration].filter(Boolean).join(' · '));};
      if(video.readyState>=1)update();else video.addEventListener('loadedmetadata',update,{once:true});return;
    }
    if(n.type==='audio'){
      const audio=$('audio',el);if(!audio)return apply('');
      const update=()=>apply(uiV23FormatMediaDuration(audio.duration));if(audio.readyState>=1)update();else audio.addEventListener('loadedmetadata',update,{once:true});return;
    }
    apply('');
  }

  function renderNode(n){`;
app = app.replace(helperPattern, metadataHelpers);

const renderStart = app.indexOf('  function renderNode(n){');
const renderEnd = app.indexOf('\n\n  function nodePortWorldPoint', renderStart);
if (renderStart < 0 || renderEnd < 0) throw new Error('renderNode block not found');
let renderBlock = app.slice(renderStart, renderEnd);
if (!renderBlock.includes('const resizeHtml=')) throw new Error('renderNode resize anchor missing');
renderBlock = renderBlock.replace(
  /(    const resizeHtml=.*?;\n)/,
  `$1    const resultMetaHtml=mediaResult?'<span class="ui-v23-result-meta" data-node-result-meta hidden></span>':'';\n`
);
if (!renderBlock.includes('<button class="node-menu-btn" aria-label="更多">')) throw new Error('node menu anchor missing');
renderBlock = renderBlock.replace('<button class="node-menu-btn" aria-label="更多">', '${resultMetaHtml}<button class="node-menu-btn" aria-label="更多">');
if (!renderBlock.includes("    el.addEventListener('pointerdown'")) throw new Error('renderNode event anchor missing');
renderBlock = renderBlock.replace("    el.addEventListener('pointerdown'", "    uiV23BindMediaMetadata(n,el);\n    el.addEventListener('pointerdown'");
app = app.slice(0, renderStart) + renderBlock + app.slice(renderEnd);

// 2) Native result-only context toolbar in app.js.
const toolbarPattern = /  function selectedToolbarNode\(\)\{[\s\S]*?\n\n  function defaultCapabilities\(/;
const toolbarReplacement = `  function selectedToolbarNode(){const ids=currentSelectionIds();if(ids.length!==1)return null;return state.nodes.find(n=>n.id===ids[0])||null}
  function nodeTopBarActions(n){
    if(!n)return[];
    if(n.type==='image')return[{label:'编辑图片',tool:'图像工作台',primary:true},{label:'转视频',action:'image-video'},{label:'高清',tool:'高清'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
    if(n.type==='video')return[{label:'编辑视频',tool:'视频工作台',primary:true},{label:'续写',tool:'智能续写'},{label:'合成',tool:'视频合成'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
    if(n.type==='audio')return[{label:'截取',tool:'截取',primary:true},{label:'变速',tool:'变速'},{label:'切分',tool:'切分'},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
    if(n.type==='script')return[{label:'编辑脚本',tool:'打开脚本',primary:true},{label:'看板',tool:'整集看板'},{label:'批量生成',action:'script-batch'},{label:'改生成提示',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
    if(n.type==='director')return[{label:'打开导演台',tool:'打开导演台',primary:true},{label:'截图',tool:'截图'},{label:'更多',action:'more'}];
    return[{label:'复制',tool:'复制',primary:true},{label:'改提示词',action:'edit-prompt'},{label:'重新生成',action:'rerun'},{label:'更多',action:'more'}];
  }
  function openTopBarMore(n,anchor){const r=anchor.getBoundingClientRect();showContextMenu(Math.min(window.innerWidth-280,r.left),r.bottom+5,n.id)}
  function openNativeResultComposer(n,mode='edit'){
    if(!n||!['image','video','audio','text','script'].includes(n.type))return;
    expandedNodeId=n.id;selectedId=n.id;state.selectedIds=[n.id];state.nodes.forEach(x=>x.selected=x.id===n.id);renderToolbar();renderGenerator();
    setTimeout(()=>$('#promptInput,#scriptDetailPrompt,textarea',generator)?.focus(),0);
    if(mode==='rerun')showToast('确认参数后重新生成');
  }
  function runTopBarAction(n,a,anchor){
    if(a.tool)return toolAction(a.tool,n);
    if(a.action==='image-video'){runTransaction('创建图转视频',()=>{createDerivedNode(n,'video','图转视频',n.prompt||'保持主体与构图连续，自然运动',{operation:'image_to_video'},430)});return}
    if(a.action==='script-batch'){openScriptEditor(n,'batch-image');return}
    if(a.action==='edit-prompt'){openNativeResultComposer(n,'edit');return}
    if(a.action==='rerun'){openNativeResultComposer(n,'rerun');return}
    if(a.action==='duplicate'){duplicateSelection(n.id,false);return}
    if(a.action==='more')openTopBarMore(n,anchor);
  }
  function renderToolbar(){
    const ids=currentSelectionIds();
    if(ids.length>1){
      const r=viewport.getBoundingClientRect();
      toolbar.style.left=Math.max(76,Math.min(window.innerWidth-620,r.left+r.width/2-280))+'px';toolbar.style.top='54px';
      toolbar.removeAttribute('data-media-type');toolbar.classList.remove('node-toolbar-media','node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');
      toolbar.innerHTML=\`<span class="selection-toolbar-label">已选 ${'${ids.length}'}</span><button class="tool-btn primary" data-multi-top="batch-connect">批量连接</button><button class="tool-btn" data-multi-top="group">打组</button><button class="tool-btn" data-multi-top="workflow">保存工作流</button><button class="tool-btn" data-multi-top="run">整组执行</button><button class="tool-btn" data-multi-top="layout">整理</button><button class="tool-btn danger" data-multi-top="delete">删除</button>\`;
      toolbar.classList.remove('hidden');
      $$('[data-multi-top]',toolbar).forEach(b=>b.onclick=()=>{const a=b.dataset.multiTop;if(a==='batch-connect')openBatchConnectDialog();if(a==='group')createGroup(ids,'工作流组','workflow');if(a==='workflow')saveWorkflowFromSelection();if(a==='run')executeWorkflowIds(ids,{title:'选中节点执行'});if(a==='layout')openAutoLayoutMenu();if(a==='delete')deleteSelection();});return;
    }
    const n=selectedToolbarNode(),contentState=n?uiV23NodeContentState(n):'empty';
    if(!n||contentState!=='result'||expandedNodeId===n.id){toolbar.classList.add('hidden');return}
    const el=\`.node[data-id="${'${CSS.escape(String(n.id))}'}"]\`;
    const nodeEl=$(el);if(!nodeEl){toolbar.classList.add('hidden');return}
    const r=nodeEl.getBoundingClientRect(),actions=nodeTopBarActions(n);
    toolbar.style.left=Math.max(68,Math.min(window.innerWidth-620,r.left))+'px';toolbar.style.top=Math.max(45,r.top-40)+'px';
    toolbar.classList.remove('node-toolbar-text','node-toolbar-image','node-toolbar-video','node-toolbar-audio','node-toolbar-script','node-toolbar-director');toolbar.classList.add('node-toolbar-media','node-toolbar-'+n.type);toolbar.dataset.mediaType=n.type;
    toolbar.innerHTML=\`<span class="selection-toolbar-label">${'${escapeHtml(labelForType(n.type))}'}结果</span>\`+actions.map((a,i)=>\`<button class="tool-btn ${'${a.primary?\'primary\':\'\'}'}" data-top-action="${'${i}'}">${'${escapeHtml(a.label)}'}</button>\`).join('');toolbar.classList.remove('hidden');
    $$('[data-top-action]',toolbar).forEach(b=>b.onclick=()=>runTopBarAction(n,actions[Number(b.dataset.topAction)],b));
  }

  function defaultCapabilities(`;
app = replaceOnce(app, toolbarPattern, toolbarReplacement, 'native toolbar section');

if (!app.includes('function uiV23BindMediaMetadata')) throw new Error('metadata helper missing');
if (!app.includes("contentState!=='result'")) throw new Error('result-only toolbar guard missing');
if (!app.includes("label:'编辑图片'")) throw new Error('native image toolbar missing');
if (!app.includes("label:'改生成提示'")) throw new Error('native script toolbar missing');

// 3) ui-v23.js keeps positioning/composer behavior but stops pruning native toolbar buttons.
const decorateNeedle = `  const decorateContextToolbar = (node) => {\n    if (!toolbar || !node?.dataset.id) return;\n    const type = nodeType(node);\n    const config = RESULT_TOOLBAR_CONFIG[type] || RESULT_TOOLBAR_CONFIG.text;`;
if (!ui.includes(decorateNeedle)) throw new Error('decorateContextToolbar anchor missing');
ui = ui.replace(decorateNeedle, `  const decorateContextToolbar = (node) => {
    if (!toolbar || !node?.dataset.id) return;
    const type = nodeType(node);
    if (node.dataset.uiV23Native === 'true') {
      toolbar.classList.add('node-toolbar-media');
      NODE_TYPES.forEach((candidate) => toolbar.classList.toggle(\`node-toolbar-\${candidate}\`, candidate === type));
      toolbar.dataset.mediaType = type;
      return;
    }
    const config = RESULT_TOOLBAR_CONFIG[type] || RESULT_TOOLBAR_CONFIG.text;`);

// 4) Result shell stylesheet becomes first-class HTML; runtime result decorator is retired.
if (!index.includes('./styles/result-shell.css')) {
  index = index.replace('  <link rel="stylesheet" href="./styles/context-toolbar.css" />', '  <link rel="stylesheet" href="./styles/context-toolbar.css" />\n  <link rel="stylesheet" href="./styles/result-shell.css" />');
}
const connectBootstrap = /  if \(!document\.querySelector\('link\[data-ui-v23-result-shell\]'\)\) \{[\s\S]*?import\('\.\/ui-result-v23\.js'\)\.catch\([^\n]*\);\n\n/;
if (!connectBootstrap.test(connect)) throw new Error('ui-connect result bootstrap not found');
connect = connect.replace(connectBootstrap, '');

// 5) Update architecture regression tests to the native implementation.
tests = replaceOnce(tests, /test\('result context toolbar is pruned by media type instead of exposing one generic action set',[\s\S]*?\n\}\);/, `test('result context toolbar is generated natively by media type', () => {
  const app = read('app.js');
  const runtime = read('ui-v23.js');
  const css = read('styles/context-toolbar.css');
  assert.match(app, /function nodeTopBarActions/);
  assert.match(app, /label:'编辑图片'/);
  assert.match(app, /label:'编辑视频'/);
  assert.match(app, /label:'截取'/);
  assert.match(app, /label:'编辑脚本'/);
  assert.match(app, /label:'打开导演台'/);
  assert.match(app, /action:'edit-prompt'/);
  assert.match(app, /action:'rerun'/);
  assert.match(app, /contentState!=='result'/);
  assert.match(runtime, /node\.dataset\.uiV23Native === 'true'/);
  assert.match(css, /node-toolbar-image/);
  assert.match(css, /node-toolbar-video/);
  assert.match(css, /node-toolbar-audio/);
  assert.match(css, /node-toolbar-script/);
  assert.match(css, /node-toolbar-director/);
});`, 'toolbar architecture test');

tests = replaceOnce(tests, /test\('result-first shell is emitted by app\.js while metadata stays progressively enhanced',[\s\S]*?\n\}\);/, `test('result-first shell and media metadata are emitted by app.js', () => {
  const app = read('app.js');
  const html = read('index.html');
  const connect = read('ui-connect-v23.js');
  const css = read('styles/result-shell.css');
  assert.match(html, /styles\/result-shell\.css/);
  assert.doesNotMatch(connect, /ui-result-v23\.js/);
  assert.match(app, /ui-v23-media-result/);
  assert.match(app, /ui-v23-version-nav/);
  assert.match(app, /data-version-count/);
  assert.match(app, /function uiV23BindMediaMetadata/);
  assert.match(app, /data-node-result-meta/);
  assert.match(app, /videoWidth/);
  assert.match(app, /naturalWidth/);
  assert.match(app, /loadedmetadata/);
  assert.match(css, /ui-v23-version-nav/);
  assert.match(css, /ui-v23-resize-handle/);
  assert.match(css, /node\.ui-v23-media-result/);
});`, 'result shell metadata test');

tests = replaceOnce(tests, /test\('native nodes bypass legacy state and result decorators',[\s\S]*?\n\}\);/, `test('native nodes bypass legacy state decoration and no result decorator runtime remains', () => {
  const runtime = read('ui-v23.js');
  const connect = read('ui-connect-v23.js');
  assert.match(runtime, /node\.dataset\.uiV23Native === 'true'/);
  assert.match(runtime, /const task = node\.getAttribute\('data-task-state'\)/);
  assert.doesNotMatch(connect, /ui-result-v23\.js/);
});`, 'native decorator retirement test');

writeFileSync(appPath, app, 'utf8');
writeFileSync(uiPath, ui, 'utf8');
writeFileSync(connectPath, connect, 'utf8');
writeFileSync(indexPath, index, 'utf8');
writeFileSync(testsPath, tests, 'utf8');
if (existsSync(resultRuntimePath)) unlinkSync(resultRuntimePath);
console.log('Native UI 2.3 context toolbar and media metadata migration applied');
