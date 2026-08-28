from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'_read_123_zip_20260821_180410'
RUNTIME=BASE/'browser-runtime.js'
APP=BASE/'app.js'

text=RUNTIME.read_text(encoding='utf-8')

text=text.replace(
"const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};",
"const runtime={running:0,pumping:false,controllers:new Map(),objectUrls:new Set(),resultRetryTimers:new Map(),persistChain:Promise.resolve(),db:null,ready:null,swReady:null};",
1)

old_update="function updateTask(id,patch){const list=tasks(),i=list.findIndex(t=>t.id===id);if(i<0)return null;list[i]={...list[i],...patch,updatedAt:now()};saveTasks(list);return list[i]}"
new_update=r'''function updateTask(id,patch){
  const list=tasks(),i=list.findIndex(t=>t.id===id);if(i<0)return null;
  const current=list[i],next={...(patch||{})};
  const providerSucceeded=current.providerStatus==='succeeded'||next.providerStatus==='succeeded'||['provider_succeeded','result_pending','succeeded'].includes(current.status);
  if(current.status==='succeeded'&&next.status&&next.status!=='succeeded'&&next.status!=='canceled')delete next.status;
  if(providerSucceeded&&next.status==='failed'){
    next.status=current.output?'succeeded':'result_pending';
    next.providerStatus='succeeded';
    next.resultStatus=current.output?'saved':'pending';
    next.lastError=runtimeErrorText(next.error)||runtimeErrorText(next.lastError)||current.lastError||'';
    next.error=null;
  }
  if(next.status==='provider_succeeded'){
    next.providerStatus='succeeded';next.resultStatus=current.resultStatus==='saved'?'saved':'pending';
    next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.error=null;
  }
  if(next.status==='result_pending'){
    next.providerStatus='succeeded';next.resultStatus='pending';next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.error=null;
  }
  if(next.status==='succeeded'){
    next.providerStatus='succeeded';next.resultStatus='saved';next.providerSucceededAt=current.providerSucceededAt||next.providerSucceededAt||now();next.resultSavedAt=current.resultSavedAt||next.resultSavedAt||now();next.error=null;next.lastError=null;
  }
  list[i]={...current,...next,updatedAt:now()};saveTasks(list);
  if(['succeeded','failed','canceled'].includes(list[i].status)){const timer=runtime.resultRetryTimers.get(id);if(timer){clearTimeout(timer);runtime.resultRetryTimers.delete(id)}}
  return list[i]
}
function scheduleTaskResume(id,delay=3000){
  if(runtime.resultRetryTimers.has(id))return;
  const timer=setTimeout(()=>{runtime.resultRetryTimers.delete(id);const current=findTask(id);if(!current||current.cancelRequested)return;if(['provider_succeeded','result_pending'].includes(current.status)){updateTask(id,{status:'queued',error:null});pump()}},Math.max(1000,Number(delay)||3000));
  runtime.resultRetryTimers.set(id,timer);
}'''
if old_update not in text:
    raise SystemExit('updateTask marker missing')
text=text.replace(old_update,new_update,1)

