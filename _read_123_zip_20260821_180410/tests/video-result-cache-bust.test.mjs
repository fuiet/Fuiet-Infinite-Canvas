import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const REGISTRY_VERSION='20260831-video-result-autofit-1';
const APP_VERSION='20260831-video-result-autofit-1';
const BOOTSTRAP_VERSION='20260831-video-result-autofit-1';
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');

test('canvas loads video registry runtime and bootstrap with a fresh cache version',()=>{
  const index=read('index.html');
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js'])assert.ok(index.includes(`./${file}?v=${REGISTRY_VERSION}`),file);
  assert.ok(index.includes(`./browser-bootstrap.js?v=${BOOTSTRAP_VERSION}`),'browser-bootstrap.js');
});

test('model page uses the same fresh video registry runtime cache version',()=>{
  const models=read('models.html');
  for(const file of ['video-protocol-registry.js','provider-adapter-contract.js','provider-runtime-core.js','browser-runtime.js'])assert.ok(models.includes(`./${file}?v=${REGISTRY_VERSION}`),file);
  assert.ok(models.includes(`./browser-bootstrap.js?v=${BOOTSTRAP_VERSION}`),'browser-bootstrap.js');
});

test('bootstrap may keep unchanged app scripts on the reconciliation version',()=>{
  const bootstrap=read('browser-bootstrap.js');
  assert.ok(bootstrap.includes(`const v='${APP_VERSION}'`));
  assert.match(bootstrap,/`\.\/app\.js\?v=\$\{v\}`/);
});
