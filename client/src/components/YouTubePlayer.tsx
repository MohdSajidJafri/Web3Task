import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SyncState, Role } from '../types';
import { getSocket } from '../services/socket';
import { RefreshCw, Play, Pause, AlertCircle, ShieldCheck } from 'lucide-react';

interface YouTubePlayerProps {
  roomId: string;
  role: Role;
  syncState: SyncState | null;
  canControl: boolean;
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
  onRequestControlOpen,
  onNotification,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const isProgrammaticUpdateRef = useRef<boolean>(false);
  const programmaticTimeoutRef = useRef<any>(null);

  const [playerStatus, setPlayerStatus] = useState<string>('Initializing player...');
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isApiLoaded, setIsApiLoaded] = useState<boolean>(false);

  // Helper to safely execute a programmatic update to the YT Player
  const executeProgrammaticUpdate = useCallback((updateFn: (player: any) => void) => {
    if (!playerRef.current || !isPlayerReadyRef.current) return;
    
    // Set flag to prevent echo loops
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
        controls: canControl ? 1 : 0, // disable default controls for viewers/participants to avoid local desync
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
          setPlayerStatus('Player Ready');

          // If we already received syncState before player was ready, sync now
          if (syncState) {
            handleInitialSync(syncState);
          }
        },
        onStateChange: (event: any) => {
          // ANTI-ECHO LOOP PROTECTION:
          // Ignore state changes triggered programmatically via sync_state
          if (isProgrammaticUpdateRef.current) {
            return;
          }

          // If participant or viewer somehow interacts locally, prevent it or warn
          if (!canControl) {
            return;
          }

          const socket = getSocket();
          const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;

          if (event.data === window.YT.PlayerState.PLAYING) {
            socket.emit('play', { roomId, currentTime });
            setPlayerStatus('Playing');
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            socket.emit('pause', { roomId, currentTime });
            setPlayerStatus('Paused');
          } else if (event.data === window.YT.PlayerState.BUFFERING) {
            setPlayerStatus('Buffering');
          }
        },
        onError: (e: any) => {
          console.warn('YouTube Player error:', e);
          setPlayerStatus('Playback error / Video unavailable');
          if (onNotification) {
            onNotification('YouTube video cannot be embedded or is unavailable', 'error');
          }
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
        setPlayerStatus('Playing');
      } else {
        player.pauseVideo();
        setPlayerStatus('Paused');
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

      // Handle Play / Pause / Drift compensation
      const localTime = p.getCurrentTime ? p.getCurrentTime() : 0;
      const serverTime = syncState.currentTime;
      const drift = Math.abs(localTime - serverTime);

      // Only seek if drift exceeds threshold (1.2 seconds) to avoid constant jitter
      if (drift > 1.2) {
        p.seekTo(serverTime, true);
      }

      const playerState = p.getPlayerState ? p.getPlayerState() : -1;

      if (syncState.playState === 'playing') {
        if (playerState !== window.YT.PlayerState.PLAYING) {
          p.playVideo();
        }
        setPlayerStatus(`Playing @ ${formatTime(serverTime)}`);
      } else {
        if (playerState !== window.YT.PlayerState.PAUSED) {
          p.pauseVideo();
        }
        setPlayerStatus(`Paused @ ${formatTime(serverTime)}`);
      }
    });
  }, [syncState, currentVideoId, executeProgrammaticUpdate]);

  // Manual re-sync action
  const handleManualResync = () => {
    const socket = getSocket();
    socket.emit('request_sync', { roomId });
    if (onNotification) {
      onNotification('Re-syncing with room host...', 'info');
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex flex-col">
      {/* 16:9 Video Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
        <div id="youtube-player-element" className="w-full h-full" />

        {/* Protection Click-Overlay for Participants/Viewers to prevent accidental local desync */}
        {!canControl && (
          <div
            onClick={onRequestControlOpen}
            title="Click to request control from Host"
            className="absolute inset-0 z-10 cursor-pointer bg-transparent hover:bg-slate-950/20 transition-colors flex items-center justify-center group"
          >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-200 shadow-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Participant mode (Synced with Host). Click to request control.</span>
            </div>
          </div>
        )}
      </div>

      {/* Sync Status Bar */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                syncState?.playState === 'playing' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                syncState?.playState === 'playing' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
          </span>
          <span className="font-semibold text-slate-200">
            {syncState?.playState === 'playing' ? 'In Sync • Playing' : 'In Sync • Paused'}
          </span>
          {syncState?.updatedBy && (
            <span className="text-slate-400 hidden sm:inline">
              (by <span className="text-slate-300 font-medium">{syncState.updatedBy}</span>)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-mono">
            {formatTime(syncState?.currentTime || 0)}
          </span>

          <button
            onClick={handleManualResync}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs font-medium border border-slate-700"
            title="Force re-sync playback with server"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-sync</span>
          </button>

          {!canControl && (
            <button
              onClick={onRequestControlOpen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/30 transition-all font-medium text-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
              <span>Request Control</span>
            </button>
          )}
        </div>
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
