/**
 * Gekko Browser Renderer - Downloads
 *
 * This file contains functions for creating and managing download
 * notification UI elements.
 */

import { formatBytes } from './utils.js';

/**
 * Creates the HTML for a download notification item.
 * @param {object} item - The download item object from the main process.
 * @returns {HTMLElement} The notification element.
 */
function createDownloadNotification(item) {
    const notification = document.createElement('div');
    notification.id = `download-${item.startTime}`;
    notification.className = 'download-notification-item';

    notification.innerHTML = `
        <div class="download-icon"><i class="fa-solid fa-download"></i></div>
        <div class="download-info">
            <div class="download-filename">${item.filename}</div>
            <div class="download-progress-container">
                <div class="download-progress-bar"><div class="download-progress-fill"></div></div>
                <span class="download-progress-text">Starting...</span>
            </div>
        </div>
        <div class="download-actions">
            <div class="download-action-button cancel-download" title="Cancel"><i class="fa-solid fa-xmark"></i></div>
        </div>
    `;

    notification.querySelector('.cancel-download').addEventListener('click', () => {
        window.api.cancelDownload(item.startTime);
    });

    return notification;
}

/**
 * Handles download update events to provide visual feedback in the UI.
 * @param {object} item - The updated download item object.
 */
export function handleDownloadUpdate(item) {
    const container = document.getElementById('download-notifications-container');
    if (!container) return;

    let notification = document.getElementById(`download-${item.startTime}`);

    if (!notification) {
        notification = createDownloadNotification(item);
        container.appendChild(notification);
        setTimeout(() => notification.classList.add('visible'), 100);
    }

    const progressBar = notification.querySelector('.download-progress-fill');
    const progressText = notification.querySelector('.download-progress-text');
    const percent = Math.floor((item.receivedBytes / item.totalBytes) * 100);

    if (progressBar) progressBar.style.width = `${percent}%`;

    if (progressText && item.state === 'progressing') {
        progressText.textContent = `${formatBytes(item.receivedBytes)} / ${formatBytes(item.totalBytes)} (${percent}%)`;
    }
    
    notification.classList.remove('completed', 'cancelled', 'interrupted');
    const actionsContainer = notification.querySelector('.download-actions');

    switch (item.state) {
        case 'completed':
            notification.classList.add('completed');
            if (progressText) progressText.textContent = 'Completed';
            if (actionsContainer) actionsContainer.innerHTML = `<div class="download-action-button open-folder" title="Show in folder"><i class="fa-solid fa-folder"></i></div>`;
            notification.querySelector('.open-folder').addEventListener('click', () => window.api.showDownloadInFolder(item.startTime));
            setTimeout(() => notification.classList.remove('visible'), 4000);
            break;
        case 'cancelled':
            notification.classList.add('cancelled');
            if (progressText) progressText.textContent = 'Cancelled';
            if (actionsContainer) actionsContainer.innerHTML = '';
            setTimeout(() => notification.classList.remove('visible'), 2000);
            break;
        case 'interrupted':
            notification.classList.add('interrupted');
            if (progressText) progressText.textContent = 'Interrupted';
            if (actionsContainer) actionsContainer.innerHTML = '';
            setTimeout(() => notification.classList.remove('visible'), 2000);
            break;
    }
}
