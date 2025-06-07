/**
 * Gekko Browser History Storage
 * 
 * A simple file-based storage system for browser history that doesn't depend on electron-store.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get the user data directory for the app
const getUserDataPath = () => {
  const userDataPath = app.getPath('userData');
  return userDataPath;
};

// Get the path to the history file
const getHistoryFilePath = () => {
  const userDataPath = getUserDataPath();
  return path.join(userDataPath, 'history.json');
};

// Create history file if it doesn't exist
const ensureHistoryFile = () => {
  const historyFilePath = getHistoryFilePath();
  if (!fs.existsSync(historyFilePath)) {
    try {
      fs.writeFileSync(historyFilePath, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error creating history file:', error);
      return false;
    }
  }
  return true;
};

// Load history from file
const loadHistory = () => {
  ensureHistoryFile();
  const historyFilePath = getHistoryFilePath();
  
  try {
    const historyData = fs.readFileSync(historyFilePath, 'utf8');
    try {
      return JSON.parse(historyData);
    } catch (parseError) {
      console.error('Error parsing history data, resetting history:', parseError);
      saveHistory([]);
      return [];
    }
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

// Save history to file
const saveHistory = (history) => {
  const historyFilePath = getHistoryFilePath();
  
  try {
    fs.writeFileSync(historyFilePath, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving history:', error);
    return false;
  }
};

// Flag to track incognito mode
let isIncognitoMode = false;

// Toggle incognito mode
const toggleIncognitoMode = () => {
  isIncognitoMode = !isIncognitoMode;
  return isIncognitoMode;
};

// Get incognito mode status
const getIncognitoMode = () => {
  return isIncognitoMode;
};

// Add an entry to history
const addHistoryEntry = (url, title) => {
  // Skip history recording if in incognito mode or if URL is a .gekko domain
  if (isIncognitoMode || url.includes('.gekko') || url.startsWith('gkp://')) {
    return true;
  }
  
  const history = loadHistory();
  
  // Create new entry
  const newEntry = {
    url,
    title: title || url,
    timestamp: Date.now()
  };
  // Add to beginning (most recent first)
  history.unshift(newEntry);
  
  // Limit history to 1000 entries
  if (history.length > 1000) {
    history.pop();
  }
  
  // Save to file
  return saveHistory(history);
};

// Clear all history
const clearHistory = () => {
  return saveHistory([]);
};

// Get all history entries
const getHistory = () => {
  return loadHistory();
};

module.exports = {
  addHistoryEntry,
  clearHistory,
  getHistory,
  ensureHistoryFile,
  toggleIncognitoMode,
  getIncognitoMode
};
