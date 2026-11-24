import crypto from 'crypto';

/**
 * Fetch YouTube video title via public oEmbed endpoint with a safe fallback.
 * @param {string} videoId
 * @returns {Promise<string>}
 */
export async function fetchYouTubeTitle(videoId) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return data.title;
      }
      if (data && data.html) {
        const match = data.html.match(/title="([^"]+)"/);
        if (match && match[1]) return match[1];
      }
    }
  } catch (err) {
    // Fallback if network blocked or video metadata unlisted
  }

  // Curated fallbacks for quick demo presets
  if (videoId === 'QdBZY2fkU-0') return 'Grand Theft Auto VI Trailer 1';
  if (videoId === 'jfKfPfyJRdk') return 'lofi hip hop radio 📚 beats to relax/study to';
  if (videoId === 'LXb3EKWsInQ') return 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)';
  if (videoId === 'M7lc1UVf-VE') return 'YouTube Developers Live: Embedded Web Player Customization';

  return `Video (${videoId})`;
}

/**
 * Authoritative Room model managing playback state, participant roles, queues, and control requests.
 */
export class Room {
  /**
   * @param {Object} params
   * @param {string} params.roomId
   * @param {string} [params.initialVideoId='QdBZY2fkU-0']
   */
  constructor({ roomId, initialVideoId = 'QdBZY2fkU-0' }) {
    if (!roomId) {
      throw new Error('Room requires a roomId');
    }
    this.roomId = String(roomId).toUpperCase();
    this.videoId = initialVideoId;
    this.videoTitle =
      initialVideoId === 'QdBZY2fkU-0'
        ? 'Grand Theft Auto VI Trailer 1'
        : initialVideoId === 'jfKfPfyJRdk'
        ? 'lofi hip hop radio 📚 beats to relax/study to'
        : initialVideoId === 'LXb3EKWsInQ'
        ? 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)'
        : `Video (${initialVideoId})`;
    this.playState = 'paused'; // 'playing' | 'paused'
    this.currentTime = 0; // seconds
    this.lastUpdatedAt = Date.now();
    this.createdAt = Date.now();
    this.lastActiveAt = Date.now();

    /** @type {boolean} Room lock: prevents new users from joining */
    this.isLocked = false;

    /** @type {boolean} Open controls: allows participants to control playback directly */
    this.isOpenControl = false;

    /** @type {Array<{ id: string, videoId: string, title: string, addedBy: string, addedByRole: string, createdAt: number }>} */
    this.queue = [];

    /** @type {Array<{ id: string, videoId: string, title: string, suggestedBy: string, suggestedById: string, createdAt: number }>} */
    this.suggestedQueue = [];

    /** @type {Map<string, import('./Participant.js').Participant>} */
    this.participants = new Map();

    /** @type {Map<string, Object>} */
    this.pendingRequests = new Map();

    /** @type {Map<string, NodeJS.Timeout>} Grace period timers for disconnected users */
    this.disconnectGraceTimers = new Map();
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
    // Cancel any pending disconnect grace timer if user reconnects
    this.cancelDisconnect(participant.userId);

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
    this.cancelDisconnect(userId);

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
   * Schedules a 15-second grace period on socket disconnect.
   * @param {string} userId
   * @param {() => void} onTimeoutCallback
   * @param {number} [delayMs=15000]
   */
  scheduleDisconnect(userId, onTimeoutCallback, delayMs = 15000) {
    this.cancelDisconnect(userId);
    const timer = setTimeout(() => {
      this.disconnectGraceTimers.delete(userId);
      onTimeoutCallback();
    }, delayMs);
    this.disconnectGraceTimers.set(userId, timer);
  }

