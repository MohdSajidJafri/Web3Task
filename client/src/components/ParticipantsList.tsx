import React from 'react';
import { Users, Crown, Shield, User, Eye, UserMinus, ArrowRightLeft, UserCheck } from 'lucide-react';
import { Participant, Role } from '../types';
import { getSocket } from '../services/socket';

interface ParticipantsListProps {
  roomId: string;
  participants: Participant[];
  currentUserId: string;
  currentUserRole: Role;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  roomId,
  participants,
  currentUserId,
  currentUserRole,
  onNotification,
}) => {
  const socket = getSocket();
  const isHost = currentUserRole === 'host';

  const handleRoleChange = (targetUserId: string, newRole: Role) => {
    socket.emit('assign_role', {
      roomId,
      userId: targetUserId,
      role: newRole,
    });
    onNotification?.(`Assigned role ${newRole}`, 'info');
  };

  const handleKick = (targetUserId: string, targetName: string) => {
    if (confirm(`Are you sure you want to remove ${targetName} from the room?`)) {
      socket.emit('remove_participant', {
        roomId,
        userId: targetUserId,
      });
      onNotification?.(`Removed ${targetName}`, 'info');
    }
  };

  const handleTransferHost = (targetUserId: string, targetName: string) => {
    if (confirm(`Transfer room Host to ${targetName}? You will become a Moderator.`)) {
      socket.emit('transfer_host', {
        roomId,
        userId: targetUserId,
      });
      onNotification?.(`Transferred Host to ${targetName}`, 'success');
    }
  };

  const renderBadge = (role: Role) => {
    switch (role) {
      case 'host':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Host</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Shield className="w-3 h-3 text-purple-400" />
            <span>Mod</span>
          </span>
        );
      case 'viewer':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Eye className="w-3 h-3 text-slate-400" />
            <span>Viewer</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <User className="w-3 h-3 text-blue-400" />
            <span>Participant</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-200">Party Members</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs font-mono text-slate-300">
          {participants.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
        {participants.map((p) => {
          const isCurrentUser = p.userId === currentUserId;
          return (
            <div
              key={p.userId}
              className={`p-2.5 rounded-xl transition-all flex flex-col gap-2 ${
                isCurrentUser ? 'bg-slate-800/60 border border-slate-700/50' : 'hover:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">
                      {p.username}
                      {isCurrentUser && <span className="ml-1 text-[10px] text-slate-400">(You)</span>}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">{renderBadge(p.role)}</div>
              </div>

              {/* Host management actions on OTHER members */}
              {isHost && !isCurrentUser && (
                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                  {p.role !== 'moderator' ? (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'moderator')}
                      title="Promote to Moderator"
                      className="px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                    >
                      <Shield className="w-3 h-3" />
                      <span>Make Mod</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'participant')}
                      title="Demote to Participant"
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                    >
                      Demote
                    </button>
                  )}

                  <button
                    onClick={() => handleTransferHost(p.userId, p.username)}
                    title="Transfer Host Ownership"
                    className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Make Host</span>
                  </button>

                  <button
                    onClick={() => handleKick(p.userId, p.username)}
                    title="Kick user from room"
                    className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-medium transition-colors"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
