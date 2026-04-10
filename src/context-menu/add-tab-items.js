const { MenuItem } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addTabItems = (menu, context) => {
  const { params, event } = context;
  if (params.context !== 'tab' || !params.tabId) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  const { tabId, tabCount, tabIndex } = params;

  const sendTabAction = (action) => {
    event.sender.send('tab-context-action', action, { tabId });
  };

  menu.append(new MenuItem({
    label: 'New Tab',
    click: () => sendTabAction('new-tab')
  }));

  menu.append(new MenuItem({
    label: 'Duplicate Tab',
    click: () => sendTabAction('duplicate-tab')
  }));

  menu.append(new MenuItem({
    label: 'Reload Tab',
    click: () => sendTabAction('reload-tab')
  }));

  menu.append(new MenuItem({
    label: 'Save Tabs as Workspace...',
    click: () => sendTabAction('save-workspace')
  }));

  menu.append(new MenuItem({ type: 'separator' }));

  menu.append(new MenuItem({
    label: 'Close Tab',
    click: () => sendTabAction('close-tab')
  }));

  const canCloseOthers = Number.isInteger(tabCount) ? tabCount > 1 : true;
  menu.append(new MenuItem({
    label: 'Close Other Tabs',
    enabled: canCloseOthers,
    click: () => sendTabAction('close-other-tabs')
  }));

  const canCloseRight = Number.isInteger(tabIndex) && Number.isInteger(tabCount)
    ? tabIndex < tabCount - 1
    : true;

  menu.append(new MenuItem({
    label: 'Close Tabs to the Right',
    enabled: canCloseRight,
    click: () => sendTabAction('close-tabs-to-right')
  }));

  return true;
};

module.exports = addTabItems;
