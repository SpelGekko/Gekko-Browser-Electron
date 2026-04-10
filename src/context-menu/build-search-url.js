const buildSearchUrl = (query, searchEngineSetting) => {
  const encoded = encodeURIComponent(query);

  if (!searchEngineSetting) {
    return `https://www.google.com/search?q=${encoded}`;
  }

  if (/^https?:\/\//i.test(searchEngineSetting)) {
    return `${searchEngineSetting}${encoded}`;
  }

  switch (searchEngineSetting) {
    case 'google':
      return `https://www.google.com/search?q=${encoded}`;
    case 'bing':
      return `https://www.bing.com/search?q=${encoded}`;
    case 'duckduckgo':
      return `https://duckduckgo.com/?q=${encoded}`;
    case 'yahoo':
      return `https://search.yahoo.com/search?p=${encoded}`;
    default:
      return `https://www.google.com/search?q=${encoded}`;
  }
};

module.exports = buildSearchUrl;
