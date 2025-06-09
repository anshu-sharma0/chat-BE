require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const User = require('./models/User');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB connected');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
const onlineUsers = new Map();

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ status: 404, message: 'API endpoint not found' });
});

// ✅ SOCKET.IO HANDLERS
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Join chat room (conversation)
  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`➡️  ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("get_users", async () => {
    try {
      const users = await User.find();
      socket.emit("users_list", users);
      console.log("get_users")
    } catch (error) {
      socket.emit("error", { message: "Failed to fetch users." });
    }
  });

  socket.on("get_user", async (userId) => {
    try {
      const user = await User.findById(userId);
      socket.emit("user_info", user);
    } catch (error) {
      socket.emit("error", { message: "User not found" });
    }
  });


  socket.on("disconnect", async () => {
    for (let [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        break;
      }
    }

    console.log('❌ User disconnected:', socket.id);
  });

  // Typing event
  socket.on("typing", ({ conversationId, user }) => {
    console.log("typing")
    socket.to(conversationId).emit("typing", user);
  });

  // Stop typing event
  socket.on("stop_typing", ({ conversationId, user }) => {
    console.log("stop_typing")
    socket.to(conversationId).emit("stop_typing", user);
  });

  // Handle sending message to others in the room
  socket.on('send_message', ({ conversationId, message }) => {
    socket.to(conversationId).emit('receive_message', message);
    console.log(`📨 Message sent to room ${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// ✅ Start Server with HTTP+Socket.IO
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
