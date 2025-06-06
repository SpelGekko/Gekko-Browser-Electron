// Toggle bookmark for the current page
function toggleBookmark() {
  const activeWebview = document.querySelector(`#webview-${currentTabId}`);
  if (!activeWebview) return;
  
  const url = activeWebview.getURL();
  if (!url) return;
  
  try {
    const isBookmarked = window.api.isBookmarked(url);
    
    if (isBookmarked) {
      // Remove bookmark
      window.api.removeBookmark(url);
    } else {
      // Add bookmark
      const title = getTabTitle(currentTabId);
      let favicon = null;
      const tab = tabs.find(tab => tab.id === currentTabId);
      if (tab && tab.favicon) {
        favicon = tab.favicon;
      }
      window.api.addBookmark(url, title, favicon);
    }
    
    // Update UI
    updateBookmarkButton(url);
    
    // Reload bookmarks
    loadBookmarks();
    renderBookmarksBar();
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}
