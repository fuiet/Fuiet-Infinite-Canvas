from pathlib import Path

ROOT=Path('_read_123_zip_20260821_180410')
OLD_CACHE='20260831-xogpu-poll-fallback-1'
NEW_CACHE='20260831-xogpu-content-probe-1'

browser=ROOT/'browser-runtime.js'
s=browser.read_text(encoding='utf-8')

old_poll="""function isXogpuVideoRoute(route={}){const family=String(route?.protocolFamily||route?.family||'').toLowerCase(),profile=String(route?.protocolProfile||route?.profile||'').toLowerCase();return family==='xogpu-minimax-h3'||profile==='xogpu:minimax-h3'}
function shouldFallbackVideoPollError(error,route={}){const status=Number(error?.status);return[404,405].includes(status)||(isXogpuVideoRoute(route)&&status===501)}
async function pollVideoJson(provider,candidates,route){let last=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){last=error;if(shouldFallbackVideoPollError(error,route))continue;throw error}}throw last||new Error('没有可用的视频任务轮询接口')}
"""
new_poll="""function isXogpuVideoRoute(route={}){const family=String(route?.protocolFamily||route?.family||'').toLowerCase(),profile=String(route?.protocolProfile||route?.profile||'').toLowerCase();return family==='xogpu-minimax-h3'||profile==='xogpu:minimax-h3'}
function isXogpuNotImplementedError(error,route={}){const detail=[runtimeErrorText(error),runtimeErrorText(error?.detail)].filter(Boolean).join(' ');return isXogpuVideoRoute(route)&&(Number(error?.status)===501||/not_implemented:\\d+/i.test(detail))}
function shouldFallbackVideoPollError(error,route={}){const status=Number(error?.status);return[404,405].includes(status)||isXogpuNotImplementedError(error,route)}
async function pollVideoJson(provider,candidates,route){let last=null,xogpuNotImplemented=null;for(const url of candidates){const requestUrl=freshVideoPollUrl(url,route);try{return{parsed:await providerJson(provider,requestUrl,{method:route.pollMethod||'GET',headers:{'content-type':'application/json'}}),url,requestUrl}}catch(error){error.requestUrl=requestUrl;last=error;if(isXogpuNotImplementedError(error,route)){xogpuNotImplemented=error;continue}if([404,405].includes(Number(error?.status)))continue;throw error}}if(xogpuNotImplemented){xogpuNotImplemented.xogpuNotImplemented=true;throw xogpuNotImplemented}throw last||new Error('没有可用的视频任务轮询接口')}
async function probeXogpuVideoContent(provider,createdRaw,taskId,route){
  if(!isXogpuVideoRoute(route))return{ready:false,status:0,url:''};
  const candidates=[],add=value=>{const url=videoResourceCandidate(provider,value);if(url&&!candidates.includes(url))candidates.push(url)};
  const explicit=Core?.firstPath?Core.firstPath(createdRaw||{},['content_url','contentUrl','metadata.content_url','metadata.contentUrl','download_url','downloadUrl','links.content','links.download']):'';add(explicit);
  for(const template of (Array.isArray(route.contentPathCandidates)?route.contentPathCandidates:[]))add(joinUrl(provider.baseUrl,fillTemplate(template,{taskId})));
  if(route.contentPath)add(joinUrl(provider.baseUrl,fillTemplate(route.contentPath,{taskId})));
  if(!candidates.length)add(joinUrl(provider.baseUrl,`/v1/videos/${taskId}/content`));
  let lastStatus=0,lastUrl='';
  for(const url of candidates){
    const res=await fetchProviderResource(provider,url,{method:'GET',headers:{accept:'video/*,application/octet-stream;q=0.9,*/*;q=0.1'}});lastStatus=res.status;lastUrl=url;
    if(res.ok){const parsed=await readResponse(res);return{ready:true,status:res.status,url,value:parsed.value}}
    if([400,404,409,425,429,500,501,502,503,504].includes(res.status))continue;
    const error=new Error(`XOGPU 视频内容读取失败 ${res.status}`);error.status=res.status;error.requestUrl=url;throw error;
  }
  return{ready:false,status:lastStatus,url:lastUrl};
}
"""
if old_poll in s:
    s=s.replace(old_poll,new_poll,1)
