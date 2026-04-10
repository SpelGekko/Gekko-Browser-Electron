const loadWorkspaces = require('./load-workspaces');
const saveWorkspaces = require('./save-workspaces');

const MAX_WORKSPACES = 100;
const MAX_TABS = 50;
const MAX_NAME_LENGTH = 80;

const sanitizeTabs = (tabs = []) => {
  const cleaned = [];
  const seen = new Set();

  tabs.forEach((tab) => {
    const url = typeof tab.url === 'string' ? tab.url.trim() : '';
    if (!url || seen.has(url)) {
      return;
    }

    const title = typeof tab.title === 'string' ? tab.title.trim() : '';
    cleaned.push({ url, title });
    seen.add(url);
  });

  return cleaned.slice(0, MAX_TABS);
};

const addWorkspace = (data = {}) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const tabs = sanitizeTabs(Array.isArray(data.tabs) ? data.tabs : []);

  if (!name || tabs.length === 0) {
    return false;
  }

  const now = Date.now();
  const workspaces = loadWorkspaces();
  const existingIndex = data.id
    ? workspaces.findIndex((workspace) => workspace.id === data.id)
    : -1;

  const entry = {
    id: data.id || String(now),
    name: name.slice(0, MAX_NAME_LENGTH),
    tabs,
    createdAt: now,
    updatedAt: now
  };

  if (existingIndex >= 0) {
    const existing = workspaces[existingIndex];
    entry.createdAt = existing.createdAt || entry.createdAt;
    workspaces[existingIndex] = entry;
  } else {
    workspaces.unshift(entry);
  }

  if (workspaces.length > MAX_WORKSPACES) {
    workspaces.length = MAX_WORKSPACES;
  }

  return saveWorkspaces(workspaces);
};

module.exports = addWorkspace;
