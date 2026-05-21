/**
 * Gekko Browser Renderer - Bookmarks
 *
 * This file contains functions for managing bookmarks, including
 * toggling, loading, and rendering the bookmarks bar.
 */

import { bookmarks, setBookmarks, currentTabId, tabs } from './core/state.js';
import { navigateTo } from './navigation.js';

/**
 * Toggles the bookmark status for the current page.
 */
export function toggleBookmark() {
  if (!currentTabId) return;

  const activeWebview = document.querySelector(`#webview-${currentTabId}`);
  if (!activeWebview) return;
  
  const currentTab = tabs.find(tab => tab.id === currentTabId);
  if (!currentTab) return;
  
  let url = currentTab.url;
  try {
    if (activeWebview.getURL && typeof activeWebview.getURL === 'function') {
      const webviewUrl = activeWebview.getURL();
      if (webviewUrl) url = webviewUrl;
    }
  } catch (error) {
    console.log('Using fallback URL from tab object due to error:', error);
  }
  
  if (!url) url = activeWebview.getAttribute('src');
  if (!url) return;
  
  try {
    const isBookmarked = window.api.isBookmarked(url);
    if (isBookmarked) {
      window.api.removeBookmark(url);
    } else {
      const title = currentTab.title || 'Untitled';
      const favicon = currentTab.favicon || null;
      window.api.addBookmark(url, title, favicon);
    }
    
    updateBookmarkButton(url);
    loadBookmarks();
    renderBookmarksBar();
    
    const bookmarksWebview = Array.from(document.querySelectorAll('webview')).find(webview => 
      webview.getURL && webview.getURL().endsWith('bookmarks.gekko/index.html')
    );
    if (bookmarksWebview) {
      bookmarksWebview.reload();
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
  }
}

/**
 * Loads bookmarks from the main process.
 */
export function loadBookmarks() {
  try {
    const newBookmarks = window.api.getBookmarks();
    setBookmarks(newBookmarks);
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    setBookmarks([]);
  }
}

/**
 * Renders the bookmarks in the bookmarks bar.
 */
export function renderBookmarksBar() {
  const bookmarksBar = document.getElementById('bookmarks-bar');
  if (!bookmarksBar) return;
  
  bookmarksBar.innerHTML = '';
  
  const toggleBookmarkButton = document.createElement('div');
  toggleBookmarkButton.className = 'add-bookmark-button';
  toggleBookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
  toggleBookmarkButton.title = 'Add or remove bookmark for current page';
  toggleBookmarkButton.addEventListener('click', toggleBookmark);
  bookmarksBar.appendChild(toggleBookmarkButton);

  bookmarks.forEach(bookmark => {
    const bookmarkItem = document.createElement('div');
    bookmarkItem.className = 'bookmark-item';
    bookmarkItem.title = bookmark.title;
    bookmarkItem.setAttribute('data-url', bookmark.url);
    
    const iconHtml = bookmark.favicon 
      ? `<img src="${bookmark.favicon}" alt="" onerror="this.onerror=null;this.src='';this.innerHTML='<i class=\\'fa-solid fa-globe\\'></i>';">`
      : '<i class="fa-solid fa-globe"></i>';
      
    bookmarkItem.innerHTML = `${iconHtml}<span>${bookmark.title}</span>`;
    
    bookmarkItem.addEventListener('click', () => navigateTo(bookmark.url));
    bookmarksBar.appendChild(bookmarkItem);
  });
}

/**
 * Updates the state of the bookmark button in the address bar.
 * @param {string} url - The URL of the current page.
 */
export function updateBookmarkButton(url) {
  const bookmarkButton = document.getElementById('bookmark-page-button');
  const barToggleButton = document.querySelector('.bookmarks-bar .add-bookmark-button');
  if (!bookmarkButton) return;

  if (!url || url.startsWith('gkp://') || url === 'about:blank') {
    bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    bookmarkButton.classList.remove('bookmarked');
    bookmarkButton.setAttribute('title', 'Cannot bookmark this page');
    bookmarkButton.classList.add('disabled');
    if (barToggleButton) barToggleButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    return;
  }
  
  bookmarkButton.classList.remove('disabled');
  
  try {
    const isBookmarked = window.api.isBookmarked(url);
    const icon = isBookmarked ? 'fa-solid fa-star' : 'fa-regular fa-star';
    const title = isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks';
    
    bookmarkButton.innerHTML = `<i class="${icon}"></i>`;
    bookmarkButton.classList.toggle('bookmarked', isBookmarked);
    bookmarkButton.setAttribute('title', title);
    if (barToggleButton) barToggleButton.innerHTML = `<i class="${icon}"></i>`;
  } catch (error) {
    console.error('Error updating bookmark button:', error);
    bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    bookmarkButton.classList.remove('bookmarked');
    bookmarkButton.setAttribute('title', 'Bookmark functionality unavailable');
    if (barToggleButton) barToggleButton.innerHTML = '<i class="fa-regular fa-star"></i>';
  }
}
