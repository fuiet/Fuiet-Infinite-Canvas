import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const Core=require('../script-workflow-core.js');
const Provenance=require('../script-prompt-provenance-v1.js');
const Upstream=require('../upstream-generation-inputs-v1.js');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

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

test('ordinary non-script generators do not receive fake prompt provenance',()=>{
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'普通图片提示词',parameters:{}},{state:{nodes:[]}});
  assert.equal(audit,null);
  const task=Upstream.normalizeTask({nodeType:'image',prompt:'普通图片提示词',references:[],parameters:{}});
  assert.equal(task.parameters.promptProvenance,undefined);
  assert.equal(task.parameters.upstreamInputContract.promptProvenance,false);
});

test('generator preflight UI exposes source and execution prompt status',()=>{
  const {state}=fixture();
  const audit=Provenance.buildTaskProvenance({nodeType:'image',prompt:'MANUAL EXECUTION PROMPT',parameters:{scriptNodeId:'script-1',shotId:'shot-1'}},{state,generatorPrompt:'MANUAL EXECUTION PROMPT',providerPrompt:'MANUAL EXECUTION PROMPT',submittedAt:'preview'});
  const html=Provenance.provenanceHtml(audit);
  assert.match(html,/提示词来源/);
  assert.match(html,/脚本最终提示词/);
  assert.match(html,/已人工调整/);
  assert.match(html,/AI ORIGINAL FINAL PROMPT/);
  assert.match(html,/MANUAL EXECUTION PROMPT/);
});

test('browser loads provenance before upstream task normalization and includes audit styles',()=>{
  const provenance=bootstrap.indexOf('./script-prompt-provenance-v1.js');
  const upstream=bootstrap.indexOf('./upstream-generation-inputs-v1.js');
  assert.ok(provenance>=0&&upstream>provenance);
  assert.match(bootstrap,/script-prompt-provenance-v1\.css\?v=\$\{batchInputV\}/);
  assert.match(bootstrap,/20260907-final-prompt-asset-source-5/);
  assert.match(bootstrap,/20260907-script-prompt-provenance-1/);
});
