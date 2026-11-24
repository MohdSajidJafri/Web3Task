import React, { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import { Participant, Role, SyncState, ControlRequest, ChatMessage } from './types';
import { Lobby } from './components/Lobby';
import { RoomHeader } from './components/RoomHeader';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ControlsBar } from './components/ControlsBar';
import { ApprovalBanner } from './components/ApprovalBanner';
import { ParticipantsList } from './components/ParticipantsList';
import { ChatBox } from './components/ChatBox';
import { RequestControlModal } from './components/RequestControlModal';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [currentUserId, setCurrentUserId] = useState(() => {
    let id = localStorage.getItem('watchsync_userid');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('watchsync_userid', id);
    }
    return id;
  });
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState<Role>('participant');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ControlRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Notifications / Toast
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const showNotification = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.msg === msg ? null : curr));
    }, 4000);
  };

  // Check URL query param ?room=CODE
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      console.log('Connected to WebSocket server with socketId:', socket.id);
    });

    socket.on('room_joined', (data: { roomId: string; userId: string; username: string; role: Role }) => {
      setInRoom(true);
      setRoomId(data.roomId);
      setCurrentUserId(data.userId);
      setUsername(data.username);
      setUserRole(data.role);

      // Update URL query param cleanly without reloading
      const newUrl = `${window.location.pathname}?room=${data.roomId}`;
      window.history.replaceState(null, '', newUrl);

      showNotification(`Joined room ${data.roomId} as ${data.role}`, 'success');
    });

    socket.on('user_joined', (data: { username: string; userId: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.userId !== currentUserId) {
        showNotification(`${data.username} joined the party`, 'info');
      }
    });

    socket.on('user_left', (data: { username: string; userId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showNotification(`${data.username} left the room`, 'info');
    });

    socket.on('sync_state', (state: SyncState) => {
      setSyncState(state);
    });

    socket.on('role_assigned', (data: { userId: string; username: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.userId === currentUserId) {
        setUserRole(data.role);
        showNotification(`Your role was updated to: ${data.role}`, 'success');
      } else {
        showNotification(`${data.username} is now a ${data.role}`, 'info');
      }
    });

    socket.on('participant_removed', (data: { userId: string; username: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showNotification(`${data.username} was removed from the party`, 'info');
    });

    socket.on('kicked', (data: { message: string }) => {
      setInRoom(false);
      setRoomId('');
      alert(data.message || 'You have been removed from the room by the host.');
      window.history.replaceState(null, '', window.location.pathname);
    });

    socket.on('control_requested', (data: { request: ControlRequest; pendingRequests: ControlRequest[] }) => {
      setPendingRequests(data.pendingRequests || []);
      showNotification(`${data.request.requesterName} requested: ${data.request.label || data.request.action}`, 'info');
    });

    socket.on('pending_requests_sync', (requests: ControlRequest[]) => {
      setPendingRequests(requests || []);
    });

    socket.on('control_request_resolved', (data: { requestId: string; approve: boolean; request: ControlRequest; pendingRequests: ControlRequest[] }) => {
      setPendingRequests(data.pendingRequests || []);
      showNotification(
        `Request "${data.request?.label || data.request?.action}" was ${data.approve ? 'approved' : 'rejected'}`,
        data.approve ? 'success' : 'info'
      );
    });

    socket.on('chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('permission_denied', (err: { message: string; action?: string }) => {
      showNotification(err.message, 'error');
    });

    socket.on('error', (err: { message: string }) => {
      showNotification(err.message, 'error');
    });

    return () => {
      socket.off('connect');
      socket.off('room_joined');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('sync_state');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('kicked');
      socket.off('control_requested');
      socket.off('pending_requests_sync');
      socket.off('control_request_resolved');
      socket.off('chat_message');
      socket.off('permission_denied');
      socket.off('error');
    };
  }, [currentUserId]);

  const handleJoinOrCreate = (name: string, targetRoomId?: string) => {
    const socket = getSocket();
    setUsername(name);
    socket.emit('join_room', {
      roomId: targetRoomId,
      username: name,
      userId: currentUserId,
    });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId });
    setInRoom(false);
    setRoomId('');
    setParticipants([]);
    setMessages([]);
    setPendingRequests([]);
    setSyncState(null);
    window.history.replaceState(null, '', window.location.pathname);
    showNotification('You left the room', 'info');
  };

  const canControl = userRole === 'host' || userRole === 'moderator';

  if (!inRoom) {
    return (
      <Lobby
        onJoin={handleJoinOrCreate}
        initialRoomCode={initialRoomCode}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed top-16 right-4 z-50 animate-in slide-in-from-top duration-200">
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-medium backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-red-950/90 text-red-200 border-red-800'
                : notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <span>{notification.msg}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <RoomHeader
        roomId={roomId}
        userRole={userRole}
        username={username}
        onLeaveRoom={handleLeaveRoom}
        onNotification={showNotification}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Left Column: Player, Controls, and Approval Banner (70% on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Host/Mod Pending Approval Banner */}
          {canControl && (
            <ApprovalBanner
              roomId={roomId}
              requests={pendingRequests}
              onNotification={showNotification}
            />
          )}

          {/* YouTube Video Player */}
          <YouTubePlayer
            roomId={roomId}
            role={userRole}
            syncState={syncState}
            canControl={canControl}
            onRequestControlOpen={() => setIsRequestModalOpen(true)}
            onNotification={showNotification}
          />

          {/* Controls Bar */}
          <ControlsBar
            roomId={roomId}
            role={userRole}
            syncState={syncState}
            canControl={canControl}
            onRequestControlOpen={() => setIsRequestModalOpen(true)}
            onNotification={showNotification}
          />
        </div>

        {/* Right Column: Participants List & Room Chat (30% on desktop) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[650px] lg:h-auto">
          {/* Top Half: Party Members */}
          <div className="h-64 lg:h-72 shrink-0">
            <ParticipantsList
              roomId={roomId}
              participants={participants}
              currentUserId={currentUserId}
              currentUserRole={userRole}
              onNotification={showNotification}
            />
          </div>

          {/* Bottom Half: Live Chat */}
          <div className="flex-1 min-h-[300px]">
            <ChatBox
              roomId={roomId}
              messages={messages}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      </main>

      {/* Participant Request Control Modal */}
      <RequestControlModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        roomId={roomId}
        onNotification={showNotification}
      />
    </div>
  );
}
