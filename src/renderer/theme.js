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

    // Apply theme to all tab WebContentsViews via IPC
    tabs.forEach(tab => {
      if (!tab.isDiscarded) applyThemeToTab(tab.id, newTheme);
    });

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
 * Applies the current theme to a tab's WebContentsView via IPC.
 * Only meaningful for internal gkp:// pages that read CSS variables.
 * @param {string} tabId - The tab ID whose WCV should receive the theme.
 * @param {string} newTheme - The theme ID (e.g. 'dark').
 */
export function applyThemeToTab(tabId, newTheme) {
  if (!tabId || !newTheme) return;
  try {
    const themeObj = window.api.getThemes()[newTheme];
    if (!themeObj || !themeObj.colors) return;

    const cssVariables = Object.entries(themeObj.colors)
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n');

    const themeScript = `(function(){try{
      var e=document.getElementById('gekko-theme-style');if(e)e.remove();
      var s=document.createElement('style');s.id='gekko-theme-style';
      s.textContent=":root{${cssVariables.replace(/\n/g, ' ')}}";
      (document.head||document.documentElement).appendChild(s);
      try{document.documentElement.setAttribute('data-theme','${newTheme}');}catch(_){}
      try{document.body.setAttribute('data-theme','${newTheme}');}catch(_){}
      try{localStorage.setItem('gekko-theme','${newTheme}');}catch(_){}
      try{window.postMessage({type:'themeChange',theme:'${newTheme}'},'*');}catch(_){}
    }catch(_){}})();`;

    window.api.wcvExecuteJs(tabId, themeScript);
  } catch (error) {
    console.error('Error applying theme to tab:', error);
  }
}
