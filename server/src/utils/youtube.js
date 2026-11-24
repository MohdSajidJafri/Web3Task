/**
 * Safely extract an 11-character YouTube video ID from various URL formats or raw ID.
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Raw 11-char ID (e.g. dQw4w9WgXcQ)
 *
 * @param {string} input
 * @returns {string | null} 11-character videoId or null if invalid
 */
export function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // If already an 11-character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    // If input doesn't start with protocol, add https:// to parse as URL
    const urlString = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    const parsed = new URL(urlString);

    // youtu.be/VIDEO_ID
    if (parsed.hostname === 'youtu.be' || parsed.hostname.endsWith('.youtu.be')) {
      const id = parsed.pathname.slice(1).split('/')[0].split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }

    // youtube.com / m.youtube.com
    if (parsed.hostname.includes('youtube.com')) {
      // /watch?v=VIDEO_ID
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }

      // /embed/VIDEO_ID or /shorts/VIDEO_ID or /v/VIDEO_ID
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (['embed', 'shorts', 'v'].includes(pathParts[0]) && pathParts[1]) {
        const id = pathParts[1].split('?')[0];
        if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
      }
    }
  } catch (err) {
    // URL parsing failed; fallback regex match
  }

  // Fallback regex match across the input
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  if (match && match[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }

  return null;
}
