/**
 * Video URL detection and embed conversion utilities
 * Supports YouTube URLs and direct video files (MP4, WebM, OGG)
 */

export type VideoType = 'youtube' | 'video' | 'unknown';

export interface VideoInfo {
  type: VideoType;
  embedUrl: string;
}

/**
 * Detect video URL type and convert to embeddable format
 * Preserves timestamp parameters (t or start) for YouTube videos
 *
 * @param url - Video URL to process
 * @returns Object with video type and embed-ready URL
 *
 * @example
 * getEmbedUrl('https://www.youtube.com/watch?v=abc123')
 * // Returns: { type: 'youtube', embedUrl: 'https://www.youtube.com/embed/abc123' }
 *
 * getEmbedUrl('https://www.youtube.com/watch?v=abc123&t=77s')
 * // Returns: { type: 'youtube', embedUrl: 'https://www.youtube.com/embed/abc123?start=77' }
 *
 * getEmbedUrl('https://example.com/video.mp4')
 * // Returns: { type: 'video', embedUrl: 'https://example.com/video.mp4' }
 */
export function getEmbedUrl(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return { type: 'unknown', embedUrl: url || '' };
  }

  // Helper: Extract timestamp from URL and convert to seconds
  const extractTimestamp = (urlString: string): number | null => {
    try {
      const urlObj = new URL(urlString);

      // Check for 't' parameter (e.g., t=77s, t=1m30s, t=77)
      const tParam = urlObj.searchParams.get('t');
      if (tParam) {
        // Parse formats: 77s, 1m30s, 77 (plain seconds)
        const match = tParam.match(/(?:(\d+)m)?(?:(\d+)s?)?/);
        if (match) {
          const minutes = parseInt(match[1] || '0');
          const seconds = parseInt(match[2] || tParam); // Fallback to plain number
          return minutes * 60 + seconds;
        }
      }

      // Check for 'start' parameter (already in seconds)
      const startParam = urlObj.searchParams.get('start');
      if (startParam) {
        return parseInt(startParam);
      }
    } catch {
      // URL parsing failed, return null
    }
    return null;
  };

  // YouTube detection - supports multiple URL formats
  // Formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];

  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      const timestamp = extractTimestamp(url);

      // Build embed URL with timestamp if present
      let embedUrl = `https://www.youtube.com/embed/${videoId}`;
      if (timestamp !== null) {
        embedUrl += `?start=${timestamp}`;
      }

      return {
        type: 'youtube',
        embedUrl,
      };
    }
  }

  // Direct video file detection
  // Supports: MP4, WebM, OGG
  if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
    return {
      type: 'video',
      embedUrl: url,
    };
  }

  // Unknown video type - return as-is
  return {
    type: 'unknown',
    embedUrl: url,
  };
}

/**
 * Extract YouTube video ID from URL
 *
 * @param url - YouTube URL
 * @returns Video ID or null if not found
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
