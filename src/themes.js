/**
 * Gekko Browser Theme System
 * 
 * This file defines all available themes for the browser.
 * Each theme specifies colors for various UI elements.
 */

const themes = {
  // Dark Theme (Default)
  dark: {
    name: 'Dark Theme',
    icon: 'fa-moon',
    colors: {
      // Base colors
      primary: '#202124',
      secondary: '#303134',
      accent: '#8ab4f8',
      
      // Text colors
      textPrimary: '#e8eaed',
      textSecondary: '#9aa0a6',
      textAccent: '#8ab4f8',
      
      // UI elements
      tabActive: '#303134',
      tabInactive: '#202124',
      tabHover: '#3c4043',
      tabBorder: '#3c4043',
      
      // Controls
      button: '#303134',
      buttonHover: '#3c4043',
      buttonText: '#e8eaed',
      
      // Address bar
      addressBar: '#303134',
      addressBarText: '#e8eaed',
      addressBarBorder: '#3c4043',
      
      // Navigation
      navIcon: '#9aa0a6',
      navIconHover: '#e8eaed',
      navIconActive: '#8ab4f8',
      
      // Status and indicators
      error: '#f28b82',
      warning: '#fdd663',
      success: '#81c995',
      secure: '#81c995',
      insecure: '#f28b82',
      
      // Misc
      divider: '#3c4043',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    }
  },
    // Light Theme
  light: {
    name: 'Light Theme',
    icon: 'fa-sun',
    colors: {
      // Base colors
      primary: '#f8f9fa',
      secondary: '#ffffff',
      accent: '#1a73e8',
      
      // Text colors
      textPrimary: '#202124',
      textSecondary: '#5f6368',
      textAccent: '#1a73e8',
      
      // UI elements
      tabActive: '#ffffff',
      tabInactive: '#f8f9fa',
      tabHover: '#f1f3f4',
      tabBorder: '#dadce0',
      
      // Controls
      button: '#f1f3f4',
      buttonHover: '#e8eaed',
      buttonText: '#202124',
      
      // Address bar
      addressBar: '#ffffff',
      addressBarText: '#202124',
      addressBarBorder: '#dadce0',
      
      // Navigation
      navIcon: '#5f6368',
      navIconHover: '#202124',
      navIconActive: '#1a73e8',
      
      // Status and indicators
      error: '#ea4335',
      warning: '#fbbc04',
      success: '#34a853',
      secure: '#34a853',
      insecure: '#ea4335',
      
      // Misc
      divider: '#dadce0',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.2)'
    }
  },
    // Purple Theme
  purple: {
    name: 'Purple Theme',
    icon: 'fa-palette',
    colors: {
      // Base colors
      primary: '#20123a',
      secondary: '#301b54',
      accent: '#b388ff',
      
      // Text colors
      textPrimary: '#e8eaed',
      textSecondary: '#9aa0a6',
      textAccent: '#b388ff',
      
      // UI elements
      tabActive: '#301b54',
      tabInactive: '#20123a',
      tabHover: '#3c2564',
      tabBorder: '#3c2564',
      
      // Controls
      button: '#301b54',
      buttonHover: '#3c2564',
      buttonText: '#e8eaed',
      
      // Address bar
      addressBar: '#301b54',
      addressBarText: '#e8eaed',
      addressBarBorder: '#3c2564',
      
      // Navigation
      navIcon: '#9aa0a6',
      navIconHover: '#e8eaed',
      navIconActive: '#b388ff',
      
      // Status and indicators
      error: '#f28b82',
      warning: '#fdd663',
      success: '#81c995',
      secure: '#81c995',
      insecure: '#f28b82',
      
      // Misc
      divider: '#3c2564',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    }
  },
    // Blue Theme
  blue: {
    name: 'Blue Theme',
    icon: 'fa-water',
    colors: {
      // Base colors
      primary: '#0d2149',
      secondary: '#143166',
      accent: '#64b5f6',
      
      // Text colors
      textPrimary: '#e8eaed',
      textSecondary: '#9aa0a6',
      textAccent: '#64b5f6',
      
      // UI elements
      tabActive: '#143166',
      tabInactive: '#0d2149',
      tabHover: '#1a3d80',
      tabBorder: '#1a3d80',
      
      // Controls
      button: '#143166',
      buttonHover: '#1a3d80',
      buttonText: '#e8eaed',
      
      // Address bar
      addressBar: '#143166',
      addressBarText: '#e8eaed',
      addressBarBorder: '#1a3d80',
      
      // Navigation
      navIcon: '#9aa0a6',
      navIconHover: '#e8eaed',
      navIconActive: '#64b5f6',
      
      // Status and indicators
      error: '#f28b82',
      warning: '#fdd663',
      success: '#81c995',
      secure: '#81c995',
      insecure: '#f28b82',
      
      // Misc
      divider: '#1a3d80',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    }
  },
    // Red Theme
  red: {
    name: 'Red Theme',
    icon: 'fa-fire',
    colors: {
      // Base colors
      primary: '#3c1014',
      secondary: '#541b1f',
      accent: '#ff8a80',
      
      // Text colors
      textPrimary: '#e8eaed',
      textSecondary: '#9aa0a6',
      textAccent: '#ff8a80',
      
      // UI elements
      tabActive: '#541b1f',
      tabInactive: '#3c1014',
      tabHover: '#661e24',
      tabBorder: '#661e24',
      
      // Controls
      button: '#541b1f',
      buttonHover: '#661e24',
      buttonText: '#e8eaed',
      
      // Address bar
      addressBar: '#541b1f',
      addressBarText: '#e8eaed',
      addressBarBorder: '#661e24',
      
      // Navigation
      navIcon: '#9aa0a6',
      navIconHover: '#e8eaed',
      navIconActive: '#ff8a80',
      
      // Status and indicators
      error: '#f28b82',
      warning: '#fdd663',
      success: '#81c995',
      secure: '#81c995',
      insecure: '#f28b82',
      
      // Misc
      divider: '#661e24',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    }
  }
};

// Function to apply a theme to the document
function applyTheme(themeId) {
  const theme = themes[themeId] || themes.dark;
  const root = document.documentElement;
  
  // Set CSS variables for the theme
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
  
  // Update the data-theme attribute for potential CSS selectors
  document.body.setAttribute('data-theme', themeId);
  
  // Save theme to localStorage for persistence
  try {
    localStorage.setItem('gekko-theme', themeId);
  } catch (error) {
    console.error('Failed to save theme to localStorage:', error);
  }
  
  // Apply to all webviews in the page
  try {
    const webviews = document.querySelectorAll('webview');
    webviews.forEach(webview => {
      if (webview.isConnected && webview.executeJavaScript) {
        webview.executeJavaScript(`
          if (document.documentElement) {
            document.documentElement.setAttribute('data-theme', '${themeId}');
            ${Object.entries(theme.colors).map(([key, value]) => 
              `document.documentElement.style.setProperty('--${key}', '${value}');`
            ).join('\n')}
          }
        `).catch(err => console.error('Error applying theme to webview:', err));
      }
    });
  } catch (error) {
    console.error('Error applying theme to webviews:', error);
  }
  
  return theme;
}

// Export the themes object and applyTheme function for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { themes, applyTheme };
} else if (typeof window !== 'undefined') {
  window.GekkoThemes = { themes, applyTheme };
}
