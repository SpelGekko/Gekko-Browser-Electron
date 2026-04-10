const getContextSelection = () => {
  try {
    return (window.getSelection && window.getSelection().toString().trim()) || '';
  } catch (error) {
    return '';
  }
};

module.exports = getContextSelection;
