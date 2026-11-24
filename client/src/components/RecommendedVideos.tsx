import React, { useState, useMemo } from 'react';
import {
  Play,
  Plus,
  Send,
  Search,
  Sparkles,
  Flame,
  Music,
  Gamepad2,
  Film,
  Trees,
  Cpu,
  CheckCircle2,
  Clock,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Role } from '../types';
import { getSocket } from '../services/socket';

export interface RecommendedVideoItem {
  id: string;
  title: string;
  channel: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: 'Trailers' | 'Music' | 'Gaming' | 'Nature' | 'Tech';
  description?: string;
}

export const CURATED_RECOMMENDED_VIDEOS: RecommendedVideoItem[] = [
  // Trailers
  {
    id: 'QdBZY2fkU-0',
    title: 'Grand Theft Auto VI Trailer 1',
    channel: 'Rockstar Games',
    views: '185M views',
    uploadedAt: '1 year ago',
    duration: '01:31',
    category: 'Trailers',
    description: 'Our trailer has leaked so please watch the real thing on YouTube. Grand Theft Auto VI continues our efforts to push the limits of what is possible.',
  },
  {
    id: 'Way9Dexny3w',
    title: 'Dune: Part Two | Official Trailer 3',
    channel: 'Warner Bros. Pictures',
    views: '34M views',
    uploadedAt: '11 months ago',
    duration: '02:24',
    category: 'Trailers',
    description: 'The saga continues as award-winning filmmaker Denis Villeneuve embarks on “Dune: Part Two,” the next chapter of Frank Herbert’s celebrated novel.',
  },
  {
    id: '8g1vEAt46vM',
    title: 'Interstellar — 10th Anniversary IMAX Re-Release Trailer',
    channel: 'Paramount Pictures',
    views: '8.2M views',
    uploadedAt: '4 months ago',
    duration: '02:10',
    category: 'Trailers',
    description: 'Christopher Nolan’s sci-fi epic returns to the biggest screens for its 10th anniversary in pristine IMAX 70mm.',
  },
  // Music & Lofi
  {
    id: 'DWcJFNfaw9c',
    title: 'synthwave radio 🌌 beats to chill/game to',
    channel: 'Lofi Girl',
    views: '24K watching',
    uploadedAt: 'LIVE',
    duration: 'LIVE',
    category: 'Music',
    description: 'Peaceful synthwave & chillwave beats to relax, study, game, or sleep to. Available 24/7 on Lofi Girl.',
  },
  {
    id: '5qap5aO4i9A',
    title: 'lofi hip hop radio 💤 beats to sleep/chill to',
    channel: 'Lofi Girl',
    views: '32K watching',
    uploadedAt: 'LIVE',
    duration: 'LIVE',
    category: 'Music',
    description: 'Slow down and drift away with peaceful, gentle lofi beats designed for relaxation and deep rest.',
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channel: 'Luis Fonsi',
    views: '8.4B views',
    uploadedAt: '7 years ago',
    duration: '04:42',
    category: 'Music',
    description: '“Despacito” available on all digital platforms! Watch the official music video breaking global records.',
  },
  // 4K Nature & Relaxation
  {
    id: 'LXb3EKWsInQ',
    title: 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)',
    channel: 'Jacob + Katie Schwarz',
    views: '112M views',
    uploadedAt: '5 years ago',
    duration: '05:15',
    category: 'Nature',
    description: 'Experience the stunning wildlife and lush landscapes of Costa Rica captured in glorious 4K 60fps HDR.',
  },
  {
    id: '1ZYbU8880MB',
    title: 'Switzerland in 8K ULTRA HD 60fps — Scenic Relaxation Film',
    channel: 'Relaxation Film',
    views: '48M views',
    uploadedAt: '2 years ago',
    duration: '15:20',
    category: 'Nature',
    description: 'Breathtaking drone footage traversing the Swiss Alps, pristine lakes, and idyllic alpine villages.',
  },
  {
    id: 'ysz5S6PUM-U',
    title: 'Planet Earth from Space in 4K HDR',
    channel: 'BBC Earth',
    views: '26M views',
    uploadedAt: '3 years ago',
    duration: '08:45',
    category: 'Nature',
    description: 'A mesmerizing orbital look down at planet Earth, watching weather systems, auroras, and city lights glow.',
  },
  // Gaming
  {
    id: 'PbVKBoDuhZ0',
    title: 'Cyberpunk 2077: Phantom Liberty — Official Cinematic Trailer',
    channel: 'Cyberpunk 2077',
    views: '15M views',
    uploadedAt: '1 year ago',
    duration: '03:45',
    category: 'Gaming',
    description: 'Return to Night City in a gripping spy-thriller expansion featuring Idris Elba as secret agent Solomon Reed.',
  },
  {
    id: 'qLZenOn7WUo',
    title: 'The Legend of Zelda: Tears of the Kingdom – Final Trailer',
    channel: 'Nintendo of America',
    views: '14M views',
    uploadedAt: '1 year ago',
    duration: '03:54',
    category: 'Gaming',
    description: 'An epic adventure awaits across the land and skies of Hyrule. Witness the final launch trailer for the Game of the Year.',
  },
  // Tech & Talks
  {
    id: 'M7lc1UVf-VE',
    title: 'YouTube Developers Live: Embedded Web Player Customization',
    channel: 'Google Developers',
    views: '1.2M views',
    uploadedAt: '10 years ago',
    duration: '33:10',
    category: 'Tech',
    description: 'Deep dive into the YouTube IFrame Player API, JavaScript controllers, and custom player UI architectures.',
  },
  {
    id: 'UF8uR6Z6KLc',
    title: 'Steve Jobs Introduces The Original iPhone in 2007',
    channel: 'Apple Archive',
    views: '18M views',
    uploadedAt: '12 years ago',
    duration: '51:12',
    category: 'Tech',
    description: 'The legendary keynote that changed modern technology forever. Three revolutionary products in one device.',
  },
];

