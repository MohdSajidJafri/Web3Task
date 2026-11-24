import crypto from 'crypto';

/**
 * Authoritative Room model managing playback state, participant roles, and control requests.
 */
export class Room {
  /**
   * @param {Object} params
   * @param {string} params.roomId
   * @param {string} [params.initialVideoId='M7lc1UVf-VE']
   */
  constructor({ roomId, initialVideoId = 'M7lc1UVf-VE' }) {
    if (!roomId) {
      throw new Error('Room requires a roomId');
    }
    this.roomId = String(roomId).toUpperCase();
    this.videoId = initialVideoId;
    this.playState = 'paused'; // 'playing' | 'paused'
    this.currentTime = 0; // seconds
    this.lastUpdatedAt = Date.now();
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();

    /** @type {Map<string, import('./Participant.js').Participant>} */
    this.participants = new Map();

    /** @type {Map<string, Object>} */
    this.pendingRequests = new Map();
  }

  /**
   * Calculates real-time authoritative current playback position in seconds.
   * If video is playing, accounts for elapsed real time since last update.
   * @returns {number}
   */
  getLiveCurrentTime() {
    if (this.playState === 'playing') {
      const elapsedSeconds = (Date.now() - this.lastUpdatedAt) / 1000;
      return Math.max(0, this.currentTime + elapsedSeconds);
    }
    return this.currentTime;
  }

  /**
   * Adds a participant to the room.
   * If room has no host, this participant becomes the host.
   * @param {import('./Participant.js').Participant} participant
   */
  addParticipant(participant) {
    this.lastActiveAt = Date.now();
    // Check if room currently has a host
    const hasHost = Array.from(this.participants.values()).some((p) => p.role === 'host');
    if (!hasHost) {
      participant.setRole('host');
    }

    this.participants.set(participant.userId, participant);
    return participant;
  }

  /**
   * Removes a participant by userId.
   * Cleans up any pending requests authored by this participant.
   * @param {string} userId
   * @returns {import('./Participant.js').Participant | undefined}
   */
  removeParticipant(userId) {
    this.lastActiveAt = Date.now();
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.delete(userId);
    }

    // Clean up any pending requests from this user
    for (const [reqId, req] of this.pendingRequests.entries()) {
      if (req.requesterId === userId) {
        this.pendingRequests.delete(reqId);
      }
    }

