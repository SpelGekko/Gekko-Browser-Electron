// Bookmarks page script
function initializeBookmarksPage() {
  console.log('Initializing bookmarks page...');
  console.log('MATERIAL_ICONS available:', typeof window.MATERIAL_ICONS !== 'undefined');
  // If initialization is complete, reload bookmarks
  if (typeof reloadBookmarks === 'function') {
    reloadBookmarks();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded for bookmarks page');
  
  // Define fallback icons in case material-icons.js fails to load
  window.MATERIAL_ICONS = window.MATERIAL_ICONS || {
    visit: '<i class="fa-solid fa-arrow-up-right-from-square"></i>',
    moveUp: '<i class="fa-solid fa-arrow-up"></i>',
    moveDown: '<i class="fa-solid fa-arrow-down"></i>',
    remove: '<i class="fa-solid fa-trash"></i>',
    drag: '<i class="fa-solid fa-grip-vertical"></i>'
  };
  
  // Load material icons script
  const materialIconsScript = document.createElement('script');
  materialIconsScript.src = 'material-icons.js';
  materialIconsScript.onload = initializeBookmarksPage;
  materialIconsScript.onerror = () => {
    console.warn('Failed to load material-icons.js, using fallbacks');
    initializeBookmarksPage();
  };
  document.head.appendChild(materialIconsScript);
  // DOM elements
  const bookmarksList = document.getElementById('bookmarks-list');
  const bookmarksEmpty = document.getElementById('bookmarks-empty');
  const bookmarksSearch = document.getElementById('bookmarks-search');
  const sortBookmarksBtn = document.getElementById('sort-bookmarks-btn');
  
  // Load bookmarks from the main process
  let bookmarks = [];
  let draggedItem = null;
  let currentSortOption = 'newest'; // Default sort option
  
  // Initialize theme handling
  if (typeof initThemeHandling === 'function') {
    initThemeHandling();
  }

  // Website slug map for Simple Icons
  const websiteIcons = {
    'github.com': 'github',
    'google.com': 'google',
    'youtube.com': 'youtube',
    'twitter.com': 'twitter',
    'x.com': 'x',
    'reddit.com': 'reddit',
    'linkedin.com': 'linkedin',
    'translate.google.com': 'googletranslate',
    'drive.google.com': 'googledrive',
    'maps.google.com': 'googlemaps',
    'calendar.google.com': 'googlecalendar',
    'facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'netflix.com': 'netflix',
    'amazon.com': 'amazon',
    'wikipedia.org': 'wikipedia',
    'spotify.com': 'spotify',
    'twitch.tv': 'twitch',
    'microsoft.com': 'microsoft',
    'apple.com': 'apple',
    'github.io': 'github'
  };

  // Function to get icon for a bookmark URL
  function getBookmarkIcon(url) {
    try {
      // Check if it's an internal Gekko URL
      if (url.startsWith('gkp://') || url.startsWith('gkps://')) {
        const iconType = url.includes('about.gekko') ? 'info' :
                        url.includes('secure.gekko') ? 'lock' :
                        url.includes('settings.gekko') ? 'cog' :
                        url.includes('history.gekko') ? 'history' :
                        url.includes('protocols.gekko') ? 'globe' :
                        url.includes('bookmarks.gekko') ? 'bookmark' :
                        'home';
        
        return `<i class="fa-solid fa-${iconType}"></i>`;
      }
      
      // Try to extract the hostname for SimpleIcons lookup
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      
      // Check for matching domain in our map
      let iconSlug = null;
      for (const [domain, slug] of Object.entries(websiteIcons)) {
        if (hostname.includes(domain)) {
          iconSlug = slug;
          break;
        }
      }
      
      // If we found a matching icon in Simple Icons
      if (iconSlug && window.simpleIcons?.hasIcon && window.simpleIcons.hasIcon(iconSlug)) {
        const icon = window.simpleIcons.getIcon(iconSlug);
        if (icon && icon.svg) {
          return icon.svg;
        }
      }
      
      // Fallback to protocol-based icon
      if (url.startsWith('https://')) {
        return '<i class="fa-solid fa-lock"></i>';
      } else if (url.startsWith('http://')) {
        return '<i class="fa-solid fa-globe"></i>';
      } else if (url.startsWith('file://')) {
        return '<i class="fa-solid fa-file"></i>';
      }
      
      // Default fallback
      return '<i class="fa-solid fa-globe"></i>';
    } catch (error) {
      console.error('Error generating icon for URL:', url, error);
      return '<i class="fa-solid fa-globe"></i>';
    }
  }

  // Create sort menu
  const createSortMenu = () => {
    // If menu already exists, remove it first
    const existingSortMenu = document.querySelector('.sort-menu');
    if (existingSortMenu) {
      existingSortMenu.remove();
    }
    
    const sortMenu = document.createElement('div');
    sortMenu.className = 'sort-menu';
    
    // Sort options
    const sortOptions = [
      { id: 'newest', label: 'Newest first', icon: 'fa-clock' },
      { id: 'oldest', label: 'Oldest first', icon: 'fa-clock-rotate-left' },
      { id: 'alphabetical', label: 'Alphabetical', icon: 'fa-arrow-down-a-z' },
      { id: 'custom', label: 'Custom order', icon: 'fa-arrows-up-down' }
    ];
    
    sortOptions.forEach(option => {
      const sortOption = document.createElement('div');
      sortOption.className = 'sort-option';
      if (option.id === currentSortOption) {
        sortOption.classList.add('active');
      }
      
      sortOption.innerHTML = `
        <i class="fa-solid ${option.icon}"></i>
        <span>${option.label}</span>
      `;
      
      sortOption.addEventListener('click', () => {
        currentSortOption = option.id;
        sortBookmarks(option.id);
        sortMenu.classList.remove('visible');
        
        // Update active class
        document.querySelectorAll('.sort-option').forEach(opt => {
          opt.classList.toggle('active', opt.querySelector('span').textContent === option.label);
        });
      });
      
      sortMenu.appendChild(sortOption);
    });
    
    // Append to control section
    const bookmarksControls = document.querySelector('.bookmarks-controls');
    bookmarksControls.appendChild(sortMenu);
    
    // Position relative to sort button
    setTimeout(() => {
      const btnRect = sortBookmarksBtn.getBoundingClientRect();
      sortMenu.style.top = `${btnRect.bottom + window.scrollY}px`;
      sortMenu.style.right = `${window.innerWidth - btnRect.right}px`;
    }, 0);
    
    return sortMenu;
  };
  
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
      sortBookmarks(currentSortOption);
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
  
  // Sort bookmarks based on provided option
  function sortBookmarks(sortOption) {
    console.log(`Sorting bookmarks by: ${sortOption}`);
    let sortedBookmarks = [...bookmarks];
    
    switch(sortOption) {
      case 'newest':
        sortedBookmarks.sort((a, b) => b.timestamp - a.timestamp);
        break;
      case 'oldest':
        sortedBookmarks.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'alphabetical':
        sortedBookmarks.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        break;
      case 'custom':
        // If sort option is custom, maintain the current order
        break;
      default:
        sortedBookmarks.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    renderBookmarks(sortedBookmarks);
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
    
    // Render each bookmark
    bookmarks.forEach((bookmark, index) => {
      const bookmarkItem = document.createElement('li');
      bookmarkItem.className = 'bookmark-item';
      bookmarkItem.setAttribute('data-url', bookmark.url);
      bookmarkItem.setAttribute('data-index', index);
      bookmarkItem.setAttribute('draggable', 'true');
      
      // Format date
      const date = new Date(bookmark.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      // Generate bookmark icon
      const bookmarkIconHTML = getBookmarkIcon(bookmark.url);      // Create HTML content
      // Create icons for the actions
      const fallbackIcons = {
        visit: '<i class="fa-solid fa-arrow-up-right-from-square"></i>',
        moveUp: '<i class="fa-solid fa-arrow-up"></i>',
        moveDown: '<i class="fa-solid fa-arrow-down"></i>',
        drag: '<i class="fa-solid fa-grip-vertical"></i>',
        remove: '<i class="fa-solid fa-trash"></i>'
      };
      
      // Try to use Material Icons, fall back to Font Awesome if there's an issue
      let icons;
      try {
        icons = window.MATERIAL_ICONS || fallbackIcons;
        console.log('Using icon system:', window.MATERIAL_ICONS ? 'Material Icons' : 'Font Awesome fallback');
      } catch (error) {
        console.warn('Error accessing Material Icons, using fallbacks:', error);
        icons = fallbackIcons;
      }
      
      bookmarkItem.innerHTML = `
        <div class="bookmark-icon">
          ${bookmarkIconHTML}
        </div>
        <div class="bookmark-content">
          <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
          <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
          <div class="bookmark-date">${formattedDate}</div>
        </div>
        <div class="bookmark-actions">
          <button class="bookmark-action visit-action" title="Visit page">
            ${icons.visit}
          </button>
          <button class="bookmark-action up-action" title="Move up">
            ${icons.moveUp}
          </button>
          <button class="bookmark-action down-action" title="Move down">
            ${icons.moveDown}
          </button>
          <button class="bookmark-action drag-handle" title="Drag to reorder">
            ${icons.drag}
          </button>
          <button class="bookmark-action remove-action" title="Remove bookmark">
            ${icons.remove}
          </button>
        </div>
      `;
      
      // Add click handlers for actions
      const actionsContainer = bookmarkItem.querySelector('.bookmark-actions');
      actionsContainer.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering the parent click event
      });
      
      // Visit action
      const visitAction = bookmarkItem.querySelector('.visit-action');
      visitAction.addEventListener('click', () => {
        console.log('Visiting bookmark:', bookmark.url);
        window.navigation.navigate(bookmark.url);
      });
      
      // Move up action
      const upAction = bookmarkItem.querySelector('.up-action');
      upAction.addEventListener('click', () => {
        if (index > 0) {
          // Swap with previous item in the array
          const temp = bookmarks[index];
          bookmarks[index] = bookmarks[index - 1];
          bookmarks[index - 1] = temp;
          
          // Re-render with updated order
          renderBookmarks(bookmarks);
          
          // Set sort option to custom since manual reordering happened
          currentSortOption = 'custom';
        }
      });
      
      // Disable up button for first item
      if (index === 0) {
        upAction.setAttribute('disabled', 'disabled');
        upAction.style.opacity = '0.5';
        upAction.style.cursor = 'not-allowed';
      }
      
      // Move down action
      const downAction = bookmarkItem.querySelector('.down-action');
      downAction.addEventListener('click', () => {
        if (index < bookmarks.length - 1) {
          // Swap with next item in the array
          const temp = bookmarks[index];
          bookmarks[index] = bookmarks[index + 1];
          bookmarks[index + 1] = temp;
          
          // Re-render with updated order
          renderBookmarks(bookmarks);
          
          // Set sort option to custom since manual reordering happened
          currentSortOption = 'custom';
        }
      });
      
      // Disable down button for last item
      if (index === bookmarks.length - 1) {
        downAction.setAttribute('disabled', 'disabled');
        downAction.style.opacity = '0.5';
        downAction.style.cursor = 'not-allowed';
      }
      
      // Remove action
      const removeAction = bookmarkItem.querySelector('.remove-action');
      removeAction.addEventListener('click', () => {
        console.log('Removing bookmark:', bookmark.url);
        window.api.removeBookmark(bookmark.url);
        
        // Remove the item from DOM for immediate feedback
        bookmarkItem.remove();
        
        // Then reload to ensure sync with storage
        setTimeout(reloadBookmarks, 100);
      });
      
      // Make the whole item clickable to visit (except when clicking actions)
      bookmarkItem.addEventListener('click', (e) => {
        if (!e.target.closest('.bookmark-actions')) {
          window.navigation.navigate(bookmark.url);
        }
      });
      
      // Set up drag and drop
      bookmarkItem.addEventListener('dragstart', (e) => {
        // Only enable drag from the drag handle by default
        if (!e.target.closest('.drag-handle') && !currentSortOption === 'custom') {
          e.preventDefault();
          return;
        }
        
        draggedItem = bookmarkItem;
        setTimeout(() => {
          bookmarkItem.classList.add('dragging');
        }, 0);
        e.dataTransfer.setData('text/plain', bookmark.url);
        
        // Use the proper drag image (the bookmark item itself)
        if (e.dataTransfer.setDragImage) {
          e.dataTransfer.setDragImage(bookmarkItem, 20, 20);
        }
      });
      
      bookmarkItem.addEventListener('dragend', () => {
        bookmarkItem.classList.remove('dragging');
        draggedItem = null;
      });
      
      // The drag-over and drop events are now handled at the container level
      // for better positioning control, but we'll keep these as backups
      
      bookmarkItem.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      
      bookmarkItem.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (draggedItem) {
          const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
          const toIndex = parseInt(bookmarkItem.getAttribute('data-index'));
          
          if (fromIndex !== toIndex) {
            // Move item in the array
            const item = bookmarks[fromIndex];
            bookmarks.splice(fromIndex, 1);
            bookmarks.splice(toIndex, 0, item);
            
            // Re-render with new order
            renderBookmarks(bookmarks);
            
            // Set sort option to custom since manual reordering happened
            currentSortOption = 'custom';
            
            // Save the custom order to storage
            saveBookmarksOrder();
          }
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
  
  // Handle sort button click
  sortBookmarksBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent bubbling
    
    // Create and show sort menu
    const sortMenu = createSortMenu();
    sortMenu.classList.toggle('visible');
    
    // Close menu when clicking elsewhere
    const closeMenu = (event) => {
      if (!event.target.closest('.sort-menu') && !event.target.closest('#sort-bookmarks-btn')) {
        sortMenu.classList.remove('visible');
        document.removeEventListener('click', closeMenu);
      }
    };
    
    // Add click listener with slight delay to prevent immediate closing
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  });

  // Listen for bookmark updates
  window.addEventListener('bookmarks-updated', () => {
    console.log('Received bookmarks-updated event');
    reloadBookmarks();
  });
  
  // Save bookmarks order (if using custom ordering)
  function saveBookmarksOrder() {
    if (currentSortOption === 'custom' && window.api.updateBookmarksOrder) {
      // Extract URL order for saving
      const bookmarkUrls = bookmarks.map(bookmark => bookmark.url);
      window.api.updateBookmarksOrder(bookmarkUrls);
      console.log('Custom bookmark order saved');
    }
  }
  
  // Set up container-level drag and drop
  function setupDragDropContainer() {
    // Allow dropping on the container itself
    bookmarksList.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(bookmarksList, e.clientY);
      
      // Clear all drag-over classes first
      document.querySelectorAll('.bookmark-item').forEach(item => {
        item.classList.remove('drag-over');
      });
      
      // Mark the element we would drop after
      if (afterElement) {
        afterElement.classList.add('drag-over');
      }
    });
    
    bookmarksList.addEventListener('dragleave', () => {
      // This will fire when dragging outside the list
      document.querySelectorAll('.bookmark-item').forEach(item => {
        item.classList.remove('drag-over');
      });
    });
    
    bookmarksList.addEventListener('drop', (e) => {
      e.preventDefault();
      
      // Remove all drag-over classes
      document.querySelectorAll('.bookmark-item').forEach(item => {
        item.classList.remove('drag-over');
      });
      
      if (draggedItem) {
        const afterElement = getDragAfterElement(bookmarksList, e.clientY);
        const fromIndex = parseInt(draggedItem.getAttribute('data-index'));
        let toIndex;
        
        if (afterElement) {
          toIndex = parseInt(afterElement.getAttribute('data-index'));
          if (fromIndex < toIndex) {
            toIndex--; // Adjust for removal of item
          }
        } else {
          // If no afterElement, drop at the end
          toIndex = bookmarks.length - 1;
        }
        
        if (fromIndex !== toIndex) {
          // Move the item in the array
          const item = bookmarks[fromIndex];
          bookmarks.splice(fromIndex, 1);
          bookmarks.splice(toIndex, 0, item);
          
          // Re-render the list
          renderBookmarks(bookmarks);
          
          // Set sort option to custom and save the order
          currentSortOption = 'custom';
          saveBookmarksOrder();
        }
      }
    });
  }
  
  // Helper function to determine which element is below the cursor
  function getDragAfterElement(container, y) {
    // Get all items that aren't being dragged
    const draggableElements = [...container.querySelectorAll('.bookmark-item:not(.dragging)')];
    
    // Find the element we're directly after based on cursor position
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      // If we're above an element and closer than the current closest, that's our new closest
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
  // Initial load and setup
  console.log('Initial bookmark load');
  reloadBookmarks();
  setupDragDropContainer();
  
  // Initialize bookmarks page
  initializeBookmarksPage();
});
