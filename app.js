var express = require('express');
var app = express();
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var config = require('./config.js');
var Wykop = require('wykop-es6-2');
var wykop = new Wykop(config.wykop.key, config.wykop.secret);
var md5 = require('md5');
var apiRouter = require('./api.js');
var adminRouter = require('./admin.js');
var conversationRouter = require('./conversation.js');
var confessionModel = require('./models/confession.js');
var replyModel = require('./models/reply.js');
var userModel = require('./models/user.js');
var advertismentModel = require('./models/ads.js');
var statsModel = require('./models/stats.js');

var wykopController = require('./controllers/wykop.js');
var actionController = require('./controllers/actions.js');
var tagController = require('./controllers/tags.js');
var auth = require('./controllers/authorization.js');
var aliasGenerator = require('./controllers/aliases.js');
var surveyController = require('./controllers/survey.js');
var notifier = require('./controllers/notifierClient.js');

var crypto = require('crypto');
var https = require('https');
const fs = require('fs');
var _port = 1337;
if (typeof(PhusionPassenger) !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
    _port = 'passenger';
}
//wss server must be required after we tell Passenger that the app is binding 2 ports.
const wss = require('./controllers/wsServer.js');
var options = {};
if (fs.existsSync('./certs')) {
  options = {
    key: fs.readFileSync('./certs/privatekey.key'),
    cert: fs.readFileSync('./certs/certificate.crt')
  };
}
app.enable('trust proxy');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('public'));
app.use('/api', apiRouter);
app.use('/admin', adminRouter);
app.use('/conversation', conversationRouter);
app.use(auth(false));
app.set('view engine', 'jade');

app.get('/', (req, res)=>{
  res.render('index');
});
app.post('/', (req, res)=>{
  var confession = new confessionModel();
  if(req.body.survey&&req.body.survey.question){
    req.body.survey.answers = req.body.survey.answers.filter((e)=>{return e})
    var validationResult = surveyController.validateSurvey(req.body.survey);
    if(validationResult.success == false)return res.send(validationResult.response.message);
  }else{
    delete req.body.survey;
  }
  req.body.text = req.body.text||'';
  confession.text = req.body.text;
  confession.IPAdress = req.ip;
  confession.embed = req.body.embed;
  confession.tags = tagController.getTags(req.body.text);
  confession.auth = crypto.randomBytes(5).toString('hex');
  actionController(confession, null, 0);
  confession.save((err)=>{
    if(err) return res.send(err);
    if(req.body.survey){
      surveyController.saveSurvey(confession, req.body.survey);
      statsModel.addAction('new_surveys');
    }
    statsModel.addAction('new_confessions');
    notifier('confession', String(confession._id));
    res.redirect(`confession/${confession._id}/${confession.auth}`);
  });
});
app.get('/login', (req, res)=>{
  var redirectURL = encodeURIComponent(new Buffer(config.siteURL).toString('base64'));
  var secureKey = md5(config.wykop.secret+config.siteURL);
  res.redirect(`http://a.wykop.pl/user/connect/appkey,${config.wykop.key},userkey,secure,${secureKey},redirect,${redirectURL}`);
});
app.get('/connect', (req, res)=>{
  //req.query.connectData
  var authDetails = JSON.parse(new Buffer(req.query.connectData, 'base64').toString('utf-8'));
  wykop.request('User', 'Login', {post: {accountkey: authDetails.token}}).then(function(response){
    userModel.findOneAndUpdate({username: response.login}, {avatar: response.avatar, userkey: response.userkey}, {upsert: true}, (err, loggedUser)=>{
      if(err) throw err;
      var token = jwt.sign(loggedUser, config.secret, {expiresIn: 1440*60});
      res.cookie('token', token);
      res.redirect('/');
    });
  });
});
/*tutaj trzeba wyswietlic ogolne informacje o wyznaniu akcje i konwersacje*/
app.get('/confession/:confessionid/:auth', (req, res)=>{
  if(!req.params.confessionid || !req.params.auth){
    return res.sendStatus(400);
  }else{
    confessionModel.findOne({_id: req.params.confessionid, auth: req.params.auth}).populate([{path:'actions', options:{sort: {_id: -1}}, populate: {path: 'user', select: 'username'}}, {path:'survey'}]).exec((err, confession)=>{
      if(err) return res.send(err);
      if(!confession)return res.sendStatus(404);
      res.render('confession', {confession: confession});
    });
  }
});
app.get('/reply/:confessionid?', (req, res)=>{
  if(!req.params.confessionid){
    return res.sendStatus(400);
  }else{
    confessionModel.findById(req.params.confessionid, (err, confession)=>{
      if(err)return res.sendStatus(404);
      wykopController.getParticipants(confession.entryID, (err, participants)=>{
        if(err) participants=[];
        confession.participants = participants;
        res.render('reply', {confession: confession});
      });
    });
  }
});
app.post('/reply/:confessionid', (req, res)=>{
  confessionModel.findById(req.params.confessionid, (err, confession)=>{
    if(err)return res.sendStatus(404);
    if(confession){
    actionController(confession, null, 4);
    var reply = new replyModel();
    reply.text = req.body.text;
    reply.IPAdress = req.ip;
    reply.embed = req.body.embed;
    reply.alias = req.body.alias || aliasGenerator(Math.random() >= 0.5);
    if(reply.alias.trim() == confession.auth){
      reply.alias = "OP";
      reply.authorized = true;
    }
    reply.auth = crypto.randomBytes(5).toString('hex');
    reply.parentID = confession._id;
    reply.save((err)=>{
      if(err) res.send(err);
        statsModel.addAction('new_reply');
        notifier('reply', String(reply._id));
        res.render('reply', {success: true, reply: reply, confession: confession});
    });
    }else{
        return res.sendStatus(404);
    }
  });
});
app.get('/followers/:confessionid', (req, res)=>{
  confessionModel.findById(req.params.confessionid, (err, confession)=>{
    if(err)return res.sendStatus(404);
    if(confession){
    wykopController.getFollowers(confession.entryID, confession.notificationCommentId, (err, followers)=>{
      if(err)return res.json(err);
        res.send(followers.map(function(f){
          return '@'+f;
        }).join(', '));
    });
  }else{
    res.sendStatus(404);
  }
  });
});
app.get('/cotojest', (req, res)=>{
  res.render('cotojest');
});
app.get('/twojewyznania', (req, res)=>{
  res.render('confessionsList');
});
app.get('/kontakt', (req, res)=>{
  res.render('kontakt');
});
app.get('/link/:linkId/:from', function(req, res){
    advertismentModel.findOne({_id: req.params.linkId}, function(err, ad){
      if(err || !ad)return 404;
      ad.visits.push({IPAdress: req.ip, from: req.params.from});
      ad.save();
      res.redirect(ad.out);
    });
});
// app.listen(_port, ()=>{
//   console.log('listening on port '+_port);
// });
var httpsServer = https.createServer(options, app);
httpsServer.listen(_port);
