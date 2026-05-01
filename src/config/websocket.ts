/**
 * WebSocket Setup (Socket.IO)
 * Real-time communication with authentication support
 *
 * Features:
 * - PASETO V4 authentication
 * - Rooms/channels
 * - Event broadcasting
 * - Connection monitoring
 *
 * Usage:
 *   Client: socket.emit('event', data)
 *   Server: io.emit('event', data)
 */

import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Application } from 'express';

import config from './index.js';
import { createChildLogger } from '../utils/logger.js';
import { extractToken } from '../middlewares/authenticate.js';
import TokenService from '../services/TokenService.js';

const wsLogger = createChildLogger('websocket');

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

interface ConnectedUser {
  userId: string;
  email: string;
  connectedAt: Date;
}

interface SocketWithUser extends Socket {
  user?: JwtPayload;
}

// Store connected users
const connectedUsers = new Map<string, ConnectedUser>();

/**
 * Setup WebSocket with Socket.IO
 * @param {http.Server} server - HTTP server
 * @param {Application} app - Express app
 */
export function setupWebSocket(server: http.Server, app: Application): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: SocketWithUser, next) => {
    const token = extractToken(
      socket.handshake.auth.token || socket.handshake.headers.authorization
    );

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      // Verify PASETO token using TokenService
      const user = await TokenService.extractUser(token);
      socket.user = user;
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      wsLogger.warn(`Socket authentication failed: ${message}`);
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: SocketWithUser) => {
    const user = socket.user;
    if (!user) {
      wsLogger.warn('Connection without user');
      return;
    }

    wsLogger.info(`User connected: ${user.email} (${socket.id})`);

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
    socket.on('message', (data: any) => {
      wsLogger.debug(`Message from ${user.email}:`, data);

      // Broadcast to all except sender
      socket.broadcast.emit('message', {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle join room
    socket.on('room:join', (roomName: string) => {
      socket.join(roomName);
      wsLogger.info(`${user.email} joined room: ${roomName}`);

      socket.emit('room:joined', { room: roomName });

      // Notify others in room
      socket.to(roomName).emit('room:user_joined', {
        room: roomName,
        user: user.email,
      });
    });

    // Handle leave room
    socket.on('room:leave', (roomName: string) => {
      socket.leave(roomName);
      wsLogger.info(`${user.email} left room: ${roomName}`);

      socket.emit('room:left', { room: roomName });
    });

    // Handle emit to room
    socket.on('room:emit', ({ room, event, data }: { room: string; event: string; data: any }) => {
      io.to(room).emit(event, {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle broadcast to role
    socket.on('broadcast:role', ({ role, event, data }: { role: string; event: string; data: any }) => {
      io.to(`role:${role}`).emit(event, {
        from: user.email,
        data,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);
      wsLogger.info(`User disconnected: ${user.email} (${socket.id})`);

      // Broadcast user offline
      io.emit('user:offline', {
        userId: user.id,
        email: user.email,
        onlineCount: connectedUsers.size,
      });
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      wsLogger.error(`Socket error for ${user.email}:`, error.message);
    });
  });

  // Connection monitoring
  setInterval(() => {
    wsLogger.debug(`Active connections: ${connectedUsers.size}`);
  }, 60000); // Log every minute

  // Make io accessible globally
  app.set('io', io);

  wsLogger.info('WebSocket server initialized');

  return io;
}

/**
 * Emit event to specific user
 * @param {SocketIOServer} io - Socket.IO server
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit event to specific role
 * @param {SocketIOServer} io - Socket.IO server
 * @param {string} role - Role name
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function emitToRole(io: SocketIOServer, role: string, event: string, data: any) {
  io.to(`role:${role}`).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit event to room
 * @param {SocketIOServer} io - Socket.IO server
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function emitToRoom(io: SocketIOServer, room: string, event: string, data: any) {
  io.to(room).emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast event to all
 * @param {SocketIOServer} io - Socket.IO server
 * @param {string} event - Event name
 * @param {any} data - Event data
 */
export function broadcast(io: SocketIOServer, event: string, data: any) {
  io.emit(event, {
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get online users count
 * @returns {number}
 */
export function getOnlineCount(): number {
  return connectedUsers.size;
}

/**
 * Get connected users
 * @returns {Map<string, ConnectedUser>}
 */
export function getConnectedUsers(): Map<string, ConnectedUser> {
  return connectedUsers;
}
