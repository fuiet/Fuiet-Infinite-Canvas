/* Fuiet Infinite Canvas browser-local runtime.
 * Cloudflare is preview transport only. No provider, API key, project, task or media
 * state is persisted on Cloudflare. Existing /api/* calls are emulated in-browser.
 */
(()=>{
'use strict';
if(typeof window==='undefined'||typeof window.fetch!=='function')return;

const rawFetch=window.fetch.bind(window);
const Adapters=globalThis.CanvasProviderAdapters;
const Core=globalThis.CanvasProviderRuntimeCore;
const KEYS={
  providers:'fuiet-browser-providers-v1',
  projects:'fuiet-browser-projects-v1',
  tasks:'fuiet-browser-tasks-v1',
  queue:'fuiet-browser-queue-v1'
};
const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set()};
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const now=()=>new Date().toISOString();
const uid=p=>`${p}${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36)}`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v==null?clone(fallback):v}catch{return clone(fallback)}}
function write(key,value){localStorage.setItem(key,JSON.stringify(value));return value}
function json(body,status=200,headers={}){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}})}
function parseBody(init){if(init?.body==null)return{};if(typeof init.body==='string'){try{return JSON.parse(init.body)}catch{return{}}}return init.body}
function requestInfo(input,init={}){try{const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url,location.href);return{url,method:String(init.method||(input instanceof Request?input.method:'GET')||'GET').toUpperCase()}}catch{return null}}
function safeProvider(p){const x=clone(p||{});const has=Boolean(String(x.apiKey||'').trim());delete x.apiKey;delete x.apiKeyEncrypted;x.hasApiKey=has||x.hasApiKey===true;return x}
function providers(){return read(KEYS.providers,[])}
function saveProviders(list){return write(KEYS.providers,list)}
function projects(){return read(KEYS.projects,[])}
function saveProjects(list){return write(KEYS.projects,list)}
function tasks(){return read(KEYS.tasks,[])}
function saveTasks(list){return write(KEYS.tasks,list.slice(0,300))}
function queueState(){return{paused:false,concurrency:2,...read(KEYS.queue,{})}}
function setQueue(patch){return write(KEYS.queue,{...queueState(),...patch})}
function findProvider(id){return providers().find(p=>String(p.id)===String(id))||null}
function findTask(id){return tasks().find(t=>String(t.id)===String(id))||null}
function updateTask(id,patch){const list=tasks(),i=list.findIndex(t=>t.id===id);if(i<0)return null;list[i]={...list[i],...patch,updatedAt:now()};saveTasks(list);return list[i]}
function upsertTask(task){const list=tasks(),i=list.findIndex(t=>t.id===task.id);if(i>=0)list[i]=task;else list.unshift(task);saveTasks(list);return task}
function normalizeMod(v){v=String(v||'text').toLowerCase();return v==='script'?'text':v}
function fillTemplate(value,ctx){if(typeof value==='string')return value.replace(/\{\{\s*([^}]+)\s*\}\}/g,(_,k)=>{const parts=k.trim().split('.');let cur=ctx;for(const p of parts)cur=cur?.[p];return cur==null?'':typeof cur==='object'?JSON.stringify(cur):String(cur)});if(Array.isArray(value))return value.map(v=>fillTemplate(v,ctx));if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=fillTemplate(v,ctx);return out}return value}
function joinUrl(base,path){if(/^https?:\/\//i.test(String(path||'')))return String(path);const b=new URL(String(base||location.origin));const root=b.pathname.replace(/\/+$/,'');let p=String(path||'');if(!p.startsWith('/'))p='/'+p;if(root&&root!=='/'&&p.startsWith(root+'/'))b.pathname=p;else b.pathname=(root+p).replace(/\/{2,}/g,'/');b.search='';b.hash='';return b.toString()}
function authCandidates(provider){const key=String(provider?.apiKey||'').trim(),list=[];if(!key)return[{}];const configured=String(provider?.authHeader||'').trim();if(configured){const scheme=String(provider?.authScheme||'').trim();list.push({[configured]:scheme?`${scheme} ${key}`:key})}list.push({Authorization:`Bearer ${key}`},{'x-api-key':key},{'api-key':key});const seen=new Set();return list.filter(x=>{const s=JSON.stringify(x);if(seen.has(s))return false;seen.add(s);return true})}
function cleanHeaders(headers={}){const h={};for(const [k,v] of Object.entries(headers||{})){const n=String(k).toLowerCase();if(['host','cookie','set-cookie','content-length','connection','transfer-encoding','cf-connecting-ip','x-forwarded-for'].includes(n))continue;h[k]=String(v)}return h}

async function proxyFetch(url,init={}){
  const headers=cleanHeaders(init.headers||{});let body=init.body;
  if(body!=null&&typeof body!=='string')throw new Error('在线代理当前只接受文本/JSON 请求体');
  const res=await rawFetch('/api/proxy',{method:'POST',headers:{'content-type':'application/json','x-canvas-proxy':'1'},body:JSON.stringify({url,method:String(init.method||'GET').toUpperCase(),headers,body:body??null})});
  if(!res.ok){let d={};try{d=await res.clone().json()}catch{}if(res.status>=500||d.error)throw new Error(d.error||`代理请求失败 ${res.status}`)}
  return res;
}
async function providerFetch(url,init={}){
  try{
    return await rawFetch(url,{...init,mode:'cors',redirect:'follow'});
  }catch(error){
    if(error?.name==='AbortError')throw error;
    return proxyFetch(url,init);
  }
}
async function fetchWithAuth(provider,url,init={}){
  let last=null;
  for(const auth of authCandidates(provider)){
    const res=await providerFetch(url,{...init,headers:{accept:'application/json',...(init.headers||{}),...auth}});
    last=res;
    if(![401,403].includes(res.status))return res;
  }
  return last;
}
async function readResponse(res){const ct=String(res.headers.get('content-type')||'').toLowerCase();if(ct.includes('application/json')||ct.includes('+json'))return{kind:'json',value:await res.json()};if(ct.startsWith('text/'))return{kind:'text',value:await res.text()};const blob=await res.blob(),url=URL.createObjectURL(blob);runtime.objectUrls.add(url);return{kind:'blob',value:url,blob,type:ct}}
function outputObject(value,modality='text'){
  if(value==null)return null;
  if(typeof value==='object'&&value.type&&('value'in value))return value;
  if(modality==='text')return{type:'text',value:String(value),text:String(value)};
  return{type:'url',value:String(value),url:String(value),sourceUrl:String(value)};
}
function refsForRequest(refs=[]){return (Array.isArray(refs)?refs:[]).map(r=>({role:r.role||r.semanticRole||r.kind||'reference',type:r.type||r.kind||'',url:r.url||r.outputUrl||'',text:r.text||'',title:r.title||''})).filter(r=>r.url||r.text)}
async function makePortableReferences(refs=[]){const out=[];for(const r of refsForRequest(refs)){let url=r.url;if(url&&url.startsWith('blob:')){try{const res=await rawFetch(url),blob=await res.blob();if(blob.size<=15*1024*1024){url=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(blob)})}}catch{}}out.push({...r,url})}return out}
function defaultRequestBody(provider,model,task,route,refs){
  const mod=normalizeMod(task.nodeType||model.modality),p=task.parameters||{},prompt=String(task.prompt||''),modelId=model.id;
  const ctx={model:modelId,prompt,references:refs,parameters:p,task};
  if(route.requestTemplate&&Object.keys(route.requestTemplate).length)return fillTemplate(route.requestTemplate,ctx);
  if(route.adapterKey==='openai-chat'){
    const images=refs.filter(r=>r.url&&r.type==='image');
    const content=images.length?[{type:'text',text:prompt},...images.map(r=>({type:'image_url',image_url:{url:r.url}}))]:prompt;
    return{model:modelId,messages:[{role:'user',content}],...(p.responseFormat==='json_object'?{response_format:{type:'json_object'}}:{})};
  }
  if(route.adapterKey==='openai-responses')return{model:modelId,input:prompt};
  if(route.adapterKey==='openai-image')return{model:modelId,prompt,n:Number(p.count||1),...(p.size?{size:p.size}:{}),...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{})};
  if(route.adapterKey==='openai-audio-speech')return{model:modelId,input:prompt,voice:p.voice||'alloy',...(p.format?{format:p.format}:{})};
  if(route.adapterKey==='comfyui-workflow')return{prompt:p.workflow||p.promptGraph||{},client_id:uid('browser_')};
  if(mod==='video'){
    const first=refs.find(r=>['first_frame','image','image_reference'].includes(r.role)||r.type==='image');
    const last=refs.find(r=>r.role==='last_frame');
    return{model:modelId,prompt,...(p.duration?{duration:p.duration}:{}),...(p.resolution?{resolution:p.resolution}:{}),...(p.aspectRatio?{aspect_ratio:p.aspectRatio}:{}),...(first?.url?{image:first.url,first_frame:first.url}:{}),...(last?.url?{last_frame:last.url}:{}),...(refs.length?{references:refs}:{})};
  }
  return{model:modelId,prompt,...p,...(refs.length?{references:refs}:{})};
}
async function providerJson(provider,url,init){const res=await fetchWithAuth(provider,url,init);const parsed=await readResponse(res);if(!res.ok){const detail=parsed.kind==='json'?(parsed.value?.error?.message||parsed.value?.message||JSON.stringify(parsed.value)):String(parsed.value||'');throw new Error(`供应商 HTTP ${res.status}${detail?`：${detail.slice(0,500)}`:''}`)}return parsed}

