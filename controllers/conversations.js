var conversationModel = require('../models/conversation.js');
var conversationController = {
  createNewConversation: function(confession, cb){
    var conversation = new conversationModel();
    conversation.parentID = confession._id;
    conversation.save((err, conversation)=>{
      if(err) return;
      confession.conversations.push(conversation._id);
      confession.save((err)=>{
        cb(err, conversation._id);
      });
    });
  },
  getConversation: function(conversationId, auth, authRequired, cb){
    conversationModel.findOne({_id: conversationId}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err) return cb(err);
      if(!conversation) return cb('nie odnaleziono konwersacji');
      if(authRequired?auth==conversation.parentID.auth?true:false:true)return cb(err, conversation);
      return cb('auth code doesn\'t match');
  });
  },
  newMessage: function(conversationId, auth, text, cb){
    conversationModel.findOne({_id: conversationId}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err) return cb(err);
      if(!text) return cb('wpisz tresc wiadomosci');
      if(!conversation) return cb('nie odnaleziono konwersacji');
      if(conversation.messages.length&&conversation.messages[conversation.messages.length-1].text==text)return cb(null);
      conversation.messages.push({time: new Date(), text: text, OP:auth==conversation.parentID.auth?true:false});
      conversation.save((err)=>{
        if(err) return cb(err);
        cb(null);
      });
  });
  }
}
module.exports = conversationController;
