import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/edge-reference-cards-v1.css',import.meta.url),'utf8');
const bootstrap=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('incoming edges remain real generation references',()=>{
  assert.match(app,/state\.edges\.filter\(e=>e\.target===nodeId\)[\s\S]*?addRef\(/);
  assert.match(app,/function incomingEdgeReferences\(target\)[\s\S]*?state\.edges\.filter\(e=>e\.target===target\.id\)/);
  assert.match(app,/text:x\.generatedText\|\|x\.text\|\|x\.prompt\|\|''/);
});

test('upstream references render in the generator, never in the canvas node card',()=>{
  assert.doesNotMatch(app,/nodeIncomingReferenceHtml\(n\)/);
  assert.doesNotMatch(app,/data-has-references/);
  assert.match(app,/const incomingReferenceHtml=generatorIncomingReferenceHtml\(n\)/);
  assert.match(app,/function generatorIncomingReferenceHtml\(target\)[\s\S]*?incomingEdgeReferences\(target\)/);
  const uses=(app.match(/\$\{incomingReferenceHtml\}/g)||[]).length;
  assert.ok(uses>=5,`expected generator reference strip in script, image, video, audio and text generators; got ${uses}`);
});

test('every incoming edge becomes one visible reference chip',()=>{
  assert.match(app,/refs\.map\(\(\{source,role\},index\)=>/);
  assert.match(app,/data-reference-source="\$\{escapeAttr\(source\.id\)\}"/);
  assert.match(app,/data-reference-order="\$\{index\+1\}"/);
  const helper=app.slice(app.indexOf('function generatorIncomingReferenceHtml'),app.indexOf('function renderNode'));
  assert.doesNotMatch(helper,/refs\.slice\(/);
});

test('generator reference chips support text, media and upward hover detail',()=>{
  assert.match(app,/source\?\.generatedText\|\|source\?\.text\|\|source\?\.prompt/);
  assert.match(app,/source\?\.outputUrl/);
  assert.match(app,/class="generator-reference-popover" role="tooltip"/);
  assert.match(css,/\.generator-reference-strip\{/);
  assert.match(css,/\.generator-reference-chip:hover \.generator-reference-popover/);
  assert.match(css,/bottom:calc\(100% \+ 10px\)/);
  assert.doesNotMatch(css,/\.node-reference-stack/);
});

test('fixed generator shells expand to contain connected-reference rows',()=>{
  assert.match(app,/incomingRefCount=incomingEdgeReferences\(n\)\.length/);
  assert.match(app,/referenceRows=incomingRefCount\?Math\.ceil\(incomingRefCount\/refsPerRow\):0/);
  assert.match(app,/height=baseHeight\+Math\.min\(3,referenceRows\)\*52/);
});

test('generator reference assets are explicitly cache busted',()=>{
  assert.match(bootstrap,/edge-reference-cards-v1\.css\?v=\$\{v\}&ui=generator-reference-strip-1/);
  assert.match(bootstrap,/app\.js\?v=\$\{v\}&fix=generator-input-focus-1&ui=text-result-editor-1&wheel=text-editor-1&refs=generator-reference-strip-1/);
});
