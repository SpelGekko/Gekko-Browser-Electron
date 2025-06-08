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

// Helper to create/update DOM-based theme marker
function createThemeMarker(themeId) {
  try {
    // Save in a meta tag for immediate DOM storage
    let themeMarker = document.getElementById('gekko-theme-marker');
    if (!themeMarker) {
      themeMarker = document.createElement('meta');
      themeMarker.id = 'gekko-theme-marker';
      document.head.appendChild(themeMarker);
    }
    themeMarker.setAttribute('content', themeId);
    themeMarker.setAttribute('name', 'theme');
    console.log('Theme saved to DOM element');
    
    // Also store in data attribute on HTML element
    document.documentElement.dataset.savedTheme = themeId;
    return true;
  } catch (domError) {
    console.warn('DOM storage error:', domError);
    return false;
  }
}

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

// Initialize global variables
let currentTabId = null;
let tabs = [];
// Initialize cached settings variable
let cachedSettings = null;
// Bookmarks and incognito variables
let bookmarks = [];
let isIncognito = false;

// Set up navigation event listener from main process
if (window.api && typeof window.api.onNavigate === 'function') {
  window.api.onNavigate((url) => {
    console.log('Received navigation event from main process:', url);
    if (url) {
      // If we have a current tab, navigate to the URL
      if (currentTabId) {
        navigateTo(url);
      } else {
        // Otherwise create a new tab
        createTab(url);
      }
    }
  });
}

// Helper function to get a theme object by its ID
function getThemeObject(themeId) {
  // Try to get theme from the API
  try {
    const allThemes = window.api.getThemes();
    if (allThemes && allThemes[themeId]) {
      return allThemes[themeId];
    }
  } catch (error) {
    console.error('Error getting theme from API:', error);
  }
  
  // Fallback to default themes
  const fallbackThemes = {
    dark: {
      name: 'Dark Theme',
      colors: {
        primary: '#202124',
        secondary: '#303134',
        accent: '#8ab4f8',
        textPrimary: '#e8eaed',
        textSecondary: '#9aa0a6'
      }
    },
    light: {
      name: 'Light Theme',
      colors: {
        primary: '#ffffff',
        secondary: '#f1f3f4',
        accent: '#1a73e8',
        textPrimary: '#202124',
        textSecondary: '#5f6368'
      }
    },
    red: {
      name: 'Red Theme',
      colors: {
        primary: '#7C0A02',
        secondary: '#B22222',
        accent: '#FF3131',
        textPrimary: '#ffffff',
        textSecondary: '#e0e0e0'
      }
    }
  };
  
  return fallbackThemes[themeId] || fallbackThemes.dark;
}

// Helper to safely load settings
function loadSettingsSafely() {
  try {
    // Use cached settings if available
    if (!cachedSettings) {
      cachedSettings = window.api.getSettings();
    }
    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return { theme: 'dark' };
  }
}