elif 'function probeXogpuVideoContent(' not in s:
    raise SystemExit('browser poll helper marker not found')

old_catch="""    }catch(error){
      const latest=findTask(task.id);
      if(latest?.providerStatus==='succeeded'){
        updateTask(task.id,{status:'result_pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游已成功，结果同步暂时失败',error:null});retryAttempt++;continue;
      }
      if(Core?.isRetryableProviderFailure?.(error)){
        updateTask(task.id,{status:'retrying',providerStatus:latest?.providerStatus||'processing',resultStatus:latest?.resultStatus||'pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
      }
      throw error;
    }
"""
new_catch="""    }catch(error){
      const latest=findTask(task.id);
      if(modality==='video'&&isXogpuVideoRoute(route)&&(error?.xogpuNotImplemented===true||isXogpuNotImplementedError(error,route))){
        let probe=null;
        try{probe=await probeXogpuVideoContent(provider,latest?.providerCreateResponse||task.providerCreateResponse||{},taskId,route)}catch(probeError){
          updateTask(task.id,{lastPollAt:now(),lastError:runtimeErrorText(probeError)||'XOGPU 视频内容探测失败，将继续等待',error:null,videoProtocolDiagnostics:{...(latest?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,lastPollErrorUrl:error.requestUrl||'',lastPollErrorStatus:Number(error?.status)||501,pollFallback:'content-probe'}});retryAttempt++;continue;
        }
        if(probe?.ready){
          let output=await normalizeGeneratedOutput(probe.value,'video',provider);
          try{output=await materializeGeneratedVideoOutput(output,provider)}catch(saveError){updateTask(task.id,{status:'result_pending',providerStatus:'succeeded',resultStatus:'pending',lastPollAt:now(),lastError:runtimeErrorText(saveError)||'XOGPU 视频已生成，但保存到浏览器本地失败，将继续重试',error:null,progress:99,videoProtocolDiagnostics:{...(latest?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,lastPollErrorUrl:error.requestUrl||'',lastPollErrorStatus:Number(error?.status)||501,pollFallback:'content-probe',contentProbeUrl:probe.url||''}});retryAttempt++;continue}
          if(validMediaOutput(output))return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',providerSucceededAt:latest?.providerSucceededAt||now(),resultSavedAt:now(),providerResultUrl:String(output||''),progress:100,output:outputObject(output,'video'),lastPollAt:now(),lastError:null,error:null,videoProtocolDiagnostics:{...(latest?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,lastPollErrorUrl:error.requestUrl||'',lastPollErrorStatus:Number(error?.status)||501,pollFallback:'content-probe',contentProbeUrl:probe.url||'',contentProbeReady:true}})
        }
        updateTask(task.id,{status:'polling',providerStatus:latest?.providerStatus==='succeeded'?'succeeded':'processing',resultStatus:'pending',lastPollAt:now(),lastError:`XOGPU 状态查询未实现（${runtimeErrorText(error)||'HTTP 501'}），正在直接等待视频内容${probe?.status?`；内容接口 HTTP ${probe.status}`:''}`,error:null,progress:Math.max(10,Number(latest?.progress||0)),videoProtocolDiagnostics:{...(latest?.videoProtocolDiagnostics||{}),createPath:usedCreatePath,lastPollErrorUrl:error.requestUrl||'',lastPollErrorStatus:Number(error?.status)||501,pollFallback:'content-probe',contentProbeUrl:probe?.url||'',contentProbeStatus:Number(probe?.status||0),pollCandidates}});retryAttempt++;continue;
      }
      if(latest?.providerStatus==='succeeded'){
        updateTask(task.id,{status:'result_pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游已成功，结果同步暂时失败',error:null});retryAttempt++;continue;
      }
      if(Core?.isRetryableProviderFailure?.(error)){
        updateTask(task.id,{status:'retrying',providerStatus:latest?.providerStatus||'processing',resultStatus:latest?.resultStatus||'pending',lastPollAt:now(),lastError:runtimeErrorText(error)||'上游轮询暂时不可用，将继续重试',error:null});retryAttempt++;continue;
      }
      throw error;
    }
"""
if old_catch in s:
    s=s.replace(old_catch,new_catch,1)
