import { getServerUrl } from './socket';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channel: string;
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
