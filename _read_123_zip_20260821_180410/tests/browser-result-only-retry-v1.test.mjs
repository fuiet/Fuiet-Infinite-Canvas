import test from 'node:test';
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
