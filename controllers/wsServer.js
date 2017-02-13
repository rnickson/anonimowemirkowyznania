const WebSocketServer = require('uws').Server;
const url = require('url');
var conversationController = require('./conversations.js');
const app = require('../app.js');
var wss = new WebSocketServer({server: app, port: 8090});
var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
  return entityMap[s];
  });
}
WebSocketServer.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(data);
    }
  });
};
WebSocketServer.sendToChannel = function broadcast(channel, data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === 1 && client.conversation == channel) {
      client.send(data);
    }
  });
};

function onMessage(ws, message) {
  try {
    message = JSON.parse(message);
  } catch (e) {
    return ws.send(JSON.stringify({type:'alert', body: 'Coś popsułeś.'}));
  }
  message.msg = escapeHtml(message.msg);
  switch (message.type) {
    case 'chatMsg':
      var time = new Date();
      if(message.msg.length>1024){return ws.send(JSON.stringify({type: 'alert', body: 'Wiadomość za długa.'}));}
      if((time - ws.lastMsg) < 1000)return ws.send(JSON.stringify({type: 'alert', body: 'Wysyłasz wiadomości za szybko.'}));
      ws.lastMsg = time;
      conversationController.newMessage(ws.conversation, ws.auth, message.msg, (err, isOP)=>{
        if(err)return ws.send(JSON.stringify({type:'alert', body: err}));
        WebSocketServer.sendToChannel(ws.conversation, JSON.stringify({type:'newMessage', msg: message.msg, username:isOP?'OP':'Użytkownik mikrobloga'}));
      });
      break;
    default:
    ws.send(JSON.stringify({type: 'alert', body: 'unknown message type'}));
  }
}
wss.on('connection', function(ws){
  var url_parts = url.parse(ws.upgradeReq.url, true);
  var params = url_parts.query;
  ws.conversation = params.conversation;
  ws.auth = params.auth;
  conversationController.validateAuth(params.conversation, params.auth, (err, result)=>{
    if(err)ws.send({type: 'alert', body: err});
    if(result)ws.authorized = true;
    ws.on('message', (message)=>{onMessage(ws, message)});
    return;
  });
});
module.exports = wss;
