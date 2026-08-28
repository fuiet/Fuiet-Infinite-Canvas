import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const node=readFileSync(new URL('../server.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../dist/server/secure-index.js',import.meta.url),'utf8');
const compat=readFileSync(new URL('../dist/server/provider-compat-entry.js',import.meta.url),'utf8');

test('Node and Worker share provider adapter and runtime state cores',()=>{
  assert.match(node,/ProviderAdapterContract\.inferAdapterKey/);
  assert.match(worker,/ProviderAdapterContract\.resolveRoute/);
  assert.match(node,/ProviderRuntimeCore\.extractTaskId/);
  assert.match(node,/ProviderRuntimeCore\.classifyAsyncPoll/);
  assert.match(worker,/ProviderRuntimeCore\.extractTaskId/);
  assert.match(worker,/ProviderRuntimeCore\.classifyAsyncPoll/);
  assert.match(worker,/ProviderRuntimeCore\.nextPollDelay/);
  assert.match(compat,/body\.referenceTransport === 'auto'/);
});
