$(document).ready(function () {

    var socket = io.connect('http://192.168.0.104:3000');

    // The visitor is asked for their username...
    var username = prompt('What\'s your username?');
    var roomName = prompt("whats the room you are joining") ;
    // It's sent with the signal "little_newbie" (to differentiate it from "message")
    socket.emit('setUsername', username);
    if (typeof(Storage) !== "undefined") {
        // Code for localStorage/sessionStorage.
        localStorage.setItem("username", username);
    } else {
        // Sorry! No Web Storage support..
    }
    socket.on('refresh',function(message){

      location.reload();

    });
    socket.emit('clientJoinRoom',roomName);
    // A dialog box is displayed when the server sends us a "message"
    socket.on('questionAvailable', function(message) {

        $(".bg_load").fadeOut("slow");
        $(".wrapper").fadeOut("slow");

        console.log(message);
        $('#questionString').text(message.questionString);
        $('#option1').text(message.options[0].optionValue);

        $('#option2').text(message.options[1].optionValue);

        $('#option3').text(message.options[2].optionValue);

        $('#option4').text(message.options[3].optionValue);

        $('#questionId').val(message._id);

    });

    $('[id^=option]').click(function(e){
      e.preventDefault();
      var selected = $(this).text();
      var answerObj={
        questionID: $('#questionId').val(),
        answer: selected
      };
      socket.emit("answer",answerObj);

    });

    // When the button is clicked, a "message" is sent to the server
    // $('#poke').click(function () {
    //     socket.emit('message', 'Hi server, how are you?');
    // })

});
