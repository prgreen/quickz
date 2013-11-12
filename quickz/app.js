
// FOR PRODUCTION USE ON DEDICATED SERVER:
// clone mercurial repository
// npm install
// start a mongod instance
// optional(use nginx to serve static files and as a proxy)

// CONFIGURATION
var express = require('express')
  , login = require('./routes/login')
  , lobby = require('./routes/lobby')
  , admin = require('./routes/admin')
  , game = require('./routes/game')
  , http = require('http')
  , path = require('path')
  , connect = require('express/node_modules/connect')
  , parseSignedCookie = connect.utils.parseSignedCookies
  , cookie = require('express/node_modules/cookie');

app = express();

var session_store = new express.session.MemoryStore();

var SITE_SECRET = 'DdfqslmkKEZ23';

var server = http.createServer(app)
  , io = require('socket.io').listen(server);

var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/quickz', function(err){
  if (err) {
    console.log ('No connection to the MongoDb database could be made on localhost. Aborting...')
    process.exit(1);
  }
});

var textModel = require('./models/text'); //not used!
var dictModel = require('./models/dict');
var gameModel = require('./models/current_games');
var savedGameModel = require('./models/history_games');

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon(__dirname + '/public/images/favicon.ico', { maxAge: 2592000000 }));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser(SITE_SECRET));
  app.use(express.session({key: 'express.sid', store: session_store}));
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

//GLOBAL//////////////
MAX_WORDS_PER_TEXT = 10; //generate 5000 for production
TIME_PER_TEXT = 62; //in seconds, +2 seconds to account for various latencies
app.locals.users = {}; // app.locals variable are accessible from the views

typez_text = "";
typez_level = 1;
typez_timer_global = null;
typez_timer_stamp = (new Date()).getTime(); //reset every time a new level starts

var typez_timer = function() {
  
  typez_timer_global = setTimeout(function(){
    console.log("Typez level timed out! New adventure starting...");
    var current_level = typez_level;
    //go back to level 1
    typez_level = 1;
    typez_timer_stamp = (new Date()).getTime();

    // this also means current level is over
    var adventure_user_to_score = {};
    gameModel.findOne({}, function(err, obj){
      if (!err && obj) {
        for (var i = 0 ; i < obj.levels.length ;  i++) {
          for (var j = 0 ; j < obj.levels[i].userScores.length ; j++) {
            if (!(obj.levels[i].userScores[j].user in adventure_user_to_score))
              adventure_user_to_score[obj.levels[i].userScores[j].user] = 0;
            adventure_user_to_score[obj.levels[i].userScores[j].user] += obj.levels[i].userScores[j].score;
          }
        }

        // sort scores before sending them
        var sortable = [];
        for (var u in adventure_user_to_score)
          sortable.push([u, adventure_user_to_score[u]]);
        sortable.sort(function(a,b){return b[1] - a[1]});


        io.sockets.emit('level scores', {next_level: typez_level, current_level: current_level, scores: sortable}); //TODO score for incomplete levels ? score for adventure ? 
        //save current game in database (if not failed level 1) and wipe current_game collection
        if (current_level == 1 && typez_level == 1) {
          gameModel.remove({}, function(err) {});
        } else {
          gameModel.findOne({}, function(err, obj){
            if (!err && obj) {
              var game_obj = new gameModel(obj);
              var game_to_save = savedGameModel({date: Date.now()});
              game_to_save.game.push(game_obj);
              game_to_save.save();
              gameModel.remove({}, function(err) {});
            }
          });
        }
      }

    });
    
    
    

    //TODO put this mess in its own function
    validated_lines = [];
    typez_text = "";
    var counter = 0; // in order to wait for async ops to complete
    // increment counter for each async, decr for each callback
    for (var i = 0; i < MAX_WORDS_PER_TEXT * typez_level; i++) {
      var rand = Math.random();
      counter++;
      dictModel.findOne({random: {$gte: rand}}, function(err, obj){
        if (!err) {
          if (obj) {
            typez_text += obj.word + ' ';
            counter--;
          }
          else {
            dictModel.findOne({random: {$lte: rand}}, function(err, obj){ 
              if (!err) {
                if (obj) {
                  typez_text += obj.word + ' ';
                  counter--;
                }

            }});
              
            }
          };
        });
        }

    //wait for counter to be 0 = all text obtained
    function doInterval(){
      //console.log(counter + ' jobs remaining...');
      if (counter == 0) {
        //console.log ('this is after all jobs have completed');
        
        io.sockets.emit('full text', {full_text:typez_text, "validated_lines":validated_lines, level: typez_level, seconds: Math.floor(TIME_PER_TEXT - ((new Date()).getTime()-typez_timer_stamp)/1000)});

        //TODO start timer for failure of current level
        typez_timer();


      } else {             
        process.nextTick(doInterval);
      }    
    }
    doInterval();
  }, TIME_PER_TEXT * 1000);
};

