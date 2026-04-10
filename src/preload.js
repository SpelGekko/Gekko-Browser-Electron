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
  getSettings: () => ipcRenderer.sendSync('get-settings'),
  onSettingsUpdated: (callback) => ipcRenderer.on('settings-updated', (event, settings) => {
    cachedSettings = settings;
    callback(settings);
  }),
  setSetting: (key, value) => ipcRenderer.send('set-setting', key, value),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),

  // Theme
  onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (event, theme) => callback(theme)),
  getThemes: () => loadThemes(),
  applyTheme: (themeId) => ipcRenderer.send('apply-theme', themeId),

  // Navigation
  navigate: (url) => ipcRenderer.send('navigate', url),
  onNavigate: (callback) => ipcRenderer.on('navigate-from-main', (event, url) => callback(url)),
  openUpdatePage: () => ipcRenderer.send('open-update-page'),
  
  // Tabs
  onOpenNewTab: (callback) => ipcRenderer.on('open-new-tab', (event, url) => callback(url)),
  onTabContextAction: (callback) => ipcRenderer.on('tab-context-action', (event, action, payload) => callback(action, payload)),
  getActiveTabId: () => ipcRenderer.sendSync('get-active-tab-id'),

  // History
  getHistory: () => ipcRenderer.sendSync('get-history'),
  addToHistory: (historyEntry) => {
    if (typeof historyEntry === 'object') {
      ipcRenderer.send('add-history', historyEntry.url, historyEntry.title);
    }
  },
  clearHistory: () => ipcRenderer.send('clear-history'),
  toggleIncognitoMode: () => ipcRenderer.sendSync('toggle-incognito-mode'),
  getIncognitoMode: () => ipcRenderer.sendSync('get-incognito-mode'),

  // Bookmarks
  getBookmarks: () => ipcRenderer.sendSync('get-bookmarks'),
  addBookmark: (url, title, favicon) => ipcRenderer.send('add-bookmark', url, title, favicon),
  removeBookmark: (url) => ipcRenderer.send('remove-bookmark', url),
  isBookmarked: (url) => ipcRenderer.sendSync('is-bookmarked', url),
  onBookmarksUpdated: (callback) => ipcRenderer.on('bookmarks-updated', (event, bookmarks) => callback(bookmarks)),

  // Clippings
  getClippings: () => ipcRenderer.sendSync('get-clippings'),
  addClipping: (clipping) => ipcRenderer.send('add-clipping', clipping),
  removeClipping: (clipId) => ipcRenderer.send('remove-clipping', clipId),
  clearClippings: () => ipcRenderer.send('clear-clippings'),
  onClippingsUpdated: (callback) => ipcRenderer.on('clippings-updated', (event, clippings) => callback(clippings)),

  // Workspaces
  getWorkspaces: () => ipcRenderer.sendSync('get-workspaces'),
  addWorkspace: (workspace) => ipcRenderer.send('add-workspace', workspace),
  removeWorkspace: (workspaceId) => ipcRenderer.send('remove-workspace', workspaceId),
  clearWorkspaces: () => ipcRenderer.send('clear-workspaces'),
  openWorkspace: (workspaceId) => ipcRenderer.send('open-workspace', workspaceId),
  onWorkspacesUpdated: (callback) => ipcRenderer.on('workspaces-updated', (event, workspaces) => callback(workspaces)),
  onWorkspaceOpen: (callback) => ipcRenderer.on('open-workspace', (event, workspace) => callback(workspace)),

  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Updates
  getAppVersion: () => ipcRenderer.sendSync('get-app-version'),
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status, info) => callback(status, info)),

  // Downloads
  onDownloadUpdate: (callback) => ipcRenderer.on('download-update', (event, item) => callback(item)),
  cancelDownload: (startTime) => ipcRenderer.send('cancel-download', startTime),
  getDownloads: () => ipcRenderer.sendSync('get-downloads'),
  clearDownloads: () => ipcRenderer.send('clear-downloads'),
  showDownloadInFolder: (startTime) => ipcRenderer.send('show-download-in-folder', startTime),

  // Context Menu
  showContextMenu: (params) => ipcRenderer.send('show-context-menu', params),

  // Paths
  getPaths: () => {
    return {
      webviewPreload: webviewPreloadPath
    };
  },

  // Home background picker
  pickHomeBackground: () => ipcRenderer.invoke('pick-home-background'),
  
  // Extensions
  getExtensions: () => ipcRenderer.sendSync('get-extensions'),
  setExtensionState: (id, enabled) => ipcRenderer.sendSync('set-extension-state', id, enabled),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window-close'),
});
