const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const { PythonRunner } = require('./pythonRunner');

// Lives in userData (%APPDATA%/linuxtrainer on Windows) — a directory
// completely separate from the app's install folder, so NSIS
// install/update/uninstall never touches it (verified: electron-updater's
// silent NSIS update only replaces files under the install dir).
const PROGRESS_FILE = () => path.join(app.getPath('userData'), 'progress.json');
const BACKUP_FILE = () => path.join(app.getPath('userData'), 'progress.backup.json');
const TMP_FILE = () => path.join(app.getPath('userData'), 'progress.json.tmp');

function defaultProgress() {
  return {
    version: 1,
    xp: 0,
    streak: 0,
    lastActiveDate: null,
    completedDrills: {}, // lessonId -> [drillId, ...]
    completedPracticeDrills: {}, // lessonId -> [drillId, ...] (first-completion XP tracking)
    practiceStats: {}, // lessonId -> practiceEngine stats (adaptive difficulty, spaced repetition)
    badges: [],
    lastLessonId: null,
  };
}

function readJsonIfValid(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (e) {
    // missing, unreadable, or corrupted — caller falls back
  }
  return null;
}

function loadProgress() {
  // Prefer the main file; if it's missing/corrupted (e.g. a crash mid-write
  // sometime in the past, before the atomic-write fix below existed), fall
  // back to the last known-good backup rather than silently resetting XP.
  const primary = readJsonIfValid(PROGRESS_FILE());
  const data = primary || readJsonIfValid(BACKUP_FILE());
  return { ...defaultProgress(), ...(data || {}) };
}

function saveProgress(data) {
  const dir = path.dirname(PROGRESS_FILE());
  fs.mkdirSync(dir, { recursive: true });

  // Keep a backup of the last known-good save before overwriting it.
  if (fs.existsSync(PROGRESS_FILE())) {
    try {
      fs.copyFileSync(PROGRESS_FILE(), BACKUP_FILE());
    } catch (e) {
      // non-fatal — proceed with the save regardless
    }
  }

  // Write to a temp file and rename into place: rename is atomic on the
  // same volume, so a crash/power-loss mid-write can never leave
  // progress.json half-written/corrupted.
  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(TMP_FILE(), json, 'utf8');
  fs.renameSync(TMP_FILE(), PROGRESS_FILE());
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
  // isSilent=true, isForceRunAfter=true: install with no installer window
  // (matches nsis.oneClick=true) and relaunch automatically. userData
  // (progress.json — XP/streak/badges) lives outside the install directory
  // and is never touched by this, on this or any future version.
  if (updateState.status === 'ready') autoUpdater.quitAndInstall(true, true);
});

ipcMain.handle('updater:getVersion', () => app.getVersion());

// ---------------------------------------------------------------------
// Python execution (Pyodide, sandboxed WASM interpreter) for the
// Python-for-DevOps track. Runs in a worker_thread, NOT the renderer —
// Pyodide's internal loader does a dynamic require('node:fs') inside an
// ES module that Electron's renderer rejects even with nodeIntegration
// on; a plain Node worker has no such restriction. See pythonRunner.js
// for the timeout/respawn safety net and pythonWorker.js for the
// sandboxed execution + subprocess-to-Shell bridge.
// ---------------------------------------------------------------------

const pythonRunner = new PythonRunner();
ipcMain.handle('python:run', (event, code) => pythonRunner.run(code));

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