async function discover(provider){
  const endpoints=['/v1/models','/models','/api/v1/models','/api/models'];let last='';
  for(const path of endpoints){
    const url=joinUrl(provider.baseUrl,path);
    try{const parsed=await providerJson(provider,url,{method:'GET',headers:{accept:'application/json'}});if(parsed.kind!=='json')continue;const data=parsed.value;const list=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:null;if(!list)continue;const detected=Adapters?.detectModelListProtocol?.(data,url)||{};const models=list.map(x=>typeof x==='string'?{id:x,name:x}:{id:String(x?.id||x?.name||''),name:String(x?.name||x?.id||''),modality:String(x?.modality||x?.type||'text').toLowerCase(),enabled:true,adapterKey:'auto'}).filter(x=>x.id);const merged={...provider,protocol:provider.protocol||detected.protocol||'auto',models};return{provider:Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged,endpoint:url,models}}catch(e){last=e.message}}
  throw new Error(last||'没有发现可用的模型列表接口');
}
async function testAuth(provider){const result=await discover(provider);return{ok:true,endpoint:result.endpoint,modelCount:result.models.length,protocol:result.provider.protocol||'auto'}}

async function executeTask(task){
  if(task.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
  const stored=findProvider(task.providerId),provider={...(task.providerSnapshot||{}),...(stored||{})};
  if(!provider?.baseUrl)throw new Error('供应商 Base URL 不存在');
  if(!String(provider.apiKey||'').trim())throw new Error('供应商 API Key 不存在，请重新保存供应商');
  const model=(provider.models||[]).find(m=>m.id===task.modelId)||task.modelSnapshot;
  if(!model?.id)throw new Error('模型不存在');
  const operation=task.parameters?.operation||'generate';
  const route=Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};
  if(!route.createPath)throw new Error('无法自动确定供应商创建接口');
  const refs=await makePortableReferences(task.references||[]),body=defaultRequestBody(provider,model,task,route,refs),createUrl=joinUrl(provider.baseUrl,route.createPath);
  updateTask(task.id,{status:'running',progress:2,error:null});
  const created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(route.responseMode!=='async'){
    if(created.kind==='blob')return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(created.value,task.nodeType)});
    const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,normalizeMod(task.nodeType)):undefined;
    const value=extracted!==undefined?extracted:(normalizeMod(task.nodeType)==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url??JSON.stringify(raw));
    return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,normalizeMod(task.nodeType))});
  }
  if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
  const taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
  if(!taskId)throw new Error('异步接口没有返回任务 ID');
  updateTask(task.id,{status:'polling',upstreamTaskId:String(taskId),progress:5});
  const started=Date.now();let attempt=0;
  while(Date.now()-started<Number(route.timeoutMs||1200000)){
    const current=findTask(task.id);if(current?.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
    const pollPath=fillTemplate(route.pollPath||'/v1/videos/{{taskId}}',{taskId}),pollUrl=joinUrl(provider.baseUrl,pollPath);
    await sleep(attempt?Math.min(30000,Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,attempt):route.pollIntervalMs||1500):Math.max(500,Number(route.pollIntervalMs||1500)));
    const polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');
    const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,normalizeMod(task.nodeType)):{state:'pending',output:null};
    updateTask(task.id,{progress:assessment.progress==null?Math.min(95,8+attempt*3):Number(assessment.progress)});
    if(assessment.state==='failure')throw new Error(Core?.formatFailure?Core.formatFailure(assessment):'上游任务失败');
    if(assessment.state==='success'){
      let output=assessment.output;
      if((output==null||output==='')&&route.contentPath){const contentUrl=joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId}));const content=await fetchWithAuth(provider,contentUrl,{method:'GET'});if(!content.ok)throw new Error(`结果下载失败 ${content.status}`);const parsed=await readResponse(content);output=parsed.value}
      if(output==null||output==='')throw new Error('任务成功但没有找到输出结果');
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(output,normalizeMod(task.nodeType))});
    }
    attempt++;
  }
  throw new Error('供应商任务轮询超时');
}
async function runTask(task){
  try{return await executeTask(task)}catch(error){const current=findTask(task.id)||task,attempt=Number(current.attempt||0),max=Number(current.maxRetries??1);if(!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,error:String(error.message||error)});pump();return}return updateTask(task.id,{status:current.cancelRequested?'canceled':'failed',error:String(error.message||error),progress:current.progress||0})}
}
async function pump(){if(runtime.pumping)return;runtime.pumping=true;try{while(true){const q=queueState();if(q.paused||runtime.running>=Math.max(1,Math.min(8,Number(q.concurrency||2))))break;const next=tasks().filter(t=>t.status==='queued'&&!t.cancelRequested).sort((a,b)=>(b.priority||0)-(a.priority||0)||String(a.createdAt).localeCompare(String(b.createdAt)))[0];if(!next)break;runtime.running++;updateTask(next.id,{status:'running'});runTask(next).finally(()=>{runtime.running=Math.max(0,runtime.running-1);pump()})}}finally{runtime.pumping=false}}

