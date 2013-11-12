//WARNING This model is obsolete and not used anymore (see dict)

var mongoose = require('mongoose');

var textSchema = new mongoose.Schema({title:String, author:String, text:String});
var textModel = mongoose.model('text', textSchema);

module.exports = exports = textModel;