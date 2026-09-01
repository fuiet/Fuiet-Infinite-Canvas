import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles/composer.css', import.meta.url), 'utf8');

test('all generator prompt inputs stay frameless, including focus states', () => {
  assert.match(css, /\.generator-panel \.prompt-box:focus-within/);
  assert.match(css, /\.generator-panel \.audio-prompt-box:focus-within/);
  assert.match(css, /\.generator-panel \.prompt-box textarea:focus-visible/);
  assert.match(css, /\.generator-panel \.audio-prompt-box textarea:focus-visible/);
  assert.match(css, /border:0!important;/);
  assert.match(css, /outline:0!important;/);
  assert.match(css, /box-shadow:none!important;/);
  assert.match(css, /background:transparent!important;/);
});
