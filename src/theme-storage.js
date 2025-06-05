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
        this.currentTheme = e.newValue || 'dark';
        this.emit('theme-changed', this.currentTheme);
      }
    });

    // Listen for broadcasts from other windows
    try {
      this.broadcastChannel = new BroadcastChannel('gekko-theme');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.theme) {
          this.currentTheme = event.data.theme;
          this.emit('theme-changed', this.currentTheme);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }
  }

  /**
   * Load theme from all available storage mechanisms
   */
  loadTheme() {
    // Try IPC renderer first (most reliable)
    try {
      const settings = ipcRenderer.sendSync('get-settings');
      if (settings && settings.theme) {
        return settings.theme;
      }
    } catch (e) {
      console.warn('Failed to load theme from IPC:', e);
    }

    // Try DOM storage next
    try {
      const marker = document.getElementById('gekko-theme-marker');
      if (marker && marker.getAttribute('content')) {
        return marker.getAttribute('content');
      }
    } catch (e) {
      console.warn('Failed to load theme from DOM:', e);
    }

    // Try localStorage
    try {
      const theme = localStorage.getItem('gekko-theme');
      if (theme) {
        return theme;
      }
    } catch (e) {
      console.warn('Failed to load theme from localStorage:', e);
    }

    // Try sessionStorage
    try {
      const theme = sessionStorage.getItem('gekko-theme');
      if (theme) {
        return theme;
      }
    } catch (e) {
      console.warn('Failed to load theme from sessionStorage:', e);
    }

    // Default to dark theme
    return 'dark';
  }

  /**
   * Save theme to all available storage mechanisms
   */
  async saveTheme(themeId) {
    if (!themeId || typeof themeId !== 'string') {
      console.error('Invalid theme ID:', themeId);
      return false;
    }

    this.currentTheme = themeId;
    let success = false;

    // Save to IPC renderer (primary storage)
    try {
      ipcRenderer.send('set-setting', 'theme', themeId);
      success = true;
    } catch (e) {
      console.warn('Failed to save theme via IPC:', e);
    }

    // Save to DOM storage
    try {
      let marker = document.getElementById('gekko-theme-marker');
      if (!marker) {
        marker = document.createElement('meta');
        marker.id = 'gekko-theme-marker';
        marker.setAttribute('name', 'theme');
        document.head.appendChild(marker);
      }
      marker.setAttribute('content', themeId);
      success = true;
    } catch (e) {
      console.warn('Failed to save theme to DOM:', e);
    }

    // Save to localStorage (with retries)
    let retries = 3;
    while (retries > 0) {
      try {
        localStorage.setItem('gekko-theme', themeId);
        success = true;
        break;
      } catch (e) {
        console.warn(`Failed to save theme to localStorage (${retries} retries left):`, e);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries--;
      }
    }

    // Save to sessionStorage as backup
    try {
      sessionStorage.setItem('gekko-theme', themeId);
      success = true;
    } catch (e) {
      console.warn('Failed to save theme to sessionStorage:', e);
    }

    // Broadcast to other windows
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ theme: themeId });
      }
    } catch (e) {
      console.warn('Failed to broadcast theme change:', e);
    }

    this.emit('theme-changed', themeId);
    return success;
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
