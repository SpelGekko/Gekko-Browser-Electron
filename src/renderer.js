/**
 * Gekko Browser Renderer
 * Handles all browser UI interactions
 */

// Get user-friendly error message for settings errors
function getSettingsErrorMessage(error) {
  const messages = {
    cannot_create_dir: 'Could not create settings directory',
    cannot_create_file: 'Could not create settings file',
    cannot_write: 'Could not save settings',
    cannot_read: 'Could not read settings',
    invalid_json: 'Settings file is corrupted'
  };
  
  return messages[error.error] || 'Unknown settings error';
}

// Helper to safely load settings
function loadSettingsSafely() {
  try {
    const settings = window.api.getSettings();
    
    // Check for settings errors
    if (settings._error) {
      const error = settings._error;
      console.error('Settings error:', error);
      
      // Try to get theme from localStorage first
      const savedTheme = localStorage.getItem('gekko-theme');
      if (savedTheme) {
        console.log('Using theme from localStorage:', savedTheme);
        // Persist the theme back to settings storage when possible
        try {
          window.api.setSetting('theme', savedTheme);
        } catch (e) {
          console.warn('Could not persist theme to settings:', e);
        }
        return { ...settings, theme: savedTheme };
      }
      
      // Show error notification
      statusText.textContent = 'Settings Error: ' + getSettingsErrorMessage(error);
      statusText.style.color = 'var(--error)';
      
      // Return settings without error field
      const { _error, ...cleanSettings } = settings;
      return cleanSettings;
    }
    
    // If we have a theme in settings but not localStorage, sync it
    const localTheme = localStorage.getItem('gekko-theme');
    if (settings.theme && !localTheme) {
      console.log('Syncing settings theme to localStorage:', settings.theme);
      try {
        localStorage.setItem('gekko-theme', settings.theme);
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
      }
    }
    // If we have a theme in localStorage that differs from settings, sync it
    else if (localTheme && localTheme !== settings.theme) {
      console.log('Syncing localStorage theme to settings:', localTheme);
      try {
        window.api.setSetting('theme', localTheme);
        return { ...settings, theme: localTheme };
      } catch (e) {
        console.warn('Could not sync theme to settings:', e);
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Error loading settings:', error);
    // Try to get theme from localStorage as ultimate fallback
    try {
      const savedTheme = localStorage.getItem('gekko-theme');
      return { theme: savedTheme || 'dark' };
    } catch (e) {
      return { theme: 'dark' };
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize variables
  let currentTabId = null;
  let tabs = [];
  let history = [];

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

  // Verify all required elements are present
  if (!verifyRequiredElements()) {
    console.error('Some required UI elements are missing');
    return;
  }

  // Get user-friendly error message for settings errors
  function getSettingsErrorMessage(error) {
    const messages = {
      cannot_create_dir: 'Could not create settings directory',
      cannot_create_file: 'Could not create settings file',
      cannot_write: 'Could not save settings',
      cannot_read: 'Could not read settings',
      invalid_json: 'Settings file is corrupted'
    };
    
    return messages[error.error] || 'Unknown settings error';
  }

  // Helper to safely load settings
  function loadSettingsSafely() {
    try {
      const settings = window.api.getSettings();
      
      // Check for settings errors
      if (settings._error) {
        const error = settings._error;
        console.error('Settings error:', error);
        
        // Try to get theme from localStorage first
        const savedTheme = localStorage.getItem('gekko-theme');
        if (savedTheme) {
          console.log('Using theme from localStorage:', savedTheme);
          // Persist the theme back to settings storage when possible
          try {
            window.api.setSetting('theme', savedTheme);
          } catch (e) {
            console.warn('Could not persist theme to settings:', e);
          }
          return { ...settings, theme: savedTheme };
        }
        
        // Show error notification
        statusText.textContent = 'Settings Error: ' + getSettingsErrorMessage(error);
        statusText.style.color = 'var(--error)';
        
        // Return settings without error field
        const { _error, ...cleanSettings } = settings;
        return cleanSettings;
      }
      
      // If we have a theme in settings but not localStorage, sync it
      const localTheme = localStorage.getItem('gekko-theme');
      if (settings.theme && !localTheme) {
        console.log('Syncing settings theme to localStorage:', settings.theme);
        try {
          localStorage.setItem('gekko-theme', settings.theme);
        } catch (e) {
          console.warn('Could not save theme to localStorage:', e);
        }
      }
      // If we have a theme in localStorage that differs from settings, sync it
      else if (localTheme && localTheme !== settings.theme) {
        console.log('Syncing localStorage theme to settings:', localTheme);
        try {
          window.api.setSetting('theme', localTheme);
          return { ...settings, theme: localTheme };
        } catch (e) {
          console.warn('Could not sync theme to settings:', e);
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      // Try to get theme from localStorage as ultimate fallback
      try {
        const savedTheme = localStorage.getItem('gekko-theme');
        return { theme: savedTheme || 'dark' };
      } catch (e) {
        return { theme: 'dark' };
      }
    }
  }

  // Try to get theme from localStorage first, fallback to settings
  let settings = loadSettingsSafely();
  let theme = localStorage.getItem('gekko-theme') || settings.theme || 'dark';

  // Apply theme
  applyTheme(theme);
  
  // Set up event listeners
  setupEventListeners();
    // Create initial tab with home page
  createTab(settings?.homePage || 'gkp://home.gekko/');

  // Make handleNavigation function available to window object for internal pages
  window.handleNavigation = handleNavigation;

  // Verify all required DOM elements are present
  function verifyRequiredElements() {
    const requiredElements = [
      { el: tabBar, name: 'tab-bar' },
      { el: newTabButton, name: 'new-tab-button' },
      { el: browserContent, name: 'browser-content' },
      { el: addressBar, name: 'address-bar' },
      { el: addressProtocol, name: 'address-protocol' },
      { el: backButton, name: 'back-button' },
      { el: forwardButton, name: 'forward-button' },
      { el: refreshButton, name: 'refresh-button' },
      { el: homeButton, name: 'home-button' },
      { el: clearButton, name: 'clear-button' },
      { el: bookmarksButton, name: 'bookmarks-button' },
      { el: historyButton, name: 'history-button' },
      { el: settingsButton, name: 'settings-button' },
      { el: minimizeButton, name: 'minimize-button' },
      { el: maximizeButton, name: 'maximize-button' },
      { el: closeButton, name: 'close-button' },
      { el: statusText, name: 'status-text' },
      { el: statusSecurity, name: 'status-security' },
      { el: securityText, name: 'security-text' }
    ];

    let allPresent = true;
    requiredElements.forEach(({el, name}) => {
      if (!el) {
        console.error(`Required element not found: ${name}`);
        allPresent = false;
      }
    });

    return allPresent;
  }

  // Set up event listeners
  function setupEventListeners() {
    if (!minimizeButton || !maximizeButton || !closeButton) {
      console.error('Window control buttons not found');
      return;
    }

    // Window control buttons
    minimizeButton.addEventListener('click', () => window.api.minimize());
    maximizeButton.addEventListener('click', () => window.api.maximize());
    closeButton.addEventListener('click', () => window.api.close());
    
    // Tab management
    newTabButton.addEventListener('click', () => createTab());
    
    // Navigation controls
    backButton.addEventListener('click', () => goBack());
    forwardButton.addEventListener('click', () => goForward());
    refreshButton.addEventListener('click', () => refresh());
    homeButton.addEventListener('click', () => goHome());
    
    // Address bar handling
    addressBar.addEventListener('keydown', handleAddressBarKeyDown);
    clearButton.addEventListener('click', clearAddressBar);
    
    // Browser actions
    bookmarksButton.addEventListener('click', () => showBookmarks());
    historyButton.addEventListener('click', () => showHistory());
    settingsButton.addEventListener('click', () => showSettings());    // Listen for messages from internal pages
    window.addEventListener('message', (event) => {
      console.log('Message received:', event.data);
      
      // Navigation messages
      if (event.data && event.data.type === 'navigate' && event.data.url) {
        console.log('Navigation request received for URL:', event.data.url);
        try {
          // Call the handleNavigation function directly
          handleNavigation(event.data.url);
        } catch (error) {
          console.error('Error handling navigation message:', error);
          
          // Fallback approach for navigation - try multiple methods
          const tab = tabs.find(tab => tab.id === currentTabId);
          if (tab && tab.webview) {
            try {
              // Try direct loadURL
              const processedUrl = processUrl(event.data.url);
              safeLoadURL(tab.webview, processedUrl);
            } catch (innerError) {
              console.error('Fallback navigation also failed:', innerError);
              
              // Last resort fallback - set src attribute directly
              try {
                tab.webview.setAttribute('src', processUrl(event.data.url));
              } catch (finalError) {
                console.error('All navigation attempts failed:', finalError);
              }
            }
          }
        }      } else if (event.data && event.data.type === 'themeChange') {
        const newTheme = event.data.theme;
        console.log('Theme change requested:', newTheme);
        
        // Save theme to both localStorage and permanent storage
        localStorage.setItem('gekko-theme', newTheme);
        window.api.setSetting('theme', newTheme);
        
        // Apply theme to main UI
        applyTheme(newTheme);
        
      // Apply theme to all webviews
        tabs.forEach(tab => {
          if (tab && tab.webview && tab.webview.isConnected) {
            // Only apply theme to internal pages
            const url = tab.webview.getURL();
            if (url && (url.startsWith('gkp://') || url.startsWith('gkps://'))) {
              applyThemeToWebview(tab.webview, newTheme);
            }
          }
        });
      }
    });
  }

  // Handle address bar keydown events
  function handleAddressBarKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const url = addressBar.value;
      handleNavigation(url);
    }
  }

  // Add entry to history
  function addToHistory(url, title) {
    if (!url || url.startsWith('about:') || url.startsWith('chrome:')) {
      return;
    }
    
    const historyEntry = {
      url,
      title: title || url,
      timestamp: Date.now()
    };
    
    window.api.addToHistory(historyEntry);
  }  // Create a new tab
  function createTab(url) {
    const settings = window.api.getSettings();
    const tabId = generateTabId();
    const homePage = settings.homePage || 'gkp://home.gekko/';

    // Default URL if none provided
    url = url || homePage;
    
    console.log(`Creating new tab with URL: ${url}`);

    // Create tab element
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.setAttribute('data-tab-id', tabId);
    tab.innerHTML = `
      <div class="tab-content">
        <div class="tab-icon">
          <i class="fa-solid fa-globe"></i>
        </div>
        <div class="tab-title">New Tab</div>
      </div>
      <div class="tab-close">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;

    // Insert tab before the new tab button
    tabBar.insertBefore(tab, newTabButton);

    // Create webview with secure settings
    const webview = document.createElement('webview');
    webview.setAttribute('id', `webview-${tabId}`);
    webview.setAttribute('class', 'webview hidden');
    webview.setAttribute('data-tab-id', tabId);    webview.setAttribute('nodeintegration', 'false');
    webview.setAttribute('contextIsolation', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=true, sandbox=true, javascript=true, webviewTag=false, nodeIntegration=false');
    webview.setAttribute('preload', window.api.getPaths().webviewPreload);
    webview.setAttribute('httpreferrer', 'strict-origin-when-cross-origin');    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('enableremotemodule', 'false');
    
    // Set content security policy for internal pages
    if (url.startsWith('gkp://') || url.startsWith('gkps://')) {
      webview.setAttribute('contentSecurityPolicy', `
        default-src 'self' gkp: gkps:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps:;
        style-src 'self' 'unsafe-inline' gkp: gkps:;
        img-src 'self' data: gkp: gkps: https:;
        font-src 'self' gkp: gkps: data:;
        connect-src 'self' gkp: gkps:;
      `);
    } else {
      // For external pages, use a stricter CSP
      webview.setAttribute('contentSecurityPolicy',
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: file: data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: chrome: file: data: blob:; " +
        "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: chrome: file: data: blob:; " +
        "style-src 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "style-src-elem 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "font-src 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "img-src 'self' gkp: gkps: file: data: blob:;"
      );
    }
    
    // Set the src attribute initially
    webview.setAttribute('src', url);

    // Add webview to the browser content
    browserContent.appendChild(webview);

    // Store tab info
    tabs.push({
      id: tabId,
      url: url,
      title: 'New Tab',
      favicon: null,
      element: tab,
      webview: webview
    });

    // Set up tab event listeners
    const closeButton = tab.querySelector('.tab-close');
    const tabContent = tab.querySelector('.tab-content');

    // Handle tab selection
    tabContent.addEventListener('click', () => {
      setActiveTab(tabId);
    });

    // Handle tab closing
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeTab(tabId);
    });

    // Set up webview events
    setupWebviewEvents(webview, tabId);

    // Set as active tab
    setActiveTab(tabId);

    return tabId;
  }    // Set up webview events
  function setupWebviewEvents(webview, tabId) {    // DOM ready
    webview.addEventListener('dom-ready', () => {
      console.log(`WebView DOM ready for tab ${tabId}`);
      
      // Wait for webview to be fully initialized
      const initWebview = async () => {
        try {
          // Wait for webview to be properly connected
          if (!webview.isConnected) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Initialize navigation
          updateNavigationButtons(tabId);
          
          // Get URL and check if it's an internal page
          const url = webview.getURL();
          if (url && (url.startsWith('gkp://') || url.startsWith('gkps://'))) {
            // Apply theme to internal page
            const currentTheme = localStorage.getItem('gekko-theme') || 'dark';
            await applyThemeToWebview(webview, currentTheme);
          }
        } catch (error) {
          console.error('Error in webview initialization:', error);
        }
      };
      
      initWebview();
    });
    
    // Page title updated
    webview.addEventListener('page-title-updated', (e) => {
      updateTabTitle(tabId, e.title);
    });
    
    // Page favicon updated
    webview.addEventListener('page-favicon-updated', (e) => {
      if (e.favicons && e.favicons.length > 0) {
        updateTabFavicon(tabId, e.favicons[0]);
      }
    });
    
    // Did start loading
    webview.addEventListener('did-start-loading', () => {
      updateTabStatus(tabId, 'loading');
      refreshButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      refreshButton.setAttribute('data-action', 'stop');
      statusText.textContent = 'Loading...';
    });
      // Did stop loading
    webview.addEventListener('did-stop-loading', () => {
      updateTabStatus(tabId, 'complete');
      refreshButton.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
      refreshButton.setAttribute('data-action', 'refresh');
      statusText.textContent = 'Ready';
      
      // Apply theme if it's an internal page (GKP protocol)
      try {
        const currentUrl = webview.getURL();
        if (currentUrl && (currentUrl.startsWith('gkp://') || currentUrl.startsWith('gkps://'))) {
          console.log('Internal page loaded, applying theme');
          const currentTheme = localStorage.getItem('gekko-theme') || 'dark';
          applyThemeToWebview(webview, currentTheme);
        }
      } catch (error) {
        console.error('Error applying theme after page load:', error);
      }
    });
    
    // Did navigate
    webview.addEventListener('did-navigate', (e) => {
      const finalUrl = e.url;
      updateAddressBar(finalUrl, tabId);
      updateNavigationButtons(tabId);
      
      try {
        addToHistory(finalUrl, getTabTitle(tabId));
      } catch (error) {
        console.error('Error adding to history:', error);
      }
      
      // Update protocol indicator
      updateProtocolIndicator(finalUrl);
    });
    
    // Did navigate in page (for # anchors)
    webview.addEventListener('did-navigate-in-page', (e) => {
      const finalUrl = e.url;
      updateAddressBar(finalUrl, tabId);
      updateNavigationButtons(tabId);
      
      // Don't add to history for hash changes
      if (!e.isMainFrame) return;
      
      try {
        addToHistory(finalUrl, getTabTitle(tabId));
      } catch (error) {
        console.error('Error adding to history:', error);
      }
    });
    
    // New window (for target=_blank links)
    webview.addEventListener('new-window', (e) => {
      e.preventDefault(); // Prevent default handling
      createTab(e.url); // Create new tab with the URL
    });
    
    // Failed load
    webview.addEventListener('did-fail-load', (e) => {
      // Ignore aborted loads
      if (e.errorCode === -3) return;
      
      updateTabStatus(tabId, 'error');
      statusText.textContent = `Failed to load: ${e.errorDescription}`;
    });
    
    // Console message for debugging
    webview.addEventListener('console-message', (e) => {
      console.log(`[Webview ${tabId}]:`, e.message);
    });
  }

  // Generate a unique tab ID
  function generateTabId() {
    return 'tab-' + Date.now();
  }
  // Set the active tab
  function setActiveTab(tabId) {
    // Update current tab ID
    currentTabId = tabId;
    
    // Update tab UI
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // Show active webview, hide others
    document.querySelectorAll('.webview').forEach(webview => {
      webview.classList.add('hidden');
    });
    
    const activeWebview = document.querySelector(`#webview-${tabId}`);
    if (activeWebview) {
      activeWebview.classList.remove('hidden');
      
      // Get the current URL from the webview
      const currentUrl = activeWebview.getAttribute('src');
        // Update address bar
      updateAddressBar(currentUrl, tabId);
      
      // Only update navigation buttons if webview is ready
      if (activeWebview.isConnected && typeof activeWebview.canGoBack === 'function') {
        updateNavigationButtons(tabId);
      }
      
      // Ensure the webview has loaded the URL
      if (currentUrl && (!activeWebview.getURL || !activeWebview.getURL())) {
        console.log(`Ensuring URL is loaded: ${currentUrl}`);
        safeLoadURL(activeWebview, currentUrl);
      }
    }
  }

  // Close a tab
  function closeTab(tabId) {
    // Find the tab
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    
    if (tabIndex !== -1) {
      // Get tab and webview elements
      const tab = tabs[tabIndex];
      
      // Remove elements
      tab.element.remove();
      tab.webview.remove();
      
      // Remove from tabs array
      tabs.splice(tabIndex, 1);
      
      // If this was the active tab, activate another tab
      if (currentTabId === tabId) {
        if (tabs.length > 0) {
          setActiveTab(tabs[tabs.length - 1].id);
        } else {
          // No more tabs, create a new one
          createTab();
        }
      }
    }
  }

  // Update tab title
  function updateTabTitle(tabId, title) {
    const tab = tabs.find(tab => tab.id === tabId);
    
    if (tab) {
      tab.title = title;
      const titleElement = tab.element.querySelector('.tab-title');
      if (titleElement) {
        titleElement.textContent = title;
      }
    }
  }

  // Get tab title
  function getTabTitle(tabId) {
    const tab = tabs.find(tab => tab.id === tabId);
    return tab ? tab.title : 'New Tab';
  }

  // Update tab favicon
  function updateTabFavicon(tabId, faviconUrl) {
    const tab = tabs.find(tab => tab.id === tabId);
    
    if (tab) {
      tab.favicon = faviconUrl;
      const iconElement = tab.element.querySelector('.tab-icon');
      
      if (iconElement) {
        iconElement.innerHTML = `<img src="${faviconUrl}" alt="" width="16" height="16">`;
      }
    }
  }

  // Update tab loading status
  function updateTabStatus(tabId, status) {
    const tab = tabs.find(tab => tab.id === tabId);
    
    if (tab) {
      if (status === 'loading') {
        tab.element.classList.add('loading');
        statusText.textContent = 'Loading...';
      } else {
        tab.element.classList.remove('loading');
        statusText.textContent = 'Complete';
        
        // Clear status text after a delay
        setTimeout(() => {
          if (statusText.textContent === 'Complete') {
            statusText.textContent = '';
          }
        }, 2000);
      }
    }
  }

  // Update the address bar with the current URL
  function updateAddressBar(url, tabId) {
    if (currentTabId === tabId) {
      addressBar.value = url;
      updateProtocolIndicator(url);
    }
    
    // Update tab URL
    const tab = tabs.find(tab => tab.id === tabId);
    if (tab) {
      tab.url = url;
    }
  }

  // Update the protocol indicator in the address bar
  function updateProtocolIndicator(url) {
    try {
      if (!url) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
        statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">New Tab</span>';
        return;
      }

      // Clear previous classes
      addressProtocol.className = 'address-protocol';
      
      // Determine protocol
      if (url.startsWith('https://')) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-lock"></i>';
        addressProtocol.classList.add('protocol-secure');
        statusSecurity.innerHTML = '<div class="security-icon secure"><i class="fa-solid fa-lock"></i></div><span id="security-text">Secure</span>';
      } else if (url.startsWith('http://')) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-lock-open"></i>';
        addressProtocol.classList.add('protocol-insecure');
        statusSecurity.innerHTML = '<div class="security-icon insecure"><i class="fa-solid fa-lock-open"></i></div><span id="security-text">Not Secure</span>';
      } else if (url.startsWith('gkps://')) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-shield"></i>';
        addressProtocol.classList.add('protocol-secure');
        statusSecurity.innerHTML = '<div class="security-icon secure"><i class="fa-solid fa-shield"></i></div><span id="security-text">GKP Secure</span>';
      } else if (url.startsWith('gkp://')) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
        statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">GKP</span>';
      } else if (url.startsWith('file://')) {
        addressProtocol.innerHTML = '<i class="fa-solid fa-file"></i>';
        statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-file"></i></div><span id="security-text">Local File</span>';
      } else {
        addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
        statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">Unknown</span>';
      }
    } catch (error) {
      console.error('Error updating protocol indicator:', error);
      addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
      statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">Ready</span>';
    }
  }

  // Update navigation buttons state (back/forward)
  function updateNavigationButtons(tabId) {
    const webview = document.querySelector(`#webview-${tabId}`);
    
    if (!webview) {
      console.error('No webview found for tab:', tabId);
      backButton.classList.add('disabled');
      forwardButton.classList.add('disabled');
      return;
    }
    
    try {
      // Check if DOM is ready and methods are available
      if (!webview.isConnected || typeof webview.canGoBack !== 'function') {
        console.log('WebView not fully initialized yet, disabling navigation buttons');
        backButton.classList.add('disabled');
        forwardButton.classList.add('disabled');
        return;
      }
      
      // Back button
      if (webview.canGoBack()) {
        backButton.classList.remove('disabled');
      } else {
        backButton.classList.add('disabled');
      }
      
      // Forward button
      if (webview.canGoForward()) {
        forwardButton.classList.remove('disabled');
      } else {
        forwardButton.classList.add('disabled');
      }
    } catch (error) {
      console.warn('Navigation state not yet available:', error);
      // Disable both buttons as fallback
      backButton.classList.add('disabled');
      forwardButton.classList.add('disabled');
    }
  }  // Navigate to a URL in the current tab
  function navigateTo(url, tabId) {
    // If no tabId is provided, use the current tab
    const targetTabId = tabId || currentTabId;
    
    // Process URL
    url = processUrl(url);
    console.log('Navigating to processed URL:', url);
    
    // Get the webview
    const webview = document.querySelector(`#webview-${targetTabId}`);
    
    if (webview) {
      // Update UI first to show immediate feedback
      updateAddressBar(url, targetTabId);
      updateTabStatus(targetTabId, 'loading');
      
      // Use safe loading method
      if (!safeLoadURL(webview, url)) {
        statusText.textContent = 'Navigation failed';
      }
    } else {
      console.error('No webview found for tab:', targetTabId);
    }
  }

  // Process URL (add protocol if missing, handle search, etc.)
  function processUrl(url) {
    url = url.trim();
    
    // Handle special URLs
    if (url.startsWith('about:') || url.startsWith('chrome:')) {
      return url;
    }
    
    // Check if it's a valid URL
    if (url.startsWith('http://') || url.startsWith('https://') || 
        url.startsWith('gkp://') || url.startsWith('gkps://') || 
        url.startsWith('file://')) {
      return url;
    }
    
    // Check if it's an IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
    if (ipRegex.test(url)) {
      return 'http://' + url;
    }
    
    // Check if it looks like a domain (contains a dot and no spaces)
    if (url.includes('.') && !url.includes(' ') && !/\s/.test(url)) {
      return 'https://' + url;
    }
    
    // Get search engine from settings
    const settings = window.api.getSettings();
    const searchEngine = settings.searchEngine || 'https://www.google.com/search?q=';
    
    // Treat as a search query
    return searchEngine + encodeURIComponent(url);
  }  // Process URL and navigate
  function handleNavigation(url) {
    console.log('handleNavigation called with:', url);
    
    // Get the current tab's webview
    const tab = tabs.find(tab => tab.id === currentTabId);
    if (!tab || !tab.webview) {
      console.error('No active tab found');
      return;
    }
    
    try {
      // Process the URL (make sure it's properly formatted)
      const processedUrl = processUrl(url);
      console.log('Processed URL:', processedUrl);
      
      // Update UI first to show immediate feedback
      updateAddressBar(processedUrl, currentTabId);
      updateTabStatus(currentTabId, 'loading');
      
      // Use safe loading method
      if (!safeLoadURL(tab.webview, processedUrl)) {
        statusText.textContent = 'Navigation failed';
      }
    } catch (error) {
      console.error('Navigation error:', error);
      statusText.textContent = 'Navigation failed';
    }
  }  // Update webview methods to use consistent loadURL and error handling
  function safeLoadURL(webview, url) {
    console.log(`Attempting to load URL: ${url}`);
    
    if (!webview) {
      console.error('No webview provided');
      return false;
    }

    try {
      // Ensure the URL is processed
      url = processUrl(url);
      
      // Try direct navigation first if the webview is connected and loadURL is available
      if (webview.isConnected && typeof webview.loadURL === 'function') {
        // Use loadURL if the webview is ready
        webview.loadURL(url).catch(error => {
          console.error(`loadURL failed, falling back to src attribute: ${error.message}`);
          // Fall back to src attribute
          try {
            webview.setAttribute('src', url);
          } catch (attrError) {
            console.error(`Failed to set src attribute: ${attrError.message}`);
          }
        });
      } else {
        // Fall back to src attribute if webview is not fully initialized
        console.log('Webview not ready for loadURL, using src attribute');
        webview.setAttribute('src', url);
      }
      return true;
    } catch (error) {
      console.error(`Error in safeLoadURL: ${error.message}`);
      // Final fallback: try a different approach to set the URL
      try {
        // Try one more time with src attribute
        webview.setAttribute('src', url);
        console.log('Used setAttribute fallback for navigation');
        return true;
      } catch (finalError) {
        console.error(`Complete failure loading URL: ${finalError.message}`);
        
        // Extreme fallback: try to reload the webview with the new URL
        try {
          setTimeout(() => {
            webview.setAttribute('src', url);
          }, 100);
          return true;
        } catch (e) {
          return false;
        }
      }
    }
  }

  // Go back in history
  function goBack() {
    if (currentTabId) {
      const webview = document.querySelector(`#webview-${currentTabId}`);
      if (webview && webview.canGoBack()) {
        webview.goBack();
        updateNavigationButtons(currentTabId);
      }
    }
  }

  // Go forward in history
  function goForward() {
    if (currentTabId) {
      const webview = document.querySelector(`#webview-${currentTabId}`);
      if (webview && webview.canGoForward()) {
        webview.goForward();
        updateNavigationButtons(currentTabId);
      }
    }
  }

  // Refresh the current page
  function refresh() {
    if (currentTabId) {
      const webview = document.querySelector(`#webview-${currentTabId}`);
      if (webview) {
        const action = refreshButton.getAttribute('data-action');
        if (action === 'stop') {
          webview.stop();
          refreshButton.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
          refreshButton.setAttribute('data-action', 'refresh');
        } else {
          webview.reload();
          refreshButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
          refreshButton.setAttribute('data-action', 'stop');
        }
      }
    }
  }

  // Go to the home page
  function goHome() {
    const settings = window.api.getSettings();
    const homePage = settings.homePage || 'gkp://home.gekko/';
    navigateTo(homePage);
  }

  // Show bookmarks page
  function showBookmarks() {
    navigateTo('gkp://bookmarks.gekko/');
  }

  // Show history page
  function showHistory() {
    navigateTo('gkp://history.gekko/');
  }

  // Show settings page
  function showSettings() {
    navigateTo('gkp://settings.gekko/');
  }

  // Clear the address bar
  function clearAddressBar() {
    addressBar.value = '';
    addressBar.focus();
  }
  // Apply theme to a specific webview
  function applyThemeToWebview(webview, themeId) {
    if (!webview || !webview.isConnected) {
      console.error('Cannot apply theme to invalid webview');
      return false;
    }
    
    try {
      const theme = getThemeObject(themeId);
      if (!theme) {
        console.error('Invalid theme:', themeId);
        return false;
      }
      
      // Generate CSS variables for the theme
      const cssVars = Object.entries(theme.colors)
        .map(([key, value]) => `--${key}: ${value};`)
        .join(' ');
      
      // Apply theme to webview using the safeDOM API
      webview.executeJavaScript(`
        (function() {
          try {
            if (window.safeDOM) {
              // Use safe DOM API
              window.safeDOM.setThemeAttribute('${themeId}');
              window.safeDOM.addStyleSheet(':root { ${cssVars} }');
            } else {
              // Fallback for older pages
              document.documentElement.setAttribute('data-theme', '${themeId}');
              const style = document.createElement('style');
              style.textContent = ':root { ${cssVars} }';
              document.head.appendChild(style);
              
              // Update theme marker
              let themeMarker = document.getElementById('gkp-theme-applied');
              if (!themeMarker) {
                themeMarker = document.createElement('div');
                themeMarker.id = 'gkp-theme-applied';
                themeMarker.style.display = 'none';
                document.body.appendChild(themeMarker);
              }
              themeMarker.setAttribute('data-theme', '${themeId}');
            }

            // Apply to any .shortcut-icon or .card-icon elements for consistent accent colors
            const iconColorMap = {
              'dark': '#8ab4f8',
              'light': '#1a73e8',
              'purple': '#b388ff',
              'blue': '#64b5f6',
              'red': '#ff8a80'
            };
              const accentColor = iconColorMap['${themeId}'] || theme.colors.accent || iconColorMap.dark;
            document.querySelectorAll('.shortcut-icon i, .card-icon i, .setting-icon i').forEach(icon => {
              icon.style.color = accentColor;
            });
            
            console.log('Theme applied:', '${themeId}');
            return true;
          } catch (e) {
            console.error('Error applying theme in webview:', e);
            return false;
          }
        })();
      `).catch(error => {
        console.error('Failed to execute theme script in webview:', error);
        return false;
      });
      
      return true;
    } catch (error) {
      console.error('Error applying theme to webview:', error);
      return false;
    }
  }    // Get a theme object by ID
  function getThemeObject(themeId) {
    try {
      // Get themes from window.api
      let themes = window.api.getThemes();
        // Handle case where themes is undefined
      if (!themes || typeof themes !== 'object') {
        console.warn('Invalid themes object, using fallback themes');
        themes = getFallbackThemes();
      }

      // If the requested theme exists and is valid, return it
      if (themes[themeId] && themes[themeId].colors && typeof themes[themeId].colors === 'object') {
        return themes[themeId];
      }

      // If dark theme is available and valid, use it as fallback
      if (themes.dark && themes.dark.colors && typeof themes.dark.colors === 'object') {
        console.warn(`Theme ${themeId} not found, falling back to dark theme`);
        return themes.dark;
      }

      // Ultimate fallback - basic dark theme
      console.warn('Using basic dark theme as fallback');
      return {
        name: 'Dark Theme',
        colors: {
          primary: '#202124',
          secondary: '#303134',
          accent: '#8ab4f8',
          textPrimary: '#e8eaed',
          textSecondary: '#9aa0a6',
          divider: '#3c4043',
          background: '#202124',
          card: '#303134',
          error: '#f28b82',
          warning: '#fdd663',
          success: '#81c995',
          secure: '#81c995',
          insecure: '#f28b82'
        }
      };
    } catch (error) {
      console.error('Error getting theme:', error);
      // Return basic dark theme on error
      return {
        name: 'Dark Theme',
        colors: {
          primary: '#202124',
          secondary: '#303134',
          accent: '#8ab4f8',
          textPrimary: '#e8eaed',
          textSecondary: '#9aa0a6',
          divider: '#3c4043',
          background: '#202124',
          card: '#303134',
          error: '#f28b82',
          warning: '#fdd663',
          success: '#81c995',
          secure: '#81c995',
          insecure: '#f28b82'
        }
      };
    }
  }

  // Get fallback themes when API themes are not available
  function getFallbackThemes() {
    return {
      dark: {
        name: 'Dark Theme',
        colors: {
          primary: '#202124',
          secondary: '#303134',
          accent: '#8ab4f8',
          textPrimary: '#e8eaed',
          textSecondary: '#9aa0a6',
          divider: '#3c4043',
          background: '#202124',
          card: '#303134',
          error: '#f28b82',
          warning: '#fdd663',
          success: '#81c995',
          secure: '#81c995',
          insecure: '#f28b82'
        }
      },
      light: {
        name: 'Light Theme',
        colors: {
          primary: '#f8f9fa',
          secondary: '#ffffff',
          accent: '#1a73e8',
          textPrimary: '#202124',
          textSecondary: '#5f6368',
          divider: '#dadce0',
          background: '#f8f9fa',
          card: '#ffffff',
          error: '#ea4335',
          warning: '#fbbc04',
          success: '#34a853',
          secure: '#34a853',
          insecure: '#ea4335'
        }
      },
      red: {
        name: 'Red Theme',
        colors: {
          primary: '#3c1014',
          secondary: '#541b1f',
          accent: '#ff8a80',
          textPrimary: '#e8eaed',
          textSecondary: '#9aa0a6',
          divider: '#661e24',
          background: '#3c1014',
          card: '#541b1f',
          error: '#f28b82',
          warning: '#fdd663',
          success: '#81c995',
          secure: '#81c995',
          insecure: '#f28b82'
        }
      }
    };
  }

  // Apply theme to entire browser UI
  function applyTheme(themeId) {
    console.group('Apply Theme');
    console.log('Theme application requested:', themeId);
    
    if (!themeId) {
      console.error('No theme ID provided');
      themeId = 'dark';
      console.log('Falling back to dark theme');
    }

    try {
      const theme = getThemeObject(themeId);
      if (!theme) {
        console.error('Could not get theme object for:', themeId);
        console.groupEnd();
        return;
      }
      console.log('Theme object retrieved:', { name: theme.name, colors: Object.keys(theme.colors) });

      // Save theme with retries for both storage mechanisms
      const saveTheme = () => {
        console.group('Save Theme State');
        try {
          localStorage.setItem('gekko-theme', themeId);
          console.log('Theme saved to localStorage');
        } catch (e) {
          console.warn('Could not save theme to localStorage:', e);
        }

        try {
          window.api.setSetting('theme', themeId);
          console.log('Theme saved to permanent storage');
        } catch (e) {
          console.warn('Could not save theme to settings:', e);
          console.log('Scheduling retry in 1000ms');
          setTimeout(() => {
            console.group('Theme Save Retry');
            try {
              window.api.setSetting('theme', themeId);
              console.log('Theme save retry successful');
            } catch (retryError) {
              console.error('Theme save retry failed:', retryError);
            }
            console.groupEnd();
          }, 1000);
        }
        console.groupEnd();
      };
      saveTheme();

      // Apply CSS variables to root
      console.log('Applying CSS variables');
      const root = document.documentElement;
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });

      // Set theme attribute
      console.log('Setting theme attribute on document');
      document.documentElement.setAttribute('data-theme', themeId);

      // Apply to all webviews with retry mechanism
      console.log('Applying theme to webviews');
      console.group('Webview Updates');
      tabs.forEach((tab, index) => {
        if (tab && tab.webview) {
          console.log(`Processing webview for tab ${index + 1}/${tabs.length}`);
          const applyThemeToWebviewWithRetry = (retries = 3) => {
            console.group(`Webview apply attempt (${4 - retries}/3)`);
            if (retries <= 0) {
              console.warn('No more retries left for this webview');
              console.groupEnd();
              return;
            }
            
            if (!tab.webview.isConnected) {
              console.log('Webview not connected, retrying in 100ms');
              setTimeout(() => applyThemeToWebviewWithRetry(retries - 1), 100);
              console.groupEnd();
              return;
            }

            try {
              const url = tab.webview.getURL();
              console.log('Webview URL:', url);
              if (url && (url.startsWith('gkp://') || url.startsWith('gkps://'))) {
                console.log('Applying theme to internal page');
                const success = applyThemeToWebview(tab.webview, themeId);
                if (!success) {
                  console.log('Theme application failed, retrying in 100ms');
                  setTimeout(() => applyThemeToWebviewWithRetry(retries - 1), 100);
                } else {
                  console.log('Theme applied successfully');
                }
              } else {
                console.log('Skipping external page');
              }
            } catch (error) {
              console.error('Error applying theme to webview:', error);
              setTimeout(() => applyThemeToWebviewWithRetry(retries - 1), 100);
            }
            console.groupEnd();
          };
          applyThemeToWebviewWithRetry();
        }
      });
      console.groupEnd();

      console.log('Theme application complete');
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error applying theme:', error);
      console.groupEnd();
      return false;
    }
  }

}); // End DOMContentLoaded event listener
