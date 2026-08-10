const { webContents } = require('electron');
const getClippings = require('./get-clippings');

const broadcastClippings = () => {
  const payload = getClippings();
  webContents.getAllWebContents().forEach((wc) => {
    if (!wc.isDestroyed()) wc.send('clippings-updated', payload);
  });
};

module.exports = broadcastClippings;
