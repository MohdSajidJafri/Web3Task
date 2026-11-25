import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  LogOut,
  Crown,
  Shield,
  User,
  Search,
  Film,
  Send,
  HelpCircle,
  Compass,
  Bell,
  MessageSquare,
  Diamond,
  Loader2,
  Play,
  Plus,
  X,
  ExternalLink,
} from 'lucide-react';
import { Role } from '../types';
import { getSocket } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';
import { searchYouTubeVideos, YouTubeSearchResult } from '../services/youtube';

interface RoomHeaderProps {
  roomId?: string;
  userRole?: Role;
  username: string;
  inRoom: boolean;
  canControl?: boolean;
  onLeaveRoom?: () => void;
  onRequestControlOpen?: () => void;
  onOpenShortcuts?: () => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onStartPartyWithVideo?: (videoId: string, title?: string) => void;
  onSearchPageNavigate?: (query: string) => void;
  onLogoClick?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomId,
  userRole = 'participant',
  username,
  inRoom,
  canControl = false,
  onLeaveRoom,
  onRequestControlOpen,
  onOpenShortcuts,
  onNotification,
  onStartPartyWithVideo,
  onSearchPageNavigate,
  onLogoClick,
}) => {
  const [copied, setCopied] = useState(false);
  const [videoInput, setVideoInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  // Close search dropdown on click outside or Esc
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSearchOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const copyInviteLink = () => {
    if (!roomId) return;
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    onNotification?.('Invite link copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Perform YouTube search
  const performSearch = async (term: string) => {
    if (!term || !term.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }
    setIsSearching(true);
    setIsSearchOpen(true);
    try {
      const results = await searchYouTubeVideos(term.trim());
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search for lobby search bar
  useEffect(() => {
    if (!searchQuery.trim() || inRoom) return;
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, inRoom]);

  // When in a room, handle the top video input
  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim() || !roomId) return;

    const trimmed = videoInput.trim();
    // If it's a direct URL or 11-char ID, change directly
    const isDirectUrlOrId =
      trimmed.includes('youtube.com') ||
      trimmed.includes('youtu.be') ||
      /^[a-zA-Z0-9_-]{11}$/.test(trimmed);

    if (isDirectUrlOrId) {
      if (canControl) {
        socket.emit('change_video', { roomId, videoId: trimmed });
        setVideoInput('');
        onNotification?.('Loading video into party...', 'info');
      } else {
        socket.emit('request_control', {
          roomId,
          action: 'change_video',
          payload: { videoId: trimmed },
          label: `Change video to ${trimmed}`,
        });
        setVideoInput('');
        onNotification?.('Video change requested from Host', 'info');
      }
      setIsSearchOpen(false);
    } else {
      // It's a search term: hitting Enter navigates to full YouTube Search Results page!
      setIsSearchOpen(false);
      if (onSearchPageNavigate) {
        onSearchPageNavigate(trimmed);
      } else {
        performSearch(trimmed);
      }
    }
  };

  const handleLobbySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setIsSearchOpen(false);
    if (onSearchPageNavigate) {
      onSearchPageNavigate(trimmed);
    } else {
      performSearch(trimmed);
    }
  };

  const handlePlayFromSearch = (videoId: string, title: string) => {
    if (inRoom && roomId) {
      if (canControl) {
        socket.emit('change_video', { roomId, videoId });
        onNotification?.(`Playing: ${title}`, 'success');
      } else {
        socket.emit('request_control', {
          roomId,
          action: 'change_video',
          payload: { videoId },
          label: `Change video to ${title}`,
        });
        onNotification?.(`Requested host to play: ${title}`, 'info');
      }
    } else {
      onStartPartyWithVideo?.(videoId, title);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
    setVideoInput('');
  };

  const handleQueueFromSearch = (videoId: string, title: string) => {
    if (inRoom && roomId) {
      if (canControl) {
        socket.emit('queue_add', { roomId, videoId });
        onNotification?.(`Added to Queue: ${title}`, 'success');
      } else {
        socket.emit('queue_suggest', { roomId, videoId });
        onNotification?.(`Suggested to Queue: ${title}`, 'info');
      }
    }
    setIsSearchOpen(false);
  };

  const renderRoleBadge = () => {
    switch (userRole) {
      case 'host':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#9146FF] text-white shadow-sm">
            <Crown className="w-3 h-3 text-[#FFD700] fill-current" />
            <span>HOST</span>
          </span>
        );
      case 'moderator':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-bold bg-[#00AD03] text-white shadow-sm">
            <Shield className="w-3 h-3 text-white fill-current" />
            <span>MOD</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#2F2F35] text-[#ADADB8]">
            <User className="w-3 h-3" />
            <span>VIEWER</span>
          </span>
        );
    }
  };

  const userColor = getTwitchUserColor(username || 'User');

  return (
    <header className="h-[50px] bg-[#18181B] border-b border-[#2D2D35] px-3 sm:px-4 flex items-center justify-between gap-3 select-none z-40 shrink-0">
      {/* Left: Twitch Official Glitch Logo & Links */}
      <div className="flex items-center gap-4 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            if (onLogoClick) {
              e.preventDefault();
              setIsSearchOpen(false);
              onLogoClick();
            }
          }}
          className="flex items-center gap-2 group cursor-pointer"
          title="Twitch Watch Party Home"
        >
          {/* Official Twitch Glitch Logo SVG */}
          <div className="w-8 h-8 rounded-[4px] bg-[#9146FF] group-hover:bg-[#772CE8] flex items-center justify-center transition-colors shadow-md shadow-[#9146FF]/30">
            <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M11.5 6.5h1.8v5h-1.8zm4.5 0h1.8v5H16zM6 2L2 6v14h5v4l4-4h3.5L22 12V2zm14 9.5l-3 3H13l-3 3v-3H6.5V3.5H20z" />
            </svg>
          </div>
          <div className="flex items-baseline font-black tracking-tight text-lg">
            <span className="text-white">Watch</span>
            <span className="text-[#BF94FF]">Party</span>
          </div>
        </a>

        {/* Navigation links matching Twitch */}
        <div className="hidden md:flex items-center gap-1">
          <a
            href="/"
            onClick={(e) => {
              if (onLogoClick) {
                e.preventDefault();
                setIsSearchOpen(false);
                onLogoClick();
              }
            }}
            className="px-3 py-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] hover:text-[#BF94FF] text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-4 h-4 text-[#BF94FF]" />
            <span>Browse</span>
          </a>
        </div>

        {/* In-Room Code Badge with 1-Click Copy */}
        {inRoom && roomId && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-[#2F2F35]">
            <div className="flex items-center gap-1.5 bg-[#1F1F23] border border-[#2F2F35] px-2.5 py-1 rounded-[4px] text-xs">
              <span className="text-[#ADADB8] text-[10px] font-bold tracking-wider">ROOM:</span>
              <span className="font-mono font-bold text-white tracking-wider">{roomId}</span>
              <button
                onClick={copyInviteLink}
                className="ml-1 p-0.5 hover:text-[#BF94FF] text-[#ADADB8] transition-colors"
                title="Copy Invite Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00F593]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Authentic Twitch Search Bar with Real YouTube Data API & Direct Search */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-lg mx-2 hidden sm:block">
        {inRoom ? (
          <form onSubmit={handleVideoSubmit} className="flex items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={
                  canControl
                    ? 'Search YouTube or paste URL to play/load...'
                    : 'Search YouTube to suggest video...'
                }
                value={videoInput}
                onChange={(e) => {
                  setVideoInput(e.target.value);
                  if (e.target.value.trim().length > 1) {
                    performSearch(e.target.value);
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-l-[6px] pl-3 pr-8 text-xs text-[#EFEFF1] placeholder-[#ADADB8] outline-none transition-colors"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-[#9146FF] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : videoInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setVideoInput('');
                    setIsSearchOpen(false);
                  }}
                  className="p-1 text-[#ADADB8] hover:text-white absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={!videoInput.trim()}
              className="h-[36px] px-3.5 bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white rounded-r-[6px] font-semibold text-xs transition-colors shrink-0 flex items-center gap-1"
              title={canControl ? 'Play or Search' : 'Suggest Video'}
            >
              {canControl ? (
                <>
                  <Film className="w-3.5 h-3.5" />
                  <span>Load</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Suggest</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Exact Twitch Search Bar (Input + Attached Search Button) */
          <form onSubmit={handleLobbySearchSubmit} className="flex items-center w-full">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search YouTube videos, parties, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setIsSearchOpen(true);
                }}
                className="w-full h-[36px] bg-[#18181B] hover:bg-[#1F1F23] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-l-[6px] pl-3.5 pr-8 text-sm text-[#EFEFF1] placeholder-[#ADADB8] outline-none transition-colors"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-[#9146FF] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }}
                  className="p-1 text-[#ADADB8] hover:text-white absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
            <button
              type="submit"
              className="h-[36px] w-[36px] bg-[#2F2F35] hover:bg-[#3A3A42] border border-l-0 border-[#464649] rounded-r-[6px] flex items-center justify-center text-[#EFEFF1] transition-colors shrink-0"
              title="Search YouTube"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Live YouTube Search Dropdown Results Menu */}
        {isSearchOpen && (
          <div className="absolute top-[42px] left-0 w-[480px] max-w-[90vw] bg-[#18181B] border border-[#3A3A42] rounded-[6px] shadow-2xl shadow-black/80 z-50 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-100">
            {/* Dropdown Header */}
            <div className="px-3.5 py-2.5 bg-[#1F1F23] border-b border-[#2F2F35] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {/* Official YouTube Red Play Icon */}
                <svg className="w-4 h-4 text-[#FF0000] fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="font-bold text-[#EFEFF1]">Direct YouTube Search</span>
                <span className="px-1.5 py-0.2 rounded-[2px] bg-[#9146FF]/20 text-[#BF94FF] text-[10px] font-mono">
                  Live API
                </span>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 hover:bg-[#2F2F35] rounded text-[#ADADB8] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[#2F2F35]/50">
              {isSearching ? (
                <div className="p-8 flex flex-col items-center justify-center gap-2 text-xs text-[#ADADB8]">
                  <Loader2 className="w-6 h-6 text-[#9146FF] animate-spin" />
                  <span>Searching YouTube in real time...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#ADADB8] space-y-1">
                  <p className="font-semibold text-[#EFEFF1]">No YouTube videos found</p>
                  <p>Try searching another title or paste a direct YouTube video URL.</p>
                </div>
              ) : (
                searchResults.map((video) => (
                  <div
                    key={video.id}
                    className="p-2.5 hover:bg-[#1F1F23] transition-colors flex items-center justify-between gap-3 group"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-24 bg-black rounded-[2px] overflow-hidden shrink-0">
                      <img
                        src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/85 text-white text-[9px] font-mono font-medium rounded-[2px]">
                          {video.duration}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4
                        className="text-xs font-semibold text-[#EFEFF1] line-clamp-1 group-hover:text-[#BF94FF] transition-colors"
                        title={video.title}
                      >
                        {video.title}
                      </h4>
                      <p className="text-[11px] text-[#ADADB8] truncate">{video.channel}</p>
                      {video.views && (
                        <p className="text-[10px] text-[#71717A] font-mono">{video.views}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inRoom ? (
                        canControl ? (
                          <>
                            <button
                              onClick={() => handlePlayFromSearch(video.id, video.title)}
                              className="h-[28px] px-2.5 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1 shadow transition-all active:scale-95"
                              title="Play Video Now in Party"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play</span>
                            </button>
                            <button
                              onClick={() => handleQueueFromSearch(video.id, video.title)}
                              className="h-[28px] px-2 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                              title="Add to Video Queue"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Queue</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handlePlayFromSearch(video.id, video.title)}
                            className="h-[28px] px-2.5 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1 shadow transition-all active:scale-95"
                            title="Suggest Video to Host"
                          >
                            <Send className="w-3 h-3" />
                            <span>Suggest</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => handlePlayFromSearch(video.id, video.title)}
                          className="h-[28px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-all active:scale-95"
                          title="Start a Watch Party with this Video"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Party</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: Navigate to Full Endless Search Results Page */}
            {onSearchPageNavigate && (inRoom ? videoInput.trim() : searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  const q = (inRoom ? videoInput : searchQuery).trim();
                  setIsSearchOpen(false);
                  onSearchPageNavigate(q);
                }}
                className="w-full px-3.5 py-2.5 bg-[#1F1F23] hover:bg-[#2F2F35] border-t border-[#2F2F35] text-xs font-semibold text-[#BF94FF] hover:text-white flex items-center justify-between transition-colors"
              >
                <span>See all results for "{(inRoom ? videoInput : searchQuery).trim()}"</span>
                <span className="text-[11px] font-mono">Enter →</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Prime Crown, Notifications, Whispers, Avatar & Leave */}
      <div className="flex items-center gap-2 shrink-0">
        {inRoom && renderRoleBadge()}

        {/* Prime Crown Icon */}
        <button
          className="p-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] transition-colors hidden md:flex items-center justify-center"
          title="Prime Watch Party"
        >
          <Crown className="w-4 h-4 text-[#BF94FF]" />
        </button>

        {/* Notifications */}
        <button
          className="p-1.5 rounded-[4px] hover:bg-[#2F2F35] text-[#EFEFF1] transition-colors hidden sm:flex items-center justify-center"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        {/* Keyboard Shortcuts Trigger Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="p-1.5 bg-[#1F1F23] hover:bg-[#26262C] hover:text-[#BF94FF] text-[#ADADB8] rounded-[4px] border border-[#2F2F35] transition-colors flex items-center justify-center"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        {/* User Avatar with 8px green status dot */}
        <div className="flex items-center gap-2 bg-[#1F1F23] pl-1 pr-2.5 py-1 rounded-full border border-[#2F2F35]">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white relative shrink-0 shadow"
            style={{ backgroundColor: userColor }}
          >
            {username ? username.charAt(0).toUpperCase() : 'U'}
            <span className="w-2 h-2 bg-[#00F593] rounded-full absolute -bottom-0.5 -right-0.5 border border-[#18181B]" />
          </div>
          <span className="text-xs font-semibold text-[#EFEFF1] max-w-[100px] truncate">
            {username || 'Guest'}
          </span>
        </div>

        {inRoom && onLeaveRoom && (
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#1F1F23] hover:bg-[#EB0400] text-[#ADADB8] hover:text-white rounded-[4px] border border-[#2F2F35] hover:border-[#EB0400] text-xs font-semibold transition-colors"
            title="Leave Watch Party"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        )}
      </div>
    </header>
  );
};