start=text.index('async function executeTask(task){')
end=text.index('\nasync function pump()',start)
new_exec=r'''async function executeTask(task){
  if(task.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
  const stored=findProvider(task.providerId),provider={...(task.providerSnapshot||{}),...(stored||{})};
  if(!provider?.baseUrl)throw new Error('供应商 Base URL 不存在');
  if(!String(provider.apiKey||'').trim())throw new Error('供应商 API Key 不存在，请重新保存供应商');
  const model=(provider.models||[]).find(m=>m.id===task.modelId)||task.modelSnapshot;
  if(!model?.id)throw new Error('模型不存在');
  const operation=task.parameters?.operation||'generate';
  const route=Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};
  if(!route.createPath)throw new Error('无法自动确定供应商创建接口');
  const modality=normalizeMod(task.nodeType),existingUpstreamTaskId=modality==='video'?String(task.upstreamTaskId||'').trim():'';
  const resumingUpstream=Boolean(existingUpstreamTaskId);
  const refs=resumingUpstream?[]:await makePortableReferences(task.references||[]),body=resumingUpstream?null:defaultRequestBody(provider,model,task,route,refs);
  let created=null,usedCreatePath=String(task.upstreamCreatePath||task.videoProtocolDiagnostics?.createPath||route.createPath),lastCreateError=null;
  updateTask(task.id,{status:resumingUpstream?(task.providerStatus==='succeeded'?'result_pending':'polling'):'running',progress:resumingUpstream?Math.max(5,Number(task.progress||5)):2,error:null});

  if(!resumingUpstream){
    const paths=modality==='video'?alternateVideoCreatePaths(route,model):[route.createPath];
    for(const createPath of paths){
      const createUrl=joinUrl(provider.baseUrl,createPath);
      try{
        if(route.adapterKey==='standard-video-async-v1'){
          try{
            updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'multipart')});
            const form=await buildStandardVideoForm(model,task,refs);
            created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{},body:form});
          }catch(error){
            if(!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
            lastCreateError=error;
            updateTask(task.id,{videoRequestDiagnostics:videoRequestDiagnostics(model,task,refs,createPath,'json')});
            created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
          }
        }else if(modality==='image'&&route.adapterKey==='openai-image'){
          const candidates=imageRequestBodies(provider,model,task,route,refs);let imageError=null;
          for(let bi=0;bi<candidates.length;bi++){
            const candidate=candidates[bi];
            updateTask(task.id,{requestDiagnostics:{...imageRequestDiagnostics(candidate.profile,candidate.body,createPath),selection:candidate.selection||null},capabilityDiagnostics:candidate.capability||null});
            try{created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(candidate.body)});imageError=null;break}
            catch(error){imageError=error;if(bi===candidates.length-1||![400,405,415,422].includes(Number(error?.status)))throw error}
          }
          if(!created&&imageError)throw imageError;
        }else{
          created=await providerJson(provider,createUrl,{method:route.method||'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
        }
        usedCreatePath=createPath;break;
      }catch(error){
        lastCreateError=error;
        if(!autoVideoRoute(model,route)||!VIDEO_AUTO_RETRY_STATUSES.has(Number(error?.status)))throw error;
      }
    }
    if(!created)throw lastCreateError||new Error('视频创建接口不可用');

    if(route.responseMode!=='async'){
      if(created.kind==='blob'){
        let value=created.value,dimensionInfo=null;
        if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
        return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo)});
      }
      const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,modality):undefined;
      let value=extracted!==undefined?extracted:(modality==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url);
      value=await normalizeGeneratedOutput(value,modality,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});
    }
  }

  let taskId=existingUpstreamTaskId,pollCandidates=Array.isArray(task.videoProtocolDiagnostics?.pollCandidates)?task.videoProtocolDiagnostics.pollCandidates.filter(Boolean):[],activePollUrl=String(task.videoProtocolDiagnostics?.pollUrl||'');
  if(!resumingUpstream){
    if(created.kind!=='json')throw new Error('异步创建接口没有返回 JSON 任务信息');
    const immediateOutput=modality==='video'&&Core?.extractOutput?Core.extractOutput(created.value,route,'video'):undefined;
    taskId=Core?.extractTaskId?Core.extractTaskId(created.value,route):created.value?.id;
    if(modality==='video'&&immediateOutput&&!taskId){
      const value=await normalizeGeneratedOutput(immediateOutput,'video',provider);
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }
    if(!taskId){const error=new Error('异步接口没有返回任务 ID，也没有返回可用的视频结果；为避免重复扣费不会自动重新提交');error.noRetry=true;throw error}
    if(modality==='video')pollCandidates=videoPollUrlCandidates(provider,created.value,usedCreatePath,taskId,route);
    updateTask(task.id,{status:'polling',providerStatus:'processing',resultStatus:'pending',upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,providerCreateResponse:created.kind==='json'?clone(created.value):null,progress:5,videoProtocolDiagnostics:modality==='video'?{createPath:usedCreatePath,pollCandidates}:undefined});
  }else{
    if(!pollCandidates.length)pollCandidates=videoPollUrlCandidates(provider,null,usedCreatePath,taskId,route);
    updateTask(task.id,{status:task.providerStatus==='succeeded'?'result_pending':'polling',providerStatus:task.providerStatus||'processing',resultStatus:task.providerStatus==='succeeded'?'pending':(task.resultStatus||'pending'),upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),createPath:usedCreatePath,pollCandidates}});
  }

  const started=Date.now();let attempt=0;
  while(Date.now()-started<Number(route.timeoutMs||1200000)){
    const current=findTask(task.id);if(current?.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
    const pollPath=matchingPollPath(usedCreatePath,taskId,route),pollUrl=joinUrl(provider.baseUrl,pollPath);
    await sleep(attempt?Math.min(30000,Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,attempt):route.pollIntervalMs||1500):Math.max(500,Number(route.pollIntervalMs||1500)));
    let polled;
    try{
      if(modality==='video'){
        const ordered=activePollUrl?[activePollUrl,...pollCandidates.filter(x=>x!==activePollUrl)]:pollCandidates;
        const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;
        updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}});
      }else polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
    }catch(error){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){
        updateTask(task.id,{status:'result_pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游已成功，结果同步暂时失败',error:null});attempt++;continue;
      }
      throw error;
    }
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');
    const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,modality):{state:'pending',output:null};
    updateTask(task.id,{lastPollAt:now(),progress:assessment.progress==null?Math.min(95,8+attempt*3):Number(assessment.progress)});
    if(assessment.state==='failure'){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){updateTask(task.id,{status:'result_pending',lastError:Core?.formatFailure?Core.formatFailure(assessment):'上游成功后的旧状态响应被忽略',error:null});attempt++;continue}
      throw new Error(Core?.formatFailure?Core.formatFailure(assessment):'上游任务失败');
    }
    if(assessment.state==='success'){
      const before=findTask(task.id);
      updateTask(task.id,{status:'provider_succeeded',providerStatus:'succeeded',resultStatus:'pending',providerOutput:clone(polled.value),providerSucceededAt:before?.providerSucceededAt||now(),progress:Math.max(99,Number(assessment.progress||0)),lastPollAt:now(),error:null});
      let output=assessment.output,resultError='';
      try{
        if((output==null||output==='')&&modality==='video')output=await fetchVideoContent(provider,polled.value,taskId,route,activePollUrl);
        else if((output==null||output==='')&&route.contentPath){const contentUrl=joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId}));const content=await fetchWithAuth(provider,contentUrl,{method:'GET'});if(!content.ok)throw new Error(`结果下载失败 ${content.status}`);const parsed=await readResponse(content);output=parsed.value}
      }catch(error){resultError=runtimeErrorText(error)||'上游已生成成功，视频结果地址暂未就绪'}
      if(output==null||output===''){
        updateTask(task.id,{status:'result_pending',lastError:resultError||'上游已生成成功，正在等待视频结果地址',error:null,progress:99});attempt++;continue;
      }
      output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(output)){
        updateTask(task.id,{status:'result_pending',lastError:'上游已生成成功，但返回的视频结果地址暂不可识别',error:null,progress:99});attempt++;continue;
      }
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(output,provider,model,task.parameters||{});output=dimensionInfo.value}
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',providerResultUrl:modality==='video'?String(output||''):'',progress:100,output:outputObject(output,modality),resultSavedAt:now(),lastError:null,error:null,...imageDimensionTaskPatch(dimensionInfo)});
    }
    attempt++;
  }
  const current=findTask(task.id);
  if(current?.providerStatus==='succeeded'){
    const pending=updateTask(task.id,{status:'result_pending',progress:99,lastError:'上游已生成成功，视频结果仍在同步，将继续自动重试',error:null});
    scheduleTaskResume(task.id,3000);return pending;
  }
  throw new Error('供应商任务轮询超时');
}
async function runTask(task){
  try{
    const result=await executeTask(task);
    if(result?.status==='result_pending')scheduleTaskResume(task.id,3000);
    return result;
  }catch(error){
    const current=findTask(task.id)||task,attempt=Number(current.attempt||0),max=Number(current.maxRetries??1),message=runtimeErrorText(error)||'生成失败',detail=runtimeErrorText(error?.detail);
    const failurePatch={error:message,...(Number.isFinite(Number(error?.status))?{errorStatus:Number(error.status)}:{}),...(detail?{errorDetail:detail}:{})};
    if(current.providerStatus==='succeeded'||['provider_succeeded','result_pending'].includes(current.status)){
      const pending=updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastError:message,error:null,progress:Math.max(99,Number(current.progress||0))});scheduleTaskResume(task.id,3000);return pending;
    }
    if(!error?.noRetry&&!current.cancelRequested&&attempt<max){updateTask(task.id,{status:'queued',attempt:attempt+1,...failurePatch});pump();return}
    return updateTask(task.id,{status:current.cancelRequested?'canceled':'failed',...failurePatch,progress:current.progress||0});
  }
}'''
text=text[:start]+new_exec+text[end:]

