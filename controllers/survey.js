const request = require('request');
const config = require('../config.js');
const tagController = require('./tags.js');
const actionController = require('./actions.js');
const surveyModel = require('../models/survey.js');
const bodyBuildier = require('./bodyBuildier.js');

const loginEndpoint = 'https://www.wykop.pl/zaloguj/';
// const addEntryEndpoint = 'http://www.wykop.pl/xhr/entry/create/';
const addEntryEndpoint = 'https://www.wykop.pl/ajax2/wpis/dodaj/hash/';
// const uploadAttachmentEndpoint = 'http://www.wykop.pl/xhr/embed/url/';
const uploadAttachmentEndpoint = 'https://www.wykop.pl/ajax2/embed/url/hash/';
const idRegex = /data-id=\\"(\d{8})\\"/;
const hashRegex = /"([a-f0-9]{32}-\d{10})"/
const embedHashRegex = /"hash":"([A-Za-z0-9]{32})/;
const wykopSession = request.jar();
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:58.0) Gecko/20100101 Firefox/58.0";
var hash;
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
  if(survey.question.length > 100){
      return {success: false, response: {message: 'Maksymalna długość pytania to 100 znakow.'}}
  }
  for(var i in survey.answers){
    if(survey.answers[i].length>50){ return {success: false, response: {message: 'Maksymalna długość odpowiedzi to 50 znakow.'}}}
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
      if(err)return;
      confession.survey = survey._id;
      confession.save((err)=>{
        if(err) return false;
        return true;
      });
    });
}
wykopLogin = function(cb){
  cb=cb||function(){};
    request({method: 'POST', url: loginEndpoint, form: {'user[username]': config.wykop.username, 'user[password]': config.wykop.password}, jar:wykopSession, headers: {'User-Agent': userAgent}}, function(err, response, body){
      if(!err && response.statusCode == 302){
        //logged in
        request({method: 'GET', url: 'https://www.wykop.pl/info/', jar:wykopSession}, function(err, response, body){
          if(response.statusCode === 200){
            hash = body.match(hashRegex)[1];
            return cb({success: true, response: {message: 'logged in', status: 'error'}});
          }else{
            return cb({success: false, response: {message: 'Couldn\'t get hash', status: 'error'}})
          }
        });
      }else{
        return cb({success: false, response: {message: 'Couldn\'t login', status: 'error'}})
      }
    });
}
acceptSurvey = function(confession, user, cb){
  cb=cb||function(){};
  bodyBuildier.getEntryBody(confession, user, function(entryBody){
    uploadAttachment(confession.embed, (result)=>{
      if(!result.success)return cb({success: false, response: {message: 'couln\'t upload attachment', status: 'error'}});
      //its required for some reason, otherwise CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
      var answers = confession.survey.answers.map((v)=>{return v;});
      var data = {body: entryBody, attachment: result.hash, 'survey[question]': confession.survey.question, 'survey[answers]': answers};
      request({method:'POST', url: addEntryEndpoint+hash, form: data, jar:wykopSession}, function(err, response, body){
        if(err)return cb({success: false, response: {message: 'Wykop umar', status: 'error'}});
        if(!(body.substr(0,8)=='for(;;);'))return cb({success: false, relogin: true, response:{message:'Session expired, reloging'}});
        try {
          var entryId = body.match(idRegex)[1];
        } catch (e) {
          var flag;
          (body.search('Sesja')>-1)?flag=true:flag=false;
          return cb({success: false, relogin: flag, response: {message: body, status: 'error'}})
        }
        actionController(confession, user._id, 1);
        confession.status = 1;
        confession.addedBy = user.username;
        confession.entryID = entryId;
        confession.save((err)=>{
          if(err)return cb({success: false, response: {message: 'couln\'t save confession', status: 'error'}});
          return cb({success: true, response: {message: 'Entry added: '+entryId, status: 'success'}});
        });
      });
    });
  });
}
uploadAttachment = function(url, cb){
  if(!url)return cb({success: true, hash: null});
  request({method: 'POST', url: uploadAttachmentEndpoint+hash, form: {url}}, function(err, response, body){
    if(err)return cb({success: false});
    try {
      var hash = body.match(embedHashRegex)[1];
    } catch (e) {
      return cb({success: false});
    }
    return cb({success:true, hash: hash});
  });
}
wykopLogin();
module.exports = {
    validateSurvey, saveSurvey, acceptSurvey, wykopLogin
};
