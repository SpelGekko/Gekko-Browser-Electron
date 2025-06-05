// Initialize search functionality
const searchInput = document.getElementById('search-input');
const searchEngineSelect = document.getElementById('search-engine-select');

// Apply theme using the shared theme utilities
if (typeof applyThemeStyles === 'function') {
  applyThemeStyles();
}

// Fix FontAwesome icons if they're not loading properly
if (window.browserAction && typeof window.browserAction.fixIcons === 'function') {
  console.log('Fixing icons on homepage');
  window.browserAction.fixIcons();
}

// Get settings and initialize search engine
try {
  if (window.parent && window.parent.api && window.parent.api.getSettings) {
    const settings = window.parent.api.getSettings();
    if (settings && settings.searchEngine) {
      searchEngineSelect.value = settings.searchEngine;
    }
  }
} catch (error) {
  console.error('Error loading settings:', error);
}

// Handle search
function handleSearch() {
  const query = searchInput.value.trim();
  if (query) {
    const searchEngine = searchEngineSelect.value;
    const searchUrl = searchEngine + encodeURIComponent(query);
    console.log('Sending navigation message:', searchUrl);
    
    try {
      // Use browserAction API if available
      if (window.browserAction && typeof window.browserAction.navigate === 'function') {
        window.browserAction.navigate(searchUrl);
      } else {
        // Fall back to postMessage
        window.parent.postMessage({ type: 'navigate', url: searchUrl }, '*');
      }
    } catch (error) {
      console.error('Error navigating to search results:', error);
    }
  }
}

// Search handlers
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSearch();
  }
});

// Save search engine preference when changed
searchEngineSelect.addEventListener('change', () => {
  try {
    if (window.parent && window.parent.api && window.parent.api.setSetting) {
      window.parent.api.setSetting('searchEngine', searchEngineSelect.value);
    }
  } catch (error) {
    console.error('Error saving search engine preference:', error);
  }
});

// Initialize shortcut navigation
document.querySelectorAll('.home-shortcut').forEach(shortcut => {
  shortcut.addEventListener('click', (e) => {
    e.preventDefault();
    const url = shortcut.getAttribute('data-url');
    if (url) {
      console.log('Shortcut clicked, navigating to:', url);
      
      try {
        // Use browserAction API if available
        if (window.browserAction && typeof window.browserAction.navigate === 'function') {
          window.browserAction.navigate(url);
          return;
        }
        
        // Direct approach - access webview parent
        if (window.parent) {
          window.parent.postMessage({ type: 'navigate', url }, '*');
        }
      } catch (error) {
        console.error('Error navigating to:', url, error);
      }
    }
  });
});
