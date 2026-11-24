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
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Film,
  Music,
  Gamepad2,
  Trees,
  Cpu,
  ArrowRight,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { getWatchHistory, clearWatchHistory, formatTimeAgo, HistoryItem } from '../utils/history';
import { getServerUrl } from '../services/socket';
import { getTwitchUserColor } from '../utils/colors';

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
  const [heroIndex, setHeroIndex] = useState(0);

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
      setError('Please enter your display name to start a party');
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

  // Quick Preset Chips for Quick Start
  const presetChips = [
    { label: '🎮 GTA VI Trailer', videoId: 'QdBZY2fkU-0', cat: 'gaming' },
    { label: '🎵 Lofi Beats 24/7', videoId: '5qap5aO4i9A', cat: 'music' },
    { label: '🌿 4K Nature Relax', videoId: 'LXb3EKWsInQ', cat: 'nature' },
    { label: '🎬 Dune 2 Trailer', videoId: 'Way9Dexny3w', cat: 'trailers' },
    { label: '💻 Web3 & AI Keynote', videoId: 'M7lc1UVf-VE', cat: 'tech' },
  ];

  // Featured Hero Showcase Streams (Twitch Hero Carousel Style)
  const heroStreams = [
    {
      id: 'GTAVIP',
      videoId: 'QdBZY2fkU-0',
      title: 'Grand Theft Auto VI Trailer 1 Reveal — Synchronized Watch Party',
      streamer: 'RockstarGames',
      category: 'Grand Theft Auto VI',
      viewers: '185,420',
      description: 'Welcome to Vice City. Experience the official synchronized watch party theater with ultra-low drift audio and live chat.',
      tags: ['English', 'GTA6', 'Trailer', '4K60fps', 'Multiplayer'],
      thumbnail: 'https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg',
      avatarColor: '#E91E63',
    },
    {
      id: 'LOFIPY',
      videoId: '5qap5aO4i9A',
      title: 'lofi hip hop radio - beats to relax/study to [24/7 Live Stream]',
      streamer: 'LofiGirl',
      category: 'Music & Performing Arts',
      viewers: '78,910',
      description: 'Relax, study, or chill with the world’s favorite 24/7 lofi hip hop radio stream in synchronized party mode.',
      tags: ['Music', 'Lofi', 'Chill', 'Relaxing', 'Study'],
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
      avatarColor: '#9C27B0',
    },
    {
      id: 'CYBER9',
      videoId: 'PbVKBoDuhZ0',
      title: 'Cyberpunk 2077: Phantom Liberty — Official Cinematic Teaser',
      streamer: 'CyberpunkGame',
      category: 'Cyberpunk 2077',
      viewers: '15,200',
      description: 'Return to Night City with Idris Elba. Watch the official teaser trailer with your friends in full HD.',
      tags: ['Gaming', 'Cyberpunk', 'RPG', 'Action', 'Cinematic'],
      thumbnail: 'https://i.ytimg.com/vi/PbVKBoDuhZ0/hqdefault.jpg',
      avatarColor: '#00BCD4',
    },
    {
      id: 'WEB3AI',
      videoId: 'M7lc1UVf-VE',
      title: 'YouTube Developers Live: Embedded Web Player Customization',
      streamer: 'GoogleDevelopers',
      category: 'Science & Technology',
      viewers: '12,450',
      description: 'Deep dive into the YouTube IFrame API, custom player architectures, and low-latency synchronization.',
      tags: ['Tech', 'Coding', 'Web3', 'AI', 'JavaScript'],
      thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
      avatarColor: '#4CAF50',
    },
  ];

  const currentHero = heroStreams[heroIndex];

  // Recommended Channels for Left Sidebar
  const sidebarChannels = [
    { name: 'RockstarGames', cat: 'Grand Theft Auto VI', viewers: '185K', color: '#E91E63', videoId: 'QdBZY2fkU-0' },
    { name: 'LofiGirl', cat: 'Music & Lofi', viewers: '78.9K', color: '#9C27B0', videoId: '5qap5aO4i9A' },
    { name: 'CyberpunkGame', cat: 'Cyberpunk 2077', viewers: '15.2K', color: '#00BCD4', videoId: 'PbVKBoDuhZ0' },
    { name: 'GoogleDevs', cat: 'Science & Tech', viewers: '12.4K', color: '#4CAF50', videoId: 'M7lc1UVf-VE' },
  ];

  // Sample curated parties for the "Browse Active Parties" shelf
  const sampleParties = [
    {
      id: 'GTAVIP',
      title: 'GTA VI Trailer Reveal & Breakdown',
      creator: 'RockstarGames',
      viewers: '185K',
      thumbnail: 'https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg',
      duration: '01:31',
      category: 'Grand Theft Auto VI',
      tags: ['English', 'GTA6', 'Trailer'],
    },
    {
      id: 'LOFIPY',
      title: 'Lofi Hip Hop Radio — Beats to Relax/Study',
      creator: 'LofiGirl',
      viewers: '78.9K',
      thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
      duration: 'LIVE',
      category: 'Music & Performing Arts',
      tags: ['Music', 'Chill', 'Lofi'],
    },
    {
      id: 'CYBER9',
      title: 'Cyberpunk 2077 Night City Walkthrough',
      creator: 'CyberpunkGame',
      viewers: '15.2K',
      thumbnail: 'https://i.ytimg.com/vi/PbVKBoDuhZ0/hqdefault.jpg',
      duration: '03:45',
      category: 'Cyberpunk 2077',
      tags: ['Gaming', 'Action', 'RPG'],
    },
    {
      id: 'WEB3AI',
      title: 'Next-Gen Web3 & AI Keynote Livestream',
      creator: 'GoogleDevs',
      viewers: '12.4K',
      thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
      duration: '33:10',
      category: 'Science & Technology',
      tags: ['Tech', 'Keynote', 'AI'],
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
    (p) => activeCategory === 'all' || p.category.toLowerCase().includes(activeCategory.toLowerCase())
  );

  return (
    <div className="flex-1 w-full h-[calc(100vh-50px)] flex overflow-hidden bg-[#0E0E10] text-[#EFEFF1]">
      {/* 1. Authentic Twitch Left Sidebar (240px expanded / 50px collapsed) */}
      <aside
        className={`bg-[#1F1F23] border-r border-[#2D2D35] flex flex-col justify-between shrink-0 select-none transition-all duration-200 z-20 ${
          isSidebarCollapsed ? 'w-[50px]' : 'w-[240px]'
        }`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar py-2 space-y-3">
          {/* Section: Recommended Channels */}
          <div>
            <div className="px-3 py-1.5 flex items-center justify-between">
              {!isSidebarCollapsed && (
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#EFEFF1]">
                  RECOMMENDED CHANNELS
                </span>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 text-[#ADADB8] hover:text-white hover:bg-[#2F2F35] rounded-[4px] transition-colors ml-auto"
                title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Channels List */}
            <div className="space-y-0.5">
              {sidebarChannels.map((c) => (
                <div
                  key={c.name}
                  onClick={() => {
                    setSelectedPresetId(c.videoId);
                    setCustomVideoUrl('');
                  }}
                  className="px-2 py-1.5 flex items-center gap-2.5 hover:bg-[#26262C] cursor-pointer transition-colors group"
                  title={isSidebarCollapsed ? `${c.name} • ${c.cat} (${c.viewers})` : undefined}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.name.charAt(0)}
                    </div>
                    <span className="w-2 h-2 rounded-full bg-[#EB0400] absolute -bottom-0.5 -right-0.5 border border-[#1F1F23]" />
                  </div>

                  {!isSidebarCollapsed && (
                    <>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-xs font-semibold text-[#EFEFF1] group-hover:text-[#BF94FF] truncate leading-tight">
                          {c.name}
                        </p>
                        <p className="text-[11px] text-[#ADADB8] truncate leading-tight">
                          {c.cat}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-xs font-mono tabular-nums text-[#ADADB8]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#EB0400]" />
                        <span>{c.viewers}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section: Categories */}
          {!isSidebarCollapsed && (
            <div className="px-2 pt-2 border-t border-[#2D2D35] space-y-1">
              <span className="px-2 text-[11px] font-bold uppercase tracking-wider text-[#EFEFF1] block mb-1.5">
                CATEGORIES
              </span>

              <button
                onClick={() => handleSelectCategory('gaming', 'QdBZY2fkU-0')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
                  activeCategory === 'gaming' ? 'bg-[#2F2F35] text-[#BF94FF]' : 'hover:bg-[#26262C] text-[#ADADB8] hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4 text-[#00F593]" />
                <span>Gaming</span>
              </button>

              <button
                onClick={() => handleSelectCategory('music', '5qap5aO4i9A')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
                  activeCategory === 'music' ? 'bg-[#2F2F35] text-[#BF94FF]' : 'hover:bg-[#26262C] text-[#ADADB8] hover:text-white'
                }`}
              >
                <Music className="w-4 h-4 text-[#BF94FF]" />
                <span>Music & Lofi</span>
              </button>

              <button
                onClick={() => handleSelectCategory('trailers', 'Way9Dexny3w')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
                  activeCategory === 'trailers' ? 'bg-[#2F2F35] text-[#BF94FF]' : 'hover:bg-[#26262C] text-[#ADADB8] hover:text-white'
                }`}
              >
                <Film className="w-4 h-4 text-[#FFD700]" />
                <span>Movie Trailers</span>
              </button>

              <button
                onClick={() => handleSelectCategory('nature', 'LXb3EKWsInQ')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
                  activeCategory === 'nature' ? 'bg-[#2F2F35] text-[#BF94FF]' : 'hover:bg-[#26262C] text-[#ADADB8] hover:text-white'
                }`}
              >
                <Trees className="w-4 h-4 text-[#00E5FF]" />
                <span>4K Nature</span>
              </button>

              <button
                onClick={() => handleSelectCategory('tech', 'M7lc1UVf-VE')}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-[4px] text-xs font-semibold transition-colors ${
                  activeCategory === 'tech' ? 'bg-[#2F2F35] text-[#BF94FF]' : 'hover:bg-[#26262C] text-[#ADADB8] hover:text-white'
                }`}
              >
                <Cpu className="w-4 h-4 text-[#FF69B4]" />
                <span>Tech & Keynotes</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Health status */}
        <div className="p-2.5 border-t border-[#2D2D35] flex items-center justify-between text-xs">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#00F593]">
              <span className="w-2 h-2 rounded-full bg-[#00F593] animate-pulse" />
              <span>Server Online</span>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Scrollable Canvas (#0E0E10) */}
      <main className="flex-1 h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 space-y-7 no-scrollbar">
        {/* Error notification */}
        {error && (
          <div className="p-3 bg-[#EB0400]/15 border border-[#EB0400]/40 rounded-[4px] text-[#FF4A4A] text-xs font-semibold flex items-center justify-between animate-in fade-in duration-150">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-[#ADADB8] hover:text-white">✕</button>
          </div>
        )}

        {/* TOP HERO: Authentic Twitch Live Featured Carousel */}
        <section className="relative w-full max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row bg-[#18181B] border border-[#2D2D35] rounded-[6px] overflow-hidden shadow-2xl">
            {/* Left: 16:9 Video Theater Frame */}
            <div className="relative aspect-video lg:w-[65%] bg-black overflow-hidden group/theater">
              <img
                src={currentHero.thumbnail}
                alt={currentHero.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              {/* Twitch LIVE Badge */}
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-[2px] bg-[#EB0400] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
              {/* Viewer Count */}
              <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-[2px] bg-black/80 backdrop-blur-sm text-white text-xs font-medium tabular-nums flex items-center gap-1">
                <span>{currentHero.viewers} viewers</span>
              </div>

              {/* Quick Play Action Button on hover */}
              <div
                onClick={() => {
                  setSelectedPresetId(currentHero.videoId);
                  const chosen = username.trim() || `Viewer${Math.floor(100 + Math.random() * 900)}`;
                  if (!username.trim()) {
                    setUsername(chosen);
                    localStorage.setItem('watchsync_username', chosen);
                  }
                  setIsSubmitting(true);
                  onJoin(chosen, undefined, currentHero.videoId);
                }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover/theater:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-[#9146FF] hover:bg-[#772CE8] flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-7 h-7 fill-current ml-1" />
                </div>
              </div>
            </div>

            {/* Right: Streamer Info Card (Twitch Style) */}
            <div className="lg:w-[35%] p-5 flex flex-col justify-between space-y-4 bg-[#18181B]">
              <div className="space-y-3">
                {/* Channel & Category Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md ring-2 ring-[#9146FF]"
                    style={{ backgroundColor: currentHero.avatarColor }}
                  >
                    {currentHero.streamer.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#EFEFF1] truncate hover:text-[#BF94FF] cursor-pointer">
                        {currentHero.streamer}
                      </span>
                      {/* Twitch Official Verified Rosette SVG Badge */}
                      <svg className="w-4 h-4 text-[#9146FF] fill-current shrink-0" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 1l2.5 1.5L15 2l1.5 2.5L19 5l-.5 3 2 2.5-2 2.5.5 3-2.5.5L15 18l-2.5-.5L10 19l-2.5-1.5L5 18l-1.5-2.5L1 15l.5-3L-.5 9.5l2-2.5-.5-3L3.5 4 5 1.5 7.5 2 10 1zm-1 12.5l5.5-5.5-1.5-1.5L9 10.5 7 8.5 5.5 10l3.5 3.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-xs text-[#BF94FF] hover:underline cursor-pointer truncate">
                      {currentHero.category}
                    </p>
                    <p className="text-[11px] text-[#ADADB8] font-mono tabular-nums">
                      {currentHero.viewers} viewers
                    </p>
                  </div>
                </div>

                {/* Stream Title */}
                <h3 className="text-sm font-semibold text-[#EFEFF1] leading-snug line-clamp-2">
                  {currentHero.title}
                </h3>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {currentHero.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-[#2F2F35] hover:bg-[#3A3A42] text-[#ADADB8] hover:text-[#EFEFF1] text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Description */}
                <p className="text-xs text-[#ADADB8] line-clamp-2 leading-relaxed">
                  {currentHero.description}
                </p>
              </div>

              {/* Hero Action Button & Switchers */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#2D2D35]">
                <button
                  onClick={() => {
                    setSelectedPresetId(currentHero.videoId);
                    const chosen = username.trim() || `Viewer${Math.floor(100 + Math.random() * 900)}`;
                    if (!username.trim()) {
                      setUsername(chosen);
                      localStorage.setItem('watchsync_username', chosen);
                    }
                    setIsSubmitting(true);
                    onJoin(chosen, undefined, currentHero.videoId);
                  }}
                  className="flex-1 h-[36px] px-4 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Watch in Theater</span>
                </button>

                {/* Carousel Navigation Arrows */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setHeroIndex((prev) => (prev === 0 ? heroStreams.length - 1 : prev - 1))}
                    className="p-1.5 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] transition-colors"
                    title="Previous Stream"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setHeroIndex((prev) => (prev === heroStreams.length - 1 ? 0 : prev + 1))}
                    className="p-1.5 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] transition-colors"
                    title="Next Stream"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. CREATE & JOIN BENTO SECTION (Twitch Style) */}
        <section ref={createSectionRef} className="w-full max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-[#2D2D35]">
            <h2 className="text-base sm:text-lg font-bold text-[#EFEFF1] tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#BF94FF]" />
              <span>Host or Join a Live Watch Party</span>
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-[#00F593]">
              <span className="w-2 h-2 rounded-full bg-[#00F593] animate-pulse" />
              <span>Strict RBAC & Anti-Echo Sync Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Start Watch Party */}
            <div className="bg-[#18181B] border border-[#2D2D35] rounded-[6px] p-5 flex flex-col justify-between shadow-xl">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Tv className="w-4 h-4 text-[#BF94FF]" />
                      <span>Start a Watch Party</span>
                    </h3>
                    <span className="text-[10px] font-bold text-[#BF94FF] bg-[#9146FF]/15 px-2 py-0.5 rounded-[3px] border border-[#9146FF]/30">
                      HOST PRIVILEGES
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#ADADB8] uppercase tracking-wider block mb-1">
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
                      className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-[4px] px-3 text-xs text-[#EFEFF1] placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#ADADB8] uppercase tracking-wider block mb-1">
                      Starting YouTube Video URL / ID
                    </label>
                    <input
                      type="text"
                      placeholder="https://youtu.be/... or paste ID"
                      value={customVideoUrl}
                      onChange={(e) => setCustomVideoUrl(e.target.value)}
                      className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-[4px] px-3 text-xs text-[#EFEFF1] placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  {/* Quick Preset Chips */}
                  <div>
                    <label className="text-[10px] font-bold text-[#ADADB8] uppercase tracking-wider block mb-1.5">
                      Or Choose a Quick Preset:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {presetChips.map((chip) => {
                        const isSelected = selectedPresetId === chip.videoId && !customVideoUrl.trim();
                        return (
                          <button
                            key={chip.videoId}
                            type="button"
                            onClick={() => {
                              setSelectedPresetId(chip.videoId);
                              setCustomVideoUrl('');
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                              isSelected
                                ? 'bg-[#9146FF] text-white shadow-md'
                                : 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#ADADB8] hover:text-[#EFEFF1]'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[38px] bg-[#9146FF] hover:bg-[#772CE8] active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-[4px] shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Watch Party...</span>
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

            {/* Card 2: Join with Room Code */}
            <div className="bg-[#18181B] border border-[#2D2D35] rounded-[6px] p-5 flex flex-col justify-between shadow-xl">
              <form onSubmit={handleJoin} className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-[#00F593]" />
                      <span>Join with Room Code</span>
                    </h3>
                    <span className="text-[10px] font-bold text-[#00F593] bg-[#00F593]/15 px-2 py-0.5 rounded-[3px] border border-[#00F593]/30">
                      PARTICIPANT
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#ADADB8] uppercase tracking-wider block mb-1">
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
                      className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-[4px] px-3 text-xs text-[#EFEFF1] placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#ADADB8] uppercase tracking-wider block mb-1">
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
                      className="w-full h-[36px] bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#464649] focus:border-[#9146FF] rounded-[4px] px-3 text-sm font-mono font-bold tracking-widest text-[#EFEFF1] uppercase placeholder-[#71717A] outline-none transition-colors"
                    />
                  </div>

                  <p className="text-[11px] text-[#ADADB8] pt-1">
                    Have an invite link? Opening it auto-fills the room code.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[38px] bg-[#1F1F23] hover:bg-[#26262C] active:scale-[0.98] border border-[#2D2D35] hover:border-[#00F593] disabled:opacity-50 text-white font-semibold text-sm rounded-[4px] shadow-md transition-all flex items-center justify-center gap-2 mt-2"
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
              </form>
            </div>
          </div>
        </section>

        {/* 3. SHELF 1: Open Public Rooms (Twitch Card Grid) */}
        <section ref={publicRoomsRef} className="w-full max-w-6xl mx-auto space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#EFEFF1] tracking-tight flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00F593]" />
              <span>Live watch parties we think you'll like</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F593]/20 text-[#00F593] border border-[#00F593]/40">
                {publicRooms.length} Live Now
              </span>
            </h2>
            <span className="text-xs text-[#ADADB8] hidden sm:inline">Synced with server in real time</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {publicRooms.map((room) => {
              const thumbnailSrc = room.videoId
                ? `https://i.ytimg.com/vi/${room.videoId}/hqdefault.jpg`
                : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
              const avatarColor = getTwitchUserColor(room.roomId);

              return (
                <div
                  key={room.roomId}
                  onClick={() => handleSelectSample(room.roomId)}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  {/* Twitch Thumbnail with Signature Hover Translation */}
                  <div className="twitch-card-container">
                    <div className="twitch-card-backdrop" />
                    <div className="twitch-card-thumb aspect-video w-full bg-black rounded-[4px] overflow-hidden relative shadow-md">
                      <img
                        src={thumbnailSrc}
                        alt={room.videoTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      {/* LIVE Badge */}
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-[#EB0400] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>LIVE</span>
                      </div>
                      {/* Viewers */}
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-black/80 text-white text-[11px] font-medium font-mono tabular-nums">
                        👥 {room.viewers} in room
                      </div>
                    </div>
                  </div>

                  {/* Channel Details Under Thumbnail */}
                  <div className="mt-2.5 flex items-start gap-2.5">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {room.roomId.charAt(0)}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4
                        className="text-xs font-semibold text-[#EFEFF1] line-clamp-1 group-hover:text-[#BF94FF] transition-colors leading-tight"
                        title={room.videoTitle}
                      >
                        {room.videoTitle}
                      </h4>
                      <p className="text-[11px] text-[#ADADB8] flex items-center gap-1">
                        <span>ROOM: {room.roomId}</span>
                        <CheckCircle2 className="w-3 h-3 text-[#BF94FF] shrink-0" />
                      </p>
                      <p className="text-[11px] text-[#ADADB8]">
                        Watch Party • YouTube Live
                      </p>
                      <div className="flex items-center gap-1 pt-1">
                        <span className="px-2 py-0.5 rounded-full bg-[#29292E] text-[#ADADB8] text-[10px] font-semibold hover:bg-[#3A3A42]">
                          English
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#29292E] text-[#ADADB8] text-[10px] font-semibold hover:bg-[#3A3A42]">
                          Party
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. SHELF 2: Browse Featured Parties */}
        <section ref={browseRef} className="w-full max-w-6xl mx-auto space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[#EFEFF1] tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#EB0400]" />
              <span>Recommended streams & parties</span>
            </h2>
            <span className="text-xs text-[#ADADB8]">Click any stream to join</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredParties.map((p) => {
              const avatarColor = getTwitchUserColor(p.creator);
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectSample(p.id)}
                  className="group cursor-pointer flex flex-col justify-between"
                >
                  {/* Thumbnail with Signature Hover Translation */}
                  <div className="twitch-card-container">
                    <div className="twitch-card-backdrop" />
                    <div className="twitch-card-thumb aspect-video w-full bg-black rounded-[4px] overflow-hidden relative shadow-md">
                      <img
                        src={p.thumbnail}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-[#EB0400] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>LIVE</span>
                      </div>
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-[2px] bg-black/80 text-white text-[11px] font-medium font-mono tabular-nums">
                        👥 {p.viewers}
                      </div>
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[2px] bg-black/80 text-white text-[11px] font-mono">
                        {p.duration}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-2.5 flex items-start gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {p.creator.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h4
                        className="text-xs font-semibold text-[#EFEFF1] line-clamp-1 group-hover:text-[#BF94FF] transition-colors leading-tight"
                        title={p.title}
                      >
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-[#ADADB8] flex items-center gap-1">
                        <span>{p.creator}</span>
                        <CheckCircle2 className="w-3 h-3 text-[#BF94FF] shrink-0" />
                      </p>
                      <p className="text-[11px] text-[#ADADB8] truncate">
                        {p.category}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {p.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-full bg-[#29292E] text-[#ADADB8] text-[10px] font-semibold hover:bg-[#3A3A42]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. SHELF 3: Recently Watched & History */}
        <section ref={historyRef} className="w-full max-w-6xl mx-auto">
          {watchHistory.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#2D2D35]">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-bold text-[#EFEFF1] tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#BF94FF]" />
                  <span>Recently Watched & History</span>
                </h2>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-xs text-[#ADADB8] hover:text-[#EB0400] flex items-center gap-1 transition-colors"
                  title="Clear history"
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
                    className="group cursor-pointer bg-[#18181B] border border-[#2D2D35] hover:border-[#9146FF] rounded-[4px] p-2 flex items-center gap-3 transition-all hover:bg-[#1F1F23]"
                  >
                    <div className="relative aspect-video w-28 bg-black rounded-[2px] overflow-hidden shrink-0">
                      <img
                        src={item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-current" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h4
                        className="text-xs font-semibold text-[#EFEFF1] line-clamp-1 group-hover:text-[#BF94FF] transition-colors"
                        title={item.title}
                      >
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#ADADB8] truncate">{item.channel || 'Watch Party'}</p>
                      <div className="flex items-center justify-between text-[10px] text-[#ADADB8]">
                        <span>{formatTimeAgo(item.watchedAt)}</span>
                        <span className="text-[#BF94FF] font-semibold group-hover:underline">Start Party →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
