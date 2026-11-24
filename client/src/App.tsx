import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './services/socket';
import { Participant, Role, SyncState, ControlRequest, ChatMessage, QueueItem, SuggestedItem, LiveReaction } from './types';
import { Lobby } from './components/Lobby';
import { RoomHeader } from './components/RoomHeader';
import { YouTubePlayer } from './components/YouTubePlayer';
import { ParticipantsList } from './components/ParticipantsList';
import { ChatBox } from './components/ChatBox';
import { RequestControlModal } from './components/RequestControlModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { AlertCircle, CheckCircle, Info, X, Users, MessageSquare, PlaySquare } from 'lucide-react';

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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [suggestedQueue, setSuggestedQueue] = useState<SuggestedItem[]>([]);
  const [reactions, setReactions] = useState<LiveReaction[]>([]);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isOpenControl, setIsOpenControl] = useState<boolean>(false);
  const [pingMs, setPingMs] = useState<number>(24);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'chat' | 'members'>('chat');

  // Bottom-right Toast Notifications
  const [notification, setNotification] = useState<{
    msg: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  const showNotification = useCallback((msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.msg === msg ? null : curr));
    }, 4000);
  }, []);

  // Check URL query param ?room=CODE
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setInitialRoomCode(code.toUpperCase());
    }
  }, []);

  // 1. Session Reconnection check on load (sessionStorage)
  useEffect(() => {
    try {
      const storedSession = sessionStorage.getItem('watchsync_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session && session.roomId && session.userId) {
          console.log('[Session] Reconnecting to existing party session:', session.roomId);
          setCurrentUserId(session.userId);
          setUsername(session.username || 'Viewer');
          const socket = getSocket();
          socket.emit('join_room', {
            roomId: session.roomId,
            username: session.username || 'Viewer',
            userId: session.userId,
          });
        }
      }
    } catch (e) {
      // Ignore parse error
    }
  }, []);

  // 2. Telemetry Ping-Pong Heartbeat every 10 seconds
  useEffect(() => {
    if (!inRoom) return;
    const socket = getSocket();

    const interval = setInterval(() => {
      socket.emit('ping_check', { timestamp: Date.now() });
    }, 10000);

    return () => clearInterval(interval);
  }, [inRoom]);

  // 3. Socket event listeners
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      console.log('Connected to WebSocket server:', socket.id);
    });

    socket.on('room_joined', (data: {
      roomId: string;
      userId: string;
      username: string;
      role: Role;
      isLocked?: boolean;
      isOpenControl?: boolean;
    }) => {
      setInRoom(true);
      setRoomId(data.roomId);
      setCurrentUserId(data.userId);
      setUsername(data.username);
      setUserRole(data.role);
      if (typeof data.isLocked === 'boolean') setIsLocked(data.isLocked);
      if (typeof data.isOpenControl === 'boolean') setIsOpenControl(data.isOpenControl);

      // Persist in sessionStorage for page refreshes
      sessionStorage.setItem(
        'watchsync_session',
        JSON.stringify({
          roomId: data.roomId,
          userId: data.userId,
          username: data.username,
        })
      );

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
      if (typeof state.isLocked === 'boolean') setIsLocked(state.isLocked);
      if (typeof state.isOpenControl === 'boolean') setIsOpenControl(state.isOpenControl);
    });

    socket.on('queue_updated', (data: { queue: QueueItem[]; suggestedQueue: SuggestedItem[] }) => {
      setQueue(data.queue || []);
      setSuggestedQueue(data.suggestedQueue || []);
    });

    socket.on('reaction_received', (reaction: LiveReaction) => {
      setReactions((prev) => [...prev, reaction]);
      // Auto cleanup reaction after 3 seconds
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    });

    socket.on('room_settings_updated', (settings: { isLocked: boolean; isOpenControl: boolean }) => {
      if (typeof settings.isLocked === 'boolean') setIsLocked(settings.isLocked);
      if (typeof settings.isOpenControl === 'boolean') setIsOpenControl(settings.isOpenControl);
      showNotification(
        `Room settings updated: ${settings.isLocked ? 'Locked' : 'Unlocked'}, ${
          settings.isOpenControl ? 'Open Controls' : 'Restricted Controls'
        }`,
        'info'
      );
    });

    socket.on('pong_check', (data: { clientTimestamp: number; serverTimestamp: number }) => {
      const roundTrip = Math.max(1, Date.now() - (data.clientTimestamp || Date.now()));
      setPingMs(roundTrip);
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
      sessionStorage.removeItem('watchsync_session');
      setInRoom(false);
      setRoomId('');
      alert(data.message || 'You have been removed from the room by the host.');
      window.history.replaceState(null, '', window.location.pathname);
    });

    socket.on('room_error', (err: { message: string }) => {
      showNotification(err.message, 'error');
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
      socket.off('queue_updated');
      socket.off('reaction_received');
      socket.off('room_settings_updated');
      socket.off('pong_check');
      socket.off('role_assigned');
      socket.off('participant_removed');
      socket.off('kicked');
      socket.off('room_error');
      socket.off('control_requested');
      socket.off('pending_requests_sync');
      socket.off('control_request_resolved');
      socket.off('chat_message');
      socket.off('permission_denied');
      socket.off('error');
    };
  }, [currentUserId, showNotification]);

  const canControl = userRole === 'host' || userRole === 'moderator' || isOpenControl;

  // 4. Global Keyboard Shortcuts
  useEffect(() => {
    if (!inRoom) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return; // Don't trigger shortcuts while user is typing in chat or input
      }

      const socket = getSocket();

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (canControl) {
          const isPlaying = syncState?.playState === 'playing';
          if (isPlaying) {
            socket.emit('pause', { roomId, currentTime: currentPlaybackTime });
          } else {
            socket.emit('play', { roomId, currentTime: currentPlaybackTime });
          }
        } else {
          setIsRequestModalOpen(true);
        }
      }

      // ArrowLeft: Seek -5s
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (canControl) {
          const target = Math.max(0, currentPlaybackTime - 5);
          socket.emit('seek', { roomId, time: target });
        }
      }

      // ArrowRight: Seek +5s
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (canControl) {
          const target = currentPlaybackTime + 5;
          socket.emit('seek', { roomId, time: target });
        }
      }

      // KeyF: Fullscreen
      if (e.code === 'KeyF') {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }

      // KeyC: Toggle Chat Collapse
      if (e.code === 'KeyC') {
        e.preventDefault();
        setIsChatCollapsed((prev) => !prev);
      }

      // Question Mark (?): Toggle Keyboard Shortcuts Modal
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inRoom, canControl, syncState, currentPlaybackTime, roomId]);

  const handleJoinOrCreate = (name: string, targetRoomId?: string, initialVideoId?: string) => {
    const socket = getSocket();
    setUsername(name);
    socket.emit('join_room', {
      roomId: targetRoomId,
      username: name,
      userId: currentUserId,
      initialVideoId,
    });
  };

  const handleLeaveRoom = () => {
    const socket = getSocket();
    socket.emit('leave_room', { roomId });
    sessionStorage.removeItem('watchsync_session');
    setInRoom(false);
    setRoomId('');
    setParticipants([]);
    setMessages([]);
    setPendingRequests([]);
    setQueue([]);
    setSuggestedQueue([]);
    setSyncState(null);
    window.history.replaceState(null, '', window.location.pathname);
    showNotification('You left the party', 'info');
  };

  const handleSeekToTime = (timeInSeconds: number) => {
    const socket = getSocket();
    if (canControl) {
      socket.emit('seek', { roomId, time: timeInSeconds });
      showNotification(`Seeking to timestamp: ${timeInSeconds}s`, 'info');
    } else {
      socket.emit('request_control', {
        roomId,
        action: 'seek',
        payload: { time: timeInSeconds },
        label: `Seek to timestamp ${timeInSeconds}s`,
      });
      showNotification(`Submitted seek request to Host`, 'info');
    }
  };

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
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onNotification={showNotification}
      />

      {/* 2. Main Content View */}
      {!inRoom ? (
        <Lobby onJoin={handleJoinOrCreate} initialRoomCode={initialRoomCode} />
      ) : (
        /* Theater Layout: Desktop 3-Column, Mobile Stacked with Tab Bar */
        <div className="h-[calc(100vh-50px)] w-full flex flex-col lg:flex-row overflow-hidden">
          {/* Desktop Column 1: Left Party Members Rail */}
          <div className="hidden lg:flex h-full shrink-0">
            <ParticipantsList
              roomId={roomId}
              participants={participants}
              currentUserId={currentUserId}
              currentUserRole={userRole}
              isCollapsed={isLeftRailCollapsed}
              onToggleCollapse={() => setIsLeftRailCollapsed(!isLeftRailCollapsed)}
              onNotification={showNotification}
            />
          </div>

          {/* Column 2: Center Stage Video Theater & Controls */}
          <main className="flex-1 h-full overflow-y-auto bg-[#0E0E10] flex flex-col no-scrollbar min-w-0">
            <YouTubePlayer
              roomId={roomId}
              role={userRole}
              syncState={syncState}
              canControl={canControl}
              hostName={hostName}
              viewerCount={participants.length}
              reactions={reactions}
              pingMs={pingMs}
              isLocked={isLocked}
              isOpenControl={isOpenControl}
              onRequestControlOpen={() => setIsRequestModalOpen(true)}
              onPlaybackTimeUpdate={setCurrentPlaybackTime}
              onNotification={showNotification}
            />

            {/* Mobile / Tablet Tabbed Lower Area (visible only below lg breakpoint) */}
            <div className="lg:hidden flex flex-col border-t border-[#2F2F35] bg-[#18181B] flex-1 min-h-[350px]">
              {/* Mobile Tab Header */}
              <div className="flex border-b border-[#2F2F35] bg-[#18181B] px-2 shrink-0">
                <button
                  onClick={() => setMobileTab('chat')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    mobileTab === 'chat'
                      ? 'border-[#9146FF] text-white bg-[#1F1F23]/60'
                      : 'border-transparent text-[#ADADB8] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-[#BF94FF]" />
                  <span>Chat & Queue</span>
                  {queue.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#9146FF] text-white font-bold">
                      {queue.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setMobileTab('members')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
                    mobileTab === 'members'
                      ? 'border-[#9146FF] text-white bg-[#1F1F23]/60'
                      : 'border-transparent text-[#ADADB8] hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#00F593]" />
                  <span>Members ({participants.length})</span>
                </button>
              </div>

              {/* Mobile Tab Content */}
              <div className="flex-1 overflow-hidden min-h-[300px]">
                {mobileTab === 'chat' ? (
                  <ChatBox
                    roomId={roomId}
                    messages={messages}
                    currentUserId={currentUserId}
                    currentUserRole={userRole}
                    pendingRequests={pendingRequests}
                    queue={queue}
                    suggestedQueue={suggestedQueue}
                    currentPlaybackTime={currentPlaybackTime}
                    isCollapsed={false}
                    onSeekToTime={handleSeekToTime}
                    onNotification={showNotification}
                    className="w-full h-full border-none"
                  />
                ) : (
                  <ParticipantsList
                    roomId={roomId}
                    participants={participants}
                    currentUserId={currentUserId}
                    currentUserRole={userRole}
                    isCollapsed={false}
                    onToggleCollapse={() => {}}
                    onNotification={showNotification}
                    className="w-full h-full border-none"
                  />
                )}
              </div>
            </div>
          </main>

          {/* Desktop Column 3: Right Twitch Stream Chat & Video Queue */}
          <div className="hidden lg:flex h-full shrink-0">
            <ChatBox
              roomId={roomId}
              messages={messages}
              currentUserId={currentUserId}
              currentUserRole={userRole}
              pendingRequests={pendingRequests}
              queue={queue}
              suggestedQueue={suggestedQueue}
              currentPlaybackTime={currentPlaybackTime}
              isCollapsed={isChatCollapsed}
              onToggleCollapse={() => setIsChatCollapsed(!isChatCollapsed)}
              onSeekToTime={handleSeekToTime}
              onNotification={showNotification}
            />
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

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
