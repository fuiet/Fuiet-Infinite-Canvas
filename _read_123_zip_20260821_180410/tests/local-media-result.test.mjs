import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const {verifyLocalMediaProcessResult}=require('../local-media-result.js');

test('transforming media operation must return at least one output',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-media-'));
  assert.throws(()=>verifyLocalMediaProcessResult({outputs:[]},dir),/没有生成任何输出文件/);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('media success requires the referenced local file to exist and be non-empty',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-media-'));
  assert.throws(()=>verifyLocalMediaProcessResult({outputs:[{type:'video',url:'/media/missing.mp4'}]},dir),/结果文件不存在/);
  fs.writeFileSync(path.join(dir,'empty.mp4'),Buffer.alloc(0));
  assert.throws(()=>verifyLocalMediaProcessResult({outputs:[{type:'video',url:'/media/empty.mp4'}]},dir),/结果文件为空/);
  fs.writeFileSync(path.join(dir,'real.mp4'),Buffer.from('not-empty'));
  const result={outputs:[{type:'video',url:'/media/real.mp4'}]};
  assert.equal(verifyLocalMediaProcessResult(result,dir),result);
  fs.rmSync(dir,{recursive:true,force:true});
});

test('metadata-only probe result is valid without creating a new file',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fuiet-media-'));
  const result={meta:{duration:1.2,video:{codec:'h264'}}};
  assert.equal(verifyLocalMediaProcessResult(result,dir),result);
  fs.rmSync(dir,{recursive:true,force:true});
});
