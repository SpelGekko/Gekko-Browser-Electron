const { Menu, webContents } = require('electron');
const normalizeContextParams = require('./normalize-context-params');
const addLinkItems = require('./add-link-items');
const addImageItems = require('./add-image-items');
const addSelectionItems = require('./add-selection-items');
const addEditItems = require('./add-edit-items');
const addPageItems = require('./add-page-items');
const addNavigationItems = require('./add-navigation-items');
const addTabItems = require('./add-tab-items');

// Shim so context-menu items can send messages to the chrome renderer
// without needing a BrowserWindow reference.
const chromeProxy = {
  webContents: {
    send: (channel, ...args) => {
      webContents.getAllWebContents().forEach(wc => {
        try { if (!wc.isDestroyed()) wc.send(channel, ...args); } catch (_) {}
      });
    }
  }
};

const buildContextMenu = (event, params) => {
  const menu = new Menu();
  const normalizedParams = normalizeContextParams(params);
  const hostWindow = chromeProxy;
  const context = { event, params: normalizedParams, hostWindow };

  if (normalizedParams.context === 'tab') {
    addTabItems(menu, context);
    return menu;
  }

  addLinkItems(menu, context);
  addImageItems(menu, context);
  addEditItems(menu, context);

  if (!normalizedParams.isEditable) {
    addSelectionItems(menu, context);
  }

  addPageItems(menu, context);
  addNavigationItems(menu, context);

  return menu;
};

module.exports = buildContextMenu;
