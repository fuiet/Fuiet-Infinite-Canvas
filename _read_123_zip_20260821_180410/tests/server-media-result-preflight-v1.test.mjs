import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');

test('server media result persistence never silently falls back for generated media',()=>{
  assert.ok(server.includes("function resultPersistencePendingError(message,cause)"));
  assert.ok(server.includes("error.code='RESULT_PENDING'"));
  assert.ok(server.includes("for(let attempt=0;attempt<3;attempt++)"));
  assert.ok(server.includes("task.providerStatus==='succeeded'&&task.resultStatus==='pending'&&task.providerOutput?.type==='url'"));
  assert.ok(server.includes("仅重试结果文件持久化，不重新提交生成请求"));
  assert.ok(server.includes("providerOutput:output"));
});

test('server XOGPU duration preflight probes local, data and remote references',()=>{
  assert.ok(server.includes('async function probeServerReference(part)'));
  assert.ok(server.includes('async function validateServerXogpuDuration(entry,part)'));
  assert.ok(server.includes('seconds<2||seconds>15'));
  assert.ok(server.includes('await validateServerXogpuDuration(entry,part)'));
});

test('server XOGPU first-last frame aspect ratio is validated before append',()=>{
  assert.ok(server.includes('async function validateServerXogpuFrameAspect(firstPart,lastPart)'));
  assert.ok(server.includes('delta>0.01'));
  const start=server.indexOf("else if(mode==='frames')");
  const end=server.indexOf('}else{',start);
  const branch=server.slice(start,end>start?end:undefined);
  assert.ok(branch.includes('validateServerXogpuFrameAspect(firstPart,lastPart)'));
  assert.ok(branch.indexOf('validateServerXogpuFrameAspect')<branch.indexOf("appendServerXogpuPart(form,'input_reference'"));
});
