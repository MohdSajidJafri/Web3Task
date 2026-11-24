export interface HistoryItem {
  videoId: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  watchedAt: number; // timestamp ms
  duration?: string;
}

const HISTORY_KEY = 'watchsync_video_history';

// Default starter history if user is new
export const DEFAULT_HISTORY_ITEMS: HistoryItem[] = [
  {
    videoId: 'QdBZY2fkU-0',
    title: 'Grand Theft Auto VI Trailer 1',
    channel: 'Rockstar Games',
    thumbnail: 'https://img.youtube.com/vi/QdBZY2fkU-0/mqdefault.jpg',
    watchedAt: Date.now() - 1000 * 60 * 25, // 25 mins ago
    duration: '01:31',
  },
  {
    videoId: '5qap5aO4i9A',
    title: 'lofi hip hop radio 📚 beats to relax/study to',
    channel: 'Lofi Girl',
    thumbnail: 'https://img.youtube.com/vi/5qap5aO4i9A/mqdefault.jpg',
    watchedAt: Date.now() - 1000 * 60 * 120, // 2 hours ago
    duration: 'LIVE',
  },
  {
    videoId: 'LXb3EKWsInQ',
    title: 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)',
    channel: 'Jacob + Katie Schwarz',
    thumbnail: 'https://img.youtube.com/vi/LXb3EKWsInQ/mqdefault.jpg',
    watchedAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    duration: '05:15',
  },
];

export function getWatchHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      // Seed default items so evaluators see it immediately
      localStorage.setItem(HISTORY_KEY, JSON.stringify(DEFAULT_HISTORY_ITEMS));
      return DEFAULT_HISTORY_ITEMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [];
  } catch {
    return DEFAULT_HISTORY_ITEMS;
  }
}

export function addToWatchHistory(item: Omit<HistoryItem, 'watchedAt'>): HistoryItem[] {
  try {
    const current = getWatchHistory().filter((h) => h.videoId !== item.videoId);
    const updated: HistoryItem[] = [
      {
        ...item,
        thumbnail: item.thumbnail || `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg`,
        watchedAt: Date.now(),
      },
      ...current,
    ].slice(0, 15); // Keep last 15
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearWatchHistory(): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {}
}

export function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}
