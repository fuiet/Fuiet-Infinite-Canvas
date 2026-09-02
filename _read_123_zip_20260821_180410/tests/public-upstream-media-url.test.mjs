import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const preview=fs.readFileSync(new URL('../browser-runtime-preview.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('connected generated media prefers its original public source URL',()=>{
  assert.ok(app.includes('function generationReferenceUrl(node){'));
  assert.ok(app.includes("const source=String(node?.outputSourceUrl||'').trim();"));
  assert.ok(app.includes("return String(node?.outputUrl||'').trim();"));
  assert.equal((app.match(/url:generationReferenceUrl\(x\)/g)||[]).length,2);
  assert.equal((app.match(/sourceUrl:String\(x\.outputSourceUrl\|\|''\)/g)||[]).length,2);
});

test('browser image persistence keeps provider source separate from local display URL',()=>{
  assert.ok(preview.includes("function outputObject(value,modality='text',sourceUrl='')"));
  assert.ok(preview.includes('sourceUrl:String(sourceUrl||value)'));
  assert.ok(preview.includes("const sourceUrl=modality==='image'&&typeof value==='string'"));
  assert.ok(preview.includes('output:outputObject(value,modality,sourceUrl)'));
});

test('public upstream media repair is cache busted in both runtime layers',()=>{
  assert.ok(router.includes('20260902-public-upstream-media-1'));
  assert.ok(bootstrap.includes('20260902-public-upstream-media-1'));
});
