import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Sparkles,
  LogIn,
  Users,
  Flame,
  Radio,
  Play,
  Shield,
  Globe,
  Lock,
  Loader2,
  Command,
  Clock,
  Trash2,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Music,
  Gamepad2,
  Trees,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getWatchHistory, clearWatchHistory, formatTimeAgo, HistoryItem } from '../utils/history';
import { getServerUrl } from '../services/socket';

interface PublicRoomInfo {
  roomId: string;
  videoTitle: string;
  videoId: string;
  viewers: number;
  playState: string;
}

interface LobbyProps {
  onJoin: (username: string, roomId?: string, initialVideoId?: string) => void;
  initialRoomCode?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, initialRoomCode }) => {
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('watchsync_username') || '';
  });
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('QdBZY2fkU-0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverOnline, setServerOnline] = useState(true);
  const [error, setError] = useState('');
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>(() => getWatchHistory());
  const [publicRooms, setPublicRooms] = useState<PublicRoomInfo[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const createSectionRef = useRef<HTMLDivElement>(null);
  const publicRoomsRef = useRef<HTMLDivElement>(null);
  const browseRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const roomCodeInputRef = useRef<HTMLInputElement>(null);

  const handleClearHistory = () => {
    clearWatchHistory();
    setWatchHistory([]);
  };

  const handleWatchFromHistory = (item: HistoryItem) => {
    setSelectedPresetId(item.videoId);
    const chosenName = username.trim() || `Viewer${Math.floor(100 + Math.random() * 900)}`;
    if (!username.trim()) {
      setUsername(chosenName);
      localStorage.setItem('watchsync_username', chosenName);
    }
    setIsSubmitting(true);
    onJoin(chosenName, undefined, item.videoId);
  };

  // Fetch server health and active public rooms on mount & periodically
  useEffect(() => {
    const fetchRoomsAndHealth = () => {
      const baseUrl = getServerUrl();
      fetch(`${baseUrl}/api/health`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status === 'ok') setServerOnline(true);
        })
        .catch(() => setServerOnline(true));

      fetch(`${baseUrl}/api/rooms`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.rooms)) {
            setPublicRooms(data.rooms);
          }
        })
        .catch(() => {});
    };

    fetchRoomsAndHealth();
    const interval = setInterval(fetchRoomsAndHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a display name to host a party');
      return;
    }
    setIsSubmitting(true);
    localStorage.setItem('watchsync_username', username.trim());
    const initialVideo = customVideoUrl.trim() || selectedPresetId;
    onJoin(username.trim(), undefined, initialVideo);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your nickname to join');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    setIsSubmitting(true);
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim(), roomCode.trim().toUpperCase());
  };

  // Quick Start Videos as shown on UI reference board
  const quickStartVideos = [
    {
      label: 'Chill Lo-Fi Beat',
      videoId: '5qap5aO4i9A',
      title: 'lofi hip hop radio 💤 beats to sleep/chill to',
      thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg',
    },
    {
      label: 'Cinematic Trailer',
      videoId: 'QdBZY2fkU-0',
      title: 'Grand Theft Auto VI Trailer 1',
      thumbnail: 'https://img.youtube.com/vi/QdBZY2fkU-0/mqdefault.jpg',
    },
    {
      label: 'Sci-Fi Short',
      videoId: 'LXb3EKWsInQ',
      title: 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)',
      thumbnail: 'https://img.youtube.com/vi/LXb3EKWsInQ/mqdefault.jpg',
    },
    {
      label: 'Tech Keynote',
      videoId: 'M7lc1UVf-VE',
      title: 'YouTube Developers Live: Embedded Web Player',
      thumbnail: 'https://img.youtube.com/vi/M7lc1UVf-VE/mqdefault.jpg',
    },
  ];

  // Sample curated parties for the "Browse Active Parties" shelf
  const sampleParties = [
    {
      id: 'GTAVIP',
      title: 'GTA VI Trailer Reveal & Breakdown',
      creator: 'Sajid (Host)',
      viewers: '1.7K',
      thumbnail: 'https://img.youtube.com/vi/QdBZY2fkU-0/mqdefault.jpg',
      duration: '01:31',
      category: 'gaming',
    },
    {
      id: 'LOFIPY',
      title: 'Lofi Hip Hop Radio — Beats to Relax/Study',
      creator: 'Alex (Host)',
      viewers: '3.2K',
      thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg',
      duration: 'LIVE',
      category: 'music',
    },
    {
      id: 'CYBER9',
      title: 'Cyberpunk 2077 Night City Walkthrough',
      creator: 'Jordan (Host)',
      viewers: '850',
      thumbnail: 'https://img.youtube.com/vi/PbVKBoDuhZ0/mqdefault.jpg',
      duration: '03:45',
      category: 'gaming',
    },
    {
      id: 'WEB3AI',
      title: 'Next-Gen Web3 & AI Keynote Livestream',
      creator: 'Elena (Host)',
      viewers: '2.4K',
      thumbnail: 'https://img.youtube.com/vi/M7lc1UVf-VE/mqdefault.jpg',
      duration: '33:10',
      category: 'tech',
    },
  ];

  const handleSelectSample = (sampleCode: string) => {
    setRoomCode(sampleCode);
    const chosenName = username.trim() || `Viewer${Math.floor(100 + Math.random() * 900)}`;
    if (!username.trim()) {
      setUsername(chosenName);
      localStorage.setItem('watchsync_username', chosenName);
    }
    setError('');
    setIsSubmitting(true);
    onJoin(chosenName, sampleCode);
  };

  const handleSelectCategory = (cat: string, defaultVideoId?: string) => {
    setActiveCategory(cat);
    if (defaultVideoId) {
      setSelectedPresetId(defaultVideoId);
      setCustomVideoUrl('');
    }
    browseRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredParties = sampleParties.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  return (
    <div className="flex-1 w-full h-[calc(100vh-56px)] flex overflow-hidden bg-[#131419]">
      {/* 1. Left Navigation Sidebar (Warm Slate & Coral Theme) */}
      <aside
        className={`bg-[#1B1D24] border-r border-white/[0.08] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-20 ${
          isSidebarCollapsed ? 'w-[64px]' : 'w-[240px]'
        }`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-4">
          {/* Section: Main Nav */}
          <div className="px-3 space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Discover
              </p>
            )}

            <button
              onClick={() => {
                setActiveCategory('all');
                createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5E62]/10 to-[#FF9966]/10 border border-[#FF5E62]/20 text-white text-xs font-semibold hover:border-[#FF5E62]/40 transition-all group"
              title="Home & Create Party"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-r from-[#FF5E62] to-[#FF9966] flex items-center justify-center shrink-0 shadow-sm shadow-[#FF5E62]/20">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              {!isSidebarCollapsed && <span>Start a Party</span>}
            </button>

            <button
              onClick={() => publicRoomsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#242731] text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              title="Open Public Rooms"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-[#2EE59D] shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Public Rooms</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2EE59D]/15 text-[#2EE59D] border border-[#2EE59D]/30">
                  {publicRooms.length} Live
                </span>
              )}
            </button>

            <button
              onClick={() => browseRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#242731] text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              title="Browse Featured Parties"
            >
              <Flame className="w-4 h-4 text-[#FF5E62] shrink-0" />
              {!isSidebarCollapsed && <span>Browse Featured</span>}
            </button>

            <button
              onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#242731] text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              title="Recently Watched History"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock className="w-4 h-4 text-[#FFA751] shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Watch History</span>}
              </div>
              {!isSidebarCollapsed && watchHistory.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#242731] text-zinc-400 border border-white/[0.08]">
                  {watchHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Section: Categories */}
          <div className="px-3 pt-3 border-t border-white/[0.08] space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Categories
              </p>
            )}

            <button
              onClick={() => handleSelectCategory('music', '5qap5aO4i9A')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === 'music'
                  ? 'bg-[#FF5E62]/15 text-[#FF9966] border border-[#FF5E62]/30'
                  : 'hover:bg-[#242731] text-zinc-400 hover:text-white'
              }`}
              title="Music & Lofi"
            >
              <Music className="w-4 h-4 text-[#FF9966] shrink-0" />
              {!isSidebarCollapsed && <span>Music & Lofi</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('gaming', 'QdBZY2fkU-0')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === 'gaming'
                  ? 'bg-[#FF5E62]/15 text-[#FF9966] border border-[#FF5E62]/30'
                  : 'hover:bg-[#242731] text-zinc-400 hover:text-white'
              }`}
              title="Gaming Streams"
            >
              <Gamepad2 className="w-4 h-4 text-[#2EE59D] shrink-0" />
              {!isSidebarCollapsed && <span>Gaming</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('trailers', 'Way9Dexny3w')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === 'trailers'
                  ? 'bg-[#FF5E62]/15 text-[#FF9966] border border-[#FF5E62]/30'
                  : 'hover:bg-[#242731] text-zinc-400 hover:text-white'
              }`}
              title="Movie Trailers"
            >
              <Film className="w-4 h-4 text-[#FFD700] shrink-0" />
              {!isSidebarCollapsed && <span>Trailers</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('nature', 'LXb3EKWsInQ')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === 'nature'
                  ? 'bg-[#FF5E62]/15 text-[#FF9966] border border-[#FF5E62]/30'
                  : 'hover:bg-[#242731] text-zinc-400 hover:text-white'
              }`}
              title="4K Nature & Relax"
            >
              <Trees className="w-4 h-4 text-[#00E5FF] shrink-0" />
              {!isSidebarCollapsed && <span>4K Nature</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('tech', 'M7lc1UVf-VE')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeCategory === 'tech'
                  ? 'bg-[#FF5E62]/15 text-[#FF9966] border border-[#FF5E62]/30'
                  : 'hover:bg-[#242731] text-zinc-400 hover:text-white'
              }`}
              title="Tech & Keynotes"
            >
              <Cpu className="w-4 h-4 text-[#FF758C] shrink-0" />
              {!isSidebarCollapsed && <span>Tech & Talks</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Health & Collapse Toggle */}
        <div className="p-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#2EE59D]">
                <span className="w-2 h-2 rounded-full bg-[#2EE59D] animate-pulse" />
                <span>Server Online</span>
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1.5 rounded-lg hover:bg-[#242731] text-zinc-400 hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[#242731] text-zinc-400 hover:text-white transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Scrollable Canvas */}
      <main className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-10 py-8 relative no-scrollbar">
        {/* Soft Warm Coral-Amber ambient radial backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[750px] h-[320px] bg-gradient-to-r from-[#FF5E62]/15 to-[#FF9966]/10 blur-[130px] pointer-events-none rounded-full" />

        <div className="w-full max-w-4xl mx-auto space-y-9 z-10 relative">
          {/* Hero Headline & Subtitle */}
          <div ref={createSectionRef} className="text-center space-y-2 pt-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight flex items-center justify-center gap-2">
              <span className="bg-gradient-to-r from-[#FF5E62] via-[#FF758C] to-[#FF9966] bg-clip-text text-transparent">
                Watch Together with Friends
              </span>
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto font-medium">
              Create a private space or jump into an active watch party.
            </p>

            {error && (
              <div className="max-w-md mx-auto p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold mt-3 animate-in fade-in duration-150">
                {error}
              </div>
            )}
          </div>

          {/* Two Tactile Bento Cards (Reference Blueprint) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Host a Party */}
            <div className="bg-[#1B1D24] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl p-7 flex flex-col justify-between shadow-xl shadow-black/40 transition-all duration-200">
              <form onSubmit={handleCreate} className="space-y-5 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Host a Party</span>
                    </h2>
                    <span className="text-[10px] uppercase font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                      Host Mode
                    </span>
                  </div>

                  {/* Choose a Name */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Choose a Name
                    </label>
                    <input
                      type="text"
                      placeholder="Sajid's Movie Night..."
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      maxLength={24}
                      className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#1B1D24] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* YouTube Link (Optional) */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      YouTube Link (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="YouTube Link (optional)"
                      value={customVideoUrl}
                      onChange={(e) => setCustomVideoUrl(e.target.value)}
                      className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#1B1D24] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Coral-Sunset Create Room CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF5E62]/25 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Party...</span>
                    </>
                  ) : (
                    <span>Create Room</span>
                  )}
                </button>
              </form>
            </div>

            {/* Card 2: Join a Room */}
            <div className="bg-[#1B1D24] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl p-7 flex flex-col justify-between shadow-xl shadow-black/40 transition-all duration-200">
              <form onSubmit={handleJoin} className="space-y-5 flex flex-col justify-between h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Join a Room</span>
                    </h2>
                    <span className="text-[10px] uppercase font-bold text-sky-300/80 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">
                      Participant
                    </span>
                  </div>

                  {/* Your Nickname */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Your Nickname
                    </label>
                    <input
                      type="text"
                      placeholder="Your Nickname"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      maxLength={24}
                      className="w-full bg-[#242731] hover:bg-[#2C303D] focus:bg-[#1B1D24] border border-white/[0.08] focus:border-[#FF8C42] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Room Code with 6 tactile boxes matching reference */}
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Room Code
                    </label>

                    {/* Hidden input to capture typing */}
                    <div className="relative">
                      <input
                        ref={roomCodeInputRef}
                        type="text"
                        value={roomCode}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                          setRoomCode(val);
                          setError('');
                        }}
                        maxLength={6}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                        autoFocus={!!initialRoomCode}
                      />

                      {/* 6 Tactile Rounded Segmented Boxes */}
                      <div className="flex gap-2">
                        {[0, 1, 2, 3, 4, 5].map((idx) => {
                          const char = roomCode[idx] || '';
                          const isCurrent = idx === roomCode.length;
                          return (
                            <div
                              key={idx}
                              onClick={() => roomCodeInputRef.current?.focus()}
                              className={`flex-1 h-12 rounded-xl flex items-center justify-center font-mono font-bold text-base transition-all select-none ${
                                char
                                  ? 'bg-[#242731] border border-[#FF8C42] text-white shadow-md shadow-[#FF8C42]/10 scale-100'
                                  : isCurrent
                                  ? 'bg-[#242731] border-2 border-[#FFA751] text-zinc-300 animate-pulse'
                                  : 'bg-[#242731] border border-white/[0.08] text-zinc-600'
                              }`}
                            >
                              {char || '—'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Warm Amber-Sunset Enter Room CTA Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-[#FF8C42] to-[#FFA751] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-[#FF8C42]/25 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Entering Room...</span>
                    </>
                  ) : (
                    <span>Enter Room</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Quick-Start Videos Strip (From Visual Reference Board) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Film className="w-4 h-4 text-[#FF5E62]" />
                <span>Quick-Start Videos</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Click any card to pre-fill starting video</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              {quickStartVideos.map((video) => {
                const isSelected = selectedPresetId === video.videoId;
                return (
                  <div
                    key={video.videoId}
                    onClick={() => {
                      setSelectedPresetId(video.videoId);
                      setCustomVideoUrl('');
                    }}
                    className={`group cursor-pointer bg-[#1B1D24] border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-lg flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#FF5E62] ring-1 ring-[#FF5E62] shadow-[#FF5E62]/15'
                        : 'border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    <div className="relative aspect-video w-full bg-black overflow-hidden">
                      <img
                        src={video.thumbnail}
                        alt={video.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] flex items-center justify-center text-white shadow-lg">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#FF5E62] text-white text-[9px] font-bold shadow">
                          SELECTED
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-[#FF9966] transition-colors">
                        {video.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Open Public Rooms Shelf (Live from Server) */}
          <div ref={publicRoomsRef} className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#2EE59D]" />
                <span>Open Public Rooms</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2EE59D]/15 text-[#2EE59D] border border-[#2EE59D]/30">
                  {publicRooms.length} Live Now
                </span>
              </h3>
              <span className="text-[11px] text-zinc-500">Synced with server in real time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {publicRooms.map((room) => {
                const thumbnailSrc = `https://img.youtube.com/vi/${room.videoId}/mqdefault.jpg`;
                return (
                  <div
                    key={room.roomId}
                    onClick={() => handleSelectSample(room.roomId)}
                    className="group cursor-pointer bg-[#1B1D24] border border-white/[0.08] hover:border-[#2EE59D]/50 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-xl shadow-black/30 flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden">
                      <img
                        src={thumbnailSrc}
                        alt={room.videoTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#FF5E62] text-white text-[9px] font-black uppercase flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>LIVE</span>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-[#2EE59D] text-[10px] font-mono font-bold tabular-nums">
                        👥 {room.viewers} in room
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-3 space-y-1.5">
                      <h4
                        className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#2EE59D] transition-colors"
                        title={room.videoTitle}
                      >
                        {room.videoTitle}
                      </h4>
                      <p className="text-[11px] text-zinc-400 flex items-center justify-between pt-0.5">
                        <span className="font-mono font-bold text-white">ROOM: {room.roomId}</span>
                        <span className="text-[#2EE59D] font-bold group-hover:underline flex items-center gap-1">
                          Join <ArrowRight className="w-3 h-3" />
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Browse Featured Parties */}
          <div ref={browseRef} className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#FF5E62]" />
                <span>Browse Featured Parties</span>
              </h3>
              <span className="text-[11px] text-zinc-500">Click any party to quick-join</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredParties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectSample(p.id)}
                  className="group cursor-pointer bg-[#1B1D24] border border-white/[0.08] hover:border-[#FF5E62]/50 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-xl shadow-black/30 flex flex-col justify-between"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-85 group-hover:opacity-100"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#FF5E62] text-white text-[9px] font-black uppercase flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span>LIVE</span>
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-zinc-300 text-[10px] font-mono tabular-nums">
                      👥 {p.viewers}
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-sm text-zinc-300 text-[10px] font-mono">
                      {p.duration}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#FF9966] transition-colors">
                      {p.title}
                    </h4>
                    <p className="text-[11px] text-zinc-400 flex items-center justify-between">
                      <span>{p.creator}</span>
                      <span className="font-mono text-[11px] text-[#FF8C42] font-bold">CODE: {p.id}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Recently Watched & History */}
          <div ref={historyRef}>
            {watchHistory.length > 0 && (
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FFA751]" />
                    <span>Recently Watched & History</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
                    title="Clear your watch history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {watchHistory.slice(0, 6).map((item) => (
                    <div
                      key={item.videoId}
                      onClick={() => handleWatchFromHistory(item)}
                      className="group cursor-pointer bg-[#1B1D24] border border-white/[0.08] hover:border-[#FF5E62]/50 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-xl shadow-black/30 flex items-center gap-3 p-2.5"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-28 bg-black rounded-xl overflow-hidden shrink-0">
                        <img
                          src={item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4
                          className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#FF9966] transition-colors"
                          title={item.title}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-zinc-400 truncate">{item.channel || 'Watch Party'}</p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                          <span>{formatTimeAgo(item.watchedAt)}</span>
                          <span className="text-[#FF8C42] font-semibold group-hover:underline">Start Party →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
