const loadClippings = require('./load-clippings');

const getClippings = () => {
  return loadClippings();
};

module.exports = getClippings;
