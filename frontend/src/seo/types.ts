export type SeoOgType = 'website' | 'article' | 'product';

export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: SeoOgType;
  noindex?: boolean;
  jsonLd?: unknown;
}

export type SeoOverride = Partial<SeoMeta>;
