// Initialize theme handling
document.addEventListener('DOMContentLoaded', () => {
  console.group('Settings Page Initialization');
    // Get current settings
  let settings = { theme: 'dark', homePage: '', searchEngine: 'https://www.google.com/search?q=', enableDevTools: false };

  try {
    if (window.api && typeof window.api.getSettings === 'function') {
      settings = window.api.getSettings();
      console.log('Settings loaded from window.api:', settings);
    } else if (window.parent && window.parent.api && typeof window.parent.api.getSettings === 'function') {
      settings = window.parent.api.getSettings();
      console.log('Settings loaded from window.parent.api:', settings);
    }
    
    // Update version text
    if (window.api && typeof window.api.getAppVersion === 'function') {
      const versionText = document.getElementById('version-text');
      if (versionText) {
        versionText.textContent = window.api.getAppVersion();
      }
    }
  } catch (error) {
    console.error('Error getting settings:', error);
  }
  // Create theme buttons container
  const themeButtonsContainer = document.createElement('div');
  themeButtonsContainer.className = 'theme-buttons';
  themeButtonsContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 20px 0;';
  // Default themes with colors
  const themes = [
    { id: "dark", name: "Dark Theme", color: '#202124', textColor: '#ffffff', icon: 'moon' },
    { id: "light", name: "Light Theme", color: '#f8f9fa', textColor: '#202124', icon: 'sun' },
    { id: "purple", name: "Purple Theme", color: '#20123a', textColor: '#ffffff', icon: 'palette' },
    { id: "blue", name: "Blue Theme", color: '#0d2149', textColor: '#ffffff', icon: 'water' },
    { id: "red", name: "Red Theme", color: '#3c1014', textColor: '#ffffff', icon: 'fire' }
  ];

  // Current theme for highlighting
  const currentTheme = settings.theme || 'dark';
  console.log('Current theme:', currentTheme);
  // Create a button for each theme
  themes.forEach(theme => {
    const button = document.createElement('button');
    button.className = theme.id === currentTheme ? 'theme-button active' : 'theme-button';
    button.setAttribute('data-theme', theme.id);
    button.style.backgroundColor = theme.color;
    button.style.color = theme.textColor;
    
    button.innerHTML = `
      <i class="fa-solid fa-${theme.icon}"></i>
      <div class="theme-title">${theme.name}</div>
    `;// Handle theme change
    button.addEventListener('click', () => {
      // Enhanced debouncing with stronger checks
      if (button.dataset.changing) {
        console.log('Button click debounced');
        return;
      }
      
      // Set debounce flag and clear after delay
      button.dataset.changing = 'true';
      setTimeout(() => delete button.dataset.changing, 500);

      // Skip theme change if already applied
      if (window.lastAppliedTheme === theme.id) {
        console.log('Theme already applied:', theme.id, 'skipping change');
        return;
      }

      console.log('Changing theme to:', theme.id);      // Update active class on buttons
      document.querySelectorAll('.theme-button').forEach(btn => {
        btn.classList.remove('active');
      });
      button.classList.add('active');
      
      // Save theme setting and apply it
      try {
        console.group('Theme Change');
        console.log('Setting and applying theme:', theme.id);
        
        // Use a window global to track the last theme change time
        const now = Date.now();
        if (!window.lastThemeChangeTime || (now - window.lastThemeChangeTime > 500)) {
          window.lastThemeChangeTime = now;
          
          // First try window.api (direct access)
          if (window.api?.setSetting && window.api?.applyTheme) {
            console.log('Using direct API');
            
            // Store current theme to avoid unnecessary saves
            if (window.lastAppliedTheme === theme.id) {
              console.log('Theme already applied, skipping save');
            } else {
              window.api.setSetting('theme', theme.id);
              window.lastAppliedTheme = theme.id;
            }
            
            window.api.applyTheme(theme.id);
          }
          // Then try parent window API
          else if (window.parent?.api?.setSetting && window.parent?.api?.applyTheme) {
            console.log('Using parent window API');
            
            if (window.lastAppliedTheme === theme.id) {
              console.log('Theme already applied, skipping save');
            } else {
              window.parent.api.setSetting('theme', theme.id);
              window.lastAppliedTheme = theme.id;
            }
            
            window.parent.api.applyTheme(theme.id);
          }
          // If no API available, send via postMessage
          else {
            console.log('Using postMessage fallback');
            window.parent.postMessage({ 
              type: 'themeChange', 
              theme: theme.id 
            }, '*');
          }
        } else {
          console.log('Theme change debounced, too soon since last change');
        }
        
        // Update local UI regardless of API method
        document.documentElement.setAttribute('data-theme', theme.id);
        console.log('Theme attribute updated');
        
        // Try to refresh the settings display if possible
        try {
          const api = window.api || window.parent?.api;
          if (api?.getSettings) {
            const settings = api.getSettings();
            document.getElementById('settings-file-content').textContent = 
              JSON.stringify(settings, null, 2);
            document.getElementById('current-theme-debug').textContent = theme.id;
          }
        } catch (displayError) {
          console.warn('Could not update settings display:', displayError);
        }
        
        console.log('Theme change complete');
        console.groupEnd();
      } catch (error) {
        console.error('Error during theme change:', error);
      }
    });

    themeButtonsContainer.appendChild(button);
  });

  // Add debug information displays
  const debugInfo = document.createElement('div');
  debugInfo.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px; font-family: monospace;';
  debugInfo.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Theme Debug Information:</div>
    <div>Current Theme: <span id="current-theme-debug">${currentTheme}</span></div>
    <div>Theme Utils Loaded: <span id="theme-utils-debug">${typeof window.applyThemeStyles === 'function' ? 'Yes' : 'No'}</span></div>
    <div>API Available: <span id="api-debug">${typeof window.api !== 'undefined' ? 'Yes' : 'No'}</span></div>
    <div>Parent API: <span id="parent-api-debug">${typeof window.parent?.api !== 'undefined' ? 'Yes' : 'No'}</span></div>
  `;

  // Add settings.json debug section
  const settingsDebug = document.createElement('div');
  settingsDebug.style.cssText = 'margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.1); border-radius: 4px;';
  settingsDebug.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">Settings File Content:</div>
    <pre id="settings-file-content" style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 4px; overflow-x: auto; font-family: monospace; font-size: 12px;">${JSON.stringify(settings, null, 2)}</pre>
    <button id="refresh-settings" style="margin-top: 10px; padding: 5px 10px; border-radius: 4px; background: var(--accent-color); color: white; border: none; cursor: pointer;">Refresh Settings</button>
  `;

  const debugDisplay = document.createElement('pre');
  debugDisplay.id = 'theme-debug-display';
  debugDisplay.style.cssText = 'margin-top: 10px; padding: 10px; background: rgba(0,0,0,0.05); border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap;';
  debugDisplay.textContent = 'Theme change debug info will appear here';

  // Add to page
  const themeContainer = document.getElementById('theme-container');
  if (themeContainer) {
    themeContainer.innerHTML = '';
    themeContainer.appendChild(themeButtonsContainer);
    themeContainer.appendChild(debugInfo);
    themeContainer.appendChild(settingsDebug);
    themeContainer.appendChild(debugDisplay);
  }

  // Add refresh button handler
  document.getElementById('refresh-settings')?.addEventListener('click', () => {
    try {
      const refreshedSettings = window.api?.getSettings() || window.parent?.api?.getSettings();
      if (refreshedSettings) {
        document.getElementById('settings-file-content').textContent = JSON.stringify(refreshedSettings, null, 2);
      }
    } catch (error) {
      console.error('Error refreshing settings:', error);
    }
  });

  // Initialize theme if possible  console.log('Attempting to initialize theme handling...');
  if (typeof window.initThemeHandling === 'function') {
    console.log('Found initThemeHandling, calling...');
    window.initThemeHandling();
  } else {
    console.error('initThemeHandling not found on window object');
  }
  
  // Setup navigation buttons
  setupNavigationButtons();
  
  console.groupEnd();
});

