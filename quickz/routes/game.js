exports.typez = function(req, res){
   res.render('typez', { title: 'Typez', username: req.session.username});
};