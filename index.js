const express = require("express");
const app = express();
const cors = require("cors");
const server = require("http").Server(app);
const { Server } = require("socket.io");
const port = 3000;
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://react-clone-telegram.vercel.app"],
    credentials: true
  },
});

app.use(cors());

const {
  updateContactReadInDB,
  updateHasNewMessagesInDB,
  addThisMsgInDB,
  updateHisConnectionStatusInDB,
  updateStatusOfThisMsgInDB,
  updateMyCallsInDB
} = require("./firebase-config.js");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

let usersList = [];

io.on("connection", (socket) => {
  // ---------------CONNECT-----------------------
  // registers the new user and gives it a 'socketId' then receives the connected status of this user and forwards it to all users (and save it in DB)

  // add to the 'userList' the user who has connected whith his 'userId' and his 'socketId'
  console.log("new user");
  const userId = socket.handshake.auth.username;

  usersList.push({ userId: userId, socketId: socket.id});         
  console.log("usersList", usersList);
  // update connection status of the disconnected user it's true in the DB
  updateHisConnectionStatusInDB(userId, true);
  // emit to all users that this user has connected
  io.emit("new user", { contactId: userId, usersList: usersList });

  // ---------------DISCONNECT--------------------
  // receives the disconnected status of this user and forwards it to all users (and save it in DB)

  socket.on("disconnect", () => {
    // Remove from the 'userList' the user who has disconnected
    console.log("user disconnected");
    usersList = usersList.filter((e) => e.socketId !== socket.id);
    console.log("nbUsersConnect: ", usersList.length);
    console.log("newUsersList", usersList);
    // update connection status of the disconnected user whith the time now in th DB
    updateHisConnectionStatusInDB(userId, Date.now());
    // emit to all users that this user has disconnected
    io.emit("user disonnected", { contactId: userId, usersList: usersList });
  });

  // ---------------TYPING-----------------------
  // receives typing status (true or false) from sender and forwards to all users

  socket.on("typing", (typingData) => {
    // console.log("typingData", typingData);
    socket.broadcast.emit("typingResponse", typingData);
  });

  // -------------PRIVATE MESSAGE-----------------

  // receives the message sent by the sender and sends it back to the receiver (and save it in DB)
  socket.on("private message", (arg) => {
    // 👇 this is the message that was sent
    const msg = {
      to: arg.to,
      from: arg.from,
      content: arg.content,
      time: arg.time,
      id: arg.id,
      status: arg.status,
      type: arg.type
    };

    console.log("msg: ", msg);

    // change the status of this message from 'waiting' to 'ok' (because the message has been successfully received by the server)
    msg.status = "ok";

    // search the sender of this message in the 'userList'
    const sender = usersList.find((user) => user.userId === msg.from);

    // if the sender is found so sends the message back to him with the new status (i.e. 'ok')
    if (sender) {
      //   console.log("sender: ", sender);
      // console.log("senderId: ", sender.socketId);
      io.to(sender.socketId).emit("update this message status", { msg });
    }

    // add this message on DB for the sender and the receiver
    // 👇 sender
    addThisMsgInDB(msg.from, msg.to, msg);
    // 👇 receiver
    addThisMsgInDB(msg.to, msg.from, msg);

    // search the receiver of this message in the 'userList'
    const receiver = usersList.find((user) => user.userId === msg.to);
    console.log("receiver: ", receiver);

    // if receiver exists then send him the private message if not add him new messages from this sender (in DB)
    if (receiver) {
      socket.to(receiver.socketId).emit("private message", { msg });
    } else {
      console.log("!!!!!!! There is not receiver !!!!!");
      updateHasNewMessagesInDB(arg.to, arg.from, 'add')
    }
  });

  // --------MESSAGE READ OR RECEIVED-----------
  // receives the message from the reciver with the new status: 'received' or 'read'
  socket.on("message read or received", ({ msg }) => {
    // console.log('message read or received', msg)

    // update this status message on DB for the sender and the receiver
    // 👇 sender
    updateStatusOfThisMsgInDB(msg.from, msg.to, msg);
    // 👇 receiver
    updateStatusOfThisMsgInDB(msg.to, msg.from, msg);

    // search the sender of this message in the 'userList'
    const sender = usersList.find((user) => user.userId === msg.from);
    // console.log("sender: ", sender);

    // if sender exists then send him the updated message
    if (sender) {
      socket.to(sender.socketId).emit("update this message status", { msg });
    } else {
      console.log("!!!!!!! There is not sender !!!!!");
    }
  });

  // -------------RECEIVER STATUS READ-------
  // send contact status is 'read' when user is on chat with this contact
  socket.on("receiver status is read", (data) => {
    // console.log("data", data);

    // search this contact  in the 'userList'
    const contact = usersList.find((user) => user.userId === data.to);
    // console.log("contact: ", contact);

    // 👇 TO DO!! update in DB 
    // creer une fonction pour enregistrer dans la db
    // updateContactReadInDB(data.to, data.from)
    // finalement peut etre pas

    // if contact exists then send him the status 'readContact'
    if (contact) {
      updateContactReadInDB(data.to, data.from)
      socket.to(contact.socketId).emit("update receiver status is read", data);
    } else {
      console.log("!!!!!! There is not contact 1 !!!!!");
    }
  });

  // -------------CALL CONTACT-------
  // send contact status is 'read' when user is on chat with this contact
  socket.on("call contact", (data) => {
    console.log("call data", data);

    // update in DB
    updateMyCallsInDB(data.from, data)
    updateMyCallsInDB(data.to, data)
    // ---------------------------
    // identify the socket id that sent the message
    const idOfthisSocket = socket.handshake.auth.username;
    // console.log("idOfthisSocket: ", idOfthisSocket);
    
    // if the socket that sent the message is the data.from then sends the message to the data.to and if it is the reverse then sends the reverse
    if (data.from === idOfthisSocket) {
      // search this contact  in the 'userList'
      const contact = usersList.find((user) => user.userId === data.to);
      // console.log("contact: ", contact);
      if (contact) {
        socket.to(contact.socketId).emit("call contact you", data);
      } else {
        console.log("!!!!! There is not contact 2 !!!!");
      }
    } else if (data.to === idOfthisSocket) {
      // search this contact  in the 'userList'
      const contact = usersList.find((user) => user.userId === data.from);
      // console.log("contact: ", contact);
      if (contact) {
        socket.to(contact.socketId).emit("call contact you", data);
      } else {
        console.log("!!!! There is not contact 3 !!!!!");
      }
    } else {
      console.error("!!!!!!! There is not idOfthisSocket !!!!!");
    }
  });

});

server.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
