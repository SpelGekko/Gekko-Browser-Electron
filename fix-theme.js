const fs = require('fs');
const path = require('path');
const userDataPath = path.join(process.env.APPDATA, 'Gekko Browser', 'settings.json');

// Read current settings
const settings = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
console.log('Current settings:', settings);

// Update theme to dark
settings.theme = 'dark';

// Save updated settings
fs.writeFileSync(userDataPath, JSON.stringify(settings, null, 2));
console.log('Settings updated to:', settings);
