var express = require('express');
var apiRouter = express.Router();
var mongoose = require('mongoose');
var wykop = require('./wykop.js');
var wykopController = require('./controllers/wykop.js');
var surveyController = require('./controllers/survey.js');
var actionController = require('./controllers/actions.js');
var tagController = require('./controllers/tags.js');
var auth = require('./controllers/authorization.js');
var accessController = require('./controllers/access.js');
var config = require('./config.js');
var confessionModel = require('./models/confession.js');
var replyModel = require('./models/reply.js');

mongoose.connect(config.mongoURL, (err)=>{
  if(err) throw err;
});
/* api router */
apiRouter.get('/', (req, res)=>{
  res.json({success: true, response: {message: 'API is working!'}});
});
apiRouter.get('/participants/:entry_id', (req, res)=>{
  wykopController.getParticipants(req.params.entry_id, (err, participants)=>{
    if(err)return res.json(err);
    res.json(participants);
  });
});
apiRouter.use(auth);
apiRouter.route('/confession/accept/:confession_id').get((req, res)=>{
  if(!accessController(req.user.flags, 'addEntry'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  confessionModel.findById(req.params.confession_id).populate('survey').exec((err, confession)=>{
    if(err) return res.send(err);
    if(confession.entryID && confession.status==1){
      res.json({success: false, response: {message: 'It\'s already added', entryID: confession.entryID, status: 'danger'}});
      return;
    }
    if(confession.status == -1){
      res.json({success: false, response: {message: 'It\'s marked as dangerous, unmark first', status: 'danger'}});
      return;
    }
    if(confession.survey){
      surveyController.acceptSurvey(confession, req.user, function(result){
        if(!result.success){
          surveyController.wykopLogin();
        }
        if(result.success)wykopController.addNotificationComment(confession, req.user);
        res.json(result);
      });
    }else{
      wykopController.acceptConfession(confession, req.user, function(result){
        if(result.success)wykopController.addNotificationComment(confession, req.user);
        res.json(result);
      });
    }
  })
});
apiRouter.route('/confession/danger/:confession_id').get((req, res)=>{
  if(!accessController(req.user.flags, 'setStatus'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  confessionModel.findById(req.params.confession_id, (err, confession)=>{
    if(err) return res.json(err);
    confession.status==-1?confession.status=0:confession.status=-1;
    var status = confession.status==0?'warning':'danger';
    var actionType = confession.status==0?3:2;
    actionController(confession, req.user._id, actionType);
    confession.save((err)=>{
      if(err) return res.json({success: false, response: {message: err}});
      res.json({success: true, response: {message: 'Zaaktualizowano status', status: status}});
    });
  });
});
apiRouter.route('/confession/tags/:confession_id/:tag').get((req, res)=>{
  if(!accessController(req.user.flags, 'updateTags'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  //there's probably more clean way to do this.
  confessionModel.findById(req.params.confession_id, (err, confession)=>{
    if(err)return res.send(err);
    actionController(confession, req.user._id, 9);
    confessionModel.update({_id: req.params.confession_id}, {$set: {tags: tagController.prepareArray(confession.tags, req.params.tag)}}, (err)=>{
      if(err)return res.json({success: false, response: {message: err}});
      res.json({success: true, response: {message: 'Tagi zaaktualizowano', status: 'success'}});
    });
  });
});
apiRouter.route('/confession/delete/:confession_id').get((req, res)=>{
  if(!accessController(req.user.flags, 'deleteEntry'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  confessionModel.findById(req.params.confession_id, (err, confession)=>{
    if(err) return res.send(err);
    wykopController.deleteEntry(confession.entryID, (err, result, deletedEntry)=>{
      if(err) return res.json({success: false, response: {message: err.error.message}});
        actionController(confession, req.user._id, 5);
        confession.status = -1;
        confession.save((err)=>{
          if(err)return res.json({success: false, response: {message: err}});
          res.json({success: true, response: {message: `Usunięto wpis ID: ${result.id}`}});
          wykopController.sendPrivateMessage('sokytsinolop', `${req.user.username} usunął wpis \n ${deletedEntry.id}`, ()=>{});
      });
    });
  });
});
apiRouter.route('/reply/accept/:reply_id').get((req, res)=>{
  if(!accessController(req.user.flags, 'addReply'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  replyModel.findById(req.params.reply_id).populate('parentID').exec((err, reply)=>{
    if(err) return console.log(err);
    if(reply.commentID){
      res.json({success: false, response: {message: 'It\'s already added', commentID: reply.commentID, status: 'danger'}});
      return;
    }
    if(reply.status == -1){
      res.json({success: false, response: {message: 'It\'s marked as dangerous, unmark first', status: 'danger'}});
      return;
    }
    wykopController.acceptReply(reply, req.user, function(result){
      res.json(result);
    });
  });
});
apiRouter.route('/reply/danger/:reply_id').get((req, res)=>{
  if(!accessController(req.user.flags, 'setStatus'))return res.json({success: false, response: {message: 'You\'re not allowed to perform this action'}});
  replyModel.findById(req.params.reply_id).populate('parentID').exec((err, reply)=>{
    if(err) return console.log(err);
    var message = '';
    reply.status==-1?reply.status=0:reply.status=-1;
    var status = reply.status==0?'warning':'danger';
    var actionType = reply.status==0?3:2;
    reply.save((err)=>{
      if(err) res.json({success: false, response: {message: err}});
      actionController(reply.parentID, req.user._id, actionType);
      res.json({success: true, response: {message: 'Status zaaktualizowany', status: status}});
    });
  });
});
module.exports = apiRouter;
