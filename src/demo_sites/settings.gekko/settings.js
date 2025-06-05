// Initialize theme handling if available
if (typeof initThemeHandling === 'function') {
  initThemeHandling();
}

// Get settings from the API
let settings = { theme: 'dark', homePage: '', searchEngine: 'https://www.google.com/search?q=', enableDevTools: false };

try {
  if (window.api && typeof window.api.getSettings === 'function') {
    settings = window.api.getSettings();
  } else if (window.parent && window.parent.api && typeof window.parent.api.getSettings === 'function') {
    settings = window.parent.api.getSettings();
  }
} catch (error) {
  console.error('Error getting settings:', error);
}

// Helper function to get theme colors
function getThemePreviewColor(themeId) {
  const colors = {
    'dark': '#202124',
    'light': '#f8f9fa',
    'purple': '#20123a',
    'blue': '#0d2149',
    'red': '#3c1014',
    'green': '#0d3114',
    'monokai': '#272822',
    'nord': '#2e3440'
  };
  return colors[themeId] || colors.dark;
}

// Helper function to get theme icon
function getThemeIcon(themeId) {
  const icons = {
    'dark': 'fa-moon',
    'light': 'fa-sun',
    'purple': 'fa-palette',
    'blue': 'fa-water',
    'red': 'fa-fire',
    'green': 'fa-leaf',
    'monokai': 'fa-code',
    'nord': 'fa-snowflake'
  };
  return icons[themeId] || 'fa-circle';
}

