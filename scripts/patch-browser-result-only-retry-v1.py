from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / '_read_123_zip_20260821_180410'
BROWSER = APP / 'browser-runtime-preview.js'
TEST = APP / 'tests' / 'browser-result-only-retry-v1.test.mjs'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def patch_browser() -> None:
    text = BROWSER.read_text(encoding='utf-8')

    if "const pendingResultUrl=String(task.providerResultUrl||'').trim();" not in text:
        old = """  const operation=task.parameters?.operation||'generate';
  const modality=normalizeMod(task.nodeType);
  const route=modality==='video'&&Adapters?.resolveVideoRoute?Adapters.resolveVideoRoute(provider,model,task,task.references||[]):Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};
  if(!route.createPath)throw new Error('无法自动确定供应商创建接口');"""
        new = """  const operation=task.parameters?.operation||'generate';
  const modality=normalizeMod(task.nodeType);
  const route=modality==='video'&&Adapters?.resolveVideoRoute?Adapters.resolveVideoRoute(provider,model,task,task.references||[]):Adapters?.resolveRoute?Adapters.resolveRoute(provider,model,task.nodeType,operation):{createPath:model.createPath,method:model.method||'POST',responseMode:model.responseMode||'sync',outputPath:model.outputPath||''};
  const pendingResultUrl=String(task.providerResultUrl||'').trim();
  if(task.providerStatus==='succeeded'&&task.resultStatus==='pending'&&pendingResultUrl&&['image','video'].includes(modality)){
    updateTask(task.id,{status:'result_pending',progress:Math.max(99,Number(task.progress||0)),error:null,lastError:task.lastError||'上游已成功，仅重试结果持久化'});
    let value=modality==='image'?await materializeGeneratedImageOutput(pendingResultUrl,provider):await materializeGeneratedVideoOutput(pendingResultUrl,provider);
    if(!validMediaOutput(value))throw new Error(`上游已成功，但${modality==='image'?'图片':'视频'}结果持久化后仍不可用`);
    let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
    return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',progress:100,output:outputObject(value,modality,pendingResultUrl),resultSavedAt:now(),lastError:null,error:null,...imageDimensionTaskPatch(dimensionInfo)});
  }
  if(!route.createPath)throw new Error('无法自动确定供应商创建接口');"""
        text = replace_once(text, old, new, 'browser result-only retry entry')

    old_sync = """      const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,modality):undefined;
      let value=extracted!==undefined?extracted:(modality==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url);
      value=await normalizeGeneratedOutput(value,modality,provider);
      const sourceUrl=modality==='image'&&typeof value==='string'&&/^https:\\/\\//i.test(value.trim())?value.trim():'';
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',progress:100,output:outputObject(value,modality,sourceUrl),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});"""
    new_sync = """      const raw=created.value,extracted=Core?.extractOutput?Core.extractOutput(raw,route,modality):undefined;
      let value=extracted!==undefined?extracted:(modality==='text'?(raw?.choices?.[0]?.message?.content??raw?.text??raw?.content??JSON.stringify(raw)):raw?.url??raw?.data?.url);
      const sourceUrl=['image','video'].includes(modality)?providerResourceUrl(provider,value):'';
      if(sourceUrl)updateTask(task.id,{providerStatus:'succeeded',resultStatus:'pending',providerOutput:clone(raw),providerResultUrl:sourceUrl,providerSucceededAt:findTask(task.id)?.providerSucceededAt||now(),progress:99,error:null});
      value=await normalizeGeneratedOutput(sourceUrl||value,modality,provider);
      if(modality==='video')value=await materializeGeneratedVideoOutput(value,provider);
      if(modality==='image'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到图片结果字段');
      if(modality==='video'&&!validMediaOutput(value))throw new Error('上游已返回成功响应，但未识别到视频结果字段');
      let dimensionInfo=null;if(modality==='image'){dimensionInfo=await enforceGeneratedImageDimensions(value,provider,model,task.parameters||{});value=dimensionInfo.value}
      const upstreamSize=modality==='image'?imageResponseSize(raw):'';
      return updateTask(task.id,{status:'succeeded',providerStatus:sourceUrl?'succeeded':undefined,resultStatus:sourceUrl?'saved':undefined,resultSavedAt:sourceUrl?now():undefined,progress:100,output:outputObject(value,modality,sourceUrl),...imageDimensionTaskPatch(dimensionInfo),...(upstreamSize?{upstreamSize}:{})});"""
    if old_sync in text:
        text = replace_once(text, old_sync, new_sync, 'sync media provider success freeze')
    elif "const sourceUrl=['image','video'].includes(modality)?providerResourceUrl(provider,value):'';" not in text:
        raise SystemExit('sync media provider success freeze: expected old block not found')

    old_immediate = """    if(modality==='video'&&immediateOutput&&!taskId){
      let value=await normalizeGeneratedOutput(immediateOutput,'video',provider);
      value=await materializeGeneratedVideoOutput(value,provider);
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',progress:100,output:outputObject(value,'video'),providerOutput:clone(created.value),providerResultUrl:String(value||''),resultSavedAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }"""
    new_immediate = """    if(modality==='video'&&immediateOutput&&!taskId){
      const sourceUrl=providerResourceUrl(provider,immediateOutput);
      if(sourceUrl)updateTask(task.id,{status:'provider_succeeded',providerStatus:'succeeded',resultStatus:'pending',providerOutput:clone(created.value),providerResultUrl:sourceUrl,providerSucceededAt:findTask(task.id)?.providerSucceededAt||now(),progress:99,error:null,videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
      let value=await normalizeGeneratedOutput(sourceUrl||immediateOutput,'video',provider);
      value=await materializeGeneratedVideoOutput(value,provider);
      return updateTask(task.id,{status:'succeeded',providerStatus:'succeeded',resultStatus:'saved',progress:100,output:outputObject(value,'video',sourceUrl),providerOutput:clone(created.value),providerResultUrl:sourceUrl||String(value||''),resultSavedAt:now(),videoProtocolDiagnostics:{createPath:usedCreatePath,mode:'immediate-output'}});
    }"""
    if old_immediate in text:
        text = replace_once(text, old_immediate, new_immediate, 'immediate video success freeze')
    elif "const sourceUrl=providerResourceUrl(provider,immediateOutput);" not in text:
        raise SystemExit('immediate video success freeze: expected old block not found')

    BROWSER.write_text(text, encoding='utf-8')


