import { getServerUrl } from './socket';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  channelId?: string;
  channelUrl?: string;
  channelAvatar?: string;
  verified?: boolean;
  views: string;
  publishedTime?: string;
  duration: string;
  description?: string;
  thumbnail: string;
}

export interface YouTubePaginatedResponse {
  results: YouTubeSearchResult[];
  nextPageToken: string | null;
}

export interface ChannelInfo {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  banner: string;
  subscriberCount: string;
  videoCount: string;
  description: string;
  verified: boolean;
}

export interface ChannelResponse {
  channel: ChannelInfo | null;
  videos: YouTubeSearchResult[];
  nextPageToken: string | null;
}

/**
 * Paginated live search of YouTube videos using our backend endpoint.
 * Supports official YouTube Data API v3 and direct InnerTube continuation fallback.
 */
export async function searchYouTubePaginated(
  query: string,
  pageToken?: string
): Promise<YouTubePaginatedResponse> {
  if (!query || !query.trim()) {
    return { results: [], nextPageToken: null };
  }

  try {
    const serverUrl = getServerUrl();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
    const params = new URLSearchParams({ q: query.trim() });
    if (pageToken) params.append('pageToken', pageToken);
    if (apiKey) params.append('key', apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${serverUrl}/api/youtube/search?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'x-youtube-api-key': apiKey } : {}),
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        results: Array.isArray(data.results) ? data.results : [],
        nextPageToken: data.nextPageToken || null,
      };
    }
  } catch (err) {
    console.warn('[YouTubeService] Search fetch failed:', err);
  }

  return { results: [], nextPageToken: null };
}

/**
 * Convenience helper returning only the first page results array.
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeSearchResult[]> {
  const { results } = await searchYouTubePaginated(query);
  return results;
}

/**
 * Fetch a YouTube channel's metadata and paginated videos/streams/shorts.
 */
export async function getYouTubeChannel(params: {
  channelId?: string;
  handle?: string;
  name?: string;
  tab?: 'videos' | 'streams' | 'shorts';
  pageToken?: string;
}): Promise<ChannelResponse> {
  try {
    const serverUrl = getServerUrl();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
    const qs = new URLSearchParams();
    if (params.channelId) qs.set('channelId', params.channelId);
    if (params.handle) qs.set('handle', params.handle);
    if (params.name) qs.set('name', params.name);
    if (params.tab) qs.set('tab', params.tab);
    if (params.pageToken) qs.set('pageToken', params.pageToken);
    if (apiKey) qs.set('key', apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${serverUrl}/api/youtube/channel?${qs.toString()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'x-youtube-api-key': apiKey } : {}),
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return {
        channel: data.channel || null,
        videos: Array.isArray(data.videos) ? data.videos : [],
        nextPageToken: data.nextPageToken || null,
      };
    }
  } catch (err) {
    console.warn('[YouTubeService] Channel fetch failed:', err);
  }

  return { channel: null, videos: [], nextPageToken: null };
}

/**
 * Fetch trending YouTube videos by category.
 */
export async function getTrendingVideos(category = 'all'): Promise<YouTubeSearchResult[]> {
  try {
    const serverUrl = getServerUrl();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
    const qs = new URLSearchParams({ category });
    if (apiKey) qs.set('key', apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${serverUrl}/api/youtube/trending?${qs.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data.results) ? data.results : [];
    }
  } catch (err) {
    console.warn('[YouTubeService] Trending fetch failed:', err);
  }
  return [];
}
