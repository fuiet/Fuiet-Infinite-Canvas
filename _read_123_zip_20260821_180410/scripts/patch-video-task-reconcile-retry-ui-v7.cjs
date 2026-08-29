const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const replaceOnce=(s,before,after,label)=>{if(!s.includes(before))throw new Error(`missing ${label}`);return s.replace(before,after)};
const OLD='20260829-kling-transient-poll-retry-1';
const VERSION='20260829-video-task-reconcile-1';

{
  let s=read('app.js');
  const oldMonitor=`      const resultSyncing=['provider_succeeded','result_pending'].includes(info.status);\n      n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=resultSyncing?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':'';saveState();scheduleWorkflowVisualUpdate();`;
  const newMonitor=`      const resultSyncing=['provider_succeeded','result_pending'].includes(info.status),retrying=info.status==='retrying';\n      n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=(resultSyncing||retrying)?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':retrying?'上游服务暂时不可用，正在继续查询原任务…':'';saveState();scheduleWorkflowVisualUpdate();`;
  s=replaceOnce(s,oldMonitor,newMonitor,'monitor retry message');
  const oldAdopt=`const canAdopt=n.taskId&&n.taskProviderId===attempt.providerId&&n.taskModelId===attempt.modelId&&['queued','running','polling','retrying'].includes(n.taskStatus);`;
  const newAdopt=`const canAdopt=n.taskId&&n.taskProviderId===attempt.providerId&&n.taskModelId===attempt.modelId&&['queued','running','polling','retrying','provider_succeeded','result_pending'].includes(n.taskStatus);`;
  s=replaceOnce(s,oldAdopt,newAdopt,'provider success task adoption');
  write('app.js',s);
}

{
  let s=read('browser-bootstrap.js');
  s=replaceOnce(s,`const v='20260828-video-result-reconciliation-1';`,`const v='${VERSION}';`,'bootstrap app cache version');
  write('browser-bootstrap.js',s);
}

for(const file of ['index.html','models.html','tests/video-error-reporting.test.mjs','tests/video-result-cache-bust.test.mjs']){
  let s=read(file);
  s=s.replaceAll(OLD,VERSION).replaceAll('20260828-video-result-reconciliation-1',VERSION);
  write(file,s);
}

{
  let s=read('tests/video-result-reconciliation.test.mjs');
  const anchor=`test('canvas monitor keeps provider-success result synchronization alive',()=>{\n  assert.match(app,/\\['provider_succeeded','result_pending'\\]\\.includes\\(info\\.status\\)/);\n  assert.match(app,/上游已生成，正在同步视频结果…/);\n  assert.match(app,/\\['queued','running','polling','retrying','provider_succeeded','result_pending'\\]\\.includes\\(n\\.taskStatus\\)/);\n});`;
  const replacement=`test('canvas monitor keeps provider-success result synchronization alive',()=>{\n  assert.match(app,/\\['provider_succeeded','result_pending'\\]\\.includes\\(info\\.status\\)/);\n  assert.match(app,/上游已生成，正在同步视频结果…/);\n  assert.match(app,/上游服务暂时不可用，正在继续查询原任务…/);\n  assert.match(app,/\\['queued','running','polling','retrying','provider_succeeded','result_pending'\\]\\.includes\\(n\\.taskStatus\\)/);\n});\n\ntest('canvas re-adopts provider-success tasks instead of creating duplicate generation jobs',()=>{\n  assert.match(app,/const canAdopt=n\\.taskId&&n\\.taskProviderId===attempt\\.providerId&&n\\.taskModelId===attempt\\.modelId&&\\['queued','running','polling','retrying','provider_succeeded','result_pending'\\]\\.includes\\(n\\.taskStatus\\)/);\n});`;
  s=replaceOnce(s,anchor,replacement,'reconciliation tests');
  write('tests/video-result-reconciliation.test.mjs',s);
}

console.log('video task reconciliation UI patch applied');
