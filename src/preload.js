// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Get the webview preload script path
const webviewPreloadPath = path.join(__dirname, 'webview-preload.js');
const themesPath = path.join(__dirname, 'themes.js');

// Cache themes to avoid repeated disk reads
let cachedThemes = null;

// Listen for theme change events from main process
ipcRenderer.on('theme-changed', (event, themeId) => {
  // Post message to the window to update the theme
  window.postMessage({ type: 'themeChange', theme: themeId }, '*');
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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => {
    return ipcRenderer.sendSync('get-settings');
  },
  setSetting: (key, value) => {
    ipcRenderer.send('set-setting', key, value);
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
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
