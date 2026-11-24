import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SyncState, Role } from '../types';
import { getSocket } from '../services/socket';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  RefreshCw,
  Share2,
  Check,
  AlertCircle,
  Radio,
  Film,
  Send,
  FastForward
} from 'lucide-react';
import { getTwitchUserColor } from '../utils/colors';

interface YouTubePlayerProps {
  roomId: string;
  role: Role;
  syncState: SyncState | null;
  canControl: boolean;
  hostName: string;
  viewerCount: number;
  onRequestControlOpen: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  roomId,
  role,
  syncState,
  canControl,
  hostName,
  viewerCount,
  onRequestControlOpen,
  onNotification,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const isProgrammaticUpdateRef = useRef<boolean>(false);
  const programmaticTimeoutRef = useRef<any>(null);

  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isApiLoaded, setIsApiLoaded] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [localCurrentTime, setLocalCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState<boolean>(false);
  const [scrubberValue, setScrubberValue] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [inlineVideoUrl, setInlineVideoUrl] = useState<string>('');

  const socket = getSocket();

  // Helper to safely execute a programmatic update to the YT Player
  const executeProgrammaticUpdate = useCallback((updateFn: (player: any) => void) => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;

    isProgrammaticUpdateRef.current = true;
    if (programmaticTimeoutRef.current) {
      clearTimeout(programmaticTimeoutRef.current);
    }

    try {
      updateFn(playerRef.current);
    } catch (e) {
      console.error('Error executing programmatic player update', e);
    }

    // Reset after 600ms debounce
    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 600);
  }, []);

  // 1. Load YouTube IFrame API Script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const existingTag = document.getElementById('youtube-iframe-api');
    if (!existingTag) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const previousOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (previousOnReady) previousOnReady();
      setIsApiLoaded(true);
    };
  }, []);

  // 2. Instantiate Player once API is loaded
  useEffect(() => {
    if (!isApiLoaded) return;

    const initialVideo = syncState?.videoId || 'M7lc1UVf-VE';
    setCurrentVideoId(initialVideo);

    const player = new window.YT.Player('youtube-player-element', {
      videoId: initialVideo,
      playerVars: {
        autoplay: 0,
        controls: 0, // Use our sleek custom Twitch control bar
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
        playsinline: 1,
        enablejsapi: 1,
      },
      events: {
        onReady: (event: any) => {
          playerRef.current = event.target;
          isPlayerReadyRef.current = true;
          setDuration(event.target.getDuration ? event.target.getDuration() : 0);

          if (syncState) {
            handleInitialSync(syncState);
          }
        },
        onStateChange: (event: any) => {
          // Anti-echo loop protection
          if (isProgrammaticUpdateRef.current) return;
          if (!canControl) return;

          const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;
          if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit('play', { roomId, currentTime });
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit('pause', { roomId, currentTime });
          }
        },
        onError: () => {
          onNotification?.('YouTube video cannot be embedded or is unavailable', 'error');
        },
      },
    });

    return () => {
      if (player && player.destroy) {
        player.destroy();
      }
      isPlayerReadyRef.current = false;
      playerRef.current = null;
    };
  }, [isApiLoaded, roomId]);

  // Initial sync helper
  const handleInitialSync = (state: SyncState) => {
    executeProgrammaticUpdate((player) => {
      if (state.videoId && state.videoId !== currentVideoId) {
        player.loadVideoById({
          videoId: state.videoId,
          startSeconds: state.currentTime || 0,
        });
        setCurrentVideoId(state.videoId);
      } else if (state.currentTime) {
        player.seekTo(state.currentTime, true);
      }

      if (state.playState === 'playing') {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    });
  };

  // 3. React to sync_state updates with DRIFT COMPENSATION
  useEffect(() => {
    if (!syncState || !playerRef.current || !isPlayerReadyRef.current) return;
    const player = playerRef.current;

    executeProgrammaticUpdate((p) => {
      // Handle Video Change
      if (syncState.videoId && syncState.videoId !== currentVideoId) {
        setCurrentVideoId(syncState.videoId);
        p.loadVideoById({
          videoId: syncState.videoId,
          startSeconds: syncState.currentTime || 0,
        });
      }

      // Drift compensation: only seek if drift > 1.2s
      const localTime = p.getCurrentTime ? p.getCurrentTime() : 0;
      const serverTime = syncState.currentTime;
      const drift = Math.abs(localTime - serverTime);

      if (drift > 1.2) {
        p.seekTo(serverTime, true);
      }

      const playerState = p.getPlayerState ? p.getPlayerState() : -1;
      if (syncState.playState === 'playing') {
        if (playerState !== window.YT.PlayerState.PLAYING) {
          p.playVideo();
        }
      } else {
        if (playerState !== window.YT.PlayerState.PAUSED) {
          p.pauseVideo();
        }
      }
    });
  }, [syncState, currentVideoId, executeProgrammaticUpdate]);

  // Periodic timer to update local progress scrubber when playing
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReadyRef.current) {
        const cur = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        const dur = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;
        setLocalCurrentTime(cur);
        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [duration]);

  // Controls Handlers
  const handlePlayPause = () => {
    if (!canControl) {
      onRequestControlOpen();
      return;
    }

    const isPlaying = syncState?.playState === 'playing';
    if (isPlaying) {
      socket.emit('pause', { roomId, currentTime: localCurrentTime });
    } else {
      socket.emit('play', { roomId, currentTime: localCurrentTime });
    }
  };

  const handleSkip = (seconds: number) => {
    if (!canControl) {
      onRequestControlOpen();
      return;
    }
    const target = Math.max(0, localCurrentTime + seconds);
    socket.emit('seek', { roomId, time: target });
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubberValue(val);
    setIsDraggingScrubber(true);
  };

  const handleScrubberCommit = () => {
    if (!canControl) {
      onNotification?.('Only Host or Moderator can scrub video. Request control to seek.', 'info');
      setIsDraggingScrubber(false);
      return;
    }
    socket.emit('seek', { roomId, time: scrubberValue });
    setIsDraggingScrubber(false);
  };

  const handleToggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current) {
      if (newVol === 0) {
        playerRef.current.mute();
        setIsMuted(true);
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(newVol);
        setIsMuted(false);
      }
    }
  };

  const handleManualResync = () => {
    socket.emit('request_sync', { roomId });
    onNotification?.('Re-syncing with Host stream clock...', 'info');
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const copyShareInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onNotification?.('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInlineVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineVideoUrl.trim()) return;

    if (canControl) {
      socket.emit('change_video', { roomId, videoId: inlineVideoUrl.trim() });
      setInlineVideoUrl('');
      onNotification?.('Changing video...', 'info');
    } else {
      socket.emit('request_control', {
        roomId,
        action: 'change_video',
        payload: { videoId: inlineVideoUrl.trim() },
        label: `Change video to ${inlineVideoUrl.trim()}`,
      });
      setInlineVideoUrl('');
      onNotification?.('Video change requested from Host', 'info');
    }
  };

  const isPlaying = syncState?.playState === 'playing';
  const effectiveCurrentTime = isDraggingScrubber ? scrubberValue : localCurrentTime;
  const progressPercent = duration > 0 ? (effectiveCurrentTime / duration) * 100 : 0;
  const hostColor = getTwitchUserColor(hostName || 'Host');

  return (
    <div ref={containerRef} className="flex flex-col w-full bg-[#0E0E10] text-[#EFEFF1]">
      {/* 1. 16:9 Black Video Theater Stage */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
        <div id="youtube-player-element" className="w-full h-full pointer-events-none" />

        {/* Click shield for participants/viewers to prevent accidental local desync */}
        {!canControl && (
          <div
            onClick={onRequestControlOpen}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent hover:bg-black/30 transition-colors flex items-center justify-center group"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#18181B]/95 backdrop-blur-md px-3.5 py-2 rounded-lg border border-[#2F2F35] text-xs font-semibold text-white shadow-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FFD700]" />
              <span>Synced with Host. Click to request control.</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Custom Twitch-Style Control Bar (directly beneath player) */}
      <div className="bg-[#18181B] border-b border-[#2F2F35] px-3 py-2 flex flex-col gap-2">
        {/* Scrubber Track */}
        <div className="relative flex items-center w-full group">
          <div className="w-full h-1 bg-[#2F2F35] rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#9146FF] transition-all duration-100"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={effectiveCurrentTime}
            onChange={handleScrubberChange}
            onMouseUp={handleScrubberCommit}
            onTouchEnd={handleScrubberCommit}
            disabled={!canControl}
            className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-xs">
          {/* Left Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handlePlayPause}
              className="p-1.5 hover:text-[#9146FF] text-white rounded transition-colors"
              title={canControl ? (isPlaying ? 'Pause (Space)' : 'Play (Space)') : 'Request Play/Pause'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {canControl && (
              <>
                <button
                  onClick={() => handleSkip(-10)}
                  className="p-1 text-[#ADADB8] hover:text-white transition-colors text-[10px] font-mono"
                  title="Rewind 10s"
                >
                  -10s
                </button>
                <button
                  onClick={() => handleSkip(15)}
                  className="p-1 text-[#ADADB8] hover:text-white transition-colors text-[10px] font-mono"
                  title="Forward 15s"
                >
                  +15s
                </button>
              </>
            )}

            {/* Volume */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={handleToggleMute}
                className="p-1 text-[#ADADB8] hover:text-white transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-[#2F2F35] accent-[#9146FF] rounded appearance-none cursor-pointer"
              />
            </div>

            {/* Live Synced Badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#9146FF]/20 border border-[#9146FF]/40 text-[#BF94FF] text-[10px] font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F593] animate-pulse" />
              <span>LIVE SYNCED</span>
            </div>

            {/* Time / Duration */}
            <span className="font-mono text-[11px] text-[#ADADB8]">
              {formatTime(effectiveCurrentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualResync}
              className="flex items-center gap-1 px-2 py-1 rounded bg-[#1F1F23] hover:bg-[#26262C] text-[#ADADB8] hover:text-white border border-[#2F2F35] text-[11px] font-medium transition-colors"
              title="Force re-align with room clock"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Re-sync</span>
            </button>

            <button
              onClick={handleFullscreen}
              className="p-1 text-[#ADADB8] hover:text-white transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Twitch Streamer Info Header (below control bar) */}
      <div className="px-4 py-4 sm:px-6 bg-[#0E0E10] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Host & Title */}
          <div className="flex items-start gap-3">
            {/* Host Avatar with Live ring */}
            <div className="relative shrink-0 mt-0.5">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-md ring-2 ring-[#9146FF] ring-offset-2 ring-offset-[#0E0E10]"
                style={{ backgroundColor: hostColor }}
              >
                {hostName ? hostName.charAt(0).toUpperCase() : 'H'}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-[#EB0400] text-white text-[8px] font-black uppercase rounded shadow">
                LIVE
              </span>
            </div>

            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>YouTube Watch Party — {currentVideoId}</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#ADADB8] pt-0.5">
                <span>Hosted by <span className="font-semibold text-white">{hostName || 'Host'}</span></span>
                <span>•</span>
                <span className="text-[#00F593] flex items-center gap-1">
                  👥 {viewerCount} watching
                </span>
              </div>
            </div>
          </div>

          {/* Share Invite Button */}
          <button
            onClick={copyShareInvite}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1F1F23] hover:bg-[#26262C] border border-[#2F2F35] text-xs font-semibold text-white transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Share Invite'}</span>
          </button>
        </div>

        {/* 4. Quick Inline Change Video Bar (Twitch Theater Style) */}
        <form onSubmit={handleInlineVideoSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Film className="w-4 h-4 text-[#ADADB8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                canControl
                  ? "Paste YouTube URLs to Change Video (e.g., https://youtu.be/...)"
                  : "Paste YouTube URL to request video change from Host..."
              }
              value={inlineVideoUrl}
              onChange={(e) => setInlineVideoUrl(e.target.value)}
              className="w-full bg-[#18181B] hover:bg-[#1F1F23] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={!inlineVideoUrl.trim()}
            className={`px-4 py-2 rounded text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 ${
              canControl
                ? 'bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white'
                : 'bg-[#1F1F23] hover:bg-[#26262C] text-white border border-[#2F2F35]'
            }`}
          >
            {canControl ? (
              <>
                <span>Change Video</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#BF94FF]" />
                <span>Request Video</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