    return participant;
  }

  /**
   * Get participant by userId.
   * @param {string} userId
   */
  getParticipant(userId) {
    return this.participants.get(userId);
  }

  /**
   * Get participant by socketId.
   * @param {string} socketId
   */
  getParticipantBySocketId(socketId) {
    for (const participant of this.participants.values()) {
      if (participant.socketId === socketId) {
        return participant;
      }
    }
    return undefined;
  }

  /**
   * Updates authoritative playback state.
   * @param {'play' | 'pause' | 'seek'} action
   * @param {number} [time]
   * @param {string} [updatedBy]
   */
  updatePlayback(action, time, updatedBy) {
    this.lastActiveAt = Date.now();
    const liveTime = this.getLiveCurrentTime();

    if (action === 'play') {
      this.currentTime = typeof time === 'number' && !isNaN(time) && time >= 0 ? time : liveTime;
      this.playState = 'playing';
      this.lastUpdatedAt = Date.now();
    } else if (action === 'pause') {
      this.currentTime = typeof time === 'number' && !isNaN(time) && time >= 0 ? time : liveTime;
      this.playState = 'paused';
      this.lastUpdatedAt = Date.now();
    } else if (action === 'seek') {
      if (typeof time === 'number' && !isNaN(time)) {
        this.currentTime = Math.max(0, time);
      }
      this.lastUpdatedAt = Date.now();
    }

    return this.getSyncState(updatedBy);
  }

  /**
   * Change current video. Resets playback to paused at 0s.
   * @param {string} videoId
   * @param {string} [updatedBy]
   */
  setVideo(videoId, updatedBy) {
    this.lastActiveAt = Date.now();
    this.videoId = videoId;
    this.currentTime = 0;
    this.playState = 'paused';
    this.lastUpdatedAt = Date.now();
    return this.getSyncState(updatedBy);
  }

  /**
   * Assign a new role to a participant.
   * @param {string} userId
   * @param {'host' | 'moderator' | 'participant' | 'viewer'} role
   */
  assignRole(userId, role) {
    this.lastActiveAt = Date.now();
    const participant = this.participants.get(userId);
    if (!participant) {
      throw new Error('Participant not found');
    }
    participant.setRole(role);
    return participant;
  }

  /**
   * Transfer host role to another participant.
   * Existing host is converted to moderator.
   * @param {string} targetUserId
   */
  transferHost(targetUserId) {
    this.lastActiveAt = Date.now();
    const targetParticipant = this.participants.get(targetUserId);
    if (!targetParticipant) {
      throw new Error('Target participant not found in room');
    }

    // Demote existing host(s) to moderator
    for (const p of this.participants.values()) {
      if (p.role === 'host' && p.userId !== targetUserId) {
        p.setRole('moderator');
      }
    }

    targetParticipant.setRole('host');
    return targetParticipant;
  }

  /**
   * Handle host disconnect: automatic re-election of host.
   * Chooses longest-tenured moderator first, else longest-tenured participant/viewer.
   * @param {string} disconnectedUserId
   * @returns {import('./Participant.js').Participant | null} The newly elected host or null if empty
   */
  handleHostDisconnect(disconnectedUserId) {
    this.lastActiveAt = Date.now();
    // If room is empty, return null
    if (this.participants.size === 0) {
      return null;
    }

    // Check if an active host still exists
    const existingHost = Array.from(this.participants.values()).find((p) => p.role === 'host');
    if (existingHost) {
      return existingHost;
    }

    // Prioritize moderators sorted by oldest joinedAt
    const moderators = Array.from(this.participants.values())
      .filter((p) => p.role === 'moderator')
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (moderators.length > 0) {
      const newHost = moderators[0];
      newHost.setRole('host');
      return newHost;
    }

    // If no moderator, pick oldest participant
    const others = Array.from(this.participants.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    if (others.length > 0) {
      const newHost = others[0];
      newHost.setRole('host');
      return newHost;
    }

    return null;
  }

  /**
   * Creates a control request from a participant.
   * @param {Object} params
   * @param {string} params.requesterId
   * @param {string} params.requesterName
   * @param {'play' | 'pause' | 'seek' | 'change_video' | 'request_moderator'} params.action
   * @param {any} [params.payload]
   * @param {string} [params.label]
   */
  createControlRequest({ requesterId, requesterName, action, payload, label }) {
    this.lastActiveAt = Date.now();
    const requestId = crypto.randomUUID();
    const request = {
      requestId,
      roomId: this.roomId,
      requesterId,
      requesterName,
      action,
      payload,
      label: label || `${requesterName} requested ${action}`,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.pendingRequests.set(requestId, request);
    return request;
  }

  /**
   * Resolves a control request. If approved, executes the action.
   * @param {string} requestId
   * @param {boolean} approve
   * @returns {{ request: Object, executed: boolean, syncState?: Object, updatedParticipant?: any }}
   */
  resolveControlRequest(requestId, approve) {
    this.lastActiveAt = Date.now();
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      throw new Error('Request not found or already resolved');
    }

    this.pendingRequests.delete(requestId);
    request.status = approve ? 'approved' : 'rejected';
    request.resolvedAt = Date.now();

    let syncState = null;
    let updatedParticipant = null;

    if (approve) {
      if (request.action === 'play') {
        syncState = this.updatePlayback('play', request.payload?.currentTime, request.requesterName);
      } else if (request.action === 'pause') {
        syncState = this.updatePlayback('pause', request.payload?.currentTime, request.requesterName);
      } else if (request.action === 'seek') {
        syncState = this.updatePlayback('seek', request.payload?.time, request.requesterName);
      } else if (request.action === 'change_video') {
        syncState = this.setVideo(request.payload?.videoId, request.requesterName);
      } else if (request.action === 'request_moderator') {
        try {
          updatedParticipant = this.assignRole(request.requesterId, 'moderator');
        } catch (e) {
          // User might have left
        }
      }
    }

    return {
      request,
      executed: approve,
      syncState,
      updatedParticipant,
    };
  }

  /**
   * Formats the current synchronized playback state.
   * @param {string} [updatedBy]
   */
  getSyncState(updatedBy) {
    return {
      roomId: this.roomId,
      playState: this.playState,
      currentTime: Math.round(this.getLiveCurrentTime() * 100) / 100,
      videoId: this.videoId,
      lastUpdatedAt: this.lastUpdatedAt,
      updatedBy: updatedBy || null,
    };
  }

  /**
   * Returns list of participants in room.
   */
  getParticipantsList() {
    const rolePrecedence = { host: 1, moderator: 2, participant: 3, viewer: 4 };
    return Array.from(this.participants.values())
      .map((p) => p.toJSON())
      .sort((a, b) => {
        const diff = (rolePrecedence[a.role] || 99) - (rolePrecedence[b.role] || 99);
        if (diff !== 0) return diff;
        return a.joinedAt - b.joinedAt;
      });
  }

  /**
   * Returns list of pending requests.
   */
  getPendingRequestsList() {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Checks if room has 0 participants.
   */
  isEmpty() {
    return this.participants.size === 0;
  }
}
