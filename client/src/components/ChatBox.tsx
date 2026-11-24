import React, { useState, useEffect, useRef } from 'react';
import { Send, Crown, Shield, Smile, Settings, Pin, Check, X, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import { ChatMessage, ControlRequest, Role } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';

interface ChatBoxProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
  currentUserRole: Role;
  pendingRequests: ControlRequest[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  roomId,
  messages,
  currentUserId,
  currentUserRole,
  pendingRequests,
  isCollapsed = false,
  onToggleCollapse,
  onNotification,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  const canApprove = currentUserRole === 'host' || currentUserRole === 'moderator';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('chat_message', {
      roomId,
      text: inputText.trim(),
    });

    setInputText('');
    setShowEmojis(false);
  };

  const handleQuickReaction = (reaction: string) => {
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

  const quickEmojis = ['🔥', '😂', '👏', '💜', 'GG', '🎉', '👀', '💯'];

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
    <aside className="w-[340px] bg-[#18181B] border-l border-[#2F2F35] flex flex-col h-full overflow-hidden select-none shrink-0">
      {/* Top Header */}
      <div className="h-10 px-3 border-b border-[#2F2F35] flex items-center justify-between text-xs shrink-0">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] rounded transition-colors"
            title="Collapse chat"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <h3 className="font-bold text-[12px] text-white uppercase tracking-wider mx-auto">
          STREAM CHAT
        </h3>

        <button className="p-1 text-[#ADADB8] hover:text-white rounded transition-colors">
          <Users className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pinned Approval Request Box (Twitch Theater Style from Reference) */}
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

      {/* Chat Messages Feed */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs font-sans">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#ADADB8] space-y-1">
            <span className="text-lg">💜</span>
            <p className="text-xs font-semibold text-white">Welcome to the stream chat!</p>
            <p className="text-[11px]">Say hello and chat with other party members in sync.</p>
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
                <span className="text-[#71717A] text-[10px] font-mono mr-1.5 select-none">
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

                {/* Message Body */}
                <span className="text-[#EFEFF1] text-xs selection:bg-[#9146FF]">
                  {m.text}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reactions Shelf */}
      <div className="px-3 py-1.5 bg-[#18181B] border-t border-[#2F2F35] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] text-[#ADADB8] font-bold uppercase shrink-0 mr-1">
          React:
        </span>
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleQuickReaction(emoji)}
            className="px-1.5 py-0.5 rounded bg-[#1F1F23] hover:bg-[#26262C] hover:scale-110 active:scale-95 text-xs transition-all shrink-0"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Bottom Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-[#18181B] border-t border-[#2F2F35] space-y-2 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder="Send a message"
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
            className="px-3 py-1.5 bg-[#9146FF] hover:bg-[#772CE8] active:bg-[#5C16C5] disabled:opacity-40 disabled:hover:bg-[#9146FF] text-white rounded font-bold text-xs shadow-md transition-all flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        </div>
      </form>
    </aside>
  );
};
