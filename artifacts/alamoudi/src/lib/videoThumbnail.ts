// Extracts a clean, canonical URL from whatever the user pastes for a video:
// a plain link, a short link, OR a full TikTok "Embed" code (<blockquote>…</blockquote>).
export function extractVideoUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  const s = raw.trim();
  if (!s) return "";
  // Plain single URL → use as-is.
  if (/^https?:\/\/[^\s"'<>]+$/i.test(s)) return s;
  // TikTok embed code: prefer the cite="..." canonical URL.
  const cite = s.match(/cite=["']([^"']+)["']/i);
  if (cite && /tiktok\.com/i.test(cite[1])) return cite[1];
  // Any embedded tiktok video URL inside the HTML.
  const urlMatch = s.match(/https?:\/\/[^\s"'<>]*tiktok\.com\/[^\s"'<>]*/i);
  if (urlMatch) return urlMatch[0];
  // Fall back to building a URL from the numeric video id.
  const vid = s.match(/data-video-id=["'](\d{6,})["']/i) || s.match(/\/video\/(\d{6,})/);
  if (vid) return `https://www.tiktok.com/@_/video/${vid[1]}`;
  // Any URL at all (e.g. youtube embed code).
  const anyUrl = s.match(/https?:\/\/[^\s"'<>]+/i);
  return anyUrl ? anyUrl[0] : s;
}

export function getVideoThumbnailUrl(videoUrl: string | undefined | null): string | null {
  if (!videoUrl) return null;
  const url = extractVideoUrl(videoUrl);
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`;
  if (/(^|\.)tiktok\.com/i.test(url)) {
    return `/api/tiktok/thumbnail?url=${encodeURIComponent(url)}`;
  }
  return null;
}

export function hasVideo(videoUrl: string | undefined | null): boolean {
  return !!(videoUrl && videoUrl.trim());
}
