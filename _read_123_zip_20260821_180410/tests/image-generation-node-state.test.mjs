import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'styles/image-node.css'),'utf8');

test('image generation skeleton uses selected aspect ratio for every ratio',()=>{
  assert.ok(app.includes("const imageGenerating=['queued','running'].includes(String(n.taskStatus||''));"));
  assert.ok(app.includes("const targetRatio=String(n.aspectRatio||n.cropRatio||'1:1')"));
  assert.ok(app.includes('aspect-ratio:${escapeAttr(ratioCss)}'));
  assert.ok(app.includes('image-node-placeholder image-node-stage" style="${ratioStyle}'));
});

test('image generation skeleton shows target dimensions and generation state',()=>{
  assert.ok(app.includes('CanvasImageRequestParameters?.normalize'));
  assert.ok(app.includes('image-node-generating-size'));
  assert.ok(app.includes('image-node-generating-overlay'));
  assert.ok(css.includes('.image-node-generating-size{'));
  assert.ok(css.includes('.image-node-generating-overlay{'));
});

test('queued and running image nodes are auto-height and hide empty controls',()=>{
  assert.ok(css.includes('.node.node-image[data-task-state="queued"],'));
  assert.ok(css.includes('.node.node-image[data-task-state="running"]{'));
  assert.ok(css.includes('height:auto!important;'));
  assert.ok(css.includes('.image-node-shell.is-generating'));
  assert.ok(css.includes('background:transparent!important;'));
  assert.ok(css.includes('animation:imageNodeGeneratingShimmer'));
  assert.ok(css.includes('.image-node-upload{display:none!important}'));
});