old_task="if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}"
new_task="if(path==='/api/tasks'&&method==='POST'){const task={id:uid('task_'),status:'queued',providerStatus:'pending',resultStatus:'pending',upstreamTaskId:'',upstreamCreatePath:'',providerOutput:null,providerResultUrl:'',providerSucceededAt:null,resultSavedAt:null,lastPollAt:null,lastError:null,progress:0,providerId:String(body.providerId||''),modelId:String(body.modelId||''),providerSnapshot:clone(body.providerSnapshot||null),modelSnapshot:clone(body.modelSnapshot||null),nodeId:String(body.nodeId||''),nodeType:String(body.nodeType||body.modelSnapshot?.modality||'text'),prompt:String(body.prompt||''),references:clone(body.references||[]),parameters:clone(body.parameters||{}),priority:Number(body.priority??50),attempt:0,maxRetries:Number(body.maxRetries??1),cancelRequested:false,output:null,error:null,createdAt:now(),updatedAt:now()};upsertTask(task);pump();return json({task:clone(task)});}"
if old_task not in text: raise SystemExit('task creation marker missing')
text=text.replace(old_task,new_task,1)

old_init="runtime.ready.then(()=>{const list=tasks();let changed=false;for(const t of list){if(['running','polling','retrying','cancelling'].includes(t.status)){t.status='failed';t.error='页面刷新中断了浏览器本地任务，请重新生成';t.updatedAt=now();changed=true}}if(changed)saveTasks(list);pump()}).catch(error=>console.error('[browser-runtime] initialization failed',error));"
new_init=r'''runtime.ready.then(()=>{
  const list=tasks();let changed=false;
  for(const t of list){
    if(t.status==='cancelling'){t.status='canceled';t.error='已取消';t.updatedAt=now();changed=true;continue}
    if(['provider_succeeded','result_pending'].includes(t.status)&&t.upstreamTaskId){t.status='queued';t.error=null;t.updatedAt=now();changed=true;continue}
    if(['running','polling','retrying'].includes(t.status)){
      if(t.upstreamTaskId){t.status='queued';t.error=null;t.updatedAt=now();changed=true}
      else{t.status='failed';t.error='页面刷新发生在上游任务 ID 落盘之前；为避免重复生成和重复扣费，系统没有自动重新提交，请先在供应商后台确认任务状态';t.updatedAt=now();changed=true}
    }
  }
  if(changed)saveTasks(list);pump();
}).catch(error=>console.error('[browser-runtime] initialization failed',error));'''
if old_init not in text: raise SystemExit('runtime initialization marker missing')
text=text.replace(old_init,new_init,1)

RUNTIME.write_text(text,encoding='utf-8')

app=APP.read_text(encoding='utf-8')
old_monitor="info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;\n      n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=taskFailureText(info);saveState();scheduleWorkflowVisualUpdate();"
new_monitor="info=(await apiJson('/api/tasks/'+encodeURIComponent(taskId))).task;\n      const resultSyncing=['provider_succeeded','result_pending'].includes(info.status);\n      n.taskStatus=info.status;n.taskProgress=info.progress||0;n.taskError=resultSyncing?'':taskFailureText(info);n.taskSyncMessage=resultSyncing?'上游已生成，正在同步视频结果…':'';saveState();scheduleWorkflowVisualUpdate();"
if old_monitor not in app: raise SystemExit('monitorNodeTask marker missing')
app=app.replace(old_monitor,new_monitor,1)
old_adopt="['queued','running','polling','retrying'].includes(n.taskStatus)"
new_adopt="['queued','running','polling','retrying','provider_succeeded','result_pending'].includes(n.taskStatus)"
if old_adopt not in app: raise SystemExit('canAdopt marker missing')
app=app.replace(old_adopt,new_adopt,1)
APP.write_text(app,encoding='utf-8')

print('video result reconciliation v4 applied')
