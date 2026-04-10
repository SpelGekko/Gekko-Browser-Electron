const fs = require('fs');
const getWorkspacesFilePath = require('./get-workspaces-file-path');

const ensureWorkspacesFile = () => {
  const filePath = getWorkspacesFilePath();
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error creating workspaces file:', error);
      return false;
    }
  }

  return true;
};

module.exports = ensureWorkspacesFile;
