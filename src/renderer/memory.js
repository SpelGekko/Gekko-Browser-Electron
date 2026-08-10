/**
 * Gekko Browser Renderer - Memory Management
 *
 * Discards inactive tabs by destroying their WebContentsView in the main
 * process, and restores them by re-creating the view on demand.
 */

import { tabs, memorySaverEnabled, memorySaverIdleMs, currentTabId } from './core/state.js';
import { isInternalUrl } from './utils.js';

export function runMemorySaver() {
  if (!memorySaverEnabled) return;

  const now = Date.now();
  tabs.forEach((tab) => {
    if (!tab || tab.id === currentTabId || tab.isDiscarded) return;
    if (isInternalUrl(tab.url || '')) return;
    const lastActiveAt = tab.lastActiveAt || tab.createdAt || 0;
    if (now - lastActiveAt < memorySaverIdleMs) return;
    discardTab(tab);
  });
}

export function discardTab(tab) {
  if (!tab || tab.isDiscarded) return;

  tab.discardedUrl = tab.url || '';
  tab.isDiscarded = true;
  tab.element?.classList.add('tab-discarded');
  window.api.wcvDestroy(tab.id);
}

export function restoreDiscardedTab(tab) {
  if (!tab || !tab.isDiscarded) return;

  const settings = window.api.getSettings();
  const fallbackUrl = settings?.homePage || 'gkp://home.gekko/';
  const restoreUrl = tab.discardedUrl || tab.url || fallbackUrl;

  window.api.wcvCreate(tab.id, restoreUrl);
  tab.isDiscarded = false;
  tab.discardedUrl = null;
  tab.element?.classList.remove('tab-discarded');
}
