// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Namespaces and rooms example for scalability
const chatNamespace = io.of('/chat');

let messages = []; // In-memory messages
const USERS = {};

chatNamespace.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (username) => {
    USERS[socket.id] = username;
    chatNamespace.emit('user_joined', `${username} joined the chat.`);
  });

  socket.on('send_message', (data, callback) => {
    const messageWithMeta = {
      ...data,
      id: Date.now(),
      delivered: true,
    };
    messages.push(messageWithMeta);
    chatNamespace.emit('receive_message', messageWithMeta);
    callback({ status: 'delivered', id: messageWithMeta.id });
  });

  socket.on('load_older', (count) => {
    const paginated = messages.slice(-count);
    socket.emit('older_messages', paginated);
  });

  socket.on('search_messages', (term) => {
    const result = messages.filter((msg) =>
      msg.message.toLowerCase().includes(term.toLowerCase())
    );
    socket.emit('search_results', result);
  });

  socket.on('disconnect', () => {
    const username = USERS[socket.id];
    delete USERS[socket.id];
    chatNamespace.emit('user_left', `${username} left the chat.`);
  });
});

server.listen(3001, () => {
  console.log('✅ Server running on http://localhost:3001');
});
