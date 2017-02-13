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
  validateAuth: function(conversationId, auth, cb){
    conversationModel.findOne({_id: conversationId}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err)return cb(err);
      if(!conversation)return cb('nie odnaleziono konwersacji');
      if(conversation.parentID.auth == auth)return cb(null, true);
      cb(null, false);
    });
  },
  getConversation: function(conversationId, auth, cb){
    conversationModel.findOne({_id: conversationId}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err) return cb(err);
      if(!conversation) return cb('nie odnaleziono konwersacji');
      if(auth!==conversation.parentID.auth){conversation.parentID.auth = '';};
      return cb(err, conversation);
  });
  },
  newMessage: function(conversationId, auth, text, cb){
    conversationModel.findOne({_id: conversationId}, {"_id": 1, "parentID": 1}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err) return cb(err);
      if(!text) return cb('wpisz tresc wiadomosci');
      if(!conversation) return cb('nie odnaleziono konwersacji');
      isOP = auth==conversation.parentID.auth?true:false;
      conversationModel.findByIdAndUpdate(conversationId, {$push: {messages: {time: new Date(), text: text, OP:isOP}}}, {}, (err)=>{
        if(err) return cb(err);
        cb(null, isOP);
      });
  });
  }
}
module.exports = conversationController;
