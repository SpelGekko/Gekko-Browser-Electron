const saveWorkspaces = require('./save-workspaces');

const clearWorkspaces = () => {
  return saveWorkspaces([]);
};

module.exports = clearWorkspaces;
