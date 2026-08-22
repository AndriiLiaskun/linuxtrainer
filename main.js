const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const PROGRESS_FILE = () => path.join(app.getPath('userData'), 'progress.json');

function defaultProgress() {
  return {
    version: 1,
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    completedDrills: {}, // lessonId -> [drillId, ...]
    badges: [],
    lastLessonId: null,
  };
}

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE(), 'utf8');
    const parsed = JSON.parse(raw);
    return { ...defaultProgress(), ...parsed };
  } catch (e) {
    return defaultProgress();
  }
}

function saveProgress(data) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE()), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE(), JSON.stringify(data, null, 2), 'utf8');
  return true;
}

ipcMain.handle('progress:load', () => loadProgress());
ipcMain.handle('progress:save', (event, data) => saveProgress(data));
ipcMain.handle('progress:reset', () => {
  const fresh = defaultProgress();
  saveProgress(fresh);
  return fresh;
});

// ---------------------------------------------------------------------
// Auto-update (GitHub Releases via electron-updater). Only meaningful in
// a packaged build — dev runs (`npm start`) have no app-update.yml, so
// every entry point here is guarded by app.isPackaged.
// ---------------------------------------------------------------------

let mainWindow = null;
let updateState = { status: 'idle', info: null, error: null, progress: null };

function sendUpdateState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:state', updateState);
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    updateState = { status: 'checking', info: null, error: null, progress: null };
    sendUpdateState();
  });
  autoUpdater.on('update-available', (info) => {
    updateState = { status: 'downloading', info, error: null, progress: null };
    sendUpdateState();
  });
  autoUpdater.on('update-not-available', () => {
    updateState = { status: 'up-to-date', info: null, error: null, progress: null };
    sendUpdateState();
  });
  autoUpdater.on('download-progress', (progress) => {
    updateState = { status: 'downloading', info: updateState.info, error: null, progress };
    sendUpdateState();
  });
  autoUpdater.on('update-downloaded', (info) => {
    updateState = { status: 'ready', info, error: null, progress: null };
    sendUpdateState();
  });
  autoUpdater.on('error', (err) => {
    updateState = { status: 'error', info: null, error: String(err && err.message ? err.message : err), progress: null };
    sendUpdateState();
  });
}

ipcMain.handle('updater:check', () => {
  if (!app.isPackaged) {
    updateState = { status: 'dev-mode', info: null, error: null, progress: null };
    sendUpdateState();
    return updateState;
  }
  autoUpdater.checkForUpdates().catch(() => {});
  return updateState;
});

ipcMain.handle('updater:install', () => {
  if (updateState.status === 'ready') autoUpdater.quitAndInstall();
});

ipcMain.handle('updater:getVersion', () => app.getVersion());

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      // Fully offline, single-origin trainer app that never loads remote
      // content — nodeIntegration is enabled deliberately so the renderer
      // can require() the shell engine / lesson data modules directly
      // without a bundler step.
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
  });

  mainWindow = win;
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();
  if (app.isPackaged) {
    // Silent background check ~5s after launch; renderer shows a toast
    // only if an update is actually found/downloaded.
    setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
