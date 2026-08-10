import { getSettings, loadSettingsSafely, applyLayoutSettings, applyMemorySettings, handleSettingsUpdate } from './renderer/settings.js';
import { applyTheme } from './renderer/theme.js';
import { setupEventListeners } from './renderer/events.js';
import { initializeSession, buildSessionSnapshot } from './renderer/session.js';
import { loadBookmarks, renderBookmarksBar } from './renderer/bookmarks.js';
import { setIncognito } from './renderer/core/state.js';
import { initCredentialsPrompt } from './renderer/credentials.js';
import { FINGERPRINT_INJECT_CODE } from './renderer/fingerprint-inject.js';
import { COSMETIC_FILTER_CSS, COSMETIC_FILTER_JS } from './renderer/cosmetic-filter-inject.js';
import { YOUTUBE_ADBLOCK_CODE } from './renderer/youtube-adblock-inject.js';
import { setupWcvEventListeners } from './renderer/webview.js';

// ── Send inject codes to main process once (applied on every dom-ready) ──────
function registerInjectCodes() {
  window.api.wcvSetInjectCode('fingerprint', FINGERPRINT_INJECT_CODE);
  window.api.wcvSetInjectCode('cosmeticCss', COSMETIC_FILTER_CSS);
  window.api.wcvSetInjectCode('cosmeticJs', COSMETIC_FILTER_JS);
  window.api.wcvSetInjectCode('youtube', YOUTUBE_ADBLOCK_CODE);
}

// ── Measure chrome height and keep main process in sync ──────────────────────
function initChromeHeightObserver() {
  // Measure the full chrome area: header + bookmarks bar
  const header = document.querySelector('.browser-header');
  const bookmarks = document.getElementById('bookmarks-bar');
  if (!header) return;

  const prompt = document.getElementById('save-password-prompt');

  const report = () => {
    const h1 = header.getBoundingClientRect().height;
    const h2 = bookmarks ? bookmarks.getBoundingClientRect().height : 0;
    const total = Math.ceil(h1 + h2);
    console.log('[chrome height] header:', h1, 'bookmarks:', h2, 'total:', total);
    if (total > 0) window.api.wcvSetChromeHeight(total);
  };

  // Small delay so layout is complete before first measurement
  setTimeout(report, 50);
  const ro = new ResizeObserver(report);
  ro.observe(header);
  if (bookmarks) ro.observe(bookmarks);
  if (prompt) ro.observe(prompt);
}

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

  // Wire up WCV events from main process
  setupWcvEventListeners();

  // Register inject codes so main process can apply them on dom-ready
  registerInjectCodes();

  // Start observing chrome height
  initChromeHeightObserver();

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

  // Save session synchronously on unload
  window.addEventListener('beforeunload', () => {
    try {
      if (window.api?.saveSessionStateSync) {
        const snapshot = buildSessionSnapshot();
        window.api.saveSessionStateSync(snapshot);
      }
      if (window.api?.markSessionCleanExit) {
        window.api.markSessionCleanExit(true);
      }
    } catch (error) {
      console.warn('Failed to save session on unload:', error);
    }
  });
});
