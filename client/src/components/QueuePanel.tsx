import React, { useState } from 'react';
import { Play, Plus, Trash2, ArrowUp, ArrowDown, Check, X, Send, Film, Clock, Sparkles, GripVertical } from 'lucide-react';
import { QueueItem, SuggestedItem, Role } from '../types';
import { getSocket } from '../services/socket';

interface QueuePanelProps {
  roomId: string;
  queue: QueueItem[];
  suggestedQueue: SuggestedItem[];
  currentUserRole: Role;
  canControl: boolean;
  onNotification?: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  roomId,
  queue,
  suggestedQueue,
  currentUserRole,
  canControl,
  onNotification,
}) => {
  const [videoInput, setVideoInput] = useState('');
  const [suggestInput, setSuggestInput] = useState('');
  const socket = getSocket();

  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;

    socket.emit('queue_add', {
      roomId,
      videoId: videoInput.trim(),
    });

    setVideoInput('');
    onNotification?.('Added video to queue', 'success');
  };

  const handleSuggest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestInput.trim()) return;

    socket.emit('queue_suggest', {
      roomId,
      videoId: suggestInput.trim(),
    });

    setSuggestInput('');
    onNotification?.('Video suggestion submitted to Host & Mods', 'info');
  };

  const handlePlayNow = (videoId: string) => {
    socket.emit('change_video', { roomId, videoId });
    onNotification?.('Loading selected queue video...', 'info');
  };

  const handleNextInQueue = () => {
    socket.emit('queue_next', { roomId });
  };

  const handleRemove = (itemId: string) => {
    socket.emit('queue_remove', { roomId, itemId });
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    socket.emit('queue_reorder', { roomId, fromIndex, toIndex });
  };

  const handleApproveSuggestion = (suggestionId: string) => {
    socket.emit('queue_approve_suggestion', { roomId, suggestionId });
    onNotification?.('Suggestion approved and added to queue', 'success');
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    socket.emit('queue_reject_suggestion', { roomId, suggestionId });
    onNotification?.('Suggestion rejected', 'info');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans bg-[#1B1D24] no-scrollbar">
      {/* 1. UP NEXT QUEUE */}
      <div className="space-y-3">
        {/* Input bar to add to queue */}
        {canControl ? (
          <form onSubmit={handleAddToQueue} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Paste video link to queue..."
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              className="flex-1 bg-[#242731] hover:bg-[#2C303D] focus:bg-[#131419] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!videoInput.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-[#FF5E62] to-[#FF9966] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-white font-bold rounded-xl shadow-md shadow-[#FF5E62]/20 transition-all shrink-0 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSuggest} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Suggest a YouTube URL to queue..."
              value={suggestInput}
              onChange={(e) => setSuggestInput(e.target.value)}
              className="flex-1 bg-[#242731] hover:bg-[#2C303D] focus:bg-[#131419] border border-white/[0.08] focus:border-[#FF5E62] rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!suggestInput.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FFA751] hover:brightness-110 active:scale-[0.98] disabled:opacity-40 text-white font-bold rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Suggest</span>
            </button>
          </form>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-zinc-300">
            <Film className="w-3.5 h-3.5 text-[#FF5E62]" />
            <span>Up Next Queue ({queue.length})</span>
          </div>

          {canControl && queue.length > 0 && (
            <button
              onClick={handleNextInQueue}
              className="px-2.5 py-1 rounded-lg bg-[#242731] hover:bg-[#2C303D] text-[#FF9966] hover:text-white border border-[#FF5E62]/30 text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Play Next</span>
            </button>
          )}
        </div>

        {/* Queue Items List (Matching Reference Blueprint) */}
        {queue.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#242731]/60 border border-white/[0.06] text-center text-zinc-400 text-xs">
            Queue is currently empty.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#242731] border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-2.5 flex items-center gap-2.5 group transition-all"
              >
                {/* 6-Dots Drag Handle & Index */}
                <div className="flex items-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Video Thumbnail */}
                <div className="w-16 h-10 bg-black rounded-lg overflow-hidden shrink-0 relative shadow-sm">
                  <img
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                  <div
                    onClick={() => handlePlayNow(item.videoId)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    title="Play Now"
                  >
                    <Play className="w-3.5 h-3.5 text-white fill-current" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate" title={item.title}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    by <span className="text-[#FF9966]">{item.addedBy}</span>
                  </p>
                </div>

                {/* Actions: Reorder & Remove in Salmon/Coral Text as in Reference UI */}
                {canControl && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="text-xs font-semibold text-[#FF5E62] hover:text-[#FF758C] transition-colors"
                      title="Remove from Queue"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SUGGESTED VIDEOS (Matching Reference Blueprint) */}
      <div className="space-y-3 pt-3 border-t border-white/[0.08]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-[#2EE59D]" />
            <span>Suggested Videos ({suggestedQueue.length})</span>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            {suggestedQueue.length} Pending
          </span>
        </div>

        {suggestedQueue.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#242731]/40 border border-white/[0.06] text-center text-zinc-500 text-xs">
            No pending suggestions from party members.
          </div>
        ) : (
          <div className="space-y-2">
            {suggestedQueue.map((s) => (
              <div
                key={s.id}
                className="bg-[#242731] border border-white/[0.08] hover:border-white/[0.15] rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-14 h-9 bg-black rounded-lg overflow-hidden shrink-0 shadow-sm">
                    <img
                      src={`https://img.youtube.com/vi/${s.videoId}/mqdefault.jpg`}
                      alt={s.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate" title={s.title}>
                      {s.title}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      suggested by <span className="text-[#2EE59D] font-medium">{s.suggestedBy}</span>
                    </p>
                  </div>
                </div>

                {/* Mint Approve and Rose Reject Pill Buttons */}
                {canControl ? (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => handleApproveSuggestion(s.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#2EE59D] hover:bg-[#25C786] text-black font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
                      title="Approve & Queue"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(s.id)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all active:scale-[0.98]"
                      title="Reject"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-zinc-400 bg-[#1B1D24] px-2 py-0.5 rounded-full border border-white/[0.08]">
                    Pending Host
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
