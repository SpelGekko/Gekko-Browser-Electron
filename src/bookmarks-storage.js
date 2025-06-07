/**
 * Gekko Browser Bookmarks Storage
 * 
 * A simple file-based storage system for browser bookmarks.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get the user data directory for the app
const getUserDataPath = () => {
  const userDataPath = app.getPath('userData');
  return userDataPath;
};

// Get the path to the bookmarks file
const getBookmarksFilePath = () => {
  const userDataPath = getUserDataPath();
  return path.join(userDataPath, 'bookmarks.json');
};

// Create bookmarks file if it doesn't exist
const ensureBookmarksFile = () => {
  const bookmarksFilePath = getBookmarksFilePath();
  if (!fs.existsSync(bookmarksFilePath)) {
    try {
      fs.writeFileSync(bookmarksFilePath, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error creating bookmarks file:', error);
      return false;
    }
  }
  return true;
};

// Load bookmarks from file
const loadBookmarks = () => {
  ensureBookmarksFile();
  const bookmarksFilePath = getBookmarksFilePath();
  
  try {
    const bookmarksData = fs.readFileSync(bookmarksFilePath, 'utf8');
    try {
      return JSON.parse(bookmarksData);
    } catch (parseError) {
      console.error('Error parsing bookmarks data, resetting bookmarks:', parseError);
      saveBookmarks([]);
      return [];
    }
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    return [];
  }
};

// Save bookmarks to file
const saveBookmarks = (bookmarks) => {
  const bookmarksFilePath = getBookmarksFilePath();
  
  try {
    fs.writeFileSync(bookmarksFilePath, JSON.stringify(bookmarks));
    return true;
  } catch (error) {
    console.error('Error saving bookmarks:', error);
    return false;
  }
};

// Add a bookmark
const addBookmark = (url, title, favicon) => {
  const bookmarks = loadBookmarks();
  
  // Check if bookmark already exists
  const existingIndex = bookmarks.findIndex(bookmark => bookmark.url === url);
  
  // Create new bookmark entry
  const newBookmark = {
    url,
    title: title || url,
    favicon: favicon || '',
    timestamp: Date.now()
  };
  
  if (existingIndex !== -1) {
    // Update existing bookmark
    bookmarks[existingIndex] = newBookmark;
  } else {
    // Add new bookmark
    bookmarks.push(newBookmark);
  }
  
  // Save to file
  return saveBookmarks(bookmarks);
};

// Remove a bookmark
const removeBookmark = (url) => {
  const bookmarks = loadBookmarks();
  const filteredBookmarks = bookmarks.filter(bookmark => bookmark.url !== url);
  
  if (filteredBookmarks.length < bookmarks.length) {
    return saveBookmarks(filteredBookmarks);
  }
  
  return false; // Bookmark not found
};

// Check if a URL is bookmarked
const isBookmarked = (url) => {
  const bookmarks = loadBookmarks();
  return bookmarks.some(bookmark => bookmark.url === url);
};

// Get all bookmarks
const getBookmarks = () => {
  return loadBookmarks();
};

// Update the order of bookmarks
const updateBookmarksOrder = (orderedUrls) => {
  // Validate input
  if (!Array.isArray(orderedUrls)) {
    console.error('Invalid ordered URLs input, expected array');
    return false;
  }
  
  // Load current bookmarks
  const currentBookmarks = loadBookmarks();
  
  // Create a map of URLs to bookmark objects for quick lookup
  const bookmarkMap = {};
  currentBookmarks.forEach(bookmark => {
    bookmarkMap[bookmark.url] = bookmark;
  });
  
  // Create a new array with the specified order
  const orderedBookmarks = [];
  
  // First add bookmarks in the specified order
  orderedUrls.forEach(url => {
    if (bookmarkMap[url]) {
      orderedBookmarks.push(bookmarkMap[url]);
      delete bookmarkMap[url]; // Remove from map to track processed bookmarks
    }
  });
  
  // Then add any remaining bookmarks that weren't in the ordered list
  // (This ensures we don't lose any bookmarks)
  Object.values(bookmarkMap).forEach(bookmark => {
    orderedBookmarks.push(bookmark);
  });
  
  // Save the reordered bookmarks
  return saveBookmarks(orderedBookmarks);
};

module.exports = {
  ensureBookmarksFile,
  addBookmark,
  removeBookmark,
  isBookmarked,
  getBookmarks,
  updateBookmarksOrder
};
