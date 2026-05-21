/**
 * Gekko Browser Renderer - UI Updates
 *
 * This file contains functions that directly manipulate the DOM of the main
 * browser UI, such as updating the address bar, status indicators, and tab visuals.
 */

import { currentTabId, tabs } from './core/state.js';
import { renderTabList } from './tabs.js';

/**
 * Updates the address bar with a given URL and updates the tab's internal URL state.
 * @param {string} url - The URL to display.
 * @param {string} tabId - The ID of the tab being updated.
 */
export function updateAddressBar(url, tabId) {
  if (currentTabId === tabId) {
    document.getElementById('address-bar').value = url;
    updateProtocolIndicator(url);
  }
  
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    tab.url = url;
  }
}

/**
 * Updates the protocol indicator in the address bar based on the URL's protocol.
 * @param {string} url - The URL to analyze.
 */
export function updateProtocolIndicator(url) {
  const addressProtocol = document.getElementById('address-protocol');
  const statusSecurity = document.getElementById('status-security');
  
  try {
    if (!url) {
      addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
      statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">New Tab</span>';
      return;
    }
    
    addressProtocol.className = 'address-protocol';
    let icon, text, cssClass;

    if (url.startsWith('https://')) {
      icon = 'fa-lock';
      text = 'Secure';
      cssClass = 'protocol-secure';
    } else if (url.startsWith('http://')) {
      icon = 'fa-lock-open';
      text = 'Not Secure';
      cssClass = 'protocol-insecure';
    } else if (url.startsWith('gkps://')) {
      icon = 'fa-shield';
      text = 'GKP Secure';
      cssClass = 'protocol-secure';
    } else if (url.startsWith('gkp://')) {
      icon = 'fa-globe';
      text = 'GKP';
    } else if (url.startsWith('file://')) {
      icon = 'fa-file';
      text = 'Local File';
    } else {
      icon = 'fa-globe';
      text = 'Unknown';
    }

    addressProtocol.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    if (cssClass) addressProtocol.classList.add(cssClass);
    
    statusSecurity.innerHTML = `<div class="security-icon ${cssClass || ''}"><i class="fa-solid ${icon}"></i></div><span id="security-text">${text}</span>`;

  } catch (error) {
    console.error('Error updating protocol indicator:', error);
    addressProtocol.innerHTML = '<i class="fa-solid fa-globe"></i>';
    statusSecurity.innerHTML = '<div class="security-icon"><i class="fa-solid fa-globe"></i></div><span id="security-text">Ready</span>';
  }
}

/**
 * Updates the visual status of a tab (e.g., loading).
 * @param {string} tabId - The ID of the tab to update.
 * @param {string} status - The new status ('loading', 'complete', 'error').
 */
export function updateTabStatus(tabId, status) {
  const tab = tabs.find(t => t.id === tabId);
  const statusText = document.getElementById('status-text');
  
  if (tab) {
    if (status === 'loading') {
      tab.element.classList.add('loading');
      statusText.textContent = 'Loading...';
    } else {
      tab.element.classList.remove('loading');
      statusText.textContent = 'Complete';
      
      setTimeout(() => {
        if (statusText.textContent === 'Complete') {
          statusText.textContent = '';
        }
      }, 2000);
    }
  }
}

/**
 * Clears the text in the address bar and focuses it.
 */
export function clearAddressBar() {
  const addressBar = document.getElementById('address-bar');
  addressBar.value = '';
  addressBar.focus();
}

/**
 * Toggles the visibility of the tab list dropdown.
 */
export function toggleTabList() {
  const tabListDropdown = document.getElementById('tab-list-dropdown');
  if (!tabListDropdown) return;
  tabListDropdown.classList.toggle('visible');
  if (tabListDropdown.classList.contains('visible')) {
    renderTabList();
  }
}
