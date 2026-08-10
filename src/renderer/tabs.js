/**
 * Gekko Browser Renderer - Tab Management
 *
 * This file contains the core logic for creating, managing, and interacting
 * with browser tabs and their associated webviews.
 */

import { tabs, setTabs, currentTabId, setCurrentTabId, splitViewState } from './core/state.js';
import { generateTabId, isInternalUrl, getInternalFaviconUrl } from './utils.js';
import { renderWebviewsForCurrentLayout } from './webview.js';
import { restoreDiscardedTab } from './memory.js';
import { scheduleSessionSave } from './session.js';

let draggedTabId = null;

/**
 * Creates a new tab and its associated webview.
 * @param {string} [url] - The URL to load in the new tab.
 * @param {object} [options={}] - Options for tab creation.
 * @returns {string} The ID of the newly created tab.
 */
export function createTab(url, options = {}) {
  const settings = window.api.getSettings();
  let tabId = options.preferredId || generateTabId();
  if (getTabById(tabId)) {
    tabId = generateTabId();
  }
  const homePage = settings.homePage || 'gkp://home.gekko/';
  const shouldActivate = options.activate !== false;
  const pinned = Boolean(options.pinned);
  const splitPane = options.splitPane === 'left' || options.splitPane === 'right' ? options.splitPane : null;

  url = url || homePage;
  
  const tabElement = document.createElement('div');
  tabElement.className = 'tab';
  tabElement.setAttribute('data-tab-id', tabId);
  tabElement.innerHTML = `
    <div class="tab-content">
      <div class="tab-icon"><i class="fa-solid fa-globe"></i></div>
      <div class="tab-title">New Tab</div>
    </div>
    <div class="tab-close"><i class="fa-solid fa-xmark"></i></div>
  `;

  const newTabButton = document.getElementById('new-tab-button');
  const tabBar = document.getElementById('tab-bar');
  tabBar.insertBefore(tabElement, newTabButton);

  // Create the WebContentsView in the main process and start loading the URL
  window.api.wcvCreate(tabId, url);

  const pinnedTabs = tabs.filter(t => t.pinned === pinned);
  const nextTabOrder = pinnedTabs.length > 0 
    ? Math.max(...pinnedTabs.map(t => Number.isFinite(t.tabOrder) ? t.tabOrder : 0)) + 1 
    : 0;

  tabs.push({
    id: tabId,
    url: url,
    title: 'New Tab',
    favicon: null,
    element: tabElement,
    pinned,
    splitPane,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    isDiscarded: false,
    discardedUrl: null,
    tabOrder: nextTabOrder
  });

  applyTabVisualState(tabId);
  renderTabOrder();

  if (isInternalUrl(url)) {
    updateTabFavicon(tabId, getInternalFaviconUrl());
  }

  tabElement.querySelector('.tab-content').addEventListener('click', () => setActiveTab(tabId));
  tabElement.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });
  
  tabElement.addEventListener('contextmenu', handleTabContextMenu);
  tabElement.draggable = true;
  tabElement.addEventListener('dragstart', (e) => handleTabDragStart(e, tabId));
  tabElement.addEventListener('dragend', handleTabDragEnd);
  tabElement.addEventListener('dragover', (e) => handleTabDragOver(e, tabId));
  tabElement.addEventListener('dragleave', (e) => handleTabDragLeave(e, tabId));
  tabElement.addEventListener('drop', (e) => handleTabDrop(e, tabId));

  if (shouldActivate) {
    setActiveTab(tabId);
  }

  scheduleSessionSave();
  return tabId;
}

/**
 * Sets the specified tab as the active one.
 * @param {string} tabId - The ID of the tab to activate.
 */
