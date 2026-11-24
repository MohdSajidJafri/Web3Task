import crypto from 'crypto';
import { Participant } from '../models/Participant.js';
import { roomManager } from '../services/RoomManager.js';
import { extractYouTubeVideoId } from '../utils/youtube.js';
import { fetchYouTubeTitle } from '../models/Room.js';

export class WebSocketHandler {
  /**
   * @param {import('socket.io').Server} io
   */
  constructor(io) {
    this.io = io;
  }

  /**
   * Initialize socket events
   * @param {import('socket.io').Socket} socket
   */
  handleConnection(socket) {
    // 1. Join Room
    socket.on('join_room', async ({ roomId, username, userId }) => {
      try {
        const cleanUsername = String(username || '').trim() || 'Anonymous';
        const cleanUserId = userId ? String(userId).trim() : crypto.randomUUID();

        let room;
        let isCreator = false;

        if (!roomId || String(roomId).trim() === '') {
          // Creating a new room
          const participant = new Participant({
            userId: cleanUserId,
            socketId: socket.id,
            username: cleanUsername,
            role: 'host',
          });
          room = roomManager.createRoom(participant);
          isCreator = true;
        } else {
          // Joining an existing room
          const cleanRoomId = String(roomId).trim().toUpperCase();
          room = roomManager.getRoom(cleanRoomId);

          if (!room) {
            socket.emit('error', { message: `Room '${cleanRoomId}' not found. Please check the code.` });
            return;
          }

          // Check if room is locked and user is NOT an existing participant reconnecting
          const existingParticipant = room.getParticipant(cleanUserId);
          const isReconnecting = Boolean(existingParticipant || room.hasPendingGracePeriod(cleanUserId));

          if (room.isLocked && !isReconnecting) {
            socket.emit('room_error', { message: 'This room is locked by the host.' });
            socket.emit('error', { message: 'This room is locked by the host.' });
            return;
          }

          // Cancel any pending disconnect grace timer if reconnecting
          room.cancelDisconnect(cleanUserId);

          if (existingParticipant) {
            existingParticipant.updateSocketId(socket.id);
            existingParticipant.username = cleanUsername;
          } else {
            const participant = new Participant({
              userId: cleanUserId,
              socketId: socket.id,
              username: cleanUsername,
              role: 'participant',
            });
            room.addParticipant(participant);
          }
        }

        const currentParticipant = room.getParticipant(cleanUserId);

        // Associate socket with room and user
        socket.data.roomId = room.roomId;
        socket.data.userId = cleanUserId;
        socket.join(room.roomId);

        // Acknowledge join to socket
        socket.emit('room_joined', {
          roomId: room.roomId,
          userId: currentParticipant.userId,
          username: currentParticipant.username,
          role: currentParticipant.role,
          isCreator,
          isLocked: room.isLocked,
          isOpenControl: room.isOpenControl,
        });

        // Send authoritative sync state to joiner
        socket.emit('sync_state', room.getSyncState());

        // Send queue state to joiner
        socket.emit('queue_updated', room.getQueueState());

        // Send room settings
        socket.emit('room_settings_updated', room.getSettings());

        // Send active pending requests if user is host or moderator
        if (currentParticipant.canControlPlayback(room.isOpenControl)) {
          socket.emit('pending_requests_sync', room.getPendingRequestsList());
        }

        // Broadcast to all room members that user joined
        this.io.to(room.roomId).emit('user_joined', {
          username: currentParticipant.username,
          userId: currentParticipant.userId,
          role: currentParticipant.role,
          participants: room.getParticipantsList(),
        });
      } catch (err) {
        socket.emit('error', { message: err.message || 'Failed to join room' });
      }
    });

    // Helper to get room and participant from socket
    const getContext = (targetRoomId) => {
      const roomId = targetRoomId || socket.data.roomId;
      const userId = socket.data.userId;
      if (!roomId) return null;
      const room = roomManager.getRoom(roomId);
      if (!room) return null;
      const participant = room.getParticipant(userId) || room.getParticipantBySocketId(socket.id);
      return { room, participant, userId: participant?.userId };
    };

    // 2. Leave Room (explicit exit cancels grace period)
    socket.on('leave_room', ({ roomId }) => {
      try {
        const ctx = getContext(roomId);
        if (!ctx || !ctx.room || !ctx.participant) return;

        const { room, participant } = ctx;
        const wasHost = participant.role === 'host';

        room.cancelDisconnect(participant.userId);
        room.removeParticipant(participant.userId);
        socket.leave(room.roomId);
        socket.data.roomId = null;

        if (wasHost && !room.isEmpty()) {
          const newHost = room.handleHostDisconnect(participant.userId);
          if (newHost) {
            this.io.to(room.roomId).emit('role_assigned', {
              userId: newHost.userId,
              username: newHost.username,
              role: newHost.role,
              participants: room.getParticipantsList(),
            });
          }
        }

        this.io.to(room.roomId).emit('user_left', {
          username: participant.username,
          userId: participant.userId,
          participants: room.getParticipantsList(),
        });

        roomManager.cleanupIfEmpty(room.roomId);
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // 3. Playback Controls (Play, Pause, Seek, Change Video)
    socket.on('play', ({ roomId, currentTime } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'play',
          message: 'Permission denied: Only Host or Moderator can control playback. Use "Request Control" instead.',
        });
        return;
      }

      const syncState = ctx.room.updatePlayback('play', currentTime, ctx.participant.username);
      this.io.to(ctx.room.roomId).emit('sync_state', syncState);
    });

    socket.on('pause', ({ roomId, currentTime } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'pause',
          message: 'Permission denied: Only Host or Moderator can control playback. Use "Request Control" instead.',
        });
        return;
      }

