var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var fs = require("fs");

const PORT = process.env.PORT || 3000;

app.use("/", express.static(__dirname + "/public"));

var usernames = {};
var pairCount = 0,
  id,
  pgmstart = 0,
  varCounter;
var scores = {};

//Route
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

io.sockets.on("connection", function (socket) {

  socket.on("addClient", function (username) {
    socket.username = username;
    usernames[username] = username;
    scores[socket.username] = 0;
    varCounter = 0;
    pairCount++;
    if (pairCount === 1 || pairCount >= 3) {
      id = Math.round(Math.random() * 1000000);
      socket.room = id;
      pairCount = 1;
      console.log(pairCount + " " + id);
      socket.join(id);
      pgmstart = 1;
    } else if (pairCount === 2) {
      console.log(pairCount + " " + id);
      socket.join(id);
      pgmstart = 2;
    }

    socket.emit(
      "updatechat",
      "SERVER",
      "You are connected! <br> Waiting for other player to connect...",
      id
    );

    socket.broadcast
      .to(id)
      .emit(
        "updatechat",
        "SERVER",
        username + " has joined to this game !",
        id
      );

    if (pgmstart == 2) {
      fs.readFile(
        __dirname + "/lib/questions.json",
        "Utf-8",
        function (err, data) {
          jsoncontent = JSON.parse(data);
          io.sockets.in(id).emit("sendQuestions", jsoncontent);
        }
      );
      console.log("Player2");
    } else {
      console.log("Player1");
    }
  });

  socket.on("result", function (usr, rst) {
    io.sockets.in(rst).emit("viewresult", usr);
  });

  socket.on("disconnect", function () {
    delete usernames[socket.username];
    io.sockets.emit("updateusers", usernames);
    socket.leave(socket.room);
  });
});

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Connection Established !");
});