// Apply theme to current window and sync storage
function applyTheme(newTheme) {
  console.group('Apply Theme');
  console.log('Applying theme:', newTheme);
  
  // Skip if theme hasn't changed or is invalid
  if (!newTheme || typeof newTheme !== 'string') {
    console.warn('Invalid theme provided:', newTheme);
    console.groupEnd();
    return;
  }
  
  // Track last theme application time for debouncing
  const now = Date.now();
  const THEME_APPLY_DEBOUNCE = 300; // ms
  
  if (now - (window._lastThemeApplyTime || 0) < THEME_APPLY_DEBOUNCE) {
    console.log(`Theme change debounced (${now - (window._lastThemeApplyTime || 0)}ms < ${THEME_APPLY_DEBOUNCE}ms)`);
    console.groupEnd();
    return;
  }
  
  window._lastThemeApplyTime = now;
  
  // Skip if theme hasn't changed
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === newTheme) {
    console.log('Theme already applied, skipping');
    console.groupEnd();
    return;
  }
  
  try {
    // Get theme object
    const themeObj = window.api.getThemes()[newTheme];
    if (!themeObj) {
      console.error('Could not get theme object for:', newTheme);
      console.groupEnd();
      return;
    }
    
    console.log('Applying theme colors directly to UI');
    
    // Apply CSS variables directly to the root element
    const root = document.documentElement;
    Object.entries(themeObj.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Apply to document attributes
    root.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);

    // Sync to localStorage and permanent storage
    try {
      const storedTheme = localStorage.getItem('gekko-theme');
      if (storedTheme !== newTheme) {
        localStorage.setItem('gekko-theme', newTheme);
        window.api.setSetting('theme', newTheme);
      }
    } catch (storageError) {
      console.warn('Could not sync theme to storage:', storageError);
    }

    // Apply to all webviews with robust error handling
    const webviews = document.querySelectorAll('webview');
    if (webviews.length > 0) {
      console.log(`Applying theme to ${webviews.length} webviews`);
      webviews.forEach(webview => {
        if (webview && webview.isConnected) {
          // Apply to ALL webviews, not just internal pages
          const cssVariables = Object.entries(themeObj.colors)
            .map(([key, value]) => `--${key}: ${value};`)
            .join('\n');

          const themeScript = `
            (function() {
              // Remove any existing theme style element
              const existingStyle = document.getElementById('gekko-theme-style');
              if (existingStyle) existingStyle.remove();

              // Create new style element for theme
              const style = document.createElement('style');
              style.id = 'gekko-theme-style';
              style.textContent = \`:root { ${cssVariables} }\`;
              
              // Create a container for our styles if not exists
              let container = document.getElementById('gekko-theme-container');
              if (!container) {
                container = document.createElement('div');
                container.id = 'gekko-theme-container';
                container.style.position = 'fixed';
                container.style.top = '-9999px';
                container.style.left = '-9999px';
                document.documentElement.appendChild(container);
              }
              
              // Add the style element
              container.appendChild(style);
              
              // Set theme attributes
              document.documentElement.setAttribute('data-theme', '${newTheme}');
              document.body.setAttribute('data-theme', '${newTheme}');
            })();
          `;

          // Execute the theme injection script
          webview.executeJavaScript(themeScript).catch(error => {
            console.warn('Failed to inject theme via executeJavaScript:', error);
            // Fallback: try inserting CSS directly
            webview.insertCSS(`:root { ${cssVariables} }`).catch(console.warn);
          });

          // Mark theme as applied
          webview.setAttribute('data-last-theme', newTheme);
        }
      });
    }

    // Set up verification
    const verifyTheme = () => {
      const appliedTheme = document.documentElement.getAttribute('data-theme');
      const cssVars = getComputedStyle(document.documentElement);
      const themeColor = cssVars.getPropertyValue('--primary').trim();
      
      if (appliedTheme !== newTheme || !themeColor) {
        console.warn('Theme verification failed, reapplying...');
        setTimeout(() => applyTheme(newTheme), 100);
      }
    };
    setTimeout(verifyTheme, 500);

    console.log('Theme applied successfully');
  } catch (error) {
    console.error('Error applying theme:', error);
  }
  
  console.groupEnd();
}

