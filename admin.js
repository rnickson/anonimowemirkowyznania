var express = require('express');
var jwt = require('jsonwebtoken');
var adminRouter = express.Router();
var mongoose = require('mongoose');
var config = require('./config.js');
var confessionModel = require('./models/confession.js');
var conversationModel = require('./models/conversation.js');
var auth = require('./controllers/authorization.js');
var accessController = require('./controllers/access.js');
var replyModel = require('./models/reply.js');
var userModel = require('./models/user.js');
//authoriztion
adminRouter.get('/login', (req, res)=>{
  res.render('./admin/login.jade', {user: {}});
});
adminRouter.post('/login', (req, res)=>{
  userModel.findOne({
    username: req.body.username
  }, {_id: 1, username: 1, password: 1, flags:1}, (err, user)=>{
    if(err) throw err;

    if(!user){
      return res.render('./admin/login.jade', {user: {}, error: 'Nie znaleziono uzytkownia'});
    }
    if(user.password === req.body.password){
      //success login
      delete user.password;
      var token = jwt.sign(user, config.secret, {expiresIn: 1440*60});
      res.cookie('token', token);
      res.redirect('/admin/confessions');
    }else{
      return res.render('./admin/login.jade', {user: {}, error: 'Błędne hasło'});
    }
  });
});
adminRouter.get('/logout', (req, res)=>{
  res.clearCookie('token');
  return res.render('./admin/login.jade', {user: {}, error: 'Wylogowano'});
});
adminRouter.use(auth(true));
adminRouter.get('/', (req, res)=>{
  res.redirect('/admin/confessions');
});
adminRouter.get('/details/:confession_id', (req, res)=>{
  if(!accessController(req.user.flags, 'viewDetails'))return res.send('You\'re not permitted to see this page.');
  confessionModel.findById(req.params.confession_id).populate([{path:'actions', options:{sort: {_id: -1}}, populate: {path: 'user', select: 'username'}}, {path:'survey'}]).exec((err, confession)=>{
    if(err) return res.send(err);
    confessionModel.find({IPAdress: confession.IPAdress}, {_id: 1, status: 1}, function(err, results){
      if(err)return res.send(err);
      confession.addedFromSameIP = results;
      res.render('./admin/details.jade', {user: req.user, confession});
    });
  });
});
adminRouter.get('/confessions/:filter?', (req, res)=>{
  var search = {};
  req.params.filter?search = {status: req.params.filter}:search = {};
  confessionModel.find(search).sort({_id: -1}).limit(100).exec((err, confessions)=>{
    if(err) res.send(err);
    res.render('./admin/confessions.jade', {user: req.user, confessions: confessions});
  });
});
adminRouter.get('/replies', (req, res)=>{
  replyModel.find().populate('parentID').sort({_id: -1}).limit(100).exec((err, replies)=>{
    if(err) res.send(err);
    res.render('./admin/replies.jade', {user:req.user, replies: replies});
  });
});
adminRouter.get('/messages/', (req, res)=>{
  conversationModel.find({'userID': req.user._id}, {_id: 1}, {sort:{'messages.time':-1}, limit:200}, (err, conversations)=>{
    if(err)return res.send(err);
    res.render('./admin/messages.jade', {user:req.user, conversations});
  });
});
module.exports = adminRouter;
