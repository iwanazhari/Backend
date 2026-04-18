/**
 * WebSocket Setup (Socket.IO)
 * Real-time communication with authentication support
 * 
 * Features:
 * - JWT authentication
 * - Rooms/channels
 * - Event broadcasting
 * - Connection monitoring
 * 
 * Usage:
 *   Client: socket.emit('event', data)
 *   Server: io.emit('event', data)
 */

const jwt = require('jsonwebtoken');
const config = require('./config');
const logger = require('./utils/logger').createChildLogger('websocket');
const { extractToken } = require('./middlewares/authenticate');

// Store connected users
const connectedUsers = new Map();

/**
 * Setup WebSocket with Socket.IO
 * @param {Server} server - HTTP server
 * @param {Express.Application} app - Express app
 */
function setupWebSocket(server, app) {
  const io = require('socket.io')(server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = extractToken(socket.handshake.auth.token || socket.handshake.headers.authorization);
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (error) {
      logger.warn('Socket authentication failed:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`User connected: ${user.email} (${socket.id})`);
    
    // Store connected user
    connectedUsers.set(socket.id, {
      userId: user.id,
      email: user.email,
      connectedAt: new Date(),
    });
    
    // Join user-specific room
    socket.join(`user:${user.id}`);
    
    // Join role-based room
    socket.join(`role:${user.role}`);
    
    // Emit connection success
    socket.emit('connected', {
      message: 'Connected successfully',
      userId: user.id,
      roles: [`user:${user.id}`, `role:${user.role}`],
    });
    
    // Broadcast user online
    io.emit('user:online', {
      userId: user.id,
      email: user.email,
      onlineCount: connectedUsers.size,
    });
    
    // Handle messages
    socket.on('message', (data) => {
      logger.debug(`Message from ${user.email}:`, data);
      
      // Broadcast to all except sender
      socket.broadcast.emit('message', {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });
    
    // Handle join room
    socket.on('room:join', (roomName) => {
      socket.join(roomName);
      logger.info(`${user.email} joined room: ${roomName}`);
      
      socket.emit('room:joined', { room: roomName });
      
      // Notify others in room
      socket.to(roomName).emit('room:user_joined', {
        room: roomName,
        user: user.email,
      });
    });
    
    // Handle leave room
    socket.on('room:leave', (roomName) => {
      socket.leave(roomName);
      logger.info(`${user.email} left room: ${roomName}`);
      
      socket.emit('room:left', { room: roomName });
    });
    
    // Handle emit to room
    socket.on('room:emit', ({ room, event, data }) => {
      io.to(room).emit(event, {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });
    
    // Handle broadcast to role
    socket.on('broadcast:role', ({ role, event, data }) => {
      io.to(`role:${role}`).emit(event, {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      logger.info(`User disconnected: ${user.email} (${socket.id})`);
      
      // Broadcast user offline
      io.emit('user:offline', {
        userId: user.id,
        email: user.email,
        onlineCount: connectedUsers.size,
      });
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${user.email}:`, error.message);
    });
  });
  
  // Connection monitoring
  setInterval(() => {
    logger.debug(`Active connections: ${connectedUsers.size}`);
  }, 60000); // Log every minute
  
  // Make io accessible globally
  app.set('io', io);
  
  logger.info('WebSocket server initialized');
  
  return io;
}

/**
 * Emit event to specific user
 * @param {SocketIO.Server} io - Socket.IO server
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit event to specific role
 * @param {SocketIO.Server} io - Socket.IO server
 * @param {string} role - Role name
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function emitToRole(io, role, event, data) {
  io.to(`role:${role}`).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit event to room
 * @param {SocketIO.Server} io - Socket.IO server
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
function emitToRoom(io, room, event, data) {
  io.to(room).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast event to all except sender
 * @param {SocketIO.Server} io - Socket.IO server
 * @param {string} event - Event name
 * @param {any} data - Event data
 * @param {string} excludeSocketId - Socket ID to exclude
 */
function broadcast(io, event, data, excludeSocketId = null) {
  if (excludeSocketId) {
    io.to(excludeSocketId).broadcast.emit(event, {
      data,
      timestamp: new Date().toISOString(),
    });
  } else {
    io.emit(event, {
      data,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get online users count
 * @returns {number}
 */
function getOnlineCount() {
  return connectedUsers.size;
}

/**
 * Get connected users
 * @returns {Map}
 */
function getConnectedUsers() {
  return connectedUsers;
}

module.exports = {
  setupWebSocket,
  emitToUser,
  emitToRole,
  emitToRoom,
  broadcast,
  getOnlineCount,
  getConnectedUsers,
};
