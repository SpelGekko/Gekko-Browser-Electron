// Bookmarks page script
document.addEventListener('DOMContentLoaded', () => {
  // DOM elements
  const bookmarksList = document.getElementById('bookmarks-list');
  const bookmarksEmpty = document.getElementById('bookmarks-empty');
  const bookmarksSearch = document.getElementById('bookmarks-search');
  
  // Load bookmarks from the main process
  let bookmarks = [];
  
  // Initialize theme handling
  if (typeof initThemeHandling === 'function') {
    initThemeHandling();
  }

  function reloadBookmarks() {
    console.log('Reloading bookmarks...');
    try {
      // Get bookmarks using the exposed API
      bookmarks = window.api.getBookmarks();
      console.log('Loaded bookmarks:', bookmarks);
      if (!Array.isArray(bookmarks)) {
        console.error('Invalid bookmarks data received:', bookmarks);
        bookmarks = [];
      }
      renderBookmarks(bookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      bookmarks = [];
      renderBookmarks([]);
    }
  }
  
  // Escape HTML to prevent XSS
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Render bookmarks
  function renderBookmarks(bookmarks) {
    console.log('Rendering bookmarks:', bookmarks);
    
    // Clear the list
    bookmarksList.innerHTML = '';
    
    // Show empty state if no bookmarks
    if (!bookmarks || bookmarks.length === 0) {
      console.log('No bookmarks found, showing empty state');
      bookmarksEmpty.classList.remove('hidden');
      bookmarksList.classList.add('hidden');
      return;
    }
    
    // Hide empty state and show list
    bookmarksEmpty.classList.add('hidden');
    bookmarksList.classList.remove('hidden');
    
    // Sort bookmarks by timestamp (newest first)
    const sortedBookmarks = [...bookmarks].sort((a, b) => b.timestamp - a.timestamp);
    
    // Render each bookmark
    sortedBookmarks.forEach(bookmark => {
      const bookmarkItem = document.createElement('li');
      bookmarkItem.className = 'bookmark-item';
      
      // Format date
      const date = new Date(bookmark.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      // Create HTML content
      bookmarkItem.innerHTML = `
        <div class="bookmark-icon">
          ${bookmark.favicon ? 
            `<img src="${escapeHtml(bookmark.favicon)}" alt="" onerror="this.onerror=null;this.src='';this.parentElement.innerHTML='<i class=\\'fa-solid fa-globe\\'></i>';">` : 
            `<i class="fa-solid fa-globe"></i>`}
        </div>
        <div class="bookmark-content">
          <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
          <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
          <div class="bookmark-date">${formattedDate}</div>
        </div>
        <div class="bookmark-actions">
          <button class="bookmark-action-button" data-action="visit" data-url="${escapeHtml(bookmark.url)}" title="Visit page">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </button>
          <button class="bookmark-action-button" data-action="remove" data-url="${escapeHtml(bookmark.url)}" title="Remove bookmark">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      
      // Add event listeners to buttons
      const visitButton = bookmarkItem.querySelector('[data-action="visit"]');
      const removeButton = bookmarkItem.querySelector('[data-action="remove"]');
      
      visitButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Visiting bookmark:', bookmark.url);
        window.navigation.navigate(bookmark.url);
      });
      
      removeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Removing bookmark:', bookmark.url);
        window.api.removeBookmark(bookmark.url);
        // Remove the item immediately for better UX
        bookmarkItem.remove();
        // Then reload to ensure sync
        reloadBookmarks();
      });
      
      // Make the whole item clickable to visit
      bookmarkItem.addEventListener('click', (e) => {
        if (!e.target.closest('.bookmark-action-button')) {
          window.navigation.navigate(bookmark.url);
        }
      });
      
      bookmarksList.appendChild(bookmarkItem);
    });
    
    console.log('Finished rendering bookmarks');
  }

  // Set up search functionality
  let searchTimeout;
  bookmarksSearch.addEventListener('input', () => {
    const query = bookmarksSearch.value.toLowerCase();
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      let filteredBookmarks = bookmarks;
      
      if (query) {
        filteredBookmarks = bookmarks.filter(bookmark => 
          bookmark.title.toLowerCase().includes(query) || 
          bookmark.url.toLowerCase().includes(query)
        );
      }
      
      renderBookmarks(filteredBookmarks);
    }, 150); // Debounce search for better performance
  });

  // Listen for bookmark updates
  window.addEventListener('bookmarks-updated', () => {
    console.log('Received bookmarks-updated event');
    reloadBookmarks();
  });

  // Initial load
  console.log('Initial bookmark load');
  reloadBookmarks();
});
