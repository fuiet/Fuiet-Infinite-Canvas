import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const VERSION='20260828-video-result-reconciliation-1';
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');

test('canvas loads reconciled browser runtime and bootstrap with a fresh cache version',()=>{
  const index=read('index.html');
  assert.ok(index.includes(`./browser-runtime.js?v=${VERSION}`));
  assert.ok(index.includes(`./browser-bootstrap.js?v=${VERSION}`));
});

test('model page uses the same fresh browser runtime cache version',()=>{
  const models=read('models.html');
  assert.ok(models.includes(`./browser-runtime.js?v=${VERSION}`));
  assert.ok(models.includes(`./browser-bootstrap.js?v=${VERSION}`));
});

test('bootstrap propagates reconciliation version to app.js and dynamic canvas scripts',()=>{
  const bootstrap=read('browser-bootstrap.js');
  assert.ok(bootstrap.includes(`const v='${VERSION}'`));
  assert.match(bootstrap,/`\.\/app\.js\?v=\$\{v\}`/);
});
