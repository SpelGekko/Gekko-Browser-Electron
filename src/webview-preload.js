const { contextBridge, ipcRenderer } = require("electron");

// Log that the preload script is running
console.log("Webview preload script executing");

// Navigation API
const navigationAPI = {
  navigate: (url) => {
    console.log('Navigation requested via API to:', url);
    ipcRenderer.send('navigate', url);
  },
  handleNavigation: (url) => {
    console.log('Navigation handled via API:', url);
    ipcRenderer.send('navigate', url);
  }
};

// Expose navigation API to renderer
contextBridge.exposeInMainWorld('navigationAPI', navigationAPI);

// Log which file is being loaded in the webview
console.log('Preload: Loading webview for URL:', window.location.href);

// API exposed to webviews  
contextBridge.exposeInMainWorld("api", {
  // Settings
  getSettings: () => {
    console.group('Get Settings');
    try {
      const settings = ipcRenderer.sendSync("get-settings");
      console.log('Got settings:', settings);
      if (!settings || settings._error) {
        console.log('Using default settings');
        console.groupEnd();
        return { theme: 'dark' };
      }
      console.groupEnd();
      return settings;
    } catch (error) {
      console.error("Error getting settings:", error);
      console.groupEnd();
      return { theme: "dark" };
    }
  },

  // History management
  getHistory: () => {
    try {
      return ipcRenderer.sendSync('get-history');
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },
  
  clearHistory: () => {
    ipcRenderer.send('clear-history');
  },
  
  getIncognitoMode: () => {
    try {
      return ipcRenderer.sendSync('get-incognito-mode');
    } catch (error) {
      console.error('Error getting incognito mode:', error);
      return false;
    }
  },
  
  // Bookmarks management
  getBookmarks: () => {
    try {
      return ipcRenderer.sendSync('get-bookmarks');
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },
  
  addBookmark: (url, title, favicon) => {
    ipcRenderer.send('add-bookmark', url, title, favicon);
  },
  
  removeBookmark: (url) => {
    ipcRenderer.send('remove-bookmark', url);
  },
  
  isBookmarked: (url) => {
    try {
      return ipcRenderer.sendSync('is-bookmarked', url);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
      return false;
    }
  },
  setSetting: (key, value) => {
    console.group('Set Setting');
    console.log("Setting", key, "to:", value);
    try {
      // Send to main process first
      ipcRenderer.send("set-setting", key, value);
      
      // Then apply locally if it's a theme
      if (key === "theme") {
        document.documentElement.setAttribute('data-theme', value);
        document.body.setAttribute('data-theme', value);
        
        // Notify parent window
        window.parent.postMessage({ type: 'themeChange', theme: value }, '*');
      }
      
      console.log('Setting updated successfully');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error("Error setting setting:", error);
      console.groupEnd();
      return false;
    }
  },

  // Theme management
  applyTheme: (theme) => {
    console.group('Apply Theme');
    console.log('Applying theme:', theme);
    try {
      // First save the setting
      const success = ipcRenderer.sendSync('set-setting', 'theme', theme);
      console.log('Theme saved:', success);
      
      // Then apply locally
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      
      // Send the theme change to main process
      ipcRenderer.send('apply-theme', theme);
      console.log('Theme change sent to main process');
      
      // Notify parent window
      window.parent.postMessage({ type: 'themeChange', theme: theme }, '*');
      console.log('Theme change notified to parent');
      
      console.log('Theme applied successfully');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error applying theme:', error);
      console.groupEnd();
      return false;
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
    console.log('Calling getSetting with key:', key);
    return ipcRenderer.invoke('get-setting', key);
  },
  
  setSetting: (key, value) => {
    console.log('Calling setSetting with key:', key, 'and value:', value);
    try {
      ipcRenderer.send('set-setting', key, value);
      return true;
    } catch (error) {
      console.error('Error in setSetting:', error);
      return false;
    }
  },
  
  // Additional debug method to see what API methods are available
  getAvailableMethods: () => {
    return {
      apiMethods: [
        'getSettings', 'getThemes', 'applyTheme', 
        'getHistory', 'getBookmarks', 'addBookmark', 'removeBookmark', 'isBookmarked',
        'getAppVersion', 'checkForUpdates', 'downloadUpdate', 'installUpdate', 
        'getUpdateStatus', 'onUpdateStatus', 'getSetting', 'setSetting'
      ],
      hasGetSettings: typeof ipcRenderer.sendSync === 'function',
      hasSetSetting: typeof ipcRenderer.send === 'function',
      hasGetSetting: typeof ipcRenderer.invoke === 'function'
    };
  },
  
  // Downloads
  onDownloadUpdate: (callback) => ipcRenderer.on('download-update', (event, item) => callback(item)),
  getDownloads: () => ipcRenderer.sendSync('get-downloads'),
  clearDownloads: () => ipcRenderer.send('clear-downloads'),
  cancelDownload: (startTime) => ipcRenderer.send('cancel-download', startTime),
  showDownloadInFolder: (startTime) => ipcRenderer.send('show-download-in-folder', startTime),
});

// Listen for context menu requests
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ipcRenderer.send('show-context-menu', {
    x: e.x,
    y: e.y,
    target: {
      tagName: e.target.tagName,
      src: e.target.src,
      href: e.target.href,
      text: e.target.innerText,
    }
  });
});

