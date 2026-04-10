const loadClippings = require('./load-clippings');
const saveClippings = require('./save-clippings');

const removeClipping = (clipId) => {
  if (!clipId) {
    return false;
  }

  const clippings = loadClippings();
  const next = clippings.filter((clip) => clip.id !== clipId);

  if (next.length === clippings.length) {
    return false;
  }

  return saveClippings(next);
};

module.exports = removeClipping;
