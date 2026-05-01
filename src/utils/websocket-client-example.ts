/**
 * WebSocket Client Example (Browser)
 * Copy this code to test WebSocket connection
 *
 * Usage:
 * 1. Open browser console at http://localhost:3000
 * 2. Paste this code
 * 3. Replace 'YOUR_JWT_TOKEN' with actual token
 */

// WebSocket connection setup
const WS_URL = `ws://${window.location.host}`;
const socket = io(WS_URL, {
  auth: {
    token: 'Bearer YOUR_JWT_TOKEN', // Replace with your JWT token
  },
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected:', socket.id);
});

socket.on('connected', (data: any) => {
  console.log('🎉 Connection confirmed:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

socket.on('connect_error', (error: Error) => {
  console.error('❌ Connection error:', error.message);
});

// User events
socket.on('user:online', (data: any) => {
  console.log('🟢 User online:', data);
});

socket.on('user:offline', (data: any) => {
  console.log('🔴 User offline:', data);
});

// Room events
socket.on('room:joined', (data: any) => {
  console.log('🚪 Joined room:', data);
});

socket.on('room:left', (data: any) => {
  console.log('🚪 Left room:', data);
});

socket.on('room:user_joined', (data: any) => {
  console.log('👤 User joined room:', data);
});

// Message events
socket.on('message', (data: any) => {
  console.log('💬 Message received:', data);
});

// Example usage:
// Join a room
// socket.emit('room:join', 'room-name');

// Send message
// socket.emit('message', { text: 'Hello!' });

// Emit to room
// socket.emit('room:emit', { room: 'room-name', event: 'custom-event', data: { foo: 'bar' } });

// Broadcast to role
// socket.emit('broadcast:role', { role: 'ADMIN', event: 'admin-notification', data: { message: 'Hello admins!' } });
