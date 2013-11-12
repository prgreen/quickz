// Model used to save scores of all completed levels in an undergoing game
var mongoose = require('mongoose');

var userScoreSchema = new mongoose.Schema({user: String, score: Number});
var levelSchema = new mongoose.Schema({userScores: [userScoreSchema]});
var gameSchema = new mongoose.Schema({levels: [levelSchema]});
var gameModel = mongoose.model('current_game', gameSchema, 'current_game');

module.exports = exports = gameModel;