// This is a temporary file to help with editing
// Update the bookmark button state based on whether the current URL is bookmarked
function updateBookmarkButton(url) {
  const bookmarkButton = document.getElementById('bookmark-page-button');
  if (!bookmarkButton) return;
  
  // Skip protocol pages and empty URLs
  if (!url || url.startsWith('gkp://') || url === 'about:blank') {
    bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    bookmarkButton.classList.remove('bookmarked');
    return;
  }
  
  try {
    const isBookmarked = window.api.isBookmarked(url);
    
    if (isBookmarked) {
      bookmarkButton.innerHTML = '<i class="fa-solid fa-star"></i>';
      bookmarkButton.classList.add('bookmarked');
    } else {
      bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
      bookmarkButton.classList.remove('bookmarked');
    }
  } catch (error) {
    console.error('Error updating bookmark button:', error);
    bookmarkButton.innerHTML = '<i class="fa-regular fa-star"></i>';
    bookmarkButton.classList.remove('bookmarked');
  }
}
