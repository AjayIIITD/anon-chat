import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './api';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  const token = getStoredToken();

  if (!socketInstance) {
    socketInstance = io(window.location.origin, {
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
