const loadWorkspaces = require('./load-workspaces');

const getWorkspaces = () => {
  return loadWorkspaces();
};

module.exports = getWorkspaces;
