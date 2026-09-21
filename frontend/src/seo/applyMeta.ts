import { DEFAULT_JSON_LD, DEFAULT_KEYWORDS, DEFAULT_OG_IMAGE, SITE_NAME, SITE_ORIGIN } from './constants';
import type { SeoMeta } from './types';

function canonicalUrl(pathname: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
  if (pathname === '/') return `${origin}/`;
  return `${origin}${pathname}`;
}

function absUrl(url?: string): string {
  if (!url) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${path}`;
}

export function truncateSeo(text: string, max = 140): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trim()}…`;
}

function formatTitle(title: string): string {
  if (title === SITE_NAME || title.startsWith(`${SITE_NAME} |`)) return title;
  if (title.includes(` | ${SITE_NAME}`)) return title;
  return `${title} | ${SITE_NAME}`;
}

function ensureMeta(selector: string, attrs: Record<string, string>): HTMLMetaElement {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    document.head.appendChild(el);
  }
  return el;
}

function setNamedMeta(name: string, content: string) {
  const el = ensureMeta(`meta[name="${name}"]`, { name });
  el.setAttribute('content', content);
}

function setPropertyMeta(property: string, content: string) {
  const el = ensureMeta(`meta[property="${property}"]`, { property });
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data: unknown) {
  let el = document.getElementById('seo-jsonld') as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = 'seo-jsonld';
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data ?? DEFAULT_JSON_LD);
}

export function applyMeta(pathname: string, meta: SeoMeta) {
  const title = formatTitle(meta.title);
  const description = meta.description;
  const keywords = meta.keywords || DEFAULT_KEYWORDS;
  const image = absUrl(meta.image);
  const url = canonicalUrl(pathname);
  const robots = meta.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  document.title = title;
  setNamedMeta('description', description);
  setNamedMeta('keywords', keywords);
  setNamedMeta('robots', robots);
  setNamedMeta('author', SITE_NAME);
  setCanonical(url);

  setPropertyMeta('og:type', meta.type || 'website');
  setPropertyMeta('og:site_name', SITE_NAME);
  setPropertyMeta('og:url', url);
  setPropertyMeta('og:title', title);
  setPropertyMeta('og:description', description);
  setPropertyMeta('og:image', image);
  setPropertyMeta('og:image:alt', title);
  setPropertyMeta('og:locale', 'ko_KR');

  setNamedMeta('twitter:card', 'summary_large_image');
  setNamedMeta('twitter:title', title);
  setNamedMeta('twitter:description', description);
  setNamedMeta('twitter:image', image);
  setNamedMeta('twitter:image:alt', title);

  const imageSrc = document.head.querySelector('link[rel="image_src"]') as HTMLLinkElement | null;
  if (imageSrc) imageSrc.href = image;

  setJsonLd(meta.jsonLd ?? DEFAULT_JSON_LD);
}
