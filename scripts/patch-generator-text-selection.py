from pathlib import Path

ROOT = Path('_read_123_zip_20260821_180410')
css_path = ROOT / 'styles' / 'composer.css'
index_path = ROOT / 'index.html'
test_path = ROOT / 'tests' / 'generator-text-selection.test.mjs'

css = css_path.read_text(encoding='utf-8')
rule = """
/* Generator chrome is UI, not selectable document text. Keep editing surfaces selectable. */
.generator-panel,
.generator-panel *{
  -webkit-user-select:none;
  user-select:none;
}
.generator-panel textarea,
.generator-panel input,
.generator-panel [contenteditable=\"true\"],
.generator-panel [contenteditable=\"plaintext-only\"]{
  -webkit-user-select:text;
  user-select:text;
}
"""
anchor = '.generator-panel.hidden{display:none}\n'
if rule.strip() not in css:
    if anchor not in css:
        raise SystemExit('composer generator anchor missing')
    css = css.replace(anchor, anchor + rule, 1)
css_path.write_text(css, encoding='utf-8')

index = index_path.read_text(encoding='utf-8')
old = '<link rel="stylesheet" href="./styles/composer.css" />'
new = '<link rel="stylesheet" href="./styles/composer.css?v=20260901-generator-text-selection-1" />'
if old in index:
    index = index.replace(old, new, 1)
elif new not in index:
    raise SystemExit('composer stylesheet link missing')
index_path.write_text(index, encoding='utf-8')

test_path.write_text("""import test from 'node:test';
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
""", encoding='utf-8')

print('generator text selection repair applied')
