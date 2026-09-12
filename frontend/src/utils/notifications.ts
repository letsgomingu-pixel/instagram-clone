import type { Notification, NotificationTab } from '@/types';

export type NotificationPeriod = 'new' | 'earlier';

export type NotificationFilter = 'all' | 'following' | 'comments' | 'follows' | 'tags';

export const notificationFilters: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: '모두' },
  { id: 'following', label: '내가 팔로우하는 사람' },
  { id: 'comments', label: '댓글' },
  { id: 'follows', label: '팔로우' },
  { id: 'tags', label: '태그 및…' },
];

export const periodLabels: Record<NotificationPeriod, string> = {
  new: '',
  earlier: '이전 활동',
};

export function filterNotifications(
  notifications: Notification[],
  filter: NotificationFilter,
): Notification[] {
  const withoutFollowRequests = notifications.filter((n) => n.type !== 'follow_request');

  if (filter === 'all') return withoutFollowRequests;
  if (filter === 'following') {
    return withoutFollowRequests.filter((n) => n.actor.is_following);
  }
  if (filter === 'comments') {
    return withoutFollowRequests.filter((n) =>
      ['comment', 'reply', 'mention'].includes(n.type),
    );
  }
  if (filter === 'follows') {
    return withoutFollowRequests.filter((n) => n.type === 'follow');
  }
  if (filter === 'tags') {
    return withoutFollowRequests.filter((n) => n.type === 'mention');
  }
  return withoutFollowRequests;
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분`;
  if (diffHour < 24) return `${diffHour}시간`;
  if (diffDay < 7) return `${diffDay}일`;
  if (diffWeek < 4) return `${diffWeek}주`;

  return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

export function getNotificationMessage(notification: Notification): string {
  const { type, target_username, comment_preview } = notification;

  if (type === 'order_new') {
    return comment_preview || '새 주문이 접수되었습니다.';
  }
  if (type === 'order_preparing') {
    return comment_preview || '주문 상품을 준비하고 있습니다.';
  }
  if (type === 'order_shipped') {
    return comment_preview || '상품이 배송 시작되었습니다.';
  }
  if (type === 'order_delivered') {
    return comment_preview || '배송이 완료되었습니다.';
  }

  if (type === 'like') {
    return target_username
      ? `${target_username}님의 게시물을 좋아합니다.`
      : '회원님의 게시물을 좋아합니다.';
  }

  if (type === 'follow') {
    return '회원님을 팔로우하기 시작했습니다.';
  }

  if (type === 'follow_request') {
    return '회원님을 팔로우하고 싶어합니다.';
  }

  if (comment_preview) {
    return target_username
      ? `${target_username}님의 게시물에 댓글을 남겼습니다: ${comment_preview}`
      : `댓글을 남겼습니다: ${comment_preview}`;
  }

  return target_username
    ? `${target_username}님의 게시물에 댓글을 남겼습니다.`
    : '회원님의 게시물에 댓글을 남겼습니다.';
}

export function isOrderNotification(type: Notification['type']): boolean {
  return type.startsWith('order_');
}

export function groupNotificationsByPeriod(
  notifications: Notification[],
): { period: NotificationPeriod; items: Notification[] }[] {
  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);
  const groups: { period: NotificationPeriod; items: Notification[] }[] = [];

  if (unread.length) groups.push({ period: 'new', items: unread });
  if (read.length) groups.push({ period: 'earlier', items: read });

  return groups;
}

export function notificationTabForFilter(filter: NotificationFilter): NotificationTab {
  return filter === 'following' ? 'following' : 'you';
}
