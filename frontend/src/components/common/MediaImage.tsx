import type { ImgHTMLAttributes } from 'react';

import { resolveMediaUrl } from '@/utils/media';

type MediaImageProps = ImgHTMLAttributes<HTMLImageElement>;

export function MediaImage({ src, ...props }: MediaImageProps) {
  return <img {...props} src={resolveMediaUrl(src)} />;
}
