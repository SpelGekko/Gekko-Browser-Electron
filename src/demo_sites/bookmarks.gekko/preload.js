/**
 * Preload script for bookmarks page webview
 * Ensures proper IPC access
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC APIs to the bookmarks page
contextBridge.exposeInMainWorld('api', {
  // Bookmarks functions
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
  
  // Support for custom ordering
  updateBookmarksOrder: (orderedUrls) => {
    // Send the order to the main process
    ipcRenderer.send('update-bookmarks-order', orderedUrls);
  },

  // Settings access
  getSettings: () => {
    return ipcRenderer.sendSync('get-settings');
  }
});

// Also expose navigation method for webview
contextBridge.exposeInMainWorld('navigation', {
  navigate: (url) => {
    ipcRenderer.send('navigate', url);
  }
});

// Expose Simple Icons if available
try {
  const simpleIconsModule = window.parent.simpleIcons;
  if (simpleIconsModule) {
    contextBridge.exposeInMainWorld('simpleIcons', {
      getIcon: (slug) => simpleIconsModule.getIcon(slug),
      hasIcon: (slug) => simpleIconsModule.hasIcon(slug)
    });
  }
} catch (error) {
  console.warn('Unable to expose Simple Icons to bookmarks page:', error);
}
