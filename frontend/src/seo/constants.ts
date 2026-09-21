export const SITE_NAME = 'i am not a fishmonger';
export const SITE_ORIGIN = 'https://www.iamnotafishmonger.com';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-white.jpg`;

export const DEFAULT_KEYWORDS = [
  '수산물',
  '해산물',
  '오징어',
  '꽃게',
  '조개',
  '새우',
  '회',
  '생선',
  '고등어',
  '갈치',
  '전복',
  '홍합',
  '굴',
  '낙지',
  '문어',
  '주꾸미',
  '대게',
  '수산물도매',
  '수산물소매',
  '제철수산물',
  '수산물후기',
  '해산물택배',
  '산지수산물',
].join(', ');

export const DEFAULT_DESCRIPTION =
  'i am not a fishmonger에서 신선한 수산물을 도매·소매로 만나고 구매 후기를 공유하세요. 오징어, 꽃게, 조개, 새우, 회 등 제철 해산물을 한곳에서 주문할 수 있습니다.';

export const DEFAULT_TITLE = `${SITE_NAME} | 수산물 도매·소매와 후기`;

export const DEFAULT_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: DEFAULT_OG_IMAGE,
      description: DEFAULT_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_ORIGIN,
      inLanguage: 'ko-KR',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};
