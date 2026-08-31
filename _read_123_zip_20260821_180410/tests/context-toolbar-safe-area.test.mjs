import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../styles/context-toolbar.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('context toolbars stay below workspace chrome',()=>{
  assert.match(app,/const CONTEXT_TOOLBAR_SAFE_TOP=58/);
  assert.match(app,/Math\.max\(CONTEXT_TOOLBAR_SAFE_TOP,r\.top-58\)/);
  assert.match(app,/Math\.max\(CONTEXT_TOOLBAR_SAFE_TOP,r\.top-60\)/);
  assert.doesNotMatch(app,/Math\.max\(16,r\.top-58\)/);
  assert.doesNotMatch(app,/Math\.max\(16,r\.top-60\)/);
});

test('context toolbar itself never blurs workspace behind it',()=>{
  assert.match(css,/\.node-toolbar\{[\s\S]*background:#1b1d1c/);
  assert.match(css,/backdrop-filter:none/);
  assert.match(css,/-webkit-backdrop-filter:none/);
});

test('canvas cache key advances for clear context toolbar',()=>{
  assert.match(boot,/20260831-xogpu-poll-fallback-1/);
});
