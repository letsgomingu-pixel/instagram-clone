import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationItem } from '@/components/notification/NotificationItem';
import {
  groupNotificationsByPeriod,
  notificationTabs,
  periodLabels,
} from '@/utils/notifications';
import * as notificationsApi from '@/api/notifications';
import * as postsApi from '@/api/posts';
import * as usersApi from '@/api/users';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import type { Notification, NotificationTab } from '@/types';
import { cn } from '@/utils/cn';

interface NotificationsContentProps {
  variant?: 'page' | 'panel';
  onClose?: () => void;
}

export function NotificationsContent({ variant = 'page', onClose }: NotificationsContentProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { setSelectedPost, followUser, unfollowUser, suggestedUsers } = useApp();
  const [tab, setTab] = useState<NotificationTab>('you');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [followOverrides, setFollowOverrides] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || isLoading) {
      setLoading(false);
      setNotifications([]);
      return;
    }

    const fetchNotifications = () => {
      notificationsApi
        .getNotifications(tab)
        .then(setNotifications)
        .catch(() => setNotifications([]))
        .finally(() => setLoading(false));
    };

    setLoading(true);
    fetchNotifications();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [tab, isAuthenticated, isLoading]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByPeriod(notifications),
    [notifications],
  );

  const isFollowing = (userId: number, actor?: Notification['actor']) => {
    if (userId in followOverrides) return followOverrides[userId];
    if (actor?.is_following) return true;
    const suggested = suggestedUsers.find((u) => u.id === userId);
    if (suggested) return !!suggested.is_following;
    return false;
  };

  const handleOpenPost = async (postId: number) => {
    const post = await postsApi.getPost(postId);
    setSelectedPost(post);
    onClose?.();
    const unreadIds = notifications
      .filter((n) => n.post_id === postId && !n.is_read)
      .map((n) => n.id);
    unreadIds.forEach((id) => {
      notificationsApi.markNotificationRead(id).catch(() => undefined);
    });
    setNotifications((prev) =>
      prev.map((n) => (n.post_id === postId ? { ...n, is_read: true } : n)),
    );
  };

  const handleFollow = (userId: number) => {
    const next = !isFollowing(userId);
    const action = next ? followUser(userId) : unfollowUser(userId);
    void action.then(() => {
      setFollowOverrides((prev) => ({ ...prev, [userId]: next }));
      const unreadIds = notifications
        .filter((n) => n.actor.id === userId && n.type === 'follow' && !n.is_read)
        .map((n) => n.id);
      unreadIds.forEach((id) => {
        notificationsApi.markNotificationRead(id).catch(() => undefined);
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.actor.id === userId && n.type === 'follow' ? { ...n, is_read: true } : n,
        ),
      );
    });
  };

  const handleOpenOrder = (orderId: number) => {
    const unreadIds = notifications
      .filter((n) => n.order_id === orderId && !n.is_read)
      .map((n) => n.id);
    unreadIds.forEach((id) => {
      notificationsApi.markNotificationRead(id).catch(() => undefined);
    });
    setNotifications((prev) =>
      prev.map((n) => (n.order_id === orderId ? { ...n, is_read: true } : n)),
    );
    onClose?.();
    navigate(`/orders/${orderId}`);
  };

  const handleMarkRead = (id: number) => {
    notificationsApi.markNotificationRead(id).catch(() => undefined);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleAcceptFollowRequest = (userId: number) => {
    void usersApi.acceptFollowRequestByUser(userId).then(() => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.actor.id === userId && n.type === 'follow_request' ? { ...n, is_read: true } : n,
        ),
      );
      void followUser(userId);
    });
  };

  const handleRejectFollowRequest = (userId: number) => {
    void usersApi.rejectFollowRequestByUser(userId).then(() => {
      setNotifications((prev) => prev.filter((n) => !(n.actor.id === userId && n.type === 'follow_request')));
    });
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ig-border border-t-ig-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="text-sm text-ig-text-secondary text-center py-12 px-4">
        알림을 보려면 로그인해주세요.
      </p>
    );
  }

  return (
    <div className={variant === 'page' ? 'md:-mt-8' : undefined}>
      <div
        className={
          variant === 'page'
            ? 'bg-ig-surface border-0 md:border border-ig-border/80 md:rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(41,171,226,0.06)]'
            : 'bg-ig-surface'
        }
      >
        {variant === 'page' && (
          <div className="hidden md:block px-4 py-4 border-b border-ig-border">
            <h1 className="text-[16px] font-bold text-ig-text">알림</h1>
          </div>
        )}

        <div className="flex border-b border-ig-border">
          {notificationTabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 py-3 text-[14px] font-semibold border-b-2 transition-colors',
                tab === id
                  ? 'border-ig-primary text-ig-primary'
                  : 'border-transparent text-ig-text-secondary hover:text-ig-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {groupedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-[62px] h-[62px] rounded-full border-2 border-ig-text flex items-center justify-center mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <p className="text-[14px] text-ig-text-secondary">
              {tab === 'you' ? '아직 알림이 없습니다.' : '팔로잉 활동 알림이 없습니다.'}
            </p>
          </div>
        ) : (
          groupedNotifications.map(({ period, items }) => (
            <section key={period}>
              <h2 className="px-4 py-3 text-[16px] font-bold text-ig-text border-b border-ig-border">
                {periodLabels[period]}
              </h2>
              <div>
                {items.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isFollowing={isFollowing(notification.actor.id, notification.actor)}
                    onOpenPost={handleOpenPost}
                    onOpenOrder={handleOpenOrder}
                    onFollow={handleFollow}
                    onAcceptFollowRequest={handleAcceptFollowRequest}
                    onRejectFollowRequest={handleRejectFollowRequest}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
