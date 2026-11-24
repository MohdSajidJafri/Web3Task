import React from 'react';
import { Check, X, ShieldAlert, Clock, UserCheck } from 'lucide-react';
import { ControlRequest } from '../types';
import { getSocket } from '../services/socket';

interface ApprovalBannerProps {
  roomId: string;
  requests: ControlRequest[];
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const ApprovalBanner: React.FC<ApprovalBannerProps> = ({
  roomId,
  requests,
  onNotification,
}) => {
  if (!requests || requests.length === 0) return null;

  const socket = getSocket();

  const handleRespond = (requestId: string, approve: boolean) => {
    socket.emit('respond_control', {
      roomId,
      requestId,
      approve,
    });
    onNotification?.(
      approve ? 'Request approved and applied!' : 'Request rejected.',
      approve ? 'success' : 'info'
    );
  };

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 shadow-xl shadow-black/30 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
          <span>Pending Participant Requests ({requests.length})</span>
        </div>
        <span className="text-xs text-amber-400/80 font-medium">Host / Moderator Approval Required</span>
      </div>

      <div className="space-y-2">
        {requests.map((req) => (
          <div
            key={req.requestId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1B1D24] border border-white/[0.08] rounded-xl p-3 shadow-md"
          >
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  <span className="text-[#FF9966] font-bold">{req.requesterName}</span>{' '}
                  <span className="text-zinc-300">
                    {req.label || `requested: ${req.action}`}
                  </span>
                </p>
                {req.action === 'change_video' && req.payload?.videoId && (
                  <p className="text-xs font-mono text-zinc-400">
                    Video ID: <span className="text-amber-300">{req.payload.videoId}</span>
                  </p>
                )}
                {req.action === 'seek' && typeof req.payload?.time === 'number' && (
                  <p className="text-xs font-mono text-zinc-400">
                    Target Time: <span className="text-amber-300">{req.payload.time}s</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={() => handleRespond(req.requestId, true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2EE59D] hover:bg-[#25C786] text-black font-bold text-xs shadow-md transition-all active:scale-[0.98]"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleRespond(req.requestId, false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242731] hover:bg-[#2C303D] text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.08] transition-all"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
