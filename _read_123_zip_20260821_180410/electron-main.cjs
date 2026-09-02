const { app, BrowserWindow, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const net = require('net');
const http = require('http');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { installDesktopReferenceMediaTransport } = require('./desktop-reference-media-transport.cjs');

const execFileAsync = promisify(execFile);
const APP_NAME = 'Fuiet Infinite Canvas';
const HOST = '127.0.0.1';
let mainWindow = null;
let serverPort = null;
let serverStarted = false;

app.setName(APP_NAME);
const userDataRoot = path.join(app.getPath('appData'), APP_NAME);
app.setPath('userData', userDataRoot);

function bundledToolsRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'tools')
    : path.join(__dirname, 'runtime-tools');
}

function configureBundledMediaTools() {
  const root = bundledToolsRoot();
  const imageMagickRoot = path.join(root, 'imagemagick');
  const tools = {
    ffmpeg: path.join(root, 'ffmpeg', 'bin', 'ffmpeg.exe'),
    ffprobe: path.join(root, 'ffmpeg', 'bin', 'ffprobe.exe'),
    magick: path.join(imageMagickRoot, 'magick.exe')
  };

  const missing = Object.entries(tools).filter(([, file]) => !fs.existsSync(file));
  if (app.isPackaged && missing.length) {
    throw new Error(`安装包缺少内置媒体工具：${missing.map(([name]) => name).join('、')}`);
  }

  if (fs.existsSync(tools.ffmpeg)) process.env.FFMPEG_PATH = tools.ffmpeg;
  if (fs.existsSync(tools.ffprobe)) process.env.FFPROBE_PATH = tools.ffprobe;
  if (fs.existsSync(tools.magick)) {
    process.env.MAGICK_PATH = tools.magick;
    process.env.MAGICK_HOME = imageMagickRoot;
  }
  return tools;
}

async function verifyBundledMediaTools(tools) {
  if (!app.isPackaged) return;
  for (const [name, file] of Object.entries(tools)) {
    try {
      await execFileAsync(file, ['-version'], {
        timeout: 12000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
        env: process.env
      });
    } catch (error) {
      throw new Error(`内置媒体工具 ${name} 无法运行：${error?.message || error}`);
    }
  }
}

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
  process.env.CANVAS_RUNTIME = 'local';
  const bundledTools = configureBundledMediaTools();
  await verifyBundledMediaTools(bundledTools);

  // Install the desktop reference-media transport before server.js captures/uses
  // the global fetch implementation. This keeps local /media and data URLs from
  // leaking into provider requests and lets each model choose data-url, upload,
  // or public-url transport according to its own capability contract.
  installDesktopReferenceMediaTransport({ dataDir: process.env.CANVAS_DATA_DIR });

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
