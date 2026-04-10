const { MenuItem, clipboard } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addImageItems = (menu, context) => {
  const image = context.params.image;
  if (!image || !image.src) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Open Image in New Tab',
    click: () => {
      context.hostWindow.webContents.send('open-new-tab', image.src);
    }
  }));

  menu.append(new MenuItem({
    label: 'Download Image',
    click: () => {
      context.event.sender.downloadURL(image.src);
    }
  }));

  menu.append(new MenuItem({
    label: 'Copy Image Address',
    click: () => {
      clipboard.writeText(image.src);
    }
  }));

  return true;
};

module.exports = addImageItems;