// Handle theme change
function handleThemeChange(themeId) {
  console.group('Theme Change');
  console.log('Theme change requested:', themeId);
  
  if (!themeId) {
    console.error('No theme ID provided');
    console.groupEnd();
    return;
  }

  // Set theme attribute on current document
  document.documentElement.setAttribute('data-theme', themeId);
  console.log('Theme attribute set on document');

  // Update the DOM-based theme storage
  const themeMarker = document.getElementById('gekko-theme-marker');
  if (themeMarker) {
    themeMarker.setAttribute('content', themeId);
    console.log('Theme marker updated in DOM');
  }

  const saveTheme = async () => {
    console.group('Save Theme');
    try {
      // Create multiple redundant theme persistence mechanisms
      
      // 1. Direct API access - most reliable method
      let apiSaveSuccess = false;
      if (window.api && typeof window.api.setSetting === 'function') {
        try {
          window.api.setSetting('theme', themeId);
          console.log('Theme saved via direct API');
          apiSaveSuccess = true;
          
          if (typeof window.api.applyTheme === 'function') {
            const result = window.api.applyTheme(themeId);
            console.log('Theme applied via API:', result);
          }
        } catch (apiError) {
          console.warn('Direct API save failed:', apiError);
        }
      } 
      // Try parent window API access if direct API is not available
      else if (window.parent && window.parent.api) {
        try {
          if (typeof window.parent.api.setSetting === 'function') {
            await window.parent.api.setSetting('theme', themeId);
            console.log('Theme saved via parent setSetting');
            apiSaveSuccess = true;
          }
          
          if (typeof window.parent.api.applyTheme === 'function') {
            const result = window.parent.api.applyTheme(themeId);
            console.log('Theme applied via parent API:', result);
          }
          
          // Also send a message for other components
          console.log('Sending postMessage for theme change');
          window.parent.postMessage({ type: 'themeChange', theme: themeId }, '*');
        } catch (parentError) {
          console.warn('Parent API save failed:', parentError);
        }
      }
      
      // 2. DOM-based persistence - always works in the current page
      try {
        // Also store in data attribute on HTML element
        document.documentElement.dataset.savedTheme = themeId;
      } catch (domError) {
        console.warn('DOM storage error:', domError);
      }
      
      // 3. Browser storage - try but don't depend on it
      try {
        localStorage.setItem('gekko-theme', themeId);
        console.log('Theme saved to localStorage');
      } catch (e) {
        console.warn('Could not save theme to localStorage:', e);
        try {
          sessionStorage.setItem('gekko-theme', themeId);
          console.log('Theme saved to sessionStorage instead');
        } catch (e2) {
          console.warn('Could not save theme to sessionStorage either:', e2);
        }
      }
      // Mark success if any method worked, especially the API method
      // Even if all storage methods fail, the theme has been applied to the document
      console.groupEnd();
      return true;
    } catch (error) {
      console.error('Error saving theme:', error);
      console.groupEnd();
      return false;
    }
  };

  // Try to save theme with retries
  const saveWithRetry = async (retries = 3) => {
    console.group(`Save attempt (${4 - retries}/3)`);
    try {
      const success = await saveTheme();
      if (!success && retries > 0) {
        console.log(`Save failed, retrying in 500ms... (${retries} attempts left)`);
        setTimeout(() => saveWithRetry(retries - 1), 500);
      } else if (success) {
        console.log('Save successful');
      } else {
        console.error('Save failed, no more retries');
      }
    } catch (error) {
      console.error('Error in saveWithRetry:', error);
      if (retries > 0) {
        console.log(`Error occurred, retrying in 500ms... (${retries} attempts left)`);
        setTimeout(() => saveWithRetry(retries - 1), 500);
      }
    }
    console.groupEnd();
  };

  saveWithRetry();
  console.groupEnd();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Populate theme grid
  const themeGrid = document.getElementById('theme-grid');
  let themes = [
    { id: "dark", name: "Dark Theme" },
    { id: "light", name: "Light Theme" },
    { id: "purple", name: "Purple Theme" },
    { id: "blue", name: "Blue Theme" },
    { id: "red", name: "Red Theme" },
    { id: "green", name: "Green Theme" },
    { id: "monokai", name: "Monokai Theme" },
    { id: "nord", name: "Nord Theme" }
  ];

  try {
    if (window.api && typeof window.api.getThemes === 'function') {
      const apiThemes = window.api.getThemes();
      if (Array.isArray(apiThemes) && apiThemes.length > 0) {
        themes = apiThemes;
      }
    } else if (window.parent && window.parent.api && typeof window.parent.api.getThemes === 'function') {
      const apiThemes = window.parent.api.getThemes();
      if (Array.isArray(apiThemes) && apiThemes.length > 0) {
        themes = apiThemes;
      }
    }
  } catch (error) {
    console.error('Error getting themes:', error);
  }

  // Create theme options
  themes.forEach(theme => {
    const themeOption = document.createElement('div');
    themeOption.className = 'theme-option';
    themeOption.setAttribute('data-theme', theme.id);
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    preview.style.background = getThemePreviewColor(theme.id);
    
    // Create browser mockup
    preview.innerHTML = `
      <div class="theme-browser-mock">
        <div class="theme-browser-header">
          <div class="theme-browser-tabs">
            <div class="theme-browser-tab"></div>
            <div class="theme-browser-tab active"></div>
            <div class="theme-browser-tab"></div>
          </div>
        </div>
        <div class="theme-browser-content">
          <div class="theme-browser-line"></div>
          <div class="theme-browser-line"></div>
          <div class="theme-browser-line"></div>
        </div>
      </div>
    `;
    
    const info = document.createElement('div');
    info.className = 'theme-info';
    info.innerHTML = `
      <i class="fa-solid ${getThemeIcon(theme.id)}"></i>
      <span>${theme.name}</span>
    `;
    
    themeOption.appendChild(preview);
    themeOption.appendChild(info);
    themeGrid.appendChild(themeOption);
    
    // Add click handler
    themeOption.addEventListener('click', () => {
      document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
      themeOption.classList.add('active');
      handleThemeChange(theme.id);
    });
  });

  // Mark current theme as active
  const currentTheme = settings.theme || 'dark';
  const activeThemeOption = document.querySelector(`[data-theme="${currentTheme}"]`);
  if (activeThemeOption) {
    activeThemeOption.classList.add('active');
  }

  // Set current values
  document.getElementById('home-page-input').value = settings.homePage || '';
  document.getElementById('search-engine-select').value = settings.searchEngine || 'https://www.google.com/search?q=';
  document.getElementById('dev-tools-checkbox').checked = settings.enableDevTools || false;
  
  // Home page change handler
  document.getElementById('home-page-input').addEventListener('blur', () => {
    const homePageInput = document.getElementById('home-page-input');
    try {
      if (window.api && typeof window.api.setSetting === 'function') {
        window.api.setSetting('homePage', homePageInput.value);
      } else if (window.parent && window.parent.api && typeof window.parent.api.setSetting === 'function') {
        window.parent.api.setSetting('homePage', homePageInput.value);
      }
    } catch (error) {
      console.error('Error saving home page setting:', error);
    }
  });
  
  // Search engine change handler
  document.getElementById('search-engine-select').addEventListener('change', () => {
    const searchEngineSelect = document.getElementById('search-engine-select');
    try {
      if (window.api && typeof window.api.setSetting === 'function') {
        window.api.setSetting('searchEngine', searchEngineSelect.value);
      } else if (window.parent && window.parent.api && typeof window.parent.api.setSetting === 'function') {
        window.parent.api.setSetting('searchEngine', searchEngineSelect.value);
      }
    } catch (error) {
      console.error('Error saving search engine setting:', error);
    }
  });
  
  // Developer tools change handler
  document.getElementById('dev-tools-checkbox').addEventListener('change', () => {
    const devToolsCheckbox = document.getElementById('dev-tools-checkbox');
    try {
      if (window.api && typeof window.api.setSetting === 'function') {
        window.api.setSetting('enableDevTools', devToolsCheckbox.checked);
      } else if (window.parent && window.parent.api && typeof window.parent.api.setSetting === 'function') {
        window.parent.api.setSetting('enableDevTools', devToolsCheckbox.checked);
      }
    } catch (error) {
      console.error('Error saving developer tools setting:', error);
    }
  });
  
  // View protocols documentation
  document.getElementById('view-protocols-btn').addEventListener('click', () => {
    try {
      if (window.browserAction && typeof window.browserAction.navigate === 'function') {
        window.browserAction.navigate('gkp://protocols.gekko/');
      } else {
        window.parent.postMessage({ type: 'navigate', url: 'gkp://protocols.gekko/' }, '*');
      }
    } catch (error) {
      console.error('Error navigating to protocols page:', error);
    }
  });
  
  // Clear history
  document.getElementById('clear-history-btn').addEventListener('click', () => {
    try {
      if (window.api && typeof window.api.clearHistory === 'function') {
        window.api.clearHistory();
      } else if (window.parent && window.parent.api && typeof window.parent.api.clearHistory === 'function') {
        window.parent.api.clearHistory();
      }
      alert('Browsing history cleared!');
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Error clearing browsing history. Please try again.');
    }
  });
  
  // About button
  document.getElementById('about-btn').addEventListener('click', () => {
    try {
      if (window.browserAction && typeof window.browserAction.navigate === 'function') {
        window.browserAction.navigate('gkp://about.gekko/');
      } else {
        window.parent.postMessage({ type: 'navigate', url: 'gkp://about.gekko/' }, '*');
      }
    } catch (error) {
      console.error('Error navigating to about page:', error);
    }
  });
});