elif "pollFallback:'content-probe'" not in s:
    raise SystemExit('browser poll catch marker not found')

s=s.replace(OLD_CACHE,NEW_CACHE)
browser.write_text(s,encoding='utf-8')

# Fix misleading UI stage: a poll failure before the first successful poll used to be labeled as create failure.
app=ROOT/'app.js'
a=app.read_text(encoding='utf-8')
old_stage="""    let stage='';
    if(protocol.pollUrl){try{stage=`轮询 ${new URL(protocol.pollUrl,location.href).pathname}`}catch{stage='轮询视频任务'}}
    else if(request.createPath)stage=`创建 ${request.createPath}${request.transport?` · ${request.transport}`:''}`;
"""
new_stage="""    let stage='';
    const pollStageUrl=protocol.lastPollErrorUrl||protocol.lastPollRequestUrl||protocol.pollUrl;
    if(pollStageUrl){try{stage=`轮询 ${new URL(pollStageUrl,location.href).pathname}`}catch{stage='轮询视频任务'}}
    else if(request.createPath)stage=`创建 ${request.createPath}${request.transport?` · ${request.transport}`:''}`;
"""
if old_stage in a:
    a=a.replace(old_stage,new_stage,1)
elif 'const pollStageUrl=protocol.lastPollErrorUrl' not in a:
    raise SystemExit('app task failure stage marker not found')
a=a.replace(OLD_CACHE,NEW_CACHE)
app.write_text(a,encoding='utf-8')

# Cache-bust all references and stale assertions.
for path in ROOT.rglob('*'):
    if not path.is_file() or path in {browser,app}: continue
    if path.suffix.lower() not in {'.js','.mjs','.html','.css'}: continue
    text=path.read_text(encoding='utf-8')
    if OLD_CACHE in text:path.write_text(text.replace(OLD_CACHE,NEW_CACHE),encoding='utf-8')

# Regression tests.
test=ROOT/'tests'/'xogpu-content-probe.test.mjs'
test.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('XOGPU preserves not_implemented poll failures and probes documented content endpoint',()=>{
  assert.match(browser,/function isXogpuNotImplementedError\\(error,route=\\{\\}\\)/);
  assert.match(browser,/function probeXogpuVideoContent\\(provider,createdRaw,taskId,route\\)/);
  assert.match(browser,/\/v1\/videos\/\\$\\{taskId\\}\/content/);
  assert.match(browser,/error\?\.xogpuNotImplemented===true\\|\\|isXogpuNotImplementedError\\(error,route\\)/);
  assert.match(browser,/pollFallback:'content-probe'/);
});

test('XOGPU content probe treats not-ready HTTP responses as pending instead of generation failure',()=>{
  assert.match(browser,/\\[400,404,409,425,429,500,501,502,503,504\\]\.includes\\(res\.status\\)/);
  assert.match(browser,/status:'polling',providerStatus:latest\?\.providerStatus==='succeeded'\?'succeeded':'processing'/);
});

test('XOGPU content probe can finish and persist a paid task without another create request',()=>{
  assert.match(browser,/if\\(probe\?\.ready\\)/);
  assert.match(browser,/status:'succeeded',providerStatus:'succeeded',resultStatus:'saved'/);
  assert.match(browser,/contentProbeReady:true/);
});

test('video failure UI reports poll failure instead of stale create stage',()=>{
  assert.match(app,/const pollStageUrl=protocol\.lastPollErrorUrl\\|\\|protocol\.lastPollRequestUrl\\|\\|protocol\.pollUrl/);
});
""",encoding='utf-8')

print('XOGPU content probe fallback patch applied')
