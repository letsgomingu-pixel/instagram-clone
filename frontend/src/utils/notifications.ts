import type { Notification, NotificationTab } from '@/types';

export type NotificationPeriod = 'new' | 'today' | 'this_week' | 'earlier';

export const notificationTabs: { id: NotificationTab; label: string }[] = [
  { id: 'following', label: '팔로잉' },
  { id: 'you', label: '회원님' },
];

export const periodLabels: Record<NotificationPeriod, string> = {
  new: '새로운 알림',
  today: '오늘',
  this_week: '이번 주',
  earlier: '이전',
};

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
  return `${Math.floor(diffDay / 30)}개월`;
}

export function getNotificationMessage(notification: Notification): string {
  const { type, target_username, comment_preview } = notification;

  if (type === 'like') {
    return target_username
      ? `${target_username}님의 게시물을 좋아합니다.`
      : '회원님의 게시물을 좋아합니다.';
  }

  if (type === 'follow') {
    return '회원님을 팔로우하기 시작했습니다.';
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

function getNotificationPeriod(notification: Notification, now: Date): NotificationPeriod {
  if (!notification.is_read) return 'new';

  const diffMs = now.getTime() - new Date(notification.created_at).getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) return 'today';
  if (diffHours < 24 * 7) return 'this_week';
  return 'earlier';
}

export function groupNotificationsByPeriod(
  notifications: Notification[],
): { period: NotificationPeriod; items: Notification[] }[] {
  const now = new Date();
  const order: NotificationPeriod[] = ['new', 'today', 'this_week', 'earlier'];
  const groups = new Map<NotificationPeriod, Notification[]>();

  for (const notification of notifications) {
    const period = getNotificationPeriod(notification, now);
    const list = groups.get(period) ?? [];
    list.push(notification);
    groups.set(period, list);
  }

  return order
    .filter((period) => groups.has(period))
    .map((period) => ({ period, items: groups.get(period)! }));
}
