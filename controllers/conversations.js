var conversationModel = require('../models/conversation.js');
var conversationController = {
  createNewConversation: function(parentObject, cb){
    var conversation = new conversationModel();
    /*
      WTF for some reason parentObject.hasOwnProperty('username') returns false
    */
    if('username' in parentObject){
      conversation.userID = parentObject._id;
      var userFlag=true;
    }else{
      conversation.parentID = parentObject._id;
    }
    conversation.save((err, conversation)=>{
      if(err) return cb(err);
      if(!userFlag){
        parentObject.conversations.push(conversation._id);
        parentObject.save((err)=>{
          if(err)return cb(err);
          cb(null, conversation._id);
        });
      }else{
        return cb(null, conversation._id);
      }
    });
  },
  validateAuth: function(conversationId, auth, cb){
    conversationModel.findOne({_id: conversationId}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err)return cb(err);
      if(!conversation)return cb('nie odnaleziono konwersacji'); //this returns string becouse validateAuth function result is sent in chat msg
      if(conversation.parentID === 'undefined' || conversation.parentID.auth == auth)return cb(null, true);
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
  newMessage: function(conversationId, auth, text, IPAdress, cb){
    conversationModel.findOne({_id: conversationId}, {"_id": 1, "parentID": 1}).populate('parentID', 'auth').exec((err, conversation)=>{
      if(err) return cb(err);
      if(!text) return cb('wpisz tresc wiadomosci');
      if(!conversation) return cb('nie odnaleziono konwersacji');
      isOP = auth==conversation.parentID.auth?true:false;
      conversationModel.findByIdAndUpdate(conversationId, {$push: {messages: {time: new Date(), text: text, IPAdress: IPAdress, OP:isOP}}}, {}, (err)=>{
        if(err) return cb(err);
        cb(null, isOP);
      });
  });
  }
}
module.exports = conversationController;
