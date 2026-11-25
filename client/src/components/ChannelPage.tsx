import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Bell,
  Play,
  Plus,
  Send,
  Clock,
  Check,
  Loader2,
  Film,
  Radio,
  Sparkles,
  Info,
  Search,
  Users,
  Video,
} from 'lucide-react';
import {
  getYouTubeChannel,
  ChannelInfo,
  YouTubeSearchResult,
} from '../services/youtube';
import {
  isChannelSubscribed,
  toggleChannelSubscription,
  isInWatchLater,
  toggleWatchLater,
} from '../utils/library';
import { getTwitchUserColor } from '../utils/colors';

export interface ChannelTarget {
  channelId?: string;
  handle?: string;
  name?: string;
}

interface ChannelPageProps {
  target: ChannelTarget;
  inRoom: boolean;
  canControl?: boolean;
  roomId?: string;
  onBack: () => void;
  onStartPartyWithVideo?: (videoId: string, title?: string) => void;
  onPlayVideo?: (videoId: string, title?: string) => void;
  onQueueVideo?: (videoId: string, title?: string) => void;
  onSuggestVideo?: (videoId: string, title?: string) => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

type ChannelTab = 'videos' | 'streams' | 'shorts' | 'about';
type SortMode = 'latest' | 'popular';

function parseViewsCount(viewsText?: string): number {
  if (!viewsText) return 0;
  const clean = viewsText.toUpperCase().replace(/,/g, '');
  const match = clean.match(/([\d.]+)\s*([KMB])?/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const mult =
    match[2] === 'B' ? 1e9 : match[2] === 'M' ? 1e6 : match[2] === 'K' ? 1e3 : 1;
  return num * mult;
}

export const ChannelPage: React.FC<ChannelPageProps> = ({
  target,
  inRoom,
  canControl = false,
  roomId,
  onBack,
  onStartPartyWithVideo,
  onPlayVideo,
  onQueueVideo,
  onSuggestVideo,
  onNotification,
}) => {
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [videos, setVideos] = useState<YouTubeSearchResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChannelTab>('videos');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [filterText, setFilterText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [watchLaterIds, setWatchLaterIds] = useState<Set<string>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Sync Watch Later badges
  const syncWatchLaterSet = useCallback(() => {
    setWatchLaterIds((prev) => {
      const next = new Set<string>();
      videos.forEach((v) => {
        if (isInWatchLater(v.id)) next.add(v.id);
      });
      if (prev.size === next.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [videos]);

  useEffect(() => {
    syncWatchLaterSet();
  }, [syncWatchLaterSet]);

  // Reset to Videos tab when switching channels
  useEffect(() => {
    setActiveTab('videos');
    setFilterText('');
    setSortMode('latest');
  }, [target.channelId, target.handle, target.name]);

  // Load channel metadata + active tab videos
  useEffect(() => {
    if (activeTab === 'about') return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setVideos([]);
      setNextPageToken(null);
      isFetchingRef.current = true;

      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }

      const data = await getYouTubeChannel({
        channelId: target.channelId,
        handle: target.handle,
        name: target.name,
        tab: activeTab,
      });

      if (!cancelled) {
        if (data.channel) {
          setChannel(data.channel);
          setSubscribed(
            isChannelSubscribed({
              id: data.channel.id,
              handle: data.channel.handle,
              title: data.channel.title,
            })
          );
        }
        const seen = new Set<string>();
        const unique = data.videos.filter((v) => {
          if (seen.has(v.id)) return false;
          seen.add(v.id);
          return true;
        });
        setVideos(unique);
        setNextPageToken(data.nextPageToken);
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [target.channelId, target.handle, target.name, activeTab]);

  // Load more videos for endless scroll
  const loadMore = useCallback(async () => {
    if (!nextPageToken || isFetchingRef.current || isLoading || activeTab === 'about') return;
    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const data = await getYouTubeChannel({
        channelId: channel?.id || target.channelId,
        handle: channel?.handle || target.handle,
        name: channel?.title || target.name,
        tab: activeTab,
        pageToken: nextPageToken,
      });
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        const fresh = data.videos.filter((v) => !seen.has(v.id));
        return [...prev, ...fresh];
      });
      setNextPageToken(data.nextPageToken);
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [nextPageToken, isLoading, activeTab, channel, target]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !nextPageToken || activeTab === 'about') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: '450px 0px', threshold: 0.01 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextPageToken, activeTab, videos.length]);

  const displayedVideos = useMemo(() => {
    let list = [...videos];
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      list = list.filter((v) => v.title.toLowerCase().includes(q));
    }
    if (sortMode === 'popular') {
      list.sort((a, b) => parseViewsCount(b.views) - parseViewsCount(a.views));
    }
    return list;
  }, [videos, filterText, sortMode]);

  const handleToggleSubscribe = () => {
    const info = channel || {
      id: target.channelId || target.handle || target.name || 'channel',
      title: target.name || target.handle || 'YouTube Channel',
      handle: target.handle || '',
      avatar: '',
      subscriberCount: '',
      verified: false,
    };
    const nextState = toggleChannelSubscription({
      id: info.id,
      title: info.title,
      handle: info.handle,
      avatar: info.avatar,
      subscriberCount: info.subscriberCount,
      verified: info.verified,
    });
    setSubscribed(nextState);
    onNotification?.(
      nextState ? `Subscribed to ${info.title}` : `Unsubscribed from ${info.title}`,
      nextState ? 'success' : 'info'
    );
  };

  const handleToggleWatchLater = (e: React.MouseEvent, video: YouTubeSearchResult) => {
    e.stopPropagation();
    const added = toggleWatchLater({
      id: video.id,
      title: video.title,
      channel: channel?.title || video.channel,
      channelId: channel?.id || video.channelId,
      channelUrl: channel?.handle ? `/${channel.handle}` : video.channelUrl,
      duration: video.duration,
      views: video.views,
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
    });
    setWatchLaterIds((prev) => {
      const next = new Set(prev);
      if (added) next.add(video.id);
      else next.delete(video.id);
      return next;
    });
    onNotification?.(
      added ? 'Saved to Watch Later' : 'Removed from Watch Later',
      added ? 'success' : 'info'
    );
  };

  const handleVideoClick = (video: YouTubeSearchResult) => {
    if (inRoom) {
      if (canControl) onPlayVideo?.(video.id, video.title);
      else onSuggestVideo?.(video.id, video.title);
    } else {
      onStartPartyWithVideo?.(video.id, video.title);
    }
  };

  const displayName = channel?.title || target.name || target.handle || 'YouTube Channel';
  const avatarColor = getTwitchUserColor(displayName);

  return (
    <div
      ref={scrollRef}
      className="flex-1 w-full h-[calc(100vh-50px)] overflow-y-auto bg-[#0E0E10] text-[#EFEFF1]"
    >
      {/* Top Back Bar */}
      <div className="sticky top-0 z-20 bg-[#0E0E10]/95 backdrop-blur-md border-b border-[#2D2D35]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="h-[32px] px-3 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{inRoom ? `Back to Party (${roomId})` : 'Back to Home'}</span>
          </button>

          <span className="text-xs text-[#ADADB8] font-medium truncate">
            {channel?.handle || displayName}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* 1. Channel Banner */}
        <div className="w-full h-32 sm:h-48 rounded-[6px] overflow-hidden bg-gradient-to-r from-[#18181B] via-[#261B3E] to-[#18181B] border border-[#2F2F35] relative">
          {channel?.banner ? (
            <img
              src={channel.banner}
              alt={`${displayName} banner`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Sparkles className="w-12 h-12 text-[#9146FF]" />
            </div>
          )}
        </div>

        {/* 2. Channel Profile Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="flex items-start sm:items-center gap-4">
            {channel?.avatar ? (
              <img
                src={channel.avatar}
                alt={displayName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#9146FF] shadow-lg shrink-0 bg-[#18181B]"
              />
            ) : (
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-3xl font-black text-white border-2 border-[#9146FF] shadow-lg shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                  {displayName}
                </h1>
                {channel?.verified && (
                  <svg
                    className="w-5 h-5 text-[#9146FF] fill-current shrink-0"
                    viewBox="0 0 20 20"
                  >
                    <title>Verified Channel</title>
                    <path
                      fillRule="evenodd"
                      d="M10 1l2.5 1.5L15 2l1.5 2.5L19 5l-.5 3 2 2.5-2 2.5.5 3-2.5.5L15 18l-2.5-.5L10 19l-2.5-1.5L5 18l-1.5-2.5L1 15l.5-3L-.5 9.5l2-2.5-.5-3L3.5 4 5 1.5 7.5 2 10 1zm-1 12.5l5.5-5.5-1.5-1.5L9 10.5 7 8.5 5.5 10l3.5 3.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-[#ADADB8] flex-wrap">
                {channel?.handle && (
                  <span className="font-semibold text-[#EFEFF1]">{channel.handle}</span>
                )}
                {channel?.handle && channel?.subscriberCount && <span>•</span>}
                {channel?.subscriberCount && <span>{channel.subscriberCount}</span>}
                {channel?.videoCount && (
                  <>
                    <span>•</span>
                    <span>{channel.videoCount}</span>
                  </>
                )}
              </div>

              {channel?.description && (
                <p
                  onClick={() => setActiveTab('about')}
                  className="text-xs text-[#ADADB8] line-clamp-1 max-w-2xl cursor-pointer hover:text-[#EFEFF1]"
                >
                  {channel.description}
                </p>
              )}
            </div>
          </div>

          {/* Subscribe Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleSubscribe}
              className={`h-[36px] px-5 rounded-[4px] text-xs font-bold flex items-center gap-2 transition-all active:scale-[0.98] ${
                subscribed
                  ? 'bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1]'
                  : 'bg-[#9146FF] hover:bg-[#772CE8] text-white shadow-lg shadow-[#9146FF]/25'
              }`}
            >
              <Bell className={`w-4 h-4 ${subscribed ? 'text-[#00F593]' : ''}`} />
              <span>{subscribed ? 'Subscribed' : 'Subscribe'}</span>
            </button>
          </div>
        </div>

        {/* 3. Channel Navigation Tabs (Videos, Live, Shorts, About) */}
        <div className="border-b border-[#2F2F35] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            {[
              { id: 'videos' as ChannelTab, label: 'Videos', icon: <Video className="w-3.5 h-3.5" /> },
              { id: 'streams' as ChannelTab, label: 'Live', icon: <Radio className="w-3.5 h-3.5" /> },
              { id: 'shorts' as ChannelTab, label: 'Shorts', icon: <Film className="w-3.5 h-3.5" /> },
              { id: 'about' as ChannelTab, label: 'About', icon: <Info className="w-3.5 h-3.5" /> },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                    active
                      ? 'border-[#9146FF] text-white'
                      : 'border-transparent text-[#ADADB8] hover:text-white'
                  }`}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'about' && (
            <div className="flex items-center gap-2 pb-2">
              <div className="flex items-center bg-[#18181B] border border-[#2F2F35] rounded-[4px] p-0.5">
                <button
                  onClick={() => setSortMode('latest')}
                  className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors ${
                    sortMode === 'latest'
                      ? 'bg-[#2F2F35] text-white'
                      : 'text-[#ADADB8] hover:text-white'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => setSortMode('popular')}
                  className={`px-2.5 py-1 rounded-[2px] text-[11px] font-semibold transition-colors ${
                    sortMode === 'popular'
                      ? 'bg-[#2F2F35] text-white'
                      : 'text-[#ADADB8] hover:text-white'
                  }`}
                >
                  Popular
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#ADADB8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter channel..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="h-[28px] w-36 sm:w-44 bg-[#18181B] border border-[#2F2F35] focus:border-[#9146FF] rounded-[4px] pl-8 pr-2.5 text-xs text-[#EFEFF1] placeholder-[#71717A] outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Tab Content */}
        {activeTab === 'about' ? (
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-[6px] p-6 space-y-4 max-w-3xl">
            <h2 className="text-base font-bold text-white">About {displayName}</h2>
            <p className="text-xs sm:text-sm text-[#ADADB8] whitespace-pre-line leading-relaxed">
              {channel?.description ||
                `Official WatchParty channel view for ${displayName}. Select any video from the Videos, Live, or Shorts tabs to watch synchronized with friends.`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#2F2F35] text-xs">
              <div className="bg-[#1F1F23] p-3 rounded-[4px]">
                <span className="text-[#ADADB8] block mb-1">Subscribers</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#BF94FF]" />
                  {channel?.subscriberCount || 'YouTube Creator'}
                </span>
              </div>
              <div className="bg-[#1F1F23] p-3 rounded-[4px]">
                <span className="text-[#ADADB8] block mb-1">Total Videos</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-[#BF94FF]" />
                  {channel?.videoCount || `${videos.length}+ loaded`}
                </span>
              </div>
              <div className="bg-[#1F1F23] p-3 rounded-[4px]">
                <span className="text-[#ADADB8] block mb-1">Handle</span>
                <span className="font-bold text-[#BF94FF]">{channel?.handle || displayName}</span>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="aspect-video w-full bg-[#18181B] rounded-[4px]" />
                <div className="h-4 bg-[#18181B] rounded w-5/6" />
                <div className="h-3 bg-[#18181B] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : displayedVideos.length === 0 ? (
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-[6px] p-12 text-center space-y-2">
            <p className="text-sm font-bold text-white">
              No {activeTab === 'streams' ? 'live streams' : activeTab} found for {displayName}
            </p>
            <p className="text-xs text-[#ADADB8]">
              Try switching to another tab (Videos / Live / Shorts) or clearing the filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayedVideos.map((video) => {
              const saved = watchLaterIds.has(video.id);
              return (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video)}
                  className="group cursor-pointer flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="twitch-card-container">
                      <div className="twitch-card-backdrop" />
                      <div className="twitch-card-thumb relative aspect-video w-full bg-black rounded-[4px] overflow-hidden shadow-md">
                        <img
                          src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement;
                            if (!t.src.includes('unsplash')) {
                              t.src =
                                'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                            }
                          }}
                        />

                        {video.duration && (
                          <span
                            className={`absolute bottom-2 right-2 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold font-mono shadow ${
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

                        {/* Watch Later Button on Hover */}
                        <button
                          onClick={(e) => handleToggleWatchLater(e, video)}
                          className={`absolute top-2 right-2 p-1.5 rounded-[4px] transition-opacity shadow ${
                            saved
                              ? 'bg-[#9146FF] text-white opacity-100'
                              : 'bg-black/80 hover:bg-[#9146FF] text-white opacity-0 group-hover:opacity-100'
                          }`}
                          title={saved ? 'Saved in Watch Later' : 'Save to Watch Later'}
                        >
                          {saved ? <Check className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <h3
                      className="mt-2 text-xs font-semibold text-[#EFEFF1] line-clamp-2 group-hover:text-[#BF94FF] transition-colors leading-snug"
                      title={video.title}
                    >
                      {video.title}
                    </h3>

                    {(video.views || video.publishedTime) && (
                      <p className="mt-0.5 text-[11px] text-[#ADADB8]">
                        {[video.views, video.publishedTime].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>

                  {/* Quick Party Actions */}
                  {inRoom && (
                    <div
                      className="flex items-center gap-1.5 pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canControl ? (
                        <>
                          <button
                            onClick={() => onPlayVideo?.(video.id, video.title)}
                            className="flex-1 h-[26px] rounded-[4px] bg-[#9146FF]/20 hover:bg-[#9146FF] text-[#BF94FF] hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </button>
                          <button
                            onClick={() => onQueueVideo?.(video.id, video.title)}
                            className="h-[26px] px-2.5 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Queue</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onSuggestVideo?.(video.id, video.title)}
                          className="w-full h-[26px] rounded-[4px] bg-[#2F2F35] hover:bg-[#9146FF] text-[#EFEFF1] hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Suggest to Host</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Endless Scroll Sentinel */}
        {activeTab !== 'about' && (
          <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-3">
            {isLoadingMore && (
              <div className="flex items-center gap-2 text-xs text-[#ADADB8]">
                <Loader2 className="w-5 h-5 text-[#9146FF] animate-spin" />
                <span>Loading more videos from {displayName}...</span>
              </div>
            )}
            {!isLoading && !isLoadingMore && nextPageToken && (
              <button
                onClick={loadMore}
                className="h-[34px] px-5 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold"
              >
                Load More Channel Videos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
