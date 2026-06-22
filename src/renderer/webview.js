/**
 * Gekko Browser Renderer - Webview Management
 *
 * This file contains functions for setting up webview events and managing
 * the layout of webviews (e.g., for split view).
 */

import { currentTabId, tabs, splitViewState } from './core/state.js';
import { updateNavigationButtons } from './navigation.js';
import { applyThemeToWebview } from './theme.js';
import { updateTabTitle, updateTabFavicon, createTab, getTabTitle } from './tabs.js';
import { updateAddressBar, updateTabStatus, updateProtocolIndicator } from './ui.js';
import { updateBookmarkButton } from './bookmarks.js';
import { isInternalUrl, getInternalFaviconUrl } from './utils.js';
import { setIncognito } from './core/state.js';
import { FINGERPRINT_INJECT_CODE } from './fingerprint-inject.js';
import { COSMETIC_FILTER_CSS, COSMETIC_FILTER_JS } from './cosmetic-filter-inject.js';
import { YOUTUBE_ADBLOCK_CODE } from './youtube-adblock-inject.js';

/**
 * Sets up all necessary event listeners for a webview element.
 * @param {HTMLWebViewElement} webview - The webview element.
 * @param {string} tabId - The ID of the tab this webview belongs to.
 * @returns {HTMLWebViewElement} The configured webview element.
 */
export function setupWebviewEvents(webview, tabId) {
  webview.addEventListener('dom-ready', () => {
    webview.dataset.ready = 'true';

    // Inject fingerprint protection into page context before fingerprinting scripts collect data
    webview.executeJavaScript(FINGERPRINT_INJECT_CODE).catch(() => {});

    // Inject cosmetic CSS to hide ad elements that can't be blocked by domain alone
    webview.insertCSS(COSMETIC_FILTER_CSS).catch(() => {});
    // MutationObserver to catch ads inserted dynamically after dom-ready
    webview.executeJavaScript(COSMETIC_FILTER_JS).catch(() => {});

    // YouTube-specific ad blocking: auto-skip pre-rolls, hide ad UI
    const pageUrl = webview.getURL ? webview.getURL() : '';
    if (pageUrl.includes('youtube.com')) {
      webview.executeJavaScript(YOUTUBE_ADBLOCK_CODE).catch(() => {});
    }

    const currentTheme = localStorage.getItem('gekko-theme') || document.documentElement.getAttribute('data-theme') || 'dark';
    applyThemeToWebview(webview, currentTheme);
    if (tabId === currentTabId) {
      updateNavigationButtons(tabId);
      try {
        const actualUrl = webview.getURL ? webview.getURL() : webview.getAttribute('src');
        if (actualUrl) updateBookmarkButton(actualUrl);
      } catch (error) {
        console.warn('Unable to update bookmark button on dom-ready:', error);
      }
    }
  });

  webview.addEventListener('page-title-updated', (e) => updateTabTitle(tabId, e.title));
  
  webview.addEventListener('page-favicon-updated', (e) => {
    const url = webview.getURL ? webview.getURL() : webview.getAttribute('src');
    if (isInternalUrl(url)) {
      updateTabFavicon(tabId, getInternalFaviconUrl());
    } else if (e.favicons && e.favicons.length > 0) {
      updateTabFavicon(tabId, e.favicons[0]);
    }
  });

  webview.addEventListener('did-start-loading', () => {
    // Inject YouTube ad blocker as early as possible so fetch/XHR are patched
    // before YouTube's player scripts request ad data
    const earlyUrl = webview.getURL ? webview.getURL() : webview.getAttribute('src') || '';
    if (earlyUrl.includes('youtube.com')) {
      webview.executeJavaScript(YOUTUBE_ADBLOCK_CODE).catch(() => {});
    }

    updateTabStatus(tabId, 'loading');
    // Clear cached theme state so the new page receives a fresh theme injection
    webview.removeAttribute('data-last-theme');
    if (tabId === currentTabId) {
        const refreshButton = document.getElementById('refresh-button');
        refreshButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        refreshButton.setAttribute('data-action', 'stop');
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    updateTabStatus(tabId, 'complete');
    if (tabId === currentTabId) {
        const refreshButton = document.getElementById('refresh-button');
        refreshButton.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
        refreshButton.setAttribute('data-action', 'refresh');
        const isIncognito = window.api.getIncognitoMode();
        document.getElementById('status-text').textContent = isIncognito ? 'Ready (Incognito)' : 'Ready';
    }
    // Reapply theme for internal pages after load to handle pages that re-initialize
    try {
      const url = webview.getURL ? webview.getURL() : webview.getAttribute('src');
      if (!url || url === 'about:blank' || url.startsWith('gkp://') || url.startsWith('gkps://')) {
        const currentTheme = localStorage.getItem('gekko-theme') || document.documentElement.getAttribute('data-theme') || 'dark';
        applyThemeToWebview(webview, currentTheme);
      }
    } catch (error) {
      console.error('Error reapplying theme after load:', error);
    }
  });

  webview.addEventListener('did-navigate', (e) => {
    updateAddressBar(e.url, tabId);
    updateNavigationButtons(tabId);
    if (isInternalUrl(e.url)) {
      updateTabFavicon(tabId, getInternalFaviconUrl());
    }
    addToHistory(e.url, getTabTitle(tabId));
    updateProtocolIndicator(e.url);
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    updateAddressBar(e.url, tabId);
    updateNavigationButtons(tabId);
    if (e.isMainFrame) {
      addToHistory(e.url, getTabTitle(tabId));
    }
  });

  webview.addEventListener('new-window', (e) => {
    e.preventDefault();
    try {
      const { hostname } = new URL(e.url);
    } catch (_) {}
    createTab(e.url);
  });

  webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode === -3) return; // Ignore aborted loads
    updateTabStatus(tabId, 'error');
    if (tabId === currentTabId) {
        document.getElementById('status-text').textContent = `Failed to load: ${e.errorDescription}`;
    }
  });

  webview.addEventListener('console-message', (e) => {
    console.log(`[Webview ${tabId}]:`, e.message);
  });

  return webview;
}

/**
 * Renders the webviews according to the current layout (single or split view).
 */
export function renderWebviewsForCurrentLayout() {
  document.querySelectorAll('.webview').forEach((webview) => {
    webview.classList.add('hidden');
    webview.classList.remove('split-pane-left', 'split-pane-right');
  });

  const browserContent = document.getElementById('browser-content');

  if (splitViewState.enabled && splitViewState.leftTabId && splitViewState.rightTabId) {
    browserContent.classList.add('split-view-enabled');
    const leftWebview = document.querySelector(`#webview-${splitViewState.leftTabId}`);
    const rightWebview = document.querySelector(`#webview-${splitViewState.rightTabId}`);
    if (leftWebview) {
      leftWebview.classList.remove('hidden');
      leftWebview.classList.add('split-pane-left');
    }
    if (rightWebview) {
      rightWebview.classList.remove('hidden');
      rightWebview.classList.add('split-pane-right');
    }
  } else {
    browserContent.classList.remove('split-view-enabled');
    const activeWebview = document.querySelector(`#webview-${currentTabId}`);
    if (activeWebview) {
      activeWebview.classList.remove('hidden');
    }
  }
}

/**
 * Adds an entry to the browsing history.
 * @param {string} url - The URL of the page.
 * @param {string} title - The title of the page.
 */
function addToHistory(url, title) {
  if (!url || url.startsWith('about:') || url.startsWith('chrome:')) {
    return;
  }
  if (window.api.getIncognitoMode()) {
    return;
  }
  window.api.addToHistory({ url, title });
}
