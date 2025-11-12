document.addEventListener('DOMContentLoaded', () => {
    const downloadsList = document.getElementById('downloads-list');
    const clearButton = document.getElementById('clear-downloads');
    const inProgress = new Map();

    function renderAll() {
        const historicalDownloads = window.api.getDownloads();
        downloadsList.innerHTML = '';

        const allItems = [...inProgress.values(), ...historicalDownloads];
        
        // Remove duplicates, keeping the one from inProgress
        const uniqueItems = allItems.filter((item, index, self) => 
            index === self.findIndex((t) => t.startTime === item.startTime)
        );

        // Sort items: progressing first, then by time
        uniqueItems.sort((a, b) => {
            if (a.state === 'progressing' && b.state !== 'progressing') return -1;
            if (a.state !== 'progressing' && b.state === 'progressing') return 1;
            return b.startTime - a.startTime;
        });

        if (uniqueItems.length === 0) {
            downloadsList.innerHTML = '<li><p>No downloads yet.</p></li>';
            return;
        }

        uniqueItems.forEach(item => {
            const downloadItem = createDownloadElement(item);
            downloadsList.appendChild(downloadItem);
        });
    }

    function createDownloadElement(item) {
        const li = document.createElement('li');
        li.className = 'download-item';
        li.id = `download-${item.startTime}`;
        li.dataset.state = item.state;

        const received = item.receivedBytes || 0;
        const total = item.totalBytes || 0;
        const progress = total > 0 ? Math.floor((received / total) * 100) : 0;

        let statusText = '';
        switch (item.state) {
            case 'progressing':
                statusText = `${formatBytes(received)} / ${formatBytes(total)} (${progress}%)`;
                break;
            case 'completed':
                statusText = `Completed - ${formatBytes(total)}`;
                break;
            case 'cancelled':
                statusText = 'Cancelled';
                break;
            case 'interrupted':
                statusText = 'Interrupted';
                break;
            default:
                statusText = `Finished - ${formatBytes(total)}`;
        }

        li.innerHTML = `
            <div class="download-icon"><i class="fa-solid fa-file"></i></div>
            <div class="download-info">
                <div class="download-filename">${item.filename}</div>
                ${item.state === 'progressing' ? `
                <div class="download-progress-bar">
                    <div class="download-progress" style="width: ${progress}%"></div>
                </div>` : ''}
                <div class="download-status">${statusText}</div>
            </div>
            <div class="download-actions">
                ${item.state === 'progressing' ? `<button class="cancel-download" data-id="${item.startTime}">Cancel</button>` : ''}
                ${item.state === 'completed' ? `<button class="show-in-folder" data-id="${item.startTime}">Show in Folder</button>` : ''}
            </div>
        `;
        return li;
    }

    window.api.onDownloadUpdate((item) => {
        console.log('Downloads Page: Received download-update event:', item);
        if (item.state === 'progressing') {
            inProgress.set(item.startTime, item);
        } else {
            inProgress.delete(item.startTime);
        }
        renderAll();
    });

    downloadsList.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const downloadId = target.dataset.id;
        if (target.classList.contains('cancel-download')) {
            window.api.cancelDownload(downloadId);
        } else if (target.classList.contains('show-in-folder')) {
            window.api.showDownloadInFolder(downloadId); 
        }
    });

    clearButton.addEventListener('click', () => {
        window.api.clearDownloads();
        renderAll();
    });

    renderAll();
});

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

