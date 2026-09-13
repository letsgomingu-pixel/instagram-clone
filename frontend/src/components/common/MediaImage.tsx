import type { ImgHTMLAttributes } from 'react';

import { resolveMediaUrl } from '@/utils/media';

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function MediaImage({ src, ...props }: MediaImageProps) {
  const resolved = resolveMediaUrl(src);
  if (!resolved) return null;
  return <img {...props} src={resolved} />;
}
