/**
 * Gekko Browser Renderer - Navigation
 *
 * All navigation is now handled by sending IPC to the main process which
 * controls WebContentsView instances.  The webview DOM element is gone.
 */

import { currentTabId, tabs, tabNavState } from './core/state.js';
import { updateAddressBar, updateTabStatus, updateProtocolIndicator } from './ui.js';

/**
 * Navigates a tab to a URL (defaults to current tab).
 */
export function navigateTo(url, tabId) {
  const targetTabId = tabId || currentTabId;
  url = processUrl(url);
  console.log('Navigating to processed URL:', url);
  updateAddressBar(url, targetTabId);
  updateTabStatus(targetTabId, 'loading');
  window.api.wcvNavigate(targetTabId, url);
}

/**
 * Processes a raw URL / search term into a navigable URL.
 */
export function processUrl(url) {
  url = url.trim();
  if (url.startsWith('about:') || url.startsWith('chrome:')) return url;
  if (
    url.startsWith('http://') || url.startsWith('https://') ||
    url.startsWith('gkp://') || url.startsWith('gkps://') ||
    url.startsWith('file://')
  ) return url;

  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
  if (ipRegex.test(url)) return 'http://' + url;
  if (url.includes('.') && !url.includes(' ') && !/\s/.test(url)) return 'https://' + url;

  const settings = window.api.getSettings();
  const searchEngine = settings.searchEngine || 'google';
  const engines = {
    google: 'https://www.google.com/search?q=',
    bing:   'https://www.bing.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    yahoo:  'https://search.yahoo.com/search?p=',
  };
  const base = engines[searchEngine]
    || (searchEngine.includes('://') ? searchEngine : 'https://www.google.com/search?q=');
  return base + encodeURIComponent(url);
}

/**
 * Handles navigation from the address bar or internal pages.
 */
export function handleNavigation(url) {
  const tab = tabs.find(t => t.id === currentTabId);
  if (!tab) { console.error('No active tab found'); return; }
  navigateTo(url, currentTabId);
}

export function goBack() {
  if (currentTabId) window.api.wcvGoBack(currentTabId);
}

export function goForward() {
  if (currentTabId) window.api.wcvGoForward(currentTabId);
}

export function refresh() {
  if (!currentTabId) return;
  const refreshButton = document.getElementById('refresh-button');
  const action = refreshButton ? refreshButton.getAttribute('data-action') : 'refresh';
  if (action === 'stop') {
    window.api.wcvStop(currentTabId);
  } else {
    window.api.wcvReload(currentTabId);
  }
}

export function goHome() {
  const settings = window.api.getSettings();
  navigateTo(settings.homePage || 'gkp://home.gekko/');
}

/**
 * Updates back/forward button state from the cached tabNavState map.
 * (The main process sends 'wcv-nav-state' events which update the cache.)
 */
export function updateNavigationButtons(tabId) {
  const backButton    = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  if (!backButton || !forwardButton) return;

  const state = tabNavState[tabId];
  if (!state) {
    backButton.classList.add('disabled');
    forwardButton.classList.add('disabled');
    return;
  }
  backButton.classList.toggle('disabled', !state.canGoBack);
  forwardButton.classList.toggle('disabled', !state.canGoForward);
}
