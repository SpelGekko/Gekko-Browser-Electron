/**
 * Gekko Browser Theme Utilities
 * 
 * Shared theme management code for all internal webpages
 */

// Initialize theme handling for internal pages
export function initThemeHandling() {
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
  applyCurrentTheme();
  
  // Listen for theme changes from the parent window
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'themeChange') {
      const theme = event.data.theme;
      applyTheme(theme);
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
export function applyCurrentTheme() {
  try {
    // Try to get the theme from the parent window
    if (window.parent && window.parent.api) {
      const settings = window.parent.api.getSettings();
      const theme = settings.theme || 'dark';
      applyTheme(theme);
    }
  } catch (error) {
    // Default to dark theme if there's an error
    applyTheme('dark');
  }
}

// Apply theme to the page
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  applyThemeStyles(theme);
  
  // Notify other frames if we're the main page
  try {
    if (window.parent !== window) {
      const frames = window.parent.frames;
      for (let i = 0; i < frames.length; i++) {
        if (frames[i] !== window) {
          frames[i].postMessage({ type: 'themeChange', theme: theme }, '*');
        }
      }
    }
  } catch (error) {
    console.log('Not sending theme to other frames:', error);
  }
}

// Apply specific theme styles
export function applyThemeStyles(theme) {
  // Theme-specific accent colors for icons
  const iconColorMap = {
    'dark': '#8ab4f8',
    'light': '#1a73e8',
    'purple': '#b388ff',
    'blue': '#64b5f6',
    'red': '#ff8a80'
  };
    // Get theme colors
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
  
  // Add theme class to body for theme-specific styles
  const body = document.body;
  body.classList.remove('theme-dark', 'theme-light', 'theme-purple', 'theme-blue', 'theme-red');
  body.classList.add(`theme-${theme}`);
    // Add a ripple effect for theme change
  const ripple = document.createElement('div');
  ripple.className = 'theme-ripple';
  ripple.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${colors.accent};
    opacity: 0.1;
    pointer-events: none;
    animation: theme-ripple 0.5s ease-out forwards;
    z-index: 9999;
  `;
  
  const keyframes = document.createElement('style');
  keyframes.textContent = `
    @keyframes theme-ripple {
      0% { opacity: 0.1; }
      50% { opacity: 0.2; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(keyframes);
  document.body.appendChild(ripple);
  
  setTimeout(() => {
    ripple.remove();
    keyframes.remove();
  }, 500);
}

// Export functions for direct use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initThemeHandling,
    applyCurrentTheme,
    applyThemeStyles,
    applyTheme
  };
}
