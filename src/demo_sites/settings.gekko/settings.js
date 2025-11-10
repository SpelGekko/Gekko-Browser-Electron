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
    
    // Initialize search engine and homepage form elements
    const searchEngineSelect = document.getElementById('search-engine-select');
    const customHomepageInput = document.getElementById('custom-homepage-input');
    
    if (searchEngineSelect) {
      // Set initial value from settings
      searchEngineSelect.value = settings.searchEngine || 'google';
      
      // Add event listener to save changes
      searchEngineSelect.addEventListener('change', () => {
        console.log('Search engine changed to:', searchEngineSelect.value);
        if (window.api && typeof window.api.setSetting === 'function') {
          window.api.setSetting('searchEngine', searchEngineSelect.value);
        }
      });
    }
    
    if (customHomepageInput) {
      // Set initial value from settings
      customHomepageInput.value = settings.homePage || 'gkp://home.gekko/';
      
      // Add event listener to save changes
      customHomepageInput.addEventListener('input', () => {
        console.log('Custom homepage changed to:', customHomepageInput.value);
        if (window.api && typeof window.api.setSetting === 'function') {
          window.api.setSetting('homePage', customHomepageInput.value);
        }
      });
      
      // Also add a blur event to save when the field loses focus
      customHomepageInput.addEventListener('blur', () => {
        if (window.api && typeof window.api.setSetting === 'function') {
          window.api.setSetting('homePage', customHomepageInput.value);
        }
      });
    }
    
  } catch (error) {
    console.error('Error getting settings:', error);
  }
  // Create theme mockup grid
  const themeGrid = document.createElement('div');
  themeGrid.className = 'theme-grid';
  const themes = [
    { id: "dark", name: "Dark Theme", color: '#202124', textColor: '#ffffff', icon: 'moon' },
    { id: "light", name: "Light Theme", color: '#f8f9fa', textColor: '#202124', icon: 'sun' },
    { id: "purple", name: "Purple Theme", color: '#20123a', textColor: '#ffffff', icon: 'palette' },
    { id: "blue", name: "Blue Theme", color: '#0d2149', textColor: '#ffffff', icon: 'water' },
    { id: "red", name: "Red Theme", color: '#3c1014', textColor: '#ffffff', icon: 'fire' }
  ];
  const currentTheme = settings.theme || 'dark';
  themes.forEach(theme => {
    const option = document.createElement('div');
    option.className = 'theme-option' + (theme.id === currentTheme ? ' active' : '');
    option.setAttribute('data-theme', theme.id);
    option.style.background = theme.color;
    option.style.color = theme.textColor;
    // Use fixed preview colors for clarity
    const previewBg = theme.color;
    const previewText = theme.textColor;
    const tabBg = previewText + '22';
    const tabActiveBg = previewText + '33';
    const line1 = previewText + 'cc';
    const line2 = previewText + '99';
    const line3 = previewText + '66';
    option.innerHTML = `
      <div class="theme-preview" style="background:${previewBg};color:${previewText};">
        <div class="theme-browser-mock" style="background:${previewBg};color:${previewText};border:1px solid rgba(0,0,0,0.08);">
          <div class="theme-browser-header" style="background:${tabBg};color:${previewText};">
            <div class="theme-browser-tabs">
              <div class="theme-browser-tab active" style="background:${tabActiveBg};"></div>
              <div class="theme-browser-tab" style="background:${tabBg};"></div>
              <div class="theme-browser-tab" style="background:${tabBg};"></div>
            </div>
          </div>
          <div class="theme-browser-content">
            <div class="theme-browser-line" style="background:${line1};width:80%"></div>
            <div class="theme-browser-line" style="background:${line2};width:70%"></div>
            <div class="theme-browser-line" style="background:${line3};width:60%"></div>
          </div>
        </div>
      </div>
      <div class="theme-info" style="background:${previewBg};color:${previewText};">
        <i class="fa-solid fa-${theme.icon}" style="color:${previewText};"></i>
        <span class="theme-title" style="color:${previewText};">${theme.name}</span>
      </div>
    `;
    option.addEventListener('click', () => {
      if (option.classList.contains('active')) return;
      document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      // Save and apply theme
      if (window.api?.setSetting && window.api?.applyTheme) {
        window.api.setSetting('theme', theme.id);
        window.api.applyTheme(theme.id);
      } else if (window.parent?.api?.setSetting && window.parent?.api?.applyTheme) {
        window.parent.api.setSetting('theme', theme.id);
        window.parent.api.applyTheme(theme.id);
      } else {
        window.parent.postMessage({ type: 'themeChange', theme: theme.id }, '*');
      }
      document.documentElement.setAttribute('data-theme', theme.id);
    });
    themeGrid.appendChild(option);
  });
  const themeContainer = document.getElementById('theme-container');
  if (themeContainer) {
    themeContainer.innerHTML = '';
    themeContainer.appendChild(themeGrid);
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