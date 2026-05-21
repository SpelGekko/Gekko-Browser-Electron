/**
 * Gekko Browser Renderer - Utilities
 *
 * This file contains utility and helper functions that are used across
 * different parts of the renderer process.
 */

/**
 * Gets a user-friendly error message for settings-related errors.
 * @param {object} error - The error object from the settings API.
 * @returns {string} A user-friendly error message.
 */
export function getSettingsErrorMessage(error) {
  const messages = {
    cannot_create_dir: 'Could not create settings directory',
    cannot_create_file: 'Could not create settings file',
    cannot_write: 'Could not save settings',
    cannot_read: 'Could not read settings',
    invalid_json: 'Settings file is corrupted'
  };
  
  return messages[error.error] || 'Unknown settings error';
}

/**
 * Creates or updates a DOM-based marker to store the current theme ID.
 * This helps persist the theme state within the DOM itself.
 * @param {string} themeId - The ID of the theme to mark (e.g., 'dark', 'light').
 * @returns {boolean} True if the marker was created/updated successfully, false otherwise.
 */
export function createThemeMarker(themeId) {
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

/**
 * Formats a number of bytes into a human-readable string (e.g., '1.23 MB').
 * @param {number} bytes - The number of bytes.
 * @param {number} [decimals=2] - The number of decimal places to use.
 * @returns {string} The formatted string.
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generates a unique ID for a new tab.
 * @returns {string} A unique tab ID string.
 */
export function generateTabId() {
  return 'tab-' + Date.now() + Math.random().toString(36).substr(2, 9);
}

/**
 * Checks if a given URL is an internal Gekko protocol URL.
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL is internal, false otherwise.
 */
export function isInternalUrl(url) {
  return typeof url === 'string' && (url.startsWith('gkp://') || url.startsWith('gkps://'));
}

/**
 * Gets the URL for the internal Gekko favicon.
 * @returns {string} The favicon URL.
 */
export function getInternalFaviconUrl() {
  return 'gkp://assets.gekko/icons/32x32.png';
}
