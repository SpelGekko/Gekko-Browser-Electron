const { MenuItem, clipboard, shell } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addPageItems = (menu, context) => {
  const pageUrl = context.params.page?.url;
  if (!pageUrl) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Copy Page URL',
    click: () => {
      clipboard.writeText(pageUrl);
    }
  }));

  const pageTitle = context.params.page?.title || pageUrl;
  const isWebUrl = /^https?:\/\//i.test(pageUrl);

  if (isWebUrl) {
    menu.append(new MenuItem({
      label: 'Copy Citation (Markdown)',
      click: () => {
        const dateStamp = new Date().toISOString().slice(0, 10);
        const citation = `[${pageTitle}](${pageUrl}) (accessed ${dateStamp})`;
        clipboard.writeText(citation);
      }
    }));
  }

  menu.append(new MenuItem({
    label: 'View Page Source',
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', `view-source:${pageUrl}`);
    }
  }));

  menu.append(new MenuItem({
    label: 'Open Page in External Browser',
    click: () => {
      shell.openExternal(pageUrl);
    }
  }));

  menu.append(new MenuItem({ type: 'separator' }));

  menu.append(new MenuItem({
    label: 'Save Tabs as Workspace...',
    click: () => {
      context.hostWindow.webContents.send('tab-context-action', 'save-workspace', {});
    }
  }));

  menu.append(new MenuItem({
    label: 'Open Workspaces',
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', 'gkp://workspaces.gekko/');
    }
  }));

  return true;
};

module.exports = addPageItems;
