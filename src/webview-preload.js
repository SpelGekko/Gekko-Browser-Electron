const { contextBridge, ipcRenderer } = require("electron");

// Log that the preload script is running
console.log("Webview preload script executing");

// Expose simple-icons to renderer
contextBridge.exposeInMainWorld('simpleIcons', {
  getIcon: (slug) => {
    const iconKey = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    return simpleIcons[iconKey];
  },
  hasIcon: (slug) => {
    const iconKey = `si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
    return !!simpleIcons[iconKey];
  }
});

// Navigation API
const navigationAPI = {
  navigate: (url) => {
    console.log('Navigation requested via API to:', url);
    ipcRenderer.send('navigate', url);
  },
  handleNavigation: (url) => {
    console.log('Navigation handled via API:', url);
    ipcRenderer.send('navigate', url);
  }
};

// Expose navigation API to renderer
contextBridge.exposeInMainWorld('navigationAPI', navigationAPI);

// Function to create SafeDOM - a restricted access to DOM APIs
function createSafeDOM() {
  // Create an in-memory fallback for storage when web storage APIs are unavailable
  const memoryStorage = new Map();
  
  // Import theme storage manager
  const themeStorage = require('./theme-storage');

  // Create a safe storage wrapper
  const safeStorage = {
    getItem: (key) => {
      // For theme specifically, use theme storage manager
      if (key === 'gekko-theme') {
        return themeStorage.getCurrentTheme();
      }
      
      // Return default theme if all methods fail
      return 'dark';
    },
    setItem: async (key, value) => {
      if (key === 'gekko-theme') {
        return await themeStorage.saveTheme(value);
      }
    }
  };

  return {
    addStyleSheet: (cssText) => {
      try {
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
        return true;
      } catch (error) {
        console.error('Error adding stylesheet:', error);
        return false;
      }
    },
    
    setThemeAttribute: (theme) => {
      try {
        // Set the theme attribute on the document
        document.documentElement.setAttribute('data-theme', theme);
        
        // Update DOM marker first (most reliable)
        try {
          const marker = document.getElementById('gekko-theme-marker') || 
                        document.createElement('meta');
          marker.id = 'gekko-theme-marker';
          marker.setAttribute('name', 'theme');
          marker.setAttribute('content', theme);
          if (!marker.parentNode) {
            document.head.appendChild(marker);
          }
        } catch (domError) {
          console.warn('Error setting theme DOM marker:', domError);
        }

        // Set theme cookie (accessible to all pages in the domain)
        try {
          document.cookie = `gekko-theme=${theme};path=/;max-age=31536000;SameSite=Strict`;
        } catch (cookieError) {
          console.warn('Error setting theme cookie:', cookieError);
        }

        // Update URL hash for persistence
        updateThemeHash(theme);

        // Send to main process via IPC
        try {
          ipcRenderer.send('set-setting', 'theme', theme);
        } catch (ipcError) {
          console.warn('Error saving theme via IPC:', ipcError);
        }

        // Use browser storage as final fallback
        try {
          localStorage.setItem('gekko-theme', theme);
        } catch (storageError) {
          console.warn('Error saving theme to localStorage:', storageError);
        }

        // Broadcast theme change to all windows
        try {
          const bc = new BroadcastChannel('gekko-theme');
          bc.postMessage({ theme });
        } catch (broadcastError) {
          console.warn('Error broadcasting theme:', broadcastError);
        }

        // Notify any listeners
        const event = new CustomEvent('gekko-theme-changed', { 
          detail: { theme } 
        });
        document.dispatchEvent(event);

        return true;
      } catch (error) {
        console.error('Error setting theme:', error);
        return false;
      }
    },
    
    getCSSVariables: () => {
      try {
        const styles = getComputedStyle(document.documentElement);
        const vars = {};
        for (const prop of styles) {
          if (prop.startsWith('--')) {
            vars[prop] = styles.getPropertyValue(prop).trim();
          }
        }
        return vars;
      } catch (error) {
        console.error('Error getting CSS variables:', error);
        return {};
      }
    },

    applyFontFallbacks: () => {
      try {
        // Check if fallbacks have already been applied
        if (document.getElementById('gekko-font-fallbacks')) {
          console.log('Font fallbacks already applied');
          return true;
        }
        
        console.log('Applying font fallbacks');
        document.documentElement.classList.add('font-load-error');
        
        const style = document.createElement('style');
        style.id = 'gekko-font-fallbacks';
        style.textContent = `
          /* Better font loading performance with preloads */
          @media screen {
            @font-face {
              font-family: 'IconFallback';
              font-display: swap;
              src: local('Segoe UI Symbol'), local('Apple Color Emoji'), local('Segoe UI Emoji');
            }
          }
        
          /* Improved font error recovery */
          /* Override FontAwesome with system fonts - multiple sources for better compatibility */
          @font-face {
            font-family: 'Font Awesome 5 Free';
            font-style: normal;
            font-weight: 900;
            font-display: block;
            src: local('Arial'), local('Segoe UI Symbol'), local('Apple Color Emoji'), local('Segoe UI Emoji');
          }
          
          @font-face {
            font-family: 'FontAwesome';
            font-style: normal;
            font-weight: normal;
            font-display: block;
            src: local('Arial'), local('Segoe UI Symbol'), local('Apple Color Emoji'), local('Segoe UI Emoji');
          }
          
          /* FontAwesome fallback styles with improved specificity */
          [class*="fa-"]:before,
          .fa:before,
          .fas:before,
          .far:before,
          .fab:before {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol" !important;
          }
          
          /* Enhanced emoji fallbacks with better coverage */
          .fa-solid.fa-house:before, .fa-house:before { content: "🏠"; }
          .fa-solid.fa-gear:before, .fa-gear:before, .fa-cog:before { content: "⚙️"; }
          .fa-solid.fa-clock-rotate-left:before, .fa-clock-rotate-left:before, .fa-history:before { content: "⏱️"; }
          .fa-solid.fa-globe:before, .fa-globe:before { content: "🌐"; }
          .fa-solid.fa-lock:before, .fa-lock:before { content: "🔒"; }
          .fa-solid.fa-lock-open:before, .fa-lock-open:before { content: "🔓"; }
          .fa-solid.fa-shield:before, .fa-shield:before { content: "🛡️"; }
          .fa-solid.fa-arrows-rotate:before, .fa-arrows-rotate:before, .fa-refresh:before { content: "🔄"; }
          .fa-solid.fa-xmark:before, .fa-xmark:before, .fa-times:before { content: "✕"; }
          .fa-solid.fa-arrow-left:before, .fa-arrow-left:before { content: "←"; }
          .fa-solid.fa-arrow-right:before, .fa-arrow-right:before { content: "→"; }
          .fa-solid.fa-window-minimize:before, .fa-window-minimize:before { content: "─"; }
          .fa-solid.fa-window-maximize:before, .fa-window-maximize:before { content: "□"; }
          .fa-solid.fa-plus:before, .fa-plus:before { content: "+"; }
          .fa-solid.fa-magnifying-glass:before, .fa-magnifying-glass:before, .fa-search:before { content: "🔍"; }
          .fa-solid.fa-bookmark:before, .fa-bookmark:before { content: "🔖"; }
          .fa-solid.fa-water:before, .fa-water:before { content: "💧"; }
          .fa-solid.fa-fire:before, .fa-fire:before { content: "🔥"; }
          .fa-solid.fa-leaf:before, .fa-leaf:before { content: "🍃"; }
          .fa-solid.fa-moon:before, .fa-moon:before { content: "🌙"; }
          .fa-solid.fa-sun:before, .fa-sun:before { content: "☀️"; }
          .fa-solid.fa-code:before, .fa-code:before { content: "📝"; }
          .fa-solid.fa-snowflake:before, .fa-snowflake:before { content: "❄️"; }
          .fa-solid.fa-palette:before, .fa-palette:before { content: "🎨"; }
          
          /* Common icons without specific emoji fallbacks - use text characters */
          .fa-solid.fa-star:before, .fa-star:before { content: "★"; }
          .fa-solid.fa-heart:before, .fa-heart:before { content: "♥"; }
          .fa-solid.fa-check:before, .fa-check:before { content: "✓"; }
          .fa-solid.fa-circle:before, .fa-circle:before { content: "●"; }
          .fa-solid.fa-square:before, .fa-square:before { content: "■"; }
          .fa-solid.fa-triangle:before, .fa-triangle:before { content: "▲"; }
          .fa-solid.fa-chevron-down:before, .fa-chevron-down:before { content: "▼"; }
          .fa-solid.fa-chevron-up:before, .fa-chevron-up:before { content: "▲"; }
          .fa-solid.fa-chevron-left:before, .fa-chevron-left:before { content: "◀"; }
          .fa-solid.fa-chevron-right:before, .fa-chevron-right:before { content: "▶"; }
          
          /* FontAwesome core styles for non-emoji browsers */
          .fa, .fas, .far, .fab, .fa-solid, .fa-regular, .fa-brands, [class*="fa-"] {
            font-family: system-ui, -apple-system, sans-serif;
            display: inline-block;
            text-align: center;
            width: 1.25em;
            line-height: 1;
          }

          /* Accent colors for icons */
          .shortcut-icon i, .card-icon i, .setting-icon i, .theme-info i {
            color: var(--accent-color, #8ab4f8) !important;
          }
        `;
        document.head.appendChild(style);
        
        // Add a class to the body to indicate fallbacks are active
        document.body.classList.add('gekko-font-fallbacks-active');
        
        // Try to preload system fonts that will be used as fallbacks
        if ('fonts' in document) {
          try {
            document.fonts.load('1em "Segoe UI Symbol"');
            document.fonts.load('1em "Segoe UI Emoji"');
            document.fonts.load('1em "Apple Color Emoji"');
          } catch (fontLoadError) {
            console.warn('Error preloading system fonts:', fontLoadError);
          }
        }
        
        console.log('Font fallbacks applied successfully');
        return true;
      } catch (error) {
        console.error('Error applying font fallbacks:', error);
        return false;
      }
    },

    getStorage: safeStorage
  };
}

// Create the safeDOM instance early so it can be used throughout the file
const safeDOM = createSafeDOM();

// Remove URL hash update for theme persistence
function updateThemeHash(theme) {
  try {
    console.log('Skipping URL hash update for theme:', theme);
  } catch (error) {
    console.warn('Error skipping URL hash update:', error);
  }
}

// Ensure hash is cleared on theme change
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1);
  if (hash.startsWith('theme=')) {
    console.log('Clearing theme hash from URL');
    history.replaceState(null, '', location.pathname);
  }
});

// Function to convert theme colors to CSS variables
function themeToCSS(theme) {
  if (!theme || !theme.colors) return '';
  return Object.entries(theme.colors)
    .map(([key, value]) => `--${key}: ${value};`)
    .join('\n');
}

// Watch for font loading errors and apply fallbacks if needed
document.fonts?.addEventListener('loadingerror', (event) => {
  console.warn('Font loading error detected:', event.fontface?.family, 'applying fallbacks');
  safeDOM.applyFontFallbacks();
});

// Counter for failed font loads to trigger fallbacks after multiple failures
let fontFailCount = 0;
const MAX_FONT_FAILURES = 3;

// Create a MutationObserver to watch for font loading attempts
document.addEventListener('DOMContentLoaded', () => {
  // Track font loading state
  const fontLoadState = {
    failures: 0,
    checkedFonts: new Set(),
    preloadedFonts: new Map()
  };

  // Enhanced font availability check with proper error handling
  const checkFontAvailability = async () => {
    const families = ['Font Awesome 5 Free', 'FontAwesome', 'fa-solid-900'];
    let available = false;

    // Try native font loading API first
    if (document.fonts) {
      try {
        await document.fonts.ready;
        for (const family of families) {
          if (document.fonts.check(`1em "${family}"`)) {
            available = true;
            break;
          }
          // Add fallback font load attempt
          try {
            await document.fonts.load(`1em "${family}"`);
          } catch (loadError) {
            console.warn(`Failed to load font family ${family}:`, loadError);
          }
        }
      } catch (e) {
        console.warn('Font API check failed:', e);
      }
    }

    // Fallback to manual font test if needed
    if (!available) {
      const testElement = document.createElement('i');
      testElement.style.cssText = 'visibility:hidden;position:absolute';
      testElement.className = 'fa fa-house';
      document.body.appendChild(testElement);
      
      try {
        const style = window.getComputedStyle(testElement);
        available = style.fontFamily.includes('Font') && style.fontFamily.includes('Awesome');
      } catch (e) {
        console.warn('Manual font check failed:', e);
      } finally {
        document.body.removeChild(testElement);
      }
    }

    // Apply fallbacks if needed
    if (!available) {
      fontLoadState.failures++;
      if (fontLoadState.failures >= MAX_FONT_FAILURES) {
        safeDOM.applyFontFallbacks();
      }
    }

    return available;
  };

  // Initialize observer with enhanced mutation handling
  const fontObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'LINK' && node.rel === 'stylesheet' && node.href.includes('font')) {
          node.addEventListener('error', (event) => {
            console.warn('Font stylesheet loading error:', event);
            fontLoadState.failures++;
            if (fontLoadState.failures >= MAX_FONT_FAILURES) {
              safeDOM.applyFontFallbacks();
            }
          });
        }
      }
    }
  });

  // Start observing with proper configuration
  fontObserver.observe(document.documentElement, { 
    childList: true, 
    subtree: true 
  });

  // Initial font check and cleanup
  setTimeout(async () => {
    const available = await checkFontAvailability();
    if (!available) {
      safeDOM.applyFontFallbacks();
    }
    // Disconnect observer after reasonable timeout
    setTimeout(() => fontObserver.disconnect(), 10000);
  }, 100);
});

// API exposed to webviews
contextBridge.exposeInMainWorld("api", {
  // Settings
  getSettings: () => {
    console.log("getSettings called from webview");
    try {
      const settings = ipcRenderer.sendSync("get-settings");
      if (!settings || settings._error) {
        return { theme: 'dark' };
      }
      return settings;
    } catch (error) {
      console.error("Error getting settings:", error);
      return { theme: "dark" };
    }
  },

  setSetting: async (key, value) => {
    console.log("setSetting called from webview", key, value);
    try {
      // For theme changes, ensure settings.json is updated first
      if (key === "theme") {
        // Send setting update to main process
        ipcRenderer.send("set-setting", key, value);
        
        // Wait a moment for the setting to be saved
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get the current settings to verify the change
        const settings = ipcRenderer.sendSync("get-settings");
        if (settings.theme === value) {
          // Only update DOM after verifying settings.json was updated
          document.documentElement.setAttribute('data-theme', value);
        } else {
          console.error("Theme not saved correctly to settings.json");
        }
      } else {
        ipcRenderer.send("set-setting", key, value);
      }
    } catch (error) {
      console.error("Error setting setting:", error);
    }
  },

  // Theme management
  applyTheme: (theme) => {
    try {
      // First save the theme setting
      ipcRenderer.send('set-setting', 'theme', theme);
      
      // Apply theme to current document
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      
      // Notify the main window to update all other webviews
      window.parent.postMessage({ type: 'themeChange', theme: theme }, '*');
      
      return true;
    } catch (error) {
      console.error('Error applying theme:', error);
      return false;
    }
  }
});

// Expose a safe subset of DOM APIs
contextBridge.exposeInMainWorld('safeDOM', {
  addStyleSheet: safeDOM.addStyleSheet,
  setThemeAttribute: safeDOM.setThemeAttribute,
  getCSSVariables: safeDOM.getCSSVariables,
  applyFontFallbacks: safeDOM.applyFontFallbacks,
  getStorage: safeDOM.getStorage
});

// Expose a function to allow navigating from internal pages
contextBridge.exposeInMainWorld("browserAction", {
  navigate: (url) => {
    if (typeof url === 'string' && url) {
      console.log("navigate called from webview", url);
      window.parent.postMessage({ type: "navigate", url: url }, "*");
    }
  },
  
  fixIcons: () => {
    console.log("fixIcons called from webview");
    return safeDOM.applyFontFallbacks();
  }
});