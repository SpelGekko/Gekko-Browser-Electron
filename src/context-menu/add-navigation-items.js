const { MenuItem } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addNavigationItems = (menu, context) => {
  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Back',
    enabled: context.event.sender.canGoBack(),
    click: () => context.event.sender.goBack()
  }));

  menu.append(new MenuItem({
    label: 'Forward',
    enabled: context.event.sender.canGoForward(),
    click: () => context.event.sender.goForward()
  }));

  menu.append(new MenuItem({
    label: 'Reload',
    click: () => context.event.sender.reload()
  }));

  return true;
};

module.exports = addNavigationItems;
