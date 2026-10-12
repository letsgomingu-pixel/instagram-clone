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
const HEIC_EXT = /\.(heic|heif)$/i;
const STORY_IMAGE_MAX_EDGE = 1920;
export const AVATAR_IMAGE_MAX_EDGE = 1080;

export function isVideoUpload(file: File): boolean {
  return file.type.startsWith('video/') || VIDEO_EXT.test(file.name);
}

export function isServerReadyImage(file: File): boolean {
  const type = (file.type || '').split(';')[0].trim().toLowerCase();
  if (type === 'image/png' || type === 'image/jpeg' || type === 'image/webp') return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

function looksLikeImageFile(file: File): boolean {
  if (!file.type || file.type === 'application/octet-stream' || file.type === 'binary/octet-stream') {
    return true;
  }
  return file.type.startsWith('image/') || IMAGE_EXT.test(file.name) || HEIC_EXT.test(file.name);
}

function decodeWithHtmlImage(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      createImageBitmap(image)
        .then(resolve)
        .catch(reject)
        .finally(() => URL.revokeObjectURL(url));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image decode failed'));
    };
    image.src = url;
  });
}

async function decodeImageFile(file: File): Promise<ImageBitmap> {
  try {
    return await Promise.race([
      createImageBitmap(file),
      new Promise<ImageBitmap>((_, reject) => {
        window.setTimeout(() => reject(new Error('image convert timeout')), 4000);
      }),
    ]);
  } catch {
    return decodeWithHtmlImage(file);
  }
}

/** Convert phone-camera photos (HEIC, huge JPEGs) to a JPEG the API accepts. */
export async function normalizeImageFile(file: File, maxEdge = STORY_IMAGE_MAX_EDGE): Promise<File> {
  if (!looksLikeImageFile(file)) return file;

  try {
    const bitmap = await decodeImageFile(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
    });
    if (!blob) return file;
    const base = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export async function normalizeStoryFile(file: File): Promise<File> {
  if (isVideoUpload(file)) return file;
  return normalizeImageFile(file);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Grab a JPEG still from a video so Reels don't show a blank/black poster. */
export async function captureVideoThumbnail(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('playsinline', '');
  // Off-screen nodes are required. Detached videos often never fire `seeked` on phones.
  video.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.appendChild(video);

  try {
    video.src = url;
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('video load failed'));
      }),
      4000,
    );

    if (!video.videoWidth || !video.videoHeight) {
      try {
        await video.play();
        video.pause();
      } catch {
        return null;
      }
    }
    if (!video.videoWidth || !video.videoHeight) return null;

    const seekTo = Number.isFinite(video.duration) && video.duration > 0.3
      ? Math.min(0.25, video.duration * 0.1)
      : 0;
    if (seekTo > 0) {
      try {
        await withTimeout(
          new Promise<void>((resolve) => {
            video.addEventListener('seeked', () => resolve(), { once: true });
            try {
              video.currentTime = seekTo;
            } catch {
              resolve();
            }
          }),
          2000,
        );
      } catch {
        // Use the frame that is already decoded.
      }
    }

    const maxEdge = 720;
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await withTimeout(
      new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.85);
      }),
      3000,
    );
    if (!blob) return null;
    return new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
  } catch {
    return null;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
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