typez_timer();
//var test = textModel({id:1, text:"Replace with call to database or whatever. This is just an example test with repeating words."});
//test.save();
/*
textModel.findOne({}, function(err, obj){
  if (!err) {
    if (obj)
    {
      typez_text = obj.text;
      console.log(obj);
    }
    else console.log("No text found in database!");
  } else {
    console.log ("Error: "+err);
  }
});*/

for (var i = 0; i < MAX_WORDS_PER_TEXT; i++) {
  var rand = Math.random();
  dictModel.findOne({random: {$gte: rand}}, function(err, obj){
    if (!err) {
      if (obj) {
        typez_text += obj.word + ' ';
      }
      else {
        dictModel.findOne({random: {$lte: rand}}, function(err, obj){ 
          if (!err) {
            if (obj) {
              typez_text += obj.word + ' ';
            }

        }});
      
    }
  };
});
}

var validated_lines = [];
//////////////////////

//HELPERS/////////////////
//TODO find a better place for this?

scrabbleTable = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10
};

function scrabbleScore(txt) {
  var score = 0;
  if (txt != undefined) {
    for (var i = 0; i < txt.length; i++) {
      if(scrabbleTable[txt.charAt(i).toUpperCase()] != undefined) {
        score += scrabbleTable[txt.charAt(i).toUpperCase()];
      }
    }
  }
  return score;
}
function escapeHtml(unsafe) {
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}
function getIndicesOf(searchStr, str, caseSensitive) {
    var startIndex = 0, searchStrLen = searchStr.length;
    var index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}


// URL ROUTES
function requireRole(role) {
    return function(req, res, next) {
        if(req.session.username && (req.session.role === role || req.session.role === 'admin'))
            next();
        else
            res.redirect('/');
    }
}

app.get('/', function(req,res){res.redirect("/login");});

app.get('/login', login.login);
app.post('/login', login.login_post);

app.get('/logout', function(req, res) {
	delete app.locals.users[req.session.username];
  delete req.session.username;
  res.redirect('/');
});

app.get('/lobby', requireRole('user'), lobby.lobby);
app.get('/game/typez', requireRole('user'), game.typez);

app.get('/game/typez/admin', requireRole('admin'), admin.typez);
app.post('/game/typez/admin', requireRole('admin'), admin.typez_post);

// RUN SERVER
server.listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port') + " in " + app.get('env') + " mode");
});


// SOCKET.IO
io.set('authorization', function(data, accept){
    // find and parse the cookie to find session id
    // once available handshake.sessionID and handshake.session.functions 
    // can be used to identify client for every communication
    if (!data.headers.cookie)
        return accept('Session cookie required.', false);
    
    data.cookie = parseSignedCookie(cookie.parse(decodeURIComponent(data.headers.cookie)), SITE_SECRET);
    
    data.sessionID = data.cookie['express.sid'];
    
    session_store.get(data.sessionID, function(err, session){
        if (err) {
          return accept('Error in session store.', false);
        } else if (!session) {
          return accept('Session not found.', false);
        }
    data.session = session;
    return accept(null, true);
  });
});

