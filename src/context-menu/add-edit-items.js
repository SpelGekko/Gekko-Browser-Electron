const { MenuItem } = require('electron');
const appendSeparatorIfNeeded = require('./append-separator-if-needed');

const addEditItems = (menu, context) => {
  if (!context.params.isEditable) {
    return false;
  }

  appendSeparatorIfNeeded(menu);

  menu.append(new MenuItem({
    label: 'Undo',
    click: () => context.event.sender.undo()
  }));

  menu.append(new MenuItem({
    label: 'Redo',
    click: () => context.event.sender.redo()
  }));

  menu.append(new MenuItem({ type: 'separator' }));

  menu.append(new MenuItem({
    label: 'Cut',
    click: () => context.event.sender.cut()
  }));

  menu.append(new MenuItem({
    label: 'Copy',
    click: () => context.event.sender.copy()
  }));

  menu.append(new MenuItem({
    label: 'Paste',
    click: () => context.event.sender.paste()
  }));

  menu.append(new MenuItem({
    label: 'Select All',
    click: () => context.event.sender.selectAll()
  }));

  return true;
};

module.exports = addEditItems;
