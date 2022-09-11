const express = require("express");
const app = express();
const cors = require('cors')
const server = require("http").Server(app);
const { Server } = require("socket.io");
const port = 3000;
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", " https://cc1a-37-142-167-222.eu.ngrok.io/"]
  }
});

app.use(cors())

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//coucou
let users = [];

io.on("connection", (socket) => {
  users.push({userName:       
  socket.handshake.query.userName, userId: socket.id})
  //io.emit('new user', { userId: socket.id })
  io.emit('new user', users)
  socket.on("disconnect", () => {
    console.log("user disconnected");
    users = users.filter(function(e) { return e.userId !== socket.id })
    console.log('nbUsersConnect: ', users.length);
    io.emit('user disonnected', users)
  })
  socket.on('chat message', (msg) => {
    //console.log("message: " + msg);
    socket.broadcast.emit('chat message', msg);
  });
  // forward the private message to the right recipient
  socket.on("private message", ({content, to}) => {
    console.log("to: ", to)
    console.log("content: ", content);
    try {
          socket.to(to.userId).emit("private message", {
      content,
      from: socket.id,
    }) 
    } catch (error) {
      console.error(error)
    }

  });
  console.log('nbUsersConnect: ', users.length);
  console.log('users: ', users)
})

server.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
