/**
 * Gekko Browser Theme Utilities
 * 
 * Shared theme management code for all internal webpages
 */

// Initialize theme handling for internal pages
function initThemeHandling() {
  // Apply the current theme
  applyCurrentTheme();
  
  // Listen for theme changes from the parent window
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'themeChange') {
      const theme = event.data.theme;
      document.documentElement.setAttribute('data-theme', theme);
      applyThemeStyles(theme);
    }
  });
  
  // Create a mutation observer to watch for theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === 'data-theme') {
        const theme = document.documentElement.getAttribute('data-theme');
        applyThemeStyles(theme);
      }
    });
  });
  
  // Start observing
  observer.observe(document.documentElement, { attributes: true });
}

// Apply the current theme based on parent window
function applyCurrentTheme() {
  try {
    // Try to get the theme from the parent window
    if (window.parent && window.parent.api) {
      const settings = window.parent.api.getSettings();
      const theme = settings.theme || 'dark';
      
      // Apply the theme
      document.documentElement.setAttribute('data-theme', theme);
      applyThemeStyles(theme);
    }
  } catch (error) {
    // Default to dark theme if there's an error
    document.documentElement.setAttribute('data-theme', 'dark');
    applyThemeStyles('dark');
  }
}

// Apply specific theme styles
function applyThemeStyles(theme) {
  // Add any theme-specific styling here (accent colors, etc)
  const iconColorMap = {
    'dark': '#8ab4f8',
    'light': '#1a73e8',
    'purple': '#b388ff',
    'blue': '#64b5f6',
    'red': '#ff8a80'
  };
  
  // Apply theme-specific accent color to icons if they exist
  const accentColor = iconColorMap[theme] || iconColorMap.dark;
  document.querySelectorAll('.shortcut-icon i, .card-icon i').forEach(icon => {
    icon.style.color = accentColor;
  });
  
  // Apply additional theme-specific styles as needed
  const body = document.body;
  body.classList.remove('theme-dark', 'theme-light', 'theme-purple', 'theme-blue', 'theme-red');
  body.classList.add(`theme-${theme}`);
}

// Export functions for direct use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initThemeHandling,
    applyCurrentTheme,
    applyThemeStyles
  };
}
