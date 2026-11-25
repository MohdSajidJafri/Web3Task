import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Send,
  Loader2,
  Search,
  SlidersHorizontal,
  Radio,
  Clock,
  Film,
  Sparkles,
} from 'lucide-react';
import { searchYouTubePaginated, YouTubeSearchResult } from '../services/youtube';
import { getTwitchUserColor } from '../utils/colors';

interface SearchResultsPageProps {
  query: string;
  inRoom: boolean;
  canControl?: boolean;
  roomId?: string;
  onBack: () => void;
  onStartPartyWithVideo?: (videoId: string, title?: string) => void;
  onPlayVideo?: (videoId: string, title?: string) => void;
  onQueueVideo?: (videoId: string, title?: string) => void;
  onSuggestVideo?: (videoId: string, title?: string) => void;
}

type SearchFilter = 'all' | 'live' | 'short' | 'long';

function parseDurationSeconds(duration?: string): number | null {
  if (!duration || duration === 'LIVE') return null;
  const parts = duration.split(':').map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  query,
  inRoom,
  canControl = false,
  roomId,
  onBack,
  onStartPartyWithVideo,
  onPlayVideo,
  onQueueVideo,
  onSuggestVideo,
}) => {
  const [results, setResults] = useState<YouTubeSearchResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('all');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef<boolean>(false);

  // Initial search whenever query changes
  useEffect(() => {
    let cancelled = false;

    const runInitialSearch = async () => {
      if (!query.trim()) {
        setResults([]);
        setNextPageToken(null);
        setIsInitialLoading(false);
        return;
      }

      setIsInitialLoading(true);
      setResults([]);
      setNextPageToken(null);
      setActiveFilter('all');
      isFetchingRef.current = true;

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      const data = await searchYouTubePaginated(query);
      if (!cancelled) {
        // Deduplicate initial results
        const seen = new Set<string>();
        const unique = data.results.filter((v) => {
          if (seen.has(v.id)) return false;
          seen.add(v.id);
          return true;
        });
        setResults(unique);
        setNextPageToken(data.nextPageToken);
        setIsInitialLoading(false);
        isFetchingRef.current = false;
      }
    };

    runInitialSearch();
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Load next page for endless scrolling
  const loadMore = useCallback(async () => {
    if (!nextPageToken || isFetchingRef.current || isInitialLoading) return;

    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const data = await searchYouTubePaginated(query, nextPageToken);
      setResults((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const fresh = data.results.filter((v) => !seen.has(v.id));
        return [...prev, ...fresh];
      });
      setNextPageToken(data.nextPageToken);
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [query, nextPageToken, isInitialLoading]);

  // IntersectionObserver for automatic endless scrolling
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollContainerRef.current;
    if (!sentinel || !root || !nextPageToken) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      {
        root,
        rootMargin: '450px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextPageToken, results.length]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return results.filter((v) => {
      if (activeFilter === 'live') return v.duration === 'LIVE';
      const secs = parseDurationSeconds(v.duration);
      if (secs === null) return false;
      if (activeFilter === 'short') return secs < 240;
      if (activeFilter === 'long') return secs >= 1200;
      return true;
    });
  }, [results, activeFilter]);

  const filterChips: { id: SearchFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'live', label: 'Live', icon: <Radio className="w-3.5 h-3.5 text-[#EB0400]" /> },
    { id: 'short', label: 'Under 4 min', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'long', label: 'Over 20 min', icon: <Film className="w-3.5 h-3.5" /> },
  ];

  const handlePrimaryAction = (video: YouTubeSearchResult) => {
    if (inRoom) {
      if (canControl) {
        onPlayVideo?.(video.id, video.title);
      } else {
        onSuggestVideo?.(video.id, video.title);
      }
    } else {
      onStartPartyWithVideo?.(video.id, video.title);
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 w-full h-[calc(100vh-50px)] overflow-y-auto bg-[#0E0E10] text-[#EFEFF1]"
    >
      {/* Sticky Sub-Header with Back Button & YouTube Filter Chips */}
      <div className="sticky top-0 z-20 bg-[#0E0E10]/95 backdrop-blur-md border-b border-[#2D2D35]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                className="h-[32px] px-3 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{inRoom ? `Back to Party (${roomId})` : 'Back to Home'}</span>
              </button>

              <div className="min-w-0 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#BF94FF] shrink-0 hidden sm:block" />
                <h1 className="text-sm sm:text-base font-bold text-white truncate">
                  Results for <span className="text-[#BF94FF]">"{query}"</span>
                </h1>
              </div>
            </div>

            {!isInitialLoading && (
              <span className="text-xs text-[#ADADB8] font-mono">
                {filteredResults.length} videos loaded
                {nextPageToken ? ' • Scroll for more' : ''}
              </span>
            )}
          </div>

          {/* YouTube Filter Chips Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ADADB8] mr-1 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </span>
            {filterChips.map((chip) => {
              const isActive = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[4px] text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#EFEFF1] text-[#0E0E10]'
                      : 'bg-[#1F1F23] hover:bg-[#2F2F35] text-[#EFEFF1] border border-[#2F2F35]'
                  }`}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main YouTube Search Results Feed */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {isInitialLoading ? (
          /* Skeleton Loading State (Matches YouTube Layout) */
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-4 p-2 rounded-[6px] animate-pulse"
              >
                <div className="w-full sm:w-[340px] aspect-video bg-[#18181B] rounded-[6px] shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-5 bg-[#18181B] rounded w-3/4" />
                  <div className="h-3 bg-[#18181B] rounded w-1/3" />
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-6 h-6 rounded-full bg-[#18181B]" />
                    <div className="h-3 bg-[#18181B] rounded w-32" />
                  </div>
                  <div className="h-3 bg-[#18181B] rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-[6px] p-12 text-center space-y-3">
            <Search className="w-10 h-10 text-[#ADADB8] mx-auto opacity-60" />
            <h2 className="text-base font-bold text-white">
              No videos found for "{query}"
              {activeFilter !== 'all' ? ` under "${activeFilter}" filter` : ''}
            </h2>
            <p className="text-xs text-[#ADADB8] max-w-md mx-auto">
              Try different keywords, clear the filter, or paste a direct YouTube URL in the search bar.
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="px-4 py-1.5 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold"
              >
                Show All Results
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredResults.map((video) => {
              const channelColor = getTwitchUserColor(video.channel || 'YouTube');
              return (
                <div
                  key={video.id}
                  onClick={() => handlePrimaryAction(video)}
                  className="group cursor-pointer flex flex-col sm:flex-row gap-4 p-2.5 -mx-2.5 rounded-[6px] hover:bg-[#18181B] border border-transparent hover:border-[#2F2F35] transition-all"
                >
                  {/* Left: Large YouTube-style 16:9 Thumbnail */}
                  <div className="twitch-card-container w-full sm:w-[320px] md:w-[360px] shrink-0">
                    <div className="twitch-card-backdrop" />
                    <div className="twitch-card-thumb relative aspect-video w-full bg-black rounded-[4px] overflow-hidden shadow-md">
                      <img
                        src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('unsplash')) {
                            target.src =
                              'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                          }
                        }}
                      />

                      {/* Duration or LIVE Badge */}
                      {video.duration && (
                        <span
                          className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[2px] text-[11px] font-bold font-mono tracking-wide shadow ${
                            video.duration === 'LIVE'
                              ? 'bg-[#EB0400] text-white flex items-center gap-1'
                              : 'bg-black/85 text-white'
                          }`}
                        >
                          {video.duration === 'LIVE' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          )}
                          <span>{video.duration}</span>
                        </span>
                      )}

                      {/* Hover Play Overlay */}
                      <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="px-3.5 py-2 rounded-[4px] bg-[#9146FF] text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
                          <Play className="w-4 h-4 fill-current" />
                          <span>
                            {inRoom
                              ? canControl
                                ? 'Play in Party'
                                : 'Suggest Video'
                              : 'Start Watch Party'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: YouTube-Style Video Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 gap-2">
                    <div className="space-y-1.5">
                      <h3
                        className="text-base sm:text-[18px] font-semibold text-[#EFEFF1] group-hover:text-[#BF94FF] transition-colors line-clamp-2 leading-snug"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {/* Views & Published Time */}
                      {(video.views || video.publishedTime) && (
                        <div className="flex items-center gap-1.5 text-xs text-[#ADADB8]">
                          {video.views && <span>{video.views}</span>}
                          {video.views && video.publishedTime && <span>•</span>}
                          {video.publishedTime && <span>{video.publishedTime}</span>}
                        </div>
                      )}

                      {/* Channel Row */}
                      <div className="flex items-center gap-2 py-1">
                        {video.channelAvatar ? (
                          <img
                            src={video.channelAvatar}
                            alt={video.channel}
                            className="w-6 h-6 rounded-full object-cover shrink-0 bg-[#2F2F35]"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ backgroundColor: channelColor }}
                          >
                            {(video.channel || 'Y').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium text-[#ADADB8] group-hover:text-[#EFEFF1] truncate">
                          {video.channel}
                        </span>
                        {video.verified && (
                          <svg
                            className="w-3.5 h-3.5 text-[#ADADB8] fill-current shrink-0"
                            viewBox="0 0 20 20"
                          >
                            <title>Verified</title>
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Description Snippet */}
                      {video.description && (
                        <p className="text-xs text-[#ADADB8] line-clamp-2 leading-relaxed">
                          {video.description}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons Row */}
                    <div
                      className="flex items-center gap-2 pt-1 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {inRoom ? (
                        canControl ? (
                          <>
                            <button
                              onClick={() => onPlayVideo?.(video.id, video.title)}
                              className="h-[30px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Play Now</span>
                            </button>
                            <button
                              onClick={() => onQueueVideo?.(video.id, video.title)}
                              className="h-[30px] px-3 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Queue</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => onSuggestVideo?.(video.id, video.title)}
                            className="h-[30px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Suggest to Host</span>
                          </button>
                        )
                      ) : (
                        <button
                          onClick={() => onStartPartyWithVideo?.(video.id, video.title)}
                          className="h-[30px] px-3.5 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98]"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Watch Party</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Endless Scroll Sentinel & Loading Indicator */}
        <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-3">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-xs text-[#ADADB8]">
              <Loader2 className="w-5 h-5 text-[#9146FF] animate-spin" />
              <span>Loading more videos from YouTube...</span>
            </div>
          )}

          {!isInitialLoading && !isLoadingMore && nextPageToken && (
            <button
              onClick={loadMore}
              className="h-[34px] px-5 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold transition-colors"
            >
              Load More Videos
            </button>
          )}

          {!isInitialLoading && !nextPageToken && results.length > 0 && (
            <p className="text-xs text-[#71717A]">End of YouTube search results</p>
          )}
        </div>
      </div>
    </div>
  );
};
