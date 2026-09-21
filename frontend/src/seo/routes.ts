import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, DEFAULT_TITLE, SITE_NAME } from './constants';
import type { SeoMeta } from './types';

const INDEXABLE: Pick<SeoMeta, 'keywords' | 'noindex' | 'type'> = {
  keywords: DEFAULT_KEYWORDS,
  noindex: false,
  type: 'website',
};

const PRIVATE: SeoMeta = {
  title: '비공개 페이지',
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  noindex: true,
  type: 'website',
};

const PRIVATE_TITLES: { prefix: string; title: string }[] = [
  { prefix: '/admin', title: '관리자' },
  { prefix: '/messages', title: '메시지' },
  { prefix: '/settings', title: '설정' },
  { prefix: '/checkout', title: '주문하기' },
  { prefix: '/cart', title: '장바구니' },
  { prefix: '/orders', title: '주문 내역' },
  { prefix: '/archive', title: '보관함' },
  { prefix: '/notifications', title: '알림' },
  { prefix: '/profile/edit', title: '프로필 편집' },
  { prefix: '/collections', title: '컬렉션' },
  { prefix: '/reset-password', title: '비밀번호 재설정' },
  { prefix: '/find-account', title: '계정 찾기' },
  { prefix: '/forgot-password', title: '비밀번호 찾기' },
];

const ROUTE_META: Record<string, SeoMeta> = {
  '/': {
    ...INDEXABLE,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  '/explore': {
    ...INDEXABLE,
    title: '수산물 둘러보기',
    description:
      '제철 수산물 상품과 구매 후기를 둘러보세요. 오징어, 꽃게, 조개, 새우, 회 등 신선한 해산물을 탐색합니다.',
  },
  '/search': {
    ...INDEXABLE,
    title: '수산물 상품 검색',
    description: '오징어, 꽃게, 조개, 새우, 회 등 수산물·해산물 상품을 검색하고 주문하세요.',
  },
  '/reels': {
    ...INDEXABLE,
    title: '수산물 릴스',
    description: '수산물 손질, 제철 해산물, 가게 소식을 숏폼 영상으로 만나보세요.',
  },
  '/login': {
    ...INDEXABLE,
    title: '로그인',
    description: `${SITE_NAME}에 로그인하고 수산물 주문과 후기 공유를 시작하세요.`,
  },
  '/signup': {
    ...INDEXABLE,
    title: '회원가입',
    description: '회원가입하고 신선한 수산물 도매·소매 상품을 주문하고 후기를 남겨 보세요.',
  },
  '/info/about': {
    ...INDEXABLE,
    title: '회사 소개',
    description: `${SITE_NAME}는 신선한 수산물을 온라인으로 판매하고 후기를 나누는 도·소매 플랫폼입니다.`,
  },
  '/info/wholesale': {
    ...INDEXABLE,
    title: '수산물 도매 안내',
    description: '오징어, 꽃게, 조개, 새우, 회 등 수산물 도매 문의와 대량 구매 안내입니다.',
  },
  '/info/retail': {
    ...INDEXABLE,
    title: '수산물 소매 안내',
    description: '제철 해산물을 소매로 주문하고, 배송 완료 후 구매 후기를 공유하세요.',
  },
  '/info/help': {
    ...INDEXABLE,
    title: '고객센터',
    description: '주문·배송, 계정, 수산물 상품 문의는 고객센터에서 안내합니다.',
  },
  '/info/terms': {
    ...INDEXABLE,
    title: '이용약관',
    description: `${SITE_NAME} 서비스 이용약관입니다.`,
  },
  '/info/privacy': {
    ...INDEXABLE,
    title: '개인정보처리방침',
    description: `${SITE_NAME}의 개인정보 수집·이용·보관 방침입니다.`,
  },
};

function fallbackMeta(pathname: string): SeoMeta {
  if (pathname.startsWith('/p/')) {
    return {
      ...INDEXABLE,
      title: '수산물 게시물',
      description: '신선한 수산물 상품과 구매 후기를 확인하세요.',
      type: 'article',
    };
  }
  if (pathname.startsWith('/profile/') && pathname !== '/profile/edit') {
    return {
      ...INDEXABLE,
      title: '프로필',
      description: '수산물 판매자와 구매자의 상품·후기를 확인하세요.',
    };
  }
  if (pathname.startsWith('/explore/tags/')) {
    const tag = decodeURIComponent(pathname.slice('/explore/tags/'.length));
    return {
      ...INDEXABLE,
      title: `#${tag} 수산물`,
      description: `#${tag} 태그가 달린 수산물·해산물 게시물을 모아 봅니다. 오징어, 꽃게, 조개, 새우, 회 등 제철 해산물을 찾아보세요.`,
      keywords: `${tag}, ${DEFAULT_KEYWORDS}`,
    };
  }
  if (pathname.startsWith('/reels/')) {
    return {
      ...INDEXABLE,
      title: '수산물 릴스',
      description: '수산물 손질과 제철 해산물 소식을 릴스로 확인하세요.',
    };
  }
  if (pathname.startsWith('/info/')) {
    return {
      title: '페이지를 찾을 수 없습니다',
      description: DEFAULT_DESCRIPTION,
      noindex: true,
    };
  }
  return {
    title: '페이지를 찾을 수 없습니다',
    description: DEFAULT_DESCRIPTION,
    noindex: true,
  };
}

export function matchRouteMeta(pathname: string): SeoMeta {
  const exact = ROUTE_META[pathname];
  if (exact) return exact;
  const privateMatch = PRIVATE_TITLES.find(
    (item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  if (privateMatch) {
    return { ...PRIVATE, title: privateMatch.title };
  }
  return fallbackMeta(pathname);
}
