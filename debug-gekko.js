/**
 * Debug function for Gekko Browser
 * 
 * This function will check the status of important browser components
 * and display their status in the console.
 * 
 * To use: Run this in the DevTools console
 */

function debugGekko() {
  console.group('🦎 Gekko Browser Debug Info');
  
  // Check theme system
  console.group('Theme System:');
  const themeFromDOM = document.documentElement.getAttribute('data-theme');
  const themeFromStorage = localStorage.getItem('gekko-theme');
  console.log('Current theme (DOM):', themeFromDOM);
  console.log('Current theme (localStorage):', themeFromStorage);
  console.log('Theme marker element exists:', !!document.getElementById('gekko-theme-marker'));
  console.log('getThemeObject function exists:', typeof getThemeObject === 'function');
  try {
    const themeObj = getThemeObject(themeFromDOM || 'dark');
    console.log('Sample theme object valid:', !!themeObj && !!themeObj.colors);
  } catch (e) {
    console.error('Error getting theme object:', e);
  }
  console.groupEnd();
  
  // Check tabs system
  console.group('Tabs System:');
  console.log('Current tab ID:', currentTabId);
  console.log('Total tabs:', tabs.length);
  console.log('Active tab exists:', !!tabs.find(tab => tab.id === currentTabId));
  console.log('Active webview exists:', !!document.querySelector(`#webview-${currentTabId}`));
  console.groupEnd();
  
  // Check bookmarks system
  console.group('Bookmarks System:');
  console.log('Bookmarks array length:', bookmarks.length);
  const bookmarksBarEl = document.getElementById('bookmarks-bar');
  console.log('Bookmarks bar exists:', !!bookmarksBarEl);
  if (bookmarksBarEl) {
    console.log('Bookmarks bar items:', bookmarksBarEl.children.length);
  }
  const bookmarkButton = document.getElementById('bookmark-page-button');
  console.log('Bookmark button exists:', !!bookmarkButton);
  if (currentTabId) {
    const tab = tabs.find(tab => tab.id === currentTabId);
    if (tab) {
      console.log('Current tab URL:', tab.url);
      try {
        const isBookmarked = window.api.isBookmarked(tab.url);
        console.log('Current URL is bookmarked:', isBookmarked);
      } catch (e) {
        console.error('Error checking if URL is bookmarked:', e);
      }
    }
  }
  console.groupEnd();
  
  console.groupEnd();
}

// Auto-run the debug
debugGekko();
