// Initialize theme handling
initThemeHandling();

// Get history from the API
let history = window.parent.api.getHistory() || [];

// DOM elements
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historySearch = document.getElementById('history-search');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// --- Helper Functions (No changes here unless you report issues with them) ---
// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  // If today, show time
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  // If yesterday, show "Yesterday"
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }

  // Otherwise, show full date
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Get appropriate icon for URL
function getUrlIcon(url) {
  if (url.startsWith('https://')) {
    return '<i class="fa-solid fa-lock"></i>';
  } else if (url.startsWith('http://')) {
    return '<i class="fa-solid fa-globe"></i>';
  } else if (url.startsWith('gkps://')) {
    return '<i class="fa-solid fa-shield"></i>';
  } else if (url.startsWith('gkp://')) {
    return '<i class="fa-solid fa-browser"></i>';
  } else if (url.startsWith('file://')) {
    return '<i class="fa-solid fa-file"></i>';
  } else {
    return '<i class="fa-solid fa-globe"></i>';
  }
}

// --- Main Rendering and Logic ---

// Render history items based on the provided list
function renderHistory(itemsToDisplay) {
  historyList.innerHTML = ''; // Clear previous items

  // Filter out .gekko and gkp:// internal pages for display
  const visibleItems = itemsToDisplay.filter(item => !item.url.includes('.gekko') && !item.url.startsWith('gkp://'));

  if (visibleItems.length === 0) {
    console.log('renderHistory: No visible items, showing empty state');
    historyEmpty.classList.remove('hidden'); // Show empty state
    historyList.classList.add('hidden');    // Hide history list
  } else {
    console.log('renderHistory: Displaying', visibleItems.length, 'history items');
    historyEmpty.classList.add('hidden');     // Hide empty state
    historyList.classList.remove('hidden');   // Show history list

    // Process each history item
    visibleItems.forEach(item => {
      const historyItem = document.createElement('li');
      historyItem.className = 'history-item';
      historyItem.setAttribute('data-url', item.url);

      let faviconHTML = getUrlIcon(item.url);
      let iconClass = '';

      if (item.url.startsWith('https://')) {
        iconClass = 'secure';
      } else if (item.url.startsWith('gkps://')) {
        iconClass = 'protected';
      } else if (item.url.startsWith('http://')) {
        iconClass = 'insecure';
      }

      let displayTitle = 'Untitled Page';
      let displayUrl = item.url;

      try {
        const urlObj = new URL(item.url);

        if (item.title && item.title.trim()) {
          displayTitle = item.title;
        } else {
          displayTitle = urlObj.hostname || urlObj.pathname || item.url;
        }

        displayUrl = (urlObj.hostname + urlObj.pathname).replace(/\/$/, '');
        if (displayUrl.length > 50) {
          displayUrl = displayUrl.substring(0, 47) + '...';
        }
      } catch (e) {
        displayTitle = item.title || item.url;
        displayUrl = item.url;
      }

      historyItem.innerHTML = `
        <div class="history-icon ${iconClass}">${faviconHTML}</div>
        <div class="history-content">
          <div class="history-title">${displayTitle}</div>
          <div class="history-url">${displayUrl}</div>
        </div>
        <div class="history-time">${formatDate(item.timestamp)}</div>
      `;

      historyList.appendChild(historyItem);

      // Use the direct navigation API consistent with bookmarks.js
      historyItem.addEventListener('click', () => {
        try {
          console.log('Navigating directly to:', item.url);
          // Check if window.navigation and window.navigation.navigate are available
          if (window.navigation && typeof window.navigation.navigate === 'function') {
            window.navigation.navigate(item.url);
            console.log('Direct navigation initiated.');
          } else {
            console.warn('window.navigation.navigate is not available. Falling back to postMessage (if configured).');
            // Fallback to postMessage, though direct navigation is preferred if available
            if (window.parent && typeof window.parent.postMessage === 'function') {
                window.parent.postMessage({
                  type: 'navigate',
                  url: item.url,
                  target: '_blank'
                }, '*');
                console.log('Fallback: Navigation message sent to parent.');
            } else {
                console.error('Neither window.navigation.navigate nor window.parent.postMessage are available for navigation.');
            }
          }
        } catch (error) {
          console.error('Error during navigation attempt in history.js:', error);
        }
      });
    });
  }
}

// Initial render of history when the page loads
console.log('Initial render of history');
renderHistory(history);

// Handle search input
historySearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();

  // Filter the main history array based on the search query
  const searchResults = history.filter(item =>
    (item.title && item.title.toLowerCase().includes(query)) ||
    item.url.toLowerCase().includes(query)
  );

  // Render the filtered results
  renderHistory(searchResults);
});

// Handle clear history button click
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear your Browse history? This action cannot be undone.')) {
    // Clear history in storage via API
    window.parent.api.clearHistory();

    // Update local history array to be empty
    history = [];

    // Re-render the history, which will now display the empty state
    renderHistory(history);
  }
});