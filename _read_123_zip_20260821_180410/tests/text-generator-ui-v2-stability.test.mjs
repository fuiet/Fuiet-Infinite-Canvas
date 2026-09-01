import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../ui-v2.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('UI v2 leaves text generator native controls stable', () => {
  const guard = ui.indexOf("if(kind==='文本'){");
  const headInsert = ui.indexOf('main.prepend(h)');
  assert.ok(guard >= 0, 'text generator guard must exist');
  assert.ok(headInsert > guard, 'text generator guard must run before detail header injection');
  assert.match(ui, /main\.querySelector\('\.detail-ui-head'\)\?\.remove\(\)/);
  assert.match(ui, /main\.querySelectorAll\('\.detail-section-label'\)\.forEach\(el=>el\.remove\(\)\)/);
});

test('browser cache-busts the stable text-controls UI v2 patch', () => {
  assert.match(bootstrap, /ui-v2\.js\?v=\$\{v\}&fix=text-controls-stable-1/);
});
