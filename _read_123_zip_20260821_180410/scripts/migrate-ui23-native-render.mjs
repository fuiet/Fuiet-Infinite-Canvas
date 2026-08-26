import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../app.js', import.meta.url);
let source = readFileSync(path, 'utf8');

const assertOnce = (label, regex) => {
  const matches = source.match(regex);
  if (!matches || matches.length !== 1) {
    throw new Error(`${label}: expected exactly one match, got ${matches?.length || 0}`);
  }
};

const helperAnchor = "  function nodeTypeIconName(type){return({text:'subtitle',image:'image',video:'video',audio:'audio',script:'story',director:'camera'})[type]||'fallback'}\n\n";
if (!source.includes(helperAnchor)) throw new Error('native helper anchor not found');
if (source.includes('function uiV23NodeContentState(n)')) throw new Error('native UI 2.3 helpers already installed');

const helpers = `  function nodeTypeIconName(type){return({text:'subtitle',image:'image',video:'video',audio:'audio',script:'story',director:'camera'})[type]||'fallback'}
  function uiV23NodeContentState(n){
    if(!n)return'empty';
    if(nodeResultVersions(n).length)return'result';
    if(n.type==='image'||n.type==='video')return(n.outputUrl||n.content)?'result':'empty';
    if(n.type==='audio')return n.outputUrl?'result':'empty';
    if(n.type==='text')return String(n.text||n.generatedText||'').trim()?'result':'empty';
    if(n.type==='script')return (ensureScriptData(n).shots||[]).length?'result':'empty';
    if(n.type==='director')return (n.directorData?.objects?.length||n.directorData?.screenshots?.length)?'result':'empty';
    return'empty';
  }
  function uiV23TaskState(visualStatus=''){
    return({pending:'queued',running:'running',failed:'failed',succeeded:'completed',canceled:'cancelled',frozen:'completed'})[visualStatus]||'idle';
  }
  function uiV23ProgressHtml(n,taskState){
    if(!['queued','running'].includes(taskState))return'';
    const value=Number(n.taskProgress),hasRealProgress=Number.isFinite(value)&&value>0&&value<=100;
    const label=taskState==='queued'?'排队中':'生成中';
    const percent=hasRealProgress?Math.round(value):null;
    return \`<div class="ui-v23-result-progress\${hasRealProgress?'':' indeterminate'}\${taskState==='queued'?' queued':''}" data-ui-v23-result-progress role="status" aria-live="polite" aria-label="\${label}\${percent==null?'':\` \${percent}%\`}"><div class="ui-v23-result-progress-copy"><span>\${label}</span><strong>\${percent==null?'':\`\${percent}%\`}</strong></div><div class="ui-v23-result-progress-track"><i\${percent==null?'':\` style="width:\${percent}%"\`}></i></div></div>\`;
  }

`;
source = source.replace(helperAnchor, helpers);

