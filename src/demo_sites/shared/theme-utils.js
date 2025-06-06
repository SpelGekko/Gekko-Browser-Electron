/**
 * Gekko Browser Theme Utilities
 * Shared theme management code for all internal webpages
 */

// Get theme colors with robust fallback system
function getThemeColors(themeId) {
  // Try all possible theme sources
  const themes = 
    (window.api?.getThemes?.()) ||
    (window.parent?.api?.getThemes?.()) ||
    window.GekkoThemes?.themes ||
    {};

  // Get theme from source or use fallback
  const themeColors = themes[themeId]?.colors || {
    primary: themeId === 'light' ? '#f8f9fa' : '#202124',
    secondary: themeId === 'light' ? '#ffffff' : '#303134',
    accent: themeId === 'light' ? '#1a73e8' : '#8ab4f8',
    textPrimary: themeId === 'light' ? '#202124' : '#e8eaed',
    textSecondary: themeId === 'light' ? '#5f6368' : '#9aa0a6',
    textAccent: themeId === 'light' ? '#1a73e8' : '#8ab4f8',
    tabActive: themeId === 'light' ? '#ffffff' : '#303134',
    tabInactive: themeId === 'light' ? '#f8f9fa' : '#202124',
    tabHover: themeId === 'light' ? '#f1f3f4' : '#3c4043',
    tabBorder: themeId === 'light' ? '#dadce0' : '#3c4043',
    button: themeId === 'light' ? '#f1f3f4' : '#303134',
    buttonHover: themeId === 'light' ? '#e8eaed' : '#3c4043',
    buttonText: themeId === 'light' ? '#202124' : '#e8eaed',
    divider: themeId === 'light' ? '#dadce0' : '#3c4043',
    shadow: `rgba(0, 0, 0, ${themeId === 'light' ? '0.1' : '0.3'})`,
    overlay: `rgba(0, 0, 0, ${themeId === 'light' ? '0.2' : '0.5'})`
  };

  return themeColors;
}

// Apply theme to the page 
function applyTheme(themeId) {
  if (!themeId) themeId = 'dark';
  
  console.group('Apply Theme');
  console.log('Applying theme:', themeId);

  try {
    // Get theme colors
    const themeColors = getThemeColors(themeId);

    // Remove existing theme styles
    document.querySelectorAll('style[data-gekko-theme]').forEach(s => s.remove());

    // Create new theme styles
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
        /* Theme variables */
        --primary: ${themeColors.primary};
        --secondary: ${themeColors.secondary};
        --accent: ${themeColors.accent};
        --text-primary: ${themeColors.textPrimary};
        --text-secondary: ${themeColors.textSecondary};
        --text-accent: ${themeColors.textAccent};
        --tab-active: ${themeColors.tabActive};
        --tab-inactive: ${themeColors.tabInactive};
        --tab-hover: ${themeColors.tabHover};
        --tab-border: ${themeColors.tabBorder};
        --button: ${themeColors.button};
        --button-hover: ${themeColors.buttonHover};
        --button-text: ${themeColors.buttonText};
        --divider: ${themeColors.divider};
        --shadow: ${themeColors.shadow};
        --overlay: ${themeColors.overlay};

        /* Legacy variables */
        --background: var(--primary);
        --background-color: var(--primary);
        --card-background: var(--secondary);
        --text-color: var(--text-primary);
        --accent-color: var(--accent);
        --border-color: var(--divider);
        --shadow-color: var(--shadow);
      }`;
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

    // Save to localStorage for persistence
    try {
      localStorage.setItem('gekko-theme', themeId);
    } catch (e) {
      console.warn('Could not save theme to localStorage:', e);
    }

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
    // Get initial theme with better fallback chain
    const currentTheme = 
      (window.api?.getSettings?.()?.theme) ||
      (window.parent?.api?.getSettings?.()?.theme) ||
      localStorage.getItem('gekko-theme') ||
      document.documentElement.getAttribute('data-theme') ||
      'dark';

    console.log('Initial theme:', currentTheme);
    
    // Apply initial theme
    applyTheme(currentTheme);

    // Set up theme change listeners with debouncing
    let themeChangeTimeout;
    const handleThemeChange = (newTheme) => {
      if (newTheme && newTheme !== document.documentElement.getAttribute('data-theme')) {
        clearTimeout(themeChangeTimeout);
        themeChangeTimeout = setTimeout(() => applyTheme(newTheme), 50);
      }
    };

    // Listen for theme changes from multiple sources
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'themeChange' && event.data?.theme) {
        handleThemeChange(event.data.theme);
      }
    });

    window.addEventListener('storage', (event) => {
      if (event.key === 'gekko-theme' && event.newValue) {
        handleThemeChange(event.newValue);
      }
    });

    if (window.api?.onThemeChanged) {
      window.api.onThemeChanged(handleThemeChange);
    }

    // Use BroadcastChannel for cross-page sync
    try {
      const bc = new BroadcastChannel('gekko-theme');
      bc.onmessage = (event) => {
        if (event.data?.theme) {
          handleThemeChange(event.data.theme);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not available:', e);
    }

    // Verify theme application
    const verifyTheme = () => {
      const appliedTheme = document.documentElement.getAttribute('data-theme');
      if (appliedTheme !== currentTheme) {
        console.warn('Theme verification failed, reapplying...');
        applyTheme(currentTheme);
      }
    };
    
    // Verify theme after a short delay to ensure it was applied
    setTimeout(verifyTheme, 100);

    console.log('Theme handling initialized');
    console.groupEnd();
    return true;
  } catch (error) {
    console.error('Error initializing theme handling:', error);
    console.groupEnd();
    return false;
  }
}

// Expose functions globally
window.applyTheme = applyTheme;
window.initThemeHandling = initThemeHandling;
