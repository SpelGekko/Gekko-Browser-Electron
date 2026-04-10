const { BrowserWindow, webContents } = require('electron');
const getWorkspaces = require('./get-workspaces');

const broadcastWorkspaces = () => {
  const payload = getWorkspaces();

  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('workspaces-updated', payload);
    }
  });

  webContents.getAllWebContents().forEach((wc) => {
    if (!wc.isDestroyed()) {
      wc.send('workspaces-updated', payload);
    }
  });
};

module.exports = broadcastWorkspaces;
