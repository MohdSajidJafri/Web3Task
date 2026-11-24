import React, { useState } from 'react';
import { Play, Plus, Trash2, ArrowUp, ArrowDown, Check, X, Send, Film, Clock, Sparkles } from 'lucide-react';
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
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-sans">
      {/* 1. UP NEXT QUEUE */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white">
            <Film className="w-3.5 h-3.5 text-[#9146FF]" />
            <span>Up Next Queue ({queue.length})</span>
          </div>

          {canControl && queue.length > 0 && (
            <button
              onClick={handleNextInQueue}
              className="px-2 py-1 rounded bg-[#9146FF] hover:bg-[#772CE8] text-white text-[10px] font-bold flex items-center gap-1 shadow transition-colors"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Play Next</span>
            </button>
          )}
        </div>

        {/* Add to Queue input for Host/Mod */}
        {canControl && (
          <form onSubmit={handleAddToQueue} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Paste YouTube URL to add to queue..."
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              className="flex-1 bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#9146FF] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#71717A] outline-none"
            />
            <button
              type="submit"
              disabled={!videoInput.trim()}
              className="p-1.5 bg-[#9146FF] hover:bg-[#772CE8] disabled:opacity-40 text-white rounded transition-colors shrink-0"
              title="Add to Queue"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Queue Items List */}
        {queue.length === 0 ? (
          <div className="p-4 rounded-lg bg-[#1F1F23]/60 border border-[#2F2F35]/60 text-center text-[#ADADB8] text-xs">
            Queue is currently empty.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item, idx) => (
              <div
                key={item.id}
                className="bg-[#1F1F23] border border-[#2F2F35] rounded-lg p-2 flex items-center gap-2 group hover:border-[#9146FF]/50 transition-colors"
              >
                {/* Index & Thumbnail */}
                <span className="text-[10px] font-mono font-bold text-[#ADADB8] w-4 text-center">
                  {idx + 1}
                </span>

                <div className="w-16 h-10 bg-black rounded overflow-hidden shrink-0 relative">
                  <img
                    src={`https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate" title={item.title}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-[#ADADB8] truncate">
                    by <span className="text-[#BF94FF]">{item.addedBy}</span>
                  </p>
                </div>

                {/* Host/Mod Actions */}
                {canControl && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handlePlayNow(item.videoId)}
                      className="p-1 hover:text-[#00F593] text-[#ADADB8] rounded hover:bg-[#26262C] transition-colors"
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>

                    {idx > 0 && (
                      <button
                        onClick={() => handleReorder(idx, idx - 1)}
                        className="p-1 hover:text-white text-[#ADADB8] rounded hover:bg-[#26262C] transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {idx < queue.length - 1 && (
                      <button
                        onClick={() => handleReorder(idx, idx + 1)}
                        className="p-1 hover:text-white text-[#ADADB8] rounded hover:bg-[#26262C] transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="p-1 hover:text-[#EB0400] text-[#ADADB8] rounded hover:bg-[#26262C] transition-colors"
                      title="Remove from Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. SUGGESTED VIDEOS */}
      <div className="space-y-2 pt-2 border-t border-[#2F2F35]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-white">
            <Sparkles className="w-3.5 h-3.5 text-[#00F593]" />
            <span>Suggested Videos ({suggestedQueue.length})</span>
          </div>
        </div>

        {/* Suggestion input form */}
        <form onSubmit={handleSuggest} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Suggest a YouTube URL to Host..."
            value={suggestInput}
            onChange={(e) => setSuggestInput(e.target.value)}
            className="flex-1 bg-[#1F1F23] hover:bg-[#26262C] focus:bg-[#0E0E10] border border-[#2F2F35] focus:border-[#00F593] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#71717A] outline-none"
          />
          <button
            type="submit"
            disabled={!suggestInput.trim()}
            className="p-1.5 bg-[#00AD03] hover:bg-[#008A02] disabled:opacity-40 text-white rounded transition-colors shrink-0"
            title="Submit Suggestion"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {suggestedQueue.length === 0 ? (
          <div className="p-3 rounded-lg bg-[#1F1F23]/40 border border-[#2F2F35]/40 text-center text-[#ADADB8] text-[11px]">
            No pending suggestions from party members.
          </div>
        ) : (
          <div className="space-y-1.5">
            {suggestedQueue.map((s) => (
              <div
                key={s.id}
                className="bg-[#1F1F23] border border-[#2F2F35] rounded-lg p-2 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate" title={s.title}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-[#ADADB8]">
                    suggested by <span className="text-[#00F593] font-medium">{s.suggestedBy}</span>
                  </p>
                </div>

                {canControl ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleApproveSuggestion(s.id)}
                      className="p-1 rounded bg-[#00AD03] hover:bg-[#008A02] text-white transition-colors"
                      title="Approve & Queue"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion(s.id)}
                      className="p-1 rounded bg-[#EB0400] hover:bg-[#C90300] text-white transition-colors"
                      title="Reject"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-[#ADADB8] bg-[#26262C] px-1.5 py-0.5 rounded">
                    Pending
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
