/**
 * Gekko Browser Renderer - Theme Management
 *
 * This file contains functions for applying and managing themes
 * throughout the browser UI and in webviews.
 */

import { tabs } from './core/state.js';

/**
 * Applies a new theme to the main browser window and syncs it to storage.
 * @param {string} newTheme - The ID of the theme to apply (e.g., 'dark', 'light').
 */
export function applyTheme(newTheme) {
  console.group('Apply Theme');
  console.log('Applying theme:', newTheme);
  
  // Skip if theme hasn't changed or is invalid
  if (!newTheme || typeof newTheme !== 'string') {
    console.warn('Invalid theme provided:', newTheme);
    console.groupEnd();
    return;
  }
  
  // Track last theme application time for debouncing
  const now = Date.now();
  const THEME_APPLY_DEBOUNCE = 300; // ms
  
  if (now - (window._lastThemeApplyTime || 0) < THEME_APPLY_DEBOUNCE) {
    console.log(`Theme change debounced (${now - (window._lastThemeApplyTime || 0)}ms < ${THEME_APPLY_DEBOUNCE}ms)`);
    console.groupEnd();
    return;
  }
  
  window._lastThemeApplyTime = now;
  
  // Skip if theme hasn't changed
  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme === newTheme) {
    console.log('Theme already applied, skipping');
    console.groupEnd();
    return;
  }
  
  try {
    // Get theme object
    const themeObj = window.api.getThemes()[newTheme];
    if (!themeObj) {
      console.error('Could not get theme object for:', newTheme);
      console.groupEnd();
      return;
    }
    
    console.log('Applying theme colors directly to UI');
    
    // Apply CSS variables directly to the root element
    const root = document.documentElement;
    Object.entries(themeObj.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Apply to document attributes
    root.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);

    // Sync to localStorage and permanent storage
    try {
      const storedTheme = localStorage.getItem('gekko-theme');
      if (storedTheme !== newTheme) {
        localStorage.setItem('gekko-theme', newTheme);
        window.api.setSetting('theme', newTheme);
      }
    } catch (storageError) {
      console.warn('Could not sync theme to storage:', storageError);
    }

    // Apply to all webviews with robust error handling
    const webviews = document.querySelectorAll('webview');
    if (webviews.length > 0) {
      console.log(`Applying theme to ${webviews.length} webviews`);
      webviews.forEach(webview => {
        if (webview && webview.isConnected) {
          applyThemeToWebview(webview, newTheme);
        }
      });
    }

    // Set up verification
    const verifyTheme = () => {
      const appliedTheme = document.documentElement.getAttribute('data-theme');
      const cssVars = getComputedStyle(document.documentElement);
      const themeColor = cssVars.getPropertyValue('--primary').trim();
      
      if (appliedTheme !== newTheme || !themeColor) {
        console.warn('Theme verification failed, reapplying...');
        setTimeout(() => applyTheme(newTheme), 100);
      }
    };
    setTimeout(verifyTheme, 500);

    console.log('Theme applied successfully');
  } catch (error) {
    console.error('Error applying theme:', error);
  }
  
  console.groupEnd();
}


/**
 * Applies the current theme to a specific webview. This is used to ensure
 * that internal pages (like settings, history) match the browser's theme.
 * @param {HTMLWebViewElement} webview - The webview element to apply the theme to.
 * @param {string} newTheme - The ID of the theme to apply.
 */
export function applyThemeToWebview(webview, newTheme) {
  if (!webview || !webview.isConnected) return;

  console.group('Apply Theme to Webview');
  console.log('Applying theme:', newTheme);

  try {
    const lastWebviewTheme = webview.getAttribute('data-last-theme');
    if (lastWebviewTheme === newTheme) {
      console.log('Theme already applied to webview, skipping');
      console.groupEnd();
      return;
    }

    const themeObj = window.api.getThemes()[newTheme];
    if (!themeObj || !themeObj.colors) {
        console.warn('Could not get theme object for webview');
        console.groupEnd();
        return;
    }

    const cssVariables = Object.entries(themeObj.colors)
        .map(([key, value]) => `--${key}: ${value};`)
        .join('\n');

    // Build a robust script that:
    // - injects CSS variables
    // - sets data-theme attributes
    // - calls any page-level theme hooks (`window.api.applyTheme`, `window.applyTheme`)
    // - writes `gekko-theme` to localStorage
    // - posts a message so internal pages listening for `themeChange` will react
    const themeScript = `
      (function() {
        try {
          // Remove any existing theme style element
          const existingStyle = document.getElementById('gekko-theme-style');
          if (existingStyle) existingStyle.remove();

          // Create new theme style
          const style = document.createElement('style');
          style.id = 'gekko-theme-style';
          style.setAttribute('data-gekko-theme', '${newTheme}');
          style.textContent = ":root { ${cssVariables} }";
          if (document.head) {
            document.head.appendChild(style);
          } else {
            document.documentElement.appendChild(style);
          }

          // Set theme attributes
          try { document.documentElement.setAttribute('data-theme', '${newTheme}'); } catch(e){}
          try { document.body.setAttribute('data-theme', '${newTheme}'); } catch(e){}

          // Persist for pages that read localStorage on init
          try { localStorage.setItem('gekko-theme', '${newTheme}'); } catch(e){}

          // Call any available page-level theme APIs
          try { if (window.api && typeof window.api.applyTheme === 'function') window.api.applyTheme('${newTheme}'); } catch(e){}
          try { if (typeof window.applyTheme === 'function') window.applyTheme('${newTheme}'); } catch(e){}

          // Notify page-level listeners
          try { window.postMessage({ type: 'themeChange', theme: '${newTheme}' }, '*'); } catch(e){}
        } catch (err) {
          // Swallow to avoid breaking host
          console.warn('Theme script error:', err);
        }
      })();
    `;

    // Execute the theme injection script; if it fails, fall back to insertCSS
    webview.executeJavaScript(themeScript).catch(error => {
      console.warn('Failed to inject theme via executeJavaScript:', error);
      webview.insertCSS(`:root { ${cssVariables} }`).catch(console.warn);
    });

    // Mark theme as applied
    webview.setAttribute('data-last-theme', newTheme);
    console.log('Theme applied successfully to webview');

  } catch (error) {
    console.error('Error applying theme to webview:', error);
  }
  
  console.groupEnd();
}
