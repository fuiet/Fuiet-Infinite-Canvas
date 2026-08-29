from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
BUILD='20260829-agnes-live-poll-4'

runtime_path=ROOT/'browser-runtime.js'
registry_path=ROOT/'video-protocol-registry.js'
index_path=ROOT/'index.html'
models_path=ROOT/'models.html'
bootstrap_path=ROOT/'browser-bootstrap.js'
agnes_test_path=ROOT/'tests/agnes-fixed-adapter.test.mjs'
cache_test_path=ROOT/'tests/video-result-cache-bust.test.mjs'
error_test_path=ROOT/'tests/video-error-reporting.test.mjs'
display_test_path=ROOT/'tests/browser-video-display-pipeline.test.mjs'
recovery_test_path=ROOT/'tests/agnes-browser-poll-recovery.test.mjs'

runtime=runtime_path.read_text(encoding='utf-8')
old="""  const existingUpstreamTaskId=modality==='video'?String(task.upstreamTaskId||'').trim():'';
  const resumingUpstream=Boolean(existingUpstreamTaskId);
"""
new="""  const recoveredUpstreamTaskId=modality==='video'&&task.providerCreateResponse&&Core?.extractTaskId?String(Core.extractTaskId(task.providerCreateResponse,route)||'').trim():'';
  const existingUpstreamTaskId=modality==='video'?String(recoveredUpstreamTaskId||task.upstreamTaskId||'').trim():'';
  const resumingUpstream=Boolean(existingUpstreamTaskId);
"""
if old not in runtime and 'recoveredUpstreamTaskId' not in runtime: raise SystemExit('upstream recovery anchor not found')
runtime=runtime.replace(old,new,1)

old="""  updateTask(task.id,{status:resumingUpstream?(task.providerStatus==='succeeded'?'result_pending':'polling'):'running',progress:resumingUpstream?Math.max(5,Number(task.progress||5)):2,error:null});

  if(!resumingUpstream){
"""
new="""  updateTask(task.id,{status:resumingUpstream?(task.providerStatus==='succeeded'?'result_pending':'polling'):'running',progress:resumingUpstream?Math.max(5,Number(task.progress||5)):2,error:null});
  if(resumingUpstream&&recoveredUpstreamTaskId&&recoveredUpstreamTaskId!==String(task.upstreamTaskId||'')){
    updateTask(task.id,{upstreamTaskId:recoveredUpstreamTaskId,lastError:null,videoProtocolDiagnostics:{...(task.videoProtocolDiagnostics||{}),recoveredTaskId:true,recoveredTaskIdAt:now()}});
  }

  if(!resumingUpstream){
"""
if old not in runtime and 'recoveredTaskIdAt' not in runtime: raise SystemExit('recovery persistence anchor not found')
runtime=runtime.replace(old,new,1)

old="""    if(modality==='video')pollCandidates=videoPollUrlCandidates(provider,created.value,usedCreatePath,taskId,route);
    updateTask(task.id,{status:'polling',providerStatus:'processing',resultStatus:'pending',upstreamTaskId:String(taskId),upstreamCreatePath:usedCreatePath,providerCreateResponse:created.kind==='json'?clone(created.value):null,progress:5,videoProtocolDiagnostics:modality==='video'?{createPath:usedCreatePath,pollCandidates}:undefined});
"""
new="""    if(modality==='video')pollCandidates=videoPollUrlCandidates(provider,created.value,usedCreatePath,taskId,route);
    const providerVideoId=modality==='video'&&Core?.firstPath?Core.firstPath(created.value,['video_id','videoId','data.video_id','data.videoId']):'';
    const providerTaskId=modality==='video'&&Core?.firstPath?Core.firstPath(created.value,['task_id','taskId','data.task_id','data.taskId','id','data.id']):'';
    updateTask(task.id,{status:'polling',providerStatus:'processing',resultStatus:'pending',upstreamTaskId:String(taskId),providerVideoId:providerVideoId==null?'':String(providerVideoId),providerTaskId:providerTaskId==null?'':String(providerTaskId),upstreamCreatePath:usedCreatePath,providerCreateResponse:created.kind==='json'?clone(created.value):null,progress:5,videoProtocolDiagnostics:modality==='video'?{createPath:usedCreatePath,pollCandidates}:undefined});
"""
if old not in runtime and 'providerVideoId=modality' not in runtime: raise SystemExit('provider ids anchor not found')
runtime=runtime.replace(old,new,1)

