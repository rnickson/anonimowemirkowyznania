var config = require('./config.js');
var Wykop = require('../wykop-es6/lib/index.js');
var wykop = new Wykop(config.wykop.key, config.wykop.secret, {ssl: true});
wykop.relogin = function(){
  wykop.userkey = undefined;
  wykop.login(config.wykop.connection).then(function(res){
    console.log('logged In');
  });
}
wykop.relogin();
module.exports = wykop;
