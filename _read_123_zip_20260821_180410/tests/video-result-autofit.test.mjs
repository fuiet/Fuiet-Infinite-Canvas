import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../styles/video-result-autofit-v1.css',import.meta.url),'utf8');
const boot=fs.readFileSync(new URL('../browser-bootstrap.js',import.meta.url),'utf8');

test('video results ignore stale node height and hug intrinsic media height',()=>{
  assert.match(css,/\.node\.node-video\[data-content-state="result"\][\s\S]*height:auto!important/);
  assert.match(css,/>\.node-body[\s\S]*align-items:flex-start!important/);
  assert.match(css,/\.video-node-shell\.has-output[\s\S]*height:auto!important/);
  assert.match(css,/video\.node-media-video[\s\S]*height:auto!important/);
});

test('video result autofit stylesheet is loaded on canvas bootstrap',()=>{
  assert.match(boot,/video-result-autofit-v1\.css\?v=\$\{v\}/);
  assert.match(boot,/20260831-low-zoom-media-visible-1/);
});
