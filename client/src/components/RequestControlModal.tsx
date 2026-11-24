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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Request Action from Host</h3>
              <p className="text-xs text-slate-400">Moderators/Host must approve playback changes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Select Requested Action</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAction('play')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                  action === 'play'
                    ? 'border-red-500 bg-red-500/10 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Play className="w-4 h-4 text-emerald-400" />
                <span>Request Play</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('pause')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                  action === 'pause'
                    ? 'border-red-500 bg-red-500/10 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Pause className="w-4 h-4 text-amber-400" />
                <span>Request Pause</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('seek')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                  action === 'seek'
                    ? 'border-red-500 bg-red-500/10 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <FastForward className="w-4 h-4 text-sky-400" />
                <span>Request Seek</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('change_video')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left ${
                  action === 'change_video'
                    ? 'border-red-500 bg-red-500/10 text-white font-medium'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Film className="w-4 h-4 text-purple-400" />
                <span>Change Video</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAction('request_moderator')}
              className={`w-full flex items-center justify-center gap-2 p-2.5 mt-2 rounded-xl border transition-all text-xs ${
                action === 'request_moderator'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-200 font-medium'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Request Moderator Role (Self-Control)</span>
            </button>
          </div>

          {action === 'seek' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Seek Timestamp (MM:SS or seconds)</label>
              <input
                type="text"
                placeholder="02:15"
                value={seekTime}
                onChange={(e) => setSeekTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          )}

          {action === 'change_video' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">YouTube URL or ID</label>
              <input
                type="text"
                placeholder="https://youtu.be/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all"
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