// Function to set up navigation buttons
function setupNavigationButtons() {
  console.group('Setting up navigation buttons');
  
  // About button handler
  const aboutButton = document.getElementById('about-btn');
  if (aboutButton) {
    aboutButton.addEventListener('click', () => {
      navigateToPage('gkp://about.gekko/');
    });
    console.log('About button handler added');
  } else {
    console.warn('About button not found');
  }
  
  // Updates button handler
  const updatesButton = document.getElementById('updates-btn');
  if (updatesButton) {
    updatesButton.addEventListener('click', () => {
      navigateToPage('gkp://update.gekko/');
    });
    console.log('Updates button handler added');
  } else {
    console.warn('Updates button not found');
  }
  
  // Protocols button handler
  const protocolsButton = document.getElementById('view-protocols-btn');
  if (protocolsButton) {
    protocolsButton.addEventListener('click', () => {
      navigateToPage('gkp://protocols.gekko/');
    });
    console.log('Protocols button handler added');
  } else {
    console.warn('Protocols button not found');
  }
  
  console.groupEnd();
}

// Helper function to navigate to a page with multiple fallback methods
function navigateToPage(url) {
  console.group('Navigation');
  console.log('Navigating to:', url);
  
  try {
    let navigationSucceeded = false;
    
    // Try method 1: window.api.navigate (most reliable for Electron)
    if (window.api && typeof window.api.navigate === 'function') {
      console.log('Using window.api.navigate');
      window.api.navigate(url);
      console.log('Navigation initiated via window.api.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 2: navigation API (standard web API)
    else if (window.navigation && typeof window.navigation.navigate === 'function') {
      console.log('Using window.navigation.navigate');
      window.navigation.navigate(url);
      console.log('Navigation initiated via window.navigation.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 3: navigationAPI (webview specific)
    else if (window.navigationAPI && typeof window.navigationAPI.navigate === 'function') {
      console.log('Using window.navigationAPI.navigate');
      window.navigationAPI.navigate(url);
      console.log('Navigation initiated via window.navigationAPI.navigate');
      navigationSucceeded = true;
    }
    
    // Try method 4: postMessage to parent (works for iframe scenarios)
    else if (window.parent && typeof window.parent.postMessage === 'function') {
      console.log('Using window.parent.postMessage');
      window.parent.postMessage({ 
        type: 'navigate', 
        url: url, 
        target: '_blank'  // Match history.js by including target
      }, '*');
      console.log('Navigation message sent to parent');
      navigationSucceeded = true;
    }
    
    // Last resort: Direct location change
    else {
      console.log('Using direct location change as last resort');
      window.location.href = url;
      navigationSucceeded = true;
    }
    
    if (!navigationSucceeded) {
      console.error('All navigation methods failed');
    }
  } catch (error) {
    console.error('Error during navigation attempt:', error);
    
    // Final fallback if all else fails
    try {
      console.log('Attempting final fallback via location.href');
      window.location.href = url;
    } catch (e) {
      console.error('Final fallback navigation failed:', e);
    }
  }
  
  console.groupEnd();
}