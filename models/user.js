var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user = new Schema({
  username: String,
  password: String,
  avatar: String,
  userkey: String,
  flags: {type: Number, default: 0}
});

module.exports = mongoose.model('users', user);
