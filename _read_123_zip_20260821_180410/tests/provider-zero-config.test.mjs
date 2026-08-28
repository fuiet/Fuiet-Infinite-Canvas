import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../provider-adapter-contract.js';

const Contract=globalThis.CanvasProviderAdapters;
const DIR=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(DIR,'..');

test('old imported gpt-image model is finalized into an immediately executable image adapter',()=>{
  const provider={
    id:'fuapi',
    name:'svip.fuapi.com',
    baseUrl:'https://svip.fuapi.com/v1',
    protocol:'auto',
    models:[{
      id:'gpt-image-2',
      name:'gpt-image-2',
      modality:'image',
      enabled:true,
      adapterKey:'auto',
      createPath:'',
      method:'POST',
      responseMode:'async',
      outputPath:'output.url',
      taskIdPath:'id',
      pollPath:'/v1/tasks/{{taskId}}',
      statusPath:'status',
      requestTemplate:{model:'{{model}}',prompt:'{{prompt}}',references:'{{references}}'}
    }]
  };
  const finalized=Contract.finalizeProvider(provider);
  const model=finalized.models[0];
  assert.equal(model.adapterKey,'openai-image');
  assert.equal(model.adapterResolved.ready,true);
  assert.equal(model.createPath,'/v1/images/generations');
  assert.equal(model.method,'POST');
  assert.equal(model.responseMode,'sync');
  assert.equal(model.outputPath,'data.0.url');
  assert.equal(model.taskIdPath,'');
  assert.equal(model.pollPath,'');
  assert.deepEqual(model.requestTemplate,{});
});

test('explicit custom provider route is preserved by auto finalization',()=>{
  const provider={baseUrl:'https://custom.vendor.test',protocol:'generic-rest'};
  const model={
    id:'custom-image',modality:'image',adapterKey:'generic-async',
    createPath:'/jobs/create',responseMode:'async',outputPath:'result.url',
    taskIdPath:'job.id',pollPath:'/jobs/{{taskId}}',statusPath:'state',
    requestTemplate:{prompt:'{{prompt}}'}
  };
  const finalized=Contract.finalizeModel(provider,model,'image');
  assert.equal(finalized.adapterKey,'generic-async');
  assert.equal(finalized.createPath,'/jobs/create');
  assert.equal(finalized.responseMode,'async');
  assert.equal(finalized.outputPath,'result.url');
  assert.equal(finalized.pollPath,'/jobs/{{taskId}}');
  assert.deepEqual(finalized.requestTemplate,{prompt:'{{prompt}}'});
  assert.equal(finalized.adapterResolved.ready,true);
});

test('canvas and models pages hydrate storage before real auto configuration and application model logic',()=>{
  const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const models=fs.readFileSync(path.join(ROOT,'models.html'),'utf8');
  const bootstrap=fs.readFileSync(path.join(ROOT,'browser-bootstrap.js'),'utf8');
  const contract='./provider-adapter-contract.js';
  assert.ok(index.indexOf(contract)>=0);
  assert.ok(index.indexOf('./browser-runtime.js')>index.indexOf(contract));
  assert.ok(index.indexOf('./browser-storage-manager.js')>index.indexOf('./browser-runtime.js'));
  assert.ok(index.indexOf('./browser-bootstrap.js')>index.indexOf('./browser-storage-manager.js'));
  assert.ok(models.indexOf(contract)>=0);
  assert.ok(models.indexOf('./browser-bootstrap.js')>models.indexOf('./browser-storage-manager.js'));
  const auto=bootstrap.indexOf('./provider-auto-config-v1.js');
  assert.ok(auto>=0);
  assert.ok(bootstrap.indexOf('./app.js')>auto);
  assert.ok(bootstrap.indexOf('./models.js')>auto);
  assert.equal(bootstrap.includes('provider-auto-ready-v1.js'),false);
});
