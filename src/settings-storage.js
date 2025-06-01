/**
 * Gekko Browser Settings Storage
 * 
 * A simple file-based storage system for browser settings.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

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

// Create settings file if it doesn't exist
const ensureSettingsFile = () => {
  const settingsFilePath = getSettingsFilePath();
  if (!fs.existsSync(settingsFilePath)) {
    try {
      fs.writeFileSync(settingsFilePath, JSON.stringify(defaultSettings));
      return true;
    } catch (error) {
      console.error('Error creating settings file:', error);
      return false;
    }
  }
  return true;
};

// Load settings from file
const loadSettings = () => {
  ensureSettingsFile();
  const settingsFilePath = getSettingsFilePath();
  
  try {
    const settingsData = fs.readFileSync(settingsFilePath, 'utf8');
    try {
      const loadedSettings = JSON.parse(settingsData);
      // Ensure all default settings exist (in case new ones were added)
      return { ...defaultSettings, ...loadedSettings };
    } catch (parseError) {
      console.error('Error parsing settings data, resetting to defaults:', parseError);
      saveSettings(defaultSettings);
      return { ...defaultSettings };
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    return { ...defaultSettings };
  }
};

// Save settings to file
const saveSettings = (settings) => {
  const settingsFilePath = getSettingsFilePath();
  
  try {
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Update a specific setting
const setSetting = (key, value) => {
  const settings = loadSettings();
  settings[key] = value;
  return saveSettings(settings);
};

// Get all settings
const getSettings = () => {
  return loadSettings();
};

module.exports = {
  defaultSettings,
  setSetting,
  getSettings,
  ensureSettingsFile
};