const renderSetup = /  function renderNode\(n\)\{\n[\s\S]*?    let body = '';\n/;
assertOnce('renderNode setup', renderSetup);
source = source.replace(renderSetup, `  function renderNode(n){
    const el = document.createElement('article');
    const multiSelected=(state.selectedIds||[]).includes(n.id);
    const wfInfo=workflowNodeStatus(n.id),wfStatus=workflowStatusClass(wfInfo.status),visualStatus=nodeTaskVisualState(n);
    const versions=nodeResultVersions(n),activeVersionIndex=activeNodeResultIndex(n);
    const contentState=uiV23NodeContentState(n),interactionState=(n.id===selectedId||multiSelected)?'selected':'idle',taskState=uiV23TaskState(visualStatus);
    const mediaResult=contentState==='result'&&['image','video','audio'].includes(n.type);
    el.className = 'node node-'+n.type + (n.id===selectedId ? ' selected':'') + (multiSelected?' multi-selected':'') + (wfStatus?' wf-'+wfStatus:'') + (n.h?' resized-node':'') + (visualStatus?' task-'+visualStatus:'') + (n.locked?' node-locked':'') + (n.frozen?' node-frozen':'') + (contentState==='result'?' ui-v23-result-shell':'') + (mediaResult?\` ui-v23-media-result ui-v23-media-\${n.type}\`:'');
    el.dataset.id = n.id;
    el.dataset.nodeType=n.type;
    el.dataset.contentState=contentState;
    el.dataset.interactionState=interactionState;
    el.dataset.taskState=taskState;
    el.dataset.uiV23Native='true';
    const bigImage=n.type==='image'&&contentState==='empty'&&(interactionState==='selected'||n.id===expandedNodeId);
    el.style.left = n.x+'px'; el.style.top=n.y+'px'; el.style.width=(n.w||320)+'px';if(n.h)el.style.height=nodeHeight(n)+'px';
    let body = '';
`);

const renderChrome = /    const progress=\['pending','running'\]\.includes\(visualStatus\)\?[\s\S]*?    el\.addEventListener\('pointerdown', e => onNodePointerDown\(e,n,el\)\);\n/;
assertOnce('renderNode chrome', renderChrome);
source = source.replace(renderChrome, `    const rawProgress=Number(n.taskProgress),hasRealProgress=Number.isFinite(rawProgress)&&rawProgress>0&&rawProgress<=100;
    const headerStatusLabel=taskState==='queued'?'排队中':taskState==='running'?'生成中':taskState==='failed'?'生成失败':'';
    const showHeaderStatus=contentState==='empty'&&Boolean(headerStatusLabel);
    const versionNav=versions.length?\`<div class="node-result-nav ui-v23-version-nav \${versions.length<2?'single-version':''}" data-version-index="\${activeVersionIndex+1}" data-version-count="\${versions.length}" aria-label="生成版本" title="生成结果版本"><button data-result-prev="\${n.id}" \${versions.length<2?'disabled':''}>‹</button><span>\${activeVersionIndex+1}/\${versions.length}</span><button data-result-next="\${n.id}" \${versions.length<2?'disabled':''}>›</button>\${versions.length>1?\`<button class="compare" data-result-compare="\${n.id}" title="对比版本">对比</button>\`:''}</div>\`:'';
    const failureHtml=taskState==='failed'?\`<div class="node-failed-actions ui-v23-failure"><span>生成失败</span><button data-node-retry="\${n.id}">重新生成</button></div>\`:'';
    const footerHtml=contentState==='empty'?\`<div class="node-footer"><span>\${n.modelName?escapeHtml(n.modelName):(n.type==='director'?'导演台':'')}</span><span style="margin-left:auto">\${taskState==='queued'?'排队中':taskState==='running'?'生成中':''}</span></div>\`:'';
    const resizeHtml=contentState==='result'?\`<div class="node-resize-handle ui-v23-resize-handle" data-node-resize="\${n.id}" title="调整大小" aria-label="调整节点大小"></div>\`:'';
    el.innerHTML = \`
      <div class="node-header"><div class="node-header-left"><span class="node-type-icon">\${uiIcon(nodeTypeIconName(n.type))}</span><span class="node-title-stack"><b>\${escapeHtml(nodeTitleBase(n))}</b><small>\${nodeSequenceNumber(n.id)}</small></span></div><div class="node-header-right">\${n.toolParams?.shotId?\`<button class="node-shot-chip" data-shot-back="\${n.id}">Shot \${scriptShotForProductionNode(n)?.no||''}</button>\`:''}<div class="node-guard-badges">\${n.locked?\`<i title="位置已锁定">\${uiIcon('lock')}</i>\`:''}\${n.frozen?\`<i title="结果已冻结">\${uiIcon('freeze')}</i>\`:''}\${Number(n.fallbackAttempt||0)>0?\`<i title="本次使用备用模型">\${uiIcon('fallback')}</i>\`:''}</div>\${showHeaderStatus?\`<span class="node-run-status \${taskState}">\${headerStatusLabel}\${taskState==='running'&&hasRealProgress?\` \${Math.round(rawProgress)}%\`:''}</span>\`:''}<button class="node-menu-btn" aria-label="更多">\${uiIcon('dotMenu')}</button></div></div>
      <div class="node-body">\${body}</div>
      \${nodeInlineCandidateHtml(n)}
      \${versionNav}
      \${failureHtml}
      \${uiV23ProgressHtml(n,taskState)}
      \${footerHtml}
      <div class="node-port in" title="输入"></div><div class="node-port out" title="输出"></div>
      \${resizeHtml}\`;
    el.addEventListener('pointerdown', e => onNodePointerDown(e,n,el));
`);

if (!source.includes("el.dataset.uiV23Native='true'")) throw new Error('native marker missing after migration');
if (source.includes("((bigImage?640:n.w)||320)")) throw new Error('legacy selected-image 640px sizing remains');
if (source.includes("Math.max(visualStatus==='pending'?4:8")) throw new Error('fake minimum progress remains');

writeFileSync(path, source, 'utf8');
console.log('UI 2.3 native render migration applied');
