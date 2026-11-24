import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketHandler } from './controllers/WebSocketHandler.js';
import { roomManager } from './services/RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createServer() {
  const app = express();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Standard middlewares
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeRooms: roomManager.getActiveRoomsCount(),
      uptime: process.uptime(),
    });
  });

  // Active public rooms discovery endpoint
  app.get('/api/rooms', (req, res) => {
    const list = Array.from(roomManager.rooms.values())
      .filter((r) => !r.isLocked)
      .map((r) => ({
        roomId: r.roomId,
        videoTitle: r.videoTitle,
        videoId: r.videoId,
        viewers: r.participants.size,
        playState: r.playState,
      }));
    res.json({ rooms: list });
  });

  // Attach WebSocket handler
  const wsHandler = new WebSocketHandler(io);
  io.on('connection', (socket) => {
    wsHandler.handleConnection(socket);
  });

  // Serve static client build if present (for single-service deployment)
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.send(`
        <h1>YouTube Watch Party API Server</h1>
        <p>Active rooms: ${roomManager.getActiveRoomsCount()}</p>
        <p>Client build not found at <code>${clientDistPath}</code>. Run <code>npm run build</code> to bundle the client.</p>
      `);
    });
  }

  return { app, server, io };
}

// Auto-run if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  process.argv[1].endsWith('src\\server.js') ||
  process.argv[1].endsWith('src/server.js')
);

if (isDirectRun) {
  const PORT = process.env.PORT || 5000;
  const { server } = createServer();
  server.listen(PORT, () => {
    console.log(`[Server] YouTube Watch Party server running on port ${PORT}`);
    console.log(`[Server] Health check available at http://localhost:${PORT}/api/health`);
  });
}
