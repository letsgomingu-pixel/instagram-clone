import { useCallback, useEffect, useState } from 'react';
import * as conversationsApi from '@/api/conversations';
import * as notificationsApi from '@/api/notifications';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadBadges() {
  const { isAuthenticated } = useAuth();
  const [messageCount, setMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setMessageCount(0);
      setNotificationCount(0);
      return;
    }

    try {
      const [conversations, notifications] = await Promise.all([
        conversationsApi.getConversations(),
        notificationsApi.getNotifications('you'),
      ]);
      setMessageCount(conversations.reduce((sum, c) => sum + c.unread_count, 0));
      setNotificationCount(notifications.filter((n) => !n.is_read).length);
    } catch {
      // Ignore badge refresh errors.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { messageCount, notificationCount, refreshUnreadBadges: refresh };
}
