const { MenuItem, clipboard } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addLinkItems = (menu, context) => {
  const link = context.params.link;
  if (!link || !link.href) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Open Link in New Tab',
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', link.href);
    }
  }));

  menu.append(new MenuItem({
    label: 'Copy Link Address',
    click: () => {
      clipboard.writeText(link.href);
    }
  }));

  const linkText = (link.text || '').trim();
  if (linkText && linkText !== link.href) {
    menu.append(new MenuItem({
      label: 'Copy Link Text',
      click: () => {
        clipboard.writeText(linkText);
      }
    }));
  }

  menu.append(new MenuItem({
    label: 'Copy Link as Markdown',
    click: () => {
      const text = linkText || link.href;
      clipboard.writeText(`[${text}](${link.href})`);
    }
  }));

  return true;
};

module.exports = addLinkItems;
