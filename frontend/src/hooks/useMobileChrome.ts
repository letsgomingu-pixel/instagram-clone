import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export type MobileHeaderVariant = 'home' | 'back-title' | 'profile' | 'title-only' | 'none';

export interface MobileChromeConfig {
  showHeader: boolean;
  showHeaderNav: boolean;
  showBottomNav: boolean;
  headerVariant: MobileHeaderVariant;
  title?: string;
  backTo?: string;
}

const SETTINGS_TITLES: Record<string, string> = {
  '/settings/edit': '프로필 편집',
  '/settings/shipping': '배송지 관리',
  '/settings/notifications': '알림',
  '/settings/privacy': '개인정보 보호',
  '/settings/security': '보안',
  '/settings/account': '계정 정보',
  '/settings/blocked': '차단한 계정',
};

export function useMobileChrome(pathname: string): MobileChromeConfig {
  const { username, orderId } = useParams<{ username?: string; orderId?: string }>();

  return useMemo(() => {
    if (pathname.startsWith('/messages/') && pathname.split('/').length > 2) {
      return {
        showHeader: false,
        showHeaderNav: false,
        showBottomNav: false,
        headerVariant: 'none',
      };
    }

    if (pathname.startsWith('/checkout/')) {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: false,
        headerVariant: 'back-title',
        title: '주문하기',
        backTo: '/',
      };
    }

    if (pathname.match(/^\/orders\/\d+\/review$/)) {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: false,
        headerVariant: 'back-title',
        title: '리뷰 작성',
        backTo: orderId ? `/orders/${orderId}` : '/orders',
      };
    }

    if (pathname.startsWith('/orders/') && orderId) {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: true,
        headerVariant: 'back-title',
        title: '주문 상세',
        backTo: '/orders',
      };
    }

    if (pathname === '/cart') {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: true,
        headerVariant: 'back-title',
        title: '장바구니',
        backTo: '/',
      };
    }

    if (pathname === '/orders') {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: true,
        headerVariant: 'back-title',
        title: '내 주문',
        backTo: '/settings',
      };
    }

    if (pathname === '/reels') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: false,
        headerVariant: 'title-only',
        title: '릴스',
      };
    }

    if (pathname === '/messages') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: true,
        headerVariant: 'title-only',
        title: '메시지',
      };
    }

    if (pathname === '/settings') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: false,
        headerVariant: 'back-title',
        title: '설정 및 활동',
        backTo: '/',
      };
    }

    if (pathname.startsWith('/settings/')) {
      return {
        showHeader: true,
        showHeaderNav: false,
        showBottomNav: false,
        headerVariant: 'back-title',
        title: SETTINGS_TITLES[pathname] ?? '설정',
        backTo: '/settings',
      };
    }

    if (pathname.startsWith('/notifications')) {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: false,
        headerVariant: 'back-title',
        title: '알림',
        backTo: '/',
      };
    }

    if (pathname === '/search' || pathname === '/explore') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: true,
        headerVariant: 'title-only',
        title: '검색',
      };
    }

    if (pathname.startsWith('/profile/') && username) {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: true,
        headerVariant: 'profile',
        title: username,
        backTo: '/',
      };
    }

    if (pathname === '/suggested') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: true,
        headerVariant: 'back-title',
        title: '회원님을 위한 추천',
        backTo: '/',
      };
    }

    if (pathname === '/') {
      return {
        showHeader: true,
        showHeaderNav: true,
        showBottomNav: true,
        headerVariant: 'home',
      };
    }

    return {
      showHeader: true,
      showHeaderNav: true,
      showBottomNav: true,
      headerVariant: 'back-title',
      title: '',
      backTo: '/',
    };
  }, [pathname, username, orderId]);
}