// Listen for theme changes from internal pages to apply to webviews
function applyThemeToWebview(webview, newTheme) {
  if (!webview || !webview.isConnected) return;

  console.group('Apply Theme to Webview');
  console.log('Applying theme:', newTheme);

  try {
    const lastWebviewTheme = webview.getAttribute('data-last-theme');
    if (lastWebviewTheme === newTheme) {
      console.log('Theme already applied to webview, skipping');
      console.groupEnd();
      return;
    }

    // Combine all theme application methods for maximum compatibility
    const themeScript = `
      try {
        const applyThemeToPage = (theme) => {
          // 1. Try using API methods
          if (window.api?.applyTheme) {
            window.api.applyTheme(theme);
          }
          // 2. Try theme utils
          if (window.applyTheme) {
            window.applyTheme(theme);
          }
          // 3. Manual DOM update
          document.documentElement.setAttribute('data-theme', theme);
          document.body.setAttribute('data-theme', theme);
          
          // 4. Update storage
          try {
            localStorage.setItem('gekko-theme', theme);
          } catch(e) {
            console.warn('Could not save theme to storage:', e);
          }
          
          // 5. Broadcast change
          try {
            window.postMessage({ type: 'themeChange', theme: theme }, '*');
          } catch(e) {
            console.warn('Could not broadcast theme change:', e);
          }
          
          // 6. Verify application
          const verifyTheme = () => {
            const appliedTheme = document.documentElement.getAttribute('data-theme');
            if (appliedTheme !== theme) {
              console.warn('Theme verification failed, reapplying...');
              setTimeout(() => applyThemeToPage(theme), 100);
            }
          };
          setTimeout(verifyTheme, 100);
        };

        applyThemeToPage('${newTheme}');
      } catch (e) {
        console.error('Error in theme application:', e);
      }
    `;

    // Execute theme application script
    webview.executeJavaScript(themeScript).catch(error => {
      console.warn('executeJavaScript failed, trying alternate methods:', error);
      
      // Try IPC as fallback
      if (webview.send) {
        webview.send('theme-changed', newTheme);
      }
      
      // Direct attribute setting as last resort
      webview.executeJavaScript(`
        document.documentElement.setAttribute('data-theme', '${newTheme}');
        document.body.setAttribute('data-theme', '${newTheme}');
      `).catch(console.warn);
    });

    // Mark theme as applied
    webview.setAttribute('data-last-theme', newTheme);
    console.log('Theme applied successfully');
    
    // Set up verification
    setTimeout(() => {
      webview.executeJavaScript(`
        document.documentElement.getAttribute('data-theme');
      `).then(appliedTheme => {
        if (appliedTheme !== newTheme) {
          console.warn('Theme verification failed, reapplying...');
          applyThemeToWebview(webview, newTheme);
        }
      }).catch(console.warn);
    }, 500);

  } catch (error) {
    console.error('Error applying theme to webview:', error);
  }
  
  console.groupEnd();
}

