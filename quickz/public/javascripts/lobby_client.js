
//TODO factor code and make a config.js file
var socket = io.connect("");

socket.on('add user', function(data){
  //TODO stylish fade in with jquery
  if ($('#'+data['user']).length==0)
    $('#user_list').append('<li id="'+ data['user'] +'">'+ data['user'] +'</li>');
  
});
  
socket.on('remove user', function(data){
  //TODO stylish fade out with jquery
  $('#'+data['user']).remove();
});

socket.on('lobby chat', function(data){
  $('#lobby_chat').append(data.user + ': ' + data.msg + '\n');
  $('#lobby_chat').scrollTop(99999); //TODO only way is this hack?
});

$('#chatline').submit(function(e){
  e.preventDefault();
  if ($('#chat_input').val() != '') {
    socket.emit('lobby chat line', {line: $('#chat_input').val()}); 
    $('#chat_input').val('');
  }
});