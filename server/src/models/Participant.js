/**
 * Participant model representing a user in a watch party room.
 */
export class Participant {
  /**
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.socketId
   * @param {string} params.username
   * @param {'host' | 'moderator' | 'participant' | 'viewer'} [params.role='participant']
   * @param {number} [params.joinedAt]
   */
  constructor({ userId, socketId, username, role = 'participant', joinedAt = Date.now() }) {
    if (!userId || !username) {
      throw new Error('Participant requires userId and username');
    }
    this.userId = String(userId);
    this.socketId = String(socketId);
    this.username = String(username).trim();
    this.role = this.validateRole(role);
    this.joinedAt = joinedAt;
  }

  validateRole(role) {
    const validRoles = ['host', 'moderator', 'participant', 'viewer'];
    if (!validRoles.includes(role)) {
      return 'participant';
    }
    return role;
  }

  /**
   * Checks if participant has permission to control video playback (play, pause, seek, change video).
   * Host and Moderator are granted playback control.
   * If isOpenControl is true (Open-Party Mode), participants are also allowed.
   * @param {boolean} [isOpenControl=false]
   * @returns {boolean}
   */
  canControlPlayback(isOpenControl = false) {
    return Boolean(isOpenControl) || this.role === 'host' || this.role === 'moderator';
  }

  /**
   * Checks if participant has permission to manage room (assign roles, kick, transfer host, lock room).
   * Host only.
   * @returns {boolean}
   */
  canManageRoom() {
    return this.role === 'host';
  }

  /**
   * Update participant's role.
   * @param {'host' | 'moderator' | 'participant' | 'viewer'} newRole
   */
  setRole(newRole) {
    this.role = this.validateRole(newRole);
  }

  /**
   * Update socket ID (e.g. on reconnection).
   * @param {string} newSocketId
   */
  updateSocketId(newSocketId) {
    this.socketId = String(newSocketId);
  }

  toJSON() {
    return {
      userId: this.userId,
      socketId: this.socketId,
      username: this.username,
      role: this.role,
      joinedAt: this.joinedAt,
    };
  }
}
