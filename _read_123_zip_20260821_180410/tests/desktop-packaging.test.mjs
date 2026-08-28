import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const desktop = fs.readFileSync(path.join(ROOT, 'electron-main.cjs'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

test('packaged desktop writes mutable state to userData instead of app.asar', () => {
  assert.match(server, /process\.env\.CANVAS_DATA_DIR/);
  assert.match(desktop, /app\.getPath\('appData'\)/);
  assert.match(desktop, /process\.env\.CANVAS_DATA_DIR = path\.join\(userDataRoot, 'data'\)/);
});

test('desktop renderer has no Node privileges and local navigation is constrained', () => {
  assert.match(desktop, /nodeIntegration: false/);
  assert.match(desktop, /contextIsolation: true/);
  assert.match(desktop, /sandbox: true/);
  assert.match(desktop, /webSecurity: true/);
  assert.match(desktop, /requestSingleInstanceLock/);
});

test('Windows NSIS packaging is configured as a self-contained x64 installer', () => {
  assert.equal(pkg.main, 'electron-main.cjs');
  assert.equal(pkg.devDependencies.electron, '44.0.0');
  assert.equal(pkg.devDependencies['electron-builder'], '26.15.3');
  assert.equal(pkg.build.win.target[0].target, 'nsis');
  assert.deepEqual(pkg.build.win.target[0].arch, ['x64']);
  assert.equal(pkg.build.nsis.createDesktopShortcut, true);
  assert.equal(pkg.build.nsis.allowToChangeInstallationDirectory, true);
  assert.equal(pkg.scripts['dist:win'], 'electron-builder --win nsis --x64');
});
