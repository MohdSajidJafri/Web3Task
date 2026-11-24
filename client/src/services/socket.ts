import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    // If running in development with Vite proxy or production served from Express, window.location.origin is fine
    const serverUrl = window.location.hostname === 'localhost' && window.location.port === '5173'
      ? 'http://localhost:5000'
      : window.location.origin;

    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socketInstance;
}
