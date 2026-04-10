const { MenuItem } = require('electron');

const appendSeparatorIfNeeded = (menu) => {
  if (!menu || !menu.items || menu.items.length === 0) {
    return;
  }

  const lastItem = menu.items[menu.items.length - 1];
  if (lastItem && lastItem.type !== 'separator') {
    menu.append(new MenuItem({ type: 'separator' }));
  }
};

module.exports = appendSeparatorIfNeeded;
