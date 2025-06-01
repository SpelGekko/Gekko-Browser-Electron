// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

// Listen for theme change events from main process
ipcRenderer.on('theme-changed', (event, themeId) => {
  // Post message to the window to update the theme
  window.postMessage({ type: 'themeChange', theme: themeId }, '*');
});

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
  getThemes: () => {
    return ipcRenderer.sendSync('get-themes');
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
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
    // Theme management
  getThemes: () => {
    return [
      { id: 'dark', name: 'Dark Theme' },
      { id: 'light', name: 'Light Theme' },
      { id: 'purple', name: 'Purple Theme' },
      { id: 'blue', name: 'Blue Theme' },
      { id: 'red', name: 'Red Theme' }
    ];
  },
  
  // Apply theme to current webview
  applyTheme: (themeId) => {
    try {
      ipcRenderer.send('apply-theme', themeId);
      return true;
    } catch (error) {
      console.error('Error applying theme:', error);
      return false;
    }
  }
});