      const syncState = ctx.room.updatePlayback('pause', currentTime, ctx.participant.username);
      this.io.to(ctx.room.roomId).emit('sync_state', syncState);
    });

    socket.on('seek', ({ roomId, time } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'seek',
          message: 'Permission denied: Only Host or Moderator can scrub/seek video. Use "Request Control" instead.',
        });
        return;
      }

      const syncState = ctx.room.updatePlayback('seek', Number(time), ctx.participant.username);
      this.io.to(ctx.room.roomId).emit('sync_state', syncState);
    });

    socket.on('change_video', async ({ roomId, videoId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'change_video',
          message: 'Permission denied: Only Host or Moderator can change the video. Use "Request Control" instead.',
        });
        return;
      }

      const cleanVideoId = extractYouTubeVideoId(videoId);
      if (!cleanVideoId) {
        socket.emit('error', { message: 'Invalid YouTube link or Video ID. Please check and try again.' });
        return;
      }

      const title = await fetchYouTubeTitle(cleanVideoId);
      const syncState = ctx.room.setVideo(cleanVideoId, ctx.participant.username, title);
      this.io.to(ctx.room.roomId).emit('sync_state', syncState);
    });

    // 4. SHARED QUEUE & SUGGESTIONS EVENTS
    socket.on('queue_add', async ({ roomId, videoId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_add',
          message: 'Permission denied: Only Host or Moderator can add directly to the queue. Use Suggest instead.',
        });
        return;
      }

      const cleanVideoId = extractYouTubeVideoId(videoId);
      if (!cleanVideoId) {
        socket.emit('error', { message: 'Invalid YouTube link or Video ID' });
        return;
      }

      const title = await fetchYouTubeTitle(cleanVideoId);
      ctx.room.addToQueue({
        videoId: cleanVideoId,
        title,
        addedBy: ctx.participant.username,
        addedByRole: ctx.participant.role,
      });

      this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
    });

    socket.on('queue_suggest', async ({ roomId, videoId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      const cleanVideoId = extractYouTubeVideoId(videoId);
      if (!cleanVideoId) {
        socket.emit('error', { message: 'Invalid YouTube link or Video ID' });
        return;
      }

      const title = await fetchYouTubeTitle(cleanVideoId);
      ctx.room.addToSuggestedQueue({
        videoId: cleanVideoId,
        title,
        suggestedBy: ctx.participant.username,
        suggestedById: ctx.participant.userId,
      });

      this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
      socket.emit('suggestion_submitted', { message: 'Your video suggestion was submitted to Host and Mods!' });
    });

    socket.on('queue_approve_suggestion', ({ roomId, suggestionId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_approve_suggestion',
          message: 'Permission denied: Only Host or Moderator can approve video suggestions.',
        });
        return;
      }

      const item = ctx.room.approveSuggestion(suggestionId);
      if (item) {
        this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
      }
    });

    socket.on('queue_reject_suggestion', ({ roomId, suggestionId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_reject_suggestion',
          message: 'Permission denied: Only Host or Moderator can reject video suggestions.',
        });
        return;
      }

      ctx.room.rejectSuggestion(suggestionId);
      this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
    });

    socket.on('queue_remove', ({ roomId, itemId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_remove',
          message: 'Permission denied: Only Host or Moderator can remove items from queue.',
        });
        return;
      }

      ctx.room.removeFromQueue(itemId);
      this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
    });

    socket.on('queue_reorder', ({ roomId, fromIndex, toIndex } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_reorder',
          message: 'Permission denied: Only Host or Moderator can reorder the queue.',
        });
        return;
      }

      ctx.room.reorderQueue(Number(fromIndex), Number(toIndex));
      this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
    });

    socket.on('queue_next', ({ roomId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'queue_next',
          message: 'Permission denied: Only Host or Moderator can skip to next video in queue.',
        });
        return;
      }

      const nextItem = ctx.room.playNextInQueue(ctx.participant.username);
      if (nextItem) {
        this.io.to(ctx.room.roomId).emit('sync_state', ctx.room.getSyncState(ctx.participant.username));
        this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
      }
    });

    socket.on('video_ended', ({ roomId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      // Only authoritative controller triggers auto-advance to prevent multiple triggers
      if (ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        if (ctx.room.queue.length > 0) {
          const nextItem = ctx.room.playNextInQueue('Auto-Play');
          if (nextItem) {
            this.io.to(ctx.room.roomId).emit('sync_state', ctx.room.getSyncState('Auto-Play'));
            this.io.to(ctx.room.roomId).emit('queue_updated', ctx.room.getQueueState());
          }
        }
      }
    });

    // 5. FLOATING LIVE REACTIONS
    socket.on('send_reaction', ({ roomId, emoji } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      const cleanEmoji = String(emoji || '').slice(0, 10);
      if (!cleanEmoji) return;

      this.io.to(ctx.room.roomId).emit('reaction_received', {
        id: crypto.randomUUID(),
        emoji: cleanEmoji,
        username: ctx.participant.username,
        timestamp: Date.now(),
      });
    });

    // 6. ROOM SETTINGS (LOCK & OPEN CONTROLS)
    socket.on('update_room_settings', ({ roomId, isLocked, isOpenControl } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canManageRoom()) {
        socket.emit('permission_denied', {
          action: 'update_room_settings',
          message: 'Permission denied: Only the Host can update room settings.',
        });
        return;
      }

      const settings = ctx.room.updateSettings({ isLocked, isOpenControl });
      this.io.to(ctx.room.roomId).emit('room_settings_updated', settings);
      this.io.to(ctx.room.roomId).emit('sync_state', ctx.room.getSyncState(ctx.participant.username));
    });

    // 7. TELEMETRY PING / PONG
    socket.on('ping_check', ({ timestamp } = {}) => {
      socket.emit('pong_check', {
        clientTimestamp: timestamp || Date.now(),
        serverTimestamp: Date.now(),
      });
    });

    // 8. Request Control / Approval Workflow
    socket.on('request_control', ({ roomId, action, payload, label } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      let processedPayload = payload;
      if (action === 'change_video' && payload?.videoId) {
        const cleanId = extractYouTubeVideoId(payload.videoId);
        if (!cleanId) {
          socket.emit('error', { message: 'Invalid YouTube link for video request' });
          return;
        }
        processedPayload = { ...payload, videoId: cleanId };
      }

      const request = ctx.room.createControlRequest({
        requesterId: ctx.participant.userId,
        requesterName: ctx.participant.username,
        action,
        payload: processedPayload,
        label,
      });

      socket.emit('control_request_submitted', { request });

      this.io.to(ctx.room.roomId).emit('control_requested', {
        request,
        pendingRequests: ctx.room.getPendingRequestsList(),
      });
    });

    socket.on('respond_control', ({ roomId, requestId, approve } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canControlPlayback(ctx.room.isOpenControl)) {
        socket.emit('permission_denied', {
          action: 'respond_control',
          message: 'Permission denied: Only Host or Moderator can resolve participant requests.',
        });
        return;
      }

      try {
        const result = ctx.room.resolveControlRequest(requestId, Boolean(approve));

        this.io.to(ctx.room.roomId).emit('control_request_resolved', {
          requestId,
          approve: Boolean(approve),
          request: result.request,
          pendingRequests: ctx.room.getPendingRequestsList(),
        });

        if (result.syncState) {
          this.io.to(ctx.room.roomId).emit('sync_state', result.syncState);
        }

        if (result.updatedParticipant) {
          this.io.to(ctx.room.roomId).emit('role_assigned', {
            userId: result.updatedParticipant.userId,
            username: result.updatedParticipant.username,
            role: result.updatedParticipant.role,
            participants: ctx.room.getParticipantsList(),
          });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // 9. Host Management Events (Assign Role, Remove Participant, Transfer Host)
    socket.on('assign_role', ({ roomId, userId, role } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canManageRoom()) {
        socket.emit('permission_denied', {
          action: 'assign_role',
          message: 'Permission denied: Only the Host can assign participant roles.',
        });
        return;
      }

      if (userId === ctx.participant.userId) {
        socket.emit('error', { message: 'Cannot re-assign your own Host role. Use transfer host.' });
        return;
      }

      try {
        const updatedParticipant = ctx.room.assignRole(userId, role);
        this.io.to(ctx.room.roomId).emit('role_assigned', {
          userId: updatedParticipant.userId,
          username: updatedParticipant.username,
          role: updatedParticipant.role,
          participants: ctx.room.getParticipantsList(),
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('remove_participant', ({ roomId, userId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canManageRoom()) {
        socket.emit('permission_denied', {
          action: 'remove_participant',
          message: 'Permission denied: Only the Host can kick participants.',
        });
        return;
      }

      if (userId === ctx.participant.userId) {
        socket.emit('error', { message: 'Cannot kick yourself. Use leave room.' });
        return;
      }

      const target = ctx.room.getParticipant(userId);
      if (!target) {
        socket.emit('error', { message: 'Target participant not found in room.' });
        return;
      }

      const targetSocket = this.io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit('kicked', { message: 'You have been removed from the room by the host.' });
        targetSocket.leave(ctx.room.roomId);
        targetSocket.data.roomId = null;
      }

      ctx.room.removeParticipant(userId);

      this.io.to(ctx.room.roomId).emit('participant_removed', {
        userId,
        username: target.username,
        participants: ctx.room.getParticipantsList(),
      });
    });

    socket.on('transfer_host', ({ roomId, userId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      if (!ctx.participant.canManageRoom()) {
        socket.emit('permission_denied', {
          action: 'transfer_host',
          message: 'Permission denied: Only the Host can transfer host privileges.',
        });
        return;
      }

      try {
        const newHost = ctx.room.transferHost(userId);
        this.io.to(ctx.room.roomId).emit('role_assigned', {
          userId: newHost.userId,
          username: newHost.username,
          role: 'host',
          participants: ctx.room.getParticipantsList(),
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // 10. Real-Time Chat
    socket.on('chat_message', ({ roomId, text } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room || !ctx.participant) return;

      const cleanText = String(text || '').trim();
      if (!cleanText) return;

      const message = {
        id: crypto.randomUUID(),
        roomId: ctx.room.roomId,
        userId: ctx.participant.userId,
        username: ctx.participant.username,
        role: ctx.participant.role,
        text: cleanText.slice(0, 500),
        timestamp: Date.now(),
      };

      this.io.to(ctx.room.roomId).emit('chat_message', message);
    });

    // 11. Request Sync
    socket.on('request_sync', ({ roomId } = {}) => {
      const ctx = getContext(roomId);
      if (!ctx || !ctx.room) return;
      socket.emit('sync_state', ctx.room.getSyncState());
      socket.emit('queue_updated', ctx.room.getQueueState());
    });

    // 12. Disconnect with 15-second grace period
    socket.on('disconnect', () => {
      try {
        const room = roomManager.getRoomBySocketId(socket.id);
        if (!room) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant) return;

        const targetUserId = participant.userId;
        const wasHost = participant.role === 'host';

        // 15-second grace period before actual removal and host re-election
        room.scheduleDisconnect(targetUserId, () => {
          room.removeParticipant(targetUserId);

          if (wasHost && !room.isEmpty()) {
            const newHost = room.handleHostDisconnect(targetUserId);
            if (newHost) {
              this.io.to(room.roomId).emit('role_assigned', {
                userId: newHost.userId,
                username: newHost.username,
                role: newHost.role,
                participants: room.getParticipantsList(),
              });
            }
          }

          this.io.to(room.roomId).emit('user_left', {
            username: participant.username,
            userId: targetUserId,
            participants: room.getParticipantsList(),
          });

          roomManager.cleanupIfEmpty(room.roomId);
        }, 15000);
      } catch (err) {
        // Ignore disconnect errors
      }
    });
  }
}
