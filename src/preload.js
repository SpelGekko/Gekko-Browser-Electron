// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Get the webview preload script path
const webviewPreloadPath = path.join(__dirname, 'webview-preload.js');
const themesPath = path.join(__dirname, 'themes.js');

// Cache settings and themes
let cachedThemes = null;
let cachedSettings = null;

// Listen for theme change events from main process
ipcRenderer.on('theme-changed', (event, themeId) => {
  // Post message to the window to update the theme
  window.postMessage({ type: 'themeChange', theme: themeId }, '*');
});

// Expose handleNavigation to window object
window.handleNavigation = (url) => {
  console.log('Window handleNavigation called with:', url);
  ipcRenderer.send('navigate', url);
};

// Listen for settings updates
ipcRenderer.on('settings-updated', (event, newSettings) => {
  cachedSettings = newSettings;
});

function loadThemes() {
  if (cachedThemes) {
    return cachedThemes;
  }

  try {
    console.log('Loading themes from:', themesPath);
    const themeModule = require(themesPath);
    
    if (!themeModule?.themes || typeof themeModule.themes !== 'object') {
      throw new Error('Invalid theme module structure');
    }

    cachedThemes = themeModule.themes;
    return cachedThemes;
  } catch (error) {
    console.error('Failed to load themes:', error);
    // Return a minimal default theme as fallback
    return {
      dark: {
        name: 'Dark Theme',
        colors: {
          primary: '#202124',
          textPrimary: '#e8eaed'
        }
      }
    };
  }
}

// Allowed channels for IPC communication
const allowedChannels = ['theme-changed', 'settings-changed', 'navigate', 'update-status'];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => {
    // Use cached settings if available, otherwise get fresh from main process
    if (!cachedSettings) {
      cachedSettings = ipcRenderer.sendSync('get-settings');
    }
    return cachedSettings;
  },
  
  // Add IPC listeners for settings and theme updates
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (event, settings) => {
      cachedSettings = settings;
      callback(settings);
    });
  },
  
  onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, theme) => callback(theme));
  },
  
  setSetting: (key, value) => {
    ipcRenderer.send('set-setting', key, value);
  },
  
  // Navigation
  navigate: (url) => {
    console.log('API navigate called with:', url);
    ipcRenderer.send('navigate', url);
    return true; // Return success
  },
  
  // Paths
  getPaths: () => {
    return {
      webviewPreload: webviewPreloadPath
    };
  },
  
  // Theme management
  getThemes: () => {
    console.log('Getting themes...');
    return loadThemes();
  },
  
  applyTheme: (themeId) => {
    console.group('Apply Theme IPC');
    try {
      console.log('Sending apply-theme IPC message:', themeId);
      ipcRenderer.send('apply-theme', themeId);
      console.log('IPC message sent successfully');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error sending apply-theme IPC message:', error);
      console.groupEnd();
      return false;
    }
  },
  
  // History
  getHistory: () => {
    return ipcRenderer.sendSync('get-history');
  },
  
  addToHistory: (historyEntry) => {
    if (typeof historyEntry === 'object') {
      ipcRenderer.send('add-history', historyEntry.url, historyEntry.title);
    } else {
      console.error('Invalid history entry:', historyEntry);
    }
  },
  
  clearHistory: () => {
    ipcRenderer.send('clear-history');
  },
  
  toggleIncognitoMode: () => {
    return ipcRenderer.sendSync('toggle-incognito-mode');
  },
  
  getIncognitoMode: () => {
    return ipcRenderer.sendSync('get-incognito-mode');
  },
  
  // Bookmarks
  getBookmarks: () => {
    return ipcRenderer.sendSync('get-bookmarks');
  },
  
  addBookmark: (url, title, favicon) => {
    ipcRenderer.send('add-bookmark', url, title, favicon);
  },
  
  removeBookmark: (url) => {
    ipcRenderer.send('remove-bookmark', url);
  },
  
  isBookmarked: (url) => {
    return ipcRenderer.sendSync('is-bookmarked', url);
  },
  
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
    // Navigation API
  navigate: (url) => {
    console.log('Preload: Navigation request for:', url);
    ipcRenderer.send('navigate', url);
  },
  
  handleNavigation: (url) => {
    console.log('Preload: handleNavigation called with:', url);
    ipcRenderer.send('navigate', url);
  },
  
  // Specific page navigation shortcuts
  openUpdatePage: () => {
    console.log('Preload: Opening update page');
    ipcRenderer.send('open-update-page');
  },
    on: (channel, callback) => {
    // Whitelist channels we will listen to
    const validChannels = ['theme-changed', 'settings-changed', 'navigate', 'update-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },  onNavigate: (callback) => {
    ipcRenderer.on('navigate-from-main', (event, url) => {
      console.log('Preload: Received navigate-from-main for URL:', url);
      callback(url);
    });
  },
  
  // Enhanced navigation with consistent behavior
  getActiveTabId: () => {
    return ipcRenderer.sendSync('get-active-tab-id');
  },
  
  // For removing listeners when needed
  removeListener: (channel, callback) => {
    const validChannels = ['theme-changed', 'settings-changed', 'navigate', 'update-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },
  
  receive: (channel, callback) => {
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Updates management
  getAppVersion: () => {
    try {
      return ipcRenderer.sendSync('get-app-version');
    } catch (error) {
      console.error('Error getting app version:', error);
      return 'Unknown';
    }
  },
  
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  },
  
  downloadUpdate: () => {
    ipcRenderer.send('download-update');
  },
  
  installUpdate: () => {
    ipcRenderer.send('install-update');
  },
  
  getUpdateStatus: () => {
    try {
      return ipcRenderer.invoke('get-update-status');
    } catch (error) {
      console.error('Error getting update status:', error);
      return { status: 'error', info: { message: 'Failed to get update status' } };
    }
  },
  
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, status, info) => {
      callback(status, info);
    });
  },
  
  getSetting: (key) => {
    return ipcRenderer.invoke('get-setting', key);
  },
  
  setSetting: (key, value) => {
    ipcRenderer.send('set-setting', key, value);
  }
});
