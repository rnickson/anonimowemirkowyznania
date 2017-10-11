var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const statsModel = new mongoose.Schema({
    period: {type: mongoose.Schema.Types.String, enum:['day', 'month', 'year']},
    count: mongoose.Schema.Types.Mixed
});
statsModel.statics.addAction = function(type, username=undefined){
var date = new Date();
var periods = [['year', `${date.getFullYear()}`], ['month', `${date.getMonth()}-${date.getFullYear()}`], [
    'day', `${date.getDay()}-${date.getMonth()}-${date.getFullYear()}`]];
for (var i = 0; i < periods.length; i++) {
    var increment = {};
    increment[`count.${type}.${periods[i][1]}`] = 1;
    if(username)increment[`count.users.${username}.${type}.${periods[i][1]}`] = 1;
    this.updateOne({period: periods[i][0]}, {period: periods[i][0], $inc:increment}, {upsert: true}).exec(err=>{
    if(err)console.log(err);
    });
}
}
var stats = mongoose.model('stat', statsModel);
module.exports = stats;
