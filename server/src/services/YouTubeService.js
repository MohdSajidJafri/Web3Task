/**
 * YouTube Service with dual support + endless pagination:
 * 1. Official YouTube Data API v3 (when YOUTUBE_API_KEY is configured in env or request)
 * 2. Public Direct YouTube Search Extractor + InnerTube Continuation (zero-key fallback, always works)
 * 3. Offline Curated Fallback (for airgapped sandbox or offline tests)
 */

const CURATED_FALLBACK_VIDEOS = [
  {
    id: 'QdBZY2fkU-0',
    title: 'Grand Theft Auto VI Trailer 1',
    channel: 'Rockstar Games',
    views: '185M views',
    publishedTime: '1 year ago',
    duration: '01:31',
    description: 'Watch the official Grand Theft Auto VI Trailer 1 in synchronized Watch Party mode.',
    thumbnail: 'https://i.ytimg.com/vi/QdBZY2fkU-0/hqdefault.jpg',
    verified: true,
  },
  {
    id: '5qap5aO4i9A',
    title: 'lofi hip hop radio - beats to relax/study to',
    channel: 'Lofi Girl',
    views: '78.9K watching',
    publishedTime: 'LIVE',
    duration: 'LIVE',
    description: 'Chill lofi hip hop beats to relax, study, or hang out with friends 24/7.',
    thumbnail: 'https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg',
    verified: true,
  },
  {
    id: 'PbVKBoDuhZ0',
    title: 'Cyberpunk 2077: Phantom Liberty — Official Cinematic Teaser',
    channel: 'Cyberpunk 2077',
    views: '15.2M views',
    publishedTime: '1 year ago',
    duration: '03:45',
    description: 'Return to Night City in Cyberpunk 2077: Phantom Liberty.',
    thumbnail: 'https://i.ytimg.com/vi/PbVKBoDuhZ0/hqdefault.jpg',
    verified: true,
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'YouTube Developers Live: Embedded Web Player Customization',
    channel: 'Google Developers',
    views: '12.4K views',
    publishedTime: '5 years ago',
    duration: '33:10',
    description: 'Deep dive into YouTube IFrame Player API and embedded customization.',
    thumbnail: 'https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg',
    verified: true,
  },
  {
    id: 'LXb3EKWsInQ',
    title: 'COSTA RICA IN 4K 60fps HDR (ULTRA HD)',
    channel: 'Jacob + Katie Schwarz',
    views: '120M views',
    publishedTime: '6 years ago',
    duration: '05:15',
    description: 'Experience the wildlife and rainforests of Costa Rica in crisp 4K 60fps HDR.',
    thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
    verified: true,
  },
  {
    id: 'Way9Dexny3w',
    title: 'Dune: Part Two | Official Trailer 3',
    channel: 'Warner Bros. Pictures',
    views: '34M views',
    publishedTime: '11 months ago',
    duration: '02:24',
    description: 'Dune: Part Two explores the mythic journey of Paul Atreides.',
    thumbnail: 'https://i.ytimg.com/vi/Way9Dexny3w/hqdefault.jpg',
    verified: true,
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'synthwave radio 🌌 beats to chill/game to',
    channel: 'Lofi Girl',
    views: '24K watching',
    publishedTime: 'LIVE',
    duration: 'LIVE',
    description: '24/7 synthwave and chillwave radio stream.',
    thumbnail: 'https://i.ytimg.com/vi/DWcJFNfaw9c/hqdefault.jpg',
    verified: true,
  },
  {
    id: '8g1vEAt46vM',
    title: 'Interstellar — 10th Anniversary IMAX Re-Release Trailer',
    channel: 'Paramount Pictures',
    views: '8.2M views',
    publishedTime: '4 months ago',
    duration: '02:10',
    description: 'Christopher Nolan’s sci-fi masterpiece returns to IMAX.',
    thumbnail: 'https://i.ytimg.com/vi/8g1vEAt46vM/hqdefault.jpg',
    verified: true,
  },
];

