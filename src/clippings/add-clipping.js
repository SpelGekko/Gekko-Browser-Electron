const loadClippings = require('./load-clippings');
const saveClippings = require('./save-clippings');

const MAX_CLIPPINGS = 500;

const addClipping = (data = {}) => {
  const text = typeof data.text === 'string' ? data.text.trim() : '';
  if (!text) {
    return false;
  }

  const entry = {
    id: data.id || String(Date.now()),
    text,
    url: typeof data.url === 'string' ? data.url : '',
    title: typeof data.title === 'string' ? data.title : '',
    createdAt: Number.isFinite(data.createdAt) ? data.createdAt : Date.now()
  };

  const clippings = loadClippings();
  const duplicateIndex = clippings.findIndex(
    (clip) => clip.text === entry.text && clip.url === entry.url
  );

  if (duplicateIndex >= 0) {
    const existing = clippings.splice(duplicateIndex, 1)[0];
    entry.id = existing.id;
  }

  clippings.unshift(entry);

  if (clippings.length > MAX_CLIPPINGS) {
    clippings.length = MAX_CLIPPINGS;
  }

  return saveClippings(clippings);
};

module.exports = addClipping;
