const getContextLink = (event) => {
  if (!event || !event.target || typeof event.target.closest !== 'function') {
    return null;
  }

  const anchor = event.target.closest('a[href]');
  if (!anchor || !anchor.href) {
    return null;
  }

  return {
    href: anchor.href,
    text: (anchor.textContent || '').trim()
  };
};

module.exports = getContextLink;
