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
// Update notification variables
let hasUpdateAvailable = false;
let updateInfo = null;
let updateToastTimeout = null;
let lastWorkspaceOpenId = null;
let lastWorkspaceOpenTime = 0;
let verticalTaskbarHoverListenersBound = false;

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

function applyLayoutSettings(settings) {
  const useVerticalTaskbar = Boolean(settings?.verticalTaskbar);
  if (document.body) {
    document.body.classList.toggle('vertical-taskbar', useVerticalTaskbar);
  }
  document.documentElement.classList.toggle('vertical-taskbar', useVerticalTaskbar);

  if (!useVerticalTaskbar) {
    setVerticalTaskbarExpanded(false);
  } else {
    bindVerticalTaskbarHoverState();
  }
}

function setVerticalTaskbarExpanded(isExpanded) {
  if (document.body) {
    document.body.classList.toggle('taskbar-expanded', isExpanded);
  }
  document.documentElement.classList.toggle('taskbar-expanded', isExpanded);
}

function bindVerticalTaskbarHoverState() {
  if (verticalTaskbarHoverListenersBound) {
    return;
  }

  const tabBarElement = document.getElementById('tab-bar');
  if (!tabBarElement) {
    return;
  }

  verticalTaskbarHoverListenersBound = true;

  const expandTaskbar = () => setVerticalTaskbarExpanded(true);
  const collapseTaskbar = () => setVerticalTaskbarExpanded(false);

  tabBarElement.addEventListener('mouseenter', expandTaskbar);
  tabBarElement.addEventListener('mouseleave', collapseTaskbar);
  tabBarElement.addEventListener('focusin', expandTaskbar);
  tabBarElement.addEventListener('focusout', (event) => {
    if (!tabBarElement.contains(event.relatedTarget)) {
      collapseTaskbar();
    }
  });
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

// Helper to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Create the HTML for a download notification item
function createDownloadNotification(item) {
    const notification = document.createElement('div');
    notification.id = `download-${item.startTime}`;
    notification.className = 'download-notification-item';

    notification.innerHTML = `
        <div class="download-icon">
            <i class="fa-solid fa-download"></i>
        </div>
        <div class="download-info">
            <div class="download-filename">${item.filename}</div>
            <div class="download-progress-container">
                <div class="download-progress-bar">
                    <div class="download-progress-fill"></div>
                </div>
                <span class="download-progress-text">Starting...</span>
            </div>
        </div>
        <div class="download-actions">
            <div class="download-action-button cancel-download" title="Cancel">
                <i class="fa-solid fa-xmark"></i>
            </div>
        </div>
    `;

    // Add event listener for cancel button
    notification.querySelector('.cancel-download').addEventListener('click', () => {
        window.api.cancelDownload(item.startTime);
    });

    return notification;
}

// Handle download updates for visual feedback
function handleDownloadUpdate(item) {
    const container = document.getElementById('download-notifications-container');
    if (!container) return;

    let notification = document.getElementById(`download-${item.startTime}`);

    if (!notification) {
        notification = createDownloadNotification(item);
        container.appendChild(notification);
        // Make it visible
        setTimeout(() => notification.classList.add('visible'), 100);
    }

    // Update progress
    const progressBar = notification.querySelector('.download-progress-fill');
    const progressText = notification.querySelector('.download-progress-text');
    const receivedBytes = item.receivedBytes || 0;
    const totalBytes = item.totalBytes || 1; // Avoid division by zero
    const percent = Math.floor((receivedBytes / totalBytes) * 100);

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }

    if (progressText) {
        if (item.state === 'progressing') {
            progressText.textContent = `${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)} (${percent}%)`;
        }
    }
    
    notification.classList.remove('completed', 'cancelled', 'interrupted');
    const actionsContainer = notification.querySelector('.download-actions');

    // Handle state changes
    switch (item.state) {
        case 'completed':
            notification.classList.add('completed');
            if (progressText) progressText.textContent = 'Completed';
            if (actionsContainer) actionsContainer.innerHTML = `
                <div class="download-action-button open-folder" title="Show in folder">
                    <i class="fa-solid fa-folder"></i>
                </div>`;
            notification.querySelector('.open-folder').addEventListener('click', () => {
                window.api.showDownloadInFolder(item.startTime);
            });
            // Remove after a delay
            setTimeout(() => {
                notification.classList.remove('visible');
                setTimeout(() => notification.remove(), 500);
            }, 4000);
            break;
        case 'cancelled':
            notification.classList.add('cancelled');
            if (progressText) progressText.textContent = 'Cancelled';
            if (actionsContainer) actionsContainer.innerHTML = '';
            // Remove after a delay
            setTimeout(() => {
                notification.classList.remove('visible');
                setTimeout(() => notification.remove(), 500);
            }, 2000);
            break;
        case 'interrupted':
            notification.classList.add('interrupted');
            if (progressText) progressText.textContent = 'Interrupted';
            if (actionsContainer) actionsContainer.innerHTML = '';
             // Remove after a delay
             setTimeout(() => {
                notification.classList.remove('visible');
                setTimeout(() => notification.remove(), 500);
            }, 2000);
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
  // Reset global variables to initial state
  currentTabId = null;
  tabs = [];
  cachedSettings = null;
  bookmarks = [];
  isIncognito = false;
  updateToastTimeout = null;
  let memorySaverEnabled = false;
  let memorySaverIntervalId = null;
  let memorySaverIdleMs = 15 * 60 * 1000;
  let sessionSaveTimeoutId = null;
  const splitViewState = {
    enabled: false,
    activePane: 'left',
    leftTabId: null,
    rightTabId: null
  };
  const tabSearchState = {
    overlay: null,
    input: null,
    results: null,
    filteredTabs: [],
    selectedIndex: 0,
    isOpen: false
  };

  // Helper function to show update toast notification
  function showUpdateToast(info) {
    // Clear any existing timeouts
    if (updateToastTimeout) {
      clearTimeout(updateToastTimeout);
    }
    
    // Remove any existing toasts
    const existingToast = document.querySelector('.update-notification-toast');
    if (existingToast) {
      existingToast.remove();
    }
      // Create toast element
    const toast = document.createElement('div');
    toast.className = 'update-notification-toast';
    toast.innerHTML = `
      <div class="update-icon">
        <i class="fa-solid fa-arrow-up-right-from-square"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">Update Available</div>
        <div class="toast-message">Version ${info.version} is now available. Click the update button to install.</div>
      </div>
      <div class="close-toast">
        <i class="fa-solid fa-xmark"></i>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Make it visible after a small delay
    setTimeout(() => {
      toast.classList.add('visible');
    }, 100);
    
    // Set timeout to hide the toast
    updateToastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    // Add click event to close button
    const closeButton = toast.querySelector('.close-toast');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
        clearTimeout(updateToastTimeout);
      });
    }
    
    // Add click event to the entire toast to open the update page
    toast.addEventListener('click', (event) => {
      if (!event.target.closest('.close-toast')) {
        navigateTo('gkp://update.gekko/');
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
        clearTimeout(updateToastTimeout);
      }
    });
  }

  // Set up listener for new tab requests from main process
  if (window.api && typeof window.api.onOpenNewTab === 'function') {
    window.api.onOpenNewTab((url) => {
      console.log(`Received open-new-tab event for URL: ${url}`);
      if (url) {
        createTab(url);
      }
    });
  }

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

  // Set up update status listener
  if (window.api && typeof window.api.onUpdateStatus === 'function') {
    window.api.onUpdateStatus((status, info) => {
      console.log('Update status changed:', status, info);
      const updateButton = document.getElementById('update-notification-button');
      const updateBadge = document.getElementById('update-badge');
      
      if (status === 'available') {
        hasUpdateAvailable = true;
        updateInfo = info;
        
        // Show update notification
        if (updateButton && updateBadge) {
          updateButton.classList.add('update-button-active');
          updateBadge.classList.add('available');
          updateButton.setAttribute('title', `Update available: ${info.version}`);
          
          // Show toast notification
          showUpdateToast(info);
        }
      } else {
        hasUpdateAvailable = false;
        
        // Hide update notification
        if (updateButton && updateBadge) {
          updateButton.classList.remove('update-button-active');
          updateBadge.classList.remove('available');
          updateButton.setAttribute('title', 'No updates available');
        }
      }
    });
  }
  
  // DOM Elements (declared once)
  const tabBar = document.getElementById('tab-bar');
  const tabBarContainer = document.getElementById('tab-bar-container') || tabBar.parentElement;
  const newTabButton = document.getElementById('new-tab-button');
  const tabScrollLeftButton = document.getElementById('tab-scroll-left');
  const tabScrollRightButton = document.getElementById('tab-scroll-right');
  const tabListButton = document.getElementById('tab-list-button');
  const tabListDropdown = document.getElementById('tab-list-dropdown');
  const tabListItems = document.getElementById('tab-list-items');
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

  if (window.api && typeof window.api.markSessionCleanExit === 'function') {
    window.api.markSessionCleanExit(false);
  }
  
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

  applyLayoutSettings(settings);
  applyMemorySettings(settings);
  
  // Set up event listeners
  setupEventListeners();

  if (window.api && typeof window.api.onTabContextAction === 'function') {
    window.api.onTabContextAction((action, payload) => {
      handleTabContextAction(action, payload);
    });
  }

  if (window.api && typeof window.api.onBookmarksUpdated === 'function') {
    window.api.onBookmarksUpdated((updatedBookmarks) => {
      if (Array.isArray(updatedBookmarks)) {
        bookmarks = updatedBookmarks;
      } else {
        loadBookmarks();
      }
      renderBookmarksBar();
    });
  }

  if (window.api && typeof window.api.onWorkspaceOpen === 'function') {
    window.api.onWorkspaceOpen((workspace) => {
      openWorkspaceTabs(workspace);
    });
  }

  initializeSession(settings);
  
  // Check for updates
  if (window.api && typeof window.api.checkForUpdates === 'function') {
    // Wait a bit before checking for updates to not slow down startup
    setTimeout(() => {
      window.api.checkForUpdates();
    }, 5000);
  }
  
  // Load bookmarks bar
  function loadBookmarksBar() {
    // Load bookmarks from storage
    loadBookmarks();
    // Render the bookmarks bar
    renderBookmarksBar();
  }

  window.addEventListener('beforeunload', () => {
    try {
      const snapshot = buildSessionSnapshot();
      if (window.api && typeof window.api.saveSessionStateSync === 'function') {
        window.api.saveSessionStateSync(snapshot);
      }
      if (window.api && typeof window.api.markSessionCleanExit === 'function') {
        window.api.markSessionCleanExit(true);
      }
    } catch (error) {
      console.warn('Failed to save session on unload:', error);
    }
  });
  
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
      { el: document.getElementById('update-notification-button'), name: 'update-notification-button' },
      { el: document.getElementById('update-badge'), name: 'update-badge' },
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
    
    // Tab scroll controls
    if (tabScrollLeftButton) {
      tabScrollLeftButton.addEventListener('click', () => scrollTabs(-100));
    }
    if (tabScrollRightButton) {
      tabScrollRightButton.addEventListener('click', () => scrollTabs(100));
    }
    
    // Tab list dropdown
    if (tabListButton && tabListDropdown) {
      tabListButton.addEventListener('click', toggleTabList);
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#tab-list-button') && !e.target.closest('#tab-list-dropdown')) {
          if (tabListDropdown.classList.contains('visible')) {
            tabListDropdown.classList.remove('visible');
          }
        }
      });
    }
    
    // Scroll wheel support for tabs
    tabBar.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        const isVertical = document.body.classList.contains('vertical-taskbar');
        
        if (isVertical) {
          // In vertical mode, scroll vertically
          tabBar.scrollBy({ top: e.deltaY > 0 ? 30 : -30, behavior: 'smooth' });
        } else {
          // In horizontal mode, scroll horizontally
          tabBar.scrollBy({ left: e.deltaY > 0 ? 50 : -50, behavior: 'smooth' });
        }
      }
    }, { passive: false });
    
    // Update scroll button visibility and tab list when tabs change
    tabBar.addEventListener('scroll', updateScrollButtonVisibility);
    
    tabBar.addEventListener('contextmenu', handleTabContextMenu);
    document.addEventListener('contextmenu', (event) => {
      const target = event.target;
      const tabElement = target && target.closest ? target.closest('.tab') : null;
      if (!tabElement) {
        return;
      }

      handleTabContextMenu(event);
    }, true);
    
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
    }    // Update notification button
    const updateNotificationButton = document.getElementById('update-notification-button');
    if (updateNotificationButton) {
      updateNotificationButton.addEventListener('click', () => {
        // Navigate to update page
        navigateTo('gkp://update.gekko/');
        
        // If update is available, show toast again
        if (hasUpdateAvailable && updateInfo) {
          showUpdateToast(updateInfo);
        } else {
          // Check for updates
          if (window.api && typeof window.api.checkForUpdates === 'function') {
            window.api.checkForUpdates();
          }
        }
      });
    } else {
      console.error('Update notification button not found in DOM');
    }
    
    // Browser actions
    bookmarksButton.addEventListener('click', () => showBookmarks());
    historyButton.addEventListener('click', () => showHistory());
    incognitoButton.addEventListener('click', toggleIncognitoMode);
      // Direct navigation to settings page
    settingsButton.addEventListener('click', () => showSettings());
    
    // Downloads button
    const downloadsButton = document.getElementById('downloads-button');
    if (downloadsButton) {
      downloadsButton.addEventListener('click', () => {
        navigateTo('gkp://downloads.gekko/');
      });
    }
    
    // Add a download notification badge
    let downloadBadge = document.getElementById('download-badge');
    if (!downloadBadge) {
      const downloadsButton = document.getElementById('downloads-button');
      if (downloadsButton) {
        downloadBadge = document.createElement('div');
        downloadBadge.className = 'download-badge';
        downloadBadge.id = 'download-badge';
        downloadsButton.appendChild(downloadBadge);
      }
    }

    // Listen for download updates to show a notification
    if (window.api && typeof window.api.onDownloadUpdate === 'function') {
      console.log('Renderer: Setting up download update listener.');
      window.api.onDownloadUpdate((item) => {
        console.log('Renderer: Received download-update event:', item);
        handleDownloadUpdate(item);
      });
    } else {
      console.error('Renderer: onDownloadUpdate API not found.');
    }
    
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
      } else if (event.data && event.data.type === 'open-workspace' && event.data.workspace) {
        openWorkspaceTabs(event.data.workspace);
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

  function getTabById(tabId) {
    return tabs.find(tab => tab.id === tabId);
  }

  function getTabIdsInOrder() {
    return Array.from(tabBar.querySelectorAll('.tab'))
      .map(tab => tab.getAttribute('data-tab-id'))
      .filter(Boolean);
  }

  function getMemorySaverIdleMs(settings) {
    const minutes = Number(settings?.memorySaverIdleMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 15 * 60 * 1000;
    }
    return minutes * 60 * 1000;
  }

  function applyMemorySettings(settings) {
    const enabled = settings?.memorySaverEnabled !== false;
    const idleMs = getMemorySaverIdleMs(settings);
    const shouldReset = enabled !== memorySaverEnabled || idleMs !== memorySaverIdleMs;

    memorySaverEnabled = enabled;
    memorySaverIdleMs = idleMs;

    if (!shouldReset) {
      return;
    }

    if (memorySaverIntervalId) {
      clearInterval(memorySaverIntervalId);
      memorySaverIntervalId = null;
    }

    if (memorySaverEnabled) {
      const intervalMs = Math.min(60 * 1000, Math.max(10 * 1000, Math.floor(memorySaverIdleMs / 2)));
      memorySaverIntervalId = setInterval(runMemorySaver, intervalMs);
      runMemorySaver();
    }
  }

  function runMemorySaver() {
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

  function discardTab(tab) {
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

  function restoreDiscardedTab(tab) {
    if (!tab || !tab.isDiscarded) {
      return;
    }

    const settings = loadSettingsSafely();
    const fallbackUrl = settings?.homePage || 'gkp://home.gekko/';
    const restoreUrl = tab.discardedUrl || tab.url || fallbackUrl;

    tab.webview = createWebviewForTab(tab.id, restoreUrl);
    tab.isDiscarded = false;
    tab.discardedUrl = null;
    tab.element?.classList.remove('tab-discarded');
  }

  function handleTabContextMenu(event) {
    if (!window.api || typeof window.api.showContextMenu !== 'function') {
      return;
    }

    const target = event.target;
    const tabElement = target && target.closest ? target.closest('.tab') : null;
    if (!tabElement) {
      return;
    }

    event.preventDefault();

    const tabId = tabElement.getAttribute('data-tab-id');
    if (!tabId) {
      return;
    }

    const tabIds = getTabIdsInOrder();
    const tabIndex = tabIds.indexOf(tabId);
    const tab = getTabById(tabId);

    window.api.showContextMenu({
      context: 'tab',
      tabId,
      tabIndex,
      tabCount: tabIds.length,
      isPinned: Boolean(tab?.pinned),
      splitPane: tab?.splitPane || '',
      splitEnabled: splitViewState.enabled,
      x: event.x,
      y: event.y
    });
  }

  function handleTabContextAction(action, payload) {
    const tabId = payload?.tabId;
    if (!action) {
      return;
    }

    if (action === 'save-workspace') {
      saveWorkspaceFromTabs();
      return;
    }

    if (!tabId) {
      return;
    }

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
      case 'save-workspace':
        saveWorkspaceFromTabs();
        break;
      default:
        console.warn('Unknown tab context action:', action);
    }
  }

  function duplicateTab(tabId) {
    const tab = getTabById(tabId);
    if (!tab) {
      return;
    }

    const url = tab.webview && typeof tab.webview.getURL === 'function'
      ? tab.webview.getURL()
      : tab.url;

    createTab(url);
  }

  function reloadTab(tabId) {
    const tab = getTabById(tabId);
    if (!tab) {
      return;
    }

    if (tab.isDiscarded) {
      restoreDiscardedTab(tab);
    }

    if (tab.webview && typeof tab.webview.reload === 'function') {
      tab.webview.reload();
    }
  }

  function closeOtherTabs(tabId) {
    setActiveTab(tabId);
    const tabIdsToClose = tabs
      .filter(tab => tab.id !== tabId)
      .map(tab => tab.id);

    tabIdsToClose.forEach(id => closeTab(id));
  }

  function closeTabsToRight(tabId) {
    const tabIds = getTabIdsInOrder();
    const tabIndex = tabIds.indexOf(tabId);
    if (tabIndex < 0) {
      return;
    }

    const tabIdsToClose = tabIds.slice(tabIndex + 1);
    tabIdsToClose.forEach(id => closeTab(id));
  }

  function getOrderedTabs() {
    return [...tabs].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      // Use tabOrder if available (for manual drag-drop reordering)
      const aOrder = Number.isFinite(a.tabOrder) ? a.tabOrder : Number.MAX_VALUE;
      const bOrder = Number.isFinite(b.tabOrder) ? b.tabOrder : Number.MAX_VALUE;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // Fall back to creation time for new tabs
      const aTime = Number.isFinite(a.createdAt) ? a.createdAt : 0;
      const bTime = Number.isFinite(b.createdAt) ? b.createdAt : 0;
      return aTime - bTime;
    });
  }

  function renderTabOrder() {
    const ordered = getOrderedTabs();
    ordered.forEach((tab) => {
      if (tab.element && tab.element.parentNode === tabBar) {
        tabBar.insertBefore(tab.element, newTabButton);
      }
    });
    updateScrollButtonVisibility();
    renderTabList();
  }

  function scrollTabs(amount) {
    tabBar.scrollBy({ left: amount, behavior: 'smooth' });
  }

  function updateScrollButtonVisibility() {
    // Scroll buttons are hidden - users can scroll with mouse wheel
    // This function exists for potential future use
  }

  function toggleTabList() {
    if (!tabListDropdown) {
      return;
    }
    tabListDropdown.classList.toggle('visible');
    if (tabListDropdown.classList.contains('visible')) {
      renderTabList();
    }
  }

  function renderTabList() {
    if (!tabListItems) {
      return;
    }

    tabListItems.innerHTML = '';
    const ordered = getOrderedTabs();

    if (ordered.length === 0) {
      tabListItems.innerHTML = '<div style="padding: 10px 12px; color: var(--textSecondary); font-size: 12px;">No open tabs</div>';
      return;
    }

    ordered.forEach((tab) => {
      const item = document.createElement('div');
      item.className = 'tab-list-item';
      if (tab.id === currentTabId) {
        item.classList.add('active');
      }

      const icon = document.createElement('div');
      icon.className = 'tab-list-item-icon';
      if (tab.favicon) {
        icon.innerHTML = `<img src="${tab.favicon}" alt="">`;
      } else {
        icon.innerHTML = '<i class="fa-solid fa-globe"></i>';
      }

      const title = document.createElement('div');
      title.className = 'tab-list-item-title';
      title.textContent = tab.title || 'New Tab';
      title.title = tab.title || 'New Tab';

      item.appendChild(icon);
      item.appendChild(title);

      item.addEventListener('click', () => {
        setActiveTab(tab.id);
        tabListDropdown.classList.remove('visible');
      });

      tabListItems.appendChild(item);
    });
  }

  function applyTabVisualState(tabId) {
    const tab = getTabById(tabId);
    if (!tab || !tab.element) {
      return;
    }

    tab.element.classList.toggle('tab-pinned', Boolean(tab.pinned));
    tab.element.classList.toggle('tab-split-left', tab.splitPane === 'left');
    tab.element.classList.toggle('tab-split-right', tab.splitPane === 'right');

    const tabTitle = tab.title || 'New Tab';
    tab.element.setAttribute('title', tabTitle);
  }

  function togglePinTab(tabId) {
    const tab = getTabById(tabId);
    if (!tab) {
      return;
    }

    tab.pinned = !tab.pinned;
    applyTabVisualState(tab.id);
    renderTabOrder();
    scheduleSessionSave();
  }

  function openTabInSplit(tabId, pane) {
    const tab = getTabById(tabId);
    if (!tab) {
      return;
    }

    const targetPane = pane === 'left' ? 'left' : 'right';
    splitViewState.enabled = true;
    splitViewState.activePane = targetPane;

    if (!splitViewState.leftTabId || !getTabById(splitViewState.leftTabId)) {
      splitViewState.leftTabId = currentTabId && currentTabId !== tabId ? currentTabId : tabId;
      const leftTab = getTabById(splitViewState.leftTabId);
      if (leftTab) {
        leftTab.splitPane = 'left';
        applyTabVisualState(leftTab.id);
      }
    }

    if (!splitViewState.rightTabId || !getTabById(splitViewState.rightTabId)) {
      splitViewState.rightTabId = tabId;
    }

    const previousTabId = targetPane === 'left' ? splitViewState.leftTabId : splitViewState.rightTabId;
    const previousTab = getTabById(previousTabId);
    if (previousTab && previousTab.id !== tab.id) {
      previousTab.splitPane = null;
      applyTabVisualState(previousTab.id);
    }

    tab.splitPane = targetPane;
    if (targetPane === 'left') {
      splitViewState.leftTabId = tab.id;
    } else {
      splitViewState.rightTabId = tab.id;
    }

    const oppositePane = targetPane === 'left' ? 'right' : 'left';
    const oppositeTabId = oppositePane === 'left' ? splitViewState.leftTabId : splitViewState.rightTabId;
    if (oppositeTabId === tab.id) {
      const fallback = tabs.find((item) => item.id !== tab.id);
      if (fallback) {
        fallback.splitPane = oppositePane;
        if (oppositePane === 'left') {
          splitViewState.leftTabId = fallback.id;
        } else {
          splitViewState.rightTabId = fallback.id;
        }
        applyTabVisualState(fallback.id);
      } else {
        const duplicateTabId = createTab(tab.url, {
          activate: false,
          pinned: tab.pinned,
          splitPane: oppositePane
        });
        if (oppositePane === 'left') {
          splitViewState.leftTabId = duplicateTabId;
        } else {
          splitViewState.rightTabId = duplicateTabId;
        }
      }
    }

    ensureDistinctSplitTabs();
    applyTabVisualState(tab.id);
    setActiveTab(tab.id);
    renderWebviewsForCurrentLayout();
    scheduleSessionSave();
  }

  function ensureDistinctSplitTabs() {
    if (!splitViewState.enabled) {
      return;
    }

    if (!splitViewState.leftTabId || !splitViewState.rightTabId) {
      return;
    }

    if (splitViewState.leftTabId !== splitViewState.rightTabId) {
      return;
    }

    const sharedTab = getTabById(splitViewState.leftTabId);
    if (!sharedTab) {
      return;
    }

    const fallback = tabs.find((item) => item.id !== sharedTab.id);
    if (fallback) {
      splitViewState.rightTabId = fallback.id;
      fallback.splitPane = 'right';
      sharedTab.splitPane = 'left';
      applyTabVisualState(fallback.id);
      applyTabVisualState(sharedTab.id);
      return;
    }

    const duplicateTabId = createTab(sharedTab.url, {
      activate: false,
      pinned: sharedTab.pinned,
      splitPane: 'right'
    });

    splitViewState.leftTabId = sharedTab.id;
    splitViewState.rightTabId = duplicateTabId;
    sharedTab.splitPane = 'left';
    applyTabVisualState(sharedTab.id);
  }

  function disableSplitView() {
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

  function setSplitActivePane(pane) {
    if (!splitViewState.enabled) {
      return;
    }

    splitViewState.activePane = pane === 'right' ? 'right' : 'left';
    const nextTabId = splitViewState.activePane === 'left' ? splitViewState.leftTabId : splitViewState.rightTabId;
    if (nextTabId && nextTabId !== currentTabId) {
      setActiveTab(nextTabId);
    }
  }

  function renderWebviewsForCurrentLayout() {
    ensureDistinctSplitTabs();

    document.querySelectorAll('.webview').forEach((webview) => {
      webview.classList.add('hidden');
      webview.classList.remove('split-pane-left');
      webview.classList.remove('split-pane-right');
    });

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

      return;
    }

    browserContent.classList.remove('split-view-enabled');
    const activeWebview = document.querySelector(`#webview-${currentTabId}`);
    if (activeWebview) {
      activeWebview.classList.remove('hidden');
    }
  }

  function ensureTabSearchOverlay() {
    if (tabSearchState.overlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'tab-search-overlay hidden';

    const dialog = document.createElement('div');
    dialog.className = 'tab-search-dialog';

    const input = document.createElement('input');
    input.className = 'tab-search-input';
    input.type = 'text';
    input.placeholder = 'Search tabs by title or URL';

    const results = document.createElement('div');
    results.className = 'tab-search-results';

    dialog.appendChild(input);
    dialog.appendChild(results);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        closeTabSearch();
      }
    });

    input.addEventListener('input', () => {
      tabSearchState.selectedIndex = 0;
      renderTabSearchResults(input.value);
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeTabSearch();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (tabSearchState.filteredTabs.length > 0) {
          tabSearchState.selectedIndex = Math.min(tabSearchState.selectedIndex + 1, tabSearchState.filteredTabs.length - 1);
          renderTabSearchResults(input.value);
        }
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (tabSearchState.filteredTabs.length > 0) {
          tabSearchState.selectedIndex = Math.max(tabSearchState.selectedIndex - 1, 0);
          renderTabSearchResults(input.value);
        }
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const selected = tabSearchState.filteredTabs[tabSearchState.selectedIndex];
        if (selected) {
          closeTabSearch();
          setActiveTab(selected.id);
        }
      }
    });

    tabSearchState.overlay = overlay;
    tabSearchState.input = input;
    tabSearchState.results = results;
  }

  function renderTabSearchResults(query) {
    if (!tabSearchState.results) {
      return;
    }

    const normalized = (query || '').toLowerCase().trim();
    const matchingTabs = getOrderedTabs().filter((tab) => {
      if (!normalized) {
        return true;
      }

      const title = (tab.title || '').toLowerCase();
      const url = (tab.url || '').toLowerCase();
      return title.includes(normalized) || url.includes(normalized);
    });

    tabSearchState.filteredTabs = matchingTabs;
    if (tabSearchState.selectedIndex >= matchingTabs.length) {
      tabSearchState.selectedIndex = Math.max(0, matchingTabs.length - 1);
    }

    tabSearchState.results.innerHTML = '';
    matchingTabs.forEach((tab, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `tab-search-result ${index === tabSearchState.selectedIndex ? 'selected' : ''}`;
      row.innerHTML = `
        <div class="tab-search-result-title">${tab.title || 'New Tab'}</div>
        <div class="tab-search-result-url">${tab.url || ''}</div>
      `;

      row.addEventListener('mouseenter', () => {
        tabSearchState.selectedIndex = index;
        renderTabSearchResults(tabSearchState.input.value);
      });

      row.addEventListener('click', () => {
        closeTabSearch();
        setActiveTab(tab.id);
      });

      tabSearchState.results.appendChild(row);
    });
  }

  function openTabSearch() {
    ensureTabSearchOverlay();
    tabSearchState.isOpen = true;
    tabSearchState.selectedIndex = 0;
    tabSearchState.overlay.classList.remove('hidden');
    tabSearchState.input.value = '';
    renderTabSearchResults('');
    tabSearchState.input.focus();
  }

  function closeTabSearch() {
    if (!tabSearchState.overlay) {
      return;
    }

    tabSearchState.isOpen = false;
    tabSearchState.overlay.classList.add('hidden');
  }

  function buildSessionSnapshot() {
    const serializedTabs = getOrderedTabs().map((tab) => {
      let currentUrl = tab.url;
      try {
        if (tab.webview && typeof tab.webview.getURL === 'function') {
          currentUrl = tab.webview.getURL() || currentUrl;
        }
      } catch (error) {
        currentUrl = tab.url;
      }

      return {
        id: tab.id,
        url: currentUrl,
        title: tab.title,
        pinned: Boolean(tab.pinned),
        splitPane: tab.splitPane || null,
        createdAt: tab.createdAt,
        lastActiveAt: tab.lastActiveAt,
        tabOrder: Number.isFinite(tab.tabOrder) ? tab.tabOrder : 0
      };
    });

    return {
      tabs: serializedTabs,
      currentTabId,
      splitView: splitViewState.enabled
        ? {
            enabled: true,
            activePane: splitViewState.activePane,
            leftTabId: splitViewState.leftTabId,
            rightTabId: splitViewState.rightTabId
          }
        : null,
      cleanExit: false,
      updatedAt: Date.now()
    };
  }

  function scheduleSessionSave() {
    if (!window.api || typeof window.api.saveSessionState !== 'function') {
      return;
    }

    if (sessionSaveTimeoutId) {
      clearTimeout(sessionSaveTimeoutId);
    }

    sessionSaveTimeoutId = setTimeout(() => {
      sessionSaveTimeoutId = null;
      window.api.saveSessionState(buildSessionSnapshot());
    }, 250);
  }

  function restoreSessionState(sessionState) {
    if (!sessionState || !Array.isArray(sessionState.tabs) || sessionState.tabs.length === 0) {
      return false;
    }

    let restoredCount = 0;
    sessionState.tabs.forEach((tabState) => {
      if (!tabState || !tabState.url) {
        return;
      }

      const restoredId = createTab(tabState.url, {
        activate: false,
        preferredId: tabState.id,
        pinned: tabState.pinned,
        splitPane: tabState.splitPane
      });

      const restoredTab = getTabById(restoredId);
      if (restoredTab) {
        restoredTab.title = tabState.title || restoredTab.title;
        restoredTab.createdAt = Number.isFinite(tabState.createdAt) ? tabState.createdAt : restoredTab.createdAt;
        restoredTab.lastActiveAt = Number.isFinite(tabState.lastActiveAt) ? tabState.lastActiveAt : restoredTab.lastActiveAt;
        restoredTab.tabOrder = Number.isFinite(tabState.tabOrder) ? tabState.tabOrder : restoredTab.tabOrder;
        const titleNode = restoredTab.element?.querySelector('.tab-title');
        if (titleNode && tabState.title) {
          titleNode.textContent = tabState.title;
        }
        applyTabVisualState(restoredTab.id);
        restoredCount += 1;
      }
    });

    if (restoredCount === 0) {
      return false;
    }

    renderTabOrder();

    if (sessionState.splitView && sessionState.splitView.enabled) {
      splitViewState.enabled = true;
      splitViewState.activePane = sessionState.splitView.activePane === 'right' ? 'right' : 'left';
      splitViewState.leftTabId = getTabById(sessionState.splitView.leftTabId) ? sessionState.splitView.leftTabId : null;
      splitViewState.rightTabId = getTabById(sessionState.splitView.rightTabId) ? sessionState.splitView.rightTabId : null;
      if (!(splitViewState.leftTabId && splitViewState.rightTabId)) {
        disableSplitView();
      }
    }

    const nextTabId = getTabById(sessionState.currentTabId)
      ? sessionState.currentTabId
      : (getOrderedTabs()[0] && getOrderedTabs()[0].id);

    if (nextTabId) {
      setActiveTab(nextTabId);
    }

    scheduleSessionSave();
    return true;
  }

  function initializeSession(settings) {
    let restored = false;
    if (window.api && typeof window.api.getSessionState === 'function') {
      const sessionState = window.api.getSessionState();
      const hasTabs = Array.isArray(sessionState?.tabs) && sessionState.tabs.length > 0;
      const restoreLastSession = settings?.restoreOnStartup === 'last-session';
      const restoreAfterCrash = settings?.crashRestoreEnabled !== false && sessionState?.cleanExit === false;

      if (hasTabs && (restoreLastSession || restoreAfterCrash)) {
        restored = restoreSessionState(sessionState);
      }
    }

    if (!restored) {
      createTab(settings?.homePage || 'gkp://home.gekko/');
    }

    scheduleSessionSave();
  }

  async function saveWorkspaceFromTabs() {
    if (!window.api || typeof window.api.addWorkspace !== 'function') {
      return;
    }

    const tabsSnapshot = tabs
      .map((tab) => {
        let url = tab.url;
        try {
          if (tab.webview && typeof tab.webview.getURL === 'function') {
            const currentUrl = tab.webview.getURL();
            if (currentUrl) {
              url = currentUrl;
            }
          }
        } catch (error) {
          url = tab.url;
        }

        if (!url) {
          return null;
        }

        return {
          url,
          title: tab.title || url,
          pinned: Boolean(tab.pinned),
          splitPane: tab.splitPane || null
        };
      })
      .filter(Boolean);

    if (tabsSnapshot.length === 0) {
      return;
    }

    const defaultName = `Workspace ${new Date().toISOString().replace('T', ' ').slice(0, 16)}`;
    const name = await requestWorkspaceName(defaultName);
    if (!name || !name.trim()) {
      return;
    }

    window.api.addWorkspace({
      name: name.trim(),
      tabs: tabsSnapshot
    });
  }

  function requestInputDialog({ titleText, descriptionText, defaultValue, confirmText }) {
    return new Promise((resolve) => {
      const existing = document.querySelector('.workspace-prompt-overlay');
      if (existing) {
        existing.remove();
      }

      const overlay = document.createElement('div');
      overlay.className = 'workspace-prompt-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'workspace-prompt';

      const title = document.createElement('div');
      title.className = 'workspace-prompt-title';
      title.textContent = titleText;

      const description = document.createElement('div');
      description.className = 'workspace-prompt-description';
      description.textContent = descriptionText;

      const input = document.createElement('input');
      input.className = 'workspace-prompt-input';
      input.type = 'text';
      input.value = defaultValue;

      const actions = document.createElement('div');
      actions.className = 'workspace-prompt-actions';

      const cancelButton = document.createElement('button');
      cancelButton.className = 'workspace-prompt-button';
      cancelButton.textContent = 'Cancel';

      const saveButton = document.createElement('button');
      saveButton.className = 'workspace-prompt-button primary';
      saveButton.textContent = confirmText;

      actions.appendChild(cancelButton);
      actions.appendChild(saveButton);

      dialog.appendChild(title);
      dialog.appendChild(description);
      dialog.appendChild(input);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);

      const cleanup = (value) => {
        overlay.remove();
        resolve(value);
      };

      cancelButton.addEventListener('click', () => cleanup(''));
      saveButton.addEventListener('click', () => cleanup(input.value));

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          cleanup('');
        }
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          cleanup(input.value);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cleanup('');
        }
      });

      document.body.appendChild(overlay);
      input.focus();
      input.select();
    });
  }

  function requestWorkspaceName(defaultName) {
    return requestInputDialog({
      titleText: 'Save Workspace',
      descriptionText: 'Name this workspace to save your current tabs.',
      defaultValue: defaultName,
      confirmText: 'Save'
    });
  }

  function openWorkspaceTabs(workspace) {
    if (!workspace || !Array.isArray(workspace.tabs)) {
      return;
    }

    const now = Date.now();
    if (workspace.id && workspace.id === lastWorkspaceOpenId && now - lastWorkspaceOpenTime < 1500) {
      return;
    }

    lastWorkspaceOpenId = workspace.id || null;
    lastWorkspaceOpenTime = now;

    let lastTabId = null;
    workspace.tabs.forEach((tab) => {
      if (tab && tab.url) {
        lastTabId = createTab(tab.url, {
          activate: false,
          pinned: Boolean(tab.pinned),
          splitPane: tab.splitPane || null
        });
      }
    });

    if (lastTabId) {
      setActiveTab(lastTabId);
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

  function createWebviewForTab(tabId, url) {
    const existing = document.getElementById(`webview-${tabId}`);
    if (existing) {
      existing.remove();
    }

    const webview = document.createElement('webview');
    webview.setAttribute('id', `webview-${tabId}`);
    webview.setAttribute('class', 'webview hidden');
    webview.setAttribute('data-tab-id', tabId);
    webview.setAttribute('nodeintegration', 'false');
    webview.setAttribute('contextIsolation', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=true, sandbox=true, javascript=true, webviewTag=false, nodeIntegration=false');
    webview.setAttribute('preload', window.api.getPaths().webviewPreload);
    webview.setAttribute('httpreferrer', 'strict-origin-when-cross-origin');
    webview.setAttribute('enableremotemodule', 'false');
    webview.dataset.ready = 'false';

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
      webview.setAttribute(
        'contentSecurityPolicy',
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: file: data: blob:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: chrome: file: data: blob:; " +
        "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' gkp: gkps: chrome: file: data: blob:; " +
        "style-src 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "style-src-elem 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "font-src 'self' 'unsafe-inline' gkp: gkps: file: data: blob:; " +
        "img-src 'self' gkp: gkps: file: data: blob:;"
      );
    }

    webview.setAttribute('src', url);
    browserContent.appendChild(webview);
    setupWebviewEvents(webview, tabId);
    return webview;
  }

  // Create a new tab
  function createTab(url, options = {}) {
    const settings = window.api.getSettings();
    let tabId = options.preferredId || generateTabId();
    if (getTabById(tabId)) {
      tabId = generateTabId();
    }
    const homePage = settings.homePage || 'gkp://home.gekko/';
    const shouldActivate = options.activate !== false;
    const pinned = Boolean(options.pinned);
    const splitPane = options.splitPane === 'left' || options.splitPane === 'right' ? options.splitPane : null;

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

    const webview = createWebviewForTab(tabId, url);

    // Calculate tabOrder based on existing tabs of same pinned state
    const pinnedTabs = tabs.filter(t => t.pinned === pinned);
    const nextTabOrder = pinnedTabs.length > 0 
      ? Math.max(...pinnedTabs.map(t => Number.isFinite(t.tabOrder) ? t.tabOrder : 0)) + 1 
      : 0;

    // Store tab info
    tabs.push({
      id: tabId,
      url: url,
      title: 'New Tab',
      favicon: null,
      element: tab,
      webview: webview,
      pinned,
      splitPane,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      isDiscarded: false,
      discardedUrl: null,
      tabOrder: nextTabOrder
    });

    applyTabVisualState(tabId);
    renderTabOrder();

    if (isInternalUrl(url)) {
      updateTabFavicon(tabId, getInternalFaviconUrl());
    }

    // Set up tab event listeners
    const closeButton = tab.querySelector('.tab-close');
    const tabContent = tab.querySelector('.tab-content');

    // Handle tab selection
    tabContent.addEventListener('click', () => {
      setActiveTab(tabId);
    });

    tab.addEventListener('contextmenu', handleTabContextMenu);

    // Handle tab closing
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeTab(tabId);
    });

    // Handle drag and drop
    tab.addEventListener('dragstart', (e) => {
      handleTabDragStart(e, tabId);
    });

    tab.addEventListener('dragend', (e) => {
      handleTabDragEnd(e);
    });

    tab.addEventListener('dragover', (e) => {
      handleTabDragOver(e, tabId);
    });

    tab.addEventListener('dragleave', (e) => {
      handleTabDragLeave(e, tabId);
    });

    tab.addEventListener('drop', (e) => {
      handleTabDrop(e, tabId);
    });

    // Make tab draggable
    tab.draggable = true;

    // Set as active tab
    if (shouldActivate) {
      setActiveTab(tabId);
    }

    scheduleSessionSave();

    return tabId;
  }

  // Set up webview events
  function setupWebviewEvents(webview, tabId) {
    // DOM ready
    webview.addEventListener('dom-ready', () => {
      console.log(`WebView DOM ready for tab ${tabId}`);
      webview.dataset.ready = 'true';
      
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

      if (tabId === currentTabId) {
        try {
          const actualUrl = webview.getURL ? webview.getURL() : webview.getAttribute('src');
          if (actualUrl) {
            updateBookmarkButton(actualUrl);
          }
        } catch (error) {
          console.warn('Unable to update bookmark button on dom-ready:', error);
        }

        updateNavigationButtons(tabId);
      }
    });
    
    // Page title updated
    webview.addEventListener('page-title-updated', (e) => {
      updateTabTitle(tabId, e.title);
    });
    
    // Page favicon updated
    webview.addEventListener('page-favicon-updated', (e) => {
      let currentUrl = null;
      try {
        currentUrl = typeof webview.getURL === 'function' ? webview.getURL() : null;
      } catch (error) {
        currentUrl = null;
      }

      if (isInternalUrl(currentUrl || webview.getAttribute('src'))) {
        updateTabFavicon(tabId, getInternalFaviconUrl());
        return;
      }

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

      if (isInternalUrl(finalUrl)) {
        updateTabFavicon(tabId, getInternalFaviconUrl());
      }
      
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
    const previousTab = getTabById(currentTabId);
    if (previousTab) {
      previousTab.lastActiveAt = Date.now();
    }
    currentTabId = tabId;

    const targetTab = getTabById(tabId);
    if (targetTab) {
      targetTab.lastActiveAt = Date.now();
      if (targetTab.isDiscarded) {
        restoreDiscardedTab(targetTab);
      }

      if (splitViewState.enabled && targetTab.splitPane) {
        splitViewState.activePane = targetTab.splitPane;
      } else if (splitViewState.enabled && !targetTab.splitPane) {
        const targetPane = splitViewState.activePane || 'right';
        const previousTabId = targetPane === 'left' ? splitViewState.leftTabId : splitViewState.rightTabId;
        const previousTab = getTabById(previousTabId);
        if (previousTab) {
          previousTab.splitPane = null;
          applyTabVisualState(previousTab.id);
        }

        targetTab.splitPane = targetPane;
        if (targetPane === 'left') {
          splitViewState.leftTabId = targetTab.id;
        } else {
          splitViewState.rightTabId = targetTab.id;
        }
        applyTabVisualState(targetTab.id);
      }
    }
    
    // Update tab UI
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    renderWebviewsForCurrentLayout();

    const activeWebview = document.querySelector(`#webview-${tabId}`);
    if (activeWebview) {
      // Get the current URL from the webview
      const currentUrl = activeWebview.getAttribute('src');
      
      // Update address bar
      updateAddressBar(currentUrl, tabId);
      
      const isReady = activeWebview.dataset.ready === 'true';
      if (isReady) {
        // Update bookmark button
        try {
          const actualUrl = activeWebview.getURL ? activeWebview.getURL() : currentUrl;
          if (actualUrl) {
            updateBookmarkButton(actualUrl);
          }
        } catch (error) {
          console.error('Error updating bookmark button in setActiveTab:', error);
        }
      }

      updateNavigationButtons(tabId);
      
      // Ensure the webview has loaded the URL when ready
      if (currentUrl) {
        const needsLoad = !activeWebview.getURL || (isReady && !activeWebview.getURL());
        if (needsLoad) {
          console.log(`Ensuring URL is loaded: ${currentUrl}`);
          safeLoadURL(activeWebview, currentUrl);
        }
      }
    }

    renderTabList();
    scheduleSessionSave();
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
      if (tab.webview) {
        tab.webview.remove();
      }
      
      // Remove from tabs array
      tabs.splice(tabIndex, 1);

      if (splitViewState.leftTabId === tabId) {
        splitViewState.leftTabId = null;
      }

      if (splitViewState.rightTabId === tabId) {
        splitViewState.rightTabId = null;
      }

      if (splitViewState.enabled && (!splitViewState.leftTabId || !splitViewState.rightTabId)) {
        disableSplitView();
      }
      
      // If this was the active tab, activate another tab
      if (currentTabId === tabId) {
        if (tabs.length > 0) {
          setActiveTab(tabs[tabs.length - 1].id);
        } else {
          // No more tabs, create a new one
          createTab();
        }
      }

      renderTabList();
      scheduleSessionSave();
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

      renderTabList();
      scheduleSessionSave();
    }
  }

  // Get tab title
  function getTabTitle(tabId) {
    const tab = tabs.find(tab => tab.id === tabId);
    return tab ? tab.title : 'New Tab';
  }

  function isInternalUrl(url) {
    return typeof url === 'string' && (url.startsWith('gkp://') || url.startsWith('gkps://'));
  }

  function getInternalFaviconUrl() {
    return 'gkp://assets.gekko/icons/32x32.png';
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

  // Drag and drop handlers
  let draggedTabId = null;

  function handleTabDragStart(e, tabId) {
    draggedTabId = tabId;
    const tab = getTabById(tabId);
    if (tab && tab.element) {
      tab.element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tabId);
    }
  }

  function handleTabDragEnd(e) {
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
      tab.classList.remove('dragging', 'drag-over-left', 'drag-over-right');
    });
    tabBar.classList.remove('drag-over');
    draggedTabId = null;
  }

  function handleTabDragOver(e, tabId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedTabId || draggedTabId === tabId) {
      return;
    }

    const draggedTab = getTabById(draggedTabId);
    const targetTab = getTabById(tabId);

    if (!draggedTab || !targetTab) {
      return;
    }

    // Only allow dragging within the same pinned state
    if (draggedTab.pinned !== targetTab.pinned) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    // Calculate where to drop based on mouse position
    const rect = targetTab.element.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;

    targetTab.element.classList.remove('drag-over-left', 'drag-over-right');

    if (e.clientX < midpoint) {
      targetTab.element.classList.add('drag-over-left');
    } else {
      targetTab.element.classList.add('drag-over-right');
    }
  }

  function handleTabDragLeave(e, tabId) {
    const tab = getTabById(tabId);
    if (tab && tab.element) {
      tab.element.classList.remove('drag-over-left', 'drag-over-right');
    }
  }

  function handleTabDrop(e, targetTabId) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedTabId || draggedTabId === targetTabId) {
      return;
    }

    const draggedTab = getTabById(draggedTabId);
    const targetTab = getTabById(targetTabId);

    if (!draggedTab || !targetTab) {
      return;
    }

    // Only allow reordering within the same pinned state
    if (draggedTab.pinned !== targetTab.pinned) {
      return;
    }

    // Get mouse position to determine drop side
    const rect = targetTab.element.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const dropLeft = e.clientX < midpoint;

    // Get all tabs with same pinned state, sorted by current tabOrder
    const sameStateTabs = tabs
      .filter(t => t.pinned === draggedTab.pinned)
      .sort((a, b) => (Number.isFinite(a.tabOrder) ? a.tabOrder : 0) - (Number.isFinite(b.tabOrder) ? b.tabOrder : 0));

    // Find current positions
    const draggedIndex = sameStateTabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = sameStateTabs.findIndex(t => t.id === targetTabId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Remove dragged tab from array
    sameStateTabs.splice(draggedIndex, 1);

    // Calculate new position based on drop side
    let newIndex;
    if (draggedIndex < targetIndex) {
      // Dragging to the right - target index shifted down after removal
      newIndex = dropLeft ? targetIndex - 1 : targetIndex;
    } else {
      // Dragging to the left
      newIndex = dropLeft ? targetIndex : targetIndex + 1;
    }

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(newIndex, sameStateTabs.length));

    // Insert dragged tab at new position
    sameStateTabs.splice(newIndex, 0, draggedTab);

    // Reassign tabOrder values sequentially
    sameStateTabs.forEach((tab, index) => {
      tab.tabOrder = index;
    });

    renderTabOrder();
    scheduleSessionSave();
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
      if (webview.dataset.ready !== 'true') {
        backButton.classList.add('disabled');
        forwardButton.classList.add('disabled');
        return;
      }
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
    
    // Bookmark toggle button
    const toggleBookmarkButton = document.createElement('div');
    toggleBookmarkButton.className = 'add-bookmark-button';
    toggleBookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    toggleBookmarkButton.title = 'Add or remove bookmark for current page';
    toggleBookmarkButton.addEventListener('click', () => {
      toggleBookmark();
    });
    bookmarksBar.appendChild(toggleBookmarkButton);

    bookmarks.forEach(bookmark => {
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
    const barToggleButton = document.querySelector('.bookmarks-bar .add-bookmark-button');
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
      if (barToggleButton) {
        barToggleButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      }
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
        if (barToggleButton) {
          barToggleButton.innerHTML = '<i class="fa-solid fa-star"></i>';
        }
      } else {
        console.log('URL is not bookmarked, updating button state');
        bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
        bookmarkButton.classList.remove('bookmarked');
        bookmarkButton.setAttribute('title', 'Add to bookmarks');
        if (barToggleButton) {
          barToggleButton.innerHTML = '<i class="fa-regular fa-star"></i>';
        }
      }
    } catch (error) {
      console.error('Error updating bookmark button:', error);
      bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      bookmarkButton.classList.remove('bookmarked');
      bookmarkButton.setAttribute('title', 'Bookmark functionality unavailable');
      if (barToggleButton) {
        barToggleButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      }
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

    applyLayoutSettings(settings);
    applyMemorySettings(settings);
    
    console.groupEnd();
  };

  // Register the settings update handler
  if (window.api && typeof window.api.onSettingsUpdated === 'function') {
    window.api.onSettingsUpdated(handleSettingsUpdate);
  }
});