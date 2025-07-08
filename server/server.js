// server/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// === GLOBAL STATE ===
const messages = []; // In-memory message store
const users = {}; // socket.id => { username, id }
const typingUsers = {};

// === NAMESPACE EXAMPLE ===
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
  console.log(`🔌 [Namespace] User connected: ${socket.id}`);

  socket.on('join', (username) => {
    users[socket.id] = { username, id: socket.id };
    chatNamespace.emit('user_joined', `${username} joined the chat.`);
  });

  socket.on('send_message', (data, callback) => {
    const messageWithMeta = {
      ...data,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      delivered: true,
    };
    messages.push(messageWithMeta);

    if (messages.length > 100) messages.shift(); // memory optimization

    chatNamespace.emit('receive_message', messageWithMeta);
    if (callback) callback({ status: 'delivered', id: messageWithMeta.id });
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

  socket.on('typing', (isTyping) => {
    const username = users[socket.id]?.username;
    if (username) {
      if (isTyping) typingUsers[socket.id] = username;
      else delete typingUsers[socket.id];
      chatNamespace.emit('typing_users', Object.values(typingUsers));
    }
  });

  socket.on('private_message', ({ to, message }) => {
    const sender = users[socket.id]?.username || 'Anonymous';
    const messageData = {
      id: Date.now(),
      sender,
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      chatNamespace.emit('user_left', `${user.username} left the chat.`);
      delete users[socket.id];
    }
    delete typingUsers[socket.id];
    chatNamespace.emit('typing_users', Object.values(typingUsers));
  });
});

// === Optional REST APIs for testing ===
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.get('/', (req, res) => {
  res.send('✅ Socket.io Chat Server is running.');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
