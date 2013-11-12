var mongoose = require('mongoose');
var textModel= require('../models/text');

exports.typez = function(req, res){
   
    res.render('admin_typez', { title: 'Typez Admin'});

};

exports.typez_post = function(req, res) {

	var test = textModel({title: req.body.typez_title, author: req.body.typez_author, text: req.body.typez_text});
	test.save();

	res.redirect('/');

};