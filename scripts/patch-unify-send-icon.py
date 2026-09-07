from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
icon = ROOT / 'node-send-icon-v1.js'
bootstrap = ROOT / 'browser-bootstrap.js'
test = ROOT / 'tests' / 'unified-send-icon.test.mjs'

icon.write_text(r'''/* Fuiet Infinite Canvas · Unified generation send icon v2
 * Keeps real next/previous navigation icons intact. Only generation-submit
 * buttons that still render the legacy `next` glyph are normalized.
 */
(()=>{
'use strict';

const SEND_SVG=`<svg class="ui-icon node-send-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/></svg>`;
const CORE_SELECTOR=[
  '#generateBtn',
  '#scriptGenerateBtn',
  '.generate-btn',
  '.image-generate-btn',
  '.video-generate-btn',
  '.audio-generate-btn',
  '[data-generate-submit]'
].join(',');

function compactPath(value){return String(value||'').replace(/\s+/g,'').toLowerCase()}
function hasLegacyNextGlyph(btn){
  const paths=[...btn.querySelectorAll('svg path')].map(p=>compactPath(p.getAttribute('d')));
  return paths.includes('m146v12')&&paths.includes('m56l106-106');
}
function generationSemantic(btn){
  const hint=[btn.id,btn.className,btn.getAttribute('title'),btn.getAttribute('aria-label'),btn.dataset?.action,btn.dataset?.act]
    .filter(Boolean).join(' ').toLowerCase();
  return /generate|生成|发送/.test(hint);
}
function shouldNormalize(btn){
  if(!(btn instanceof HTMLButtonElement))return false;
  if(btn.matches(CORE_SELECTOR))return true;
  return generationSemantic(btn)&&hasLegacyNextGlyph(btn);
}
function normalizeButton(btn){
  if(!shouldNormalize(btn))return;
  if(btn.dataset.sendIcon==='up-v2'&&btn.querySelector('.node-send-arrow'))return;
  btn.innerHTML=SEND_SVG;
  btn.dataset.sendIcon='up-v2';
  if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label','发送生成');
  if(!btn.getAttribute('title'))btn.setAttribute('title','发送生成');
}
function applySendIcon(root=document){
  if(root instanceof HTMLButtonElement)normalizeButton(root);
  root.querySelectorAll?.('button').forEach(normalizeButton);
}

applySendIcon(document);
const observer=new MutationObserver(records=>{
  for(const record of records){
    if(record.target instanceof HTMLElement)applySendIcon(record.target);
    record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)applySendIcon(node)});
  }
});
if(document.body)observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['id','class','title','aria-label']});

})();
''', encoding='utf-8')

text = bootstrap.read_text(encoding='utf-8')
old = "const promptWorkbenchV='20260907-final-prompt-workbench-v4-1';"
new = old + "\nconst sendIconV='20260907-unified-send-icon-v2-1';"
if 'sendIconV=' not in text:
    if old not in text:
        raise SystemExit('bootstrap anchor not found')
    text = text.replace(old, new, 1)
text = text.replace("{src:`./node-send-icon-v1.js?v=${v}`,attrs:{'data-node-send-icon':'1'}}", "{src:`./node-send-icon-v1.js?v=${sendIconV}`,attrs:{'data-node-send-icon':'2'}}")
bootstrap.write_text(text, encoding='utf-8')

test.write_text(r'''import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root='_read_123_zip_20260821_180410';
const icon=fs.readFileSync(`${root}/node-send-icon-v1.js`,'utf8');
const bootstrap=fs.readFileSync(`${root}/browser-bootstrap.js`,'utf8');

test('generation send icon normalizer observes the whole document, not only generatorPanel',()=>{
  assert.match(icon,/applySendIcon\(document\)/);
  assert.match(icon,/observer\.observe\(document\.body/);
  assert.doesNotMatch(icon,/const generator=document\.querySelector\('#generatorPanel'\)/);
});

test('known image video audio text and script generation buttons use the unified send arrow',()=>{
  for(const token of ['#generateBtn','#scriptGenerateBtn','.generate-btn','.image-generate-btn','.video-generate-btn','.audio-generate-btn']){
    assert.ok(icon.includes(token),token);
  }
  assert.match(icon,/node-send-arrow/);
  assert.match(icon,/btn\.dataset\.sendIcon='up-v2'/);
});

test('legacy next glyph is only normalized when button semantics indicate generation',()=>{
  assert.match(icon,/hasLegacyNextGlyph/);
  assert.match(icon,/generationSemantic\(btn\)&&hasLegacyNextGlyph\(btn\)/);
  assert.match(icon,/generate\|生成\|发送/);
});

test('global next navigation icon definition is not modified by this feature module',()=>{
  assert.doesNotMatch(icon,/UI_ICONS/);
  assert.doesNotMatch(icon,/next:/);
});

test('bootstrap cache-busts unified send icon v2',()=>{
  assert.match(bootstrap,/const sendIconV='20260907-unified-send-icon-v2-1'/);
  assert.match(bootstrap,/node-send-icon-v1\.js\?v=\$\{sendIconV\}/);
  assert.match(bootstrap,/data-node-send-icon':'2'/);
});
''', encoding='utf-8')

print('Unified generation send icon across late-loaded and non-generatorPanel surfaces.')
