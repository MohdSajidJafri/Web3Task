import crypto from 'crypto';
import { Room } from '../models/Room.js';

/**
 * Service managing rooms in memory with auto code generation and cleanup.
 */
export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
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
   * Get an existing room by ID.
   * @param {string} roomId
   * @returns {Room | undefined}
   */
  getRoom(roomId) {
    if (!roomId) return undefined;
    return this.rooms.get(String(roomId).trim().toUpperCase());
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
   * @param {string} roomId
   */
  cleanupIfEmpty(roomId) {
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
