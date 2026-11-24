import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getServerUrl(): string {
  // Support custom backend URL when deployed on Vercel
  const envUrl = import.meta.env.VITE_SERVER_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Local development fallback
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:5000';
  }

  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000';
}

export function getSocket(): Socket {
  if (!socketInstance) {
    const serverUrl = getServerUrl();

    socketInstance = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socketInstance;
}
