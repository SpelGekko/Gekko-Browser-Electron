/**
 * Gekko Browser Renderer - Layout Management
 *
 * This file contains functions for managing the browser's UI layout,
 * including the vertical taskbar state.
 */

import { setVerticalTaskbarHoverListenersBound, verticalTaskbarHoverListenersBound } from './core/state.js';

/**
 * Toggles the expanded state of the vertical taskbar.
 * @param {boolean} isExpanded - Whether the taskbar should be expanded.
 */
export function setVerticalTaskbarExpanded(isExpanded) {
  if (document.body) {
    document.body.classList.toggle('taskbar-expanded', isExpanded);
  }
  document.documentElement.classList.toggle('taskbar-expanded', isExpanded);
}

/**
 * Binds hover and focus events to the vertical taskbar to control its
 * expanded/collapsed state.
 */
export function bindVerticalTaskbarHoverState() {
  if (verticalTaskbarHoverListenersBound) {
    return;
  }

  const tabBarElement = document.getElementById('tab-bar');
  if (!tabBarElement) {
    return;
  }

  setVerticalTaskbarHoverListenersBound(true);

  const expandTaskbar = () => setVerticalTaskbarExpanded(true);
  const collapseTaskbar = () => setVerticalTaskbarExpanded(false);

  tabBarElement.addEventListener('mouseenter', expandTaskbar);
  tabBarElement.addEventListener('mouseleave', collapseTaskbar);
  tabBarElement.addEventListener('focusin', expandTaskbar);
  tabBarElement.addEventListener('focusout', (event) => {
    if (!tabBarElement.contains(event.relatedTarget)) {
      collapseTaskbar();
    }
  });
}
