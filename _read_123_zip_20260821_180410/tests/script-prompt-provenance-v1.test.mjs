import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Core=require('../script-workflow-core.js');
const Provenance=require('../script-prompt-provenance-v1.js');
const Upstream=require('../upstream-generation-inputs-v1.js');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');
const serverSource=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const storeSource=fs.readFileSync(new URL('../store.js',import.meta.url),'utf8');
const browserRuntimeSource=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');

function fixture(){
  const shot={
    id:'shot-1',no:1,imagePrompt:'AI ORIGINAL FINAL PROMPT',videoPrompt:'AI ORIGINAL VIDEO PROMPT',
    promptRevision:7,promptGeneratedAt:'2026-09-07T01:00:00.000Z',
    promptSource:{shotRevision:3,shotFingerprint:'shot-fp',styleRevision:2,assetRevisions:{'char-1':4},fingerprint:'source-fp'},
    outputs:{imageNodeIds:['prod-1'],videoNodeIds:[],selectedImageNodeId:'prod-1',selectedVideoNodeId:''}
  };
  const snapshot=Core.createGenerationSnapshot({scriptNodeId:'script-1',shot,type:'image',prompt:shot.imagePrompt,globalStyle:{text:'电影胶片',revision:2},assets:[],providerId:'p1',modelId:'m1'});
  shot.imagePrompt='SCRIPT PROMPT CHANGED AFTER GENERATOR CREATION';
  shot.promptRevision=8;
  const state={nodes:[
    {id:'script-1',type:'script',scriptData:{aiSynthesizedAt:'2026-09-07T00:59:00.000Z',assets:{characters:[],scenes:[],props:[]},globalStyle:{text:'电影胶片',referenceMediaUrls:[],referenceNodeIds:[]},shots:[shot]}},
    {id:'prod-1',type:'image',prompt:'MANUAL EXECUTION PROMPT',generationSnapshot:snapshot,toolParams:{operation:'script_batch_image',scriptNodeId:'script-1',shotId:'shot-1'}}
  ],edges:[]};
  return{state,shot,snapshot};
}
function withState(state,run){
  const previous=globalThis.CanvasBrowserStorageManager;
  globalThis.CanvasBrowserStorageManager={getItem:key=>key==='libtv-clone-state'?JSON.stringify(state):null};
  try{return run()}finally{
    if(previous===undefined)delete globalThis.CanvasBrowserStorageManager;
    else globalThis.CanvasBrowserStorageManager=previous;
  }
}
function sourceSnapshot(prompt,revision){
  return{
    createdAt:`2026-09-07T0${revision}:00:00.000Z`,prompt,sourcePrompt:prompt,promptRevision:revision,promptGeneratedAt:`2026-09-07T0${revision}:00:00.000Z`,
    promptSource:{fingerprint:`fp-${revision}`},promptProvenance:{version:1,source:{kind:'script_final_prompt',prompt,promptRevision:revision,promptGeneratedAt:`2026-09-07T0${revision}:00:00.000Z`,promptSource:{fingerprint:`fp-${revision}`},capturedAt:`2026-09-07T0${revision}:00:00.000Z`,type:'image'}}
  };
}

test('generation snapshot explicitly preserves the script-final source prompt',()=>{
  const {snapshot}=fixture();
  assert.equal(snapshot.prompt,'AI ORIGINAL FINAL PROMPT');
  assert.equal(snapshot.sourcePrompt,'AI ORIGINAL FINAL PROMPT');
  assert.equal(snapshot.promptProvenance.version,1);
  assert.equal(snapshot.promptProvenance.source.kind,'script_final_prompt');
  assert.equal(snapshot.promptProvenance.source.prompt,'AI ORIGINAL FINAL PROMPT');
  assert.equal(snapshot.promptProvenance.source.promptRevision,7);
  assert.equal(snapshot.promptProvenance.source.promptSource.fingerprint,'source-fp');
  assert.equal(snapshot.promptProvenance.source.capturedAt,snapshot.createdAt);
});

