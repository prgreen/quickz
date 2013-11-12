
exports.login = function(req, res){
   
    if (typeof req.session.username == 'undefined') res.render('login', { title: 'Quickz Login', login_error: req.session.login_error});

    else res.redirect('/lobby');
};

exports.login_post = function(req, res) {
	var username;
	var is_admin = false;
	
	if (req.body.username == "")
		username = "Anon" + (Math.floor(Math.random()*1000001)).toString();
	else {
		if (/[^a-zA-Z0-9]/.test(req.body.username)) {

			if (req.body.username.charAt(0) == '#') {
	        	if (! /[^a-zA-Z0-9]/.test(req.body.username.substring(1, req.body.username.length))) {

		        		//TODO check in database for admin table !
		        		is_admin = true;
		        		username = req.body.username.substring(1, req.body.username.length);

		        }
		        else return res.redirect('/login');

	        }
	        else {

				req.session.login_error = "ERROR: You can only use a-z A-Z 0-9 for your name. Try again.";
				return res.redirect('/login');
			}
			
		}
        else if (req.body.username.length > 15) {
            req.session.login_error = "ERROR: Your name may not exceed 15 characters.";
			return res.redirect('/login');
        } else username = req.body.username;
	}
    
	if (app.locals.users[username]) { //if already in use by someone else
		req.session.login_error = "ERROR: This username is already taken, please choose another one.";
		return res.redirect('/login');
	}
	req.session.login_error="";
    req.session.username = username;
    if (is_admin) 
    	req.session.role = 'admin';
    else
    	req.session.role = 'user';
	app.locals.users[username] = true;
    
	
    res.redirect('/lobby');
};