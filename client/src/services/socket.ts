import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  const token = getStoredToken();
  const PROD_BACKEND_URL = 'https://anon-chat-ohws.onrender.com';
  const defaultBase = import.meta.env.PROD ? PROD_BACKEND_URL : window.location.origin;
  const socketUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL || defaultBase;

  if (!socketInstance) {
    socketInstance = io(socketUrl, {
      path: '/socket.io',
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  } else {
    // If token changed, update auth and reconnect if needed
    if (socketInstance.auth && (socketInstance.auth as any).token !== token) {
      (socketInstance.auth as any).token = token;
      if (socketInstance.connected) {
        socketInstance.disconnect().connect();
      }
    }
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
