import React, { useState } from 'react';
import { Users, Crown, Shield, User, ChevronLeft, ChevronRight, UserMinus, ArrowRightLeft, UserCheck, Copy, Check, MoreHorizontal, X, AlertCircle } from 'lucide-react';
import { Participant, Role, ControlRequest } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';

interface ParticipantsListProps {
  roomId: string;
  participants: Participant[];
  currentUserId: string;
  currentUserRole: Role;
  pendingRequests?: ControlRequest[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
  className?: string;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  roomId,
  participants,
  currentUserId,
  currentUserRole,
  pendingRequests = [],
  isCollapsed,
  onToggleCollapse,
  onNotification,
  className,
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const socket = getSocket();
  const isHost = currentUserRole === 'host';

  const copyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onNotification?.('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = (targetUserId: string, newRole: Role) => {
    socket.emit('assign_role', {
      roomId,
      userId: targetUserId,
      role: newRole,
    });
    setActiveMenuUserId(null);
    onNotification?.(`Assigned role: ${newRole}`, 'info');
  };

  const handleKick = (targetUserId: string, targetName: string) => {
    if (confirm(`Kick ${targetName} from the party?`)) {
      socket.emit('remove_participant', {
        roomId,
        userId: targetUserId,
      });
      setActiveMenuUserId(null);
      onNotification?.(`Removed ${targetName}`, 'info');
    }
  };

  const handleTransferHost = (targetUserId: string, targetName: string) => {
    if (confirm(`Transfer room Host to ${targetName}? You will become a Moderator.`)) {
      socket.emit('transfer_host', {
        roomId,
        userId: targetUserId,
      });
      setActiveMenuUserId(null);
      onNotification?.(`Transferred Host to ${targetName}`, 'success');
    }
  };

  const handleRespondControl = (requestId: string, approve: boolean) => {
    socket.emit('respond_control', {
      roomId,
      requestId,
      approve,
    });
    onNotification?.(
      approve ? 'Control request approved!' : 'Control request declined.',
      approve ? 'success' : 'info'
    );
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'host':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Crown className="w-3 h-3 text-amber-400 fill-current" />
            <span>Host</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <Shield className="w-3 h-3 text-sky-400 fill-current" />
            <span>Mod</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <aside
      className={`bg-[#1B1D24] border-r border-white/[0.08] flex flex-col justify-between transition-all duration-200 select-none ${
        className || (isCollapsed ? 'w-[60px]' : 'w-[260px]')
      } h-full shrink-0 relative`}
    >
      {/* Header */}
      <div className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between text-xs shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 text-[#2EE59D]" />
            <span className="font-bold text-[11px] text-zinc-300 uppercase tracking-wider truncate">
              Members ({participants.length})
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {!isCollapsed && (
            <button
              onClick={copyInvite}
              className="p-1.5 hover:text-[#FF5E62] text-zinc-400 hover:bg-[#242731] transition-colors rounded-lg"
              title="Copy Invite Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#2EE59D]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#242731] rounded-lg transition-colors"
            title={isCollapsed ? 'Expand members panel' : 'Collapse members panel'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Members List (Matching Reference Blueprint) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;
          const userColor = getTwitchUserColor(p.username);
          const isMenuOpen = activeMenuUserId === p.userId;

          return (
            <div
              key={p.userId}
              className={`rounded-xl transition-all p-2 relative group ${
                isMenuOpen ? 'bg-[#2C303D]' : 'bg-[#242731]/50 hover:bg-[#242731] border border-white/[0.04] hover:border-white/[0.1]'
              }`}
            >
              <div
                className="flex items-center gap-2.5"
                title={isCollapsed ? `${p.username} (${p.role})` : undefined}
              >
                {/* Avatar with initial + Mint Online Dot */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md shadow-black/30"
                    style={{ backgroundColor: userColor }}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2EE59D] absolute -bottom-0.5 -right-0.5 border-2 border-[#1B1D24]" />
                </div>

                {/* Details */}
                {!isCollapsed && (
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{p.username}</span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#FF5E62]/15 text-[#FF9966] text-[9px] font-bold border border-[#FF5E62]/20 shrink-0">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-zinc-400 capitalize truncate">
                        {p.role}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getRoleBadge(p.role)}

                      {/* ⋯ Button for Host actions */}
                      {isHost && !isMe && (
                        <button
                          onClick={() => setActiveMenuUserId(isMenuOpen ? null : p.userId)}
                          className="p-1 hover:text-white text-zinc-400 rounded-lg hover:bg-[#2C303D] transition-colors"
                          title="Host Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Host Actions Popover Menu */}
              {isHost && !isMe && !isCollapsed && isMenuOpen && (
                <div className="absolute right-2 top-11 z-40 bg-[#1B1D24] border border-white/[0.1] rounded-xl shadow-2xl p-1.5 w-40 space-y-1 animate-in fade-in duration-150">
                  {p.role !== 'moderator' ? (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'moderator')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-[#242731] transition-colors"
                    >
                      Promote to Mod
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'participant')}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:bg-[#242731] transition-colors"
                    >
                      Demote to Viewer
                    </button>
                  )}

                  <button
                    onClick={() => handleTransferHost(p.userId, p.username)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    Transfer Host
                  </button>

                  <button
                    onClick={() => handleKick(p.userId, p.username)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-colors"
                  >
                    Kick from Party
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pinned Control Request Card at Bottom of Members view (Matching Reference Blueprint) */}
      {!isCollapsed && isHost && pendingRequests.length > 0 && (
        <div className="p-3 border-t border-white/[0.08] bg-[#1B1D24]">
          <div className="bg-gradient-to-br from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Control Request ({pendingRequests.length})</span>
              </span>
            </div>

            {pendingRequests.slice(0, 1).map((req) => (
              <div key={req.requestId} className="space-y-2.5">
                <p className="text-xs text-zinc-300 leading-snug">
                  <span className="font-bold text-white">{req.requesterName}</span> is requesting playback control.
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
    </aside>
  );
};
