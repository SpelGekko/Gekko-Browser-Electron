const fs = require('fs');
const ensureClippingsFile = require('./ensure-clippings-file');
const getClippingsFilePath = require('./get-clippings-file-path');
const saveClippings = require('./save-clippings');

const loadClippings = () => {
  ensureClippingsFile();
  const filePath = getClippingsFilePath();

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('Error parsing clippings data, resetting clippings:', parseError);
      saveClippings([]);
      return [];
    }
  } catch (error) {
    console.error('Error loading clippings:', error);
    return [];
  }
};

module.exports = loadClippings;
