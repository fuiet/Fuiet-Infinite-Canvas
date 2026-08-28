const { app, BrowserWindow, dialog, shell } = require('electron');
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
