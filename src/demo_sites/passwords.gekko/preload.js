const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  credentialsGetAll: () => ipcRenderer.invoke('credentials-get-all'),
  credentialsDelete: (id) => ipcRenderer.invoke('credentials-delete', id),
  credentialsUpdate: (id, data) => ipcRenderer.invoke('credentials-update', id, data),
  credentialsGetDecrypted: (id) => ipcRenderer.invoke('credentials-get-decrypted', id),

  getSettings: () => ipcRenderer.sendSync('get-settings'),
});

contextBridge.exposeInMainWorld('navigation', {
  navigate: (url) => ipcRenderer.send('navigate', url),
});