start=runtime.find("  const started=Date.now();let attempt=0;\n  while(Date.now()-started<Number(route.timeoutMs||1200000)){")
end=runtime.find("  const current=findTask(task.id);\n  if(current?.providerStatus==='succeeded')",start)
if start<0 or end<0: raise SystemExit('poll loop bounds not found')
old_loop=runtime[start:end]
new_loop="""  const started=Date.now();let pollCount=0,retryAttempt=0;
  while(Date.now()-started<Number(route.timeoutMs||1200000)){
    const current=findTask(task.id);if(current?.cancelRequested)return updateTask(task.id,{status:'canceled',error:'已取消'});
    const pollPath=matchingPollPath(usedCreatePath,taskId,route),pollUrl=joinUrl(provider.baseUrl,pollPath);
    const delay=retryAttempt>0?(Core?.nextPollDelay?Core.nextPollDelay(route.pollIntervalMs||1500,retryAttempt):Math.min(30000,(route.pollIntervalMs||1500)*Math.pow(2,retryAttempt))):Math.max(500,Number(route.pollIntervalMs||1500));
    await sleep(delay);
    let polled;
    try{
      if(modality==='video'){
        const ordered=activePollUrl?[activePollUrl,...pollCandidates.filter(x=>x!==activePollUrl)]:pollCandidates;
        const result=await pollVideoJson(provider,ordered.length?ordered:[pollUrl],route);polled=result.parsed;activePollUrl=result.url;
        updateTask(task.id,{lastPollAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,pollUrl:activePollUrl,pollCandidates}});
      }else polled=await providerJson(provider,pollUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}});
      retryAttempt=0;
    }catch(error){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){
        updateTask(task.id,{status:'result_pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游已成功，结果同步暂时失败',error:null});retryAttempt++;continue;
      }
      if(Core?.isRetryableProviderFailure?.(error)){
        updateTask(task.id,{status:'retrying',providerStatus:latest?.providerStatus||'processing',resultStatus:latest?.resultStatus||'pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
      }
      throw error;
    }
    if(polled.kind!=='json')throw new Error('轮询接口没有返回 JSON');
    pollCount++;
    const assessment=Core?.classifyAsyncPoll?Core.classifyAsyncPoll(polled.value,route,modality):{state:'pending',output:null};
    updateTask(task.id,{lastPollAt:now(),providerRawStatus:assessment.status||'',providerProgress:assessment.progress==null?null:Number(assessment.progress),progress:assessment.progress==null?Math.min(95,8+pollCount*3):Number(assessment.progress)});
    if(assessment.state==='retryable'){
      updateTask(task.id,{status:'retrying',providerStatus:'processing',resultStatus:'pending',lastError:Core?.formatFailure?Core.formatFailure(assessment,'上游轮询暂时不可用'):'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
    }
    if(assessment.state==='failure'){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){updateTask(task.id,{status:'result_pending',lastError:Core?.formatFailure?Core.formatFailure(assessment):'上游成功后的旧状态响应被忽略',error:null});continue}
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
        updateTask(task.id,{status:'result_pending',lastError:resultError||'上游已生成成功，正在等待视频结果地址',error:null,progress:99});continue;
      }
      output=await normalizeGeneratedOutput(output,modality,provider);
      if(modality==='video'){
        try{output=await materializeGeneratedVideoOutput(output,provider)}
        catch(error){updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',providerResultUrl:String(output||''),lastError:runtimeErrorText(error)||'上游已成功，但视频结果保存到浏览器本地失败，将继续重试',error:null,progress:99});retryAttempt++;continue}
      }
      if(modality==='image'&&!validMediaOutput(output))throw new Error('上游任务已成功，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(output)){
        updateTask(task.id,{status:'result_pending',lastError:'上游已生成成功，但返回的视频结果地址暂不可识别',error:null,progress:99});continue;
      }
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(output,provider,model,task.parameters||{});output=dimensionInfo.value}
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',providerResultUrl:modality==='video'?String(output||''):'',progress:100,output:outputObject(output,modality),resultSavedAt:now(),lastError:null,error:null,...imageDimensionTaskPatch(dimensionInfo)});
    }
  }
"""
runtime=runtime[:start]+new_loop+runtime[end:]
runtime=runtime.replace("browser-media-sw.js?v=20260829-video-display-3",f"browser-media-sw.js?v={BUILD}")
runtime_path.write_text(runtime,encoding='utf-8')

registry=registry_path.read_text(encoding='utf-8')
old="outputPath:'metadata.url',outputPaths:['metadata.url','data.metadata.url',...COMMON_OUTPUTS]"
new="outputPath:'metadata.url',outputPaths:['metadata.url','metadata.video_url','metadata.videoUrl','data.metadata.url','data.metadata.video_url','data.metadata.videoUrl','remixed_from_video_id','data.remixed_from_video_id',...COMMON_OUTPUTS]"
if old not in registry and 'remixed_from_video_id' not in registry: raise SystemExit('Agnes output paths anchor not found')
registry=registry.replace(old,new,1)
registry_path.write_text(registry,encoding='utf-8')

