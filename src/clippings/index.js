const ensureClippingsFile = require('./ensure-clippings-file');
const getClippings = require('./get-clippings');
const addClipping = require('./add-clipping');
const removeClipping = require('./remove-clipping');
const clearClippings = require('./clear-clippings');
const broadcastClippings = require('./broadcast-clippings');

module.exports = {
  ensureClippingsFile,
  getClippings,
  addClipping,
  removeClipping,
  clearClippings,
  broadcastClippings
};
