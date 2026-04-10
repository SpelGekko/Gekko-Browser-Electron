const normalizeContextParams = (params = {}) => {
  const linkHref = params.link?.href || params.target?.href || null;
  const linkText = params.link?.text || params.target?.text || '';
  const imageSrc = params.image?.src || params.target?.src || null;
  const imageAlt = params.image?.alt || '';

  return {
    ...params,
    context: params.context || 'page',
    link: linkHref ? { href: linkHref, text: linkText } : null,
    image: imageSrc ? { src: imageSrc, alt: imageAlt } : null,
    page: params.page || {
      url: params.pageUrl || '',
      title: params.pageTitle || ''
    },
    selectionText: typeof params.selectionText === 'string' ? params.selectionText : '',
    isEditable: Boolean(params.isEditable),
  };
};

module.exports = normalizeContextParams;
