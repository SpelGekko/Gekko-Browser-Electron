/**
 * Gekko Browser Renderer - Navigation
 *
 * This file contains functions for handling URL processing, navigation,
 * and updating the state of navigation controls.
 */

import { currentTabId, tabs } from './core/state.js';
import { updateAddressBar, updateTabStatus, updateProtocolIndicator } from './ui.js';

/**
 * Navigates the webview of a given tab to a URL.
 * @param {string} url - The URL to navigate to.
 * @param {string} [tabId] - The ID of the tab to navigate. Defaults to the current tab.
 */
export function navigateTo(url, tabId) {
  const targetTabId = tabId || currentTabId;
  url = processUrl(url);

  console.log('Navigating to processed URL:', url);

  const webview = document.querySelector(`#webview-${targetTabId}`);
  if (webview) {
    updateAddressBar(url, targetTabId);
    updateTabStatus(targetTabId, 'loading');
    if (!safeLoadURL(webview, url)) {
      document.getElementById('status-text').textContent = 'Navigation failed';
    }
  } else {
    console.error('No webview found for tab:', targetTabId);
  }
}

/**
 * Processes a URL string, adding a protocol if missing or converting it
 * to a search query if it's not a valid URL.
 * @param {string} url - The raw URL or search term.
 * @returns {string} The processed, navigable URL.
 */
export function processUrl(url) {
  url = url.trim();
  if (url.startsWith('about:') || url.startsWith('chrome:')) {
    return url;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('gkp://') || url.startsWith('gkps://') || url.startsWith('file://')) {
    return url;
  }
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
  if (ipRegex.test(url)) {
    return 'http://' + url;
  }
  if (url.includes('.') && !url.includes(' ') && !/\s/.test(url)) {
    return 'https://' + url;
  }
  
  const settings = window.api.getSettings();
  let searchEngine = settings.searchEngine || 'google';
  let searchUrl;
  
  switch (searchEngine) {
    case 'google':
      searchUrl = 'https://www.google.com/search?q=';
      break;
    case 'bing':
      searchUrl = 'https://www.bing.com/search?q=';
      break;
    case 'duckduckgo':
      searchUrl = 'https://duckduckgo.com/?q=';
      break;
    case 'yahoo':
      searchUrl = 'https://search.yahoo.com/search?p=';
      break;
    default:
      searchUrl = searchEngine.includes('://') ? searchEngine : 'https://www.google.com/search?q=';
  }
  
  return searchUrl + encodeURIComponent(url);
}

/**
 * Handles navigation initiated from the address bar or internal pages.
 * @param {string} url - The URL to navigate to.
 */
export function handleNavigation(url) {
  console.log('handleNavigation called with:', url);
  const tab = tabs.find(t => t.id === currentTabId);
  if (!tab || !tab.webview) {
    console.error('No active tab found');
    return;
  }
  try {
    const processedUrl = processUrl(url);
    console.log('Processed URL:', processedUrl);
    updateAddressBar(processedUrl, currentTabId);
    updateTabStatus(currentTabId, 'loading');
    if (!safeLoadURL(tab.webview, processedUrl)) {
      document.getElementById('status-text').textContent = 'Navigation failed';
    }
  } catch (error) {
    console.error('Navigation error:', error);
    document.getElementById('status-text').textContent = 'Navigation failed';
  }
}

/**
 * Safely loads a URL in a webview, with fallbacks.
 * @param {HTMLWebViewElement} webview - The webview element.
 * @param {string} url - The URL to load.
 * @returns {boolean} True on success, false on failure.
 */
export function safeLoadURL(webview, url) {
  console.log(`Attempting to load URL: ${url}`);
  if (!webview) {
    console.error('No webview provided');
    return false;
  }
  try {
    url = processUrl(url);
    if (webview.isConnected && typeof webview.loadURL === 'function') {
      webview.loadURL(url).catch(error => {
        console.error(`loadURL failed, falling back to src attribute: ${error.message}`);
        webview.setAttribute('src', url);
      });
    } else {
      console.log('Webview not ready for loadURL, using src attribute');
      webview.setAttribute('src', url);
    }
    return true;
  } catch (error) {
    console.error(`Error in safeLoadURL: ${error.message}`);
    try {
      webview.setAttribute('src', url);
      console.log('Used setAttribute fallback for navigation');
      return true;
    } catch (finalError) {
      console.error(`Complete failure loading URL: ${finalError.message}`);
      return false;
    }
  }
}

/**
 * Navigates the current tab back in its history.
 */
export function goBack() {
  if (currentTabId) {
    const webview = document.querySelector(`#webview-${currentTabId}`);
    if (webview && webview.canGoBack()) {
      webview.goBack();
      updateNavigationButtons(currentTabId);
    }
  }
}

/**
 * Navigates the current tab forward in its history.
 */
export function goForward() {
  if (currentTabId) {
    const webview = document.querySelector(`#webview-${currentTabId}`);
    if (webview && webview.canGoForward()) {
      webview.goForward();
      updateNavigationButtons(currentTabId);
    }
  }
}

/**
 * Refreshes or stops the loading of the current tab.
 */
export function refresh() {
  if (currentTabId) {
    const webview = document.querySelector(`#webview-${currentTabId}`);
    const refreshButton = document.getElementById('refresh-button');
    if (webview) {
      const action = refreshButton.getAttribute('data-action');
      if (action === 'stop') {
        webview.stop();
      } else {
        webview.reload();
      }
    }
  }
}

/**
 * Navigates the current tab to the home page.
 */
export function goHome() {
  const settings = window.api.getSettings();
  const homePage = settings.homePage || 'gkp://home.gekko/';
  navigateTo(homePage);
}

/**
 * Updates the enabled/disabled state of the back and forward buttons.
 * @param {string} tabId - The ID of the tab whose navigation state is being checked.
 */
export function updateNavigationButtons(tabId) {
  const webview = document.querySelector(`#webview-${tabId}`);
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');

  if (!webview) {
    backButton.classList.add('disabled');
    forwardButton.classList.add('disabled');
    return;
  }
  try {
    if (webview.dataset.ready !== 'true' || !webview.isConnected || typeof webview.canGoBack !== 'function') {
      backButton.classList.add('disabled');
      forwardButton.classList.add('disabled');
      return;
    }
    backButton.classList.toggle('disabled', !webview.canGoBack());
    forwardButton.classList.toggle('disabled', !webview.canGoForward());
  } catch (error) {
    console.warn('Navigation state not yet available:', error);
    backButton.classList.add('disabled');
    forwardButton.classList.add('disabled');
  }
}
