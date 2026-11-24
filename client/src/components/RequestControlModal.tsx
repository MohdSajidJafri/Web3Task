import React, { useState } from 'react';
import { X, Play, Pause, FastForward, Film, Shield, Send } from 'lucide-react';
import { getSocket } from '../services/socket';

interface RequestControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const RequestControlModal: React.FC<RequestControlModalProps> = ({
  isOpen,
  onClose,
  roomId,
  onNotification,
}) => {
  if (!isOpen) return null;

  const [action, setAction] = useState<'play' | 'pause' | 'seek' | 'change_video' | 'request_moderator'>('play');
  const [seekTime, setSeekTime] = useState<string>('01:30');
  const [videoUrl, setVideoUrl] = useState<string>('');

  const socket = getSocket();

  const parseTimeToSeconds = (timeStr: string): number => {
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 1 && !isNaN(parts[0])) {
      return parts[0];
    }
    return 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let payload: any = {};
    let label = '';

    if (action === 'play') {
      payload = {};
      label = 'Resume Video Playback';
    } else if (action === 'pause') {
      payload = {};
      label = 'Pause Video Playback';
    } else if (action === 'seek') {
      const seconds = parseTimeToSeconds(seekTime);
      payload = { time: seconds };
      label = `Seek to ${seekTime} (${seconds}s)`;
    } else if (action === 'change_video') {
      if (!videoUrl.trim()) {
        onNotification?.('Please enter a YouTube video URL or ID', 'error');
        return;
      }
      payload = { videoId: videoUrl.trim() };
      label = `Change video to ${videoUrl.trim()}`;
    } else if (action === 'request_moderator') {
      payload = {};
      label = 'Promote to Moderator role';
    }

    socket.emit('request_control', {
      roomId,
      action,
      payload,
      label,
    });

    onNotification?.('Control request submitted to Host and Moderators for approval', 'info');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="bg-[#18181B] border border-[#2F2F35] w-full max-w-md rounded-xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2F2F35]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-[#9146FF]/20 text-[#BF94FF]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Request Host Action</h3>
              <p className="text-[11px] text-[#ADADB8]">Hosts and Moderators will review your request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#ADADB8] hover:text-white hover:bg-[#1F1F23] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#ADADB8]">
              Select Action
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAction('play')}
                className={`flex items-center gap-2 p-2.5 rounded border transition-all text-left ${
                  action === 'play'
                    ? 'border-[#9146FF] bg-[#9146FF]/20 text-white font-bold'
                    : 'border-[#2F2F35] bg-[#1F1F23] text-[#ADADB8] hover:border-[#464649]'
                }`}
              >
                <Play className="w-4 h-4 text-[#00F593]" />
                <span>Request Play</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('pause')}
                className={`flex items-center gap-2 p-2.5 rounded border transition-all text-left ${
                  action === 'pause'
                    ? 'border-[#9146FF] bg-[#9146FF]/20 text-white font-bold'
                    : 'border-[#2F2F35] bg-[#1F1F23] text-[#ADADB8] hover:border-[#464649]'
                }`}
              >
                <Pause className="w-4 h-4 text-[#FFD700]" />
                <span>Request Pause</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('seek')}
                className={`flex items-center gap-2 p-2.5 rounded border transition-all text-left ${
                  action === 'seek'
                    ? 'border-[#9146FF] bg-[#9146FF]/20 text-white font-bold'
                    : 'border-[#2F2F35] bg-[#1F1F23] text-[#ADADB8] hover:border-[#464649]'
                }`}
              >
                <FastForward className="w-4 h-4 text-[#00E5FF]" />
                <span>Request Seek</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('change_video')}
                className={`flex items-center gap-2 p-2.5 rounded border transition-all text-left ${
                  action === 'change_video'
                    ? 'border-[#9146FF] bg-[#9146FF]/20 text-white font-bold'
                    : 'border-[#2F2F35] bg-[#1F1F23] text-[#ADADB8] hover:border-[#464649]'
                }`}
              >
                <Film className="w-4 h-4 text-[#BF94FF]" />
                <span>Change Video</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAction('request_moderator')}
              className={`w-full flex items-center justify-center gap-2 p-2.5 mt-2 rounded border transition-all text-xs ${
                action === 'request_moderator'
                  ? 'border-[#9146FF] bg-[#9146FF]/20 text-[#BF94FF] font-bold'
                  : 'border-[#2F2F35] bg-[#1F1F23] text-[#ADADB8] hover:border-[#464649]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#00AD03]" />
              <span>Request Moderator Role (Self-Control)</span>
            </button>
          </div>

          {action === 'seek' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#ADADB8]">
                Seek Timestamp (MM:SS or seconds)
              </label>
              <input
                type="text"
                placeholder="02:15"
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                className="w-full bg-[#1F1F23] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white outline-none font-mono"
              />
            </div>
          )}

          {action === 'change_video' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#ADADB8]">
                YouTube URL or Video ID
              </label>
              <input
                type="text"
                placeholder="https://youtu.be/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-[#1F1F23] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded text-xs font-semibold text-[#ADADB8] hover:text-white bg-[#1F1F23] hover:bg-[#26262C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded text-xs font-bold bg-[#9146FF] hover:bg-[#772CE8] text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