interface RecommendedVideosProps {
  roomId: string;
  canControl: boolean;
  currentUserRole: Role;
  currentVideoId?: string;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const RecommendedVideos: React.FC<RecommendedVideosProps> = ({
  roomId,
  canControl,
  currentUserRole,
  currentVideoId,
  onNotification,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const socket = getSocket();

  const categories = [
    { label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { label: 'Trailers', icon: <Film className="w-3.5 h-3.5" /> },
    { label: 'Music', icon: <Music className="w-3.5 h-3.5" /> },
    { label: 'Gaming', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { label: 'Nature', icon: <Trees className="w-3.5 h-3.5" /> },
    { label: 'Tech', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  // Filter videos based on category and search query
  const filteredVideos = useMemo(() => {
    return CURATED_RECOMMENDED_VIDEOS.filter((v) => {
      const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.channel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Actions
  const handlePlayNow = (videoId: string, title: string) => {
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
  };

  const handleAddToQueue = (videoId: string, title: string) => {
    if (canControl) {
      socket.emit('queue_add', { roomId, videoId });
      onNotification?.(`Added to Queue: ${title}`, 'success');
    } else {
      socket.emit('queue_suggest', { roomId, videoId });
      onNotification?.(`Suggested to Queue: ${title}`, 'info');
    }
  };

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    if (canControl) {
      socket.emit('queue_add', { roomId, videoId: customUrl.trim() });
      onNotification?.('Added custom video to Queue', 'success');
    } else {
      socket.emit('queue_suggest', { roomId, videoId: customUrl.trim() });
      onNotification?.('Suggested custom video to Host', 'info');
    }
    setCustomUrl('');
  };

  return (
    <div className="w-full space-y-4 pt-2">
      {/* Header & YouTube Search / Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2F2F35] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-[#EB0400]/20 text-[#FF4A4A]">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>Suggested & Recommended Videos</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1F23] text-[#ADADB8] border border-[#2F2F35]">
                YouTube
              </span>
            </h3>
            <p className="text-[11px] text-[#ADADB8]">Browse, play, or queue videos with your party</p>
          </div>
        </div>

        {/* Quick Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter suggested videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#242731] hover:bg-[#2C303D] focus:bg-[#131419] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* YouTube Filter Chips Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 select-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.label;
          return (
            <button
              key={cat.label}
              onClick={() => setSelectedCategory(cat.label)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white font-bold shadow-md shadow-[#FF5E62]/20'
                  : 'bg-[#242731] hover:bg-[#2C303D] text-zinc-300 border border-white/[0.08]'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggested Videos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredVideos.map((video) => {
          const isCurrentlyPlaying = video.id === currentVideoId;
          const thumbnailSrc = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

          return (
            <div
              key={video.id}
              className={`group bg-[#242731] hover:bg-[#2C303D] border rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 shadow-lg ${
                isCurrentlyPlaying
                  ? 'border-[#FF5E62] ring-1 ring-[#FF5E62] shadow-[#FF5E62]/15'
                  : 'border-white/[0.08] hover:border-white/[0.2]'
              }`}
            >
              {/* Thumbnail Stage with Badges & Hover Overlay */}
              <div className="relative aspect-video w-full bg-black overflow-hidden">
                <img
                  src={thumbnailSrc}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80`;
                  }}
                />

                {/* Duration Badge */}
                <span
                  className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-lg text-[10px] font-bold font-mono tracking-wider shadow ${
                    video.duration === 'LIVE'
                      ? 'bg-[#FF5E62] text-white flex items-center gap-1'
                      : 'bg-black/85 text-white backdrop-blur-sm'
                  }`}
                >
                  {video.duration === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  <span>{video.duration}</span>
                </span>

                {/* Now Playing Banner */}
                {isCurrentlyPlaying && (
                  <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>NOW PLAYING</span>
                  </div>
                )}

                {/* Hover Quick Play Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handlePlayNow(video.id, video.title)}
                    className="p-3 rounded-full bg-gradient-to-r from-[#FF5E62] to-[#FF9966] text-white shadow-xl hover:scale-110 active:scale-95 transition-all"
                    title={canControl ? 'Play Now' : 'Request Play'}
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </button>
                  <button
                    onClick={() => handleAddToQueue(video.id, video.title)}
                    className="p-3 rounded-full bg-[#1B1D24] hover:bg-[#242731] text-white border border-white/[0.1] shadow-xl hover:scale-110 active:scale-95 transition-all"
                    title={canControl ? 'Add to Queue' : 'Suggest to Host'}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Video Details Card Body */}
              <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                <div className="space-y-1">
                  <h4
                    className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-[#FF9966] transition-colors"
                    title={video.title}
                  >
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-200 truncate max-w-[140px]">{video.channel}</span>
                    <CheckCircle2 className="w-3 h-3 text-[#2EE59D] shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono tabular-nums">
                    <span>{video.views}</span>
                    <span>•</span>
                    <span>{video.uploadedAt}</span>
                  </div>
                </div>

                {/* Quick Action Footer Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.08]">
                  <button
                    onClick={() => handlePlayNow(video.id, video.title)}
                    disabled={isCurrentlyPlaying}
                    className="flex-1 py-1.5 px-2 bg-gradient-to-r from-[#FF5E62]/15 to-[#FF9966]/15 hover:from-[#FF5E62] hover:to-[#FF9966] disabled:opacity-40 text-[#FF9966] hover:text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] border border-[#FF5E62]/20"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{isCurrentlyPlaying ? 'Playing' : canControl ? 'Play Now' : 'Request Play'}</span>
                  </button>

                  <button
                    onClick={() => handleAddToQueue(video.id, video.title)}
                    className="py-1.5 px-2.5 bg-[#1B1D24] hover:bg-[#2C303D] text-zinc-300 hover:text-white rounded-xl border border-white/[0.08] text-[11px] font-medium flex items-center gap-1 transition-colors active:scale-[0.98]"
                    title={canControl ? 'Add to Queue' : 'Suggest to Host'}
                  >
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">{canControl ? 'Queue' : 'Suggest'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct YouTube Link Submission Bar */}
      <form
        onSubmit={handleCustomAdd}
        className="mt-4 p-4 bg-[#242731] border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Film className="w-4 h-4 text-[#FF9966] shrink-0" />
          <div>
            <p className="text-xs font-bold text-white">Have another YouTube video in mind?</p>
            <p className="text-[11px] text-zinc-400">Paste any YouTube URL or video ID to queue or suggest</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <input
            type="text"
            placeholder="Paste YouTube link (e.g. https://youtu.be/...)"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            className="flex-1 bg-[#1B1D24] hover:bg-[#2C303D] focus:bg-[#131419] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!customUrl.trim()}
            className="px-4 py-1.5 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-[0.98] shadow-md shadow-[#FF5E62]/20"
          >
            {canControl ? (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Queue</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Suggest</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
