const getContextLink = require('./get-context-link');
const getContextImage = require('./get-context-image');
const getContextSelection = require('./get-context-selection');
const getContextEditable = require('./get-context-editable');
const getContextPage = require('./get-context-page');

const buildContextMenuPayload = (event) => {
  return {
    context: 'page',
    x: event.x,
    y: event.y,
    target: {
      tagName: event.target?.tagName || ''
    },
    page: getContextPage(),
    selectionText: getContextSelection(),
    isEditable: getContextEditable(event),
    link: getContextLink(event),
    image: getContextImage(event)
  };
};

module.exports = buildContextMenuPayload;
