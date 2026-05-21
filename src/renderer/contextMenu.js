/**
 * Gekko Browser Renderer - Context Menu
 *
 * This file contains functions for handling actions triggered from
 * custom context menus (e.g., the tab context menu).
 */

import { createTab, closeTab, getTabById, getTabIdsInOrder } from './tabs.js';
import { navigateTo } from './navigation.js';
import { saveWorkspaceFromTabs } from './workspaces.js';
import { splitViewState, tabs } from './core/state.js';
import { applyTabVisualState, setActiveTab } from './tabs.js';
import { renderWebviewsForCurrentLayout } from './webview.js';
import { scheduleSessionSave } from './session.js';

/**
 * Handles actions dispatched from the main process's tab context menu.
 * @param {string} action - The action to perform.
 * @param {object} payload - The data associated with the action.
 */
export function handleTabContextAction(action, payload) {
  const { tabId } = payload || {};

  if (action === 'save-workspace') {
    saveWorkspaceFromTabs();
    return;
  }

  if (!tabId) return;

  switch (action) {
    case 'new-tab':
      createTab();
      break;
    case 'duplicate-tab':
      duplicateTab(tabId);
      break;
    case 'reload-tab':
      reloadTab(tabId);
      break;
    case 'close-tab':
      closeTab(tabId);
      break;
    case 'close-other-tabs':
      closeOtherTabs(tabId);
      break;
    case 'close-tabs-to-right':
      closeTabsToRight(tabId);
      break;
    case 'toggle-pin-tab':
      togglePinTab(tabId);
      break;
    case 'split-open-right':
      openTabInSplit(tabId, 'right');
      break;
    case 'split-open-left':
      openTabInSplit(tabId, 'left');
      break;
    case 'split-exit':
      disableSplitView();
      break;
    default:
      console.warn('Unknown tab context action:', action);
  }
}

function duplicateTab(tabId) {
  const tab = getTabById(tabId);
  if (!tab) return;
  const url = tab.webview && typeof tab.webview.getURL === 'function' ? tab.webview.getURL() : tab.url;
  createTab(url);
}

function reloadTab(tabId) {
  const tab = getTabById(tabId);
  if (tab?.webview?.reload) {
    tab.webview.reload();
  }
}

function closeOtherTabs(tabId) {
  setActiveTab(tabId);
  tabs.filter(tab => tab.id !== tabId).forEach(tab => closeTab(tab.id));
}

function closeTabsToRight(tabId) {
  const tabIds = getTabIdsInOrder();
  const tabIndex = tabIds.indexOf(tabId);
  if (tabIndex < 0) return;
  tabIds.slice(tabIndex + 1).forEach(id => closeTab(id));
}

function togglePinTab(tabId) {
    const tab = getTabById(tabId);
    if (!tab) return;
    tab.pinned = !tab.pinned;
    applyTabVisualState(tab.id);
    // renderTabOrder();
    scheduleSessionSave();
}

function openTabInSplit(tabId, pane) {
    // This logic is complex and involves significant state changes.
    // It would need careful implementation based on the new modular structure.
    console.log(`Action 'openTabInSplit' for tab ${tabId} in pane ${pane} needs to be implemented.`);
}

export function disableSplitView() {
    splitViewState.enabled = false;
    splitViewState.activePane = 'left';
    splitViewState.leftTabId = null;
    splitViewState.rightTabId = null;

    tabs.forEach((tab) => {
      tab.splitPane = null;
      applyTabVisualState(tab.id);
    });

    renderWebviewsForCurrentLayout();
    scheduleSessionSave();
}
