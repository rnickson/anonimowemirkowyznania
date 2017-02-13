var ws = new WebSocket(`ws://localhost:8090/?conversation=${conversationId}&auth=${authCode}`);
ws.onopen = function(){
  ws.onmessage = handleMessage;
}
handleMessage = function(message){
  var message = JSON.parse(message.data);
  switch (message.type) {
    case 'newMessage':
      var html = `<div class=\"row message-bubble ${message.username=='OP'?'operator':''}\"><p class=\"text-muted\">${message.username}</p><span>${message.msg}</span></div>`;
      $('#messages').append(html);
      break;
    default:
    alert(message.body);
  }
}
sendMessage = function(msg){
  msg = msg.trim();
  if(!msg)return alert('Wpisz wiadomość');
  if(msg.length>1024)return alert('Wiadomość jest za długa');
  ws.send(JSON.stringify({type: 'chatMsg', msg: msg}));
  $("#messageBox").val('');
}
$('.sendMessage').click(function(){
  var msg = $('#messageBox').val();
  sendMessage(msg);
});
$("#messageBox").keypress(function(event) {
    if (event.which == 13) {
        event.preventDefault();
        var msg = $(this).val();
        sendMessage(msg);
    }
});
