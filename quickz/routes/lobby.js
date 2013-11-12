exports.lobby = function(req, res){
   
    res.render('lobby', { title: 'Quickz Lobby', username: req.session.username});
};