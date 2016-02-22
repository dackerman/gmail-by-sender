import * as blessed from "blessed";
import * as _ from "lodash";

export function createUI() {
  
  var screen = blessed.screen({
    smartCSR: true,
    debug: true
  });
  
  screen.key(['escape', 'q', 'C-c'], function(ch, key){
    return process.exit(0);
  });
  
  screen.title = 'Mail';

  let onSelect = _ => _;
  let onArchive = _ => _;
  let messageList = [];
  
  const confirmBox = blessed.question({
    parent: screen,
    top: 'center',
    left: 'center',
    shrink: true,
    padding: 5,
    style: {
      bg: "red"
    }
  });
  
  const promptBox = blessed.prompt({
    parent: screen,
    top: 'center',
    left: 'center',
    width: "50%",
    height: "50%",
    padding: 5,
    style: {
      bg: "green"
    }
  });

  const messageBox = blessed.box({
    parent: screen,
    top: '10',
    left: '10',
    bottom: '10',
    width: '50%',
    border: { fg: 'blue' },
    style: {
      fg: 'green'
    }
  });
  
  const list = blessed.list({
    parent: screen,
    label: " Senders ",
    border: 'line',
    top: '10',
    right: '1',
    width: '30%',
    bottom: '10',
    keys: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'cyan'
      },
      style: {
        inverse: true
      }
    },
    style: {
      selected: { fg: 'black', bg: 'green' },
      item: { fg: 'white' },
      bg: 'black'
    }
  });
    
  const groupText = (group) => {
    const prefix = group.collapsed ? '+' : '-';
    const num = group.listItems.length;
    return `${prefix} (${num}) ${group.text}`;
  };

  const listItemText = (item) => {
    const check = item.checked ? '✓' : ' ';
    return `  [${check}] ${item.text}`;
  };

  const renderList = () => {
    let lastSelected = list.selected;
    list.clearItems();
    _.each(messageList, (group) => {
      list.add(groupText(group));
      if (!group.collapsed) {
        _.each(group.listItems, item => list.add(listItemText(item)));
      }
    });
    list.select(lastSelected);

    let selectionText = "";
    const numSelected = selected(messageList).length;
    if (numSelected) {
      selectionText = `(${numSelected} selected) `;
    }
    list.setLabel(` Senders ${selectionText}`);
    screen.render();
  };
  
  renderList();

  screen.key('j', () => {
    list.down(1);
    screen.render();
  });
  
  screen.key('k', () => {
    list.up(1);
    screen.render();
  });
  
  screen.key('x', () => {
    let item = lookupInList(messageList, list.selected);
    item.toggle();
    renderList();
  });

  screen.key('space', () => {
    let item = lookupInList(messageList, list.selected);
    item.expandOrContract();
    renderList();
  });

  list.on('select', () => {
    let item = lookupInList(messageList, list.selected);
    onSelect(item);
    screen.render();
  });

  list.key('y', () => {
    onArchive();
  });

  const confirm = (message, cb) => {
    confirmBox.focus();
    confirmBox.ask(message, (err, confirmed) => {
      if (err) {
        throw err;
      }
      cb(confirmed);
      screen.render();
      list.focus();
    });
  };

  const prompt = (message, cb) => {
    promptBox.focus();
    promptBox.input(message + " ", "", (err, text) => {
      screen.debug('text is ' + err + ":" + text);
      if (err) {
        throw err;
      }
      cb(text);
      screen.render();
      list.focus();
    });
  };
  
  screen.append(messageBox);
  screen.append(list);
  screen.append(confirmBox);
  screen.append(promptBox);
  list.focus();
  
  screen.render();

  return {
    updateMessageList: newList => {
      messageList = newList;
      renderList();
    },
    updateMessagePane: text => {
      messageBox.setContent(text);
      screen.render();
    },
    selectedMessages: () => {
      const selectedItems = selected(messageList);
      return _.map(selectedItems, 'data');
    },
    deselectAll: () => {
      deselectAll(messageList);
      renderList();
    },
    onListSelect: cb => {
      onSelect = cb;
    },
    onArchive: cb => {
      onArchive = cb;
    },
    confirm,
    prompt
  };
}

export function lookupInList(messageList, idx) {
  let offset = 0;
  for (let g = 0; g < messageList.length; g++) {
    const group = messageList[g];
    if (offset === idx) {
      return group;
    }
    offset++;

    if (group.collapsed) {
      continue;
    }
    
    for (let i = 0; i < group.listItems.length; i++) {
      if (offset === idx) {
        return group.listItems[i];
      }
      offset++;
    }
  }
  throw `Could not find index ${idx} in list`;
}

export function group(text, listItems) {
  let group = {
    text,
    collapsed: true,
    listItems,
    toggle: () => {
      const unchecked = _.filter(group.listItems, item => !item.checked);
      const checkValue = !!unchecked.length;
      const checkAllWith = checked => {
        _.each(group.listItems, item => {
          item.checked = checked;
        });
      };
      checkAllWith(checkValue);
    },
    expandOrContract: () => {
      group.collapsed = !group.collapsed;
    }
  };
  return group;
}

function selected(messageList) {
  return _.flatMap(messageList, (group) => {
    return _.filter(group.listItems, (item) => item.checked);
  });
}

function deselectAll(messageList) {
  _.each(messageList, group => {
    _.each(group.listItems, item => {
      item.checked = false;
    });
  });
}

export function listItem(text, data) {
  let item = {
    text,
    checked: false,
    data,
    toggle: () => {
      item.checked = !item.checked;
    },
    expandOrContract: () => {}
  };
  return item;
}
