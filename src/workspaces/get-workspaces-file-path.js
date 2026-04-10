const path = require('path');
const { app } = require('electron');

const getWorkspacesFilePath = () => {
  return path.join(app.getPath('userData'), 'workspaces.json');
};

module.exports = getWorkspacesFilePath;
