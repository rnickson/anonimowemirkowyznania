var wykop = require('../wykop.js');
var tagController = require('../controllers/tags.js');
var actionController = require('../controllers/actions.js');
var config = require('../config.js');
getFollowers = function(entryID, notificationCommentId, cb){
  var followers = [];
  if(!notificationCommentId){
    return cb(null, followers);
  }
  wykop.request('Entries', 'Index', {params: [entryID]}, (err, entry)=>{
    if(err)return cb(err);
    for(var i in entry.comments){
      var current = entry.comments[i];
      if (current.id == notificationCommentId){
        if(current.voters){
          for(i in current.voters){
            followers.push(current.voters[i].author);
          }
        }
      }
    }
    return cb(null, followers);
  });
}
/**
 * get entry participants
 * @param  {int}   entryID entryID
 * @param  {Function} cb      callback
 */
getParticipants = function(entryID, cb){
  wykop.request('Entries', 'Index', {params: [entryID]}, (err, entry)=>{
    var participants = [];
    if(err) return cb(err);
    participants.push(entry.author);
    for(var i in entry.comments){
      if(participants.indexOf(entry.comments[i].author)==-1){
      participants.push(entry.comments[i].author);
      }
    }
    cb(null, participants);
  });
}
deleteEntry = function(entryID, cb){
  var archiveModel = require('../models/archive.js');
  wykop.request('Entries', 'Index', {params: [entryID]}, (err, entry)=>{
    if(err) return cb(err);
    var archive = new archiveModel();
    archive.entry = entry;
    archive.save((err)=>{
      if(err) return cb(err);
      wykop.request('Entries', 'Delete', {params: [entryID]}, (err, response)=>{
        if(err) return cb(err);
        return cb(null, response, entry);
      });
    });
  });
}
sendPrivateMessage = function(recipient, body, cb){
  wykop.request('PM', 'SendMessage', {params: [recipient], post: {body}}, (err, response)=>{
    if(err)return cb(err);
    cb(null, response);
  });
}
acceptConfession = function(confession, user, cb){
  var entryBody = `#anonimowemirkowyznania \n${confession.text}\n\n [Kliknij tutaj, aby odpowiedzieć w tym wątku anonimowo](${config.siteURL}/reply/${confession._id}) \n[Kliknij tutaj, aby wysłać OPowi anonimową wiadomość prywatną](${config.siteURL}/conversation/${confession._id}/new) \nPost dodany za pomocą skryptu AnonimoweMirkoWyznania ( ${config.siteURL} ) Zaakceptował: ${user.username}`;
  wykop.request('Entries', 'Add', {post: {body: tagController.trimTags(entryBody, confession.tags), embed: confession.embed}}, (err, response)=>{
    if(err){
      if(err.error.code==11){
        cb({success: false, response: {message: JSON.stringify(err), status: 'warning'}});
        throw err;
      }
      return cb({success: false, response: {message: JSON.stringify(err), status: 'warning'}});
    }
    confession.entryID = response.id;
    actionController(confession, user._id, 1);
    confession.status = 1;
    confession.addedBy = user.username;
    confession.save((err)=>{
      if(err)return cb({success: false, response: {message: err}});
      cb({success: true, response: {message: 'Entry added', entryID: response.id, status: 'success'}});
    });
  });
}
addNotificationComment = function(confession, user, cb){
  cb=cb||function(){};
wykop.request('Entries', 'AddComment', {params: [confession.entryID], post: {body: `Zaplusuj ten komentarz, aby otrzymywać powiadomienia o odpowiedziach w tym wątku. [Kliknij tutaj, jeśli chcesz skopiować listę obserwujących](${config.siteURL}/followers/${confession._id})\n Wspomóż mirkowyznania i wykup reklamę w tym miejscu reklama@${config.siteURL.substr(8)}`}}, (err, notificationComment)=>
    if(err) return cb({success: false, response: {message: err, status: 'error'}});
    confession.notificationCommentId = notificationComment.id;
    actionController(confession, user._id, 6);
    confession.save();
    return cb({success: true, response: {message: 'notificationComment added', status: 'success'}});
  });
}
acceptReply = function(reply, user, cb){
  var authorized = '';
  if(reply.authorized){
    authorized = '\n**Ten komentarz został dodany przez osobę dodającą wpis (OP)**';
  }
  var entryBody = `**${reply.alias}**: ${reply.text}\n${authorized}\nZaakceptował: ${user.username}`;
  getFollowers(reply.parentID.entryID, reply.parentID.notificationCommentId, (err, followers)=>{
    if(err)return cb({success: false, response:{message:JSON.stringify(err)}});
    if(followers.length > 0)entryBody+=`\n! Wołam obserwujących: ${followers.map(function(f){return '@'+f;}).join(', ')}`;
    wykop.request('Entries', 'AddComment', {params: [reply.parentID.entryID], post: {body: entryBody, embed: reply.embed}}, (err, response)=>{
      if(err) return cb({success: false, response: {message: JSON.stringify(err), status: 'warning'}});
      reply.commentID = response.id;
      reply.status = 1;
      reply.addedBy = user.username;
      actionController(reply.parentID, user._id, 8);
      reply.save((err)=>{
        if(err)return cb({success: false, response: {message: JSON.stringify(err)}});
        cb({success: true, response: {message: 'Reply added', commentID: response.id, status: 'success'}});
      });
    });
  });
}
module.exports = {
    acceptConfession, acceptReply, deleteEntry, sendPrivateMessage, getParticipants, addNotificationComment, getFollowers
};