test('later script edits never rewrite the production node source provenance',()=>{
  const {state}=fixture();
  const task={nodeType:'image',prompt:'MANUAL EXECUTION PROMPT',parameters:{scriptNodeId:'script-1',shotId:'shot-1'}};
  const audit=Provenance.buildTaskProvenance(task,{state,generatorPrompt:'MANUAL EXECUTION PROMPT',providerPrompt:'MANUAL EXECUTION PROMPT',submittedAt:'2026-09-07T02:00:00.000Z'});
  assert.equal(audit.source.prompt,'AI ORIGINAL FINAL PROMPT');
  assert.equal(audit.source.promptRevision,7);
  assert.equal(audit.source.productionNodeId,'prod-1');
  assert.equal(audit.source.method,'ai_synthesized');
  assert.equal(audit.execution.generatorPrompt,'MANUAL EXECUTION PROMPT');
  assert.equal(audit.execution.providerPrompt,'MANUAL EXECUTION PROMPT');
  assert.equal(audit.execution.manuallyEdited,true);
  assert.equal(audit.execution.submittedAt,'2026-09-07T02:00:00.000Z');
});

test('task submission records generator-confirmed prompt and final provider prompt separately',()=>{
  const {state}=fixture();
  withState(state,()=>{
    const task=Upstream.normalizeTask({
      nodeType:'image',prompt:'MANUAL EXECUTION PROMPT',
      references:[{id:'txt-1',type:'text',role:'prompt_context',text:'UPSTREAM DIRECTOR CONTEXT'}],
      parameters:{scriptNodeId:'script-1',shotId:'shot-1',creativeContext:{linkedReferences:[]}}
    });
    assert.equal(task.prompt,'UPSTREAM DIRECTOR CONTEXT\n\nMANUAL EXECUTION PROMPT');
    assert.equal(task.parameters.promptProvenance.source.prompt,'AI ORIGINAL FINAL PROMPT');
    assert.equal(task.parameters.promptProvenance.execution.generatorPrompt,'MANUAL EXECUTION PROMPT');
    assert.equal(task.parameters.promptProvenance.execution.providerPrompt,'UPSTREAM DIRECTOR CONTEXT\n\nMANUAL EXECUTION PROMPT');
    assert.equal(task.parameters.promptProvenance.execution.manuallyEdited,true);
    assert.equal(task.parameters.promptProvenance.execution.providerDiffersFromSource,true);
    assert.equal(task.parameters.upstreamInputContract.promptProvenance,true);
  });
});

test('unchanged generator prompt is explicitly recorded as not manually edited',()=>{
  const {state,snapshot}=fixture();
  state.nodes.find(node=>node.id==='prod-1').prompt=snapshot.prompt;
  withState(state,()=>{
    const task=Upstream.normalizeTask({nodeType:'image',prompt:snapshot.prompt,references:[],parameters:{scriptNodeId:'script-1',shotId:'shot-1'}});
    assert.equal(task.parameters.promptProvenance.execution.manuallyEdited,false);
    assert.equal(task.parameters.promptProvenance.execution.generatorPrompt,'AI ORIGINAL FINAL PROMPT');
    assert.equal(task.parameters.promptProvenance.execution.providerPrompt,'AI ORIGINAL FINAL PROMPT');
  });
});

test('same Shot with multiple generators binds provenance to the generator actually being submitted',()=>{
  const {state,shot}=fixture();
  const old={id:'prod-old',type:'image',prompt:'OLD MANUAL PROMPT',taskStatus:'queued',generationSnapshot:sourceSnapshot('OLD AI SOURCE',4),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}};
  const newer={id:'prod-new',type:'image',prompt:'NEW MANUAL PROMPT',generationSnapshot:sourceSnapshot('NEW AI SOURCE',9),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}};
  state.nodes=state.nodes.filter(node=>node.id!=='prod-1');
  state.nodes.push(old,newer);
  shot.outputs={imageNodeIds:['prod-old','prod-new'],videoNodeIds:[],selectedImageNodeId:'prod-new',selectedVideoNodeId:''};
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'OLD MANUAL PROMPT',parameters:{scriptNodeId:'script-1',shotId:'shot-1'}},{state,generatorPrompt:'OLD MANUAL PROMPT',providerPrompt:'OLD MANUAL PROMPT',submittedAt:'2026-09-07T10:00:00.000Z'});
  assert.equal(audit.source.productionNodeId,'prod-old');
  assert.equal(audit.source.prompt,'OLD AI SOURCE');
  assert.equal(audit.source.promptRevision,4);
  assert.equal(audit.execution.generatorPrompt,'OLD MANUAL PROMPT');
});

