import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SyncState, Role, LiveReaction } from '../types';
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
  FastForward,
  Lock,
  Unlock,
  Sliders,
  ShieldCheck,
  Tv,
  ThumbsUp,
  ThumbsDown,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gauge,
  Settings,
  Subtitles,
  Repeat,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { getTwitchUserColor } from '../utils/colors';
import { FloatingReactions } from './FloatingReactions';
import { RecommendedVideos } from './RecommendedVideos';
import { PlayerSettingsMenu } from './PlayerSettingsMenu';
import { addToWatchHistory } from '../utils/history';

interface YouTubePlayerProps {
  roomId: string;
  role: Role;
  syncState: SyncState | null;
  canControl: boolean;
  hostName: string;
  viewerCount: number;
  reactions: LiveReaction[];
  pingMs: number;
  isLocked: boolean;
  isOpenControl: boolean;
  onRequestControlOpen: () => void;
  onPlaybackTimeUpdate?: (time: number) => void;
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
  reactions,
  pingMs,
  isLocked,
  isOpenControl,
  onRequestControlOpen,
  onPlaybackTimeUpdate,
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
  const [driftSeconds, setDriftSeconds] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState<boolean>(false);
  const [scrubberValue, setScrubberValue] = useState<number>(0);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [inlineVideoUrl, setInlineVideoUrl] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isDisliked, setIsDisliked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(142850);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(true);

