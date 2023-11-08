const express = require("express");
const cors = require("cors");
const connection = require("./config/db");
const app = express();
app.use(express.json());
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const fs = require("fs");

const { UserScore } = require("./model/userScores");
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
      // console.log(pairCount + " " + id);
      socket.join(id);
      pgmstart = 1;
    } else if (pairCount === 2) {
      // console.log(pairCount + " " + id);
      socket.join(id);
      pgmstart = 2;

      players = {};
      count = 1;

      for (const key in usernames) {
        const newKey = "player" + count;
        players[newKey] = usernames[key];
        count++;
      }

      app.post("/save", async (req, res) => {
        try {
          const p1Score = req.body.p1;
          const p2Score = req.body.p2;
          const winStats = req.body.win;
          const stats = await UserScore({
            room: id,
            players,
            player1Score: p1Score,
            player2Score: p2Score,
            winner: winStats,
          });
          await stats.save();
          res.send({ message: "stats save succsessfully" });
        } catch (error) {
          console.log(error);
          res.send({ err: "Internal Error" });
        }
      });
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

app.get("/viewstats", async (req, res) => {
  try {
    let statsData = await UserScore.find({});
    res.send({ result: statsData });
  } catch (error) {
    console.log("Error while fetching game stats", error);
    res.send({ err: "Internal Error" });
  }
});

server.listen(PORT, async () => {
  try {
    await connection;
    console.log("Connected to db!");
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.log("Error while connectiong to db!");
  }
});
