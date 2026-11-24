import React, { useState } from 'react';
import { Copy, Check, LogOut, Crown, Shield, User, Search, Film, Send, HelpCircle, Compass, Bell, MessageSquare, Diamond } from 'lucide-react';
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
  onOpenShortcuts?: () => void;
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
  onOpenShortcuts,
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
      onNotification?.('Loading video into party...', 'info');
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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#9146FF] text-white shadow-sm">
            <Crown className="w-3 h-3 text-[#FFD700] fill-current" />
            <span>HOST</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#00AD03] text-white shadow-sm">
            <Shield className="w-3 h-3 text-white fill-current" />
            <span>MOD</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#2F2F35] text-[#ADADB8]">
            <User className="w-3 h-3" />
            <span>VIEWER</span>
          </span>
        );
    }
  };

  const userColor = getTwitchUserColor(username || 'User');

  return (
    <header className="h-[50px] bg-[#18181B] border-b border-[#2D2D35] px-3 sm:px-4 flex items-center justify-between gap-3 select-none z-40 shrink-0">
      {/* Left: Twitch Official Glitch Logo & Links */}
      <div className="flex items-center gap-4 shrink-0">
        <a href="/" className="flex items-center gap-2 group cursor-pointer" title="Twitch Watch Party Home">
          {/* Official Twitch Glitch Logo SVG */}
          <div className="w-8 h-8 rounded-[4px] bg-[#9146FF] group-hover:bg-[#772CE8] flex items-center justify-center transition-colors shadow-md shadow-[#9146FF]/30">
            <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M11.5 6.5h1.8v5h-1.8zm4.5 0h1.8v5H16zM6 2L2 6v14h5v4l4-4h3.5L22 12V2zm14 9.5l-3 3H13l-3 3v-3H6.5V3.5H20z" />
            </svg>
          </div>
          <div className="flex items-baseline font-black tracking-tight text-lg">
            <span className="text-white">Watch</span>
            <span className="text-[#BF94FF]">Party</span>
          </div>
        </a>

        {/* Navigation links matching Twitch */}
        <div className="hidden md:flex items-center gap-1">
          <a
            href="/"
            className="px-3 py-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] hover:text-[#BF94FF] text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4 text-[#BF94FF]" />
            <span>Browse</span>
          </a>
        </div>

        {/* In-Room Code Badge with 1-Click Copy */}
        {inRoom && roomId && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#2F2F35]">
            <div className="flex items-center gap-1.5 bg-[#1F1F23] border border-[#2F2F35] px-2.5 py-1 rounded-[4px] text-xs">
              <span className="text-[#ADADB8] text-[10px] font-bold tracking-wider">ROOM:</span>
              <span className="font-mono font-bold text-white tracking-wider">{roomId}</span>
              <button
                onClick={copyInviteLink}
                className="ml-1 p-0.5 hover:text-[#BF94FF] text-[#ADADB8] transition-colors"
                title="Copy Invite Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Authentic Twitch Search Bar OR In-Room Video Loader */}
      <div className="flex-1 max-w-md mx-2 hidden sm:block">
        {inRoom ? (
          canControl ? (
            <form onSubmit={handleVideoSubmit} className="flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Paste YouTube URL or video ID to change..."
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-l-[6px] px-3 text-xs text-[#EFEFF1] placeholder-[#ADADB8] outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="h-[36px] px-3.5 bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white rounded-r-[6px] font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                title="Change Video Now"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Load</span>
              </button>
            </form>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={onRequestControlOpen}
                className="h-[36px] px-4 bg-[#1F1F23] hover:bg-[#26262C] border border-[#2F2F35] hover:border-[#9146FF] text-[#EFEFF1] rounded-[4px] text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-[#BF94FF]" />
                <span>Request Video Change / Control</span>
              </button>
            </div>
          )
        ) : (
          /* Exact Twitch Search Bar (Input + Attached Search Button) */
          <div className="flex items-center w-full">
            <input
              type="text"
              placeholder="Search watch parties, games, creators..."
              className="w-full h-[36px] bg-[#18181B] hover:bg-[#1F1F23] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-l-[6px] px-3.5 text-sm text-[#EFEFF1] placeholder-[#ADADB8] outline-none transition-colors"
            />
            <button
              className="h-[36px] w-[36px] bg-[#2F2F35] hover:bg-[#3A3A42] border border-l-0 border-[#464649] rounded-r-[6px] flex items-center justify-center text-[#EFEFF1] transition-colors shrink-0"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Right: Prime Crown, Notifications, Whispers, Avatar & Leave */}
      <div className="flex items-center gap-2 shrink-0">
        {inRoom && renderRoleBadge()}

        {/* Prime Crown Icon */}
        <button
          className="p-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] transition-colors hidden md:flex items-center justify-center"
          title="Prime Watch Party"
        >
          <Crown className="w-4 h-4 text-[#BF94FF]" />
        </button>

        {/* Notifications */}
        <button
          className="p-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] transition-colors hidden sm:flex items-center justify-center"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 bg-[#1F1F23] hover:bg-[#26262C] hover:text-[#BF94FF] text-[#ADADB8] rounded-[4px] border border-[#2F2F35] transition-colors flex items-center justify-center"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* User Avatar with 8px green status dot */}
        <div className="flex items-center gap-2 bg-[#1F1F23] pl-1 pr-2.5 py-1 rounded-full border border-[#2F2F35]">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white relative shrink-0 shadow"
            style={{ backgroundColor: userColor }}
          >
            {username ? username.charAt(0).toUpperCase() : 'U'}
            <span className="w-2 h-2 bg-[#00F593] rounded-full absolute -bottom-0.5 -right-0.5 border border-[#18181B]" />
          </div>
          <span className="text-xs font-semibold text-[#EFEFF1] max-w-[100px] truncate">
            {username || 'Guest'}
          </span>
        </div>

        {inRoom && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1F1F23] hover:bg-[#EB0400] text-[#ADADB8] hover:text-white rounded-[4px] border border-[#2F2F35] hover:border-[#EB0400] text-xs font-semibold transition-colors"
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
