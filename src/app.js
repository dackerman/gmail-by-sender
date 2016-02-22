import * as _ from "lodash";
import {gmail} from "./gmail-api";
import {createUI, group, listItem} from "./ui";

export function main() {
  const ui = createUI();

  const logger = {
    prompt: (text, cb) => {
      ui.prompt(text, cb);
    }
  };

  ui.onListSelect(item => {
    ui.updateMessagePane(item.body);
  });

  ui.onArchive(() => {
    const selectedMessages = ui.selectedMessages();
    if (!selectedMessages) {
      return;
    }

    let question = `Are you sure you want to archive ${selectedMessages.length} messages?`;
    ui.confirm(question, yes => {
      if (yes) {
        const pending = _.map(selectedMessages, message => {
          return gmail.archive(message.id, logger);
        });
        Promise.all(pending).then(() => {
          loadMessages();
        });
        ui.deselectAll();
      }
    });
  });
  
  function loadMessages() {
    // load data from gmail
    return gmail.getUnreadInbox(logger).then(messages => {
      const messageList = buildList(messages);
      ui.updateMessageList(messageList);
    }).then(null, err => console.error(err));
  }

  loadMessages();
}

function buildList(rawMessages) {
  const messages = rawMessages.map(fromRawMessage);
  const bySender = groupBySender(messages);

  return _.map(bySender, ({sender, messages}) => {
    return group(sender, _.map(messages, message => {
      return listItem(message.subject, message);
    }));
  });
}

function groupBySender(messages) {
  const grouped = _.reduce(messages, (bySender, message) => {
    let messages = bySender[message.sender] || [];
    messages.push(message);
    bySender[message.sender] = messages;
    return bySender;
  }, {});
  
  return Object.keys(grouped).sort().map(sender => {
    return {
      sender,
      messages: grouped[sender]
    };
  });
}

function fromRawMessage(gmailMessage) {
  return {
    id: gmailMessage.id,
    sender: getHeader('From', gmailMessage),
    subject: getHeader('Subject', gmailMessage),
    body: messageBody(gmailMessage)
  };
}
 
function messageBody(message) {
  const get = (parts, obj) => {
    for (let i=0; i < parts.length; i++) {
      obj = obj[parts[i]];
      if (!obj) return '';
    }
    return obj;
  };
  const base64Body = get(['payload', 'parts', 0, 'body', 'data'], message);
  return new Buffer(base64Body, 'base64').toString('ascii');
}

function getHeader(name, message) {
  const payload = message.payload || {};
  const headers = payload.headers || [];
  const match = _.first(_.filter(headers, (header) => header.name === name));
  return match && match.value;
}
