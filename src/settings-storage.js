/**
 * Gekko Browser Settings Storage
 * 
 * A simple file-based storage system for browser settings.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Add error type definitions
const ERROR_TYPES = {
  CANNOT_CREATE_DIR: 'cannot_create_dir',
  CANNOT_CREATE_FILE: 'cannot_create_file',
  CANNOT_WRITE: 'cannot_write',
  CANNOT_READ: 'cannot_read',
  INVALID_JSON: 'invalid_json'
};

// Default settings
const defaultSettings = {
  theme: 'dark',
  homePage: 'gkp://home.gekko/',
  searchEngine: 'https://www.google.com/search?q=',
  enableDevTools: false
};

// Get the user data directory for the app
const getUserDataPath = () => {
  const userDataPath = app.getPath('userData');
  return userDataPath;
};

// Get the path to the settings file
const getSettingsFilePath = () => {
  const userDataPath = getUserDataPath();
  return path.join(userDataPath, 'settings.json');
};

// Try to create settings directory
const ensureSettingsDirectory = () => {
  const dirPath = getUserDataPath();
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating settings directory:', error);
    return {
      success: false,
      error: ERROR_TYPES.CANNOT_CREATE_DIR,
      details: error.message
    };
  }
};

// Create settings file if it doesn't exist
const ensureSettingsFile = () => {
  const settingsFilePath = getSettingsFilePath();
  
  if (!fs.existsSync(settingsFilePath)) {
    // First ensure directory exists
    const dirResult = ensureSettingsDirectory();
    if (dirResult !== true) {
      return dirResult;
    }
    
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
      return true;
    } catch (error) {
      console.error('Error creating settings file:', error);
      return {
        success: false,
        error: ERROR_TYPES.CANNOT_CREATE_FILE,
        details: error.message
      };
    }
  }
  return true;
};

// Load settings from file
const loadSettings = () => {
  const createResult = ensureSettingsFile();
  if (createResult !== true) {
    return {
      ...defaultSettings,
      _error: createResult
    };
  }
  
  const settingsFilePath = getSettingsFilePath();
  
  try {
    const settingsData = fs.readFileSync(settingsFilePath, 'utf8');
    try {
      const loadedSettings = JSON.parse(settingsData);
      // Ensure all default settings exist
      return { ...defaultSettings, ...loadedSettings };
    } catch (parseError) {
      console.error('Error parsing settings data:', parseError);
      const error = {
        success: false,
        error: ERROR_TYPES.INVALID_JSON,
        details: parseError.message
      };
      return { ...defaultSettings, _error: error };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    const readError = {
      success: false,
      error: ERROR_TYPES.CANNOT_READ,
      details: error.message
    };
    return { ...defaultSettings, _error: readError };
  }
};

// Save settings to file
const saveSettings = (settings) => {
  const settingsFilePath = getSettingsFilePath();
  
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return {
      success: false,
      error: ERROR_TYPES.CANNOT_WRITE,
      details: error.message
    };
  }
};

// Update a specific setting
const setSetting = (key, value) => {
  const settings = loadSettings();
  
  // Check for errors from loadSettings
  if (settings._error) {
    return settings._error;
  }
  
  settings[key] = value;
  return saveSettings(settings);
};

// Get all settings
const getSettings = () => {
  return loadSettings();
};

module.exports = {
  ERROR_TYPES,
  defaultSettings,
  setSetting,
  getSettings,
  ensureSettingsFile
};
