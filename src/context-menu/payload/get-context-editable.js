const getContextEditable = (event) => {
  const target = event?.target;
  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName ? target.tagName.toLowerCase() : '';
  return tagName === 'input' || tagName === 'textarea';
};

module.exports = getContextEditable;
