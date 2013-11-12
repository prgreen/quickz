
//TODO factor code and make a config.js file
var socket = io.connect("");
socket.emit('get full text'); //obtain game info
var TEXT_TO_TYPE = "";
var validated_lines = []; //contains arrays of type [number,number,string]
var user_to_color = {};
var user_to_score = {};

var time_remaining = 0;

setInterval(function(){
  if (time_remaining > 0)
    time_remaining--;

  if (time_remaining > 10)
    $('#timer').html('<span style="color: blue"><strong>' + time_remaining + '</strong></span>' + '</span><span style="visibility:hidden; font-size: 300%">0</span>');
  else {
    $('#timer').html('<span style="font-size: '+ (100 + (10 - time_remaining) * 20)+'%; color: red; font-weight: bold;">' + time_remaining + '</span><span style="visibility:hidden; font-size: 300%">0</span>');
  }
}, 1000);


function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function hue2rgb(p, q, t){
    if(t < 0) t += 1;
    if(t > 1) t -= 1;
    if(t < 1/6) return p + (q - p) * 6 * t;
    if(t < 1/2) return q;
    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r * 255, g * 255, b * 255];
}

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

/////////////////////
//TYPEZ GAME SPECIFIC
/////////////////////
function updateAll() {

  // get all users in an array
  var arr_user = [], lis = document.getElementsByTagName("li");
  for(var i=0, im=lis.length; im>i; i++)
    arr_user.push(lis[i].firstChild.nodeValue);

  // map every non mapped user with a color of his own
  for (var i = 0; i < arr_user.length; i++) {
    var j = arr_user[i];
    //alert(j);
    if (!(j in user_to_color)) {
      var h = Math.random();
      var s = 1.0;
      var l = 0.5;
      var rgb = hslToRgb(h,s,l);
      //alert (rgb[0]+ ' '+rgb[1]+ ' '+ rgb[2])
      user_to_color[j] = rgbToHex(Math.floor(rgb[0]), Math.floor(rgb[1]), Math.floor(rgb[2]));
      //alert(j + " "+ user_to_color[j]);
    }
  }


  // calculate everyone's current score
  user_to_score = {};
  for (var i = 0; i < arr_user.length; i++) {
    if (user_to_score[arr_user[i]] == undefined)
      user_to_score[arr_user[i]] = 0;
  }
  for (var i = 0; i < validated_lines.length; i++) {
    user_to_score[validated_lines[i][2]]=0;   
  }
  for (var i = 0; i < validated_lines.length; i++) {
    var word = TEXT_TO_TYPE.substring(validated_lines[i][0], validated_lines[i][1]);
    user_to_score[validated_lines[i][2]] += scrabbleScore(word);
  }



  var sortable = [];
  for (var u in user_to_score)
    sortable.push([u, user_to_score[u]]);
  sortable.sort(function(a,b){return b[1] - a[1]});
  //sortable.pop();

  $('#user_list').empty();
  // display every player's color
  for (var i = 0 ; i < sortable.length ; i++) {
    var u = sortable[i][0];
    //alert (u + ' ' + sortable[i][1]);
    if (u!= 'null') {
      var div_left_html = "<div class=\"user_container\" style=\"background-color:"+ user_to_color[u] +"\">";
      var div_right_html = "</div>";
      $('#user_list').append('<li id="'+ u +'">'+ u +'</li>');
      $('li#'+u).html(div_left_html + u + div_right_html);
    }
  }

  //display score next to each li
  $('.score').remove();
  $('li').each(function(index){
    var score = user_to_score[$(this).text()];
    //if (score == undefined)
    //  score = 0;
    $(this).find('div').append('<div class="score">'+ score +'</div>');
  });

  var split_text = TEXT_TO_TYPE.split("");
 
  var build_text=[];
  //var span_left_html = "<span style=\"background-color: cyan\">";
  var span_left_html = "<span style=\"background-color:";
  var span_left_fade_html = "<span class=\"fade_highlight\">";
  var span_right_html = "</span>";
  for (var i=0; i < split_text.length; i++) {
    
    var span_left = false;
    var span_right = false;
    var last_validated = false;

    for (var j=0; j < validated_lines.length; j++) {
      var left = validated_lines[j][0];
      var right = validated_lines[j][1];
      

      if (i == left) {
        var highlight_color = user_to_color[validated_lines[j][2]];
        if (highlight_color == undefined)
          highlight_color = "#FF00FF";
        span_left = true;

        // Last words validated
        if (j == validated_lines.length-1) {
          last_validated = true;
          var last_highlight_color = highlight_color;
        }
      }
      if (i == right) span_right = true;


    }
    if (span_left) {
      // Fade in highlight for last words validated
      if (last_validated) build_text = build_text.concat(span_left_fade_html.split(""));
      // Simple highlight for other validated words 
      else build_text = build_text.concat((span_left_html+highlight_color+"\">").split(""));
    }
    build_text.push(split_text[i]);
    if (span_right) build_text = build_text.concat(span_right_html.split(""));

  }
  $('#text_to_type').html(build_text.join(""));
  $('.fade_highlight').animate({backgroundColor: last_highlight_color}, 2000);

}

