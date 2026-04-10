const ensureWorkspacesFile = require('./ensure-workspaces-file');
const getWorkspaces = require('./get-workspaces');
const addWorkspace = require('./add-workspace');
const removeWorkspace = require('./remove-workspace');
const clearWorkspaces = require('./clear-workspaces');
const broadcastWorkspaces = require('./broadcast-workspaces');

module.exports = {
  ensureWorkspacesFile,
  getWorkspaces,
  addWorkspace,
  removeWorkspace,
  clearWorkspaces,
  broadcastWorkspaces
};
