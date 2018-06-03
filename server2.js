var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var fs = require('fs');
var mongoose = require('mongoose');

var bodyParser= require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('node_modules'));
app.use(express.static('css'));
app.use(express.static('js'));

// var Author = require('./author');
// var Book = require('./book');
var Admin = require('./MongoSchema/admin.js');
var Room = require('./MongoSchema/room.js');
var Question = require('./MongoSchema/question.js');

var port = process.env.PORT || 3000;

mongoose.connect('mongodb://localhost/audience-poll', function (err) {
    if (err) throw err;

    console.log('Successfully connected');

});


// Loading socket.io
var io = require('socket.io')(http);


app.get('/', function(req, res){
  res.sendFile(__dirname + '/index2.html');
});

app.get('/admin', function(req, res){
  res.sendFile(__dirname + '/admin.html');
});

app.post('/admin/addNewRoom', (req,res) => {

  var adminRoomName = req.body.adminRoomName;
  var clientRoomName = req.body.clientRoomName;
  var adminId = req.body.adminID;

  var newRoom = new Room({
    _id: new mongoose.Types.ObjectId(),
    clientRoomName: clientRoomName,
    adminRoomName: adminRoomName,
    admin: adminId
  });

  newRoom.save(function(err,data){
      /* if admin undefined handle the event */
        Room.find({admin: adminId}).select('adminRoomName _id').exec(function(err,rooms){
          console.log(rooms);
          socket.emit("getRooms",rooms);

        });
  });

});

app.post('/admin/publishQuestion', (req, res) => {
  console.log(req.body);

  Room.findById(req.body.room,function(err , clientRoomName){
    if(err) throw err;

    var newQuestion = new Question({
      _id: new mongoose.Types.ObjectId(),
      type: 1,
      questionString: req.body.questionString,
      options:[
        {
          optionIndex:1,
          optionValue: req.body.option1
        },
        {
          optionIndex:2,
          optionValue: req.body.option2
        },
        {
          optionIndex:3,
          optionValue: req.body.option3
        },
        {
          optionIndex:4,
          optionValue: req.body.option4
        }
      ],
      answerIndex: req.body.answer,
      answerString: req.body['option'+req.body.answer]
    });
    newQuestion.save(function(err,data) {
        if (err) throw err;

        console.log('New Question successfully saved.' + data);
        console.log("client room to publish - "+clientRoomName.clientRoomName);
        io.sockets.in(clientRoomName.clientRoomName).emit("questionAvailable",data);
    });

  });
})


io.sockets.on('connection', function (socket, username) {
    // When the client connects, they are sent a message
    //--socket.emit('message', 'You are connected!');
    // The other clients are told that someone new has arrived
    //--socket.broadcast.emit('message', 'Another client has just connected!');

    // As soon as the username is received, it's stored as a session variable

    socket.on("joinAsAdmin",function(userID){
      console.log("dekhta hu");
      Admin
      .findOne({userId:userID})
      .exec(function(err, admin){
        if(!admin) return;
        console.log("admin: "+ admin._id);
        socket.emit("adminId",admin._id);
        console.log(admin);
        if( admin ){
        /* if admin undefined handle the event */
            Room.find({admin: admin._id}).select('adminRoomName _id').exec(function(err,rooms){
              console.log(rooms);
              socket.emit("getRooms",rooms);

            });
          }
      });

    });

    socket.on('setUsername', function(username) {
        socket.username = username;
    });

    socket.on('publishQuestion' , function(data){
        console.log(data);
        console.log("sdfnsdn"+data.room);
    });

    socket.on('joinRoom' , function(roomDetails){
        console.log(roomDetails);
        console.log("roomID = "+roomDetails.roomID);
        socket.leave(socket.room);

        socket.join(roomDetails.roomName);
        socket.room = roomDetails.roomName;
        socket.roomID = roomDetails.roomID;
        Question.find({room: roomDetails.roomID}).exec(function(err, questions){
            console.log("questions in admin room: "+questions);
            socket.emit("questionsAlreadyInRoom",questions);
        });
        socket.emit('message','You are connected to '+roomDetails.roomName);

    });

    socket.on('clientJoinRoom' , function(roomName){
        console.log(roomName);

        Room.findOne({clientRoomName:roomName}).select('_id').exec(function(err,roomDetails){
          if(roomDetails){
            console.log("roomID = "+roomDetails._id + " roomname = " + roomName);
            socket.leave(socket.room);
            socket.join(roomName);
            socket.room = roomName;
            socket.roomID = roomDetails._id;
            socket.emit('message','You are connected to '+ roomName);
          }
          else{
            socket.emit('refresh', "The room is not Avalaible" );
          }

        });
    });
    var rooms = ['room1','room2'];

    socket.on('answer',function(answerObj){
      console.log(answerObj);
      Question.findById(answerObj.questionID,function(err,question){
          if( answerObj.answer === question.answerString ){
              Room.findById(socket.roomID,function(err,room){
                  var userDetails = {
                    username: socket.username,
                    time: new Date()
                  };
                  console.log(userDetails);
                  console.log(socket.username);
                  io.sockets.in(room.adminRoomName).emit('answerByUser',userDetails);
              });
          }
      });

    });

    // When a "message" is received (click on the button), it's logged in the console
    // socket.on('message', function (message) {
    //     // The username of the person who clicked is retrieved from the session variables
    //     console.log(socket.username + ' is speaking to me! They\'re saying: ' + message);
    // });
});


http.listen(port, function(){
  console.log('listening on *:' + port);
});
