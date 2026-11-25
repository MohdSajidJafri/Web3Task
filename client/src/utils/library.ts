/**
 * Client-side YouTube Personal Library persisted in localStorage:
 * - Subscriptions (channels)
 * - Watch Later (saved videos)
 * - Liked Videos
 */

export interface SavedVideoItem {
  id: string;
  title: string;
  channel: string;
  channelId?: string;
  channelUrl?: string;
  duration?: string;
  views?: string;
  thumbnail: string;
  savedAt: number;
}

export interface SubscribedChannel {
  id: string;
  title: string;
  handle?: string;
  avatar?: string;
  subscriberCount?: string;
  verified?: boolean;
  subscribedAt: number;
}

const SUBS_KEY = 'watchsync_subscriptions';
const WATCH_LATER_KEY = 'watchsync_watch_later';
const LIKED_KEY = 'watchsync_liked_videos';

function emitLibraryUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('watchsync_library_updated'));
  }
}

function readList<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
    emitLibraryUpdate();
  } catch {
    // Ignore storage quota errors
  }
}

// --- Subscriptions ---
export function getSubscriptions(): SubscribedChannel[] {
  return readList<SubscribedChannel>(SUBS_KEY);
}

export function isChannelSubscribed(identifier: { id?: string; handle?: string; title?: string }): boolean {
  const subs = getSubscriptions();
  const idLow = identifier.id?.toLowerCase();
  const handleLow = identifier.handle?.toLowerCase();
  const titleLow = identifier.title?.toLowerCase();
  return subs.some(
    (s) =>
      (idLow && s.id && s.id.toLowerCase() === idLow) ||
      (handleLow && s.handle && s.handle.toLowerCase() === handleLow) ||
      (titleLow && s.title.toLowerCase() === titleLow)
  );
}

export function toggleChannelSubscription(channel: Omit<SubscribedChannel, 'subscribedAt'>): boolean {
  const subs = getSubscriptions();
  const existsIdx = subs.findIndex(
    (s) =>
      (channel.id && s.id && s.id.toLowerCase() === channel.id.toLowerCase()) ||
      (channel.handle && s.handle && s.handle.toLowerCase() === channel.handle.toLowerCase()) ||
      s.title.toLowerCase() === channel.title.toLowerCase()
  );

  if (existsIdx >= 0) {
    subs.splice(existsIdx, 1);
    writeList(SUBS_KEY, subs);
    return false;
  }

  subs.unshift({
    ...channel,
    id: channel.id || channel.handle || channel.title,
    subscribedAt: Date.now(),
  });
  writeList(SUBS_KEY, subs.slice(0, 100));
  return true;
}

// --- Watch Later ---
export function getWatchLater(): SavedVideoItem[] {
  return readList<SavedVideoItem>(WATCH_LATER_KEY);
}

export function isInWatchLater(videoId: string): boolean {
  return getWatchLater().some((v) => v.id === videoId);
}

export function toggleWatchLater(video: Omit<SavedVideoItem, 'savedAt'>): boolean {
  const list = getWatchLater();
  const idx = list.findIndex((v) => v.id === video.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeList(WATCH_LATER_KEY, list);
    return false;
  }
  list.unshift({ ...video, savedAt: Date.now() });
  writeList(WATCH_LATER_KEY, list.slice(0, 100));
  return true;
}

// --- Liked Videos ---
export function getLikedVideos(): SavedVideoItem[] {
  return readList<SavedVideoItem>(LIKED_KEY);
}

export function isVideoLiked(videoId: string): boolean {
  return getLikedVideos().some((v) => v.id === videoId);
}

export function toggleLikedVideo(video: Omit<SavedVideoItem, 'savedAt'>): boolean {
  const list = getLikedVideos();
  const idx = list.findIndex((v) => v.id === video.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    writeList(LIKED_KEY, list);
    return false;
  }
  list.unshift({ ...video, savedAt: Date.now() });
  writeList(LIKED_KEY, list.slice(0, 100));
  return true;
}