for p in (index_path,models_path):
    text=p.read_text(encoding='utf-8')
    text=text.replace('20260829-video-display-3',BUILD)
    p.write_text(text,encoding='utf-8')
bootstrap=bootstrap_path.read_text(encoding='utf-8').replace("const v='20260829-video-display-3';",f"const v='{BUILD}';")
bootstrap_path.write_text(bootstrap,encoding='utf-8')

agnes=agnes_test_path.read_text(encoding='utf-8')
if "await import('../provider-runtime-core.js');" not in agnes:
    agnes=agnes.replace("await import('../video-protocol-registry.js');", "await import('../video-protocol-registry.js');\nawait import('../provider-runtime-core.js');")
agnes=agnes.replace("const A=globalThis.CanvasProviderAdapters,I=globalThis.CanvasModelImageCapabilities,V=globalThis.CanvasVideoProtocolRegistry;", "const A=globalThis.CanvasProviderAdapters,I=globalThis.CanvasModelImageCapabilities,V=globalThis.CanvasVideoProtocolRegistry,C=globalThis.CanvasProviderRuntimeCore;")
marker="test('Agnes Video 2.5 Flash text request is exact and fixed to 720P',()=>{"
extra="""test('Agnes Video 2.5 Flash prefers video_id and recognizes live completed response shapes',()=>{
  const model={id:'agnes-video-2.5-flash',modality:'video'};const route=V.resolve(provider,model,'text-to-video');
  assert.equal(C.extractTaskId({id:'task_old',task_id:'task_old',video_id:'video_live'},route),'video_live');
  const done=C.classifyAsyncPoll({status:'completed',progress:100,metadata:{url:'https://cdn.example.com/final.mp4'}},route,'video');
  assert.equal(done.state,'success');assert.equal(done.output,'https://cdn.example.com/final.mp4');
  const legacy=C.classifyAsyncPoll({status:'completed',progress:100,remixed_from_video_id:'https://cdn.example.com/legacy.mp4'},route,'video');
  assert.equal(legacy.state,'success');assert.equal(legacy.output,'https://cdn.example.com/legacy.mp4');
});

"""
if extra.strip() not in agnes:
    if marker not in agnes: raise SystemExit('agnes test insertion anchor not found')
    agnes=agnes.replace(marker,extra+marker,1)
agnes_test_path.write_text(agnes,encoding='utf-8')

for p in (cache_test_path,error_test_path,display_test_path):
    text=p.read_text(encoding='utf-8').replace('20260829-video-display-3',BUILD)
    p.write_text(text,encoding='utf-8')

recovery_test_path.write_text(f"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {{fileURLToPath}} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=fs.readFileSync(path.join(ROOT,'browser-runtime.js'),'utf8');
const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const BUILD='{BUILD}';
function section(a,b){{const x=runtime.indexOf(a),y=runtime.indexOf(b,x+a.length);assert.ok(x>=0&&y>x);return runtime.slice(x,y)}}

test('browser resumes Agnes from provider create response video_id before stale upstream id',()=>{{
  const exec=section('async function executeTask(task){{','async function runTask(task){{');
  assert.match(exec,/recoveredUpstreamTaskId/);
  assert.match(exec,/Core\.extractTaskId\(task\.providerCreateResponse,route\)/);
  assert.match(exec,/recoveredUpstreamTaskId\|\|task\.upstreamTaskId/);
  assert.match(exec,/recoveredTaskId:true/);
}});

test('normal successful polls stay at provider cadence and only real retry failures back off',()=>{{
  const exec=section('const started=Date.now();let pollCount=0,retryAttempt=0;','const current=findTask(task.id);\n  if(current?.providerStatus');
  assert.match(exec,/const delay=retryAttempt>0\?/);
  assert.match(exec,/:Math\.max\(500,Number\(route\.pollIntervalMs\|\|1500\)\)/);
  assert.match(exec,/retryAttempt=0;/);
  assert.match(exec,/pollCount\+\+;/);
  assert.doesNotMatch(exec,/attempt\+\+;/);
}});

test('poll diagnostics preserve raw provider state and both Agnes ids',()=>{{
  assert.match(runtime,/providerVideoId/);
  assert.match(runtime,/providerTaskId/);
  assert.match(runtime,/providerRawStatus:assessment\.status\|\|''/);
  assert.match(runtime,/providerProgress:assessment\.progress==null\?null:Number\(assessment\.progress\)/);
}});

test('latest browser runtime cache version is deployed',()=>{{
  assert.ok(index.includes(`browser-runtime.js?v=${{BUILD}}`));
  assert.ok(runtime.includes(`browser-media-sw.js?v=${{BUILD}}`));
}});
""",encoding='utf-8')

print('patched Agnes browser poll recovery',BUILD)
