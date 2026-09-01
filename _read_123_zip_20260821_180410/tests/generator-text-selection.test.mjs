import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../styles/composer.css', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('generator chrome cannot be accidentally text-selected', () => {
  assert.match(css, /\.generator-panel,\s*\.generator-panel \*\{[\s\S]*?user-select:none;/);
});

test('generator editing surfaces remain selectable', () => {
  assert.match(css, /\.generator-panel textarea,[\s\S]*?\.generator-panel input,[\s\S]*?user-select:text;/);
});

test('canvas cache-busts the generator selection stylesheet', () => {
  assert.match(index, /styles\/composer\.css\?v=20260901-generator-text-selection-1/);
});
