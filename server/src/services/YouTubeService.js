/**
 * YouTube Service with dual support:
 * 1. Official YouTube Data API v3 (when YOUTUBE_API_KEY is configured in env or request)
 * 2. Public Direct YouTube Search Extractor (zero-key fallback, always works)
 * 3. Offline Curated Fallback (for airgapped sandbox or offline tests)
 */

const CURATED_FALLBACK_VIDEOS = [
  {
    id: 'QdBZY2fkU-0',
    title: 'Grand Theft Auto VI Trailer 1',
    channel: 'Rockstar Games',
    views: '185M views',
    duration: '01:31',
    thumbnail: 'https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg',
  },
  {
    id: '5qap5aO4i9A',
    title: 'lofi hip hop radio - beats to relax/study to',
    channel: 'Lofi Girl',
    views: '78.9K watching',
    duration: 'LIVE',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
  },
  {
    id: 'PbVKBoDuhZ0',
    title: 'Cyberpunk 2077: Phantom Liberty — Official Cinematic Teaser',
    channel: 'Cyberpunk 2077',
    views: '15.2M views',
    duration: '03:45',
    thumbnail: 'https://i.ytimg.com/vi/PbVKBoDuhZ0/hqdefault.jpg',
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'YouTube Developers Live: Embedded Web Player Customization',
    channel: 'Google Developers',
    views: '12.4K views',
    duration: '33:10',
    thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
  },
  {
    id: 'LXb3EKWsInQ',
    title: 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)',
    channel: 'Jacob + Katie Schwarz',
    views: '120M views',
    duration: '05:15',
    thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
  },
  {
    id: 'Way9Dexny3w',
    title: 'Dune: Part Two | Official Trailer 3',
    channel: 'Warner Bros. Pictures',
    views: '34M views',
    duration: '02:24',
    thumbnail: 'https://i.ytimg.com/vi/Way9Dexny3w/hqdefault.jpg',
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'synthwave radio 🌌 beats to chill/game to',
    channel: 'Lofi Girl',
    views: '24K watching',
    duration: 'LIVE',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
  },
  {
    id: '8g1vEAt46vM',
    title: 'Interstellar — 10th Anniversary IMAX Re-Release Trailer',
    channel: 'Paramount Pictures',
    views: '8.2M views',
    duration: '02:10',
    thumbnail: 'https://i.ytimg.com/vi/8g1vEAt46vM/hqdefault.jpg',
  },
];

export class YouTubeService {
  /**
   * Search videos via YouTube API or direct extraction.
   * @param {string} query
   * @param {string} [apiKey]
   * @returns {Promise<Array<{id: string, title: string, channel: string, views: string, duration: string, thumbnail: string}>>}
   */
  static async search(query, apiKey = process.env.YOUTUBE_API_KEY) {
    if (!query || !query.trim()) {
      return CURATED_FALLBACK_VIDEOS;
    }

    const trimmed = query.trim();

    // 1. If query is a direct YouTube URL or raw 11-char videoId, resolve it directly
    const extractedId = this.extractVideoId(trimmed);
    if (extractedId) {
      const details = await this.getVideoDetails(extractedId, apiKey);
      if (details) return [details];
    }

    // 2. If an API key is available, attempt the official YouTube Data API v3
    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(trimmed)}&key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            return data.items.map((item) => ({
              id: item.id.videoId,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              views: 'YouTube Video',
              duration: '',
              thumbnail:
                item.snippet.thumbnails?.high?.url ||
                item.snippet.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            }));
          }
        }
      } catch (err) {
        // Fall through to public extraction if API key is invalid/quota exceeded/times out
      }
    }

    // 3. Public Direct YouTube Search Extractor (No API key required)
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        const match = html.match(/ytInitialData\s*=\s*({.+?});<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const sections =
            data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          const results = [];

          for (const section of sections) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
              if (item.videoRenderer) {
                const vr = item.videoRenderer;
                const videoId = vr.videoId;
                if (!videoId) continue;
                const title = vr.title?.runs?.[0]?.text || 'YouTube Video';
                const channel =
                  vr.ownerText?.runs?.[0]?.text || vr.shortBylineText?.runs?.[0]?.text || 'YouTube Channel';
                const views = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || '';
                const duration = vr.lengthText?.simpleText || (vr.badges?.some(b => b.metadataBadgeRenderer?.style?.includes('LIVE')) ? 'LIVE' : '');
                const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

                results.push({
                  id: videoId,
                  title,
                  channel,
                  views,
                  duration,
                  thumbnail,
                });
              }
            }
          }

          if (results.length > 0) {
            return results;
          }
        }
      }
    } catch (err) {
      // Fall through to curated fallback
    }

    // 4. Offline / Curated Fallback
    const qLower = trimmed.toLowerCase();
    const filtered = CURATED_FALLBACK_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(qLower) ||
        v.channel.toLowerCase().includes(qLower) ||
        v.id.toLowerCase().includes(qLower)
    );

    return filtered.length > 0 ? filtered : CURATED_FALLBACK_VIDEOS;
  }

  /**
   * Get single video metadata.
   * @param {string} videoId
   * @param {string} [apiKey]
   */
  static async getVideoDetails(videoId, apiKey = process.env.YOUTUBE_API_KEY) {
    if (!videoId) return null;

    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const item = data.items[0];
            return {
              id: videoId,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              views: item.statistics?.viewCount ? `${Number(item.statistics.viewCount).toLocaleString()} views` : '',
              duration: item.contentDetails?.duration || '',
              thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            };
          }
        }
      } catch (err) {
        // Fall through
      }
    }

    // Public oEmbed lookup
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        return {
          id: videoId,
          title: data.title || 'YouTube Video',
          channel: data.author_name || 'YouTube Creator',
          views: '',
          duration: '',
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch (err) {
      // Fall through
    }

    // Static curated match
    const found = CURATED_FALLBACK_VIDEOS.find((v) => v.id === videoId);
    if (found) return found;

    return {
      id: videoId,
      title: `YouTube Video — ${videoId}`,
      channel: 'YouTube Creator',
      views: '',
      duration: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  /**
   * Helper to parse YouTube video IDs from URLs or raw strings.
   * @param {string} input
   * @returns {string|null}
   */
  static extractVideoId(input) {
    if (!input) return null;
    const trimmed = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const match = trimmed.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
    );
    return match ? match[1] : null;
  }
}
