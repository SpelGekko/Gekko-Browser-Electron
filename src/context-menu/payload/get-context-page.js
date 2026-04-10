const getContextPage = () => {
  return {
    url: window.location.href || '',
    title: document.title || ''
  };
};

module.exports = getContextPage;
