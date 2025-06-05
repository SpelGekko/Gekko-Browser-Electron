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
    console.group('Theme Setting Save');
    console.log('Saving theme:', value);
    
    if (!value || typeof value !== 'string') {
      console.error('Invalid theme value:', value);
      console.groupEnd();
      return;
    }
    
    // Try to save with multiple attempts for theme setting
    let result = settingsStorage.setSetting(key, value);
    console.log('Initial save result:', result);
      if (result !== true) {
      console.warn('First save attempt failed, retrying...');
      
      // Ensure we have valid settings before retrying
      const currentSettings = settingsStorage.getSettings();
      if (currentSettings._error) {
        console.error('Could not read current settings:', currentSettings._error);
        return;
      }
      
      // Retry with a clean write
      try {
        const settingsPath = settingsStorage.getSettingsFilePath();
        const updatedSettings = { ...currentSettings, [key]: value };
        require('fs').writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
        console.log('Clean settings write successful');
        
        // Verify the write
        const verifySettings = settingsStorage.getSettings();
        if (verifySettings[key] !== value) {
          throw new Error('Settings verification failed');
        }
      } catch (error) {
        console.error('Direct file write failed:', error);
      }
  }
  
  // Update in-memory settings immediately regardless of save result
  settings.theme = value;
  console.log('In-memory settings updated');
  console.groupEnd();
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

// Handle theme changes
ipcMain.on('apply-theme', async (event, themeId) => {
  console.group('Theme Change Request');
  console.log('Theme change requested:', themeId);
  
  // Validate theme
  if (!themeId || typeof themeId !== 'string') {
    console.error('Invalid theme ID, using default');
    themeId = 'dark';
  }
    const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
  if (!allowedThemes.includes(themeId)) {
    console.error('Theme not in allowed list, using default');
    themeId = 'dark';
    return;
  }

  try {
    // Save theme setting with retries
    let saveSuccess = false;
    const tryThemeSave = () => {
      return new Promise((resolve) => {
        const saveResult = settingsStorage.setSetting('theme', themeId);
        if (saveResult === true) {
          // Verify the save
          const verifySettings = settingsStorage.getSettings();
          if (verifySettings.theme === themeId) {
            resolve(true);
          } else {
            console.error('Theme verification failed. Expected:', themeId, 'Got:', verifySettings.theme);
            resolve(false);
          }
        } else {
          console.error('Save attempt failed:', saveResult);
          resolve(false);
        }
      });
    };

    // Try up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Theme save attempt ${attempt}/3`);
      saveSuccess = await tryThemeSave();
      
      if (saveSuccess) {
        console.log('Theme saved and verified successfully');
        break;
      }
      
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    if (!saveSuccess) {
      throw new Error('All theme save attempts failed');
    }
    
    // Update in-memory settings only after successful save
    settings.theme = themeId;
      // Broadcast theme change to all windows only after successful save
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      try {
        window.webContents.send('theme-changed', themeId);
      } catch (error) {
        console.error('Error broadcasting to window:', error);
      }
    });
    
    console.log('Theme change broadcast complete');
  } catch (error) {
    console.error('Theme change error:', error);
  }
  
  console.groupEnd();
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
