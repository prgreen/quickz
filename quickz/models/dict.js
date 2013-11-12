var mongoose = require('mongoose');

var dictSchema = new mongoose.Schema({word:String, definition:String, random:Number});
var dictModel = mongoose.model('dict', dictSchema, 'dict');

module.exports = exports = dictModel;