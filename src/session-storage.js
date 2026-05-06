const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_SESSION_TABS = 100;

const defaultSessionState = {
  tabs: [],
  currentTabId: null,
  splitView: null,
  cleanExit: true,
  updatedAt: 0
};

const getSessionFilePath = () => {
  return path.join(app.getPath('userData'), 'session-state.json');
};

const ensureSessionFile = () => {
  const filePath = getSessionFilePath();
  const dirPath = path.dirname(filePath);

  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultSessionState, null, 2), 'utf8');
    }

    return true;
  } catch (error) {
    console.error('Failed to ensure session file:', error);
    return false;
  }
};

const sanitizeTab = (tab) => {
  if (!tab || typeof tab !== 'object') {
    return null;
  }

  const id = typeof tab.id === 'string' ? tab.id.trim() : '';
  const url = typeof tab.url === 'string' ? tab.url.trim() : '';
  if (!id || !url) {
    return null;
  }

  return {
    id,
    url,
    title: typeof tab.title === 'string' ? tab.title : 'New Tab',
    pinned: Boolean(tab.pinned),
    groupId: typeof tab.groupId === 'string' ? tab.groupId.trim() : null,
    splitPane: tab.splitPane === 'left' || tab.splitPane === 'right' ? tab.splitPane : null,
    createdAt: Number.isFinite(tab.createdAt) ? tab.createdAt : Date.now(),
    lastActiveAt: Number.isFinite(tab.lastActiveAt) ? tab.lastActiveAt : Date.now()
  };
};

const sanitizeSessionState = (state = {}) => {
  const rawTabs = Array.isArray(state.tabs) ? state.tabs : [];
  const tabs = rawTabs.map(sanitizeTab).filter(Boolean).slice(0, MAX_SESSION_TABS);

  const currentTabId = typeof state.currentTabId === 'string' ? state.currentTabId : null;
  const splitView = state.splitView && typeof state.splitView === 'object'
    ? {
        enabled: Boolean(state.splitView.enabled),
        activePane: state.splitView.activePane === 'right' ? 'right' : 'left',
        leftTabId: typeof state.splitView.leftTabId === 'string' ? state.splitView.leftTabId : null,
        rightTabId: typeof state.splitView.rightTabId === 'string' ? state.splitView.rightTabId : null
      }
    : null;

  return {
    tabs,
    currentTabId,
    splitView,
    cleanExit: typeof state.cleanExit === 'boolean' ? state.cleanExit : true,
    updatedAt: Date.now()
  };
};

const getSessionState = () => {
  try {
    ensureSessionFile();
    const filePath = getSessionFilePath();
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return sanitizeSessionState(parsed);
  } catch (error) {
    console.error('Failed to load session state:', error);
    return { ...defaultSessionState };
  }
};

const saveSessionState = (state) => {
  try {
    ensureSessionFile();
    const filePath = getSessionFilePath();
    const sessionState = sanitizeSessionState(state);
    fs.writeFileSync(filePath, JSON.stringify(sessionState, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save session state:', error);
    return false;
  }
};

const markCleanExit = (isClean) => {
  const current = getSessionState();
  current.cleanExit = Boolean(isClean);
  current.updatedAt = Date.now();
  return saveSessionState(current);
};

module.exports = {
  ensureSessionFile,
  getSessionState,
  saveSessionState,
  markCleanExit
};
