from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / '_read_123_zip_20260821_180410'

# 1) Make runtime data writable when packaged inside app.asar.
server_path = PROJECT / 'server.js'
server = server_path.read_text(encoding='utf-8')
old = "const DATA_DIR = path.join(ROOT, '.data');"
new = "const DATA_DIR = path.resolve(process.env.CANVAS_DATA_DIR || path.join(ROOT, '.data'));"
if old in server:
    server = server.replace(old, new, 1)
elif new not in server:
    raise SystemExit('server DATA_DIR marker missing')
server_path.write_text(server, encoding='utf-8')

# 2) Electron desktop bootstrap.
(PROJECT / 'electron-main.cjs').write_text(r'''const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const net = require('net');
const http = require('http');

const APP_NAME = 'Fuiet Infinite Canvas';
const HOST = '127.0.0.1';
let mainWindow = null;
let serverPort = null;
let serverStarted = false;

app.setName(APP_NAME);
const userDataRoot = path.join(app.getPath('appData'), APP_NAME);
app.setPath('userData', userDataRoot);

function getFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', reject);
    probe.listen(0, HOST, () => {
      const address = probe.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      probe.close(err => err ? reject(err) : resolve(port));
    });
  });
}

function healthCheck(port) {
  return new Promise(resolve => {
    const req = http.get({ host: HOST, port, path: '/api/health', timeout: 1200 }, res => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

async function waitForServer(port) {
  for (let i = 0; i < 80; i += 1) {
    if (await healthCheck(port)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

async function startLocalServer() {
  if (serverStarted) return serverPort;
  serverPort = await getFreePort();
  process.env.PORT = String(serverPort);
  process.env.CANVAS_DATA_DIR = path.join(userDataRoot, 'data');
  process.env.CANVAS_DESKTOP = '1';
  require('./server.js');
  serverStarted = true;
  if (!(await waitForServer(serverPort))) throw new Error('本地服务启动失败');
  return serverPort;
}

function isLocalAppUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === HOST && Number(u.port) === Number(serverPort);
  } catch {
    return false;
  }
}

async function createWindow() {
  const port = await startLocalServer();
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: 1500,
    height: 960,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#111111',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isLocalAppUrl(url)) return { action: 'allow' };
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isLocalAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url).catch(() => {});
  });

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  await mainWindow.loadURL(`http://${HOST}:${port}`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow).catch(error => {
    dialog.showErrorBox(APP_NAME, `启动失败：${error?.message || error}`);
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(() => {});
  });

  app.on('window-all-closed', () => app.quit());
}
''', encoding='utf-8')

# 3) Package configuration.
package_path = PROJECT / 'package.json'
pkg = json.loads(package_path.read_text(encoding='utf-8'))
pkg['version'] = '4.1.0'
pkg['productName'] = 'Fuiet Infinite Canvas'
pkg['main'] = 'electron-main.cjs'
pkg['description'] = 'Fuiet Infinite Canvas Windows 桌面单机版：内置 Electron/Node，本地 SQLite、本地媒体与本机加密供应商密钥。'
pkg['scripts']['desktop'] = 'electron .'
pkg['scripts']['check'] = pkg['scripts']['check'] + ' && node --check electron-main.cjs'
pkg['scripts']['dist:win'] = 'electron-builder --win nsis --x64'
pkg['devDependencies'] = {
    'electron': '44.0.0',
    'electron-builder': '26.15.3'
}
pkg['build'] = {
    'appId': 'com.fuiet.infinitecanvas',
    'productName': 'Fuiet Infinite Canvas',
    'asar': True,
    'directories': {'output': 'release'},
    'files': [
        '**/*',
        '!release/**',
        '!tests/**',
        '!scripts/**',
        '!.data/**',
        '!start-local.bat'
    ],
    'win': {
        'target': [{'target': 'nsis', 'arch': ['x64']}],
        'artifactName': 'Fuiet-Infinite-Canvas-Setup-${version}-${arch}.${ext}'
    },
    'nsis': {
        'oneClick': False,
        'perMachine': False,
        'allowToChangeInstallationDirectory': True,
        'createDesktopShortcut': True,
        'createStartMenuShortcut': True,
        'shortcutName': 'Fuiet Infinite Canvas',
        'deleteAppDataOnUninstall': False
    }
}
package_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# 4) Ignore installer output.
gitignore = PROJECT / '.gitignore'
gi = gitignore.read_text(encoding='utf-8')
if 'release/' not in gi.splitlines():
    gi += '\nrelease/\n'
gitignore.write_text(gi, encoding='utf-8')

# 5) Desktop packaging regression tests.
(PROJECT / 'tests' / 'desktop-packaging.test.mjs').write_text(r'''import test from 'node:test';
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
''', encoding='utf-8')

# 6) README desktop instructions.
readme = PROJECT / 'README.md'
text = readme.read_text(encoding='utf-8')
section = '''\n## Windows 桌面安装版\n\n仓库现在支持生成真正的 Windows x64 安装程序：\n\n```text\nFuiet-Infinite-Canvas-Setup-4.1.0-x64.exe\n```\n\n安装后从桌面快捷方式直接启动，不需要单独安装 Node.js，也不需要打开命令行。Electron 自带运行所需的 Node/Chromium。\n\n桌面版数据目录：\n\n```text\n%APPDATA%\\Fuiet Infinite Canvas\\data\n```\n\n其中包含 `secret.key`、`providers.json`、`canvas.sqlite` 和 `media/`。卸载程序默认不会删除这些创作数据。\n\n本地 API 每次启动自动选择一个空闲的 `127.0.0.1` 端口，只允许本机访问。\n\n开发模式：\n\n```bash\nnpm install\nnpm run desktop\n```\n\n构建 Windows 安装包：\n\n```bash\nnpm install\nnpm run dist:win\n```\n'''
if '## Windows 桌面安装版' not in text:
    text += section
readme.write_text(text, encoding='utf-8')

print('Electron desktop packaging patch applied.')
