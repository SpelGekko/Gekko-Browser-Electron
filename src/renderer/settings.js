/**
 * Gekko Browser Renderer - Settings Management
 *
 * This file contains functions for loading, applying, and handling
 * settings within the renderer process.
 */

import { applyTheme } from './theme.js';
import { setVerticalTaskbarExpanded, bindVerticalTaskbarHoverState } from './layout.js';
import { setCachedSettings, getCachedSettings, setMemorySaverEnabled, setMemorySaverIdleMs, memorySaverIntervalId, setMemorySaverIntervalId } from './core/state.js';
import { runMemorySaver } from './memory.js';

/**
 * Gets settings from the main process.
 * @returns {object} The settings object.
 */
export function getSettings() {
  try {
    const settings = window.api.getSettings();
    return settings && !settings._error ? settings : { theme: 'dark' };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { theme: 'dark' };
  }
}

/**
 * Safely loads settings, using a cached version if available.
 * @returns {object} The settings object.
 */
export function loadSettingsSafely() {
  try {
    let cachedSettings = getCachedSettings();
    // Use cached settings if available
    if (!cachedSettings) {
      cachedSettings = window.api.getSettings();
      setCachedSettings(cachedSettings);
    }
    return cachedSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return { theme: 'dark' };
  }
}

/**
 * Applies layout-related settings to the UI.
 * @param {object} settings - The settings object.
 */
export function applyLayoutSettings(settings) {
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

/**
 * Applies memory-saver settings.
 * @param {object} settings - The settings object.
 */
export function applyMemorySettings(settings) {
    const enabled = settings?.memorySaverEnabled !== false;
    const idleMs = getMemorySaverIdleMs(settings);
    const memorySaverEnabled = getCachedSettings()?.memorySaverEnabled;
    const memorySaverIdleMs = getCachedSettings()?.memorySaverIdleMs;
    const shouldReset = enabled !== memorySaverEnabled || idleMs !== memorySaverIdleMs;

    setMemorySaverEnabled(enabled);
    setMemorySaverIdleMs(idleMs);

    if (!shouldReset) {
      return;
    }

    if (memorySaverIntervalId) {
      clearInterval(memorySaverIntervalId);
      setMemorySaverIntervalId(null);
    }

    if (enabled) {
      const intervalMs = Math.min(60 * 1000, Math.max(10 * 1000, Math.floor(idleMs / 2)));
      const newIntervalId = setInterval(runMemorySaver, intervalMs);
      setMemorySaverIntervalId(newIntervalId);
      runMemorySaver();
    }
}

function getMemorySaverIdleMs(settings) {
    const minutes = Number(settings?.memorySaverIdleMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return 15 * 60 * 1000;
    }
    return minutes * 60 * 1000;
}

/**
 * Handles updates to the settings.
 * @param {object} settings - The new settings object.
 */
export function handleSettingsUpdate(settings) {
    console.group('Settings Update');
    console.log('Settings update received:', settings);
    
    let cachedSettings = getCachedSettings();
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
    setCachedSettings(settings);
    
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
}
