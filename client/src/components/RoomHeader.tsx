import React, { useState } from 'react';
import { Copy, Check, LogOut, Crown, Shield, User, Tv, Radio } from 'lucide-react';
import { Role } from '../types';

interface RoomHeaderProps {
  roomId: string;
  userRole: Role;
  username: string;
  onLeaveRoom: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  userRole,
  username,
  onLeaveRoom,
  onNotification,
}) => {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onNotification?.('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getRoleBadge = () => {
    switch (userRole) {
      case 'host':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Host (Admin)</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Moderator</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span>Participant</span>
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span>WatchSync</span>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" /> LIVE
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Room:</span>
              <span className="font-mono font-bold tracking-wider text-red-400">{roomId}</span>
            </div>
          </div>
        </div>

        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-all shadow-sm"
          title="Copy link to invite friends"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied' : 'Copy Invite Link'}</span>
        </button>
      </div>

      {/* Role and Leave Room */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Signed in as:</span>
          <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{username}</span>
          {getRoleBadge()}
        </div>

        <button
          onClick={onLeaveRoom}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 hover:text-red-200 text-xs font-medium border border-red-800/40 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>
      </div>
    </header>
  );
};