def write_test() -> None:
    TEST.write_text(r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');

test('browser resumes a persisted provider result without re-running provider create',()=>{
  const start=browser.indexOf("const pendingResultUrl=String(task.providerResultUrl||'').trim();");
  const createGuard=browser.indexOf("if(!route.createPath)throw new Error('无法自动确定供应商创建接口')",start);
  const createLoop=browser.indexOf('if(!resumingUpstream){',start);
  assert.ok(start>=0&&createGuard>start&&createLoop>createGuard);
  const branch=browser.slice(start,createGuard);
  assert.ok(branch.includes("task.providerStatus==='succeeded'&&task.resultStatus==='pending'"));
  assert.ok(branch.includes('materializeGeneratedImageOutput(pendingResultUrl,provider)'));
  assert.ok(branch.includes('materializeGeneratedVideoOutput(pendingResultUrl,provider)'));
  assert.ok(branch.includes("return updateTask(task.id,{status:'succeeded'"));
});

test('sync remote media freezes upstream success before materialization',()=>{
  const marker="const sourceUrl=['image','video'].includes(modality)?providerResourceUrl(provider,value):'';";
  const start=browser.indexOf(marker);
  assert.ok(start>=0);
  const normalize=browser.indexOf('value=await normalizeGeneratedOutput(sourceUrl||value,modality,provider);',start);
  const freeze=browser.indexOf("providerStatus:'succeeded',resultStatus:'pending'",start);
  assert.ok(freeze>start&&normalize>freeze);
  assert.ok(browser.slice(start,normalize).includes('providerResultUrl:sourceUrl'));
});

test('immediate async video freezes result URL before local persistence',()=>{
  const start=browser.indexOf('const sourceUrl=providerResourceUrl(provider,immediateOutput);');
  assert.ok(start>=0);
  const persist=browser.indexOf('value=await materializeGeneratedVideoOutput(value,provider);',start);
  const freeze=browser.indexOf("status:'provider_succeeded'",start);
  assert.ok(freeze>start&&persist>freeze);
  assert.ok(browser.slice(start,persist).includes('providerResultUrl:sourceUrl'));
});
""", encoding='utf-8')


patch_browser()
write_test()
print('browser result-only retry v1 applied')
