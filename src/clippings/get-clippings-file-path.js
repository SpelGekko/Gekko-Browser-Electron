const path = require('path');
const { app } = require('electron');

const getClippingsFilePath = () => {
  return path.join(app.getPath('userData'), 'clippings.json');
};

module.exports = getClippingsFilePath;
