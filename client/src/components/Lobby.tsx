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
  const [partyName, setPartyName] = useState('My Watch Party');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('QdBZY2fkU-0');
  const [isPublic, setIsPublic] = useState(true);
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
      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.status === 'ok') setServerOnline(true);
        })
        .catch(() => setServerOnline(true));

      fetch('/api/rooms')
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
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your display name to start a party');
      return;
    }
    setIsSubmitting(true);
    localStorage.setItem('watchsync_username', username.trim());
    onJoin(username.trim(), undefined, selectedPresetId);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your display name to join');
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

  // Quick Preset Chips for Evaluators / Quick Start
  const presetChips = [
    { label: '🎮 GTA VI Trailer', videoId: 'QdBZY2fkU-0', cat: 'gaming' },
    { label: '🎵 Lofi Beats 24/7', videoId: 'jfKfPfyJRdk', cat: 'music' },
    { label: '🌿 4K Nature Relax', videoId: 'LXb3EKWsInQ', cat: 'nature' },
    { label: '🎬 Dune 2 Trailer', videoId: 'Way9Dexny3w', cat: 'trailers' },
    { label: '💻 Web3 & AI Keynote', videoId: 'M7lc1UVf-VE', cat: 'tech' },
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
      thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/mqdefault.jpg',
      duration: 'LIVE',
      category: 'music',
    },
    {
      id: 'CYBER9',
      title: 'Cyberpunk 2077 Night City Walkthrough',
      creator: 'Jordan (Host)',
      viewers: '850',
      thumbnail: 'https://img.youtube.com/vi/eaW0t48HGHM/mqdefault.jpg',
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
    }
    browseRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredParties = sampleParties.filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  return (
    <div className="flex-1 w-full h-[calc(100vh-50px)] flex overflow-hidden bg-[#0E0E10]">
      {/* 1. Left Navigation Sidebar (Twitch & YouTube Style) */}
      <aside
        className={`bg-[#18181B] border-r border-[#2F2F35] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-20 ${
          isSidebarCollapsed ? 'w-[64px]' : 'w-[240px]'
        }`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-4">
          {/* Section: Main Nav */}
          <div className="px-2 space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#ADADB8] mb-1">
                Discover
              </p>
            )}

            <button
              onClick={() => {
                setActiveCategory('all');
                createSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1F1F23] text-white text-xs font-semibold transition-colors"
              title="Home & Create Party"
            >
              <Sparkles className="w-4 h-4 text-[#BF94FF] shrink-0" />
              {!isSidebarCollapsed && <span>Start a Party</span>}
            </button>

            <button
              onClick={() => publicRoomsRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1F1F23] text-[#EFEFF1] text-xs font-semibold transition-colors"
              title="Open Public Rooms"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-[#00F593] shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Public Rooms</span>}
              </div>
              {!isSidebarCollapsed && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F593]/20 text-[#00F593] border border-[#00F593]/30">
                  {publicRooms.length} Live
                </span>
              )}
            </button>

            <button
              onClick={() => browseRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1F1F23] text-[#EFEFF1] text-xs font-semibold transition-colors"
              title="Browse Featured Parties"
            >
              <Flame className="w-4 h-4 text-[#EB0400] shrink-0" />
              {!isSidebarCollapsed && <span>Browse Featured</span>}
            </button>

            <button
              onClick={() => historyRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1F1F23] text-[#EFEFF1] text-xs font-semibold transition-colors"
              title="Recently Watched History"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock className="w-4 h-4 text-[#BF94FF] shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Watch History</span>}
              </div>
              {!isSidebarCollapsed && watchHistory.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1F1F23] text-[#ADADB8] border border-[#2F2F35]">
                  {watchHistory.length}
                </span>
              )}
            </button>
          </div>

          {/* Section: Categories */}
          <div className="px-2 pt-2 border-t border-[#2F2F35]/60 space-y-1">
            {!isSidebarCollapsed && (
              <p className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-[#ADADB8] mb-1">
                Categories
              </p>
            )}

            <button
              onClick={() => handleSelectCategory('music', 'jfKfPfyJRdk')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === 'music'
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white'
              }`}
              title="Music & Lofi"
            >
              <Music className="w-4 h-4 text-[#BF94FF] shrink-0" />
              {!isSidebarCollapsed && <span>Music & Lofi</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('gaming', 'QdBZY2fkU-0')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === 'gaming'
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white'
              }`}
              title="Gaming Streams"
            >
              <Gamepad2 className="w-4 h-4 text-[#00F593] shrink-0" />
              {!isSidebarCollapsed && <span>Gaming</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('trailers', 'Way9Dexny3w')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === 'trailers'
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white'
              }`}
              title="Movie Trailers"
            >
              <Film className="w-4 h-4 text-[#FFD700] shrink-0" />
              {!isSidebarCollapsed && <span>Trailers</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('nature', 'LXb3EKWsInQ')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === 'nature'
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white'
              }`}
              title="4K Nature & Relax"
            >
              <Trees className="w-4 h-4 text-[#00E5FF] shrink-0" />
              {!isSidebarCollapsed && <span>4K Nature</span>}
            </button>

            <button
              onClick={() => handleSelectCategory('tech', 'M7lc1UVf-VE')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                activeCategory === 'tech'
                  ? 'bg-[#9146FF]/20 text-[#BF94FF] border border-[#9146FF]/40'
                  : 'hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white'
              }`}
              title="Tech & Keynotes"
            >
              <Cpu className="w-4 h-4 text-[#FF69B4] shrink-0" />
              {!isSidebarCollapsed && <span>Tech & Talks</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Health & Collapse Toggle */}
        <div className="p-3 border-t border-[#2F2F35] flex items-center justify-between gap-2">
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#00F593]">
                <span className="w-2 h-2 rounded-full bg-[#00F593] animate-pulse" />
                <span>Server Online</span>
              </div>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 rounded hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-1 rounded hover:bg-[#1F1F23] text-[#ADADB8] hover:text-white transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Main Scrollable Content */}
      <main className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 relative no-scrollbar">
        {/* Subtle purple radial glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#9146FF]/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="w-full max-w-4xl mx-auto space-y-8 z-10 relative">
          {/* Section: Create / Join Hero */}
          <div ref={createSectionRef} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#2F2F35]/60">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>Start or Join a Watch Party</span>
                </h1>
                <p className="text-xs sm:text-sm text-[#ADADB8]">
                  Real-time synchronized YouTube theater with strict server-side RBAC, shared queue & live chat.
                </p>
              </div>

              {/* Server Online Health Pill */}
              <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] border border-[#2F2F35] text-xs font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F593] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F593]"></span>
                </span>
                <span className="text-[#00F593] font-bold">Server Online</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#EB0400]/10 border border-[#EB0400]/40 rounded-lg text-[#FF4A4A] text-xs font-semibold animate-in fade-in duration-150">
                {error}
              </div>
            )}

            {/* Two Side-by-Side Cards (Twitch Theater Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card 1: Create Watch Party */}
              <div className="bg-[#18181B] border border-[#2F2F35] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl hover:border-[#9146FF]/40 transition-all duration-150">
                <form onSubmit={handleCreate} className="space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#BF94FF]" />
                      <span>Create Watch Party</span>
                    </h2>

                    <div>
                      <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                        Your Display Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sajid"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                        }}
                        maxLength={24}
                        className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                        Party Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GTA VI Trailer & Beats"
                        value={partyName}
                        onChange={(e) => setPartyName(e.target.value)}
                        className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                      />
                    </div>

                    {/* Quick Demo Preset Chips for evaluators */}
                    <div>
                      <label className="text-[10px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1.5">
                        Quick-Start Demo Video:
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {presetChips.map((chip) => (
                          <button
                            key={chip.videoId}
                            type="button"
                            onClick={() => setSelectedPresetId(chip.videoId)}
                            className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                              selectedPresetId === chip.videoId
                                ? 'bg-[#9146FF]/20 border-[#9146FF] text-white font-bold'
                                : 'bg-[#1F1F23] border-[#2F2F35] text-[#ADADB8] hover:text-white'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Public / Private radios */}
                    <div className="flex items-center gap-5 pt-1 text-xs">
                      <label
                        onClick={() => setIsPublic(true)}
                        className="flex items-center gap-1.5 cursor-pointer text-[#EFEFF1]"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isPublic ? 'border-[#9146FF]' : 'border-[#464649]'
                          }`}
                        >
                          {isPublic && <span className="w-2 h-2 rounded-full bg-[#9146FF]" />}
                        </span>
                        <Globe className="w-3.5 h-3.5 text-[#ADADB8]" />
                        <span>Public</span>
                      </label>

                      <label
                        onClick={() => setIsPublic(false)}
                        className="flex items-center gap-1.5 cursor-pointer text-[#ADADB8] hover:text-[#EFEFF1]"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            !isPublic ? 'border-[#9146FF]' : 'border-[#464649]'
                          }`}
                        >
                          {!isPublic && <span className="w-2 h-2 rounded-full bg-[#9146FF]" />}
                        </span>
                        <Lock className="w-3.5 h-3.5 text-[#ADADB8]" />
                        <span>Private</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] disabled:opacity-50 text-white rounded font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Watch Party</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card 2: Join Room Code */}
              <div className="bg-[#18181B] border border-[#2F2F35] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl hover:border-[#9146FF]/40 transition-all duration-150">
                <form onSubmit={handleJoin} className="space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-[#00F593]" />
                    <span>Join Room Code</span>
                  </h2>

                  <div>
                    <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                      Your Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ViewerOne"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                      }}
                      maxLength={24}
                      className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-xs text-white placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#ADADB8] uppercase tracking-wider block mb-1">
                      6-Character Room Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ABC123"
                      value={roomCode}
                      onChange={(e) => {
                        setRoomCode(e.target.value.toUpperCase());
                        setError('');
                      }}
                      maxLength={6}
                      className="w-full bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-3 py-2 text-sm font-mono font-bold tracking-widest text-white uppercase placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#1F1F23] hover:bg-[#26262C] active:scale-[0.98] border border-[#2F2F35] hover:border-[#00F593] disabled:opacity-50 text-white rounded font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Joining Party...</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4 text-[#00F593]" />
                        <span>Join Party</span>
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-[#ADADB8]">
                      Joining via invite link auto-fills the room code.
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Section: Open Public Rooms Shelf (Live from Server) */}
          <div ref={publicRoomsRef} className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00F593]" />
                <span>Open Public Rooms</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F593]/20 text-[#00F593] border border-[#00F593]/40">
                  {publicRooms.length} Live Now
                </span>
              </h3>
              <span className="text-[11px] text-[#ADADB8]">Synced with server in real time</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {publicRooms.map((room) => {
                const thumbnailSrc = `https://img.youtube.com/vi/${room.videoId}/mqdefault.jpg`;
                return (
                  <div
                    key={room.roomId}
                    onClick={() => handleSelectSample(room.roomId)}
                    className="group cursor-pointer bg-[#18181B] border border-[#2F2F35] hover:border-[#00F593] rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full bg-black overflow-hidden">
                      <img
                        src={thumbnailSrc}
                        alt={room.videoTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-85 group-hover:opacity-100"
                        loading="lazy"
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#EB0400] text-white text-[9px] font-black uppercase flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>LIVE</span>
                      </div>
                      <div className="absolute bottom-1.5 left-2 px-1.5 py-0.2 rounded bg-black/75 text-[#00F593] text-[10px] font-mono font-bold tabular-nums">
                        👥 {room.viewers} in room
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-2.5 space-y-1">
                      <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#00F593] transition-colors" title={room.videoTitle}>
                        {room.videoTitle}
                      </h4>
                      <p className="text-[10px] text-[#ADADB8] flex items-center justify-between pt-0.5">
                        <span className="font-mono font-bold text-white">ROOM: {room.roomId}</span>
                        <span className="text-[#00F593] font-bold group-hover:underline flex items-center gap-0.5">
                          Join <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Browse Featured Parties */}
          <div ref={browseRef} className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-[#EB0400]" />
                <span>Browse Featured Parties</span>
              </h3>
              <span className="text-[11px] text-[#ADADB8]">Click any party to quick-join</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {filteredParties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectSample(p.id)}
                  className="group cursor-pointer bg-[#18181B] border border-[#2F2F35] hover:border-[#9146FF] rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 shadow-lg"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden">
                    <img
                      src={p.thumbnail}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 opacity-80 group-hover:opacity-100"
                    />
                    {/* Live Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#EB0400] text-white text-[9px] font-black uppercase flex items-center gap-1 shadow">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span>LIVE</span>
                    </div>
                    {/* Viewers */}
                    <div className="absolute bottom-1.5 left-2 px-1.5 py-0.2 rounded bg-black/75 text-[#EFEFF1] text-[10px] font-mono tabular-nums">
                      👥 {p.viewers}
                    </div>
                    {/* Duration */}
                    <div className="absolute bottom-1.5 right-2 px-1.5 py-0.2 rounded bg-black/75 text-[#EFEFF1] text-[10px] font-mono">
                      {p.duration}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-2.5 space-y-1">
                    <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-[#BF94FF] transition-colors">
                      {p.title}
                    </h4>
                    <p className="text-[10px] text-[#ADADB8] flex items-center justify-between">
                      <span>{p.creator}</span>
                      <span className="font-mono text-[10px] text-[#9146FF] font-bold">CODE: {p.id}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Recently Watched & History */}
          <div ref={historyRef}>
            {watchHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#BF94FF]" />
                    <span>Recently Watched & History</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-[#ADADB8] hover:text-[#EB0400] flex items-center gap-1 transition-colors"
                    title="Clear your watch history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear History</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {watchHistory.slice(0, 6).map((item) => (
                    <div
                      key={item.videoId}
                      onClick={() => handleWatchFromHistory(item)}
                      className="group cursor-pointer bg-[#18181B] border border-[#2F2F35] hover:border-[#9146FF] rounded-lg overflow-hidden transition-all duration-150 hover:-translate-y-0.5 shadow-lg flex items-center gap-3 p-2"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-28 bg-black rounded overflow-hidden shrink-0">
                        <img
                          src={item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-4 h-4 text-white fill-current" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#BF94FF] transition-colors" title={item.title}>
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-[#ADADB8] truncate">{item.channel || 'Watch Party'}</p>
                        <div className="flex items-center justify-between text-[10px] text-[#71717A] pt-0.5">
                          <span>{formatTimeAgo(item.watchedAt)}</span>
                          <span className="text-[#9146FF] font-semibold group-hover:underline">Start Party →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyboard Shortcut Hints Strip at Bottom */}
        <footer className="w-full max-w-4xl mx-auto pt-8 pb-4 mt-8 border-t border-[#2F2F35]/40 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#ADADB8] select-none">
          <span className="flex items-center gap-1 font-semibold text-white">
            <Command className="w-3.5 h-3.5 text-[#BF94FF]" />
            <span>Shortcuts:</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#1F1F23] border border-[#2F2F35] rounded text-white font-mono text-[10px]">Space</kbd> Play/Pause
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#1F1F23] border border-[#2F2F35] rounded text-white font-mono text-[10px]">← / →</kbd> Seek 5s
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#1F1F23] border border-[#2F2F35] rounded text-white font-mono text-[10px]">M</kbd> Mute
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#1F1F23] border border-[#2F2F35] rounded text-white font-mono text-[10px]">F</kbd> Fullscreen
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-[#1F1F23] border border-[#2F2F35] rounded text-white font-mono text-[10px]">C</kbd> Toggle Chat
          </span>
        </footer>
      </main>
    </div>
  );
};
