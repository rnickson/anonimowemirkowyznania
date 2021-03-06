const WebSocketServer = require('ws').Server;
const url = require('url');
const fs = require('fs');
const https = require('https');
var conversationController = require('./conversations.js');
var options = {};
if (fs.existsSync('./certs')) {
    options.key = fs.readFileSync('./certs/privatekey.key');
    options.cert = fs.readFileSync('./certs/certificate.crt');
  if(fs.existsSync('./certs/ca_bundle.crt')){
    options.ca = fs.readFileSync('./certs/ca_bundle.crt');
  }
}
const httpsServer = https.createServer(options, (req, res) => {
  res.writeHead(200);
  res.end('hello world\n');
});
var wss = new WebSocketServer({server: httpsServer});
httpsServer.listen(1030);
wss.sendToChannel = function broadcast(channel, data) {
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
  switch (message.type) {
    case 'chatMsg':
      var time = new Date();
      if(message.msg.length>4096){return ws.send(JSON.stringify({type: 'alert', body: 'Wiadomość za długa.'}));}
      if((time - ws.lastMsg) < 1000)return ws.send(JSON.stringify({type: 'alert', body: 'Wysyłasz wiadomości za szybko.'}));
      ws.lastMsg = time;
      conversationController.newMessage(ws.conversation, ws.auth, message.msg, ws.IPAdress, (err, isOP)=>{
        if(err)return ws.send(JSON.stringify({type:'alert', body: err}));
        wss.sendToChannel(ws.conversation, JSON.stringify({type:'newMessage', msg: message.msg, username:isOP?'OP':'Użytkownik mikrobloga'}));
      });
      break;
    default:
    ws.send(JSON.stringify({type: 'alert', body: 'unknown message type'}));
  }
}
wss.on('connection', function(ws, req){
  ws.on('error', (err) => console.log(err));
  var url_parts = url.parse(req.url, true);
  var params = url_parts.query;
  ws.conversation = params.conversation;
  ws.auth = params.auth;
  ws.IPAdress = ws._socket.remoteAddress;
  conversationController.validateAuth(params.conversation, params.auth, (err, result)=>{
    if(err)ws.send(JSON.stringify({type: 'alert', body: err}));
    if(result)ws.authorized = true;
    ws.on('message', (message)=>{onMessage(ws, message)});
    return;
  });
});
module.exports = wss;
