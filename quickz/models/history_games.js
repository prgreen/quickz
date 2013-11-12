// Model used to save completed games associated with a date
var mongoose = require('mongoose');

var userScoreSchema = new mongoose.Schema({user: String, score: Number});
var levelSchema = new mongoose.Schema({userScores: [userScoreSchema]});
var gameSchema = new mongoose.Schema({levels: [levelSchema]});

var savedGameSchema = new mongoose.Schema({game: [gameSchema], date: Date}); //forced to use list?
var savedGameModel = mongoose.model('game_history', savedGameSchema, 'game_history');

module.exports = exports = savedGameModel;