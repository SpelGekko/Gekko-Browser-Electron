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
  // Apply theme from settings or default to dark
  const settings = window.api.getSettings();
  applyTheme(settings.theme || 'dark');
  
  // Set up event listeners
  setupEventListeners();
  
  // Create initial tab
  createTab(settings.homePage);

  // Set up event listeners
  function setupEventListeners() {
    // Window control buttons
    minimizeButton.addEventListener('click', () => window.api.minimize());
    maximizeButton.addEventListener('click', () => window.api.maximize());
    closeButton.addEventListener('click', () => window.api.close());
    
    // Tab management
    newTabButton.addEventListener('click', () => createTab());
    
    // Navigation controls
    backButton.addEventListener('click', goBack);
    forwardButton.addEventListener('click', goForward);
    refreshButton.addEventListener('click', refresh);
    homeButton.addEventListener('click', goHome);
    
    // Address bar
    addressBar.addEventListener('keydown', handleAddressBarKeyDown);
    clearButton.addEventListener('click', clearAddressBar);
    
    // Browser actions
    bookmarksButton.addEventListener('click', showBookmarks);
    historyButton.addEventListener('click', showHistory);
    settingsButton.addEventListener('click', showSettings);
  }
  // Create a new tab
  function createTab(url) {
    const settings = window.api.getSettings();
    const tabId = generateTabId();
    const homePage = settings.homePage;
    
    // Default URL if none provided
    url = url || homePage;
    
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
    
    // Create webview
    const webview = document.createElement('webview');
    webview.setAttribute('id', `webview-${tabId}`);
    webview.className = 'webview hidden';
    webview.setAttribute('data-tab-id', tabId);
    webview.setAttribute('src', url);
    webview.setAttribute('nodeintegration', 'false');
    webview.setAttribute('webpreferences', 'contextIsolation=true');
    
    // Add webview to the browser content
    browserContent.appendChild(webview);
    
    // Set up webview event listeners
    setupWebviewEvents(webview, tabId);
    
    // Store tab info
    tabs.push({
      id: tabId,
      url: url,
      title: 'New Tab',
      favicon: null,
      element: tab,
      webview: webview
    });
    
    // Set as active tab
    setActiveTab(tabId);
    
    // Set up tab event listeners
    tab.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close')) {
        setActiveTab(tabId);
      }
    });
    
    // Add event listener specifically to the close button
    const closeButton = tab.querySelector('.tab-close');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent tab selection when closing
        closeTab(tabId);
      });
    }
    
    // Navigate to the URL
    navigateTo(url, tabId);
    
    return tabId;
  }

  // Set up webview events
  function setupWebviewEvents(webview, tabId) {
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
    });
    
    // Did stop loading
    webview.addEventListener('did-stop-loading', () => {
      updateTabStatus(tabId, 'complete');
      refreshButton.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i>';
      refreshButton.setAttribute('data-action', 'refresh');
    });
    
    // Did navigate
    webview.addEventListener('did-navigate', (e) => {
      updateAddressBar(e.url, tabId);
      updateNavigationButtons(tabId);
      addToHistory(e.url, getTabTitle(tabId));
    });
    
    // Did navigate in page
    webview.addEventListener('did-navigate-in-page', (e) => {
      updateAddressBar(e.url, tabId);
      updateNavigationButtons(tabId);
    });
    
    // New window (for target=_blank links)
    webview.addEventListener('new-window', (e) => {
      createTab(e.url);
    });
    
    // Handle GKP and GKPS protocols
    webview.addEventListener('will-navigate', (e) => {
      const url = e.url;
      if (url.startsWith('gkp://') || url.startsWith('gkps://')) {
        // Allow the navigation to continue, protocol handlers will manage it
        updateProtocolIndicator(url);
      } else {
        // Regular HTTP/HTTPS navigation
        updateProtocolIndicator(url);
      }
    });
    
    // Console message for debugging
    webview.addEventListener('console-message', (e) => {
      console.log('Webview console:', e.message);
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
      
      // Update address bar and navigation buttons
      updateAddressBar(activeWebview.getAttribute('src'), tabId);
      updateNavigationButtons(tabId);
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
    }
  }

  // Update navigation buttons state (back/forward)
  function updateNavigationButtons(tabId) {
    const webview = document.querySelector(`#webview-${tabId}`);
    
    if (webview) {
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
    }
  }

  // Navigate to a URL in the current tab
  function navigateTo(url, tabId) {
    // If no tabId is provided, use the current tab
    const targetTabId = tabId || currentTabId;
    
    // Process URL
    url = processUrl(url);
    
    // Get the webview
    const webview = document.querySelector(`#webview-${targetTabId}`);
    
    if (webview) {
      // Load the URL
      webview.setAttribute('src', url);
      updateAddressBar(url, targetTabId);
    }
  }

  // Process URL (add protocol if missing, handle search, etc.)
  function processUrl(url) {
    url = url.trim();
    
    // Check if it's a valid URL
    if (url.startsWith('http://') || url.startsWith('https://') || 
        url.startsWith('gkp://') || url.startsWith('gkps://') || 
        url.startsWith('file://')) {
      return url;
    }
    
    // Check if it looks like a domain (contains a dot)
    if (url.includes('.') && !url.includes(' ')) {
      return 'https://' + url;
    }
    
    // Get search engine from settings
    const settings = window.api.getSettings();
    const searchEngine = settings.searchEngine;
    
    // Treat as a search query
    return searchEngine + encodeURIComponent(url);
  }

  // Handle address bar keydown events
  function handleAddressBarKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const url = addressBar.value;
      navigateTo(url);
    }
  }

  // Clear the address bar
  function clearAddressBar() {
    addressBar.value = '';
    addressBar.focus();
  }

  // Go back in history
  function goBack() {
    if (currentTabId) {
      const webview = document.querySelector(`#webview-${currentTabId}`);
      if (webview && webview.canGoBack()) {
        webview.goBack();
      }
    }
  }

  // Go forward in history
  function goForward() {
    if (currentTabId) {
      const webview = document.querySelector(`#webview-${currentTabId}`);
      if (webview && webview.canGoForward()) {
        webview.goForward();
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
        } else {
          webview.reload();
        }
      }
    }
  }

  // Go to the home page
  function goHome() {
    const settings = window.api.getSettings();
    navigateTo(settings.homePage);
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

  // Add entry to history
  function addToHistory(url, title) {
    // Skip internal pages
    if (url.startsWith('gkp://') || url.startsWith('about:') || url.startsWith('chrome:')) {
      return;
    }
    
    // Add to history
    window.api.addToHistory({
      url: url,
      title: title || url
    });
  }
});
