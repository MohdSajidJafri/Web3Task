import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, Shield, Smile, Settings, Pin, Check, X, Users, ChevronRight, ChevronLeft, Clock, Film, ArrowDown, MessageSquare } from 'lucide-react';
import { ChatMessage, ControlRequest, Role, QueueItem, SuggestedItem, Participant } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';
import { QueuePanel } from './QueuePanel';
import { ParticipantsList } from './ParticipantsList';

interface ChatBoxProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: Role;
  pendingRequests: ControlRequest[];
  queue: QueueItem[];
  suggestedQueue: SuggestedItem[];
  currentPlaybackTime: number;
  participants?: Participant[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSeekToTime?: (time: number) => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
  className?: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  messages,
  currentUserId,
  currentUserRole,
  pendingRequests,
  queue,
  suggestedQueue,
  currentPlaybackTime,
  participants = [],
  isCollapsed = false,
  onToggleCollapse,
  onSeekToTime,
  onNotification,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'queue' | 'members'>('chat');
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hasNewQueueItem, setHasNewQueueItem] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLenRef = useRef(messages.length);
  const prevSuggestedLenRef = useRef(suggestedQueue.length);
  const socket = getSocket();

  const canApprove = currentUserRole === 'host' || currentUserRole === 'moderator';

  // Track unread messages when in Queue or Members tab
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      if (activeTab !== 'chat') {
        setUnreadChatCount((prev) => prev + (messages.length - prevMessagesLenRef.current));
      } else if (!isScrolledUp) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, activeTab, isScrolledUp]);

  // Track new suggestions when in Chat or Members tab
  useEffect(() => {
    if (suggestedQueue.length > prevSuggestedLenRef.current) {
      if (activeTab !== 'queue') {
        setHasNewQueueItem(true);
      }
    }
    prevSuggestedLenRef.current = suggestedQueue.length;
  }, [suggestedQueue, activeTab]);

  const handleTabSwitch = (tab: 'chat' | 'queue' | 'members') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else if (tab === 'queue') {
      setHasNewQueueItem(false);
    }
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 60;
    setIsScrolledUp(isUp);
  };

  const scrollToBottom = () => {
    setIsScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('chat_message', {
      roomId,
      text: inputText.trim(),
    });

    setInputText('');
    setShowEmojis(false);
    setIsScrolledUp(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleQuickReaction = (reaction: string) => {
    socket.emit('send_reaction', {
      roomId,
      emoji: reaction,
    });
    socket.emit('chat_message', {
      roomId,
      text: reaction,
    });
  };

  const handleRespondControl = (requestId: string, approve: boolean) => {
    socket.emit('respond_control', {
      roomId,
      requestId,
      approve,
    });
    onNotification?.(
      approve ? 'Request approved!' : 'Request declined.',
      approve ? 'success' : 'info'
    );
  };

  const handleDropTimestamp = () => {
    const formatted = formatTime(currentPlaybackTime);
    setInputText((prev) => `${prev ? prev + ' ' : ''}@${formatted} `);
  };

  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'host':
        return (
          <span title="Host" className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-bold border border-amber-500/30">
            <Crown className="w-2.5 h-2.5 text-amber-400 fill-current" />
            <span>Host</span>
          </span>
        );
      case 'moderator':
        return (
          <span title="Moderator" className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-sky-500/15 text-sky-300 text-[10px] font-bold border border-sky-500/30">
            <Shield className="w-2.5 h-2.5 text-sky-400 fill-current" />
            <span>Mod</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Clickable @MM:SS timestamps
  const renderMessageWithTimestamps = (text: string) => {
    const timestampRegex = /@(\d{1,2}:\d{2}(?::\d{2})?)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timestampRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const timeStr = match[1];
      const seconds = parseTimeToSeconds(timeStr);

      parts.push(
        <button
          key={match.index}
          onClick={() => onSeekToTime && onSeekToTime(seconds)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF5E62]/15 hover:bg-[#FF5E62] text-[#FF9966] hover:text-white border border-[#FF5E62]/30 font-mono font-bold text-[10px] mx-1 transition-all cursor-pointer select-none tabular-nums shadow-sm"
          title={`Seek video to ${timeStr}`}
        >
          <Clock className="w-2.5 h-2.5" />
          <span>{timeStr}</span>
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const quickEmojis = ['🔥', '😂', '😱', '💜', '👏', '🎉', '👀'];

  if (isCollapsed) {
    return (
      <aside className="w-[56px] bg-[#1B1D24] border-l border-white/[0.08] flex flex-col items-center py-4 justify-between select-none shrink-0 shadow-xl">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-zinc-400 hover:text-white hover:bg-[#242731] rounded-xl transition-colors"
          title="Expand Social Sidebar (C)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase text-zinc-400 tracking-widest py-4">
          LIVE CHAT
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-[#2EE59D] animate-pulse" />
      </aside>
    );
  }

  return (
    <aside className={`${className || 'w-[360px] lg:w-[380px]'} bg-[#1B1D24] border-l border-white/[0.08] flex flex-col h-full overflow-hidden select-none shrink-0 relative shadow-2xl`}>
      {/* Top 3-Tab Switcher (Chat | Queue | Members) - Matches Reference Board */}
      <div className="h-12 px-3 border-b border-white/[0.08] flex items-center justify-between text-xs shrink-0 bg-[#1B1D24]">
        <div className="flex items-center gap-1 bg-[#242731] p-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={() => handleTabSwitch('chat')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all relative flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white shadow-md shadow-[#FF5E62]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Live Chat</span>
            {unreadChatCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleTabSwitch('queue')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 relative ${
              activeTab === 'queue'
                ? 'bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white shadow-md shadow-[#FF5E62]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Queue</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
              activeTab === 'queue' ? 'bg-black/30 text-white' : 'bg-[#1B1D24] text-zinc-400'
            }`}>
              {queue.length}
            </span>
            {hasNewQueueItem && (
              <span className="w-2 h-2 rounded-full bg-[#2EE59D] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleTabSwitch('members')}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 relative ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white shadow-md shadow-[#FF5E62]/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Members</span>
            {participants.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold tabular-nums ${
                activeTab === 'members' ? 'bg-black/30 text-white' : 'bg-[#1B1D24] text-zinc-400'
              }`}>
                {participants.length}
              </span>
            )}
          </button>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#242731] rounded-xl transition-colors"
            title="Collapse chat (C)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tab 2: Queue */}
      {activeTab === 'queue' && (
        <QueuePanel
          roomId={roomId}
          queue={queue}
          suggestedQueue={suggestedQueue}
          currentUserRole={currentUserRole}
          canControl={canApprove}
          onNotification={onNotification}
        />
      )}

      {/* Tab 3: Members */}
      {activeTab === 'members' && (
        <div className="flex-1 overflow-hidden">
          <ParticipantsList
            roomId={roomId}
            participants={participants}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            pendingRequests={pendingRequests}
            isCollapsed={false}
            onToggleCollapse={() => {}}
            onNotification={onNotification}
            className="w-full h-full border-none"
          />
        </div>
      )}

      {/* Tab 1: Live Chat */}
      {activeTab === 'chat' && (
        <>
          {/* Chat Messages Feed with onScroll */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs font-sans relative no-scrollbar"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-[#FF5E62]/20 to-[#FF9966]/20 border border-[#FF5E62]/30 flex items-center justify-center text-xl shadow-lg">
                  🔥
                </div>
                <p className="text-sm font-bold text-white">Live Stream Chat</p>
                <p className="text-xs text-zinc-400 max-w-xs">Chat in real-time, react with floating emojis, and share video timestamps!</p>
              </div>
            ) : (
              messages.map((m) => {
                const userColor = getTwitchUserColor(m.username);
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                });

                return (
                  <div key={m.id} className="flex items-start gap-2.5 group hover:bg-[#242731]/40 -mx-2 px-2 py-1.5 rounded-xl transition-all">
                    {/* User Avatar Circle with color & initial */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-md"
                      style={{ backgroundColor: userColor }}
                    >
                      {m.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Name, Role Badge & Timestamp */}
                      <div className="flex items-center gap-1.5 leading-none">
                        <span
                          className="font-bold text-xs hover:underline cursor-pointer"
                          style={{ color: userColor }}
                        >
                          {m.username}
                        </span>
                        {renderRoleBadge(m.role)}
                        <span className="text-zinc-500 text-[10px] font-mono tabular-nums ml-auto">
                          {timeStr}
                        </span>
                      </div>

                      {/* Message Text with Timestamps */}
                      <div className="text-zinc-200 text-xs leading-relaxed break-words">
                        {renderMessageWithTimestamps(m.text)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Floating Pill: Auto-scroll paused when user scrolls up */}
          {isScrolledUp && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>New messages below</span>
            </button>
          )}

          {/* Pinned Control Request Card (Host/Mod view) - Matching Reference Blueprint */}
          {canApprove && pendingRequests.length > 0 && (
            <div className="px-3 pt-2 shrink-0">
              <div className="bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-200 flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Control Request</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {pendingRequests.length} pending
                  </span>
                </div>

                {pendingRequests.slice(0, 1).map((req) => (
                  <div key={req.requestId} className="space-y-2.5">
                    <p className="text-xs text-zinc-300">
                      <strong className="text-white">{req.requesterName}</strong> is requesting playback control.
                    </p>

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => handleRespondControl(req.requestId, true)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-[#2EE59D] hover:bg-[#25C786] text-black font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRespondControl(req.requestId, false)}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Reaction Emoji Strip */}
          <div className="px-3 py-2 bg-[#1B1D24] border-t border-white/[0.08] flex items-center justify-between gap-1 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1 shrink-0">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(emoji)}
                  className="px-2 py-1 rounded-xl bg-[#242731] hover:bg-[#2C303D] hover:scale-125 active:scale-95 text-xs transition-all shrink-0 shadow-sm"
                  title={`Send live reaction ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Drop Current Playback Timestamp Button */}
            <button
              onClick={handleDropTimestamp}
              className="px-2.5 py-1 rounded-xl bg-[#242731] hover:bg-[#2C303D] text-[#FF9966] hover:text-white text-[11px] font-mono font-bold flex items-center gap-1.5 border border-white/[0.08] shrink-0 transition-colors tabular-nums"
              title="Insert current video timestamp into chat"
            >
              <Clock className="w-3 h-3 text-[#FF5E62]" />
              <span>@{formatTime(currentPlaybackTime)}</span>
            </button>
          </div>

          {/* Bottom Chat Composer (Discord Style) */}
          <form onSubmit={handleSend} className="p-3 bg-[#1B1D24] border-t border-white/[0.08] flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Send a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={500}
                className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#131419] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowEmojis(!showEmojis)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md shadow-[#FF5E62]/20 transition-all flex items-center gap-1 shrink-0"
            >
              <span>Send</span>
            </button>
          </form>
        </>
      )}
    </aside>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}
