import crypto from 'crypto';
import { Room } from '../models/Room.js';
import { Participant } from '../models/Participant.js';

export const DEMO_ROOMS = {
  GTAVIP: {
    videoId: 'QdBZY2fkU-0',
    host: 'Sajid',
    title: 'Grand Theft Auto VI Trailer 1',
  },
  LOFIPY: {
    videoId: 'jfKfPfyJRdk',
    host: 'Alex',
    title: 'lofi hip hop radio 📚 beats to relax/study to',
  },
  CYBER9: {
    videoId: 'eaW0t48HGHM',
    host: 'Jordan',
    title: 'Cyberpunk 2077: Phantom Liberty — Official Cinematic Trailer',
  },
  WEB3AI: {
    videoId: 'M7lc1UVf-VE',
    host: 'Elena',
    title: 'YouTube Developers Live: Embedded Web Player Customization',
  },
};

/**
 * Service managing rooms in memory with auto code generation and cleanup.
 */
export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    this.seedDemoRooms();
  }

  seedDemoRoom(code) {
    const info = DEMO_ROOMS[code];
    if (!info) return undefined;

    const hostParticipant = new Participant({
      userId: `demo_host_${code.toLowerCase()}`,
      socketId: `socket_${code.toLowerCase()}`,
      username: `${info.host} (Host)`,
      role: 'host',
    });

    const room = new Room({ roomId: code, initialVideoId: info.videoId });
    room.videoTitle = info.title;
    room.playState = 'playing';
    room.currentTime = 15;
    room.lastUpdatedAt = Date.now();
    room.isOpenControl = true; // Open controls enabled so demo guests can play/pause/seek freely
    room.addParticipant(hostParticipant);

    this.rooms.set(code, room);
    return room;
  }

  seedDemoRooms() {
    for (const code of Object.keys(DEMO_ROOMS)) {
      if (!this.rooms.has(code)) {
        this.seedDemoRoom(code);
      }
    }
  }

  /**
   * Generates a 6-character uppercase alphanumeric room code (e.g. 'PARTY9').
   * Guarantees uniqueness among active rooms.
   * @returns {string}
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused 0/O, 1/I
    let code = '';
    let attempts = 0;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        const index = crypto.randomInt(0, chars.length);
        code += chars[index];
      }
      attempts++;
      if (attempts > 1000) {
        // Fallback with timestamp suffix if very crowded
        code = (Date.now().toString(36).slice(-6)).toUpperCase();
        break;
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Creates a new room with the given host participant.
   * @param {import('../models/Participant.js').Participant} hostParticipant
   * @param {string} [initialVideoId]
   * @param {string} [customRoomId]
   * @returns {Room}
   */
  createRoom(hostParticipant, initialVideoId, customRoomId) {
    const roomId = (customRoomId ? String(customRoomId).trim() : this.generateRoomCode()).toUpperCase();

    if (this.rooms.has(roomId)) {
      throw new Error(`Room with code ${roomId} already exists`);
    }

    const room = new Room({ roomId, initialVideoId });
    hostParticipant.setRole('host');
    room.addParticipant(hostParticipant);

    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Get an existing room by ID. Auto-seeds demo rooms if requested.
   * @param {string} roomId
   * @returns {Room | undefined}
   */
  getRoom(roomId) {
    if (!roomId) return undefined;
    const cleanId = String(roomId).trim().toUpperCase();
    if (!this.rooms.has(cleanId) && DEMO_ROOMS[cleanId]) {
      return this.seedDemoRoom(cleanId);
    }
    return this.rooms.get(cleanId);
  }

  /**
   * Finds the room that contains the given socket ID.
   * @param {string} socketId
   * @returns {Room | undefined}
   */
  getRoomBySocketId(socketId) {
    for (const room of this.rooms.values()) {
      if (room.getParticipantBySocketId(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Removes a room entirely.
   * @param {string} roomId
   */
  removeRoom(roomId) {
    if (!roomId) return false;
    return this.rooms.delete(String(roomId).trim().toUpperCase());
  }

  /**
   * Cleans up empty room if it has 0 participants.
   * Preserves demo curated parties so visitors can always explore them.
   * @param {string} roomId
   */
  cleanupIfEmpty(roomId) {
    if (!roomId) return false;
    const cleanId = String(roomId).trim().toUpperCase();
    if (DEMO_ROOMS[cleanId]) return false;

    const room = this.getRoom(roomId);
    if (room && room.isEmpty()) {
      this.rooms.delete(room.roomId);
      return true;
    }
    return false;
  }

  /**
   * Count of active rooms.
   */
  getActiveRoomsCount() {
    return this.rooms.size;
  }
}

// Singleton instance
export const roomManager = new RoomManager();
