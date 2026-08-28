import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const desktop=fs.readFileSync(path.join(ROOT,'electron-main.cjs'),'utf8');
const toolScript=fs.readFileSync(path.join(ROOT,'scripts','fetch-windows-media-tools.ps1'),'utf8');

test('Windows desktop package is configured without changing the application version',()=>{
  assert.equal(pkg.version,'4.7.1');
  assert.equal(pkg.productName,'Fuiet Infinite Canvas');
  assert.equal(pkg.main,'electron-main.cjs');
  assert.equal(pkg.build.appId,'com.fuiet.infinitecanvas');
  assert.equal(pkg.build.win.target[0].target,'nsis');
  assert.deepEqual(pkg.build.win.target[0].arch,['x64']);
  assert.equal(pkg.build.nsis.deleteAppDataOnUninstall,false);
});

test('installer build prepares and verifies pinned local media tools before electron-builder',()=>{
  assert.match(pkg.scripts['dist:win'],/desktop:prepare:win.*desktop:verify.*electron-builder/);
  assert.match(toolScript,/\$FfmpegSha256\s*=\s*'[0-9a-f]{64}'/i);
  assert.match(toolScript,/\$ImageMagickSha256\s*=\s*'[0-9a-f]{64}'/i);
  assert.match(toolScript,/tool-manifest\.json/);
  assert.match(toolScript,/THIRD_PARTY_NOTICES\.txt/);
});

test('packaged app refuses to start when required bundled media tools are missing',()=>{
  assert.match(desktop,/if \(app\.isPackaged && missing\.length\)/);
  assert.match(desktop,/安装包缺少内置媒体工具/);
  assert.match(desktop,/verifyBundledMediaTools/);
  assert.match(desktop,/process\.resourcesPath, 'tools'/);
});

test('renderer has no Node privileges and external navigation leaves the app',()=>{
  assert.match(desktop,/nodeIntegration: false/);
  assert.match(desktop,/contextIsolation: true/);
  assert.match(desktop,/sandbox: true/);
  assert.match(desktop,/webSecurity: true/);
  assert.match(desktop,/shell\.openExternal/);
});
