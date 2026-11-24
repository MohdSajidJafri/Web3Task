import React, { useState } from 'react';
import { Copy, Check, LogOut, Crown, Shield, User, Search, Film, Send, HelpCircle, Plus, Play } from 'lucide-react';
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

  const handlePlayNow = (e: React.FormEvent) => {
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

  const handleQueueAdd = () => {
    if (!videoInput.trim() || !roomId) return;
    if (canControl) {
      socket.emit('queue_add', { roomId, videoId: videoInput.trim() });
      setVideoInput('');
      onNotification?.('Added to shared queue', 'success');
    } else {
      socket.emit('queue_suggest', { roomId, videoId: videoInput.trim() });
      setVideoInput('');
      onNotification?.('Suggested video to queue', 'info');
    }
  };

  const renderRoleBadge = () => {
    switch (userRole) {
      case 'host':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>HOST</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-sky-400 fill-current" />
            <span>MOD</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span>VIEWER</span>
          </span>
        );
    }
  };

  const userColor = getTwitchUserColor(username || 'User');

  return (
    <header className="h-[56px] bg-[#1B1D24] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 select-none z-30 shrink-0 shadow-md">
      {/* Left: Coral Gradient Play Badge & Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9966] flex items-center justify-center shadow-lg shadow-[#FF5E62]/30 group-hover:brightness-110 transition-all">
            <svg className="w-4 h-4 text-white fill-current ml-0.5" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="flex items-baseline font-black tracking-tight text-lg">
            <span className="text-white">Watch</span>
            <span className="bg-gradient-to-r from-[#FF5E62] to-[#FF9966] bg-clip-text text-transparent">Party</span>
          </div>
        </div>

        {/* Room Code Badge & 1-Click Copy */}
        {inRoom && roomId && (
          <div className="hidden md:flex items-center gap-1.5 pl-3 border-l border-white/[0.08]">
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-2 bg-[#242731] hover:bg-[#2C303D] border border-white/[0.08] hover:border-[#FF5E62]/40 px-3 py-1 rounded-xl text-xs transition-all group"
              title="Click to copy invite link"
            >
              <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">ROOM:</span>
              <span className="font-mono font-bold text-white tracking-widest">{roomId}</span>
              {copied ? (
                <span className="flex items-center gap-1 text-[#2EE59D] font-bold text-[10px] pl-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#FF5E62] transition-colors ml-0.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Center: Search (in Lobby) OR Quick Video Input / Actions (in Room) */}
      <div className="flex-1 max-w-lg mx-2 hidden sm:block">
        {inRoom ? (
          <form onSubmit={handlePlayNow} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={canControl ? 'Paste YouTube link to play or queue...' : 'Paste YouTube link to suggest...'}
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#1B1D24] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
              />
            </div>
            {canControl ? (
              <>
                <button
                  type="submit"
                  disabled={!videoInput.trim()}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-md shadow-[#FF5E62]/20 transition-all shrink-0 flex items-center gap-1"
                  title="Play Now"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </button>
                <button
                  type="button"
                  onClick={handleQueueAdd}
                  disabled={!videoInput.trim()}
                  className="px-2.5 py-1.5 bg-[#242731] hover:bg-[#2C303D] border border-white/[0.08] text-zinc-300 hover:text-white disabled:opacity-40 rounded-xl font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                  title="Add to Queue"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Queue</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleQueueAdd}
                  disabled={!videoInput.trim()}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-white rounded-xl font-semibold text-xs shadow-md shadow-[#FF5E62]/20 transition-all shrink-0 flex items-center gap-1"
                  title="Suggest Video to Host"
                >
                  <Plus className="w-3 h-3" />
                  <span>Suggest</span>
                </button>
                {onRequestControlOpen && (
                  <button
                    type="button"
                    onClick={onRequestControlOpen}
                    className="px-2.5 py-1.5 bg-[#242731] hover:bg-[#2C303D] border border-amber-500/30 text-amber-300 hover:text-amber-200 rounded-xl font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
                    title="Request Action / Controls from Host"
                  >
                    <Send className="w-3 h-3" />
                    <span>Request</span>
                  </button>
                )}
              </>
            )}
          </form>
        ) : (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search watch parties or creators..."
              className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#1B1D24] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
            />
          </div>
        )}
      </div>

      {/* Right: Role Badge, Shortcuts, Avatar & Leave Room */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {inRoom && renderRoleBadge()}

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 bg-[#242731] hover:bg-[#2C303D] hover:text-[#FF5E62] text-zinc-400 rounded-xl border border-white/[0.08] transition-colors flex items-center justify-center"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* User Avatar with Mint Online Dot */}
        <div className="flex items-center gap-2 bg-[#242731] pl-1.5 pr-3 py-1 rounded-full border border-white/[0.08] shadow-sm">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white relative shrink-0 shadow-inner"
            style={{ backgroundColor: userColor }}
          >
            {username ? username.charAt(0).toUpperCase() : 'U'}
            <span className="w-2 h-2 bg-[#2EE59D] rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-[#1B1D24]" />
          </div>
          <span className="text-xs font-semibold text-white max-w-[110px] truncate">
            {username || 'Guest'}
          </span>
        </div>

        {inRoom && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#242731] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 rounded-xl border border-white/[0.08] hover:border-rose-500/40 text-xs font-semibold transition-all active:scale-[0.98]"
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
