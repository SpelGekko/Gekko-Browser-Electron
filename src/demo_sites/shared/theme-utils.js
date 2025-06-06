/**
 * Gekko Browser Theme Utilities
 * 
 * Shared theme management code for all internal webpages
 */

// Apply theme to the page with transition handling
function applyTheme(themeId) {
  console.group('Apply Theme');
  console.log('Applying theme:', themeId);
  
  try {
    // Get theme colors with fallback
    const fallbackThemes = {
      light: {
        background: '#ffffff',
        accent: '#1a73e8',
        text: '#202124',
        textSecondary: '#5f6368',
        border: '#dadce0'
      },
      dark: {
        background: '#202124',
        accent: '#8ab4f8',
        text: '#e8eaed',
        textSecondary: '#9aa0a6',
        border: '#3c4043'
      },
      purple: {
        background: '#20123a',
        accent: '#b388ff',
        text: '#e8eaed',
        textSecondary: '#9aa0a6',
        border: '#3c2564'
      },
      blue: {
        background: '#0d2149',
        accent: '#64b5f6',
        text: '#e8eaed',
        textSecondary: '#9aa0a6',
        border: '#1a3d80'
      },
      red: {
        background: '#3c1014',
        accent: '#ff8a80',
        text: '#e8eaed',
        textSecondary: '#9aa0a6',
        border: '#661e24'
      }
    };

    // Get theme colors from API or use fallback
    const themeColors = window.api?.getThemes?.()?.[themeId]?.colors || fallbackThemes[themeId] || fallbackThemes.dark;

    // Clear any existing theme styles
    document.querySelectorAll('style[data-gekko-theme]').forEach(s => s.remove());

    // Add new theme styles with transitions
    const style = document.createElement('style');
    style.setAttribute('data-gekko-theme', themeId);
    style.textContent = `
      * {
        transition: background-color 0.3s ease,
                    color 0.3s ease,
                    border-color 0.3s ease,
                    box-shadow 0.3s ease;
      }
      :root {
        --background: ${themeColors.background};
        --card-background: ${themeColors.card || themeColors.background};
        --text-color: ${themeColors.text};
        --accent-color: ${themeColors.accent};
        --text-secondary: ${themeColors.textSecondary};
        --border-color: ${themeColors.border};
      }
    `;
    document.head.appendChild(style);

    // Set theme attributes
    document.documentElement.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-theme', themeId);

    // Update theme marker
    let marker = document.getElementById('gekko-theme-marker');
    if (!marker) {
      marker = document.createElement('meta');
      marker.id = 'gekko-theme-marker';
      marker.setAttribute('name', 'theme');
      document.head.appendChild(marker);
    }
    marker.setAttribute('content', themeId);

    // Apply accent color to icons
    const iconColorMap = {
      dark: '#8ab4f8',
      light: '#1a73e8',
      purple: '#b388ff',
      blue: '#64b5f6',
      red: '#ff8a80'
    };
    const accentColor = iconColorMap[themeId] || themeColors.accent || iconColorMap.dark;
    document.querySelectorAll('.shortcut-icon i, .card-icon i, .setting-icon i').forEach(icon => {
      icon.style.color = accentColor;
    });

    console.log('Theme applied successfully');
    console.groupEnd();
    return true;
  } catch (error) {
    console.error('Error applying theme:', error);
    console.groupEnd();
    return false;
  }
}

// Initialize theme handling
function initThemeHandling() {
  console.group('Initialize Theme Handling');

  try {
    // Get the current theme with fallback
    const settings = window.api?.getSettings?.() || 
                    window.parent?.api?.getSettings?.() || 
                    { theme: 'dark' };

    // Apply the current theme
    applyTheme(settings.theme);
    
    // Listen for theme changes from the parent window
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'themeChange' && event.data?.theme) {
        applyTheme(event.data.theme);
      }
    });

    // Set up storage event listener for cross-window sync
    window.addEventListener('storage', (event) => {
      if (event.key === 'gekko-theme' && event.newValue) {
        applyTheme(event.newValue);
      }
    });

    console.log('Theme handling initialized');
    console.groupEnd();
  } catch (error) {
    console.error('Error initializing theme handling:', error);
    console.groupEnd();
  }
}

// Export functions
window.applyTheme = applyTheme;
window.initThemeHandling = initThemeHandling;
