import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('connected video generator is allowed to grow for upstream reference rows', () => {
  const css = read('styles/video-generator-reference-layout-fix-v1.css');
  assert.match(css, /\.generator-panel\.video-generator\{[\s\S]*height:auto!important/);
  assert.match(css, /max-height:none!important/);
  assert.match(css, /\.video-generator-main\{[\s\S]*height:auto!important/);
  assert.match(css, /generator-reference-strip/);
});

test('video model and cost controls remain explicitly visible after references are connected', () => {
  const css = read('styles/video-generator-reference-layout-fix-v1.css');
  assert.match(css, /\.video-gen-controls\{[\s\S]*display:flex!important/);
  assert.match(css, /visibility:visible!important/);
  assert.match(css, /opacity:1!important/);
  assert.match(css, /\.generation-cost/);
  assert.match(css, /\.video-ref-slot/);
});

test('bootstrap loads connected video generator layout fix after base component styles', () => {
  const bootstrap = read('browser-bootstrap.js');
  assert.match(bootstrap, /video-generator-reference-layout-fix-v1\.css/);
});
