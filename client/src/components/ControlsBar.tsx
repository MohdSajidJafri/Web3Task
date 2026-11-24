import React, { useState } from 'react';
import { Play, Pause, FastForward, Film, Send, ShieldAlert } from 'lucide-react';
import { SyncState, Role } from '../types';
import { getSocket } from '../services/socket';

interface ControlsBarProps {
  roomId: string;
  role: Role;
  syncState: SyncState | null;
  canControl: boolean;
  onRequestControlOpen: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  roomId,
  role,
  syncState,
  canControl,
  onRequestControlOpen,
  onNotification,
}) => {
  const [videoInput, setVideoInput] = useState('');
  const [seekTime, setSeekTime] = useState<number | null>(null);

  const socket = getSocket();
  const isPlaying = syncState?.playState === 'playing';
  const currentTime = seekTime !== null ? seekTime : syncState?.currentTime || 0;

  const handlePlayPause = () => {
    if (!canControl) {
      onRequestControlOpen();
      return;
    }

    if (isPlaying) {
      socket.emit('pause', { roomId, currentTime: syncState?.currentTime });
    } else {
      socket.emit('play', { roomId, currentTime: syncState?.currentTime });
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeekTime(parseFloat(e.target.value));
  };

  const handleSeekCommit = () => {
    if (seekTime === null) return;
    if (!canControl) {
      onNotification?.('Seek requires Host or Moderator privileges. Request control to seek.', 'info');
      setSeekTime(null);
      return;
    }
    socket.emit('seek', { roomId, time: seekTime });
    setSeekTime(null);
  };

  const handleSkip = (seconds: number) => {
    if (!canControl) {
      onRequestControlOpen();
      return;
    }
    const newTime = Math.max(0, (syncState?.currentTime || 0) + seconds);
    socket.emit('seek', { roomId, time: newTime });
  };

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;

    if (!canControl) {
      // Participant: submit request to Host/Mod
      socket.emit('request_control', {
        roomId,
        action: 'change_video',
        payload: { videoId: videoInput.trim() },
        label: `Change video to ${videoInput.trim()}`,
      });
      onNotification?.('Video change request sent to Host for approval', 'info');
      setVideoInput('');
      return;
    }

    socket.emit('change_video', { roomId, videoId: videoInput.trim() });
    setVideoInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Scrubber & Playback Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Play/Pause Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all shadow-lg font-semibold ${
              canControl
                ? isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={canControl ? (isPlaying ? 'Pause' : 'Play') : 'Request Play/Pause'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          {/* Quick Skips (Host/Mod only) */}
          {canControl && (
            <>
              <button
                onClick={() => handleSkip(-10)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-slate-700/60"
                title="Rewind 10s"
              >
                -10s
              </button>
              <button
                onClick={() => handleSkip(15)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-slate-700/60"
                title="Forward 15s"
              >
                +15s
              </button>
            </>
          )}
        </div>

        {/* Timeline Slider */}
        <div className="flex-1 w-full flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={7200} // Up to 2 hours
            step={1}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            disabled={!canControl}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
              canControl
                ? 'bg-slate-700 accent-red-500 hover:accent-red-400'
                : 'bg-slate-800 cursor-not-allowed opacity-50'
            }`}
          />
        </div>
      </div>

      {/* Change Video Input Bar */}
      <form onSubmit={handleVideoSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Film className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              canControl
                ? 'Paste YouTube URL or Video ID (e.g., https://youtu.be/...)'
                : 'Paste YouTube URL to request video change...'
            }
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
          />
        </div>
        <button
          type="submit"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md shrink-0 ${
            canControl
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          {canControl ? (
            <>
              <Film className="w-4 h-4" />
              <span>Load Video</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-amber-400" />
              <span>Request Change</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