function projectSummary(p){return{id:p.id,name:p.name,version:Number(p.version||1),createdAt:p.createdAt,updatedAt:p.updatedAt}}
function projectRoute(path,method,body){
  const parts=path.split('/').filter(Boolean);let list=projects();
  if(parts.length===2&&method==='GET')return json({projects:list.map(projectSummary)});
  if(parts.length===2&&method==='POST'){const p={id:uid('proj_'),name:String(body.name||'未命名画布'),data:clone(body.data||{}),version:1,versions:[],createdAt:now(),updatedAt:now()};p.data.projectId=p.id;p.data.projectName=p.name;p.data.projectUpdatedAt=p.updatedAt;list.unshift(p);saveProjects(list);return json({project:clone(p)});}
  const id=decodeURIComponent(parts[2]||''),i=list.findIndex(p=>p.id===id);if(i<0)return json({error:'画布不存在'},404);let p=list[i];
  if(parts.length===3&&method==='GET')return json({project:clone(p)});
  if(parts.length===3&&method==='PUT'){if(body.forceSnapshot){p.versions=p.versions||[];p.versions.unshift({version:p.version,createdAt:p.updatedAt,data:clone(p.data),name:p.name})}p.version=Number(p.version||1)+(body.forceSnapshot?1:0);p.name=String(body.name||p.name);p.data=clone(body.data||p.data);p.updatedAt=now();p.data.projectId=p.id;p.data.projectName=p.name;p.data.projectUpdatedAt=p.updatedAt;list[i]=p;saveProjects(list);return json({project:clone(p)});}
  if(parts.length===3&&method==='DELETE'){list.splice(i,1);saveProjects(list);return json({ok:true});}
  if(parts[3]==='versions'&&method==='GET')return json({versions:(p.versions||[]).map(v=>({version:v.version,createdAt:v.createdAt}))});
  if(parts[3]==='restore'&&method==='POST'){const v=(p.versions||[]).find(x=>String(x.version)===String(parts[4]));if(!v)return json({error:'版本不存在'},404);p.versions.unshift({version:p.version,createdAt:p.updatedAt,data:clone(p.data),name:p.name});p.version=Number(p.version||1)+1;p.data=clone(v.data);p.name=v.name||p.name;p.updatedAt=now();p.data.projectId=p.id;p.data.projectUpdatedAt=p.updatedAt;list[i]=p;saveProjects(list);return json({project:clone(p)});}
  return json({error:'不支持的项目操作'},405);
}

