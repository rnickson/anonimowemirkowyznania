var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var analysisSchema = new Schema({
  username: String,
  entryId: Number
});

module.exports = mongoose.model('analyses', analysisSchema);
