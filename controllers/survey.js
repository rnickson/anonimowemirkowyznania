const request = require('request');
const config = require('../config.js');
const tagController = require('../controllers/tags.js');
const actionController = require('../controllers/actions.js');
const surveyModel = require('../models/survey.js');
const loginEndpoint = 'https://www.wykop.pl/zaloguj/';
const addEntryEndpoint = 'http://www.wykop.pl/xhr/entry/create/';
const uploadAttachmentEndpoint = 'http://www.wykop.pl/xhr/embed/url/';
const idRegex = /data-id=\\"(\d{8})\\"/;
const hashRegex = /"([a-f0-9]{32}-\d{10})"/
const embedHashRegex = /"hash":"([A-Za-z0-9]{32})/;
const wykopSession = request.jar();
var hash
validateSurvey = function(survey){
  if(survey.question.length < 5){
    return {success: false, response: {message: 'Pytanie jest za krotkie.'}}
  }
  if(survey.answers.length < 2){
      return {success: false, response: {message: 'Musisz podać przynajmniej 2 odpowiedzi.'}}
  }
  if(survey.answers.length > 10){
      return {success: false, response: {message: 'Nie moze byc wiecej niz 10 odpowiedzi.'}}
  }
  return {success: true}
}
saveSurvey = function(confession, surveyData){
    var survey = new surveyModel();
    survey.question = surveyData.question;
    for(var i in surveyData.answers){
      if(surveyData.answers[i]){
        survey.answers.push(surveyData.answers[i]);
      }
    }
    survey.save((err)=>{
      confession.survey = survey._id;
      confession.save((err)=>{
        if(err) return false;
        return true;
      });
    });
}
wykopLogin = function(cb){
  cb=cb||function(){};
  request({method: 'POST', url: loginEndpoint, form: {'user[username]': config.wykop.username, 'user[password]': config.wykop.password}, jar:wykopSession}, function(err, response, body){
    if(response.statusCode == 302){
      //logged in
      request({method: 'GET', url: 'http://www.wykop.pl/info/', jar:wykopSession}, function(err, response, body){
        if(response.statusCode == 200){
        hash = body.match(hashRegex)[1];
        cb({success: true, response: {message: 'logged in', status: 'error'}});
      }else{
        cb({success: false, response: {message: 'Couldn\'t get hash', status: 'error'}})
      }
      });
    }else{
      cb({success: false, response: {message: 'Couldn\'t login', status: 'error'}})
    }
  });
}
acceptSurvey = function(confession, user, cb){
  cb=cb||function(){};
  var entryBody = `#anonimowemirkowyznania \n${confession.text}\n\n [Kliknij tutaj, aby odpowiedzieć w tym wątku anonimowo](${config.siteURL}/reply/${confession._id}) \n[Kliknij tutaj, aby wysłać OPowi anonimową wiadomość prywatną](${config.siteURL}/conversation/${confession._id}/new) \nPost dodany za pomocą skryptu AnonimoweMirkoWyznania ( ${config.siteURL} ) Zaakceptował: ${user.username}`;
  request({method:'POST', url: addEntryEndpoint+hash, form: {body: tagController.trimTags(entryBody, confession.tags), 'survey[answer]':confession.survey.answers, 'survey[question]': confession.survey.question, attachment: confession.embedHash}, jar:wykopSession}, function(err, response, body){
    try {
      var entryId = body.match(idRegex)[1];
    } catch (e) {
      return cb({success: false, code: codes.http.sessionExpired, response: {message: 'Renewing cookies, please try again in 10 seconds.', status: 'error'}})
    }
    actionController(confession, user._id, 1);
    confession.status = 1;
    confession.addedBy = user.username;
    confession.entryID = entryId;
    confession.save((err)=>{
      if(err) return cb({success: true, response: {message: 'couln\'t save confession', status: 'error'}});
      return cb({success: true, response: {message: 'Entry added: '+entryId, status: 'surveyAdded'}});
    });
  });
}
uploadAttachment = function(url, cb){
  request({method: 'POST', url: uploadAttachmentEndpoint+hash, form: {url}}, function(err, response, body){
    try {
      var hash = body.match(embedHashRegex)[1];
    } catch (e) {
      return cb({success: false, response: {message: 'couln\'t upload attachment'}});
    }
    return cb({success:true, hash: hash});
  });
}
module.exports = {
    validateSurvey, saveSurvey, acceptSurvey, wykopLogin, uploadAttachment
};