io.sockets.on('connection', function(socket){
  var hs = socket.handshake;
  console.log('A socket with sessionID '+hs.sessionID+' connected.');
  io.sockets.emit('add user', {user: hs.session.username});
  app.locals.users[hs.session.username] = true;
  
  //TODO use socket channels for /chat and /game
  //TODO kick obvious spammers and stop relaying their messages
  socket.on('lobby chat line', function(data){
    io.sockets.emit('lobby chat', {user: hs.session.username, msg: escapeHtml(data.line.substring(0,256))});
  });


  //TYPEZ GAME///////////////

  gameModel.remove({}, function (err) {}); // remove old game information

  socket.on('typed line', function(data){

    var line = data.line;
    var line_length = data.line.length;

    //search text for all occurrences
    var occ = getIndicesOf(line, typez_text, true);

    //eliminate occurrences that are not full words
    for (var i = 0; i < occ.length; ){
      var left= occ[i];
      var right= occ[i]+line_length;
      if((left!=0 && typez_text.charAt(left-1)!=' ') || (right!=typez_text.length && typez_text.charAt(right)!=' ')) {
        occ.splice(i, 1);
      } else i++;
    }
    //eliminate occurrences that cross with already validated
    for (var i = 0; i < occ.length; ){
      var left= occ[i];
      var right= occ[i]+line_length-1;
      var destroy_i = false;

      for (var j = 0 ; j < validated_lines.length ; j++) {
        var v_left = validated_lines[j][0];
        var v_right = validated_lines[j][1];

        if (left <= v_right && right >= v_left ) {
          destroy_i = true;
          break;
        }
      }
      if (destroy_i) 
        occ.splice(i, 1);
      else i++;
    }
    //get first of the remaining occurrences and add it to validated lines
    if (occ.length >=1) { 
      var validated_line = [occ[0], occ[0]+line_length, hs.session.username];
      validated_lines.push(validated_line);
      io.sockets.emit('validated line', {"validated_line":validated_line});

      //detect end of game (everything validated)
      var total_range = [];
      for (var i = 0; i < typez_text.length; i++) { 
        total_range.push(1);
      }
      for (var i = 0; i < validated_lines.length; i++) {
        var left = validated_lines[i][0];
        var right = validated_lines[i][1];
        for (var j = 0; j < right-left+1; j++) {
          total_range[left+j] = 0;
        } 
      }
      var total = 0;
      for (var i = 0; i < total_range.length ; i++) {
        total += total_range [i];
      }

      if (total == 0) { //typez_text entirely highlighted, get new text!
        clearTimeout(typez_timer_global);

        //send scores for the level, increment level and start new timer
        var user_to_score = {};
        for (var i = 0; i < validated_lines.length; i++) {
          user_to_score[validated_lines[i][2]]=0;   
        }
        for (var i = 0; i < validated_lines.length; i++) {
          var word = typez_text.substring(validated_lines[i][0], validated_lines[i][1]);
          user_to_score[validated_lines[i][2]] += scrabbleScore(word);
        }
        //sort by score (best score first)
        var sortable = [];
        for (var u in user_to_score)
          sortable.push([u, user_to_score[u]]);
        sortable.sort(function(a,b){return b[1] - a[1]});

        
        var current_level = typez_level;
        //TODO increment level if success, go back to level 1 if failure
        typez_level++;
        typez_timer_stamp = (new Date()).getTime();

        // this also means current level is over
        io.sockets.emit('level scores', {next_level: typez_level, current_level: current_level, scores: sortable});

        // save current level scores in current_game database
        var level_scores = [];
        for (var i = 0; i < sortable.length; i++) {
          level_scores.push({user: sortable[i][0], score: sortable[i][1]});

        }
        gameModel.findOne({}, function (err, obj){
          if (!err && obj) {
            var save_game = new gameModel(obj);
            gameModel.remove({}, function (err) {
              save_game.levels.push({userScores: level_scores});
              save_game.save();
            });

          } else {
            var new_game = new gameModel();

            new_game.levels.push({userScores: level_scores});
            new_game.save();
          }
        });
        

        //TODO put this mess in its own function
        validated_lines = [];
        typez_text = "";
        var counter = 0; // in order to wait for async ops to complete
        // increment counter for each async, decr for each callback
        for (var i = 0; i < MAX_WORDS_PER_TEXT * typez_level; i++) {
          var rand = Math.random();
          counter++;
          dictModel.findOne({random: {$gte: rand}}, function(err, obj){
            if (!err) {
              if (obj) {
                typez_text += obj.word + ' ';
                counter--;
              }
              else {
                dictModel.findOne({random: {$lte: rand}}, function(err, obj){ 
                  if (!err) {
                    if (obj) {
                      typez_text += obj.word + ' ';
                      counter--;
                    }

                }});
                  
                }
              };
            });
            }

            //wait for counter to be 0 = all text obtained
            function doInterval(){
              //console.log(counter + ' jobs remaining...');
              if (counter == 0) {
                //console.log ('this is after all jobs have completed');
                
                io.sockets.emit('full text', {full_text:typez_text, "validated_lines":validated_lines, level: typez_level, seconds: Math.floor(TIME_PER_TEXT - ((new Date()).getTime()-typez_timer_stamp)/1000)});

                //TODO start timer for failure of current level
                typez_timer();


              } else {             
                process.nextTick(doInterval);
              }    
            }
            doInterval();
              
               
            

            }
          }
    });

  socket.on('get full text', function(data){
    socket.emit('full text', {full_text:typez_text, "validated_lines":validated_lines, level:typez_level, seconds: Math.floor(TIME_PER_TEXT - ((new Date()).getTime()-typez_timer_stamp)/1000)});
  });
  ///////////////////////////
  
  socket.on('disconnect', function(){
    console.log('A socket with sessionID '+hs.sessionID+' disconnected.');
    socket.broadcast.emit('remove user', {user: hs.session.username});
    delete app.locals.users[hs.session.username];
  });
});