function parseVideoRenderer(vr) {
  const videoId = vr?.videoId;
  if (!videoId) return null;

  const title =
    vr.title?.runs?.map((r) => r.text).join('') ||
    vr.title?.simpleText ||
    'YouTube Video';

  const channel =
    vr.ownerText?.runs?.[0]?.text ||
    vr.shortBylineText?.runs?.[0]?.text ||
    'YouTube Channel';

  const channelEndpoint =
    vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint ||
    vr.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint;

  const channelId = channelEndpoint?.browseId || '';
  const channelUrl = channelEndpoint?.canonicalBaseUrl || '';

  const channelAvatar =
    vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url || '';

  const verified = Boolean(
    vr.ownerBadges?.some((b) =>
      b.metadataBadgeRenderer?.style?.includes('VERIFIED')
    )
  );

  const views =
    vr.viewCountText?.simpleText ||
    vr.shortViewCountText?.simpleText ||
    (vr.viewCountText?.runs ? vr.viewCountText.runs.map((r) => r.text).join('') : '') ||
    '';

  const publishedTime = vr.publishedTimeText?.simpleText || '';

  const isLive = Boolean(
    vr.badges?.some((b) => b.metadataBadgeRenderer?.style?.includes('LIVE')) ||
      vr.thumbnailOverlays?.some(
        (o) => o.thumbnailOverlayTimeStatusRenderer?.style === 'LIVE'
      )
  );

  const duration = vr.lengthText?.simpleText || (isLive ? 'LIVE' : '');

  const description =
    vr.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r) => r.text).join('') ||
    vr.descriptionSnippet?.runs?.map((r) => r.text).join('') ||
    '';

  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return {
    id: videoId,
    title,
    channel,
    channelId,
    channelUrl,
    channelAvatar,
    verified,
    views,
    publishedTime,
    duration,
    description,
    thumbnail,
  };
}

