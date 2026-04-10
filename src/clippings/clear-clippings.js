const saveClippings = require('./save-clippings');

const clearClippings = () => {
  return saveClippings([]);
};

module.exports = clearClippings;
