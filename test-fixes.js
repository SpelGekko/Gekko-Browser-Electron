/**
 * Gekko Browser Test Script
 * 
 * This script can be loaded in the DevTools console to test if the fixes worked
 */

(function() {
  console.group('Gekko Browser Test');
  
  // Test if cachedSettings is defined
  console.log('cachedSettings defined:', typeof cachedSettings !== 'undefined');
  
  // Test if toggleBookmark is defined
  console.log('toggleBookmark defined:', typeof toggleBookmark === 'function');
  
  // Test if the bookmark button exists
  const bookmarkButton = document.getElementById('bookmark-page-button');
  console.log('Bookmark button exists:', !!bookmarkButton);
  
  // Test if global variables are defined
  console.log('currentTabId defined:', typeof currentTabId !== 'undefined');
  console.log('tabs defined:', typeof tabs !== 'undefined');
  console.log('bookmarks defined:', typeof bookmarks !== 'undefined');
  console.log('isIncognito defined:', typeof isIncognito !== 'undefined');
  
  console.groupEnd();
})();