function parseLockupViewModel(lm, fallbackChannel = {}) {
  const videoId = lm?.contentId;
  if (!videoId || videoId.length !== 11) return null;

  const meta = lm.metadata?.lockupMetadataViewModel;
  const title = meta?.title?.content || 'YouTube Video';

  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows || [];
  let views = '';
  let publishedTime = '';

  for (const row of rows) {
    for (const part of row.metadataParts || []) {
      const txt = part.text?.content || '';
      if (!txt) continue;
      if (txt.toLowerCase().includes('watching') || /^\d/.test(txt) && !txt.includes('ago')) {
        if (!views) views = txt.includes('view') || txt.includes('watching') ? txt : `${txt} views`;
      } else if (txt.includes('ago') || txt.toLowerCase().includes('streamed')) {
        publishedTime = txt;
      }
    }
  }

  let duration = '';
  const overlays = lm.contentImage?.thumbnailViewModel?.overlays || [];
  for (const ov of overlays) {
    const badges = ov.thumbnailBottomOverlayViewModel?.badges || [];
    for (const b of badges) {
      const badgeVm = b.thumbnailBadgeViewModel;
      if (badgeVm?.text) {
        duration = badgeVm.text;
      }
      if (badgeVm?.badgeStyle?.includes('LIVE')) {
        duration = 'LIVE';
      }
    }
  }

  return {
    id: videoId,
    title,
    channel: fallbackChannel.title || 'YouTube Channel',
    channelId: fallbackChannel.id || '',
    channelUrl: fallbackChannel.handle ? `/${fallbackChannel.handle}` : '',
    channelAvatar: fallbackChannel.avatar || '',
    verified: Boolean(fallbackChannel.verified),
    views,
    publishedTime,
    duration,
    description: '',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

function parseGridOrShortsItem(item, fallbackChannel = {}) {
  const content = item?.richItemRenderer?.content || item;
  if (content?.lockupViewModel) {
    return parseLockupViewModel(content.lockupViewModel, fallbackChannel);
  }
  if (content?.videoRenderer) {
    const parsed = parseVideoRenderer(content.videoRenderer);
    if (parsed) {
      if (!parsed.channel || parsed.channel === 'YouTube Channel') parsed.channel = fallbackChannel.title || parsed.channel;
      if (!parsed.channelId) parsed.channelId = fallbackChannel.id || '';
      if (!parsed.channelAvatar) parsed.channelAvatar = fallbackChannel.avatar || '';
    }
    return parsed;
  }
  if (content?.gridVideoRenderer) {
    const gvr = content.gridVideoRenderer;
    const videoId = gvr.videoId;
    if (!videoId) return null;
    const duration =
      gvr.thumbnailOverlays?.find((o) => o.thumbnailOverlayTimeStatusRenderer)?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || '';
    return {
      id: videoId,
      title: gvr.title?.runs?.[0]?.text || gvr.title?.simpleText || 'YouTube Video',
      channel: fallbackChannel.title || 'YouTube Channel',
      channelId: fallbackChannel.id || '',
      channelUrl: fallbackChannel.handle ? `/${fallbackChannel.handle}` : '',
      channelAvatar: fallbackChannel.avatar || '',
      verified: Boolean(fallbackChannel.verified),
      views: gvr.viewCountText?.simpleText || gvr.shortViewCountText?.simpleText || '',
      publishedTime: gvr.publishedTimeText?.simpleText || '',
      duration,
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  if (content?.shortsLockupViewModel) {
    const slm = content.shortsLockupViewModel;
    const videoId = slm.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId || '';
    if (!videoId) return null;
    return {
      id: videoId,
      title: slm.overlayMetadata?.primaryText?.content || 'YouTube Short',
      channel: fallbackChannel.title || 'YouTube Channel',
      channelId: fallbackChannel.id || '',
      channelUrl: fallbackChannel.handle ? `/${fallbackChannel.handle}` : '',
      channelAvatar: fallbackChannel.avatar || '',
      verified: Boolean(fallbackChannel.verified),
      views: slm.overlayMetadata?.secondaryText?.content || '',
      publishedTime: '',
      duration: 'SHORTS',
      description: '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
  return null;
}

function encodeBrowseContinuation(innertubeKey, continuationToken) {
  if (!innertubeKey || !continuationToken) return null;
  const payload = JSON.stringify({ k: innertubeKey, c: continuationToken });
  return 'yt_browse_' + Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeBrowseContinuation(pageToken) {
  if (!pageToken || typeof pageToken !== 'string' || !pageToken.startsWith('yt_browse_')) {
    return null;
  }
  try {
    const raw = Buffer.from(pageToken.slice('yt_browse_'.length), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.k && parsed.c) return parsed;
  } catch {
    // Ignore
  }
  return null;
}

function encodeContinuation(innertubeKey, continuationToken) {
  if (!innertubeKey || !continuationToken) return null;
  const payload = JSON.stringify({ k: innertubeKey, c: continuationToken });
  return 'yt_cont_' + Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeContinuation(pageToken) {
  if (!pageToken || typeof pageToken !== 'string' || !pageToken.startsWith('yt_cont_')) {
    return null;
  }
  try {
    const raw = Buffer.from(pageToken.slice('yt_cont_'.length), 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.k && parsed.c) return parsed;
  } catch {
    // Ignore malformed token
  }
  return null;
}

export class YouTubeService {
  /**
   * Search videos via YouTube API or direct extraction with pagination.
   * @param {string} query
   * @param {string} [apiKey]
   * @param {string} [pageToken]
   * @returns {Promise<{ results: Array<object>, nextPageToken: string|null }>}
   */
  static async searchPaginated(query, apiKey = process.env.YOUTUBE_API_KEY, pageToken = '') {
    if (!query || !query.trim()) {
      return { results: CURATED_FALLBACK_VIDEOS, nextPageToken: null };
    }

    const trimmed = query.trim();

    // 1. If initial search is a direct YouTube URL or raw 11-char videoId, resolve it directly
    if (!pageToken) {
      const extractedId = this.extractVideoId(trimmed);
      if (extractedId) {
        const details = await this.getVideoDetails(extractedId, apiKey);
        if (details) return { results: [details], nextPageToken: null };
      }
    }

    // 2. If an API key is available and token isn't an InnerTube token, attempt official YouTube Data API v3
    if (apiKey && !pageToken?.startsWith('yt_cont_')) {
      try {
        let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(trimmed)}&key=${apiKey}`;
        if (pageToken) {
          url += `&pageToken=${encodeURIComponent(pageToken)}`;
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const results = data.items
              .filter((item) => item.id?.videoId)
              .map((item) => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                channelAvatar: '',
                verified: false,
                views: 'YouTube Video',
                publishedTime: item.snippet.publishedAt
                  ? new Date(item.snippet.publishedAt).toLocaleDateString()
                  : '',
                duration: '',
                description: item.snippet.description || '',
                thumbnail:
                  item.snippet.thumbnails?.high?.url ||
                  item.snippet.thumbnails?.medium?.url ||
                  `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
              }));
            return {
              results,
              nextPageToken: data.nextPageToken || null,
            };
          }
        }
      } catch (err) {
        // Fall through to public extraction if API key is invalid/quota exceeded/times out
      }
    }

    // 3. Public Direct YouTube Search Continuation (Endless scroll page 2+)
    const contPayload = decodeContinuation(pageToken);
    if (contPayload) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(
          `https://www.youtube.com/youtubei/v1/search?key=${encodeURIComponent(contPayload.k)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20231219.04.00',
                },
              },
              continuation: contPayload.c,
            }),
          }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const items =
            data.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction?.continuationItems ||
            [];
          const results = [];
          let nextToken = null;

          for (const item of items) {
            if (item.itemSectionRenderer) {
              for (const content of item.itemSectionRenderer.contents || []) {
                if (content.videoRenderer) {
                  const parsed = parseVideoRenderer(content.videoRenderer);
                  if (parsed) results.push(parsed);
                }
              }
            }
            if (item.continuationItemRenderer) {
              const nextC =
                item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
              if (nextC) {
                nextToken = encodeContinuation(contPayload.k, nextC);
              }
            }
          }

          return { results, nextPageToken: nextToken };
        }
      } catch (err) {
        return { results: [], nextPageToken: null };
      }
    }

    // 4. Public Direct YouTube Search Extractor (Initial page, No API key required)
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
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
        const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
        const innertubeKey = apiKeyMatch ? apiKeyMatch[1] : null;

        if (match) {
          const data = JSON.parse(match[1]);
          const sections =
            data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer
              ?.contents || [];
          const results = [];
          let nextToken = null;

          for (const section of sections) {
            const items = section.itemSectionRenderer?.contents || [];
            for (const item of items) {
              if (item.videoRenderer) {
                const parsed = parseVideoRenderer(item.videoRenderer);
                if (parsed) results.push(parsed);
              }
            }
            if (section.continuationItemRenderer && innertubeKey) {
              const contToken =
                section.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
              if (contToken) {
                nextToken = encodeContinuation(innertubeKey, contToken);
              }
            }
          }

          if (results.length > 0) {
            return { results, nextPageToken: nextToken };
          }
        }
      }
    } catch (err) {
      // Fall through to curated fallback
    }

    // 5. Offline / Curated Fallback
    const qLower = trimmed.toLowerCase();
    const filtered = CURATED_FALLBACK_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(qLower) ||
        v.channel.toLowerCase().includes(qLower) ||
        v.id.toLowerCase().includes(qLower)
    );

    return {
      results: filtered.length > 0 ? filtered : CURATED_FALLBACK_VIDEOS,
      nextPageToken: null,
    };
  }

  /**
   * Backward-compatible search returning only results array.
   */
  static async search(query, apiKey = process.env.YOUTUBE_API_KEY) {
    const { results } = await this.searchPaginated(query, apiKey);
    return results;
  }

  /**
   * Fetch YouTube channel metadata + paginated videos/streams/shorts.
   * Works with channelId, @handle, or channel name (resolves via search).
   */
  static async getChannel({
    channelId = '',
    handle = '',
    name = '',
    tab = 'videos',
    pageToken = '',
    apiKey = process.env.YOUTUBE_API_KEY,
  }) {
    const validTab = ['videos', 'streams', 'shorts'].includes(tab) ? tab : 'videos';

    // 1. Handle endless scroll continuation for channel grid
    const browsePayload = decodeBrowseContinuation(pageToken);
    if (browsePayload) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(
          `https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(browsePayload.k)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: JSON.stringify({
              context: {
                client: {
                  clientName: 'WEB',
                  clientVersion: '2.20231219.04.00',
                },
              },
              continuation: browsePayload.c,
            }),
          }
        );
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const items =
            data.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems ||
            [];
          const videos = [];
          let nextToken = null;
          for (const item of items) {
            if (item.continuationItemRenderer) {
              const nextC =
                item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
              if (nextC) nextToken = encodeBrowseContinuation(browsePayload.k, nextC);
              continue;
            }
            const parsed = parseGridOrShortsItem(item, { title: name, id: channelId, handle });
            if (parsed) videos.push(parsed);
          }
          return { channel: null, videos, nextPageToken: nextToken };
        }
      } catch {
        return { channel: null, videos: [], nextPageToken: null };
      }
    }

    // 2. Resolve target channel URL
    let targetPath = '';
    const cleanHandle = (handle || '').trim().replace(/^\/+/, '');
    if (cleanHandle && (cleanHandle.startsWith('@') || cleanHandle.startsWith('c/') || cleanHandle.startsWith('user/'))) {
      targetPath = `https://www.youtube.com/${cleanHandle}/${validTab}`;
    } else if (channelId && channelId.startsWith('UC')) {
      targetPath = `https://www.youtube.com/channel/${channelId}/${validTab}`;
    } else if (name && name.trim()) {
      // Resolve channel URL by searching YouTube for the channel name
      try {
        const searchRes = await this.searchPaginated(name.trim(), apiKey);
        const matchWithChannel =
          searchRes.results.find(
            (r) =>
              r.channel &&
              r.channel.toLowerCase().includes(name.trim().toLowerCase()) &&
              (r.channelUrl || r.channelId)
          ) || searchRes.results.find((r) => r.channelUrl || r.channelId);

        if (matchWithChannel?.channelUrl) {
          const base = matchWithChannel.channelUrl.replace(/^\/+/, '');
          targetPath = `https://www.youtube.com/${base}/${validTab}`;
        } else if (matchWithChannel?.channelId) {
          targetPath = `https://www.youtube.com/channel/${matchWithChannel.channelId}/${validTab}`;
        }
      } catch {
        // Ignore
      }
    }

    // 3. Scrape channel page ytInitialData (zero-key, works for all channels)
    if (targetPath) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(targetPath, {
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
          const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
          const innertubeKey = apiKeyMatch ? apiKeyMatch[1] : null;

          if (match) {
            const data = JSON.parse(match[1]);
            const meta = data.metadata?.channelMetadataRenderer || {};
            const ph = data.header?.pageHeaderRenderer?.content?.pageHeaderViewModel;
            const c4 = data.header?.c4TabbedHeaderRenderer;

            let resolvedHandle = cleanHandle;
            let subscriberCount = '';
            let videoCount = '';

            const metaRows = ph?.metadata?.contentMetadataViewModel?.metadataRows || [];
            for (const row of metaRows) {
              for (const part of row.metadataParts || []) {
                const txt = part.text?.content || '';
                if (txt.startsWith('@')) resolvedHandle = txt;
                else if (txt.toLowerCase().includes('subscriber')) subscriberCount = txt;
                else if (txt.toLowerCase().includes('video')) videoCount = txt;
              }
            }

            if (!subscriberCount && c4?.subscriberCountText?.simpleText) {
              subscriberCount = c4.subscriberCountText.simpleText;
            }

            const avatarSources =
              ph?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources ||
              c4?.avatar?.thumbnails ||
              meta.avatar?.thumbnails ||
              [];
            const avatar = avatarSources.slice(-1)[0]?.url || '';

            const bannerSources =
              ph?.banner?.imageBannerViewModel?.image?.sources ||
              c4?.banner?.thumbnails ||
              [];
            const banner = bannerSources.slice(-1)[0]?.url || '';

            const channelTitle =
              ph?.title?.dynamicTextViewModel?.text?.content ||
              c4?.title ||
              meta.title ||
              name ||
              'YouTube Channel';

            const description =
              ph?.description?.descriptionPreviewViewModel?.description?.content ||
              meta.description ||
              '';

            const resolvedId = meta.externalId || channelId || '';
            const verified = Boolean(
              ph?.title?.dynamicTextViewModel?.text?.attachmentRuns?.length ||
                c4?.badges?.length
            );

            const channelInfo = {
              id: resolvedId,
              title: channelTitle,
              handle: resolvedHandle || '',
              avatar,
              banner,
              subscriberCount,
              videoCount,
              description,
              verified,
            };

            const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
            const activeTabObj =
              tabs.find((t) => t.tabRenderer?.selected) ||
              tabs.find((t) => t.tabRenderer?.title?.toLowerCase() === validTab) ||
              tabs[1] ||
              tabs[0];

            const gridContents =
              activeTabObj?.tabRenderer?.content?.richGridRenderer?.contents ||
              activeTabObj?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
                ?.itemSectionRenderer?.contents?.[0]?.gridRenderer?.items ||
              [];

            const videos = [];
            let nextToken = null;

            for (const item of gridContents) {
              if (item.continuationItemRenderer && innertubeKey) {
                const cTok =
                  item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
                if (cTok) nextToken = encodeBrowseContinuation(innertubeKey, cTok);
                continue;
              }
              const parsed = parseGridOrShortsItem(item, channelInfo);
              if (parsed) videos.push(parsed);
            }

            return {
              channel: channelInfo,
              videos,
              nextPageToken: nextToken,
            };
          }
        }
      } catch {
        // Fall through to search fallback
      }
    }

    // 4. Fallback: search videos by channel name so channel page always shows relevant content
    const fallbackSearch = await this.searchPaginated(name || handle || channelId || 'music', apiKey);
    const first = fallbackSearch.results[0];
    return {
      channel: {
        id: channelId || first?.channelId || '',
        title: name || first?.channel || 'YouTube Channel',
        handle: handle || '',
        avatar: first?.channelAvatar || '',
        banner: '',
        subscriberCount: '',
        videoCount: `${fallbackSearch.results.length}+ videos`,
        description: `Watch videos from ${name || handle || 'this channel'} together in synchronized Watch Party mode.`,
        verified: Boolean(first?.verified),
      },
      videos: fallbackSearch.results,
      nextPageToken: fallbackSearch.nextPageToken,
    };
  }

  /**
   * Fetch YouTube Trending / Popular videos by category.
   */
  static async getTrending(category = 'all', apiKey = process.env.YOUTUBE_API_KEY) {
    const queryMap = {
      all: 'trending music gaming trailers 2026',
      music: 'official music video trending 2026',
      gaming: 'trending gaming trailers walkthrough 2026',
      movies: 'official movie trailer 4k 2026',
      tech: 'tech keynote AI showcase 2026',
    };
    const q = queryMap[category] || queryMap.all;
    const { results } = await this.searchPaginated(q, apiKey);
    return results;
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
              channelAvatar: '',
              verified: false,
              views: item.statistics?.viewCount
                ? `${Number(item.statistics.viewCount).toLocaleString()} views`
                : '',
              publishedTime: item.snippet.publishedAt
                ? new Date(item.snippet.publishedAt).toLocaleDateString()
                : '',
              duration: item.contentDetails?.duration || '',
              description: item.snippet.description || '',
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
          channelAvatar: '',
          verified: false,
          views: '',
          publishedTime: '',
          duration: '',
          description: '',
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
      channelAvatar: '',
      verified: false,
      views: '',
      publishedTime: '',
      duration: '',
      description: '',
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
