/**
 * Gekko Browser Settings Storage
 * 
 * A simple file-based storage system for browser settings.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Error types for settings operations
const ERROR_TYPES = {
  cannot_read: 'CANNOT_READ',
  cannot_write: 'CANNOT_WRITE',
  invalid_json: 'INVALID_JSON',
  invalid_value: 'INVALID_VALUE'
};

// Default settings
const defaultSettings = {
  theme: 'dark',
  homePage: '',
  searchEngine: 'https://www.google.com/search?q=',
  enableDevTools: false
};

// Cache for settings
let cachedSettings = null;
let lastSaveTime = 0;
const SAVE_DEBOUNCE_TIME = 100; // ms

// Get the path to the settings file
const getSettingsFilePath = () => {
  const { app } = require('electron').remote || require('electron');
  const path = require('path');
  return path.join(app.getPath('userData'), 'settings.json');
};

// Ensure settings directory exists
const ensureSettingsDirectory = () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const settingsPath = getSettingsFilePath();
    const settingsDir = path.dirname(settingsPath);

    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating settings directory:', error);
    return {
      success: false,
      error: ERROR_TYPES.cannot_write,
      details: error.message
    };
  }
};

// Ensure settings file exists with default values
const ensureSettingsFile = () => {
  try {
    const fs = require('fs');
    const settingsPath = getSettingsFilePath();
    
    if (!fs.existsSync(settingsPath)) {
      fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2));
      cachedSettings = { ...defaultSettings };
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error creating settings file:', error);
    return {
      success: false,
      error: ERROR_TYPES.cannot_write,
      details: error.message
    };
  }
};

// Load settings from file
const loadSettings = () => {
  // Return cached settings if they exist and it's not a theme request
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const fs = require('fs');
    ensureSettingsFile();
    
    const data = fs.readFileSync(getSettingsFilePath(), 'utf8');
    
    try {
      const settings = JSON.parse(data);
      // Ensure we have all default settings
      const finalSettings = { ...defaultSettings, ...settings };
      
      // Cache the settings
      cachedSettings = finalSettings;
      
      return finalSettings;
    } catch (parseError) {
      console.error('Error parsing settings data:', parseError);
      const error = {
        success: false,
        error: ERROR_TYPES.invalid_json,
        details: parseError.message
      };
      return { ...defaultSettings, _error: error };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    const readError = {
      success: false,
      error: ERROR_TYPES.cannot_read,
      details: error.message
    };
    return { ...defaultSettings, _error: readError };
  }
};

// Save settings to file with debouncing
const saveSettings = (settings) => {
  // Ensure settings directory exists
  const dirResult = ensureSettingsDirectory();
  if (dirResult !== true) {
    return dirResult;
  }
  
  try {
    // Merge with defaults and validate theme
    const finalSettings = { ...defaultSettings, ...settings };
    
    if (finalSettings.theme) {
      const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
      if (!allowedThemes.includes(finalSettings.theme)) {
        finalSettings.theme = 'dark';
      }
    }

    // Hash the settings to check for changes
    const settingsHash = JSON.stringify(finalSettings);
    
    // Store last settings hash in module scope
    if (!module.exports._lastSettingsHash) {
      module.exports._lastSettingsHash = '';
    }
    
    // Check if the settings actually changed by comparing hashes
    if (module.exports._lastSettingsHash === settingsHash) {
      console.log('Settings unchanged (hash match), skipping save');
      return true; // No need to save if nothing changed
    }
    
    // Update the hash
    module.exports._lastSettingsHash = settingsHash;

    // Check if we need to debounce the save
    const now = Date.now();
    if (now - lastSaveTime < SAVE_DEBOUNCE_TIME) {
      console.log(`Settings save debounced (${now - lastSaveTime}ms < ${SAVE_DEBOUNCE_TIME}ms)`);
      return true; // Skip this save, recent save already occurred
    }

    // Write the file
    const fs = require('fs');
    const jsonString = JSON.stringify(finalSettings, null, 2);
    fs.writeFileSync(getSettingsFilePath(), jsonString);

    // Update cache and save time
    cachedSettings = finalSettings;
    lastSaveTime = now;
    
    console.log('Settings saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return {
      success: false,
      error: ERROR_TYPES.cannot_write,
      details: error.message
    };
  }
};

// Update a specific setting with validation
const setSetting = (key, value) => {
  console.group('Set Setting');
  console.log(`Setting ${key} to:`, value);
  
  // Track last setting change times by key
  if (!module.exports._lastChangeTime) {
    module.exports._lastChangeTime = {};
  }
  
  // Debounce time by setting type
  const DEBOUNCE_TIMES = {
    theme: 500, // Longer debounce for theme changes
    default: 100
  };
  
  // Check for debouncing
  const now = Date.now();
  const debounceTime = DEBOUNCE_TIMES[key] || DEBOUNCE_TIMES.default;
  const lastChange = module.exports._lastChangeTime[key] || 0;
  
  if (now - lastChange < debounceTime) {
    console.log(`${key} change debounced (${now - lastChange}ms < ${debounceTime}ms)`);
    console.groupEnd();
    return true;
  }
  
  // Update last change time
  module.exports._lastChangeTime[key] = now;
  
  const settings = loadSettings();
  
  // Check for errors from loadSettings
  if (settings._error) {
    console.error('Error loading settings:', settings._error);
    console.groupEnd();
    return settings._error;
  }
  
  // Special handling for theme setting
  if (key === 'theme') {
    if (!value || typeof value !== 'string') {
      console.error('Invalid theme value:', value);
      console.groupEnd();
      return {
        success: false,
        error: ERROR_TYPES.invalid_value,
        details: 'Theme must be a non-empty string'
      };
    }
    
    const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
    if (!allowedThemes.includes(value)) {
      console.warn(`Theme ${value} not allowed, defaulting to 'dark'`);
      value = 'dark';
    }
  }
  
  // Skip save if value hasn't changed
  if (settings[key] === value) {
    console.log(`${key} unchanged, skipping save`);
    console.groupEnd();
    return true;
  }
  
  // Update the setting
  settings[key] = value;
  
  // Save to file and update cache
  const result = saveSettings(settings);
  console.log('Save result:', result);
  console.groupEnd();
  return result;
};

// Get settings with theme validation
const getSettings = () => {
  const settings = loadSettings();
  
  // Ensure theme is valid
  if (settings && settings.theme) {
    const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
    if (!allowedThemes.includes(settings.theme)) {
      settings.theme = 'dark';
      setSetting('theme', 'dark');
    }
  }
  
  return settings;
};

module.exports = {
  ERROR_TYPES,
  defaultSettings,
  setSetting,
  getSettings,
  loadSettings,
  ensureSettingsFile
};
