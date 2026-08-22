const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
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

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
