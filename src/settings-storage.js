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
  cannot_create_dir: 'cannot_create_dir',
  cannot_create_file: 'cannot_create_file',
  cannot_write: 'cannot_write',
  cannot_read: 'cannot_read',
  invalid_json: 'invalid_json',
  invalid_value: 'invalid_value'
};

// Default settings
const defaultSettings = {
  theme: 'dark',  // Default theme
  homePage: 'gkp://home',
  searchEngine: 'https://www.google.com/search?q=',
  enableDevTools: false
};

// Get the path to the settings file
const getSettingsFilePath = () => {
  const filePath = path.join(app.getPath('userData'), 'settings.json');
  console.log('Settings file path:', filePath);
  return filePath;
};

// Ensure settings directory exists
const ensureSettingsDirectory = () => {
  try {
    const settingsPath = path.dirname(getSettingsFilePath());
    console.log('Checking settings directory:', settingsPath);
    if (!fs.existsSync(settingsPath)) {
      console.log('Creating settings directory');
      fs.mkdirSync(settingsPath, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error('Error creating settings directory:', error);
    return {
      success: false,
      error: ERROR_TYPES.cannot_create_dir,
      details: error.message
    };
  }
};

// Ensure settings file exists with default values
const ensureSettingsFile = () => {
  const settingsFilePath = getSettingsFilePath();
  console.log('Ensuring settings file exists:', settingsFilePath);
  
  // First ensure directory exists
  const dirResult = ensureSettingsDirectory();
  if (dirResult !== true) {
    console.error('Failed to ensure settings directory');
    return dirResult;
  }
  
  try {
    if (!fs.existsSync(settingsFilePath)) {
      console.log('Creating settings file with defaults:', defaultSettings);
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings, null, 2));
    } else {
      console.log('Settings file already exists');
    }
    return true;
  } catch (error) {
    console.error('Error creating settings file:', error);
    return {
      success: false,
      error: ERROR_TYPES.cannot_create_file,
      details: error.message
    };
  }
};

// Load settings from file
const loadSettings = () => {
  try {
    const settingsFilePath = getSettingsFilePath();
    console.log('Loading settings from:', settingsFilePath);
    
    if (!fs.existsSync(settingsFilePath)) {
      console.log('Settings file does not exist, creating with defaults');
      const result = ensureSettingsFile();
      if (result !== true) {
        console.error('Failed to create settings file');
        return { ...defaultSettings, _error: result };
      }
    }
    
    const data = fs.readFileSync(settingsFilePath, 'utf8');
    console.log('Raw settings loaded:', data);
    
    try {
      let settings = JSON.parse(data);
      console.log('Parsed settings:', settings);
      
      // Ensure all default settings exist
      settings = { ...defaultSettings, ...settings };
      console.log('Settings with defaults:', settings);
      
      return settings;
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

// Save settings to file
const saveSettings = (settings) => {
  console.group('Save Settings');
  const settingsFilePath = getSettingsFilePath();
  console.log('Saving settings to:', settingsFilePath);
  console.log('Settings to save:', settings);
  
  // Ensure settings directory exists
  const dirResult = ensureSettingsDirectory();
  if (dirResult !== true) {
    console.error('Failed to ensure settings directory');
    console.groupEnd();
    return dirResult;
  }
  
  try {
    // Ensure we have the default settings as a base and validate theme
    const finalSettings = { ...defaultSettings, ...settings };
    console.log('Final settings with defaults:', finalSettings);
    
    if (finalSettings.theme && typeof finalSettings.theme === 'string') {
      // Force theme to be one of the allowed values
      const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
      if (!allowedThemes.includes(finalSettings.theme)) {
        console.log('Invalid theme, defaulting to dark:', finalSettings.theme);
        finalSettings.theme = 'dark';
      }
    } else {
      console.log('No theme or invalid type, defaulting to dark');
      finalSettings.theme = 'dark';
    }
    
    // Write the file
    const jsonString = JSON.stringify(finalSettings, null, 2);
    console.log('Writing settings to file:', jsonString);
    fs.writeFileSync(settingsFilePath, jsonString);
    console.log('Settings saved successfully');
    console.groupEnd();
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    console.groupEnd();
    return {
      success: false,
      error: ERROR_TYPES.cannot_write,
      details: error.message
    };
  }
};

// Update a specific setting
const setSetting = (key, value) => {
  console.group('Set Setting');
  console.log(`Setting ${key} to:`, value);
  
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
  }
  
  // Update the setting
  settings[key] = value;
  console.log('Updated settings:', settings);
  
  // Save to file
  const result = saveSettings(settings);
  console.log('Save result:', result);
  console.groupEnd();
  return result;
};

// Get all settings with theme validation
const getSettings = () => {
  console.group('Get Settings');
  const settings = loadSettings();
  
  // Ensure theme is valid
  if (settings && settings.theme) {
    const allowedThemes = ['dark', 'light', 'purple', 'blue', 'red'];
    if (!allowedThemes.includes(settings.theme)) {
      console.log('Invalid theme found, resetting to dark:', settings.theme);
      settings.theme = 'dark';
      setSetting('theme', 'dark');
    }
  }
  
  console.log('Returning settings:', settings);
  console.groupEnd();
  return settings;
};

module.exports = {
  ERROR_TYPES,
  defaultSettings,
  setSetting,
  getSettings,
  ensureSettingsFile
};
