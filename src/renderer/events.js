/**
 * Gekko Browser Renderer - Event Listeners
 *
 * This file is responsible for setting up all the initial event listeners
 * for the main browser UI, delegating actions to the appropriate modules.
 */

import { createTab } from './tabs.js';
import { goBack, goForward, refresh, goHome, handleNavigation } from './navigation.js';
import { clearAddressBar, toggleTabList } from './ui.js';
import { toggleBookmark, loadBookmarks, renderBookmarksBar } from './bookmarks.js';
import { navigateTo } from './navigation.js';
import { setIncognito, isIncognito as getIsIncognito, hasUpdateAvailable, updateInfo } from './core/state.js';
import { handleDownloadUpdate } from './downloads.js';
import { handleTabContextAction } from './contextMenu.js';
import { openWorkspaceTabs } from './workspaces.js';
import { handleSettingsUpdate } from './settings.js';
import { showUpdateToast } from './updates.js';
import { applyTheme, applyThemeToWebview } from './theme.js';

/**
 * Verifies that all essential UI elements are present in the DOM.
 * @returns {boolean} True if all elements are found, false otherwise.
 */
function verifyRequiredElements() {
    const requiredIds = [
      'tab-bar', 'new-tab-button', 'browser-content', 'address-bar', 
      'address-protocol', 'back-button', 'forward-button', 'refresh-button', 
      'home-button', 'clear-button', 'update-notification-button', 'update-badge',
      'bookmarks-button', 'history-button', 'incognito-button', 'settings-button',
      'minimize-button', 'maximize-button', 'close-button', 'status-text',
      'status-security', 'security-text', 'bookmarks-bar'
    ];
    return requiredIds.every(id => {
        if (!document.getElementById(id)) {
            console.error(`Required element not found: #${id}`);
            return false;
        }
        return true;
    });
}

/**
 * Sets up all the main event listeners for the browser window.
 */
export function setupEventListeners() {
  if (!verifyRequiredElements()) {
    console.error('Cannot setup event listeners because some required UI elements are missing.');
    return;
  }

  // Window controls
  document.getElementById('minimize-button').addEventListener('click', () => window.api.minimize());
  document.getElementById('maximize-button').addEventListener('click', () => window.api.maximize());
  document.getElementById('close-button').addEventListener('click', () => window.api.close());
  
  // Tab management
  document.getElementById('new-tab-button').addEventListener('click', () => createTab());
  document.getElementById('tab-list-button').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTabList();
  });
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('tab-list-dropdown');
    const button = document.getElementById('tab-list-button');
    if (dropdown?.classList.contains('visible') && !dropdown.contains(e.target) && e.target !== button && !button?.contains(e.target)) {
      dropdown.classList.remove('visible');
    }
  });
  document.getElementById('tab-bar').addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      const isVertical = document.body.classList.contains('vertical-taskbar');
      const scrollAmount = e.deltaY > 0 ? 50 : -50;
      document.getElementById('tab-bar').scrollBy({ [isVertical ? 'top' : 'left']: scrollAmount, behavior: 'smooth' });
    }
  }, { passive: false });
  
  // Navigation controls
  document.getElementById('back-button').addEventListener('click', goBack);
  document.getElementById('forward-button').addEventListener('click', goForward);
  document.getElementById('refresh-button').addEventListener('click', refresh);
  document.getElementById('home-button').addEventListener('click', goHome);
  
  // Address bar
  document.getElementById('address-bar').addEventListener('keydown', (e) => e.key === 'Enter' && handleNavigation(e.target.value));
  document.getElementById('clear-button').addEventListener('click', clearAddressBar);
  document.getElementById('bookmark-page-button').addEventListener('click', toggleBookmark);

  // Toolbar buttons
  document.getElementById('update-notification-button').addEventListener('click', () => {
    navigateTo('gkp://update.gekko/');
    if (hasUpdateAvailable) showUpdateToast(updateInfo);
  });
  document.getElementById('bookmarks-button').addEventListener('click', () => navigateTo('gkp://bookmarks.gekko/'));
  document.getElementById('history-button').addEventListener('click', () => navigateTo('gkp://history.gekko/'));
  document.getElementById('settings-button').addEventListener('click', () => navigateTo('gkp://settings.gekko/'));
  document.getElementById('downloads-button').addEventListener('click', () => navigateTo('gkp://downloads.gekko/'));
  document.getElementById('passwords-button').addEventListener('click', () => navigateTo('gkp://passwords.gekko/'));
  
  // Incognito mode
  document.getElementById('incognito-button').addEventListener('click', () => {
    const isIncognito = window.api.toggleIncognitoMode();
    setIncognito(isIncognito);
    document.getElementById('incognito-button').classList.toggle('incognito-active', isIncognito);
    const statusText = document.getElementById('status-text');
    statusText.textContent = `Incognito Mode: ${isIncognito ? 'ON' : 'OFF'}`;
    setTimeout(() => {
        if (getIsIncognito() === isIncognito) {
            statusText.textContent = isIncognito ? 'Ready (Incognito)' : 'Ready';
        }
    }, 2000);
  });

  // IPC Listeners from main process
  window.api.onOpenNewTab((url) => createTab(url));
  window.api.onNavigate((url) => navigateTo(url));
  window.api.onUpdateStatus((status, info) => {
    document.getElementById('update-notification-button').classList.toggle('update-button-active', status === 'available');
    document.getElementById('update-badge').classList.toggle('available', status === 'available');
    if (status === 'available') showUpdateToast(info);
  });
  window.api.onDownloadUpdate(handleDownloadUpdate);
  window.api.onTabContextAction(handleTabContextAction);
  window.api.onBookmarksUpdated(() => {
    loadBookmarks();
    renderBookmarksBar();
  });
  window.api.onWorkspaceOpen(openWorkspaceTabs);
  window.api.onSettingsUpdated(handleSettingsUpdate);

  // Message listener for internal pages
  window.addEventListener('message', (event) => {
    const { type, url, theme, workspace } = event.data;
    if (type === 'navigate' && url) handleNavigation(url);
    if (type === 'themeChange' && theme) {
      localStorage.setItem('gekko-theme', theme);
      window.api.setSetting('theme', theme);
      applyTheme(theme);
    }
    if (type === 'open-workspace' && workspace) openWorkspaceTabs(workspace);
  });
}
