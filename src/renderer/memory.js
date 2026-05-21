/**
 * Gekko Browser Renderer - Memory Management
 *
 * This file contains functions related to the Memory Saver feature,
 * which discards inactive tabs to save resources.
 */

import { tabs, memorySaverEnabled, memorySaverIdleMs, currentTabId } from './core/state.js';
import { isInternalUrl } from './utils.js';
import { createWebviewForTab } from './tabs.js';

/**
 * Runs the memory saver logic, checking for and discarding idle tabs.
 */
export function runMemorySaver() {
  if (!memorySaverEnabled) {
    return;
  }

  const now = Date.now();
  tabs.forEach((tab) => {
    if (!tab || tab.id === currentTabId || tab.isDiscarded) {
      return;
    }

    if (!tab.webview) {
      return;
    }

    let currentUrl = tab.url;
    try {
      if (typeof tab.webview.getURL === 'function') {
        currentUrl = tab.webview.getURL() || currentUrl;
      }
    } catch (error) {
      currentUrl = tab.url;
    }

    if (isInternalUrl(currentUrl)) {
      return;
    }

    const lastActiveAt = tab.lastActiveAt || tab.createdAt || 0;
    if (now - lastActiveAt < memorySaverIdleMs) {
      return;
    }

    discardTab(tab);
  });
}

/**
 * Discards a given tab, removing its webview to free up memory.
 * @param {object} tab - The tab object to discard.
 */
export function discardTab(tab) {
  if (!tab || tab.isDiscarded || !tab.webview) {
    return;
  }

  let discardUrl = tab.url;
  try {
    if (typeof tab.webview.getURL === 'function') {
      discardUrl = tab.webview.getURL() || discardUrl;
    }
  } catch (error) {
    discardUrl = tab.url;
  }

  tab.discardedUrl = discardUrl || tab.url || '';
  tab.isDiscarded = true;
  tab.element?.classList.add('tab-discarded');

  try {
    tab.webview.remove();
  } catch (error) {
    console.warn('Failed to remove discarded webview:', error);
  }

  tab.webview = null;
}

/**
 * Restores a discarded tab, recreating its webview and loading its URL.
 * @param {object} tab - The tab object to restore.
 */
export function restoreDiscardedTab(tab) {
  if (!tab || !tab.isDiscarded) {
    return;
  }

  const settings = window.api.getSettings();
  const fallbackUrl = settings?.homePage || 'gkp://home.gekko/';
  const restoreUrl = tab.discardedUrl || tab.url || fallbackUrl;

  tab.webview = createWebviewForTab(tab.id, restoreUrl);
  tab.isDiscarded = false;
  tab.discardedUrl = null;
  tab.element?.classList.remove('tab-discarded');
}