socket.on('add user', function(data){

  // Added user slides from left
  if ($('#'+data['user']).length==0) {
    //$('<li id="'+ data['user'] +'">'+ div_left_html + data['user'] + div_right_html +'</li>').appendTo('#user_list').show('slide', { direction: 'left' }, 500);
    $('#user_list').append('<li id="'+ data['user'] +'">'+ data['user'] +'</li>');
    //alert('contenu liste');
  }

  updateAll();
});
  
socket.on('remove user', function(data){
  // Removed user slides to right
  //$('#'+data['user']).hide('slide', { direction: 'right' }, 500, function() { $(this).remove(); });
  $('#'+data['user']).remove();
  delete user_to_score[data.user];
  updateAll();
});

socket.on('full text', function(data){ 

  $('#level').html('<strong>Level ' + data.level + '</strong><br/>');

  if (data.seconds > 0) {
    time_remaining = data.seconds;
  } else 
    time_remaining = 0;
  
  TEXT_TO_TYPE = data.full_text;
  validated_lines = data.validated_lines;
  

  for (var i = 0; i < validated_lines.length; i++) {
    var j = validated_lines[i][2];
    if (!(j in user_to_color)) {
      var h = Math.random();
      var s = 1.0;
      var l = 0.5;
      var rgb = hslToRgb(h,s,l);
      //alert (rgb[0]+ ' '+rgb[1]+ ' '+ rgb[2])
      user_to_color[j] = rgbToHex(Math.floor(rgb[0]), Math.floor(rgb[1]), Math.floor(rgb[2]));
      //alert(j + " "+ user_to_color[j]);
    }
  }
  

  updateAll();

  if (validated_lines.length == 0) {
    $('.score').each(function() {$(this).text("0");});
    for (var u in user_to_score) {
      user_to_score[u]=0;
    }
  }


});

socket.on('validated line', function(data){  
  validated_lines.push(data.validated_line);
  //alert ("valid "+data.validated_line[0].toString()+':'+data.validated_line[1].toString());
  
  var validated_text = TEXT_TO_TYPE.substring(data.validated_line[0], data.validated_line[1]);
  $.gritter.add({
    // (string | mandatory) the heading of the notification
    title: data.validated_line[2],
    // (string | mandatory) the text inside the notification
    text:  validated_text + ' +' + scrabbleScore(validated_text),
    // Notification background color 
    bgcolor: user_to_color[data.validated_line[2]]
  });

  updateAll();
});
socket.on('level scores', function(data){  

  var title = 'COMPLETED!';
  var is_sticky = false;
  var msg = "";

  // level was failed
  if (data.next_level == 1) { 
    title = 'GAME OVER: ADVENTURE SCORES';
    is_sticky = true;
    // http://boedesign.com/blog/2009/07/11/growl-for-jquery-gritter/

    // remove all notifications before adding end game sticky notification
    $.gritter.removeAll({after_close: function(){
      for (var i = 0; i < data.scores.length; i++) {
        msg += data.scores[i][0] + ' ' + data.scores[i][1] + '<br/>';
      }
      if (msg == "")
        msg = "No message.";

      $.gritter.add({
        title: 'LEVEL ' + data.current_level + ' ' + title,
        text: msg,
        class_name: 'gritter-right',  // One level notification at a time
        sticky: is_sticky
      });
    }});
  }

  // next level
  else {
    for (var i = 0; i < data.scores.length; i++) {
      msg += data.scores[i][0] + ' ' + data.scores[i][1] + '<br/>';
    }
    if (msg == "")
      msg = "No message.";

    $.gritter.add({
      title: 'LEVEL ' + data.current_level + ' ' + title,
      text: msg,
      class_name: 'gritter-right',  // One level notification at a time
      sticky: is_sticky
    });
  }

  // Wipe scores waiting for next level text
  //user_to_score = {};
  validated_lines = [];
  updateAll();
  //$('.score').each(function() {$(this).text("0");});
  


});

$('#typez_line').submit(function(e){
  e.preventDefault();
  if ($('#typez_input').val() != '') {
    socket.emit('typed line', {line: $('#typez_input').val()}); 
    $('#typez_input').val('');
  }
  // next line is needed because IE is retarded
  $(function() {$('[autofocus]').focus()});
});