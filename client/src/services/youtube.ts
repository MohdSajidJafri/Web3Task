import { getServerUrl } from './socket';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
  views: string;
  duration: string;
  thumbnail: string;
}

/**
 * Live search YouTube videos using our backend endpoint.
 * Supports official YouTube Data API v3 and direct fallback.
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeSearchResult[]> {
  if (!query || !query.trim()) return [];

  try {
    const serverUrl = getServerUrl();
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY || '';
    const params = new URLSearchParams({ q: query.trim() });
    if (apiKey) params.append('key', apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

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
      if (Array.isArray(data.results)) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn('[YouTubeService] Search fetch failed:', err);
  }

  return [];
}
