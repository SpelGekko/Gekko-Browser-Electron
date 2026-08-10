/**
 * Gekko Browser Renderer - Session Management
 *
 * This file contains functions for saving and restoring the browser session,
 * including open tabs and split view state.
 */

import { tabs, currentTabId, splitViewState, setSessionSaveTimeoutId, sessionSaveTimeoutId } from './core/state.js';
import { getOrderedTabs, createTab, setActiveTab, getTabById } from './tabs.js';
import { disableSplitView } from './contextMenu.js';

/**
 * Builds a snapshot of the current session state.
 * @returns {object} A serializable object representing the session.
 */
export function buildSessionSnapshot() {
  const serializedTabs = getOrderedTabs().map((tab) => {
    // tab.url is kept up-to-date via wcv-navigated IPC events
    const currentUrl = tab.url || '';
    return {
      id: tab.id,
      url: currentUrl,
      title: tab.title,
      pinned: Boolean(tab.pinned),
      splitPane: tab.splitPane || null,
      createdAt: tab.createdAt,
      lastActiveAt: tab.lastActiveAt,
      tabOrder: Number.isFinite(tab.tabOrder) ? tab.tabOrder : 0
    };
  });

  return {
    tabs: serializedTabs,
    currentTabId,
    splitView: splitViewState.enabled ? { ...splitViewState } : null,
    cleanExit: false,
    updatedAt: Date.now()
  };
}

/**
 * Schedules a debounced save of the current session state.
 */
export function scheduleSessionSave() {
  if (!window.api || typeof window.api.saveSessionState !== 'function') {
    return;
  }
  if (sessionSaveTimeoutId) {
    clearTimeout(sessionSaveTimeoutId);
  }
  const newTimeoutId = setTimeout(() => {
    setSessionSaveTimeoutId(null);
    window.api.saveSessionState(buildSessionSnapshot());
  }, 250);
  setSessionSaveTimeoutId(newTimeoutId);
}

/**
 * Restores the browser state from a session snapshot.
 * @param {object} sessionState - The session state object.
 * @returns {boolean} True if the session was restored, false otherwise.
 */
export function restoreSessionState(sessionState) {
  if (!sessionState || !Array.isArray(sessionState.tabs) || sessionState.tabs.length === 0) {
    return false;
  }

  sessionState.tabs.forEach((tabState) => {
    if (!tabState || !tabState.url) return;
    const restoredId = createTab(tabState.url, {
      activate: false,
      preferredId: tabState.id,
      pinned: tabState.pinned,
      splitPane: tabState.splitPane
    });
    const restoredTab = getTabById(restoredId);
    if (restoredTab) {
      restoredTab.title = tabState.title || restoredTab.title;
      // ... restore other properties like createdAt, lastActiveAt, tabOrder
    }
  });

  if (sessionState.splitView && sessionState.splitView.enabled) {
    // Restore split view state
  }

  const nextTabId = getTabById(sessionState.currentTabId) ? sessionState.currentTabId : (getOrderedTabs()[0]?.id);
  if (nextTabId) {
    setActiveTab(nextTabId);
  }

  scheduleSessionSave();
  return true;
}

/**
 * Initializes the browser session, either by restoring a previous one
 * or opening the home page.
 * @param {object} settings - The current browser settings.
 */
export function initializeSession(settings) {
  let restored = false;
  if (window.api && typeof window.api.getSessionState === 'function') {
    const sessionState = window.api.getSessionState();
    const hasTabs = Array.isArray(sessionState?.tabs) && sessionState.tabs.length > 0;
    const restoreLastSession = settings?.restoreOnStartup === 'last-session';
    const restoreAfterCrash = settings?.crashRestoreEnabled !== false && sessionState?.cleanExit === false;

    if (hasTabs && (restoreLastSession || restoreAfterCrash)) {
      restored = restoreSessionState(sessionState);
    }
  }

  if (!restored) {
    createTab(settings?.homePage || 'gkp://home.gekko/');
  }

  scheduleSessionSave();
}
