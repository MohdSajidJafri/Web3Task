import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, Shield, Smile, Settings, Pin, Check, X, Users, ChevronRight, ChevronLeft, Clock, Film, ArrowDown } from 'lucide-react';
import { ChatMessage, ControlRequest, Role, QueueItem, SuggestedItem } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';
import { QueuePanel } from './QueuePanel';

interface ChatBoxProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: Role;
  pendingRequests: ControlRequest[];
  queue: QueueItem[];
  suggestedQueue: SuggestedItem[];
  currentPlaybackTime: number;
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
  isCollapsed = false,
  onToggleCollapse,
  onSeekToTime,
  onNotification,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'queue'>('chat');
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

  // Track unread messages when in Queue tab
  useEffect(() => {
    if (messages.length > prevMessagesLenRef.current) {
      if (activeTab === 'queue') {
        setUnreadChatCount((prev) => prev + (messages.length - prevMessagesLenRef.current));
      } else if (!isScrolledUp) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, activeTab, isScrolledUp]);

  // Track new suggestions when in Chat tab
  useEffect(() => {
    if (suggestedQueue.length > prevSuggestedLenRef.current) {
      if (activeTab === 'chat') {
        setHasNewQueueItem(true);
      }
    }
    prevSuggestedLenRef.current = suggestedQueue.length;
  }, [suggestedQueue, activeTab]);

  const handleTabSwitch = (tab: 'chat' | 'queue') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } else {
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
      approve ? 'Request approved!' : 'Request denied.',
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
          <span title="Host">
            <Crown className="w-3.5 h-3.5 text-[#FFD700] fill-current shrink-0" />
          </span>
        );
      case 'moderator':
        return (
          <span title="Moderator">
            <svg className="w-3.5 h-3.5 text-[#00AD03] fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M14.5 2.5L12 5l2 2 4-4-3.5-0.5zm-5 5L3 14l3.5 3.5 6.5-6.5-3.5-3.5zM2 20l2 2 4.5-4.5-2-2L2 20zm14-11l-1.5-1.5 4.5-4.5 1.5 1.5-4.5 4.5z" />
            </svg>
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
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#9146FF]/30 hover:bg-[#9146FF] text-[#BF94FF] hover:text-white font-mono font-bold text-[10px] mx-0.5 transition-colors cursor-pointer select-none tabular-nums"
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

  const quickEmojis = ['🔥', '😂', '😱', '💜', '👏', 'GG', '🎉', '👀'];

  if (isCollapsed) {
    return (
      <aside className="w-[50px] bg-[#18181B] border-l border-[#2F2F35] flex flex-col items-center py-3 justify-between select-none shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] rounded transition-colors"
          title="Expand Stream Chat"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase text-[#ADADB8] tracking-widest py-4">
          STREAM CHAT
        </span>
        <div className="w-2 h-2 rounded-full bg-[#00F593]" />
      </aside>
    );
  }

  return (
    <aside className={`${className || 'w-[340px]'} bg-[#18181B] border-l border-[#2F2F35] flex flex-col h-full overflow-hidden select-none shrink-0 relative`}>
      {/* Top Header Switcher (Chat vs Queue) with Badges */}
      <div className="h-10 px-2 border-b border-[#2F2F35] flex items-center justify-between text-xs shrink-0 bg-[#18181B]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleTabSwitch('chat')}
            className={`px-3 py-1.5 rounded font-bold text-[11px] uppercase tracking-wider transition-colors relative flex items-center gap-1 ${
              activeTab === 'chat'
                ? 'bg-[#1F1F23] text-white border-b-2 border-[#9146FF]'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <span>Stream Chat</span>
            {unreadChatCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#9146FF] animate-pulse" />
            )}
          </button>

          <button
            onClick={() => handleTabSwitch('queue')}
            className={`px-3 py-1.5 rounded font-bold text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1 relative ${
              activeTab === 'queue'
                ? 'bg-[#1F1F23] text-white border-b-2 border-[#9146FF]'
                : 'text-[#ADADB8] hover:text-white'
            }`}
          >
            <span>Queue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-[#9146FF]/30 text-[#BF94FF] text-[9px] font-mono font-bold tabular-nums">
              {queue.length}
            </span>
            {hasNewQueueItem && (
              <span className="w-2 h-2 rounded-full bg-[#00F593] animate-pulse" />
            )}
          </button>
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] rounded transition-colors"
            title="Collapse chat (C)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Render Active Tab */}
      {activeTab === 'queue' ? (
        <QueuePanel
          roomId={roomId}
          queue={queue}
          suggestedQueue={suggestedQueue}
          currentUserRole={currentUserRole}
          canControl={canApprove}
          onNotification={onNotification}
        />
      ) : (
        <>
          {/* Pinned Approval Request Box */}
          {canApprove && pendingRequests.length > 0 && (
            <div className="p-2.5 bg-[#1F1F23] border-b border-[#2F2F35] space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#BF94FF] font-bold text-[11px] uppercase tracking-wider">
                  <Pin className="w-3.5 h-3.5 text-[#9146FF] fill-current" />
                  <span>Control Request ({pendingRequests.length})</span>
                </div>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="bg-[#26262C] border-l-2 border-[#9146FF] rounded-r p-2 space-y-1.5"
                  >
                    <p className="text-xs text-white">
                      <span className="font-bold text-[#FFD700]">{req.requesterName}</span>{' '}
                      <span className="text-[#ADADB8]">wants to:</span>{' '}
                      <span className="font-semibold text-white">{req.label || req.action}</span>
                    </p>

                    {req.action === 'change_video' && req.payload?.videoId && (
                      <p className="text-[10px] font-mono text-[#BF94FF] truncate">
                        Video: {req.payload.videoId}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        onClick={() => handleRespondControl(req.requestId, true)}
                        className="flex-1 py-1 px-2 rounded bg-[#00AD03] hover:bg-[#008A02] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleRespondControl(req.requestId, false)}
                        className="flex-1 py-1 px-2 rounded bg-[#EB0400] hover:bg-[#C90300] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        <span>Deny</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages Feed with onScroll */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans relative"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#ADADB8] space-y-1">
                <span className="text-lg">💜</span>
                <p className="text-xs font-semibold text-white">Welcome to the stream chat!</p>
                <p className="text-[11px]">Chat with party members in sync and react with live emojis.</p>
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
                  <div key={m.id} className="leading-relaxed hover:bg-[#1F1F23]/60 -mx-2 px-2 py-0.5 rounded transition-colors break-words">
                    {/* Time */}
                    <span className="text-[#71717A] text-[10px] font-mono mr-1.5 select-none tabular-nums">
                      {timeStr}
                    </span>

                    {/* Role Badge (Crown / Sword) */}
                    <span className="inline-flex items-center align-middle mr-1">
                      {renderRoleBadge(m.role)}
                    </span>

                    {/* Username */}
                    <span
                      className="font-bold mr-1.5 hover:underline cursor-pointer"
                      style={{ color: userColor }}
                    >
                      {m.username}:
                    </span>

                    {/* Message Body with Clickable Timestamps */}
                    <span className="text-[#EFEFF1] text-xs selection:bg-[#9146FF]">
                      {renderMessageWithTimestamps(m.text)}
                    </span>
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
              className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-[#9146FF] hover:bg-[#772CE8] text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>More messages below</span>
            </button>
          )}

          {/* Quick Reactions Shelf */}
          <div className="px-3 py-1.5 bg-[#18181B] border-t border-[#2F2F35] flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-[#ADADB8] font-bold uppercase shrink-0 mr-0.5">
                React:
              </span>
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(emoji)}
                  className="px-1.5 py-0.5 rounded bg-[#1F1F23] hover:bg-[#26262C] hover:scale-125 active:scale-95 text-xs transition-all shrink-0"
                  title={`Send live reaction ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Drop Current Playback Timestamp Button */}
            <button
              onClick={handleDropTimestamp}
              className="px-2 py-0.5 rounded bg-[#1F1F23] hover:bg-[#9146FF]/30 text-[#BF94FF] text-[10px] font-mono font-bold flex items-center gap-1 border border-[#2F2F35] shrink-0 transition-colors tabular-nums"
              title="Insert current video timestamp into chat"
            >
              <Clock className="w-3 h-3" />
              <span>@{formatTime(currentPlaybackTime)}</span>
            </button>
          </div>

          {/* Bottom Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-[#18181B] border-t border-[#2F2F35] space-y-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Send a message (e.g. Look at @02:15)"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={500}
                className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-[#ADADB8]">
                <button
                  type="button"
                  onClick={() => setShowEmojis(!showEmojis)}
                  className="p-1 hover:text-white rounded hover:bg-[#1F1F23] transition-colors"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-1 hover:text-white rounded hover:bg-[#1F1F23] transition-colors"
                  title="Chat Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-1.5 bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] disabled:opacity-40 text-white rounded font-bold text-xs shadow-md transition-all flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            </div>
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
