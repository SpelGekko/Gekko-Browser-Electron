import { getSettings, loadSettingsSafely, applyLayoutSettings, applyMemorySettings, handleSettingsUpdate } from './renderer/settings.js';
import { applyTheme } from './renderer/theme.js';
import { setupEventListeners } from './renderer/events.js';
import { initializeSession, buildSessionSnapshot } from './renderer/session.js';
import { loadBookmarks, renderBookmarksBar } from './renderer/bookmarks.js';
import { setIncognito } from './renderer/core/state.js';
import { initCredentialsPrompt } from './renderer/credentials.js';

document.addEventListener('DOMContentLoaded', () => {
  // Mark that the session did not exit cleanly
  if (window.api?.markSessionCleanExit) {
    window.api.markSessionCleanExit(false);
  }

  // Load initial settings and theme
  const settings = loadSettingsSafely();
  const theme = localStorage.getItem('gekko-theme') || settings.theme || 'dark';
  
  applyTheme(theme);
  applyLayoutSettings(settings);
  applyMemorySettings(settings);

  // Initialize bookmarks
  loadBookmarks();
  renderBookmarksBar();

  // Initialize incognito mode state
  const isIncognito = window.api.getIncognitoMode();
  setIncognito(isIncognito);
  const incognitoButton = document.getElementById('incognito-button');
  if (incognitoButton) {
    incognitoButton.classList.toggle('incognito-active', isIncognito);
  }

  // Set up all event listeners
  setupEventListeners();

  // Initialize save-password prompt
  initCredentialsPrompt();

  // Restore previous session or start a new one
  initializeSession(settings);

  // Check for updates after a short delay
  setTimeout(() => {
    window.api?.checkForUpdates();
  }, 5000);

  // Add a handler for when the window is about to be unloaded
  window.addEventListener('beforeunload', () => {
    try {
      // This is a synchronous call to save the session state
      if (window.api?.saveSessionStateSync) {
        const snapshot = buildSessionSnapshot();
        window.api.saveSessionStateSync(snapshot);
      }
      // Mark that the session is exiting cleanly
      if (window.api?.markSessionCleanExit) {
        window.api.markSessionCleanExit(true);
      }
    } catch (error) {
      console.warn('Failed to save session on unload:', error);
    }
  });
});