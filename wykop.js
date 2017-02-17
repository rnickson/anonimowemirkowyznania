var config = require('./config.js');
var Wykop = require('wykop-es6');
var wykop = new Wykop(config.wykop.key, config.wykop.secret, {ssl: true});
wykop.relogin = function(){
  wykop.login(config.wykop.connection).then(function(res){
    console.log('logged In');
  });
}
wykop.relogin();
module.exports = wykop;
