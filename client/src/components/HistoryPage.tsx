import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Clock,
  Trash2,
  Play,
  Plus,
  Send,
  Search,
  Bookmark,
  ThumbsUp,
} from 'lucide-react';
import {
  getWatchHistory,
  clearWatchHistory,
  formatTimeAgo,
  HistoryItem,
} from '../utils/history';
import {
  getWatchLater,
  getLikedVideos,
  SavedVideoItem,
} from '../utils/library';
import {
  handleYouTubeThumbLoad,
  handleYouTubeThumbError,
} from '../services/youtube';
import { ChannelTarget } from './ChannelPage';

interface HistoryPageProps {
  inRoom: boolean;
  canControl?: boolean;
  roomId?: string;
  onBack: () => void;
  onChannelClick?: (target: ChannelTarget) => void;
  onStartPartyWithVideo?: (videoId: string, title?: string) => void;
  onPlayVideo?: (videoId: string, title?: string) => void;
  onQueueVideo?: (videoId: string, title?: string) => void;
  onSuggestVideo?: (videoId: string, title?: string) => void;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

type HistoryTab = 'history' | 'watch_later' | 'liked';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  inRoom,
  canControl = false,
  roomId,
  onBack,
  onChannelClick,
  onStartPartyWithVideo,
  onPlayVideo,
  onQueueVideo,
  onSuggestVideo,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<HistoryTab>('history');
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => getWatchHistory());
  const [watchLaterItems] = useState<SavedVideoItem[]>(() => getWatchLater());
  const [likedItems] = useState<SavedVideoItem[]>(() => getLikedVideos());
  const [filterText, setFilterText] = useState('');

  const handleClear = () => {
    clearWatchHistory();
    setHistoryItems([]);
    onNotification?.('Watch history cleared', 'info');
  };

  const currentList = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (activeTab === 'history') {
      return historyItems.filter(
        (v) =>
          !q ||
          v.title.toLowerCase().includes(q) ||
          (v.channel || '').toLowerCase().includes(q)
      );
    }
    const source = activeTab === 'watch_later' ? watchLaterItems : likedItems;
    return source.filter(
      (v) =>
        !q ||
        v.title.toLowerCase().includes(q) ||
        (v.channel || '').toLowerCase().includes(q)
    );
  }, [activeTab, historyItems, watchLaterItems, likedItems, filterText]);

  const handlePrimaryAction = (videoId: string, title: string) => {
    if (inRoom) {
      if (canControl) onPlayVideo?.(videoId, title);
      else onSuggestVideo?.(videoId, title);
    } else {
      onStartPartyWithVideo?.(videoId, title);
    }
  };

  return (
    <div className="flex-1 w-full h-[calc(100vh-50px)] overflow-y-auto bg-[#0E0E10] text-[#EFEFF1]">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-[#0E0E10]/95 backdrop-blur-md border-b border-[#2D2D35]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="h-[32px] px-3 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-[#EFEFF1] text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{inRoom ? `Back to Party (${roomId})` : 'Back to Home'}</span>
              </button>

              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#BF94FF]" />
                <span>Recently Watched & Library</span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#ADADB8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search history..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="h-[30px] w-40 sm:w-52 bg-[#18181B] border border-[#2F2F35] focus:border-[#9146FF] rounded-[4px] pl-8 pr-2.5 text-xs text-[#EFEFF1] placeholder-[#71717A] outline-none"
                />
              </div>

              {activeTab === 'history' && historyItems.length > 0 && (
                <button
                  onClick={handleClear}
                  className="h-[30px] px-3 rounded-[4px] bg-[#1F1F23] hover:bg-[#EB0400]/20 text-[#ADADB8] hover:text-[#EB0400] border border-[#2F2F35] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'history'
                  ? 'bg-[#9146FF] text-white'
                  : 'bg-[#1F1F23] hover:bg-[#2F2F35] text-[#ADADB8] hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Watch History ({historyItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('watch_later')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'watch_later'
                  ? 'bg-[#9146FF] text-white'
                  : 'bg-[#1F1F23] hover:bg-[#2F2F35] text-[#ADADB8] hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Watch Later ({watchLaterItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('liked')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'liked'
                  ? 'bg-[#9146FF] text-white'
                  : 'bg-[#1F1F23] hover:bg-[#2F2F35] text-[#ADADB8] hover:text-white'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Liked Videos ({likedItems.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content List */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-3">
        {currentList.length === 0 ? (
          <div className="bg-[#18181B] border border-[#2F2F35] rounded-[6px] p-12 text-center space-y-2">
            <Clock className="w-9 h-9 text-[#ADADB8] mx-auto opacity-50" />
            <p className="text-sm font-bold text-white">
              {activeTab === 'history'
                ? 'Your watch history is empty'
                : activeTab === 'watch_later'
                ? 'No videos saved to Watch Later'
                : 'No liked videos yet'}
            </p>
            <p className="text-xs text-[#ADADB8]">
              Videos you watch, save, or like in WatchSync will appear here.
            </p>
          </div>
        ) : (
          currentList.map((item) => {
            const vid = 'videoId' in item ? item.videoId : item.id;
            const timestamp = 'watchedAt' in item ? item.watchedAt : item.savedAt;
            return (
              <div
                key={vid}
                onClick={() => handlePrimaryAction(vid, item.title)}
                className="group cursor-pointer bg-[#18181B] hover:bg-[#1F1F23] border border-[#2D2D35] hover:border-[#9146FF] rounded-[6px] p-3 flex flex-col sm:flex-row gap-4 transition-all"
              >
                <div className="relative aspect-video w-full sm:w-56 bg-black rounded-[4px] overflow-hidden shrink-0">
                  <img
                    src={`https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onLoad={(e) => handleYouTubeThumbLoad(e.currentTarget, vid)}
                    onError={(e) => handleYouTubeThumbError(e.currentTarget, vid)}
                  />
                  {item.duration && (
                    <span
                      className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-[2px] text-[10px] font-bold font-mono ${
                        item.duration === 'LIVE' ? 'bg-[#EB0400] text-white' : 'bg-black/85 text-white'
                      }`}
                    >
                      {item.duration}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-[#EFEFF1] group-hover:text-[#BF94FF] line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#ADADB8]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.channel) {
                            onChannelClick?.({ name: item.channel });
                          }
                        }}
                        className="hover:text-[#BF94FF] hover:underline font-medium"
                      >
                        {item.channel || 'Watch Party'}
                      </button>
                      <span>•</span>
                      <span>{formatTimeAgo(timestamp)}</span>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {inRoom ? (
                      canControl ? (
                        <>
                          <button
                            onClick={() => onPlayVideo?.(vid, item.title)}
                            className="h-[28px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play Now</span>
                          </button>
                          <button
                            onClick={() => onQueueVideo?.(vid, item.title)}
                            className="h-[28px] px-3 rounded-[4px] bg-[#2F2F35] hover:bg-[#3A3A42] text-white text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Queue</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onSuggestVideo?.(vid, item.title)}
                          className="h-[28px] px-3 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>Suggest</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => onStartPartyWithVideo?.(vid, item.title)}
                        className="h-[28px] px-3.5 rounded-[4px] bg-[#9146FF] hover:bg-[#772CE8] text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Watch Party</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
