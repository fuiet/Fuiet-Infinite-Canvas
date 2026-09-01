import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const runtime=fs.readFileSync(new URL('../browser-runtime.js',import.meta.url),'utf8');
const contract=fs.readFileSync(new URL('../provider-adapter-contract.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const models=fs.readFileSync(new URL('../models.html',import.meta.url),'utf8');

test('browser chat/completions always repairs legacy bodies without messages',()=>{
  assert.match(runtime,/isChatCompletions=route\?\.adapterKey==='openai-chat'\|\|\/\\\/chat\\\/completions/);
  assert.match(runtime,/if\(!isChatCompletions\|\|Array\.isArray\(templated\?\.messages\)\)return templated/);
  assert.match(runtime,/if\(isChatCompletions\)\{/);
  assert.match(runtime,/messages:\[\{role:'user',content\}\]/);
});

test('legacy generic adapters on chat/completions self-heal to openai-chat',()=>{
  assert.match(contract,/\^generic-\(\?:sync\|async\)\$/);
  assert.match(contract,/return 'openai-chat'/);
});

test('canvas and models pages fetch repaired assets while retaining shared runtime build contract',()=>{
  for(const html of [index,models]){
    assert.match(html,/provider-adapter-contract\.js\?v=20260901-video-wait-progress-1&fix=chat-messages-1/);
    assert.match(html,/browser-runtime\.js\?v=20260901-video-wait-progress-1&fix=chat-messages-1/);
  }
});
