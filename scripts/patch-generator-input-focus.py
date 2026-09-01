from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
app_path = ROOT / 'app.js'
bootstrap_path = ROOT / 'browser-bootstrap.js'
test_path = ROOT / 'tests' / 'generator-input-focus-stability.test.mjs'

app = app_path.read_text(encoding='utf-8')
helper = """  let generatorPromptComposing=false;\n  const isGeneratorPromptInput=el=>Boolean(el&&generator.contains(el)&&(el.id==='promptInput'||el.id==='scriptDetailPrompt'));\n  generator.addEventListener('compositionstart',e=>{if(isGeneratorPromptInput(e.target))generatorPromptComposing=true},true);\n  generator.addEventListener('compositionend',e=>{if(isGeneratorPromptInput(e.target))generatorPromptComposing=false},true);\n  function captureGeneratorPromptFocus(){\n    const active=document.activeElement;\n    if(!isGeneratorPromptInput(active))return null;\n    return {id:active.id,value:active.value,start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection};\n  }\n  function restoreGeneratorPromptFocus(state){\n    if(!state)return;\n    const input=generator.querySelector('#'+state.id);\n    if(!input)return;\n    if(input.value!==state.value)input.value=state.value;\n    try{input.focus({preventScroll:true})}catch{input.focus()}\n    if(typeof input.setSelectionRange==='function'&&Number.isInteger(state.start)&&Number.isInteger(state.end)){\n      try{input.setSelectionRange(state.start,state.end,state.direction||'none')}catch{}\n    }\n  }\n\n"""
anchor = "  function renderGenerator(){\n"
if helper not in app:
    if anchor not in app:
        raise SystemExit('renderGenerator anchor missing')
    app = app.replace(anchor, helper + anchor, 1)

old_head = """  function renderGenerator(){\n    if(!expandedNodeId){generator.classList.add('hidden');return}\n    const n=state.nodes.find(x=>x.id===expandedNodeId);if(!n||!['image','video','audio','text','script'].includes(n.type)){generator.classList.add('hidden');return}\n    if(n.type==='text'&&n.textInputMode==='manual'){expandedNodeId=null;generator.classList.add('hidden');return}\n    const el=$(`.node[data-id=\"${n.id}\"]`);if(!el){generator.classList.add('hidden');return}\n"""
new_head = """  function renderGenerator(){\n    if(!expandedNodeId){generator.classList.add('hidden');return}\n    const n=state.nodes.find(x=>x.id===expandedNodeId);if(!n||!['image','video','audio','text','script'].includes(n.type)){generator.classList.add('hidden');return}\n    if(n.type==='text'&&n.textInputMode==='manual'){expandedNodeId=null;generator.classList.add('hidden');return}\n    const promptFocus=captureGeneratorPromptFocus();\n    if(generatorPromptComposing&&promptFocus)return;\n    if(promptFocus)queueMicrotask(()=>restoreGeneratorPromptFocus(promptFocus));\n    const el=$(`.node[data-id=\"${n.id}\"]`);if(!el){generator.classList.add('hidden');return}\n"""
if new_head not in app:
    if old_head not in app:
        raise SystemExit('renderGenerator head missing')
    app = app.replace(old_head, new_head, 1)
app_path.write_text(app, encoding='utf-8')

bootstrap = bootstrap_path.read_text(encoding='utf-8')
old_boot = "  `./app.js?v=${v}`,"
new_boot = "  `./app.js?v=${v}&fix=generator-input-focus-1`,"
if old_boot in bootstrap:
    bootstrap = bootstrap.replace(old_boot, new_boot, 1)
elif new_boot not in bootstrap:
    raise SystemExit('app.js bootstrap loader anchor missing')
bootstrap_path.write_text(bootstrap, encoding='utf-8')

test_path.write_text("""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('generator rerenders preserve prompt focus and caret', () => {
  assert.match(app, /function captureGeneratorPromptFocus\(\)/);
  assert.match(app, /function restoreGeneratorPromptFocus\(state\)/);
  assert.match(app, /queueMicrotask\(\(\)=>restoreGeneratorPromptFocus\(promptFocus\)\)/);
  assert.match(app, /input\.focus\(\{preventScroll:true\}\)/);
  assert.match(app, /input\.setSelectionRange\(state\.start,state\.end,state\.direction\|\|'none'\)/);
});

test('generator does not rebuild a prompt during IME composition', () => {
  assert.match(app, /generator\.addEventListener\('compositionstart'/);
  assert.match(app, /generator\.addEventListener\('compositionend'/);
  assert.match(app, /if\(generatorPromptComposing&&promptFocus\)return;/);
});

test('browser cache-busts the generator input focus repair', () => {
  assert.match(bootstrap, /app\.js\?v=\$\{v\}&fix=generator-input-focus-1/);
});
""", encoding='utf-8')

print('generator input focus repair applied')
