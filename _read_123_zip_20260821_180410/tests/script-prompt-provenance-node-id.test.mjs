import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Provenance=require('../script-prompt-provenance-v1.js');
const Upstream=require('../upstream-generation-inputs-v1.js');

function snapshot(prompt,revision){return{
  prompt,sourcePrompt:prompt,promptRevision:revision,createdAt:`2026-09-07T0${revision}:00:00.000Z`,
  promptProvenance:{version:1,source:{kind:'script_final_prompt',prompt,promptRevision:revision,promptGeneratedAt:`2026-09-07T0${revision}:00:00.000Z`,promptSource:{fingerprint:`fp-${revision}`},capturedAt:`2026-09-07T0${revision}:00:00.000Z`,type:'image'}}
}}
function stateFixture(){
  const shot={id:'shot-1',no:1,imagePrompt:'CURRENT SCRIPT PROMPT',promptRevision:11,promptSource:{fingerprint:'current'},outputs:{imageNodeIds:['prod-running','prod-exact'],videoNodeIds:[],selectedImageNodeId:'prod-running',selectedVideoNodeId:''}};
  return{nodes:[
    {id:'script-1',type:'script',scriptData:{assets:{characters:[],scenes:[],props:[]},globalStyle:{text:'',referenceMediaUrls:[],referenceNodeIds:[]},shots:[shot]}},
    {id:'prod-running',type:'image',prompt:'SAME EXECUTION',taskStatus:'running',generationSnapshot:snapshot('RUNNING SOURCE',5),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}},
    {id:'prod-exact',type:'image',prompt:'SAME EXECUTION',taskStatus:'queued',generationSnapshot:snapshot('EXACT SOURCE',8),toolParams:{scriptNodeId:'script-1',shotId:'shot-1'}}
  ],edges:[]};
}
function withState(state,run){
  const previous=globalThis.CanvasBrowserStorageManager;
  globalThis.CanvasBrowserStorageManager={getItem:key=>key==='libtv-clone-state'?JSON.stringify(state):null};
  try{return run()}finally{if(previous===undefined)delete globalThis.CanvasBrowserStorageManager;else globalThis.CanvasBrowserStorageManager=previous}
}

test('creativeContext nodeId overrides selected/active heuristics for exact source provenance',()=>{
  const state=stateFixture();
  const task={nodeType:'image',prompt:'SAME EXECUTION',parameters:{scriptNodeId:'script-1',shotId:'shot-1',creativeContext:{nodeId:'prod-exact'}}};
  const audit=Provenance.buildTaskProvenance(task,{state,generatorPrompt:'SAME EXECUTION',providerPrompt:'SAME EXECUTION'});
  assert.equal(Provenance.productionNodeHint(Provenance.scriptContextFromTask(task,state),task),'prod-exact');
  assert.equal(audit.source.productionNodeId,'prod-exact');
  assert.equal(audit.source.prompt,'EXACT SOURCE');
  assert.equal(audit.source.promptRevision,8);
});

test('real task normalization retains creativeContext nodeId and audits that exact generator',()=>{
  const state=stateFixture();
  withState(state,()=>{
    const task=Upstream.normalizeTask({
      nodeType:'image',prompt:'SAME EXECUTION',references:[],
      parameters:{scriptNodeId:'script-1',shotId:'shot-1',creativeContext:{nodeId:'prod-exact',linkedReferences:[]}}
    });
    assert.equal(task.parameters.creativeContext.nodeId,'prod-exact');
    assert.equal(task.parameters.promptProvenance.source.productionNodeId,'prod-exact');
    assert.equal(task.parameters.promptProvenance.source.prompt,'EXACT SOURCE');
    assert.equal(task.parameters.promptProvenance.execution.generatorPrompt,'SAME EXECUTION');
  });
});

test('explicit productionNodeId also works for generator preflight task objects',()=>{
  const state=stateFixture();
  const task={nodeId:'prod-exact',nodeType:'image',prompt:'SAME EXECUTION',parameters:{scriptNodeId:'script-1',shotId:'shot-1',productionNodeId:'prod-exact'}};
  const source=Provenance.sourceRecord(task,state);
  assert.equal(source.productionNodeId,'prod-exact');
  assert.equal(source.prompt,'EXACT SOURCE');
});
