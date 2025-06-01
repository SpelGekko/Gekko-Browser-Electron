const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const registerProtocolHandlers = require('./protocol-handlers');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Define default settings
const defaultSettings = {
  theme: 'dark',
  homePage: 'gkp://home.gekko/',
  searchEngine: 'https://www.google.com/search?q=',
  enableDevTools: false
};

let settings = { ...defaultSettings };
let history = [];

// IPC handlers
ipcMain.on('set-setting', (event, key, value) => {
  settings[key] = value;
});

ipcMain.on('get-settings', (event) => {
  event.returnValue = settings;
});

ipcMain.on('get-themes', (event) => {
  event.returnValue = ['dark', 'light', 'blue', 'purple', 'red'];
});

ipcMain.on('apply-theme', (event, themeId) => {
  // Save theme setting
  settings.theme = themeId;
  
  // Broadcast theme change to all windows
  BrowserWindow.getAllWindows().forEach(window => {
    try {
      window.webContents.send('theme-changed', themeId);
    } catch (error) {
      console.error('Error broadcasting theme change:', error);
    }
  });
});

ipcMain.on('get-history', (event) => {
  event.returnValue = history;
});

ipcMain.on('add-history', (event, url, title) => {
  history.push({ url, title, timestamp: Date.now() });
});

ipcMain.on('clear-history', () => {
  history = [];
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      webSecurity: true,
      sandbox: false
    },
    icon: path.join(__dirname, 'assets/icons/icon.svg'),
    show: false, // Don't show until ready-to-show
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open the DevTools in development
  if (process.env.NODE_ENV === 'development' || defaultSettings.enableDevTools) {
    mainWindow.webContents.openDevTools();
  }
  
  // Handle window control events
  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });
  
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  
  ipcMain.on('window:close', () => {
    mainWindow.close();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Register custom protocol handlers
  registerProtocolHandlers();
  
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
