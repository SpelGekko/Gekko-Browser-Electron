const { MenuItem } = require('electron');
const settingsStorage = require('../settings-storage');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');
const buildSearchUrl = require('./build-search-url');
const clippingsStorage = require('../clippings');

const addSelectionItems = (menu, context) => {
  const selectionText = (context.params.selectionText || '').trim();
  if (!selectionText) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Copy',
    click: () => {
      context.event.sender.copy();
    }
  }));

  const settings = settingsStorage.getSettings();
  const searchUrl = buildSearchUrl(selectionText, settings?.searchEngine);
  const previewText = selectionText.length > 40
    ? `${selectionText.slice(0, 40)}...`
    : selectionText;

  menu.append(new MenuItem({
    label: `Search the Web for "${previewText}"`,
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', searchUrl);
    }
  }));

  menu.append(new MenuItem({
    label: 'Save Selection to Clippings',
    click: () => {
      const pageUrl = context.params.page?.url || '';
      const pageTitle = context.params.page?.title || '';
      const saved = clippingsStorage.addClipping({
        text: selectionText,
        url: pageUrl,
        title: pageTitle
      });

      if (saved) {
        clippingsStorage.broadcastClippings();
      }
    }
  }));

  menu.append(new MenuItem({
    label: 'Open Clippings',
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', 'gkp://clippings.gekko/');
    }
  }));

  return true;
};

module.exports = addSelectionItems;