async function handleApi(info,input,init){
  const path=info.url.pathname,method=info.method,body=parseBody(init);
  if(path==='/api/health')return json({ok:true,service:'canvas-browser-runtime',runtime:'browser-local-preview',persistence:'browser-only',cloudflarePersistence:false});
  if(path==='/api/auth/status')return json({enabled:false,authenticated:true,mode:'browser-local-preview'});
  if(path==='/api/auth/login')return json({ok:true,authenticated:true});
  if(path==='/api/providers'&&method==='GET')return json({providers:providers().map(safeProvider)});
  if(path==='/api/providers'&&method==='POST'){
    const list=providers(),old=list.find(p=>p.id===body.id),merged={...old,...clone(body),id:body.id||old?.id||uid('provider_'),updatedAt:now(),createdAt:old?.createdAt||now()};if(!String(body.apiKey||'').trim()&&old?.apiKey)merged.apiKey=old.apiKey;const final=Adapters?.finalizeProvider?Adapters.finalizeProvider(merged):merged;const i=list.findIndex(p=>p.id===final.id);if(i>=0)list[i]=final;else list.push(final);saveProviders(list);return json({provider:safeProvider(final)});
  }
  if(path.startsWith('/api/providers/')&&method==='DELETE'&&!['test-config','test-auth','diagnose','discover-models'].some(x=>path.endsWith('/'+x))){const id=decodeURIComponent(path.slice('/api/providers/'.length)),list=providers().filter(p=>p.id!==id);saveProviders(list);return json({ok:true});}
  if(['/api/providers/test-config','/api/providers/test-auth','/api/providers/diagnose','/api/providers/discover-models'].includes(path)&&method==='POST'){
    const existing=body.id?findProvider(body.id):null,provider={...existing,...clone(body)};if(!provider.apiKey&&existing?.apiKey)provider.apiKey=existing.apiKey;
    try{const found=await discover(provider);if(path==='/api/providers/discover-models')return json({ok:true,endpoint:found.endpoint,models:found.models,provider:safeProvider(found.provider),modelCount:found.models.length,protocol:found.provider.protocol||'auto'});return json({ok:true,endpoint:found.endpoint,modelCount:found.models.length,protocol:found.provider.protocol||'auto',warning:''});}catch(e){return json({error:String(e.message||e)},400)}
  }
  if(path==='/api/tasks'&&method==='GET'){const limit=Math.max(1,Math.min(300,Number(info.url.searchParams.get('limit')||120)));return json({tasks:tasks().slice(0,limit)});}
  if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}
  if(path==='/api/queue'&&method==='GET'){const q=queueState(),list=tasks();return json({...q,running:runtime.running,queued:list.filter(t=>t.status==='queued').length});}
  if(path==='/api/queue'&&method==='PUT'){const q=setQueue({paused:Boolean(body.paused),...(body.concurrency!=null?{concurrency:Math.max(1,Math.min(8,Number(body.concurrency)))}:{})});pump();return json(q);}
  if(path.startsWith('/api/tasks/')){const parts=path.split('/').filter(Boolean),id=decodeURIComponent(parts[2]||''),task=findTask(id);if(!task)return json({error:'任务不存在'},404);if(parts[3]==='retry'&&method==='POST'){const t=updateTask(id,{status:'queued',cancelRequested:false,error:null,progress:0});pump();return json({task:t});}if(method==='GET')return json({task});if(method==='PATCH'){const t=updateTask(id,{...(body.priority!=null?{priority:Number(body.priority)}:{})});return json({task:t});}if(method==='DELETE'){const t=updateTask(id,{cancelRequested:true,status:['queued'].includes(task.status)?'canceled':'cancelling'});return json({task:t});}}
  if(path.startsWith('/api/projects'))return projectRoute(path,method,body);
  if(path==='/api/upload'&&method==='POST'){
    let blob=init.body;if(!(blob instanceof Blob)){try{blob=await new Response(init.body).blob()}catch{return json({error:'无法读取浏览器本地素材'},400)}}const url=URL.createObjectURL(blob);runtime.objectUrls.add(url);return json({ok:true,url,browserLocal:true,size:blob.size,type:blob.type,name:info.url.searchParams.get('name')||''});
  }
  if(path==='/api/media/process')return json({error:'在线预览不把媒体上传到 Cloudflare；FFmpeg / ImageMagick 本地处理将在 Windows 正式版运行'},501);
  if(path.startsWith('/api/blender/bridge/'))return json({error:'Blender Bridge 属于本地桌面能力，在线预览不通过 Cloudflare 保存或转发场景状态'},501);
  if(path==='/api/autolink')return json({matches:[]});
  return null;
}

// Tasks left in an executing state after a reload have lost their in-memory polling loop.
(()=>{const list=tasks();let changed=false;for(const t of list){if(['running','polling','retrying','cancelling'].includes(t.status)){t.status='failed';t.error='页面刷新中断了浏览器本地任务，请重新生成';t.updatedAt=now();changed=true}}if(changed)saveTasks(list)})();

window.fetch=async function canvasBrowserRuntimeFetch(input,init={}){
  const info=requestInfo(input,init);if(!info||info.url.origin!==location.origin||!info.url.pathname.startsWith('/api/'))return rawFetch(input,init);
  const handled=await handleApi(info,input,init);return handled||rawFetch(input,init);
};

globalThis.CanvasBrowserRuntime=Object.freeze({mode:'browser-local-preview',cloudflarePersistence:false,getProviders:()=>providers().map(safeProvider),getProjects:()=>projects().map(projectSummary),getTasks:()=>tasks(),rawFetch});
})();
