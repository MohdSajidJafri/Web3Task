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
      <div className="bg-[#1B1D24] border border-white/[0.08] w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Request Host Action</h3>
              <p className="text-[11px] text-zinc-400">Hosts and Moderators will review your request</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#242731] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Choose Action to Request
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAction('play')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  action === 'play'
                    ? 'bg-[#FF5E62]/15 border-[#FF5E62] text-[#FF9966]'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300'
                }`}
              >
                <Play className="w-4 h-4" />
                <span>Resume Play</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('pause')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  action === 'pause'
                    ? 'bg-[#FF5E62]/15 border-[#FF5E62] text-[#FF9966]'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300'
                }`}
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('seek')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  action === 'seek'
                    ? 'bg-[#FF5E62]/15 border-[#FF5E62] text-[#FF9966]'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300'
                }`}
              >
                <FastForward className="w-4 h-4" />
                <span>Seek / Jump</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('change_video')}
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all ${
                  action === 'change_video'
                    ? 'bg-[#FF5E62]/15 border-[#FF5E62] text-[#FF9966]'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300'
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Change Video</span>
              </button>
            </div>
          </div>

          {action === 'seek' && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Target Timestamp (MM:SS)
              </label>
              <input
                type="text"
                placeholder="02:45"
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                className="w-full bg-[#242731] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
              />
            </div>
          )}

          {action === 'change_video' && (
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                YouTube Video URL or ID
              </label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-[#242731] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#242731] hover:bg-[#2C303D] text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-[#FF5E62]/25 transition-all flex items-center gap-1.5"
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
