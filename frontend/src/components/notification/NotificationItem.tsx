import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { MediaImage } from '@/components/common/MediaImage';
import { formatNotificationTime, getNotificationMessage, isOrderNotification } from '@/utils/notifications';
import type { Notification } from '@/types';
import { cn } from '@/utils/cn';

interface NotificationItemProps {
  notification: Notification;
  isFollowing: boolean;
  onOpenPost?: (postId: number) => void;
  onOpenOrder?: (orderId: number) => void;
  onFollow?: (userId: number) => void;
  onAcceptFollowRequest?: (userId: number) => void;
  onRejectFollowRequest?: (userId: number) => void;
  onMarkRead?: (id: number) => void;
}

export function NotificationItem({
  notification,
  isFollowing,
  onOpenPost,
  onOpenOrder,
  onFollow,
  onAcceptFollowRequest,
  onRejectFollowRequest,
  onMarkRead,
}: NotificationItemProps) {
  const { actor, type, post_id, post_image_url, created_at, is_read } = notification;
  const time = formatNotificationTime(created_at);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 min-h-[60px] hover:bg-ig-hover transition-colors cursor-pointer',
        !is_read && 'bg-ig-hover',
      )}
      onClick={() => onMarkRead?.(notification.id)}
    >
      <Link
        to={`/profile/${actor.username}`}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Avatar src={actor.avatar_url} alt={actor.username} size="md" className="h-11 w-11" />
      </Link>

      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[14px] leading-[18px] text-ig-text">
          <Link
            to={`/profile/${actor.username}`}
            className="font-semibold hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {actor.username}
          </Link>{' '}
          <span>{getNotificationMessage(notification)}</span>
          <span className="text-ig-text-secondary"> · {time}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {type === 'follow_request' ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAcceptFollowRequest?.(actor.id);
              }}
              className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-primary text-white hover:bg-ig-primary-hover"
            >
              수락
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRejectFollowRequest?.(actor.id);
              }}
              className="h-8 px-4 text-[14px] font-semibold rounded-lg bg-ig-secondary hover:bg-ig-border/50"
            >
              거절
            </button>
          </>
        ) : type === 'follow' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onFollow?.(actor.id);
            }}
            className={cn(
              'h-8 px-4 text-[14px] font-semibold rounded-lg transition-colors',
              isFollowing
                ? 'bg-ig-secondary text-ig-text hover:bg-ig-border/50'
                : 'bg-ig-primary text-white hover:bg-ig-primary-hover',
            )}
          >
            {isFollowing ? '팔로잉' : '팔로우'}
          </button>
        ) : isOrderNotification(type) && notification.order_id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOrder?.(notification.order_id!);
            }}
            className="h-8 px-3 text-[12px] font-semibold rounded-lg bg-ig-secondary hover:bg-ig-border/50 shrink-0"
          >
            주문 보기
          </button>
        ) : post_image_url && post_id ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenPost?.(post_id);
            }}
            className="w-11 h-11 shrink-0 overflow-hidden hover:opacity-90"
          >
            <MediaImage src={post_image_url} alt="" className="w-full h-full object-cover" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
