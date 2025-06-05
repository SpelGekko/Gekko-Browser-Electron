// Initialize theme handling
initThemeHandling();

// Get history from the API
const history = window.parent.api.getHistory();

// DOM elements
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historySearch = document.getElementById('history-search');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// Render history items
function renderHistory(items) {
  historyList.innerHTML = '';
  
  if (items.length === 0) {
    historyEmpty.classList.remove('hidden');
    return;
  }
  
  historyEmpty.classList.add('hidden');
  
  items.forEach(item => {
    const historyItem = document.createElement('li');
    historyItem.className = 'history-item';
    historyItem.setAttribute('data-url', item.url);
    
    // Get favicon based on URL
    let faviconHTML = '<i class="fa-solid fa-globe"></i>';
    if (item.url.startsWith('https://')) {
      faviconHTML = '<i class="fa-solid fa-lock"></i>';
    } else if (item.url.startsWith('gkps://')) {
      faviconHTML = '<i class="fa-solid fa-shield"></i>';
    }
    
    historyItem.innerHTML = `
      <div class="history-icon">${faviconHTML}</div>
      <div class="history-content">
        <div class="history-title">${item.title || item.url}</div>
        <div class="history-url">${item.url}</div>
      </div>
      <div class="history-time">${formatDate(item.timestamp)}</div>
    `;
    
    historyList.appendChild(historyItem);
    
    // Add click event to navigate to the URL
    historyItem.addEventListener('click', () => {
      window.parent.postMessage({ type: 'navigate', url: item.url }, '*');
    });
  });
}

// Initial render
renderHistory(history);

// Handle search
historySearch.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(query) || 
    item.url.toLowerCase().includes(query)
  );
  renderHistory(filteredHistory);
});

// Handle clear history
clearHistoryBtn.addEventListener('click', () => {
  window.parent.api.clearHistory();
  history.length = 0;
  renderHistory([]);
});
