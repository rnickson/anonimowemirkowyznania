var express = require('express');
var conversationRouter = express.Router();
var confessionModel = require('./models/confession.js');
var userModel = require('./models/user.js');
var conversationController = require('./controllers/conversations.js');
var config = require('./config.js');
var auth = require('./auth.js');
conversationRouter.use(auth(false));
conversationRouter.get('/:parent/new', (req, res, next)=>{
  if(req.params.parent.substr(0,2) === 'U_'){
    var username = req.params.parent.substr(2);
    userModel.findOne({username: username}, {_id:1, username:1}, function(err, userObject){
      if(err)return res.sendStatus(503);
      if(!userObject)return res.sendStatus(404);
      return res.render('conversation', {type:'user', userObject});
    });
  }else{
    confessionModel.findById(req.params.parent, (err, confession)=>{
      if(err) return res.sendStatus(404);
      return res.render('conversation', {type:'confession', confession});
    });
  }
});
function createConversationMiddleware(req, res){
  conversationController.createNewConversation(res.locals.conversationParent, (err, conversationid)=>{
    if(err) return res.sendStatus(err);
    conversationController.newMessage(conversationid, null, req.body.text, req.ip, (err)=>{
      if(err)return res.sendStatus(500);
      return res.redirect(`/conversation/${conversationid}`);
    });
  });
}
conversationRouter.post('/:parent/new', (req, res, next)=>{
    if(!req.body.text)return res.sendStatus(400);
    if(req.params.parent.substr(0,2) == 'U_'){
      var username = req.params.parent.substr(2);
        userModel.findOne({username: username}, {_id:1, username: 1}, function(err, userObject) {
          if(err)return res.sendStatus(503);
          if(!userObject)return res.sendStatus(404);
          res.locals.conversationParent = userObject;
          return next();
        });
    }else{
      confessionModel.findById(req.params.parent, (err, confession)=>{
        if(err) return res.sendStatus(404);
        res.locals.conversationParent = conversation;
        return next();
      });
    }
}, createConversationMiddleware);
conversationRouter.get('/:conversationid/:auth?', (req, res)=>{
  if(!req.params.conversationid){
    return res.sendStatus(400);
  }
  conversationController.getConversation(req.params.conversationid, req.params.auth, (err, conversation)=>{
    if(err) return res.send(err);
    res.render('conversation', {conversation, siteURL: config.siteURL});
  });
});
conversationRouter.post('/:conversationid/:auth?', (req, res)=>{
  if(!req.params.conversationid){
    return res.sendStatus(400);
  }
  conversationController.newMessage(req.params.conversationid, req.params.auth, req.body.text, req.ip, (err, isOP)=>{
    if(err)return res.send(err);
    conversationController.getConversation(req.params.conversationid, req.params.auth, (err, conversation)=>{
      if(err) return res.send(err);
      res.render('conversation', {conversation, siteURL: config.siteURL});
    });
  })
});
module.exports = conversationRouter;
