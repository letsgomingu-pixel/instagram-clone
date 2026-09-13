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
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i;
const STORY_IMAGE_MAX_EDGE = 1920;

export function isVideoUpload(file: File): boolean {
  return file.type.startsWith('video/') || VIDEO_EXT.test(file.name);
}

/** Convert phone-camera photos (HEIC, huge JPEGs) to a JPEG the API accepts. */
export async function normalizeStoryFile(file: File): Promise<File> {
  if (isVideoUpload(file)) return file;

  const looksLikeImage =
    file.type.startsWith('image/') || IMAGE_EXT.test(file.name) || !file.type;
  if (!looksLikeImage) return file;

  try {
    const bitmap = await Promise.race([
      createImageBitmap(file),
      new Promise<ImageBitmap>((_, reject) => {
        window.setTimeout(() => reject(new Error('image convert timeout')), 4000);
      }),
    ]);
    const scale = Math.min(1, STORY_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'story';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function isVideoMediaUrl(url?: string | null): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url);
}

/** Prefer the file extension over a stale/wrong media_type from the API. */
export function isStoryVideoItem(item?: { media_type?: string | null; image_url?: string | null } | null): boolean {
  if (!item) return false;
  const url = item.image_url ?? '';
  if (IMAGE_EXT.test(url)) return false;
  if (VIDEO_EXT.test(url)) return true;
  return item.media_type === 'video';
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
