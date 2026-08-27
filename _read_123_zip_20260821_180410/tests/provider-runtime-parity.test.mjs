import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const node=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../dist/server/secure-index.js',import.meta.url),'utf8');
const compat=readFileSync(new URL('../dist/server/provider-compat-entry.js',import.meta.url),'utf8');
test('Node and Worker share provider adapter contract',()=>{
  assert.match(node,/ProviderAdapterContract\.inferAdapterKey/);
  assert.match(worker,/ProviderAdapterContract\.resolveRoute/);
  assert.match(worker,/pollMethod/);assert.match(worker,/pollBodyTemplate/);
  assert.match(compat,/body\.referenceTransport === 'auto'/);
});
