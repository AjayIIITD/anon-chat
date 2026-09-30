import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './middleware/authMiddleware';
import { pool } from './db';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  anonymousUsername?: string;
}

let io: SocketIOServer | null = null;
// roomId -> Set of anonymous usernames
const roomOnlineUsers = new Map<string, Set<string>>();

export function getLivePresenceMap(): Record<string, { onlineCount: number; activeUsers: string[] }> {
  const map: Record<string, { onlineCount: number; activeUsers: string[] }> = {};
  for (const [roomId, userSet] of roomOnlineUsers.entries()) {
    map[roomId] = {
      onlineCount: userSet.size,
      activeUsers: Array.from(userSet),
    };
  }
  return map;
}

function broadcastPresence(targetRoomId?: string) {
  if (!io) return;

  const liveMap = getLivePresenceMap();

  // 1. Broadcast global presence map to all connected clients (Dashboard, Navbar, etc.)
  io.emit('all_rooms_presence', liveMap);

  // 2. Broadcast specific room presence to users inside that room
  if (targetRoomId) {
    const roomData = liveMap[targetRoomId] || { onlineCount: 0, activeUsers: [] };
    io.to(targetRoomId).emit('room_presence', {
      roomId: targetRoomId,
      onlineCount: roomData.onlineCount,
      activeUsers: roomData.activeUsers,
    });
  }
}

export function initWebSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication token required'));
      }

      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      const userRes = await pool.query(
        'SELECT id, anonymous_username, is_suspended FROM users WHERE id = $1;',
        [payload.userId]
      );

      if (userRes.rows.length === 0) {
        return next(new Error('User not found'));
      }

      if (userRes.rows[0].is_suspended) {
        return next(new Error('User account is suspended'));
      }

      socket.userId = userRes.rows[0].id;
      socket.anonymousUsername = userRes.rows[0].anonymous_username;
      next();
    } catch (err) {
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    // Immediately send current live presence of all rooms to newly connected client
    socket.emit('all_rooms_presence', getLivePresenceMap());

    // Join room
    socket.on('join_room', (roomId: string) => {
      if (!roomId) return;
      socket.join(roomId);

      if (!roomOnlineUsers.has(roomId)) {
        roomOnlineUsers.set(roomId, new Set());
      }
      if (socket.anonymousUsername) {
        roomOnlineUsers.get(roomId)!.add(socket.anonymousUsername);
      }

      broadcastPresence(roomId);
    });

    // Leave room
    socket.on('leave_room', (roomId: string) => {
      if (!roomId) return;
      socket.leave(roomId);

      if (roomOnlineUsers.has(roomId) && socket.anonymousUsername) {
        roomOnlineUsers.get(roomId)!.delete(socket.anonymousUsername);
        broadcastPresence(roomId);
      }
    });

    // Typing indicator
    socket.on('typing', ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', {
        roomId,
        username: socket.anonymousUsername,
        isTyping,
      });
    });

    // Handle disconnect
    socket.on('disconnecting', () => {
      for (const roomId of socket.rooms) {
        if (roomOnlineUsers.has(roomId) && socket.anonymousUsername) {
          roomOnlineUsers.get(roomId)!.delete(socket.anonymousUsername);
          broadcastPresence(roomId);
        }
      }
    });
  });

  return io;
}

export function broadcastMessageToRoom(
  roomId: string,
  messageData: {
    id: string;
    room_id: string;
    message: string;
    created_at: string | Date;
    anonymous_username: string;
    sender_id: string;
  }
): void {
  if (!io) return;

  const roomSockets = io.sockets.adapter.rooms.get(roomId);
  if (!roomSockets) return;

  for (const socketId of roomSockets) {
    const socket = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
    if (socket) {
      socket.emit('new_message', {
        id: messageData.id,
        room_id: messageData.room_id,
        message: messageData.message,
        created_at: messageData.created_at,
        anonymous_username: messageData.anonymous_username,
        is_self: socket.userId === messageData.sender_id,
      });
    }
  }
}
