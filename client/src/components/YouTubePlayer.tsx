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
  Clock,
  X,
  Copy,
  ExternalLink,
  Users
} from 'lucide-react';
import { getTwitchUserColor } from '../utils/colors';
import { FloatingReactions } from './FloatingReactions';
import { RecommendedVideos } from './RecommendedVideos';
import { PlayerSettingsMenu } from './PlayerSettingsMenu';
import { addToWatchHistory } from '../utils/history';
import {
  isVideoLiked,
  toggleLikedVideo,
  isInWatchLater,
  toggleWatchLater,
  isChannelSubscribed,
  toggleChannelSubscription,
} from '../utils/library';
import { ChannelTarget } from './ChannelPage';

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
  onChannelClick?: (target: ChannelTarget) => void;
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
  onChannelClick,
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

  const [isWatchLater, setIsWatchLater] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareStartAtTime, setShareStartAtTime] = useState<boolean>(false);

  // Sync Liked & Watch Later & Subscription state when video/host changes
  useEffect(() => {
    if (currentVideoId) {
      setIsLiked(isVideoLiked(currentVideoId));
      setIsWatchLater(isInWatchLater(currentVideoId));
    }
    if (hostName) {
      setIsSubscribed(isChannelSubscribed({ title: hostName }));
    }
  }, [currentVideoId, hostName]);

  const handleToggleLike = () => {
    const vid = currentVideoId || syncState?.videoId;
    if (vid) {
      const liked = toggleLikedVideo({
        id: vid,
        title: syncState?.videoTitle || `YouTube Video (${vid})`,
        channel: hostName || 'Host',
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      });
      setIsLiked(liked);
      setLikeCount((prev) => (liked ? prev + 1 : Math.max(0, prev - 1)));
      if (liked && isDisliked) setIsDisliked(false);
      onNotification?.(liked ? 'Added to your Liked videos' : 'Removed from Liked videos', liked ? 'success' : 'info');
    }
  };

  const handleToggleDislike = () => {
    if (isDisliked) {
      setIsDisliked(false);
    } else {
      setIsDisliked(true);
      if (isLiked) {
        setIsLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleToggleSubscribe = () => {
    const next = toggleChannelSubscription({
      id: hostName || 'Host',
      title: hostName || 'Host',
    });
    setIsSubscribed(next);
    onNotification?.(next ? `Subscribed to ${hostName || 'channel'} with notifications on! 🔔` : 'Unsubscribed from channel', 'info');
  };

  const handleToggleWatchLater = () => {
    const vid = currentVideoId || syncState?.videoId;
    if (!vid) return;
    const saved = toggleWatchLater({
      id: vid,
      title: syncState?.videoTitle || `YouTube Video (${vid})`,
      channel: hostName || 'Host',
      thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    });
    setIsWatchLater(saved);
    onNotification?.(saved ? 'Saved to Watch Later' : 'Removed from Watch Later', saved ? 'success' : 'info');
  };

  const handleCycleSpeed = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (playerRef.current && playerRef.current.setPlaybackRate) {
      try {
        playerRef.current.setPlaybackRate(nextRate);
      } catch (err) {
        console.error('Speed change error:', err);
      }
    }
    onNotification?.(`Playback speed set to ${nextRate}x`, 'info');
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [quality, setQuality] = useState<string>('auto');
  const [captions, setCaptions] = useState<string>('off');
  const [ambientMode, setAmbientMode] = useState<boolean>(true);
  const [loopVideo, setLoopVideo] = useState<boolean>(false);

  // Track video in watch history whenever current video changes
  useEffect(() => {
    if (syncState?.videoId) {
      addToWatchHistory({
        videoId: syncState.videoId,
        title: syncState.videoTitle || `YouTube Video (${syncState.videoId})`,
        channel: hostName,
      });
    }
  }, [syncState?.videoId, syncState?.videoTitle, hostName]);

  const handleToggleCaptions = () => {
    const nextCaptions = captions === 'off' ? 'en' : 'off';
    setCaptions(nextCaptions);
    try {
      if (playerRef.current) {
        if (nextCaptions !== 'off') {
          if (playerRef.current.loadModule) playerRef.current.loadModule('captions');
          if (playerRef.current.setOption) {
            playerRef.current.setOption('captions', 'track', { languageCode: nextCaptions });
          }
        } else {
          if (playerRef.current.unloadModule) playerRef.current.unloadModule('captions');
        }
      }
    } catch (e) {}
    onNotification?.(nextCaptions === 'off' ? 'Subtitles turned off' : 'Subtitles turned on (English)', 'info');
  };

  const handleSelectQuality = (newQuality: string) => {
    setQuality(newQuality);
    try {
      if (playerRef.current && playerRef.current.setPlaybackQuality) {
        playerRef.current.setPlaybackQuality(newQuality);
      }
    } catch (e) {}
    onNotification?.(`Playback quality set to ${newQuality === 'auto' ? 'Auto (1080p)' : newQuality}`, 'info');
  };

  // Safely execute a programmatic update to the YT Player
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
        controls: 0,
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
          if (isProgrammaticUpdateRef.current) return;

          // Video Ended -> Trigger auto next in queue
          if (event.data === window.YT.PlayerState.ENDED) {
            socket.emit('video_ended', { roomId });
            return;
          }

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

      // Drift calculation
      const localTime = p.getCurrentTime ? p.getCurrentTime() : 0;
      const serverTime = syncState.currentTime;
      const drift = Math.abs(localTime - serverTime);
      setDriftSeconds(Math.round(drift * 100) / 100);

      // Drift compensation: only seek if drift > 1.2s
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

        // Live drift check if playing
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

  // Sync health pill status color
  const getSyncColor = () => {
    if (driftSeconds < 0.5) return 'text-[#00F593] border-[#00F593]/40 bg-[#00F593]/10';
    if (driftSeconds <= 1.2) return 'text-[#FFD700] border-[#FFD700]/40 bg-[#FFD700]/10';
    return 'text-[#EB0400] border-[#EB0400]/40 bg-[#EB0400]/10';
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full bg-[#0E0E10] text-[#EFEFF1]">
      {/* 1. 16:9 Black Video Theater Stage */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden shadow-2xl">
        {/* YouTube Ambient Mode Glow */}
        {ambientMode && (
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#9146FF]/25 via-[#BF94FF]/10 to-transparent blur-3xl -z-10 rounded-2xl pointer-events-none transition-opacity duration-500" />
        )}

        <div id="youtube-player-element" className="w-full h-full pointer-events-none" />

        {/* Floating Live Emoji Reactions Overlay */}
        <FloatingReactions reactions={reactions} />

        {/* Click to Unmute Pill if browser autoplay forces muted state */}
        {isMuted && isPlaying && (
          <button
            onClick={handleToggleMute}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] text-white text-xs font-bold shadow-2xl transition-all"
            title="Click to unmute video"
          >
            <VolumeX className="w-4 h-4" />
            <span>Audio is muted by browser • Click to Unmute</span>
          </button>
        )}

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
        {/* Scrubber Track with Hover Preview Tooltip */}
        <div
          onMouseMove={handleScrubberMouseMove}
          onMouseLeave={handleScrubberMouseLeave}
          className="relative flex items-center w-full group py-1 cursor-pointer"
        >
          {/* Hover Time Tooltip */}
          {hoveredTime !== null && hoverX !== null && (
            <div
              style={{ left: `${hoverX}px` }}
              className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#18181B] border border-[#2F2F35] text-[10px] font-mono text-[#BF94FF] pointer-events-none tabular-nums shadow"
            >
              {formatTime(hoveredTime)}
            </div>
          )}

          <div className="w-full h-1 group-hover:h-1.5 bg-[#2F2F35] rounded-full overflow-hidden relative transition-all duration-150">
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
              title={canControl ? (isPlaying ? 'Pause (Space)' : 'Play (Space)') : 'Request Play/Pause (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {canControl && (
              <>
                <button
                  onClick={() => handleSkip(-10)}
                  className="p-1 text-[#ADADB8] hover:text-white transition-colors text-[10px] font-mono tabular-nums"
                  title="Rewind 10s (←)"
                >
                  -10s
                </button>
                <button
                  onClick={() => handleSkip(15)}
                  className="p-1 text-[#ADADB8] hover:text-white transition-colors text-[10px] font-mono tabular-nums"
                  title="Forward 15s (→)"
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
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
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

            {/* Time / Duration with Tabular Numbers */}
            <span className="font-mono text-[11px] text-[#ADADB8] tabular-nums">
              {formatTime(effectiveCurrentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Telemetry Health Pill & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Sync Health & Ping Telemetry */}
            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-bold tabular-nums ${getSyncColor()}`}
              title={`Live playback drift: ${driftSeconds}s | Server ping: ${pingMs}ms`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span>{driftSeconds}s drift</span>
              <span>•</span>
              <span>{pingMs}ms</span>
            </div>

            {/* Subtitles / Closed Captions [CC] Button */}
            <button
              onClick={handleToggleCaptions}
              className={`px-1.5 py-0.5 rounded text-[11px] font-bold font-mono border transition-all ${
                captions !== 'off'
                  ? 'bg-[#9146FF]/30 border-[#9146FF] text-[#BF94FF]'
                  : 'bg-[#1F1F23] hover:bg-[#26262C] border-[#2F2F35] text-[#ADADB8] hover:text-white'
              }`}
              title={captions !== 'off' ? 'Turn off Subtitles (c)' : 'Turn on Subtitles (c)'}
            >
              CC
            </button>

            {/* Settings Gear Popover Button */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-1.5 rounded-md transition-colors ${
                  isSettingsOpen
                    ? 'bg-[#26262C] text-[#9146FF]'
                    : 'text-[#ADADB8] hover:text-white hover:bg-[#1F1F23]'
                }`}
                title="Settings (Speed, Quality, Captions, Ambient, Loop)"
              >
                <Settings className={`w-4 h-4 transition-transform duration-300 ${isSettingsOpen ? 'rotate-90 text-[#9146FF]' : ''}`} />
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
              title="Toggle Fullscreen (F)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. YouTube Video Title, Channel & Engagement Actions */}
      <div className="px-4 py-4 sm:px-6 bg-[#0E0E10] space-y-4">
        {/* Video Title */}
        <div className="space-y-1">
          <h2
            className="text-base sm:text-lg font-black text-white tracking-tight leading-snug line-clamp-2"
            title={syncState?.videoTitle || `YouTube Watch Party — ${currentVideoId}`}
          >
            {syncState?.videoTitle || `YouTube Watch Party — ${currentVideoId}`}
          </h2>
        </div>

        {/* Channel Row & Engagement Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-b border-[#2F2F35]/80 pb-4">
          {/* Left: Channel Info, Host and Subscribe */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
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

            <div
              onClick={() => onChannelClick?.({ name: hostName || 'YouTube' })}
              className="min-w-0 cursor-pointer group/host"
              title={`Visit ${hostName || 'Host'} channel`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-[#EFEFF1] group-hover/host:text-[#BF94FF] group-hover/host:underline truncate max-w-[160px] transition-colors">
                  {hostName || 'Host'}
                </span>
                <svg className="w-4 h-4 text-[#9146FF] fill-current shrink-0" viewBox="0 0 20 20" aria-label="Verified Streamer">
                  <title>Verified Streamer</title>
                  <path fillRule="evenodd" d="M10 1l2.5 1.5L15 2l1.5 2.5L19 5l-.5 3 2 2.5-2 2.5.5 3-2.5.5L15 18l-2.5-.5L10 19l-2.5-1.5L5 18l-1.5-2.5L1 15l.5-3L-.5 9.5l2-2.5-.5-3L3.5 4 5 1.5 7.5 2 10 1zm-1 12.5l5.5-5.5-1.5-1.5L9 10.5 7 8.5 5.5 10l3.5 3.5z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#ADADB8]">
                <span className="font-mono tabular-nums text-[#00F593] inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{viewerCount} in party</span>
                </span>
                <span>•</span>
                <span>2.48M followers</span>
              </div>
            </div>

            {/* Subscribe / Follow Button */}
            <button
              onClick={handleToggleSubscribe}
              className={`ml-2 h-[30px] px-3.5 rounded-[4px] text-xs font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5 ${
                isSubscribed
                  ? 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1]'
                  : 'bg-[#9146FF] hover:bg-[#772CE8] text-white shadow-sm'
              }`}
            >
              {isSubscribed ? (
                <>
                  <Bell className="w-3.5 h-3.5 text-[#00F593]" />
                  <span>Following</span>
                </>
              ) : (
                <span>Follow</span>
              )}
            </button>
          </div>

          {/* Right: Likes, Share, Autoplay, Host Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Like / Dislike Pill */}
            <div className="flex items-center bg-[#2F2F35] rounded-[4px] overflow-hidden text-xs h-[30px]">
              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-1.5 px-3 h-full hover:bg-[#3A3A42] transition-colors ${
                  isLiked ? 'text-[#BF94FF] font-bold' : 'text-[#EFEFF1]'
                }`}
                title="I like this"
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-mono tabular-nums text-[11px]">{likeCount.toLocaleString()}</span>
              </button>
              <div className="w-[1px] h-4 bg-[#1F1F23]" />
              <button
                onClick={handleToggleDislike}
                className={`px-2.5 h-full flex items-center hover:bg-[#3A3A42] transition-colors ${
                  isDisliked ? 'text-[#EB0400]' : 'text-[#ADADB8] hover:text-[#EFEFF1]'
                }`}
                title="I dislike this"
              >
                <ThumbsDown className={`w-3.5 h-3.5 ${isDisliked ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Autoplay Toggle */}
            <button
              onClick={() => {
                setAutoplayNext(!autoplayNext);
                onNotification?.(autoplayNext ? 'Autoplay is turned off' : 'Autoplay is turned on', 'info');
              }}
              className={`flex items-center gap-1.5 px-3 h-[30px] rounded-[4px] text-xs font-semibold transition-all ${
                autoplayNext
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#ADADB8] hover:text-[#EFEFF1]'
              }`}
              title="Auto-play next video when current video ends"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px]">Autoplay: {autoplayNext ? 'ON' : 'OFF'}</span>
            </button>

            {/* Host Controls */}
            {isHost && (
              <>
                <button
                  onClick={handleToggleLock}
                  className={`flex items-center gap-1.5 px-3 h-[30px] rounded-[4px] text-xs font-semibold transition-all active:scale-[0.98] ${
                    isLocked
                      ? 'bg-[#EB0400]/20 border border-[#EB0400] text-[#EB0400]'
                      : 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#ADADB8] hover:text-[#EFEFF1]'
                  }`}
                  title={isLocked ? 'Room is locked to new joiners. Click to unlock.' : 'Click to lock room from new joiners'}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{isLocked ? 'Locked' : 'Lock Room'}</span>
                </button>

                <button
                  onClick={handleToggleOpenControls}
                  className={`flex items-center gap-1.5 px-3 h-[30px] rounded-[4px] text-xs font-semibold transition-all active:scale-[0.98] ${
                    isOpenControl
                      ? 'bg-[#00F593]/20 border border-[#00F593] text-[#00F593]'
                      : 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#ADADB8] hover:text-[#EFEFF1]'
                  }`}
                  title={isOpenControl ? 'All members can control playback. Click to restrict.' : 'Click to allow all participants to control video'}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>{isOpenControl ? 'Open Controls ON' : 'Open Controls'}</span>
                </button>
              </>
            )}

            {/* Watch Later / Save */}
            <button
              onClick={handleToggleWatchLater}
              className={`flex items-center gap-1.5 px-3 h-[30px] rounded-[4px] text-xs font-semibold transition-all active:scale-[0.98] ${
                isWatchLater
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1]'
              }`}
              title="Save to Watch Later"
            >
              {isWatchLater ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Clock className="w-3.5 h-3.5" />}
              <span>{isWatchLater ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share Invite & Timestamp */}
            <div className="relative">
              <button
                onClick={() => setIsShareModalOpen(!isShareModalOpen)}
                className="flex items-center gap-1.5 px-3 h-[30px] rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] active:scale-[0.98] text-xs font-semibold text-[#EFEFF1] transition-all shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>

              {isShareModalOpen && (
                <div className="absolute right-0 bottom-10 w-80 bg-[#18181B] border border-[#3A3A42] rounded-[6px] shadow-2xl p-3.5 z-50 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2F2F35] pb-2">
                    <span className="text-xs font-bold text-white">Share Watch Party / Video</span>
                    <button
                      onClick={() => setIsShareModalOpen(false)}
                      className="text-[#ADADB8] hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        copyShareInvite();
                        setIsShareModalOpen(false);
                      }}
                      className="w-full h-[32px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center justify-between transition-colors"
                    >
                      <span>Copy Watch Party Invite Link</span>
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {currentVideoId && (
                      <div className="bg-[#1F1F23] border border-[#2F2F35] rounded-[4px] p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-[#ADADB8] truncate">
                            {`https://youtu.be/${currentVideoId}${
                              shareStartAtTime ? `?t=${Math.floor(localCurrentTime)}` : ''
                            }`}
                          </span>
                          <button
                            onClick={() => {
                              const ytUrl = `https://youtu.be/${currentVideoId}${
                                shareStartAtTime ? `?t=${Math.floor(localCurrentTime)}` : ''
                              }`;
                              navigator.clipboard.writeText(ytUrl);
                              onNotification?.('YouTube link copied!', 'success');
                              setIsShareModalOpen(false);
                            }}
                            className="px-2 py-1 rounded-[2px] bg-[#2F2F35] hover:bg-[#3A3A42] text-white text-[10px] font-semibold shrink-0 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>

                        <label className="flex items-center gap-2 text-[11px] text-[#ADADB8] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={shareStartAtTime}
                            onChange={(e) => setShareStartAtTime(e.target.checked)}
                            className="accent-[#9146FF]"
                          />
                          <span>Start at {formatTime(localCurrentTime)}</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible YouTube Description Box */}
        <div
          onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
          className="bg-[#18181B] hover:bg-[#1F1F23] border border-[#2F2F35] rounded-xl p-3.5 text-xs text-[#EFEFF1] cursor-pointer transition-colors space-y-2 select-none"
        >
          <div className="flex items-center gap-2 font-bold font-mono text-[11px] text-[#ADADB8] flex-wrap">
            <span className="text-white">1,482,903 views</span>
            <span>•</span>
            <span>Streamed live in Watch Party</span>
            <span>•</span>
            <span className="text-[#9146FF]">#WatchSync</span>
            <span className="text-[#9146FF]">#YouTubeTheater</span>
            <span className="text-[#9146FF]">#SyncParty</span>
          </div>

          <p className={`text-xs text-[#ADADB8] leading-relaxed ${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
            Welcome to the official real-time synchronized YouTube Watch Party! Everyone in this room experiences 100% frame-accurate playback, shared queue management, instant reactions, and low-latency party chat. Host: <span className="text-white font-semibold">{hostName}</span> • Party Code: <span className="font-mono font-bold text-white">{roomId}</span>.
          </p>

          <button
            type="button"
            className="font-bold text-white text-[11px] hover:text-[#BF94FF] flex items-center gap-1 pt-0.5"
          >
            {isDescriptionExpanded ? (
              <>
                <span>Show less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>...more</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Quick Inline Change Video Bar */}
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
            className={`px-4 py-2 rounded text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-[0.98] ${
              canControl
                ? 'bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white'
                : 'bg-[#1F1F23] hover:bg-[#26262C] text-white border border-[#2F2F35]'
            }`}
          >
            {canControl ? (
              <span>Change Video</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-[#BF94FF]" />
                <span>Request Video</span>
              </>
            )}
          </button>
        </form>

        {/* 5. Recommended / Suggested Videos Shelf */}
        <RecommendedVideos
          roomId={roomId}
          canControl={canControl}
          currentUserRole={role}
          currentVideoId={currentVideoId}
          onNotification={onNotification}
          onChannelClick={onChannelClick}
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