test('active generator wins when two versions temporarily share the same execution prompt',()=>{
  const {state,shot}=fixture();
  state.nodes=state.nodes.filter(node=>node.id!=='prod-1');
  state.nodes.push(
    {id:'prod-running',type:'image',prompt:'SAME EXECUTION',taskStatus:'running',generationSnapshot:sourceSnapshot('RUNNING SOURCE',5),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}},
    {id:'prod-selected',type:'image',prompt:'SAME EXECUTION',generationSnapshot:sourceSnapshot('SELECTED SOURCE',10),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}}
  );
  shot.outputs={imageNodeIds:['prod-running','prod-selected'],videoNodeIds:[],selectedImageNodeId:'prod-selected',selectedVideoNodeId:''};
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'SAME EXECUTION',parameters:{scriptNodeId:'script-1',shotId:'shot-1'}},{state,generatorPrompt:'SAME EXECUTION',providerPrompt:'SAME EXECUTION'});
  assert.equal(audit.source.productionNodeId,'prod-running');
  assert.equal(audit.source.prompt,'RUNNING SOURCE');
});

test('ordinary non-script generators do not receive fake prompt provenance',()=>{
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'普通图片提示词',parameters:{}},{state:{nodes:[]}});
  assert.equal(audit,null);
  const task=Upstream.normalizeTask({nodeType:'image',prompt:'普通图片提示词',references:[],parameters:{}});
  assert.equal(task.parameters.promptProvenance,undefined);
  assert.equal(task.parameters.upstreamInputContract.promptProvenance,false);
});

test('generator preflight UI exposes source and execution prompt status and escapes source text',()=>{
  const {state}=fixture();
  state.nodes.find(node=>node.id==='prod-1').generationSnapshot.promptProvenance.source.prompt='AI <source> "quoted"';
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'MANUAL EXECUTION PROMPT',parameters:{scriptNodeId:'script-1',shotId:'shot-1'}},{state,generatorPrompt:'MANUAL EXECUTION PROMPT',providerPrompt:'MANUAL EXECUTION PROMPT',submittedAt:'preview'});
  const html=Provenance.provenanceHtml(audit);
  assert.match(html,/提示词来源/);
  assert.match(html,/脚本最终提示词/);
  assert.match(html,/已人工调整/);
  assert.match(html,/AI &lt;source&gt; &quot;quoted&quot;/);
  assert.match(html,/MANUAL EXECUTION PROMPT/);
  assert.doesNotMatch(html,/AI <source>/);
});

test('desktop and browser task persistence preserve arbitrary prompt provenance parameters',()=>{
  assert.match(serverSource,/const body=await readJson\(req\),taskPayload=\{\.\.\.body\};delete taskPayload\._upstream/);
  assert.match(serverSource,/payload:taskPayload/);
  assert.match(storeSource,/JSON\.stringify\(payload\)/);
  assert.match(browserRuntimeSource,/parameters:clone\(body\.parameters\|\|\{\}\)/);
});

test('browser loads provenance before upstream task normalization and includes audit styles',()=>{
  const provenance=bootstrap.indexOf('./script-prompt-provenance-v1.js');
  const upstream=bootstrap.indexOf('./upstream-generation-inputs-v1.js');
  assert.ok(provenance>=0&&upstream>provenance);
  assert.match(bootstrap,/script-prompt-provenance-v1\.css\?v=\$\{batchInputV\}/);
  assert.match(bootstrap,/20260907-final-prompt-asset-source-5/);
  assert.match(bootstrap,/20260907-script-prompt-provenance-2/);
});
