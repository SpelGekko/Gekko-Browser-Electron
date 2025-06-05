/**
 * Gekko Browser Renderer
 * Handles all browser UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize variables
  let currentTabId = null;
  let tabs = [];

  // DOM Elements
  const tabBar = document.getElementById('tab-bar');
  const newTabButton = document.getElementById('new-tab-button');
  const browserContent = document.getElementById('browser-content');
  const addressBar = document.getElementById('address-bar');
  const addressProtocol = document.getElementById('address-protocol');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const refreshButton = document.getElementById('refresh-button');
  const homeButton = document.getElementById('home-button');
  const clearButton = document.getElementById('clear-button');
  const bookmarksButton = document.getElementById('bookmarks-button');
  const historyButton = document.getElementById('history-button');
  const settingsButton = document.getElementById('settings-button');
  const minimizeButton = document.getElementById('minimize-button');
  const maximizeButton = document.getElementById('maximize-button');
  const closeButton = document.getElementById('close-button');
  const statusText = document.getElementById('status-text');
  const statusSecurity = document.getElementById('status-security');
  const securityText = document.getElementById('security-text');

  // Get settings from main process
  function getSettings() {
    try {
      const settings = window.api.getSettings();
      return settings && !settings._error ? settings : { theme: 'dark' };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { theme: 'dark' };
    }
  }

  // Apply theme to the UI
  function applyTheme(themeId) {
    console.log('Applying theme:', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    
    // Apply to all webviews
  tabs.forEach((tab, index) => {
      if (tab && tab.webview && tab.webview.isConnected) {
        console.log(`Processing webview for tab ${index + 1}/${tabs.length}`);
        try {
          // Use the API functions in the webview
          tab.webview.executeJavaScript(`
            if (window.api) {
              window.api.setSetting('theme', '${themeId}');
              window.api.applyTheme('${themeId}');
            } else {
              // Fallback to direct DOM manipulation
              document.documentElement.setAttribute('data-theme', '${themeId}');
              document.body.setAttribute('data-theme', '${themeId}');
            }
          `).catch(console.error);
        } catch (error) {
          console.error('Error applying theme to webview:', error);
        }
      }
    });
  }

  // Initialize settings and apply theme
  const settings = getSettings();
  applyTheme(settings.theme);

  // Set up event listeners
  function setupEventListeners() {
    if (!minimizeButton || !maximizeButton || !closeButton) {
      console.error('Window control buttons not found');
      return;
    }

    // Window controls
    minimizeButton.addEventListener('click', () => window.api.minimize());
    maximizeButton.addEventListener('click', () => window.api.maximize());
    closeButton.addEventListener('click', () => window.api.close());
    
    // Navigation
    backButton.addEventListener('click', () => goBack());
    forwardButton.addEventListener('click', () => goForward());
    refreshButton.addEventListener('click', () => refresh());
    homeButton.addEventListener('click', () => goHome());
    
    // Address bar
    addressBar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNavigation(addressBar.value);
      }
    });
    
    // Browser features
    bookmarksButton.addEventListener('click', () => showBookmarks());
    historyButton.addEventListener('click', () => showHistory());
    settingsButton.addEventListener('click', () => showSettings());

    // Theme change messages from settings page
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'themeChange' && event.data?.theme) {
        console.log('Theme change requested:', event.data.theme);
        window.api.setSetting('theme', event.data.theme);
        applyTheme(event.data.theme);
      }
    });
  }

  // Common navigation functions
  function goBack() {
    const webview = getCurrentWebview();
    if (webview?.canGoBack()) {
      webview.goBack();
    }
  }

  function goForward() {
    const webview = getCurrentWebview();
    if (webview?.canGoForward()) {
      webview.goForward();
    }
  }

  function refresh() {
    const webview = getCurrentWebview();
    if (webview) {
      webview.reload();
    }
  }

  function goHome() {
    const settings = getSettings();
    handleNavigation(settings.homePage || 'gkp://home.gekko/');
  }

  function showBookmarks() {
    handleNavigation('gkp://bookmarks.gekko/');
  }

  function showHistory() {
    handleNavigation('gkp://history.gekko/');
  }

  function showSettings() {
    handleNavigation('gkp://settings.gekko/');
  }

  function getCurrentWebview() {
    return document.querySelector(`#webview-${currentTabId}`);
  }

  function handleNavigation(url) {
    const webview = getCurrentWebview();
    if (!webview) return;

    try {
      // Process URL (add https:// if needed)
      url = url.trim();
      if (!url.includes('://')) {
        if (url.includes('.') && !url.includes(' ')) {
          url = 'https://' + url;
        } else {
          const settings = getSettings();
          url = (settings.searchEngine || 'https://www.google.com/search?q=') + 
                encodeURIComponent(url);
        }
      }

      // Load URL in webview
      webview.loadURL(url).catch(error => {
        console.error('Failed to load URL:', error);
        webview.setAttribute('src', url);
      });

      // Update address bar
      addressBar.value = url;
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  // Set up event listeners
  setupEventListeners();
});
