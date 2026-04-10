const fs = require('fs');
const ensureClippingsFile = require('./ensure-clippings-file');
const getClippingsFilePath = require('./get-clippings-file-path');

const saveClippings = (clippings) => {
  ensureClippingsFile();
  const filePath = getClippingsFilePath();

  try {
    fs.writeFileSync(filePath, JSON.stringify(clippings));
    return true;
  } catch (error) {
    console.error('Error saving clippings:', error);
    return false;
  }
};

module.exports = saveClippings;
