/**
 * Theme Storage Manager for Gekko Browser
 * Provides reliable theme persistence across browser sessions
 */

const { ipcRenderer } = require('electron');
const { EventEmitter } = require('events');

class ThemeStorageManager extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.currentTheme = 'dark';
    this.saveTimeout = null;
    this.init();
  }

  /**
   * Initialize storage mechanisms and load initial theme
   */
  init() {
    if (this.initialized) return;
    this.initialized = true;

    // Load theme in order of priority
    this.currentTheme = this.loadTheme();

    // Set up storage event listeners
    window.addEventListener('storage', (e) => {
      if (e.key === 'gekko-theme') {
        const newTheme = e.newValue || 'dark';
        // Only update if theme actually changed
        if (newTheme !== this.currentTheme) {
          this.handleThemeChange(newTheme);
        }
      }
    });

    // Listen for broadcasts from other windows
    try {
      this.broadcastChannel = new BroadcastChannel('gekko-theme');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.theme && event.data.theme !== this.currentTheme) {
          this.handleThemeChange(event.data.theme);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }
  /**
   * Handle theme change with debouncing
   */
  handleThemeChange(newTheme) {
    // Skip if theme hasn't changed
    if (this.currentTheme === newTheme) {
      console.log('Theme already set to', newTheme, ', skipping change');
      return;
    }
    
    // Update current theme immediately for UI
    this.currentTheme = newTheme;
    
    // Clear any pending save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce the save operation with a longer timeout
    this.saveTimeout = setTimeout(() => {
      this.saveTheme(newTheme);
    }, 300); // Increased timeout for better debouncing

    // Emit change event immediately for UI updates
    this.emit('theme-changed', newTheme);
  }

  /**
   * Load theme from all available storage mechanisms in priority order
   */
  loadTheme() {
    let theme;
    
    // 1. Try IPC renderer first (settings.json - source of truth)
    try {
      const settings = ipcRenderer.sendSync('get-settings');
      if (settings?.theme) {
        theme = settings.theme;
        // Sync other storage mechanisms quietly
        this.syncThemeToStorage(theme);
        return theme;
      }
    } catch (e) {
      console.warn('Failed to load theme from settings:', e);
    }

    // 2. Try localStorage
    try {
      theme = localStorage.getItem('gekko-theme');
      if (theme) return theme;
    } catch (e) {
      console.warn('Failed to load theme from localStorage:', e);
    }

    // 3. Try DOM storage
    try {
      const marker = document.getElementById('gekko-theme-marker');
      if (marker?.getAttribute('content')) {
        return marker.getAttribute('content');
      }
    } catch (e) {
      console.warn('Failed to load theme from DOM:', e);
    }

    return 'dark';
  }
  /**
   * Sync theme to all storage mechanisms except settings.json
   */
  syncThemeToStorage(themeId) {
    // Sync to localStorage
    try {
      localStorage.setItem('gekko-theme', themeId);
    } catch (e) {
      console.warn('Failed to sync theme to localStorage:', e);
    }

    // Sync to DOM
    try {
      let marker = document.getElementById('gekko-theme-marker');
      if (!marker) {
        marker = document.createElement('meta');
        marker.id = 'gekko-theme-marker';
        marker.setAttribute('name', 'theme');
        document.head.appendChild(marker);
      }
      marker.setAttribute('content', themeId);
      
      // Apply CSS variables directly to the document
      try {
        const themes = require('./themes');
        const theme = themes[themeId];
        if (theme && theme.colors) {
          const root = document.documentElement;
          Object.entries(theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
          });
          root.setAttribute('data-theme', themeId);
          document.body.setAttribute('data-theme', themeId);
        }
      } catch (cssError) {
        console.warn('Failed to apply CSS variables:', cssError);
      }
    } catch (e) {
      console.warn('Failed to sync theme to DOM:', e);
    }
  }
  /**
   * Save theme to settings.json and sync to other storage
   */
  async saveTheme(themeId) {
    if (!themeId || typeof themeId !== 'string') {
      console.error('Invalid theme ID:', themeId);
      return false;
    }

    // Skip if theme hasn't changed
    if (this.currentTheme === themeId) {
      console.log('Theme already set to', themeId, ', skipping save');
      return true;
    }

    this.currentTheme = themeId;

    // Check if theme is already set in settings.json
    try {
      const settings = ipcRenderer.sendSync('get-settings');
      if (settings?.theme === themeId) {
        console.log('Theme already saved in settings.json, skipping IPC call');
        // Still sync to other storage mechanisms
        this.syncThemeToStorage(themeId);
        return true;
      }
    } catch (e) {
      console.warn('Failed to check current settings:', e);
    }

    // Save to settings.json using IPC
    try {
      const result = ipcRenderer.sendSync('set-setting', 'theme', themeId);
      if (result !== true) {
        throw new Error('Failed to save theme to settings');
      }
    } catch (e) {
      console.error('Failed to save theme to settings:', e);
      return false;
    }

    // Sync to other storage mechanisms
    this.syncThemeToStorage(themeId);

    // Broadcast to other windows
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ theme: themeId });
      }
    } catch (e) {
      console.warn('Failed to broadcast theme change:', e);
    }

    return true;
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }
}

// Export singleton instance
const themeStorage = new ThemeStorageManager();
module.exports = themeStorage;
