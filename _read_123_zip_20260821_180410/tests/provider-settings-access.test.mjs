import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('creator settings remains visible and exposes provider configuration', () => {
  const html = read('index.html');
  const app = read('app.js');
  const workspace = read('styles/workspace.css');

  assert.match(html, /id="settingsBtn"/);
  assert.match(html, /id="providerModal"/);
  assert.match(workspace, /#settingsBtn\{display:grid\}/);
  assert.doesNotMatch(workspace, /#contextBtn,#taskBtn,#agentBtn,#settingsBtn\{display:none\}/);
  assert.match(app, /data-setting="providers">API 供应商/);
  assert.match(app, /if\(b\.dataset\.setting==='providers'\)openProviderModal\(\)/);
  assert.match(app, /PROVIDERS_STORAGE_KEY/);
});
