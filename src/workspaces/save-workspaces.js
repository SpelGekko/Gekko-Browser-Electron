const fs = require('fs');
const ensureWorkspacesFile = require('./ensure-workspaces-file');
const getWorkspacesFilePath = require('./get-workspaces-file-path');

const saveWorkspaces = (workspaces) => {
  ensureWorkspacesFile();
  const filePath = getWorkspacesFilePath();

  try {
    fs.writeFileSync(filePath, JSON.stringify(workspaces));
    return true;
  } catch (error) {
    console.error('Error saving workspaces:', error);
    return false;
  }
};

module.exports = saveWorkspaces;
