import test from 'node:test';
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
