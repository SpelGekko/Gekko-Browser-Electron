// Material Icons definitions
const ICONS = {
  home: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>',
  settings: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><path d="M0,0h24v24H0V0z" fill="none"/><path fill="currentColor" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></g></svg>',
  history: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0z" fill="none"/><path fill="currentColor" d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>',
  protocol: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"/></g><g><g><path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12c0,5.52,4.48,10,10,10s10-4.48,10-10C22,6.48,17.52,2,12,2z M13,19h-2v-2h2V19z M15.07,11.25l-0.9,0.92C13.45,12.9,13,13.5,13,15h-2v-0.5c0-1.1,0.45-2.1,1.17-2.83l1.24-1.26C13.78,10.04,14,9.54,14,9 c0-1.1-0.9-2-2-2s-2,0.9-2,2H8c0-2.21,1.79-4,4-4s4,1.79,4,4C16,9.88,15.64,10.68,15.07,11.25z"/></g></g></svg>'
};

document.addEventListener('DOMContentLoaded', () => {
  // Get settings from the API
  let settings = { theme: 'dark', searchEngine: 'google' };
  try {
    if (window.api && typeof window.api.getSettings === 'function') {
      settings = window.api.getSettings();
    }
  } catch (error) {
    console.warn('Error getting settings:', error);
  }

  // Apply theme class to body
  document.body.className = `theme-${settings.theme || 'dark'}`;
  console.log('Theme applied:', settings.theme);

  const searchInput = document.getElementById('search-input');
  const searchEngineSelect = document.getElementById('search-engine-select');
  const searchForm = document.getElementById('search-form');
  
  // Setup search form submission
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const query = searchInput.value.trim();
      if (!query) return;
      
      // Get the selected search engine
      let searchEngine = 'google';
      
      // Try to get from select if available
      if (searchEngineSelect) {
        searchEngine = searchEngineSelect.value;
      } 
      // Otherwise try to get from settings
      else if (settings && settings.searchEngine) {
        searchEngine = settings.searchEngine;
      }
      
      console.log(`Searching with ${searchEngine} for: ${query}`);
      
      // Build the search URL based on the selected engine
      let searchUrl;
      switch (searchEngine) {
        case 'google':
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
          break;
        case 'bing':
          searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
          break;
        case 'duckduckgo':
          searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
          break;
        case 'yahoo':
          searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
          break;
        default:
          searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
      
      // Try all navigation methods
      let navigationSucceeded = false;
      
      // Method 1: Use window.api
      if (window.api && typeof window.api.navigate === 'function') {
        try {
          console.log('Using window.api.navigate to search');
          window.api.navigate(searchUrl);
          navigationSucceeded = true;
        } catch (error) {
          console.error('window.api.navigate failed:', error);
        }
      }
      
      // Method 2: Use navigationAPI
      if (!navigationSucceeded && window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
        try {
          console.log('Using navigationAPI.navigate to search');
          navigationSucceeded = window.navigationAPI.navigate(searchUrl);
        } catch (error) {
          console.error('navigationAPI.navigate failed:', error);
        }
      }
      
      // Method 3: Use postMessage
      if (!navigationSucceeded && window.parent && window.parent !== window) {
        try {
          console.log('Using postMessage to search');
          window.parent.postMessage({ type: 'navigate', url: searchUrl }, '*');
          navigationSucceeded = true;
        } catch (error) {
          console.error('postMessage navigation failed:', error);
        }
      }
      
      // Method 4: Direct location change (last resort)
      if (!navigationSucceeded) {
        console.log('Using direct navigation as last resort');
        try {
          window.location.href = searchUrl;
        } catch (error) {
          console.error('Direct navigation failed:', error);
        }
      }
    });
  }

  // Apply Material Design icons to Gekko browser shortcuts
  const gekkoIcons = {
    'gkp://about.gekko/': ICONS.info,
    'gkps://secure.gekko/': ICONS.lock,
    'gkp://settings.gekko/': ICONS.settings,
    'gkp://history.gekko/': ICONS.history,
    'gkp://protocols.gekko/': ICONS.protocol
  };

  // Map of website URLs to their Simple Icons slugs
  const websiteIcons = {
    'https://github.com': 'github',
    'https://google.com': 'google',
    'https://youtube.com': 'youtube',
    'https://twitter.com': 'twitter',
    'https://reddit.com': 'reddit',
    'https://linkedin.com': 'linkedin',
    'https://translate.google.com': 'googletranslate',
    'https://drive.google.com': 'googledrive',
    'https://maps.google.com': 'googlemaps',
    'https://calendar.google.com': 'googlecalendar'
  };
  // Setup click handlers for shortcuts
  document.querySelectorAll('.home-shortcut').forEach(shortcut => {
    shortcut.addEventListener('click', (e) => {
      e.preventDefault();
      const url = shortcut.dataset.url;
      if (url) {
        console.group('Home Page Navigation');
        console.log('Shortcut clicked, navigating to:', url);
        
        // Use multiple methods for navigation to ensure it works
        // Method 1: navigationAPI (preferred)
        let navigationSucceeded = false;
        if (window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
          try {
            console.log('Using navigationAPI.navigate');
            navigationSucceeded = window.navigationAPI.navigate(url);
            console.log('navigationAPI result:', navigationSucceeded);
          } catch (error) {
            console.error('navigationAPI failed:', error);
          }
        }
        
        // Method 2: postMessage
        if (!navigationSucceeded && window.parent && window.parent !== window) {
          try {
            console.log('Using postMessage fallback');
            window.parent.postMessage({ type: 'navigate', url: url }, '*');
            // We can't determine success here easily
            navigationSucceeded = true;
          } catch (error) {
            console.error('postMessage navigation failed:', error);
          }
        }
        
        // Method 3: Direct navigation (last resort)
        if (!navigationSucceeded) {
          console.log('Using direct navigation as last resort');
          try {
            window.location.href = url;
          } catch (error) {
            console.error('Direct navigation failed:', error);
          }
        }
        
        console.groupEnd();
      }
    });
  });

  // Load icons for shortcuts
  document.querySelectorAll('.home-shortcut').forEach(shortcut => {
    const url = shortcut.dataset.url;
    if (!url) return;

    const iconDiv = shortcut.querySelector('.shortcut-icon');
    if (!iconDiv) return;

    try {
      // Check if it's an internal page
      if (url.startsWith('gkp://') || url.startsWith('gkps://')) {
        const iconName = url.includes('about.gekko') ? 'info'
          : url.includes('secure.gekko') ? 'lock'
          : url.includes('settings.gekko') ? 'settings'
          : url.includes('history.gekko') ? 'history'
          : url.includes('protocols.gekko') ? 'protocol'
          : 'home';

        iconDiv.innerHTML = gekkoIcons[url] || ICONS[iconName] || ICONS.home;
        iconDiv.classList.add('internal-icon');
      } else {
        // Try to get SimpleIcon first
        const iconSlug = websiteIcons[url];
        if (iconSlug && window.simpleIcons?.hasIcon(iconSlug)) {
          const icon = window.simpleIcons.getIcon(iconSlug);
          if (icon) {
            iconDiv.innerHTML = icon.svg;
            iconDiv.querySelector('svg').style.color = `#${icon.hex}`;
            return;
          }
        }

        // Fallback to Google's favicon service
        const hostname = new URL(url).hostname;
        const img = document.createElement('img');
        img.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
        img.width = 32;
        img.height = 32;
        img.alt = hostname;
        img.onerror = () => {
          img.remove();
          iconDiv.innerHTML = ICONS.home;
        };
        iconDiv.innerHTML = '';
        iconDiv.appendChild(img);
      }
    } catch (error) {
      console.error('Error loading icon:', error);
      iconDiv.innerHTML = ICONS.home;
    }
  });
});
