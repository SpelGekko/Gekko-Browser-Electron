/**
 * Gekko Browser Renderer - Updates
 *
 * This file contains functions for handling application updates,
 * including showing toast notifications.
 */

import { updateToastTimeout, setUpdateToastTimeout } from './core/state.js';
import { navigateTo } from './navigation.js';

/**
 * Shows a toast notification when an update is available.
 * @param {object} info - The update information object.
 */
export function showUpdateToast(info) {
  if (updateToastTimeout) {
    clearTimeout(updateToastTimeout);
  }
  
  const existingToast = document.querySelector('.update-notification-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'update-notification-toast';
  toast.innerHTML = `
    <div class="update-icon"><i class="fa-solid fa-arrow-up-right-from-square"></i></div>
    <div class="toast-content">
      <div class="toast-title">Update Available</div>
      <div class="toast-message">Version ${info.version} is now available.</div>
    </div>
    <div class="close-toast"><i class="fa-solid fa-xmark"></i></div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('visible'), 100);
  
  const newTimeoutId = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  setUpdateToastTimeout(newTimeoutId);
  
  toast.querySelector('.close-toast').addEventListener('click', () => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
    clearTimeout(newTimeoutId);
  });
  
  toast.addEventListener('click', (event) => {
    if (!event.target.closest('.close-toast')) {
      navigateTo('gkp://update.gekko/');
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
      clearTimeout(newTimeoutId);
    }
  });
}
