var express = require('express');
var conversationRouter = express.Router();
var confessionModel = require('./models/confession.js');
var conversationController = require('./controllers/conversations.js');
var config = require('./config.js');
conversationRouter.get('/:confessionid/new', (req, res)=>{
  confessionModel.findById(req.params.confessionid, (err, confession)=>{
    if(err) return res.sendStatus(404);
    res.render('conversation', {conversation: null});
  });
});
conversationRouter.post('/:confessionid/new', (req, res)=>{
  confessionModel.findById(req.params.confessionid, (err, confession)=>{
    if(err) return res.sendStatus(404);
    if(req.body.text){
      conversationController.createNewConversation(confession, (err, conversationid)=>{
        if(err) return res.sendStatus(500);
        conversationController.newMessage(conversationid, null, req.body.text, (err)=>{
          if(err)return res.send(err);
          return res.redirect(`/conversation/${conversationid}`);
        });
      });
    }
  });
});
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
  conversationController.newMessage(req.params.conversationid, req.params.auth, req.body.text, (err, isOP)=>{
    if(err)return res.send(err);
    conversationController.getConversation(req.params.conversationid, req.params.auth, (err, conversation)=>{
      if(err) return res.send(err);
      res.render('conversation', {conversation, siteURL: config.siteURL});
    });
  })
});
module.exports = conversationRouter;