// Toggle bookmark for the current page
function toggleBookmark() {
  if (!currentTabId) {
    console.error('No active tab to bookmark');
    return;
  }

  const activeWebview = document.querySelector(`#webview-${currentTabId}`);
  if (!activeWebview) {
    console.error('No active webview found');
    return;
  }
  
  // Get the current tab object
  const currentTab = tabs.find(tab => tab.id === currentTabId);
  if (!currentTab) {
    console.error('Current tab not found in tabs array');
    return;
  }
  
  // First try to get URL from the tab object as a fallback
  let url = currentTab.url;
  
  // Then try to get it from the webview if possible
  try {
    if (activeWebview.getURL && typeof activeWebview.getURL === 'function') {
      const webviewUrl = activeWebview.getURL();
      if (webviewUrl) {
        url = webviewUrl; // Use the webview URL if available
      }
    }
  } catch (error) {
    console.log('Using fallback URL from tab object due to error:', error);
  }
  
  if (!url) {
    // Last resort: try getting it from the src attribute
    url = activeWebview.getAttribute('src');
  }
  
  if (!url) {
    console.error('No URL to bookmark');
    return;
  }
  
  try {
    const isBookmarked = window.api.isBookmarked(url);
    console.log(`URL ${url} is ${isBookmarked ? 'already bookmarked' : 'not bookmarked'}`);
      if (isBookmarked) {
      // Remove bookmark
      window.api.removeBookmark(url);
      console.log('Bookmark removed');
    } else {
      // Add bookmark
      // Get title directly from the current tab object instead of using getTabTitle
      const tab = tabs.find(tab => tab.id === currentTabId);
      const title = tab ? tab.title || 'Untitled' : 'Untitled';
      let favicon = null;
      if (tab && tab.favicon) {
        favicon = tab.favicon;
      }
      console.log(`Adding bookmark: ${url}, ${title}`);
      window.api.addBookmark(url, title, favicon);    }
    
    // Update UI directly instead of calling updateBookmarkButton
    const bookmarkButton = document.getElementById('bookmark-page-button');
    if (bookmarkButton) {
      // Skip protocol pages and empty URLs
      if (!url || url.startsWith('gkp://') || url === 'about:blank') {
        console.log('Skipping bookmark button update for special URL:', url);
        bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
        bookmarkButton.classList.remove('bookmarked');
      } else {
        const isBookmarked = window.api.isBookmarked(url);
        bookmarkButton.innerHTML = isBookmarked ? 
          '<i class="fa-solid fa-star"></i>' : 
          '<i class="fa-regular fa-star"></i>';
        bookmarkButton.classList.toggle('bookmarked', isBookmarked);
      }
    } else {
      console.warn('Bookmark button not found in DOM');
    }
    
    // Reload bookmarks
    if (typeof loadBookmarks === 'function') {
      loadBookmarks();
    }
    
    // Check if renderBookmarksBar exists before calling
    if (typeof renderBookmarksBar === 'function') {
      renderBookmarksBar();
    }
    
    // Update bookmarks page if it's open
    const bookmarksWebview = Array.from(document.querySelectorAll('webview')).find(webview => 
      webview.getURL && webview.getURL().endsWith('bookmarks.gekko/bookmarks.html')
    );
    
    if (bookmarksWebview) {
      bookmarksWebview.reload();
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Reset global variables to initial state
  currentTabId = null;
  tabs = [];
  cachedSettings = null;
  bookmarks = [];
  isIncognito = false;
  
  // DOM Elements (declared once)
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
  const incognitoButton = document.getElementById('incognito-button');
  const settingsButton = document.getElementById('settings-button');
  const minimizeButton = document.getElementById('minimize-button');
  const maximizeButton = document.getElementById('maximize-button');
  const closeButton = document.getElementById('close-button');
  const statusText = document.getElementById('status-text');
  const statusSecurity = document.getElementById('status-security');
  const securityText = document.getElementById('security-text');
  const bookmarksBar = document.getElementById('bookmarks-bar');

  // Verify all required elements are present
  if (!verifyRequiredElements()) {
    console.error('Some required UI elements are missing');
    // Consider gracefully degrading or showing an error to the user
    return;
  }
  
  // Initialize bookmarks
  loadBookmarks();
  renderBookmarksBar();
  
  // Initialize incognito mode
  isIncognito = window.api.getIncognitoMode();
  if (isIncognito) {
    incognitoButton.classList.add('incognito-active');
  }

  // Try to get theme from localStorage first, fallback to settings
  let settings = loadSettingsSafely();
  let theme = localStorage.getItem('gekko-theme') || settings.theme || 'dark';

  // Apply theme with full CSS variables
  console.log('Initial theme application:', theme);
  // Get the theme object (assuming getThemeObject and getFallbackThemes are available via window.api or globally)
  const themeObj = window.api.getThemes()[theme] || (typeof getFallbackThemes === 'function' ? getFallbackThemes()[theme] : {}) || (typeof getFallbackThemes === 'function' ? getFallbackThemes().dark : {});
  if (themeObj && themeObj.colors) {
    // Apply CSS variables directly to the root element
    const root = document.documentElement;
    Object.entries(themeObj.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    // Set theme attribute
    root.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  } else {
    console.warn('Could not get theme object for initial application:', theme);
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Create initial tab with home page
  createTab(settings?.homePage || 'gkp://home.gekko/');
  
  // Load bookmarks bar
  function loadBookmarksBar() {
    // Load bookmarks from storage
    loadBookmarks();
    // Render the bookmarks bar
    renderBookmarksBar();
  }
  
  // Make handleNavigation function available to window object for internal pages
  window.handleNavigation = handleNavigation;

  // Verify all required DOM elements are present (defined here, not duplicated)
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
      { el: incognitoButton, name: 'incognito-button' },
      { el: settingsButton, name: 'settings-button' },
      { el: minimizeButton, name: 'minimize-button' },
      { el: maximizeButton, name: 'maximize-button' },
      { el: closeButton, name: 'close-button' },
      { el: statusText, name: 'status-text' },
      { el: statusSecurity, name: 'status-security' },
      { el: securityText, name: 'security-text' },
      { el: bookmarksBar, name: 'bookmarks-bar' }
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

  // Set up event listeners (defined here, not duplicated)
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
      // Bookmark page button in address bar
    const bookmarkPageButton = document.getElementById('bookmark-page-button');
    if (bookmarkPageButton) {
      console.log('Setting up bookmark page button');
      bookmarkPageButton.addEventListener('click', function() {
        console.log('Bookmark button clicked');
        toggleBookmark();
      });
    } else {
      console.error('Bookmark page button not found in DOM');
    }    // Browser actions
    bookmarksButton.addEventListener('click', () => showBookmarks());
    historyButton.addEventListener('click', () => showHistory());
    incognitoButton.addEventListener('click', toggleIncognitoMode);
      // Direct navigation to settings page
    settingsButton.addEventListener('click', () => showSettings());
    
    // Listen for messages from internal pages
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
            // Check if WebView is ready before navigating
            if (tab.webview.isConnected) {
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
            } else {
              console.warn('WebView is not ready for navigation');
            }
          }
        }
      } else if (event.data && event.data.type === 'themeChange') {
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
    
    // Skip history recording if in incognito mode
    if (isIncognito) {
      return;
    }
    
    const historyEntry = {
      url,
      title: title || url,
      timestamp: Date.now()
    };
    
    window.api.addToHistory(historyEntry);
  }

  // Create a new tab
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
    webview.setAttribute('data-tab-id', tabId);
    webview.setAttribute('nodeintegration', 'false');
    webview.setAttribute('contextIsolation', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=true, sandbox=true, javascript=true, webviewTag=false, nodeIntegration=false');
    webview.setAttribute('preload', window.api.getPaths().webviewPreload);
    webview.setAttribute('httpreferrer', 'strict-origin-when-cross-origin');
    webview.setAttribute('allowpopups', 'false');
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
  }

  // Set up webview events
  function setupWebviewEvents(webview, tabId) {
    // DOM ready
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
          
          // Always apply current theme to any page that loads
          const currentTheme = localStorage.getItem('gekko-theme') || 
                             document.documentElement.getAttribute('data-theme') || 
                             'dark';
          
          // Get theme colors
          const themeObj = window.api.getThemes()[currentTheme];
          if (themeObj && themeObj.colors) {
            const cssVariables = Object.entries(themeObj.colors)
              .map(([key, value]) => `--${key}: ${value};`)
              .join('\n');

            webview.executeJavaScript(`
              (function() {
                const existingStyle = document.getElementById('gekko-theme-style');
                if (existingStyle) existingStyle.remove();

                const style = document.createElement('style');
                style.id = 'gekko-theme-style';
                style.textContent = \`:root { ${cssVariables} }\`;
                
                let container = document.getElementById('gekko-theme-container');
                if (!container) {
                  container = document.createElement('div');
                  container.id = 'gekko-theme-container';
                  container.style.position = 'fixed';
                  container.style.top = '-9999px';
                  container.style.left = '-9999px';
                  document.documentElement.appendChild(container);
                }
                
                container.appendChild(style);
                document.documentElement.setAttribute('data-theme', '${currentTheme}');
                document.body.setAttribute('data-theme', '${currentTheme}');
              })();
            `).catch(error => {
              console.warn('Failed to inject theme via executeJavaScript:', error);
              webview.insertCSS(`:root { ${cssVariables} }`).catch(console.warn);
            });
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
      
      const isIncognito = window.api.getIncognitoMode();
      statusText.textContent = isIncognito ? 'Ready (Incognito)' : 'Ready';
      
      // Reapply theme if needed for internal pages
      try {
        const url = webview.getURL();
        if (!url || url === 'about:blank' || url.startsWith('gkp://') || url.startsWith('gkps://')) {
          const currentTheme = localStorage.getItem('gekko-theme') || document.documentElement.getAttribute('data-theme') || 'dark';
          applyThemeToWebview(webview, currentTheme);
        }
      } catch (error) {
        console.error('Error reapplying theme after load:', error);
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
      
      // Update bookmark button
      try {
        const actualUrl = activeWebview.getURL ? activeWebview.getURL() : currentUrl;
        if (actualUrl) {
          updateBookmarkButton(actualUrl);
        }
      } catch (error) {
        console.error('Error updating bookmark button in setActiveTab:', error);
      }
      
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
        statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">New Tab</span>'; // Fixed: Unterminated string literal
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
  }

  // Navigate to a URL in the current tab
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
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('gkp://') || url.startsWith('gkps://') || url.startsWith('file://')) {
      return url;
    }
    // Check if it's an IP address
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/;
    if (ipRegex.test(url)) {
      return 'http://' + url;
    }    // Check if it looks like a domain (contains a dot and no spaces)
    if (url.includes('.') && !url.includes(' ') && !/\s/.test(url)) {
      return 'https://' + url;
    }
    // Get search engine from settings
    const settings = window.api.getSettings();
    let searchEngine = settings.searchEngine || 'google';
    let searchUrl;
    
    // Convert search engine ID to actual URL
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
        // Handle legacy format where the full URL was stored
        searchUrl = searchEngine.includes('://') ? searchEngine : 'https://www.google.com/search?q=';
    }
    
    // Treat as a search query
    return searchUrl + encodeURIComponent(url);
  }

  // Process URL and navigate
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
  }

  // Update webview methods to use consistent loadURL and error handling
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

  // Toggle incognito mode
  function toggleIncognitoMode() {
    isIncognito = window.api.toggleIncognitoMode();
    if (isIncognito) {
      incognitoButton.classList.add('incognito-active');
      statusText.textContent = 'Incognito Mode: ON';
      setTimeout(() => {
        if (isIncognito) {
          statusText.textContent = 'Ready (Incognito)';
        }
      }, 2000);
    } else {
      incognitoButton.classList.remove('incognito-active');
      statusText.textContent = 'Incognito Mode: OFF';
      setTimeout(() => {
        if (!isIncognito) {
          statusText.textContent = 'Ready';
        }
      }, 2000);
    }
  }

  // Load bookmarks from storage
  function loadBookmarks() {
    try {
      bookmarks = window.api.getBookmarks();
      return bookmarks;
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      return [];
    }
  }

  // Render bookmarks in the bookmarks bar
  function renderBookmarksBar() {
    const bookmarksBar = document.getElementById('bookmarks-bar');
    if (!bookmarksBar) return;
    
    // Clear current bookmarks
    bookmarksBar.innerHTML = '';
    
    // Add bookmark button
    const addBookmarkButton = document.createElement('div');
    addBookmarkButton.className = 'add-bookmark-button';
    addBookmarkButton.innerHTML = '<i class="fa-solid fa-plus"></i>';
    addBookmarkButton.title = 'Add current page to bookmarks';
    addBookmarkButton.addEventListener('click', () => {
      const activeWebview = document.querySelector(`#webview-${currentTabId}`);
      if (activeWebview) {
        const url = activeWebview.getURL();
        const title = getTabTitle(currentTabId);
        let favicon = null;
        const tab = tabs.find(tab => tab.id === currentTabId);
        if (tab && tab.favicon) {
          favicon = tab.favicon;
        }
        window.api.addBookmark(url, title, favicon);
        loadBookmarks();
        renderBookmarksBar();
        updateBookmarkButton(url);
      }
    });
    bookmarksBar.appendChild(addBookmarkButton);
    
    // Show top 5 bookmarks
    const topBookmarks = bookmarks.slice(0, 5);
    
    topBookmarks.forEach(bookmark => {
      const bookmarkItem = document.createElement('div');
      bookmarkItem.className = 'bookmark-item';
      bookmarkItem.title = bookmark.title;
      bookmarkItem.setAttribute('data-url', bookmark.url);
      
      // Favicon or fallback icon
      if (bookmark.favicon) {
        bookmarkItem.innerHTML = `<img src="${bookmark.favicon}" alt="" onerror="this.onerror=null;this.src='';this.innerHTML='<i class=\\'fa-solid fa-globe\\'></i>';">
                                <span>${bookmark.title}</span>`;
      } else {
        bookmarkItem.innerHTML = `<i class="fa-solid fa-globe"></i>
                                <span>${bookmark.title}</span>`;
      }
      
      // Add click event to navigate
      bookmarkItem.addEventListener('click', () => {
        navigateTo(bookmark.url);
      });
      
      bookmarksBar.appendChild(bookmarkItem);
    });
  }

  // Update the bookmark button state based on whether the current URL is bookmarked
  function updateBookmarkButton(url) {
    const bookmarkButton = document.getElementById('bookmark-page-button');
    if (!bookmarkButton) {
      console.warn('Bookmark button not found in DOM');
      return;
    }
    
    // Skip protocol pages and empty URLs
    if (!url || url.startsWith('gkp://') || url === 'about:blank') {
      console.log('Skipping bookmark button update for special URL:', url);
      bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      bookmarkButton.classList.remove('bookmarked');
      bookmarkButton.setAttribute('title', 'Cannot bookmark this page');
      bookmarkButton.classList.add('disabled');
      return;
    } else {
      // Make sure the button is enabled for normal URLs
      bookmarkButton.classList.remove('disabled');
    }
    
    try {
      console.log('Checking bookmark status for:', url);
      const isBookmarked = window.api.isBookmarked(url);
      
      if (isBookmarked) {
        console.log('URL is bookmarked, updating button state');
        bookmarkButton.innerHTML = '<i class="fa-solid fa-star"></i>';
        bookmarkButton.classList.add('bookmarked');
        bookmarkButton.setAttribute('title', 'Remove from bookmarks');
      } else {
        console.log('URL is not bookmarked, updating button state');
        bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
        bookmarkButton.classList.remove('bookmarked');
        bookmarkButton.setAttribute('title', 'Add to bookmarks');
      }
    } catch (error) {
      console.error('Error updating bookmark button:', error);
      bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      bookmarkButton.classList.remove('bookmarked');
      bookmarkButton.setAttribute('title', 'Bookmark functionality unavailable');
    }
  }  // Listen for settings updates
  const handleSettingsUpdate = (settings) => {
    console.group('Settings Update');
    console.log('Settings update received:', settings);
    
    // Skip update if settings haven't changed
    if (cachedSettings && JSON.stringify(cachedSettings) === JSON.stringify(settings)) {
      console.log('Settings unchanged, skipping update');
      console.groupEnd();
      return;
    }
    
    // Debounce settings updates
    const now = Date.now();
    if (window._lastSettingsUpdateTime && (now - window._lastSettingsUpdateTime < 300)) {
      console.log('Settings update debounced, too frequent');
      console.groupEnd();
      return;
    }
    
    // Update cached settings and time
    window._lastSettingsUpdateTime = now;
    cachedSettings = settings;
    
    // Apply theme if changed
    if (settings.theme) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      if (currentTheme !== settings.theme) {
        console.log('Theme changed from settings update, applying:', settings.theme);
        applyTheme(settings.theme);
      } else {
        console.log('Theme unchanged, skipping application');
      }
    }
    
    console.groupEnd();
  };

  // Register the settings update handler
  if (window.api && typeof window.api.onSettingsUpdated === 'function') {
    window.api.onSettingsUpdated(handleSettingsUpdate);
  }
});