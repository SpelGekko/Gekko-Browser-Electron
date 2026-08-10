const { webContents } = require('electron');
const getWorkspaces = require('./get-workspaces');

const broadcastWorkspaces = () => {
  const payload = getWorkspaces();
  webContents.getAllWebContents().forEach((wc) => {
    if (!wc.isDestroyed()) wc.send('workspaces-updated', payload);
  });
};

module.exports = broadcastWorkspaces;
