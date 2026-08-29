import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('../video-protocol-registry.js',import.meta.url),'utf8');

test('desktop video config preserves strict polling routes',()=>{
  assert.match(server,/strictPollPath:raw\.strictPollPath === true \|\| old\.strictPollPath === true/);
  assert.match(registry,/profile:'agnes:'\+modelId[\s\S]*strictPollPath:true/);
});

test('desktop accepts only same-origin provider response polling routes',()=>{
  assert.match(server,/function providerVideoRouteUrl\(provider,value\)/);
  assert.match(server,/return url\.origin===baseOrigin\?url\.toString\(\):''/);
  assert.match(server,/function standardVideoResponsePollUrl\(created,provider,config=\{\}\)/);
  assert.match(server,/'poll_url','pollUrl','status_url','statusUrl','task_url','taskUrl'/);
  assert.match(server,/if\(config\.strictPollPath===true\)return''/);
});

test('desktop persists and resumes provider-derived poll route but strict routes ignore it',()=>{
  assert.match(server,/pollUrl:activePollUrl\|\|''/);
  assert.match(server,/activePollUrl=config\.strictPollPath===true\?'':providerVideoRouteUrl\(provider,resume\.pollUrl\)/);
  assert.match(server,/config\.strictPollPath===true\?\[\]:\[activePollUrl\]/);
});

test('task creation strips client supplied upstream state',()=>{
  assert.match(server,/taskPayload=\{\.\.\.body\};delete taskPayload\._upstream/);
  assert.match(server,/payload:taskPayload/);
});
