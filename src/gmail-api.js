import * as fs from "fs";
import * as _ from "lodash";

import {google, gmail} from "./gmail-http";

let cache = {};

loadCache();

exports.gmail = {};

exports.gmail.getUnreadInbox = function(logger) {
  return google(gmail.users.messages.list, {
    userId: 'me',
    labelIds: 'INBOX',
    q: 'is:unread'
  }, logger).then(results => {
    const cacheMisses = _.filter(results.messages, notInCache);
    const cacheHits = _.filter(results.messages, inCache);
    
    const messagePromises = _.map(cacheMisses, message => {
      return google(gmail.users.messages.get, {
        userId: 'me',
        id: message.id
      }, logger).then(null, err => console.log(err));
    });
    
    return Promise.all(messagePromises).then(messages => {
      messages.map(message => {
        cache[message.id] = message;
      });
      
      saveCache();
      return _.map(cacheHits, lookupInCache).concat(messages);
    });
  });
};

exports.gmail.archive = function(messageId, logger) {
  console.log(`archiving ${messageId}`);
  return google(gmail.users.messages.modify, {
    userId: 'me',
    id: messageId,
    resource: {
      removeLabelIds: [ "INBOX" ]
    }
  }, logger).then(null, err => console.log(err));
};

function notInCache(message) {
  return !inCache(message);
}
  
function inCache(message) {
  return !!cache[message.id];
}

function lookupInCache(message) {
  return cache[message.id];
}

function loadCache() {
  try {
    const cacheString = fs.readFileSync('.mailcache', { encoding: 'UTF-8' });
    cache = JSON.parse(cacheString);
  } catch (e) { }
}

function saveCache() {
  fs.writeFileSync('.mailcache', JSON.stringify(cache));
}