export function setActiveTab(tabId) {
  const previousTab = getTabById(currentTabId);
  if (previousTab) {
    previousTab.lastActiveAt = Date.now();
  }
  setCurrentTabId(tabId);

  const targetTab = getTabById(tabId);
  if (targetTab) {
    targetTab.lastActiveAt = Date.now();
    if (targetTab.isDiscarded) {
      restoreDiscardedTab(targetTab);
    }
    // Logic for split view handling
  }
  
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  const activeTabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (activeTabElement) {
    activeTabElement.classList.add('active');
  }
  
  renderWebviewsForCurrentLayout();

  // Update address bar and nav buttons for the newly active tab
  const newActiveTab = getTabById(tabId);
  if (newActiveTab) {
    import('./ui.js').then(({ updateAddressBar, updateProtocolIndicator }) => {
      updateAddressBar(newActiveTab.url || '', tabId);
      updateProtocolIndicator(newActiveTab.url || '');
    }).catch(() => {});
  }
  import('./navigation.js').then(({ updateNavigationButtons }) => {
    updateNavigationButtons(tabId);
  }).catch(() => {});

  renderTabList();
  scheduleSessionSave();
}

/**
 * Closes a tab and removes its elements.
 * @param {string} tabId - The ID of the tab to close.
 */
export function closeTab(tabId) {
  const tabIndex = tabs.findIndex(tab => tab.id === tabId);
  if (tabIndex === -1) return;

  const tab = tabs[tabIndex];
  tab.element.remove();
  window.api.wcvDestroy(tabId);

  tabs.splice(tabIndex, 1);

  // Handle split view state
  if (splitViewState.leftTabId === tabId) splitViewState.leftTabId = null;
  if (splitViewState.rightTabId === tabId) splitViewState.rightTabId = null;
  if (splitViewState.enabled && (!splitViewState.leftTabId || !splitViewState.rightTabId)) {
    // disableSplitView();
  }
  
  if (currentTabId === tabId) {
    if (tabs.length > 0) {
      setActiveTab(tabs[tabs.length - 1].id);
    } else {
      createTab();
    }
  }

  renderTabList();
  scheduleSessionSave();
}

export function getTabById(tabId) {
    return tabs.find(tab => tab.id === tabId);
}

export function getTabIdsInOrder() {
    const tabBar = document.getElementById('tab-bar');
    return Array.from(tabBar.querySelectorAll('.tab'))
      .map(tab => tab.getAttribute('data-tab-id'))
      .filter(Boolean);
}

export function getOrderedTabs() {
    return [...tabs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const aOrder = Number.isFinite(a.tabOrder) ? a.tabOrder : Number.MAX_VALUE;
      const bOrder = Number.isFinite(b.tabOrder) ? b.tabOrder : Number.MAX_VALUE;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
}

export function renderTabOrder() {
    const ordered = getOrderedTabs();
    const tabBar = document.getElementById('tab-bar');
    const newTabButton = document.getElementById('new-tab-button');
    ordered.forEach((tab) => {
      if (tab.element && tab.element.parentNode === tabBar) {
        tabBar.insertBefore(tab.element, newTabButton);
      }
    });
    // updateScrollButtonVisibility();
    renderTabList();
}

export function renderTabList() {
    const tabListItems = document.getElementById('tab-list-items');
    if (!tabListItems) return;

    tabListItems.innerHTML = '';
    const ordered = getOrderedTabs();

    if (ordered.length === 0) {
      tabListItems.innerHTML = '<div style="padding: 10px 12px; color: var(--textSecondary); font-size: 12px;">No open tabs</div>';
      return;
    }

    ordered.forEach((tab) => {
      const item = document.createElement('div');
      item.className = `tab-list-item ${tab.id === currentTabId ? 'active' : ''}`;
      const iconHtml = tab.favicon ? `<img src="${tab.favicon}" alt="">` : '<i class="fa-solid fa-globe"></i>';
      item.innerHTML = `<div class="tab-list-item-icon">${iconHtml}</div><div class="tab-list-item-title" title="${tab.title || 'New Tab'}">${tab.title || 'New Tab'}</div>`;
      item.addEventListener('click', () => {
        setActiveTab(tab.id);
        document.getElementById('tab-list-dropdown').classList.remove('visible');
      });
      tabListItems.appendChild(item);
    });
}

export function applyTabVisualState(tabId) {
    const tab = getTabById(tabId);
    if (!tab || !tab.element) return;

    tab.element.classList.toggle('tab-pinned', Boolean(tab.pinned));
    tab.element.classList.toggle('tab-split-left', tab.splitPane === 'left');
    tab.element.classList.toggle('tab-split-right', tab.splitPane === 'right');
    tab.element.setAttribute('title', tab.title || 'New Tab');
}

// Drag and Drop handlers
function handleTabDragStart(e, tabId) {
    draggedTabId = tabId;
    const tab = getTabById(tabId);
    if (tab && tab.element) {
      tab.element.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tabId);
    }
}

