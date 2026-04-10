const loadWorkspaces = require('./load-workspaces');
const saveWorkspaces = require('./save-workspaces');

const removeWorkspace = (workspaceId) => {
  if (!workspaceId) {
    return false;
  }

  const workspaces = loadWorkspaces();
  const next = workspaces.filter((workspace) => workspace.id !== workspaceId);

  if (next.length === workspaces.length) {
    return false;
  }

  return saveWorkspaces(next);
};

module.exports = removeWorkspace;
