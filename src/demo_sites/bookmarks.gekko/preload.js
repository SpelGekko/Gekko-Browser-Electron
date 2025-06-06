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
  }
});

// Also expose navigation method for webview
contextBridge.exposeInMainWorld('navigation', {
  navigate: (url) => {
    ipcRenderer.send('navigate', url);
  }
});