  /**
   * Cancels a pending disconnect grace timer when user reconnects.
   * @param {string} userId
   * @returns {boolean}
   */
  cancelDisconnect(userId) {
    const timer = this.disconnectGraceTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectGraceTimers.delete(userId);
      return true;
    }
    return false;
  }

  /**
   * Check if a user is currently in the disconnect grace period.
   * @param {string} userId
   */
  hasPendingGracePeriod(userId) {
    return this.disconnectGraceTimers.has(userId);
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
   * @param {string} [title]
   */
  setVideo(videoId, updatedBy, title) {
    this.lastActiveAt = Date.now();
    this.videoId = videoId;
    this.videoTitle = title || `Video (${videoId})`;
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
   * @param {string} disconnectedUserId
   * @returns {import('./Participant.js').Participant | null}
   */
  handleHostDisconnect(disconnectedUserId) {
    this.lastActiveAt = Date.now();
    if (this.participants.size === 0) {
      return null;
    }

    const existingHost = Array.from(this.participants.values()).find((p) => p.role === 'host');
    if (existingHost) {
      return existingHost;
    }

    const moderators = Array.from(this.participants.values())
      .filter((p) => p.role === 'moderator')
      .sort((a, b) => a.joinedAt - b.joinedAt);

    if (moderators.length > 0) {
      const newHost = moderators[0];
      newHost.setRole('host');
      return newHost;
    }

    const others = Array.from(this.participants.values()).sort((a, b) => a.joinedAt - b.joinedAt);
    if (others.length > 0) {
      const newHost = others[0];
      newHost.setRole('host');
      return newHost;
    }

    return null;
  }

  // ==========================================
  // SHARED QUEUE & SUGGESTIONS LOGIC
  // ==========================================

  /**
   * Add a video to the official playlist queue.
   * @param {Object} params
   * @param {string} params.videoId
   * @param {string} params.title
   * @param {string} params.addedBy
   * @param {string} params.addedByRole
   */
  addToQueue({ videoId, title, addedBy, addedByRole }) {
    this.lastActiveAt = Date.now();
    const item = {
      id: crypto.randomUUID(),
      videoId,
      title: title || `Video (${videoId})`,
      addedBy,
      addedByRole,
      createdAt: Date.now(),
    };
    this.queue.push(item);
    return item;
  }

  /**
   * Add a suggested video from a participant.
   * @param {Object} params
   * @param {string} params.videoId
   * @param {string} params.title
   * @param {string} params.suggestedBy
   * @param {string} params.suggestedById
   */
  addToSuggestedQueue({ videoId, title, suggestedBy, suggestedById }) {
    this.lastActiveAt = Date.now();
    const item = {
      id: crypto.randomUUID(),
      videoId,
      title: title || `Video (${videoId})`,
      suggestedBy,
      suggestedById,
      createdAt: Date.now(),
    };
    this.suggestedQueue.push(item);
    return item;
  }

  /**
   * Approve a suggested video, moving it into the official queue.
   * @param {string} suggestionId
   */
  approveSuggestion(suggestionId) {
    this.lastActiveAt = Date.now();
    const index = this.suggestedQueue.findIndex((s) => s.id === suggestionId);
    if (index === -1) return null;

    const [suggestion] = this.suggestedQueue.splice(index, 1);
    const queuedItem = {
      id: suggestion.id,
      videoId: suggestion.videoId,
      title: suggestion.title,
      addedBy: suggestion.suggestedBy,
      addedByRole: 'participant',
      createdAt: Date.now(),
    };
    this.queue.push(queuedItem);
    return queuedItem;
  }

  /**
   * Reject a suggestion from the suggested queue.
   * @param {string} suggestionId
   */
  rejectSuggestion(suggestionId) {
    this.lastActiveAt = Date.now();
    const index = this.suggestedQueue.findIndex((s) => s.id === suggestionId);
    if (index === -1) return null;
    return this.suggestedQueue.splice(index, 1)[0];
  }

  /**
   * Remove an item from the official queue.
   * @param {string} itemId
   */
  removeFromQueue(itemId) {
    this.lastActiveAt = Date.now();
    const index = this.queue.findIndex((q) => q.id === itemId);
    if (index === -1) return null;
    return this.queue.splice(index, 1)[0];
  }

  /**
   * Move item inside the queue.
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  reorderQueue(fromIndex, toIndex) {
    this.lastActiveAt = Date.now();
    if (
      fromIndex < 0 ||
      fromIndex >= this.queue.length ||
      toIndex < 0 ||
      toIndex >= this.queue.length
    ) {
      return this.queue;
    }
    const [moved] = this.queue.splice(fromIndex, 1);
    this.queue.splice(toIndex, 0, moved);
    return this.queue;
  }

  /**
   * Pop and play the next video in queue.
   * @param {string} [triggeredBy]
   */
  playNextInQueue(triggeredBy) {
    this.lastActiveAt = Date.now();
    if (this.queue.length === 0) return null;

    const nextItem = this.queue.shift();
    this.videoId = nextItem.videoId;
    this.videoTitle = nextItem.title;
    this.currentTime = 0;
    this.playState = 'playing';
    this.lastUpdatedAt = Date.now();

    return nextItem;
  }

  /**
   * Returns current queue and suggestedQueue data.
   */
  getQueueState() {
    return {
      queue: this.queue,
      suggestedQueue: this.suggestedQueue,
    };
  }

  // ==========================================
  // ROOM SETTINGS (LOCK & OPEN CONTROLS)
  // ==========================================

  /**
   * Updates room settings.
   * @param {Object} settings
   * @param {boolean} [settings.isLocked]
   * @param {boolean} [settings.isOpenControl]
   */
  updateSettings({ isLocked, isOpenControl }) {
    this.lastActiveAt = Date.now();
    if (typeof isLocked === 'boolean') {
      this.isLocked = isLocked;
    }
    if (typeof isOpenControl === 'boolean') {
      this.isOpenControl = isOpenControl;
    }
    return {
      isLocked: this.isLocked,
      isOpenControl: this.isOpenControl,
    };
  }

  getSettings() {
    return {
      isLocked: this.isLocked,
      isOpenControl: this.isOpenControl,
    };
  }

  // ==========================================
  // CONTROL REQUESTS
  // ==========================================

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

  getSyncState(updatedBy) {
    return {
      roomId: this.roomId,
      playState: this.playState,
      currentTime: Math.round(this.getLiveCurrentTime() * 100) / 100,
      videoId: this.videoId,
      videoTitle: this.videoTitle,
      lastUpdatedAt: this.lastUpdatedAt,
      updatedBy: updatedBy || null,
      isLocked: this.isLocked,
      isOpenControl: this.isOpenControl,
      queueCount: this.queue.length,
    };
  }

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

  getPendingRequestsList() {
    return Array.from(this.pendingRequests.values());
  }

  isEmpty() {
    return this.participants.size === 0 && this.disconnectGraceTimers.size === 0;
  }
}
