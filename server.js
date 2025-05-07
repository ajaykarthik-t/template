// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Create Express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Create Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Allow your frontend URL
    methods: ['GET', 'POST']
  }
});

// In-memory storage (replace with database in production)
const messages = [];
const activeUsers = {};

// Clean up old messages (older than 24 hours)
function cleanupOldMessages() {
  const now = Date.now();
  const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours ago
  
  // Filter out messages older than 24 hours
  const validMessagesCount = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].timestamp < cutoff) {
      messages.splice(i, 1);
    }
  }
  
  if (validMessagesCount !== messages.length) {
    console.log(`Cleaned up ${validMessagesCount - messages.length} expired messages`);
  }
}

// Run cleanup every hour
setInterval(cleanupOldMessages, 60 * 60 * 1000);

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Register user
  socket.on('register', (userData) => {
    const { userId, name, email, phone } = userData;
    
    if (!userId) return;
    
    // Store user in active users
    activeUsers[userId] = {
      socketId: socket.id,
      name,
      email,
      phone,
      lastActive: Date.now()
    };
    
    // Associate socket with user ID for later use
    socket.userId = userId;
    
    // Send initial data to the client
    socket.emit('initialize', {
      messages: messages,
      activeUsers: Object.values(activeUsers)
    });
    
    // Broadcast updated active users to all clients
    io.emit('activeUsers', Object.values(activeUsers));
    
    console.log(`User registered: ${name} (${userId})`);
  });
  
  // Handle sending messages
  socket.on('sendMessage', (message) => {
    // Add message to storage
    messages.push(message);
    
    // Broadcast message to all clients
    io.emit('newMessage', message);
    
    // If it's an emergency, send a special broadcast
    if (message.type === 'emergency') {
      io.emit('emergency', message);
      
      // Optional: Notify admins or emergency contacts
      notifyEmergencyContacts(message);
    }
    
    console.log(`Message from ${message.name}: ${message.text.substring(0, 30)}${message.text.length > 30 ? '...' : ''}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId && activeUsers[socket.userId]) {
      console.log(`User disconnected: ${activeUsers[socket.userId].name} (${socket.userId})`);
      
      // Remove user from active users
      delete activeUsers[socket.userId];
      
      // Broadcast updated active users list
      io.emit('activeUsers', Object.values(activeUsers));
    } else {
      console.log('Unknown user disconnected');
    }
  });
  
  // Update user presence every 30 seconds
  socket.on('updatePresence', () => {
    if (socket.userId && activeUsers[socket.userId]) {
      activeUsers[socket.userId].lastActive = Date.now();
    }
  });
});

// Optional: Function to notify emergency contacts
// You would implement this based on your notification system
function notifyEmergencyContacts(emergencyMessage) {
  // Example implementation:
  console.log('🚨 EMERGENCY ALERT 🚨');
  console.log(`From: ${emergencyMessage.name} (${emergencyMessage.email || 'No email'}, ${emergencyMessage.phone || 'No phone'})`);
  console.log(`Message: ${emergencyMessage.text}`);
  
  if (emergencyMessage.location) {
    console.log(`Location: https://maps.google.com/?q=${emergencyMessage.location.latitude},${emergencyMessage.location.longitude}`);
  } else {
    console.log('Location: Not available');
  }
  
  // In a real implementation, you might:
  // 1. Send SMS via Twilio
  // 2. Send emails to emergency contacts
  // 3. Notify admins through a dedicated channel
  // 4. Contact local authorities if integration is available
}

// Simple status endpoint
app.get('/', (req, res) => {
  res.send('Safety Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Periodically clean up inactive users (no activity for 2 minutes)
setInterval(() => {
  const now = Date.now();
  let removedCount = 0;
  
  Object.keys(activeUsers).forEach(userId => {
    if (now - activeUsers[userId].lastActive > 2 * 60 * 1000) {
      delete activeUsers[userId];
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    console.log(`Removed ${removedCount} inactive users`);
    io.emit('activeUsers', Object.values(activeUsers));
  }
}, 60 * 1000); // Check every minute