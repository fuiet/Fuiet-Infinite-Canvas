import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../styles/script-shot-description-reference-v1.css', import.meta.url), 'utf8');
const boot = fs.readFileSync(new URL('../browser-bootstrap.js', import.meta.url), 'utf8');

test('shot description no longer prepends every referenced asset before prose', () => {
  assert.doesNotMatch(app, /return \[tokens\.join\(' '\),action\]/);
  assert.match(app, /const index=action\.indexOf\(name\);if\(index>=0\)action=action\.slice\(0,index\)\+'@'\+action\.slice\(index\)/);
});

test('shot description normalizes whitespace and preserves natural sentence order', () => {
  assert.match(app, /replace\(\/\\s\+\/g,' '\)\.trim\(\)/);
  assert.match(app, /if\(!action\)return refs\.map\(a=>'@'/);
});

test('reference-style cell is wide, left aligned and uses inline cyan mentions', () => {
  assert.match(css, /nth-child\(3\).*width:470px/s);
  assert.match(css, /\.shot-description-cell\{[\s\S]*text-align:left!important/);
  assert.match(css, /\.shot-mention-token\{[\s\S]*#21c7df!important/);
  assert.match(css, /-webkit-line-clamp:4/);
});

test('bootstrap loads description CSS and a current shot-description cache key', () => {
  assert.match(boot, /script-shot-description-reference-v1\.css/);
  assert.match(boot, /shotdesc=(?:reference-1|\$\{shotDescriptionV\})/);
});
