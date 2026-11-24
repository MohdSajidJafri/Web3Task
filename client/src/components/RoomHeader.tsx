import React, { useState } from 'react';
import { Copy, Check, LogOut, Crown, Shield, User, Search, Film, Send } from 'lucide-react';
import { Role } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';

interface RoomHeaderProps {
  roomId?: string;
  userRole?: Role;
  username: string;
  inRoom: boolean;
  canControl?: boolean;
  onLeaveRoom?: () => void;
  onRequestControlOpen?: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  userRole = 'participant',
  username,
  inRoom,
  canControl = false,
  onLeaveRoom,
  onRequestControlOpen,
  onNotification,
}) => {
  const [copied, setCopied] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const socket = getSocket();

  const copyInviteLink = () => {
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onNotification?.('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim() || !roomId) return;

    if (canControl) {
      socket.emit('change_video', { roomId, videoId: videoInput.trim() });
      setVideoInput('');
      onNotification?.('Updating video...', 'info');
    } else {
      socket.emit('request_control', {
        roomId,
        action: 'change_video',
        payload: { videoId: videoInput.trim() },
        label: `Change video to ${videoInput.trim()}`,
      });
      setVideoInput('');
      onNotification?.('Video change requested from Host', 'info');
    }
  };

  const renderRoleBadge = () => {
    switch (userRole) {
      case 'host':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#9146FF] text-white">
            <Crown className="w-3 h-3 text-[#FFD700]" />
            <span>HOST</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#00AD03] text-white">
            <Shield className="w-3 h-3 text-white" />
            <span>MOD</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#2F2F35] text-[#ADADB8]">
            <User className="w-3 h-3" />
            <span>VIEWER</span>
          </span>
        );
    }
  };

  const userColor = getTwitchUserColor(username || 'User');

  return (
    <header className="h-[50px] bg-[#18181B] border-b border-[#2F2F35] px-3 sm:px-4 flex items-center justify-between gap-3 select-none z-30 shrink-0">
      {/* Left: Twitch Logo & WatchParty Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2 cursor-pointer group">
          {/* Twitch-style glitch play icon */}
          <div className="w-8 h-8 rounded bg-[#9146FF] flex items-center justify-center shadow-lg shadow-[#9146FF]/30 group-hover:bg-[#772CE8] transition-colors">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.5 6.5h1.8v5h-1.8zm4.5 0h1.8v5H16zM6 2L2 6v14h5v4l4-4h3.5L22 12V2zm14 9.5l-3 3H13l-3 3v-3H6.5V3.5H20z" />
            </svg>
          </div>
          <div className="flex items-baseline font-black tracking-tight text-lg">
            <span className="text-white">Watch</span>
            <span className="text-[#BF94FF]">Party</span>
          </div>
        </div>

        {/* Room Code Badge */}
        {inRoom && roomId && (
          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-[#2F2F35]">
            <div className="flex items-center gap-1.5 bg-[#1F1F23] border border-[#2F2F35] px-2.5 py-1 rounded-md text-xs">
              <span className="text-[#ADADB8] text-[10px] font-bold">ROOM:</span>
              <span className="font-mono font-bold text-white tracking-wider">{roomId}</span>
              <button
                onClick={copyInviteLink}
                className="ml-1 p-0.5 hover:text-[#9146FF] text-[#ADADB8] transition-colors"
                title="Copy Invite Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Search (in Lobby) OR Quick Video Input / Request (in Room) */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        {inRoom ? (
          canControl ? (
            <form onSubmit={handleVideoSubmit} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste YouTube URL or Video ID to change..."
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-1.5 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="px-3 py-1.5 bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white rounded font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Load</span>
              </button>
            </form>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onRequestControlOpen}
                className="px-3 py-1.5 bg-[#1F1F23] hover:bg-[#26262C] border border-[#2F2F35] hover:border-[#9146FF] text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#BF94FF]" />
                <span>Request Action / Change Video</span>
              </button>
            </div>
          )
        ) : (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#ADADB8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search watch parties or creators..."
              className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* Right: Role Badge, Avatar & Leave Room */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {inRoom && renderRoleBadge()}

        {/* User Avatar with online dot */}
        <div className="flex items-center gap-2 bg-[#1F1F23] pl-1.5 pr-2.5 py-1 rounded-full border border-[#2F2F35]">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white relative shrink-0"
            style={{ backgroundColor: userColor }}
          >
            {username ? username.charAt(0).toUpperCase() : 'U'}
            <span className="w-1.5 h-1.5 bg-[#00F593] rounded-full absolute -bottom-0.5 -right-0.5 border border-[#18181B]" />
          </div>
          <span className="text-xs font-semibold text-white max-w-[100px] truncate">
            {username || 'Guest'}
          </span>
        </div>

        {inRoom && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1F1F23] hover:bg-[#EB0400] text-[#ADADB8] hover:text-white rounded border border-[#2F2F35] hover:border-[#EB0400] text-xs font-semibold transition-colors"
            title="Leave Watch Party"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        )}
      </div>
    </header>
  );
};
