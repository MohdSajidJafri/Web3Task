import React, { useState, useEffect } from 'react';
import { getSocket } from './services/socket';
import { Participant, Role, SyncState, ControlRequest, ChatMessage } from './types';
import { Lobby } from './components/Lobby';
import { RoomHeader } from './components/RoomHeader';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ParticipantsList } from './components/ParticipantsList';
import { ChatBox } from './components/ChatBox';
import { RequestControlModal } from './components/RequestControlModal';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

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
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('watchsync_username') || 'Viewer';
  });
  const [userRole, setUserRole] = useState<Role>('participant');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ControlRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Bottom-right Toast Notifications
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
      console.log('Connected to WebSocket server:', socket.id);
    });

    socket.on('room_joined', (data: { roomId: string; userId: string; username: string; role: Role }) => {
      setInRoom(true);
      setRoomId(data.roomId);
      setCurrentUserId(data.userId);
      setUsername(data.username);
      setUserRole(data.role);

      const newUrl = `${window.location.pathname}?room=${data.roomId}`;
      window.history.replaceState(null, '', newUrl);

      showNotification(`Joined party ${data.roomId} as ${data.role.toUpperCase()}`, 'success');
    });

    socket.on('user_joined', (data: { username: string; userId: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.userId !== currentUserId) {
        showNotification(`${data.username} joined the party`, 'info');
      }
    });

    socket.on('user_left', (data: { username: string; userId: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showNotification(`${data.username} left the party`, 'info');
    });

    socket.on('sync_state', (state: SyncState) => {
      setSyncState(state);
    });

    socket.on('role_assigned', (data: { userId: string; username: string; role: Role; participants: Participant[] }) => {
      setParticipants(data.participants);
      if (data.userId === currentUserId) {
        setUserRole(data.role);
        showNotification(`You were assigned role: ${data.role.toUpperCase()}`, 'success');
      } else {
        showNotification(`${data.username} is now ${data.role.toUpperCase()}`, 'info');
      }
    });

    socket.on('participant_removed', (data: { userId: string; username: string; participants: Participant[] }) => {
      setParticipants(data.participants);
      showNotification(`${data.username} was removed from party`, 'info');
    });

    socket.on('kicked', (data: { message: string }) => {
      setInRoom(false);
      setRoomId('');
      alert(data.message || 'You have been removed from the room by the host.');
      window.history.replaceState(null, '', window.location.pathname);
    });

    socket.on('control_requested', (data: { request: ControlRequest; pendingRequests: ControlRequest[] }) => {
      setPendingRequests(data.pendingRequests || []);
      showNotification(
        `${data.request.requesterName} requested: ${data.request.label || data.request.action}`,
        'info'
      );
    });

    socket.on('pending_requests_sync', (requests: ControlRequest[]) => {
      setPendingRequests(requests || []);
    });

    socket.on('control_request_resolved', (data: { requestId: string; approve: boolean; request: ControlRequest; pendingRequests: ControlRequest[] }) => {
      setPendingRequests(data.pendingRequests || []);
      showNotification(
        `Request "${data.request?.label || data.request?.action}" ${data.approve ? 'APPROVED' : 'DENIED'}`,
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
    showNotification('You left the party', 'info');
  };

  const canControl = userRole === 'host' || userRole === 'moderator';

  // Find host participant name
  const hostParticipant = participants.find((p) => p.role === 'host');
  const hostName = hostParticipant ? hostParticipant.username : 'Host';

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0E0E10] text-[#EFEFF1] font-sans overflow-hidden">
      {/* 1. Twitch Top Navigation Bar (50px fixed) */}
      <RoomHeader
        roomId={roomId}
        userRole={userRole}
        username={username}
        inRoom={inRoom}
        canControl={canControl}
        onLeaveRoom={handleLeaveRoom}
        onRequestControlOpen={() => setIsRequestModalOpen(true)}
        onNotification={showNotification}
      />

      {/* 2. Main Content View */}
      {!inRoom ? (
        <Lobby onJoin={handleJoinOrCreate} initialRoomCode={initialRoomCode} />
      ) : (
        /* 3-Column Twitch Theater Layout */
        <div className="h-[calc(100vh-50px)] w-full flex flex-col lg:flex-row overflow-hidden">
          {/* Column 1: Left Party Members Rail */}
          <ParticipantsList
            roomId={roomId}
            participants={participants}
            currentUserId={currentUserId}
            currentUserRole={userRole}
            isCollapsed={isLeftRailCollapsed}
            onToggleCollapse={() => setIsLeftRailCollapsed(!isLeftRailCollapsed)}
            onNotification={showNotification}
          />

          {/* Column 2: Center Stage Video Theater & Controls */}
          <main className="flex-1 h-full overflow-y-auto bg-[#0E0E10] flex flex-col no-scrollbar">
            <YouTubePlayer
              roomId={roomId}
              role={userRole}
              syncState={syncState}
              canControl={canControl}
              hostName={hostName}
              viewerCount={participants.length}
              onRequestControlOpen={() => setIsRequestModalOpen(true)}
              onNotification={showNotification}
            />
          </main>

          {/* Column 3: Right Twitch Stream Chat */}
          <ChatBox
            roomId={roomId}
            messages={messages}
            currentUserId={currentUserId}
            currentUserRole={userRole}
            pendingRequests={pendingRequests}
            isCollapsed={isChatCollapsed}
            onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
            onNotification={showNotification}
          />
        </div>
      )}

      {/* Request Action / Control Modal for Participants */}
      <RequestControlModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        roomId={roomId}
        onNotification={showNotification}
      />

      {/* Toast Notification (Bottom-Right Corner) */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-2xl text-xs font-semibold backdrop-blur-md bg-[#18181B] ${
              notification.type === 'error'
                ? 'border-[#EB0400] text-[#FF4A4A]'
                : notification.type === 'success'
                ? 'border-[#00F593] text-[#00F593]'
                : 'border-[#9146FF] text-[#BF94FF]'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#EB0400] shrink-0" />
            ) : notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-[#00F593] shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-[#BF94FF] shrink-0" />
            )}
            <span>{notification.msg}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-[#ADADB8] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
