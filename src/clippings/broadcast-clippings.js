const { BrowserWindow, webContents } = require('electron');
const getClippings = require('./get-clippings');

const broadcastClippings = () => {
  const payload = getClippings();

  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('clippings-updated', payload);
    }
  });

  webContents.getAllWebContents().forEach((wc) => {
    if (!wc.isDestroyed()) {
      wc.send('clippings-updated', payload);
    }
  });
};

module.exports = broadcastClippings;
