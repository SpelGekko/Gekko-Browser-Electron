const getContextImage = (event) => {
  if (!event || !event.target || typeof event.target.closest !== 'function') {
    return null;
  }

  const image = event.target.closest('img');
  if (!image) {
    return null;
  }

  const src = image.currentSrc || image.src;
  if (!src) {
    return null;
  }

  return {
    src,
    alt: (image.alt || '').trim()
  };
};

module.exports = getContextImage;