  const socket = getSocket();
  const isHost = role === 'host';

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount((prev) => prev - 1);
    } else {
      setIsLiked(true);
      setLikeCount((prev) => prev + 1);
      if (isDisliked) setIsDisliked(false);
      onNotification?.('Added to your Liked videos', 'success');
    }
  };

  const handleToggleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => prev - 1);
      }
    }
  };

  const handleToggleSubscribe = () => {
    setIsSubscribed((prev) => {
      const next = !prev;
      onNotification?.(next ? 'Subscribed to channel with notifications on! 🔔' : 'Unsubscribed from channel', 'info');
      return next;
    });
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>('auto');
  const [captions, setCaptions] = useState<string>('off');
  const [ambientMode, setAmbientMode] = useState<boolean>(true);
  const [loopVideo, setLoopVideo] = useState<boolean>(false);

  const handleToggleCaptions = () => {
    const nextCap = captions === 'off' ? 'en' : 'off';
    setCaptions(nextCap);
    onNotification?.(nextCap === 'off' ? 'Subtitles turned off' : 'Subtitles turned on (EN)', 'info');
  };

  const handleSelectQuality = (q: string) => {
    setQuality(q);
    if (playerRef.current && playerRef.current.setPlaybackQuality) {
      try {
        playerRef.current.setPlaybackQuality(q);
      } catch (err) {}
    }
    onNotification?.(`Quality set to ${q}`, 'info');
  };

  // Programmatic update guard
  const executeProgrammaticUpdate = useCallback((action: (player: any) => void) => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    isProgrammaticUpdateRef.current = true;
    clearTimeout(programmaticTimeoutRef.current);

    action(playerRef.current);

    programmaticTimeoutRef.current = setTimeout(() => {
      isProgrammaticUpdateRef.current = false;
    }, 400);
  }, []);

  // 1. Load YouTube IFrame API Script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsApiLoaded(true);
      };
    } else {
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsApiLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, []);

  // 2. Initialize YouTube Player
  useEffect(() => {
    if (!isApiLoaded || playerRef.current) return;

    const initialId = syncState?.videoId || 'QdBZY2fkU-0';
    setCurrentVideoId(initialId);

    const onPlayerReady = (event: any) => {
      isPlayerReadyRef.current = true;
      playerRef.current = event.target;
      try {
        event.target.setVolume(volume);
        const dur = event.target.getDuration();
        if (dur) setDuration(dur);
      } catch (err) {}

      if (syncState) {
        handleInitialSync(syncState);
      }
    };

    const onPlayerStateChange = (event: any) => {
      if (isProgrammaticUpdateRef.current) return;

      const player = event.target;
      const curTime = player.getCurrentTime ? player.getCurrentTime() : 0;
      setLocalCurrentTime(curTime);

      if (event.data === window.YT.PlayerState.PLAYING) {
        if (canControl) {
          socket.emit('play', { roomId, currentTime: curTime });
        }
      } else if (event.data === window.YT.PlayerState.PAUSED) {
        if (canControl) {
          socket.emit('pause', { roomId, currentTime: curTime });
        }
      } else if (event.data === window.YT.PlayerState.ENDED) {
        if (role === 'host') {
          socket.emit('video_ended', { roomId });
        }
      }
    };

    try {
      new window.YT.Player('youtube-player-element', {
        videoId: initialId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    } catch (e) {
      console.error('Failed to instantiate YouTube player:', e);
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
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
      if (syncState.videoId && syncState.videoId !== currentVideoId) {
        setCurrentVideoId(syncState.videoId);
        p.loadVideoById({
          videoId: syncState.videoId,
          startSeconds: syncState.currentTime || 0,
        });
        if (syncState.videoTitle) {
          addToWatchHistory({
            videoId: syncState.videoId,
            title: syncState.videoTitle,
          });
        }
      }

      const localTime = p.getCurrentTime ? p.getCurrentTime() : 0;
      const serverTime = syncState.currentTime;
      const drift = Math.abs(localTime - serverTime);
      setDriftSeconds(Math.round(drift * 100) / 100);

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

  // Periodic timer for scrubber and drift calculation
  useEffect(() => {
    const timer = setInterval(() => {
      if (playerRef.current && isPlayerReadyRef.current) {
        const cur = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        const dur = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;
        setLocalCurrentTime(cur);
        onPlaybackTimeUpdate?.(cur);

        if (dur > 0 && dur !== duration) {
          setDuration(dur);
        }

        if (syncState?.playState === 'playing') {
          const elapsedSinceLastUpdate = (Date.now() - syncState.lastUpdatedAt) / 1000;
          const expectedTime = syncState.currentTime + elapsedSinceLastUpdate;
          const drift = Math.abs(cur - expectedTime);
          setDriftSeconds(Math.round(drift * 100) / 100);
        } else if (syncState) {
          const drift = Math.abs(cur - syncState.currentTime);
          setDriftSeconds(Math.round(drift * 100) / 100);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [duration, syncState, onPlaybackTimeUpdate]);

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

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.min(1, Math.max(0, x / rect.width));
    setHoveredTime(percent * (duration || 100));
    setHoverX(x);
  };

  const handleScrubberMouseLeave = () => {
    setHoveredTime(null);
    setHoverX(null);
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

  const handleToggleLock = () => {
    if (!isHost) return;
    socket.emit('update_room_settings', {
      roomId,
      isLocked: !isLocked,
    });
    onNotification?.(!isLocked ? 'Room is now locked to new joiners' : 'Room unlocked', 'info');
  };

  const handleToggleOpenControls = () => {
    if (!isHost) return;
    socket.emit('update_room_settings', {
      roomId,
      isOpenControl: !isOpenControl,
    });
    onNotification?.(!isOpenControl ? 'Open-Party Mode ON: All participants can control playback' : 'Restricted Controls Mode restored', 'info');
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

  // Mint Emerald Sync Health Status
  const getSyncColor = () => {
    if (driftSeconds < 0.5) return 'text-[#2EE59D] border-[#2EE59D]/40 bg-[#2EE59D]/10';
    if (driftSeconds <= 1.2) return 'text-[#FFA751] border-[#FFA751]/40 bg-[#FFA751]/10';
    return 'text-[#FF5E62] border-[#FF5E62]/40 bg-[#FF5E62]/10';
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full bg-[#131419] text-[#EFEFF1] p-4 lg:p-6 space-y-4">
      {/* 1. 16:9 Rounded Theater Player Frame (Matching Reference Blueprint) */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.08] flex items-center justify-center group/theater">
        {/* Warm Ambient Coral Glow Behind Player */}
        {ambientMode && (
          <div className="absolute -inset-6 bg-gradient-to-r from-[#FF5E62]/20 via-[#FF9966]/15 to-transparent blur-3xl -z-10 rounded-2xl pointer-events-none transition-opacity duration-500" />
        )}

        <div id="youtube-player-element" className="w-full h-full pointer-events-none" />

        {/* Floating Live Emoji Reactions Overlay */}
        <FloatingReactions reactions={reactions} />

        {/* Click to Unmute Pill if browser autoplay forces muted state */}
        {isMuted && isPlaying && (
          <button
            onClick={handleToggleMute}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold shadow-2xl transition-all"
            title="Click to unmute video"
          >
            <VolumeX className="w-4 h-4" />
            <span>Audio is muted by browser • Click to Unmute</span>
          </button>
        )}

        {/* Click shield for participants/viewers */}
        {!canControl && (
          <div
            onClick={onRequestControlOpen}
            className="absolute inset-0 z-10 cursor-pointer bg-transparent hover:bg-black/30 transition-colors flex items-center justify-center group"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#1B1D24]/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-white shadow-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FFA751]" />
              <span>Synced with Host. Click to request control.</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Custom Scrubber & Playback Controls Bar (Directly matching reference UI) */}
      <div className="bg-[#1B1D24] border border-white/[0.08] rounded-2xl p-4 shadow-xl shadow-black/30 space-y-3">
        {/* Scrubber Track with Timestamps & Coral Gradient Fill */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-zinc-400 tabular-nums w-12 text-right">
            {formatTime(effectiveCurrentTime)}
          </span>

          <div
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={handleScrubberMouseLeave}
            className="relative flex-1 flex items-center group py-2 cursor-pointer"
          >
            {/* Hover Time Tooltip */}
            {hoveredTime !== null && hoverX !== null && (
              <div
                style={{ left: `${hoverX}px` }}
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-[#242731] border border-white/[0.08] text-[10px] font-mono text-[#FF9966] pointer-events-none tabular-nums shadow-lg"
              >
                {formatTime(hoveredTime)}
              </div>
            )}

            <div className="w-full h-1.5 group-hover:h-2 bg-[#242731] rounded-full overflow-hidden relative transition-all duration-150">
              <div
                className="h-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] transition-all duration-100"
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

          <span className="font-mono text-xs font-bold text-zinc-400 tabular-nums w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Left: Play/Pause, Skips, Title & Metadata */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Play/Pause Button in Tactile Rounded Box */}
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-xl bg-[#242731] hover:bg-[#2C303D] active:scale-[0.98] border border-white/[0.08] hover:border-[#FF5E62]/40 text-white flex items-center justify-center transition-all shadow-md shrink-0"
              title={canControl ? (isPlaying ? 'Pause (Space)' : 'Play (Space)') : 'Request Play/Pause (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current text-[#FF9966]" /> : <Play className="w-5 h-5 fill-current ml-0.5 text-white" />}
            </button>

            {canControl && (
              <div className="hidden md:flex items-center gap-1.5">
                <button
                  onClick={() => handleSkip(-10)}
                  className="px-2 py-1 rounded-lg bg-[#242731] hover:bg-[#2C303D] text-zinc-400 hover:text-white border border-white/[0.08] text-[10px] font-mono tabular-nums transition-colors"
                  title="Rewind 10s (←)"
                >
                  -10s
                </button>
                <button
                  onClick={() => handleSkip(15)}
                  className="px-2 py-1 rounded-lg bg-[#242731] hover:bg-[#2C303D] text-zinc-400 hover:text-white border border-white/[0.08] text-[10px] font-mono tabular-nums transition-colors"
                  title="Forward 15s (→)"
                >
                  +15s
                </button>
              </div>
            )}

            {/* Video Title & Host Metadata */}
            <div className="min-w-0">
              <h3
                className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md"
                title={syncState?.videoTitle || `YouTube Watch Party — ${currentVideoId}`}
              >
                {syncState?.videoTitle || `YouTube Watch Party — ${currentVideoId}`}
              </h3>
              <p className="text-[11px] text-zinc-400 truncate">
                Hosted by <span className="text-white font-semibold">{hostName}</span> • {viewerCount} Friends Online
              </p>
            </div>
          </div>

          {/* Right: Telemetry Pill, Change Video CTA, Settings & Fullscreen */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
            {/* Mint Synced Telemetry Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold tabular-nums shadow-sm ${getSyncColor()}`}
              title={`Live playback drift: ${driftSeconds}s | Server ping: ${pingMs}ms`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              <span>Synced • {pingMs}ms</span>
            </div>

            {/* Change Video Warm Orange Pill Button */}
            <button
              onClick={() => {
                if (canControl) {
                  const input = prompt('Enter YouTube Video URL or ID:');
                  if (input && input.trim()) {
                    socket.emit('change_video', { roomId, videoId: input.trim() });
                    onNotification?.('Updating video...', 'info');
                  }
                } else {
                  onRequestControlOpen();
                }
              }}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#FF8C42] to-[#FFA751] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#FF8C42]/20 transition-all flex items-center gap-1.5"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Change Video</span>
            </button>

            {/* Volume */}
            <div className="hidden lg:flex items-center gap-1.5 bg-[#242731] border border-white/[0.08] px-2.5 py-1 rounded-xl">
              <button
                onClick={handleToggleMute}
                className="text-zinc-400 hover:text-white transition-colors"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 bg-[#1B1D24] accent-[#FF5E62] rounded appearance-none cursor-pointer"
              />
            </div>

            {/* CC Subtitles Button */}
            <button
              onClick={handleToggleCaptions}
              className={`px-2 py-1 rounded-xl text-[11px] font-bold font-mono border transition-all ${
                captions !== 'off'
                  ? 'bg-[#FF5E62]/20 border-[#FF5E62] text-[#FF9966]'
                  : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              title={captions !== 'off' ? 'Turn off Subtitles (c)' : 'Turn on Subtitles (c)'}
            >
              CC
            </button>

            {/* Settings Gear Popover Button */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-xl border border-white/[0.08] transition-colors ${
                  isSettingsOpen
                    ? 'bg-[#2C303D] text-[#FF9966]'
                    : 'bg-[#242731] text-zinc-400 hover:text-white hover:bg-[#2C303D]'
                }`}
                title="Settings (Speed, Quality, Captions, Ambient)"
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-[#FF9966]' : ''}`} />
              </button>

              <PlayerSettingsMenu
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                playbackRate={playbackRate}
                onSelectSpeed={(speed) => {
                  setPlaybackRate(speed);
                  try {
                    playerRef.current?.setPlaybackRate(speed);
                  } catch (e) {}
                  onNotification?.(`Playback speed set to ${speed}x`, 'info');
                }}
                quality={quality}
                onSelectQuality={handleSelectQuality}
                captions={captions}
                onSelectCaptions={(cap) => {
                  setCaptions(cap);
                  onNotification?.(cap === 'off' ? 'Subtitles turned off' : `Subtitles set to ${cap.toUpperCase()}`, 'info');
                }}
                ambientMode={ambientMode}
                onToggleAmbient={() => {
                  setAmbientMode(!ambientMode);
                  onNotification?.(ambientMode ? 'Ambient mode disabled' : 'Ambient mode enabled', 'info');
                }}
                loop={loopVideo}
                onToggleLoop={() => {
                  setLoopVideo(!loopVideo);
                  onNotification?.(loopVideo ? 'Video loop disabled' : 'Video loop enabled', 'info');
                }}
              />
            </div>

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="p-2 bg-[#242731] hover:bg-[#2C303D] border border-white/[0.08] text-zinc-400 hover:text-white rounded-xl transition-colors"
              title="Toggle Fullscreen (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Host Controls Strip (Lock Room, Open Controls, Share Invite) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1B1D24] border border-white/[0.08] rounded-2xl px-5 py-3">
        {/* Host Toggles */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isHost ? (
            <>
              <button
                onClick={handleToggleLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                  isLocked
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300 hover:text-white'
                }`}
                title={isLocked ? 'Room is locked to new joiners. Click to unlock.' : 'Click to lock room from new joiners'}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Locked Room' : 'Lock Room'}</span>
              </button>

              <button
                onClick={handleToggleOpenControls}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                  isOpenControl
                    ? 'bg-[#2EE59D]/15 border-[#2EE59D]/40 text-[#2EE59D]'
                    : 'bg-[#242731] hover:bg-[#2C303D] border-white/[0.08] text-zinc-300 hover:text-white'
                }`}
                title={isOpenControl ? 'All members can control playback. Click to restrict.' : 'Click to allow all participants to control video'}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isOpenControl ? 'Open Controls ON' : 'Open Controls'}</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isLocked ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                {isLocked ? '🔒 Room Locked' : '🔓 Open Room'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${isOpenControl ? 'bg-[#2EE59D]/15 text-[#2EE59D] border-[#2EE59D]/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                {isOpenControl ? '🎛️ Open Controls' : '🛡️ Host Controls'}
              </span>
            </div>
          )}
        </div>

        {/* Share Invite & Re-Sync */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualResync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#242731] hover:bg-[#2C303D] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors"
            title="Force re-align with room clock"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-sync</span>
          </button>

          <button
            onClick={copyShareInvite}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#FF5E62]/20 transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied!' : 'Share Invite'}</span>
          </button>
        </div>
      </div>

      {/* 4. Suggested & Recommended Videos Shelf */}
      <div className="bg-[#1B1D24] border border-white/[0.08] rounded-2xl p-5 shadow-xl shadow-black/30">
        <RecommendedVideos
          roomId={roomId}
          canControl={canControl}
          currentUserRole={role}
          currentVideoId={currentVideoId}
          onNotification={onNotification}
        />
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
