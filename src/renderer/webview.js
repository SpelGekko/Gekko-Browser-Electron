/**
 * Gekko Browser Renderer - WebContentsView event listeners and layout helpers
 *
 * Tab content is rendered by WebContentsView instances managed in the main
 * process.  This module wires up the IPC events the main process emits back
 * to the chrome renderer (title changes, navigation, load states, etc.) and
 * provides helpers for switching active tabs / entering split view.
 */

import { currentTabId, tabs, splitViewState, tabNavState } from './core/state.js';
import { updateNavigationButtons } from './navigation.js';
import { applyThemeToTab } from './theme.js';
import { updateTabTitle, updateTabFavicon, createTab, getTabTitle } from './tabs.js';
import { updateAddressBar, updateTabStatus, updateProtocolIndicator } from './ui.js';
import { updateBookmarkButton } from './bookmarks.js';
import { isInternalUrl, getInternalFaviconUrl } from './utils.js';

/**
 * Call once at startup to wire all IPC events from the main process
 * back into the chrome renderer UI.
 */
export function setupWcvEventListeners() {
  // ── Title ─────────────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-title-updated', (tabId, title) => {
    updateTabTitle(tabId, title);
  });

  // ── Favicon ───────────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-favicon-updated', (tabId, favicons) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const url = tab.url || '';
    if (isInternalUrl(url)) {
      updateTabFavicon(tabId, getInternalFaviconUrl());
    } else if (favicons && favicons.length > 0) {
      updateTabFavicon(tabId, favicons[0]);
    }
  });

  // ── Load state ────────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-loading-start', (tabId) => {
    updateTabStatus(tabId, 'loading');
    if (tabId === currentTabId) {
      const refreshButton = document.getElementById('refresh-button');
      if (refreshButton) {
        refreshButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        refreshButton.setAttribute('data-action', 'stop');
      }
    }
  });

  window.api.onWcvEvent('wcv-loading-stop', (tabId) => {
    updateTabStatus(tabId, 'complete');
    if (tabId === currentTabId) {
      const refreshButton = document.getElementById('refresh-button');
      if (refreshButton) {
        refreshButton.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        refreshButton.setAttribute('data-action', 'refresh');
      }
      const isIncognito = window.api.getIncognitoMode();
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = isIncognito ? 'Ready (Incognito)' : 'Ready';
    }
  });

  // ── Navigation state (can go back/forward) ────────────────────────────────
  window.api.onWcvEvent('wcv-nav-state', (tabId, state) => {
    tabNavState[tabId] = state;
    if (tabId === currentTabId) updateNavigationButtons(tabId);
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-navigated', (tabId, url) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) tab.url = url;

    if (tabId === currentTabId) {
      updateAddressBar(url, tabId);
      updateProtocolIndicator(url);
      try { updateBookmarkButton(url); } catch (_) {}
    }
    if (isInternalUrl(url)) updateTabFavicon(tabId, getInternalFaviconUrl());
    addToHistory(url, getTabTitle(tabId));

    // Re-apply theme on navigation (internal pages in particular)
    const currentTheme = localStorage.getItem('gekko-theme')
      || document.documentElement.getAttribute('data-theme')
      || 'dark';
    applyThemeToTab(tabId, currentTheme);
  });

  window.api.onWcvEvent('wcv-navigated-in-page', (tabId, url, isMainFrame) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) tab.url = url;
    if (tabId === currentTabId) {
      updateAddressBar(url, tabId);
    }
    if (isMainFrame) addToHistory(url, getTabTitle(tabId));
  });

  // ── DOM ready ─────────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-dom-ready', (tabId) => {
    if (tabId === currentTabId) {
      updateNavigationButtons(tabId);
      const tab = tabs.find(t => t.id === tabId);
      if (tab && tab.url) {
        try { updateBookmarkButton(tab.url); } catch (_) {}
      }
    }
    // Apply current theme into the freshly-loaded page
    const currentTheme = localStorage.getItem('gekko-theme')
      || document.documentElement.getAttribute('data-theme')
      || 'dark';
    applyThemeToTab(tabId, currentTheme);
  });

  // ── Load failure ──────────────────────────────────────────────────────────
  window.api.onWcvEvent('wcv-fail-load', (tabId, errCode, errDesc) => {
    updateTabStatus(tabId, 'error');
    if (tabId === currentTabId) {
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = `Failed to load: ${errDesc}`;
    }
  });

  // ── New window request (popup / target=_blank) ────────────────────────────
  window.api.onWcvEvent('wcv-new-window', (tabId, url) => {
    createTab(url);
  });
}

/**
 * Show the active tab's WebContentsView, or set up split view.
 * Should be called whenever the visible tab changes.
 */
export function renderWebviewsForCurrentLayout() {
  if (splitViewState.enabled && splitViewState.leftTabId && splitViewState.rightTabId) {
    window.api.wcvSetSplitView(splitViewState.leftTabId, splitViewState.rightTabId);
  } else {
    window.api.wcvSetActive(currentTabId);
  }
}

// ── Internal helper ───────────────────────────────────────────────────────────
function addToHistory(url, title) {
  if (!url || url.startsWith('about:') || url.startsWith('chrome:')) return;
  if (window.api.getIncognitoMode()) return;
  window.api.addToHistory({ url, title });
}
