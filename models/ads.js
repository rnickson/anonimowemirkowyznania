var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var advertismentSchema = new Schema({
    name: String,
    captions: [String],
    active: Boolean,
    visits: [{IPAdress: String, time: {type: Date, default: Date.now}, from: {type: Schema.Types.ObjectId, ref: 'confessions'}}, {_id: false}],
    out: String,
});

advertismentSchema.statics.random = function(callback) {
    this.count(function(err, count) {
      if (err) {
        return callback(err);
      }
      var rand = Math.floor(Math.random() * count);
      this.findOne({}, 'name captions out').skip(rand).exec(callback);
    }.bind(this));
  };
module.exports = mongoose.model('advertisments', advertismentSchema);
