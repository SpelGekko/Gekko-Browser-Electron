/**
 * Gekko Browser Theme Utilities
 * 
 * Shared theme management code for all internal webpages
 */

// Apply theme to the page
function applyTheme(themeId) {
  console.log('Applying theme:', themeId);
  
  // Get theme colors
  const theme = window.api?.getThemes?.()?.[themeId] || {
    colors: {
      background: themeId === 'light' ? '#ffffff' : '#202124',
      accent: themeId === 'light' ? '#1a73e8' : '#8ab4f8',
      text: themeId === 'light' ? '#202124' : '#e8eaed',
      textSecondary: themeId === 'light' ? '#5f6368' : '#9aa0a6',
      border: themeId === 'light' ? '#dadce0' : '#3c4043'
    }
  };

  // Apply colors to root element
  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  // Set theme attributes
  root.setAttribute('data-theme', themeId);
  document.body.setAttribute('data-theme', themeId);

  // Apply accent color to icons
  const accentColor = theme.colors.accent;
  document.querySelectorAll('.shortcut-icon i, .card-icon i, .setting-icon i').forEach(icon => {
    icon.style.color = accentColor;
  });

  // Update theme marker
  let marker = document.getElementById('gekko-theme-marker');
  if (!marker) {
    marker = document.createElement('meta');
    marker.id = 'gekko-theme-marker';
    marker.setAttribute('name', 'theme');
    document.head.appendChild(marker);
  }
  marker.setAttribute('content', themeId);
}

// Apply specific theme styles
function applyThemeStyles(theme) {
  console.log('Applying theme styles for:', theme);
  
  // Theme colors
  const themeColors = {
    dark: {
      background: '#202124',
      card: '#303134',
      text: '#e8eaed',
      accent: '#8ab4f8'
    },
    light: {
      background: '#f8f9fa',
      card: '#ffffff',
      text: '#202124',
      accent: '#1a73e8'
    },
    purple: {
      background: '#20123a',
      card: '#301b54',
      text: '#e8eaed',
      accent: '#b388ff'
    },
    blue: {
      background: '#0d2149',
      card: '#143166',
      text: '#e8eaed',
      accent: '#64b5f6'
    },
    red: {
      background: '#3c1014',
      card: '#541b1f',
      text: '#e8eaed',
      accent: '#ff8a80'
    }
  };

  const colors = themeColors[theme] || themeColors.dark;
  
  // Apply colors to root element
  document.documentElement.style.setProperty('--background', colors.background);
  document.documentElement.style.setProperty('--card-background', colors.card);
  document.documentElement.style.setProperty('--text-color', colors.text);
  document.documentElement.style.setProperty('--accent-color', colors.accent);
  
  // Apply accent color to icons
  document.querySelectorAll('.shortcut-icon i, .card-icon i, .setting-icon i').forEach(icon => {
    icon.style.color = colors.accent;
  });
}

// Initialize theme handling
function initThemeHandling() {
  // Add transition styles for smooth theme changes
  const style = document.createElement('style');
  style.textContent = `
    * {
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    }
    .shortcut-icon i, .card-icon i {
      transition: color 0.3s ease;
    }
  `;
  document.head.appendChild(style);

  // Apply the current theme
  const settings = window.api?.getSettings?.() || window.parent?.api?.getSettings?.() || { theme: 'dark' };
  applyTheme(settings.theme);
  
  // Listen for theme changes from the parent window
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'themeChange') {
      applyTheme(event.data.theme);
    }
  });
}

// Export functions
window.applyTheme = applyTheme;
window.applyThemeStyles = applyThemeStyles;
window.initThemeHandling = initThemeHandling;
