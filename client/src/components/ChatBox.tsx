import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Crown, Shield, User } from 'lucide-react';
import { ChatMessage, Role } from '../types';
import { getSocket } from '../services/socket';

interface ChatBoxProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ roomId, messages, currentUserId }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

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
  };

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'host':
        return <Crown className="w-3 h-3 text-amber-400" />;
      case 'moderator':
        return <Shield className="w-3 h-3 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-200">Room Chat</h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
            No messages yet. Say hello to the party!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div
                key={m.id}
                className={`flex flex-col text-xs space-y-1 ${
                  isMe ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">{m.username}</span>
                  {getRoleIcon(m.role)}
                  <span className="text-[10px] text-slate-500">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl max-w-[85%] break-words ${
                    isMe
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-2 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          maxLength={500}
          className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white transition-all shadow-md shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
