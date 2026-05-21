/**
 * Gekko Browser Renderer - Workspaces
 *
 * This file contains functions for saving and opening workspaces.
 */

import { tabs, setLastWorkspaceOpen, lastWorkspaceOpenId, lastWorkspaceOpenTime } from './core/state.js';
import { createTab, setActiveTab } from './tabs.js';

/**
 * Saves the current set of open tabs as a new workspace.
 */
export async function saveWorkspaceFromTabs() {
  if (!window.api || typeof window.api.addWorkspace !== 'function') return;

  const tabsSnapshot = tabs.map((tab) => {
    let url = tab.url;
    try {
      if (tab.webview && typeof tab.webview.getURL === 'function') {
        url = tab.webview.getURL() || url;
      }
    } catch (error) { /* use fallback */ }
    
    return url ? { url, title: tab.title || url, pinned: Boolean(tab.pinned), splitPane: tab.splitPane || null } : null;
  }).filter(Boolean);

  if (tabsSnapshot.length === 0) return;

  const defaultName = `Workspace ${new Date().toISOString().slice(0, 16)}`;
  const name = await requestWorkspaceName(defaultName);
  if (name?.trim()) {
    window.api.addWorkspace({ name: name.trim(), tabs: tabsSnapshot });
  }
}

/**
 * Opens a dialog to prompt the user for a workspace name.
 * @param {string} defaultValue - The default value for the input.
 * @returns {Promise<string>} A promise that resolves with the entered name.
 */
function requestWorkspaceName(defaultValue) {
  return requestInputDialog({
    titleText: 'Save Workspace',
    descriptionText: 'Name this workspace to save your current tabs.',
    defaultValue,
    confirmText: 'Save'
  });
}

/**
 * Opens a generic input dialog.
 * @param {object} options - The options for the dialog.
 * @returns {Promise<string>} A promise that resolves with the input value.
 */
function requestInputDialog({ titleText, descriptionText, defaultValue, confirmText }) {
  return new Promise((resolve) => {
    const existing = document.querySelector('.workspace-prompt-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'workspace-prompt-overlay';
    overlay.innerHTML = `
      <div class="workspace-prompt">
        <div class="workspace-prompt-title">${titleText}</div>
        <div class="workspace-prompt-description">${descriptionText}</div>
        <input class="workspace-prompt-input" type="text" value="${defaultValue}">
        <div class="workspace-prompt-actions">
          <button class="workspace-prompt-button cancel">Cancel</button>
          <button class="workspace-prompt-button primary">${confirmText}</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('input');
    const cleanup = (value) => {
      overlay.remove();
      resolve(value);
    };

    overlay.querySelector('.cancel').addEventListener('click', () => cleanup(''));
    overlay.querySelector('.primary').addEventListener('click', () => cleanup(input.value));
    overlay.addEventListener('click', (e) => e.target === overlay && cleanup(''));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') cleanup(input.value);
      if (e.key === 'Escape') cleanup('');
    });

    document.body.appendChild(overlay);
    input.focus();
    input.select();
  });
}

/**
 * Opens the tabs defined in a workspace object.
 * @param {object} workspace - The workspace object.
 */
export function openWorkspaceTabs(workspace) {
  if (!workspace || !Array.isArray(workspace.tabs)) return;

  const now = Date.now();
  if (workspace.id && workspace.id === lastWorkspaceOpenId && now - lastWorkspaceOpenTime < 1500) {
    return;
  }
  setLastWorkspaceOpen(workspace.id || null);

  let lastTabId = null;
  workspace.tabs.forEach((tab) => {
    if (tab?.url) {
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
