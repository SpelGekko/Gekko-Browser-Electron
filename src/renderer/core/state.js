/**
 * Gekko Browser Renderer - Global State
 *
 * This file initializes and exports the global state variables
 * used throughout the renderer process.
 */

export let currentTabId = null;
export let tabs = [];
export let cachedSettings = null;
export let bookmarks = [];
export let isIncognito = false;
export let hasUpdateAvailable = false;
export let updateInfo = null;
export let updateToastTimeout = null;
export let lastWorkspaceOpenId = null;
export let lastWorkspaceOpenTime = 0;
export let verticalTaskbarHoverListenersBound = false;
export let memorySaverEnabled = false;
export let memorySaverIntervalId = null;
export let memorySaverIdleMs = 15 * 60 * 1000;
export let sessionSaveTimeoutId = null;

export const splitViewState = {
  enabled: false,
  activePane: 'left',
  leftTabId: null,
  rightTabId: null
};

export const tabSearchState = {
  overlay: null,
  input: null,
  results: null,
  filteredTabs: [],
  selectedIndex: 0,
  isOpen: false
};

export function setCurrentTabId(tabId) {
  currentTabId = tabId;
}

export function setTabs(newTabs) {
  tabs = newTabs;
}

export function setCachedSettings(settings) {
  cachedSettings = settings;
}

export function getCachedSettings() {
  return cachedSettings;
}

export function setBookmarks(newBookmarks) {
  bookmarks = newBookmarks;
}

export function setIncognito(value) {
  isIncognito = value;
}

export function setUpdateInfo(info) {
  hasUpdateAvailable = !!info;
  updateInfo = info;
}

export function setUpdateToastTimeout(timeoutId) {
  updateToastTimeout = timeoutId;
}

export function setLastWorkspaceOpen(id) {
  lastWorkspaceOpenId = id;
  lastWorkspaceOpenTime = Date.now();
}

export function setVerticalTaskbarHoverListenersBound(bound) {
  verticalTaskbarHoverListenersBound = bound;
}

export function setMemorySaverEnabled(enabled) {
    memorySaverEnabled = enabled;
}

export function setMemorySaverIntervalId(id) {
    memorySaverIntervalId = id;
}

export function setMemorySaverIdleMs(ms) {
    memorySaverIdleMs = ms;
}

export function setSessionSaveTimeoutId(id) {
    sessionSaveTimeoutId = id;
}
