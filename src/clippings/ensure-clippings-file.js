const fs = require('fs');
const getClippingsFilePath = require('./get-clippings-file-path');

const ensureClippingsFile = () => {
  const filePath = getClippingsFilePath();
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error creating clippings file:', error);
      return false;
    }
  }

  return true;
};

module.exports = ensureClippingsFile;
