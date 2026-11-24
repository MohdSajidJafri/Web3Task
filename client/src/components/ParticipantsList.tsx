import React, { useState } from 'react';
import { Users, Crown, Shield, User, ChevronLeft, ChevronRight, UserMinus, ArrowRightLeft, UserCheck, Copy, Check, MoreHorizontal } from 'lucide-react';
import { Participant, Role } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';

interface ParticipantsListProps {
  roomId: string;
  participants: Participant[];
  currentUserId: string;
  currentUserRole: Role;
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

  const getRoleIcon = (role: Role) => {
    switch (role) {
      case 'host':
        return <Crown className="w-3.5 h-3.5 text-[#FFD700] fill-current shrink-0" />;
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

  return (
    <aside
      className={`bg-[#18181B] border-r border-[#2F2F35] flex flex-col transition-all duration-200 select-none ${
        className || (isCollapsed ? 'w-[56px]' : 'w-[240px]')
      } h-full shrink-0`}
    >
      {/* Header */}
      <div className="h-10 px-3 border-b border-[#2F2F35] flex items-center justify-between text-xs shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[11px] text-[#ADADB8] uppercase tracking-wider truncate">
              PARTY MEMBERS ({participants.length})
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {!isCollapsed && (
            <button
              onClick={copyInvite}
              className="p-1 hover:text-[#9146FF] text-[#ADADB8] transition-colors rounded"
              title="Copy Invite Link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] rounded transition-colors"
            title={isCollapsed ? 'Expand members panel' : 'Collapse members panel'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2F2F35]/40 p-1.5 space-y-1">
        {participants.map((p) => {
          const isMe = p.userId === currentUserId;
          const userColor = getTwitchUserColor(p.username);
          const isMenuOpen = activeMenuUserId === p.userId;

          return (
            <div
              key={p.userId}
              className={`rounded-lg transition-colors p-1.5 relative group ${
                isMenuOpen ? 'bg-[#26262C]' : 'hover:bg-[#1F1F23]'
              }`}
            >
              <div
                className="flex items-center gap-2"
                title={isCollapsed ? `${p.username} (${p.role})` : undefined}
              >
                {/* Avatar with initial + Online Dot */}
                <div className="relative shrink-0">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                    style={{ backgroundColor: userColor }}
                  >
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="w-2 h-2 rounded-full bg-[#00F593] absolute -bottom-0.5 -right-0.5 border border-[#18181B]" />
                </div>

                {/* Details (when expanded) */}
                {!isCollapsed && (
                  <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                        <span className="truncate">{p.username}</span>
                        {isMe && (
                          <span className="px-1 py-0.2 rounded bg-[#9146FF]/30 text-[#BF94FF] text-[9px] font-bold shrink-0">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-[#ADADB8] capitalize truncate">
                        {p.role}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {getRoleIcon(p.role)}

                      {/* Clean ⋯ popover button for Host actions on OTHER members */}
                      {isHost && !isMe && (
                        <button
                          onClick={() => setActiveMenuUserId(isMenuOpen ? null : p.userId)}
                          className="p-1 hover:text-white text-[#ADADB8] rounded hover:bg-[#2F2F35] transition-colors"
                          title="Host Actions"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Host Actions Popover Menu */}
              {isHost && !isMe && !isCollapsed && isMenuOpen && (
                <div className="absolute right-2 top-10 z-40 bg-[#1F1F23] border border-[#2F2F35] rounded-lg shadow-2xl p-1 w-36 space-y-0.5 animate-in fade-in duration-150">
                  {p.role !== 'moderator' ? (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'moderator')}
                      className="w-full text-left px-2 py-1.5 rounded text-[11px] font-medium text-[#EFEFF1] hover:bg-[#9146FF] hover:text-white transition-colors"
                    >
                      Promote to Mod
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRoleChange(p.userId, 'participant')}
                      className="w-full text-left px-2 py-1.5 rounded text-[11px] font-medium text-[#ADADB8] hover:bg-[#26262C] hover:text-white transition-colors"
                    >
                      Demote to Viewer
                    </button>
                  )}

                  <button
                    onClick={() => handleTransferHost(p.userId, p.username)}
                    className="w-full text-left px-2 py-1.5 rounded text-[11px] font-medium text-[#FFD700] hover:bg-[#FFD700]/20 transition-colors"
                  >
                    Transfer Host
                  </button>

                  <button
                    onClick={() => handleKick(p.userId, p.username)}
                    className="w-full text-left px-2 py-1.5 rounded text-[11px] font-medium text-[#EB0400] hover:bg-[#EB0400]/20 transition-colors"
                  >
                    Kick from Party
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