function handleTabDragEnd(e) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('dragging', 'drag-over-left', 'drag-over-right'));
    draggedTabId = null;
}

function handleTabDragOver(e, tabId) {
    e.preventDefault();
    if (!draggedTabId || draggedTabId === tabId) return;
    
    const targetTab = getTabById(tabId);
    if (!targetTab) return;

    const rect = targetTab.element.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    targetTab.element.classList.remove('drag-over-left', 'drag-over-right');
    targetTab.element.classList.add(e.clientX < midpoint ? 'drag-over-left' : 'drag-over-right');
}

function handleTabDragLeave(e, tabId) {
    const tab = getTabById(tabId);
    if (tab && tab.element) {
      tab.element.classList.remove('drag-over-left', 'drag-over-right');
    }
}

function handleTabDrop(e, targetTabId) {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTabId || draggedTabId === targetTabId) return;

    const draggedTab = getTabById(draggedTabId);
    const targetTab = getTabById(targetTabId);
    if (!draggedTab || !targetTab || draggedTab.pinned !== targetTab.pinned) return;

    const rect = targetTab.element.getBoundingClientRect();
    const dropLeft = e.clientX < rect.left + rect.width / 2;

    const sameStateTabs = tabs.filter(t => t.pinned === draggedTab.pinned).sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
    const draggedIndex = sameStateTabs.findIndex(t => t.id === draggedTabId);
    let targetIndex = sameStateTabs.findIndex(t => t.id === targetTabId);

    sameStateTabs.splice(draggedIndex, 1);
    if (draggedIndex < targetIndex) targetIndex--;
    
    const newIndex = dropLeft ? targetIndex : targetIndex + 1;
    sameStateTabs.splice(newIndex, 0, draggedTab);

    sameStateTabs.forEach((tab, index) => tab.tabOrder = index);

    renderTabOrder();
    scheduleSessionSave();
}

function handleTabContextMenu(event) {
    if (!window.api || typeof window.api.showContextMenu !== 'function') return;

    const tabElement = event.target.closest('.tab');
    if (!tabElement) return;

    event.preventDefault();
    const tabId = tabElement.getAttribute('data-tab-id');
    if (!tabId) return;

    const tabIds = getTabIdsInOrder();
    const tab = getTabById(tabId);

    window.api.showContextMenu({
      context: 'tab',
      tabId,
      tabIndex: tabIds.indexOf(tabId),
      tabCount: tabIds.length,
      isPinned: Boolean(tab?.pinned),
      splitPane: tab?.splitPane || '',
      splitEnabled: splitViewState.enabled,
      x: event.x,
      y: event.y
    });
}

// createWebviewForTab is intentionally removed — tabs are now WebContentsView
// instances managed by the main process, created via window.api.wcvCreate()

export function updateTabTitle(tabId, title) {
    const tab = getTabById(tabId);
    if (tab) {
        tab.title = title;
        const titleEl = tab.element.querySelector('.tab-title');
        if (titleEl) titleEl.textContent = title;
        renderTabList();
        scheduleSessionSave();
    }
}

export function getTabTitle(tabId) {
    const tab = getTabById(tabId);
    return tab ? tab.title : 'New Tab';
}

export function updateTabFavicon(tabId, faviconUrl) {
    const tab = getTabById(tabId);
    if (tab) {
        tab.favicon = faviconUrl;
        const iconEl = tab.element.querySelector('.tab-icon');
        if (iconEl) {
            iconEl.innerHTML = `<img src="${faviconUrl}" alt="" width="16" height="16">`;
        }
    }
}
