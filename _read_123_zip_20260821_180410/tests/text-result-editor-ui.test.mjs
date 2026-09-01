import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/text-node.css',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('normal text results do not expose the old AI action toolbar',()=>{
  assert.match(app,/if\(n\.type==='text'\)return\[\];/);
  assert.match(app,/if\(n\?\.type==='text'\)\{toolbar\.classList\.add\('hidden'\);return\}/);
  assert.doesNotMatch(app,/if\(n\.type==='text'\)return\[\{label:'改写'/);
});

test('generated text enters a larger editable node on double click',()=>{
  assert.match(app,/beginManualTextEdit\(n,\{fromResult:true\}\)/);
  assert.match(app,/n\.textEditing=Boolean\(fromResult\)/);
  assert.match(app,/n\.w=fromResult\?700:560;/);
  assert.match(app,/n\.h=fromResult\?400:320;/);
});

test('text result content is direct and frameless inside the node',()=>{
  assert.match(css,/data-content-state="result"\] \.text-node-preview\{[\s\S]*?border:0!important;[\s\S]*?box-shadow:none!important;[\s\S]*?background:transparent!important;/);
});

test('editing toolbar expand opens a real fullscreen editor',()=>{
  assert.match(app,/if\(action==='expand'\)\{openTextFullscreenEditor\(n\);return;\}/);
  assert.match(app,/function openTextFullscreenEditor\(n\)/);
  assert.match(app,/data-text-fullscreen-editor contenteditable="true"/);
  assert.match(css,/\.feature-modal\.text-fullscreen-modal\{[\s\S]*?position:fixed!important;[\s\S]*?inset:0!important;/);
});

test('text editor assets are cache busted without removing prior fixes',()=>{
  assert.match(index,/text-node\.css\?v=20260901-text-result-card-scroll-1&ui=text-result-editor-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1/);
});
