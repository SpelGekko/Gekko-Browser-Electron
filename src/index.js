const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const registerProtocolHandlers = require('./protocol-handlers');
const historyStorage = require('./history-storage');
const settingsStorage = require('./settings-storage');
const bookmarksStorage = require('./bookmarks-storage');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging for updater
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowDowngrade = false;
autoUpdater.logger = log;

// Cache settings in memory
let cachedSettings = null;

// Theme change lock to prevent multiple simultaneous saves
let themeChangeLock = false;
let lastAppliedTheme = null;
const THEME_LOCK_TIMEOUT = 500; // ms

// Load settings on startup
function loadSettings() {
  if (!cachedSettings) {
    cachedSettings = settingsStorage.getSettings();
  }
  return cachedSettings;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Get initial settings and ensure they exist
let settings;
try {
  settings = settingsStorage.getSettings();
  if (!settings) {
    console.warn('No settings found, using defaults');
    settings = { ...settingsStorage.defaultSettings };
  }
} catch (error) {
  console.error('Error loading settings:', error);
  settings = { ...settingsStorage.defaultSettings };
}

// IPC handlers
// Handle settings updates
ipcMain.on('set-setting', (event, key, value) => {
  console.group('Set Setting');
  console.log(`Setting ${key} to:`, value);
  
  // For theme changes, check the lock and last applied theme
  if (key === 'theme') {
    // If theme hasn't changed from last applied, skip
    if (lastAppliedTheme === value) {
      console.log('Theme already applied, skipping save');
      event.returnValue = true;
      console.groupEnd();
      return;
    }
    
    // Check the lock
    if (themeChangeLock) {
      console.log('Theme change locked, skipping save');
      event.returnValue = true;
      console.groupEnd();
      return;
    }
    
    // Set the lock
    themeChangeLock = true;
    setTimeout(() => {
      themeChangeLock = false;
      console.log('Theme change lock released');
    }, THEME_LOCK_TIMEOUT);
    
    // Update last applied theme
    lastAppliedTheme = value;
    console.log('Setting theme to:', value);
  }
  
  const result = settingsStorage.setSetting(key, value);
  if (result === true) {
    // Update cached settings
    cachedSettings = settingsStorage.getSettings();
    
    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach(window => {
      try {
        window.webContents.send('settings-updated', cachedSettings);
        if (key === 'theme') {
          window.webContents.send('theme-changed', value);
        }
      } catch (error) {
        console.error('Error broadcasting to window:', error);
      }
    });
  }
  
  event.returnValue = result === true;
  console.log('Setting update complete');
  console.groupEnd();
});

ipcMain.on('get-settings', (event) => {
  event.returnValue = loadSettings();
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
    event.returnValue = false;
    console.groupEnd();
    return;
  }
  
  // Skip if theme already applied
  if (lastAppliedTheme === themeId) {
    console.log('Theme already applied, skipping save');
    event.returnValue = true;
    console.groupEnd();
    return;
  }
  
  // Check the lock
  if (themeChangeLock) {
    console.log('Theme change locked, deferring application');
    event.returnValue = true;
    console.groupEnd();
    return;
  }
  
  // Set the lock
  themeChangeLock = true;
  setTimeout(() => {
    themeChangeLock = false;
    console.log('Theme change lock released');
  }, THEME_LOCK_TIMEOUT);

  try {
    // Save theme setting with retries
    let saveSuccess = false;
    const tryThemeSave = async () => {
      // Save the setting
      const saveResult = settingsStorage.setSetting('theme', themeId);
      if (saveResult !== true) {
        console.error('Save attempt failed:', saveResult);
        return false;
      }

      // Verify the save with a small delay to allow write to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      const verifySettings = settingsStorage.getSettings();
      if (verifySettings.theme !== themeId) {
        console.error('Theme verification failed. Expected:', themeId, 'Got:', verifySettings.theme);
        return false;
      }

      return true;
    };

    // Try up to 3 times with increasing delays
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`Theme save attempt ${attempt}/3`);
      saveSuccess = await tryThemeSave();
      
      if (saveSuccess) {
        console.log('Theme saved and verified successfully');
        break;
      }
      
      if (attempt < 3) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
      }
    }
    
    if (!saveSuccess) {
      throw new Error('All theme save attempts failed');
    }
    
    // Update in-memory settings and last applied theme
    settings.theme = themeId;
    lastAppliedTheme = themeId;
    cachedSettings = {...settings};
      
    // Broadcast theme change to all windows only after successful save
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(window => {
      try {
        // Send both settings update and theme change events
        window.webContents.send('settings-updated', settings);
        window.webContents.send('theme-changed', themeId);

        // Send theme change to webviews in the window
        window.webContents.send('webview-theme-changed', themeId);
      } catch (error) {
        console.error('Error broadcasting to window:', error);
      }
    });
    
    console.log('Theme change broadcast complete');
  } catch (error) {
    console.error('Theme change error:', error);
    // Try to revert to previous theme
    try {
      const { theme: previousTheme } = settingsStorage.getSettings();
      if (previousTheme && previousTheme !== themeId) {
        console.log('Attempting to revert to previous theme:', previousTheme);
        event.sender.send('revert-theme', previousTheme);
      }
    } catch (revertError) {
      console.error('Error reverting theme:', revertError);
    }
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

// Incognito mode handlers
ipcMain.on('toggle-incognito-mode', (event) => {
  const isIncognito = historyStorage.toggleIncognitoMode();
  event.returnValue = isIncognito;
});

ipcMain.on('get-incognito-mode', (event) => {
  event.returnValue = historyStorage.getIncognitoMode();
});

// Update handlers
ipcMain.on('check-for-updates', (event) => {
  log.info('Manual update check requested');
  autoUpdater.checkForUpdates().catch(err => {
    log.error('Error checking for updates:', err);
  });
});

ipcMain.on('download-update', (event) => {
  log.info('Update download requested');
  autoUpdater.downloadUpdate().catch(err => {
    log.error('Error downloading update:', err);
  });
});

ipcMain.on('install-update', (event) => {
  log.info('Update installation requested');
  autoUpdater.quitAndInstall();
});

// Bookmarks handlers
ipcMain.on('get-bookmarks', (event) => {
  event.returnValue = bookmarksStorage.getBookmarks();
});

ipcMain.on('add-bookmark', (event, url, title, favicon) => {
  bookmarksStorage.addBookmark(url, title, favicon);
});

ipcMain.on('remove-bookmark', (event, url) => {
  bookmarksStorage.removeBookmark(url);
});

ipcMain.on('is-bookmarked', (event, url) => {
  event.returnValue = bookmarksStorage.isBookmarked(url);
});

// Update handlers
ipcMain.on('get-app-version', (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.handle('get-update-status', async () => {
  // If we have a stored status, return it
  if (autoUpdater.getStatus) {
    return autoUpdater.getStatus();
  }
  
  // Check if an update is already downloaded
  if (autoUpdater.currentVersion) {
    return { 
      status: 'downloaded', 
      info: { 
        version: autoUpdater.currentVersion.version,
        releaseNotes: autoUpdater.currentVersion.releaseNotes
      }
    };
  }
  
  // No update state information available
  return { status: 'unknown' };
});

// Special handler for update page navigation
ipcMain.on('open-update-page', () => {
  log.info('Opening update page requested');
  
  // Find the focused window or create one if needed
  let focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) {
    if (BrowserWindow.getAllWindows().length > 0) {
      focusedWindow = BrowserWindow.getAllWindows()[0];
    } else {
      // Create a new window if none exists
      createWindow();
      focusedWindow = BrowserWindow.getFocusedWindow();
    }
  }
  
  if (focusedWindow) {
    // Send the navigation command to the renderer
    focusedWindow.webContents.send('navigate-from-main', 'gkp://update.gekko/');
  }
});

ipcMain.handle('get-setting', async (event, key) => {
  return settingsStorage.getSetting(key);
});

// Handle custom bookmark ordering
ipcMain.on('update-bookmarks-order', (event, orderedUrls) => {
  console.log('Updating bookmark order');
  const result = bookmarksStorage.updateBookmarksOrder(orderedUrls);
  
  // Broadcast bookmark update to all windows
  BrowserWindow.getAllWindows().forEach(window => {
    try {
      window.webContents.send('bookmarks-updated');
    } catch (error) {
      console.error('Error broadcasting bookmark update:', error);
    }
  });
  
  console.log('Bookmark order update complete:', result);
});

// Navigation handler
ipcMain.on('navigate', (event, url) => {
  console.group('Main Process Navigation');
  console.log('Navigation request received for:', url);
  
  // Validate URL
  if (!url) {
    console.error('No URL provided');
    console.groupEnd();
    return;
  }
  
  console.log('Sending navigation event to renderer processes');
  
  // Find the focused window first
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    console.log('Sending to focused window');
    try {
      focusedWindow.webContents.send('navigate-from-main', url);
    } catch (error) {
      console.error('Error sending to focused window:', error);
    }
  } else {
    // If no focused window, send to all
    console.log('No focused window, sending to all windows');
    BrowserWindow.getAllWindows().forEach(window => {
      try {
        window.webContents.send('navigate-from-main', url);
      } catch (error) {
        console.error('Error sending to window:', error);
      }
    });
  }
  
  console.log('Navigation event sent');
  console.groupEnd();
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
  bookmarksStorage.ensureBookmarksFile();
  
  createWindow();
  
  // Setup auto-updater
  setupAutoUpdater();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // Check for updates on startup (with delay to not slow down startup)
  setTimeout(() => {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();
  }, 3000);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Setup auto-updater events
function setupAutoUpdater() {
  let mainWindow = BrowserWindow.getAllWindows()[0];
  
  // Store update status for later access
  let updateStatus = {
    status: 'unknown',
    info: null
  };
  
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    updateStatus = { status: 'checking', info: null };
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    updateStatus = { status: 'available', info };
    
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'available', info);
      
      const dialogOpts = {
        type: 'info',
        buttons: ['Download Now', 'Later'],
        title: 'Update Available',
        message: `A new version (${info.version}) of Gekko Browser is available!`,
        detail: 'Would you like to download it now?'
      };
      
      dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    }
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available');
    updateStatus = { status: 'not-available', info };
    
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'not-available');
      
      // Only show dialog if explicitly requested by user (through manual check)
      if (info.explicitCheck) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'No Updates Available',
          message: 'You are already running the latest version of Gekko Browser.',
          buttons: ['OK']
        });
      }
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    updateStatus = { status: 'error', info: err };
    
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'error', err);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    updateStatus = { status: 'progress', info: progressObj };
    
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'progress', progressObj);
    }
  });
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    updateStatus = { status: 'downloaded', info };
    
    if (mainWindow) {
      mainWindow.webContents.send('update-status', 'downloaded', info);
      
      const dialogOpts = {
        type: 'info',
        buttons: ['Restart Now', 'Later'],
        title: 'Update Ready',
        message: `A new version (${info.version}) has been downloaded`,
        detail: 'Restart the app to apply the updates.'
      };
      
      dialog.showMessageBox(mainWindow, dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    }
  });
  
  // Expose the update status for other functions
  autoUpdater.getStatus = () => updateStatus;
}
