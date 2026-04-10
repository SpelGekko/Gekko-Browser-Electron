const fs = require('fs');
const ensureWorkspacesFile = require('./ensure-workspaces-file');
const getWorkspacesFilePath = require('./get-workspaces-file-path');
const saveWorkspaces = require('./save-workspaces');

const loadWorkspaces = () => {
  ensureWorkspacesFile();
  const filePath = getWorkspacesFilePath();

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('Error parsing workspaces data, resetting workspaces:', parseError);
      saveWorkspaces([]);
      return [];
    }
  } catch (error) {
    console.error('Error loading workspaces:', error);
    return [];
  }
};

module.exports = loadWorkspaces;
