// Same-origin by default (see api/client.ts for why: a hardcoded
// "localhost:8000" fallback here pointed every real visitor's browser at
// their own machine instead of the actual server, so no avatar or post
// image ever loaded in production unless VITE_MEDIA_BASE_URL happened to be
// set at build time — which it never was).
function getMediaBase(): string {
  const configured = import.meta.env.VITE_MEDIA_BASE_URL as string | undefined;
  return (configured || `${window.location.origin}/media`).replace(/\/$/, '');
}

function getApiOrigin(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  // Pass window.location.origin as the base so a relative apiBase (the
  // normal case, both in dev and prod) resolves instead of throwing —
  // new URL() requires an absolute URL unless a base is given.
  return new URL(apiBase, window.location.origin).origin;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

export function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url);
}

/** Turn API media paths (`/media/...`) into absolute URLs for the Vite dev server. */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;

  if (url.startsWith('/media/')) {
    // Dev: same-origin via Vite proxy (/media -> backend)
    if (import.meta.env.DEV) {
      return url;
    }
    return `${getMediaBase()}${url.slice('/media'.length)}`;
  }

  if (url.startsWith('/')) {
    return `${getApiOrigin()}${url}`;
  }

  return url;
}
