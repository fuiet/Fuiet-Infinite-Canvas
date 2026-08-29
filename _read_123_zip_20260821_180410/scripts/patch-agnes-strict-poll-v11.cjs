const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const write=(name,s)=>fs.writeFileSync(path.join(root,name),s);
const VERSION='20260829-agnes-poll-exact-1';

{
  const file='video-protocol-registry.js';
  let s=read(file);
  const old="return{...base,profile:'agnes:'+modelId,createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:poll,pollPathCandidates:[poll],taskIdPath:'video_id'";
  const next="return{...base,profile:'agnes:'+modelId,createPath:'/v1/videos',createCandidates:['/v1/videos'],pollPath:poll,pollPathCandidates:[poll],strictPollPath:true,taskIdPath:'video_id'";
  if(!s.includes(old))throw new Error('Agnes profile pattern not found');
  s=s.replace(old,next);
  write(file,s);
}

{
  const file='browser-runtime.js';
  let s=read(file);
  const old=`function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){\n  const out=[],add=value=>{const url=videoRouteCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};\n  const responseUrl=Core?.firstPath?Core.firstPath(createdRaw,['poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl','data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl','links.status','links.poll','links.self','task.status_url','task.poll_url']):'';add(responseUrl);\n  add(joinUrl(provider.baseUrl,matchingPollPath(createPath,taskId,route)));\n  for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));`;
  const next=`function videoPollUrlCandidates(provider,createdRaw,createPath,taskId,route){\n  const out=[],add=value=>{const url=videoRouteCandidate(provider,value);if(url&&!out.includes(url))out.push(url)};\n  if(route?.strictPollPath===true){\n    if(route.pollPath)add(joinUrl(provider.baseUrl,fillTemplate(route.pollPath,{taskId})));\n    for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));\n    return out;\n  }\n  const responseUrl=Core?.firstPath?Core.firstPath(createdRaw,['poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl','data.poll_url','data.pollUrl','data.status_url','data.statusUrl','data.task_url','data.taskUrl','links.status','links.poll','links.self','task.status_url','task.poll_url']):'';add(responseUrl);\n  add(joinUrl(provider.baseUrl,matchingPollPath(createPath,taskId,route)));\n  for(const template of (Array.isArray(route.pollPathCandidates)?route.pollPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));`;
  if(!s.includes(old))throw new Error('videoPollUrlCandidates pattern not found');
  s=s.replace(old,next);
  const oldResume=`  }else{\n    if(!pollCandidates.length)pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);\n    updateTask(task.id,{status:task.providerStatus==='succeeded'?'result_pending':'polling'`;
  const nextResume=`  }else{\n    if(route?.strictPollPath===true){pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);activePollUrl=''}\n    else if(!pollCandidates.length)pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);\n    updateTask(task.id,{status:task.providerStatus==='succeeded'?'result_pending':'polling'`;
  if(!s.includes(oldResume))throw new Error('resume poll candidate pattern not found');
  s=s.replace(oldResume,nextResume);
  write(file,s);
}

for(const file of ['index.html','models.html']){
  let s=read(file);
  s=s.replaceAll('20260829-agnes-fixed-adapter-1',VERSION).replaceAll('20260829-workflow-visual-fix-1',VERSION);
  write(file,s);
}
{
  const file='browser-bootstrap.js';let s=read(file);
  s=s.replace("const v='20260829-workflow-visual-fix-1';",`const v='${VERSION}';`);
  write(file,s);
}
{
  const file='tests/video-result-cache-bust.test.mjs';let s=read(file);
  s=s.replace(/const REGISTRY_VERSION='[^']+';/,`const REGISTRY_VERSION='${VERSION}';`)
     .replace(/const APP_VERSION='[^']+';/,`const APP_VERSION='${VERSION}';`)
     .replace(/const BOOTSTRAP_VERSION='[^']+';/,`const BOOTSTRAP_VERSION='${VERSION}';`);
  write(file,s);
}
{
  const file='tests/video-error-reporting.test.mjs';let s=read(file);
  s=s.replaceAll('20260829-agnes-fixed-adapter-1',VERSION).replaceAll('20260829-workflow-visual-fix-1',VERSION);
  write(file,s);
}
{
  const file='tests/agnes-fixed-adapter.test.mjs';let s=read(file);
  s += `\n\ntest('Agnes browser polling uses only the documented agnesapi route and heals persisted generic poll urls',()=>{\n  const registry=read('video-protocol-registry.js');\n  const browser=read('browser-runtime.js');\n  assert.match(registry,/strictPollPath:true/);\n  assert.match(browser,/if\\(route\\?\\.strictPollPath===true\\)\\{/);\n  assert.match(browser,/return out;\\n  \\}\\n  const responseUrl=/);\n  assert.match(browser,/if\\(route\\?\\.strictPollPath===true\\)\\{pollCandidates=videoPollUrlCandidates\\(provider,null,usedCreatePath,taskId,route\\);activePollUrl=''\\}/);\n});\n`;
  write(file,s);
}
console.log('Agnes strict poll fix applied');
