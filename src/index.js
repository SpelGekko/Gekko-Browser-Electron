const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const registerProtocolHandlers = require('./protocol-handlers');
const historyStorage = require('./history-storage');
const settingsStorage = require('./settings-storage');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Get initial settings
let settings = settingsStorage.getSettings();

// IPC handlers
ipcMain.on('set-setting', (event, key, value) => {
  console.log(`Main process: Setting "${key}" to:`, value);
  
  // Handle settings with special cases for important ones like theme
  if (key === 'theme') {
    // For theme, apply an extra layer of validation and reliability
    if (!value || typeof value !== 'string') {
      console.error('Invalid theme value:', value);
      return;
    }
    
    // Try to save with multiple attempts for theme setting
    const result = settingsStorage.setSetting(key, value);
    if (result !== true) {
      console.error('Error saving theme setting:', result);
      // Retry after a short delay
      setTimeout(() => {
        const retryResult = settingsStorage.setSetting(key, value);
        console.log('Theme save retry result:', retryResult === true ? 'Success' : 'Failed');
      }, 500);
    }
  } else {
    // For other settings, standard behavior
    settingsStorage.setSetting(key, value);
  }
  
  // Update local settings
  settings = settingsStorage.getSettings();
});

ipcMain.on('get-settings', (event) => {
  // Refresh settings from storage
  settings = settingsStorage.getSettings();
  event.returnValue = settings;
});

ipcMain.on('get-themes', (event) => {
  event.returnValue = ['dark', 'light', 'blue', 'purple', 'red'];
});

// Handle theme changes with priority and reliability
ipcMain.on('apply-theme', (event, themeId) => {
  console.log('Main process: Theme change requested to', themeId);
  
  // Validate theme
  if (!themeId || typeof themeId !== 'string') {
    console.error('Invalid theme ID:', themeId);
    themeId = 'dark'; // fallback to default
  }
  
  // Save theme setting with high priority
  const saveResult = settingsStorage.setSetting('theme', themeId);
  if (saveResult !== true) {
    console.error('Error saving theme setting:', saveResult);
    
    // Retry saving theme after a short delay
    setTimeout(() => {
      const retryResult = settingsStorage.setSetting('theme', themeId);
      console.log('Theme save retry result:', retryResult === true ? 'Success' : 'Failed');
    }, 500);
  }
  
  // Update in-memory settings
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
  event.returnValue = historyStorage.getHistory();
});

ipcMain.on('add-history', (event, url, title) => {
  historyStorage.addHistoryEntry(url, title);
});

ipcMain.on('clear-history', () => {
  historyStorage.clearHistory();
});

// Navigation handler
ipcMain.on('navigate', (event, url) => {
  console.log('Main process: Navigation request received for:', url);
  // Send it back to all renderer processes
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('navigate-from-main', url);
  });
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
  if (process.env.NODE_ENV === 'development' || settings.enableDevTools) {
    mainWindow.webContents.openDevTools();
  }
    // Handle window control events
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  
  ipcMain.on('window-close', () => {
    mainWindow.close();
  });
  // Also support the new format
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
  
  // Initialize history and settings storage
  historyStorage.ensureHistoryFile();
  settingsStorage.ensureSettingsFile();
  
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
