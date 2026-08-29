import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');

test('workflow status badge inserts into the header-right parent safely',()=>{
  assert.doesNotMatch(app,/\$\('.node-header',el\)\?\.insertBefore\(badge,\$\('.node-menu-btn',el\)\|\|null\)/);
  assert.match(app,/headerRight=\$\('.node-header-right',el\)/);
  assert.match(app,/headerRight.insertBefore\(badge,menu\|\|null\)/);
});
