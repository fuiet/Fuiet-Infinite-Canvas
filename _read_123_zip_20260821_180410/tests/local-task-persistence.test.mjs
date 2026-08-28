import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {CanvasStore}=require('../store.js');

function createTask(id='task_test'){
  const now=new Date().toISOString();
  return {id,status:'queued',progress:0,providerId:'p1',modelId:'m1',nodeType:'video',payload:{},output:null,error:null,createdAt:now,updatedAt:now,attempt:0,maxRetries:1,cancelRequested:false,logs:[]};
}

test('successful local task cannot be overwritten by a stale failure callback',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-store-'));
  const store=new CanvasStore(dir);
  store.createTask(createTask());
  store.updateTask('task_test',{status:'succeeded',progress:100,output:{type:'url',value:'/media/final.mp4'}});
  store.updateTask('task_test',{status:'failed',error:'late timeout from stale poller'});
  const task=store.getTask('task_test');
  assert.equal(task.status,'succeeded');
  assert.equal(task.providerStatus,'succeeded');
  assert.equal(task.resultStatus,'saved');
  assert.equal(task.output.value,'/media/final.mp4');
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});

test('provider success converts later local persistence failure into result_pending',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-store-'));
  const store=new CanvasStore(dir);
  store.createTask(createTask('task_provider_ok'));
  store.updateTask('task_provider_ok',{status:'provider_succeeded',providerStatus:'succeeded',providerOutput:{url:'https://cdn.example.test/final.mp4'}});
  store.updateTask('task_provider_ok',{status:'failed',error:'disk temporarily unavailable'});
  const task=store.getTask('task_provider_ok');
  assert.equal(task.status,'result_pending');
  assert.equal(task.providerStatus,'succeeded');
  assert.equal(task.lastError,'disk temporarily unavailable');
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});

test('interrupted polling task is resumed from the persistent queue after restart',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-store-'));
  let store=new CanvasStore(dir);
  store.createTask(createTask('task_resume'));
  store.updateTask('task_resume',{status:'polling',progress:61,payload:{_upstream:{protocol:'standard-video-async-v1',modelId:'m1',id:'up_123'}}});
  store.db.close();
  store=new CanvasStore(dir);
  const task=store.getTask('task_resume');
  assert.equal(task.status,'queued');
  assert.equal(task.upstreamTaskId,'up_123');
  assert.equal(task.payload._upstream.id,'up_123');
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});

test('cancelling task remains canceled after restart instead of being regenerated',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-store-'));
  let store=new CanvasStore(dir);
  store.createTask(createTask('task_cancel'));
  store.updateTask('task_cancel',{status:'cancelling',cancelRequested:true});
  store.db.close();
  store=new CanvasStore(dir);
  const task=store.getTask('task_cancel');
  assert.equal(task.status,'canceled');
  assert.equal(task.cancelRequested,true);
  store.db.close();
  fs.rmSync(dir,{recursive:true,force:true});
});
